import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import aiAssistantService from '../services/ai-assistant.service';
import appointmentService from '../services/appointment.service';
import { authMiddleware } from '../middleware/auth.middleware';
import pool from '../config/database';

const router = Router();

// Configure multer for temporary audio storage
const upload = multer({
    dest: 'temp_audio/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Ensure temp directory exists
if (!fs.existsSync('temp_audio/')) {
    fs.mkdirSync('temp_audio/');
}

/**
 * POST /api/ai/process-call-audio
 * Receives an audio file, transcribes it, and extracts appointment info.
 */
router.post('/process-call-audio', authMiddleware as any, (upload.single('audio') as any), async (req: any, res: any) => {
    const audioFile = req.file;

    if (!audioFile) {
        return res.status(400).json({ success: false, error: 'Ses dosyası yüklenemedi.' });
    }

    try {
        // Fetch company rules and status
        let rules = '';
        if (req.user?.company_id) {
            const compRes = await pool.query('SELECT ai_rules, ai_enabled FROM companies WHERE id = $1', [req.user.company_id]);
            const companyData = compRes.rows[0];
            
            if (companyData && companyData.ai_enabled === false) {
                if (audioFile) fs.unlink(audioFile.path, () => {});
                return res.status(403).json({ success: false, error: 'Yapay Zeka asistanı bu firma için kapalı.' });
            }
            
            rules = companyData?.ai_rules || '';
        }

        // 1. Transcribe the audio
        const transcription = await aiAssistantService.transcribeAudio(audioFile.path);
        
        // 2. Extract info
        const info = await aiAssistantService.extractAppointmentInfo(transcription, rules);

        // 3. Automation: If info is solid, create appointment
        let autoCreated = false;
        let appointmentId = null;

        if (info && info.serviceName && info.date && info.time && req.user?.company_id) {
            try {
                const companyId = req.user.company_id;
                
                // Fetch services to match
                const servicesRes = await pool.query('SELECT id, name, price, duration_minutes FROM services WHERE company_id = $1 AND is_active = true', [companyId]);
                const services = servicesRes.rows;
                
                const sName = (info.serviceName || '').toLocaleLowerCase('tr-TR');
                const matchedService = services.find(s => 
                    s.name.toLocaleLowerCase('tr-TR').includes(sName) || 
                    sName.includes(s.name.toLocaleLowerCase('tr-TR'))
                );

                if (matchedService) {
                    // Fetch first staff as default
                    const staffRes = await pool.query('SELECT id FROM staff_boards WHERE company_id = $1 LIMIT 1', [companyId]);
                    const staffId = staffRes.rows[0]?.id;

                    // Prepare date/time
                    let appDate = info.date;
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(appDate)) {
                        appDate = new Date().toISOString().split('T')[0];
                    }

                    const startTime = info.time || '10:00';
                    const duration = matchedService.duration_minutes || 30;
                    
                    // Simple end time calculation
                    const [h, m] = startTime.split(':').map(Number);
                    const totalMin = h * 60 + m + duration;
                    const endH = Math.floor(totalMin / 60) % 24;
                    const endM = totalMin % 60;
                    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

                    const newApp = await appointmentService.createAppointment({
                        company_id: companyId,
                        service_id: matchedService.id,
                        staff_id: staffId,
                        customer_name: info.customerName || 'Sesli Asistan Müşterisi',
                        appointment_date: appDate,
                        start_time: startTime,
                        end_time: endTime,
                        price: matchedService.price,
                        notes: `AI OTOMATİK KAYIT: ${info.note || '-'} | Görüşme: ${transcription}`,
                        status: 'approved'
                    } as any);
                    
                    autoCreated = true;
                    appointmentId = newApp.id;
                }
            } catch (autoErr) {
                console.error('Auto Appointment Creation failed:', autoErr);
            }
        }

        // 4. Cleanup local file
        fs.unlink(audioFile.path, () => {});

        res.json({
            success: true,
            data: {
                transcription,
                extractedInfo: info,
                autoCreated,
                appointmentId
            }
        });
    } catch (err: any) {
        // Cleanup on error
        if (audioFile) fs.unlink(audioFile.path, () => {});
        
        console.error('Call Processing Error:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Ses işleme sırasında bir hata oluştu.'
        });
    }
});

/**
 * POST /api/ai/process-text-appointment
 * Manually process text (for testing or WhatsApp-like input)
 */
router.post('/process-text-appointment', authMiddleware as any, async (req: any, res: any) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, error: 'Metin gerekli.' });

    try {
        // Fetch company rules and status
        let rules = '';
        if (req.user?.company_id) {
            const compRes = await pool.query('SELECT ai_rules, ai_enabled FROM companies WHERE id = $1', [req.user.company_id]);
            const companyData = compRes.rows[0];
            
            if (companyData && companyData.ai_enabled === false) {
                return res.status(403).json({ success: false, error: 'Yapay Zeka asistanı bu firma için kapalı.' });
            }
            
            rules = companyData?.ai_rules || '';
        }

        const info = await aiAssistantService.extractAppointmentInfo(text, rules);
        
        // Automation for text input
        let autoCreated = false;
        let appointmentId = null;

        if (info && info.serviceName && info.date && info.time && req.user?.company_id) {
            try {
                const companyId = req.user.company_id;
                const servicesRes = await pool.query('SELECT id, name, price, duration_minutes FROM services WHERE company_id = $1 AND is_active = true', [companyId]);
                const services = servicesRes.rows;
                
                const sName = (info.serviceName || '').toLocaleLowerCase('tr-TR');
                const matchedService = services.find(s => 
                    s.name.toLocaleLowerCase('tr-TR').includes(sName) || 
                    sName.includes(s.name.toLocaleLowerCase('tr-TR'))
                );

                if (matchedService) {
                    const staffRes = await pool.query('SELECT id FROM staff_boards WHERE company_id = $1 LIMIT 1', [companyId]);
                    const staffId = staffRes.rows[0]?.id;

                    const startTime = info.time || '10:00';
                    const duration = matchedService.duration_minutes || 30;
                    const [h, m] = startTime.split(':').map(Number);
                    const totalMin = h * 60 + m + duration;
                    const endTime = `${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;

                    const newApp = await appointmentService.createAppointment({
                        company_id: companyId,
                        service_id: matchedService.id,
                        staff_id: staffId,
                        customer_name: info.customerName || 'Metin Asistan Müşterisi',
                        appointment_date: info.date,
                        start_time: startTime,
                        end_time: endTime,
                        price: matchedService.price,
                        notes: `AI OTOMATİK KAYIT (Metin): ${info.note || '-'}`,
                        status: 'approved'
                    } as any);
                    
                    autoCreated = true;
                    appointmentId = newApp.id;
                }
            } catch (err) {}
        }

        res.json({ success: true, data: info, autoCreated, appointmentId });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
