import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import aiAssistantService from '../services/ai-assistant.service';
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
        // Fetch company rules
        let rules = '';
        if (req.user?.company_id) {
            const compRes = await pool.query('SELECT ai_rules FROM companies WHERE id = $1', [req.user.company_id]);
            rules = compRes.rows[0]?.ai_rules || '';
        }

        // 1. Transcribe the audio
        const transcription = await aiAssistantService.transcribeAudio(audioFile.path);
        
        // 2. Extract info
        const info = await aiAssistantService.extractAppointmentInfo(transcription, rules);

        // 3. Cleanup local file
        fs.unlink(audioFile.path, () => {});

        res.json({
            success: true,
            data: {
                transcription,
                extractedInfo: info
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
        // Fetch company rules
        let rules = '';
        if (req.user?.company_id) {
            const compRes = await pool.query('SELECT ai_rules FROM companies WHERE id = $1', [req.user.company_id]);
            rules = compRes.rows[0]?.ai_rules || '';
        }

        const info = await aiAssistantService.extractAppointmentInfo(text, rules);
        res.json({ success: true, data: info });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
