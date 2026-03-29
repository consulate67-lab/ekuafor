import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import aiAssistantService from '../services/ai-assistant.service';
import appointmentService from '../services/appointment.service';
import { authMiddleware } from '../middleware/auth.middleware';
import pool from '../config/database';
import { LocalNLPEngine } from '../services/local-nlp.service';
import { LocalSTTEngine } from '../services/local-stt.service';

const router = Router();

const upload = multer({
    dest: 'temp_audio/',
    limits: { fileSize: 25 * 1024 * 1024 }
});

if (!fs.existsSync('temp_audio/')) {
    fs.mkdirSync('temp_audio/', { recursive: true });
}

// ─── Turkish normalization & service matching ────────────────────────────────

function normalizeTR(s: string): string {
    return (s || '').toLowerCase()
        .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
        .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
}

function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
        Array(n + 1).fill(0).map((_, j) => j === 0 ? i : 0)
    );
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return dp[m][n];
}

function matchService(services: any[], name: string): any | null {
    if (!name || !services.length) return null;
    const n = normalizeTR(name);

    // Exact
    let found = services.find(s => normalizeTR(s.name) === n);
    if (found) return found;

    // Substring
    found = services.find(s => normalizeTR(s.name).includes(n) || n.includes(normalizeTR(s.name)));
    if (found) return found;

    // Keyword aliases
    const aliases: Record<string, string[]> = {
        'kesim': ['kesim', 'tiras', 'makina', 'ustura', 'kestir', 'sac kesimi'],
        'boya': ['boya', 'boyama', 'dip boya', 'renk', 'balyaj', 'ombre'],
        'bakim': ['bakim', 'maske', 'keratin', 'protein', 'botoks'],
        'manikur': ['manikur', 'el bakimi', 'oje', 'kalici', 'jel tirnak'],
        'pedikur': ['pedikur', 'ayak bakimi', 'topuk'],
        'agda': ['agda', 'sir', 'epilasyon'],
        'kas': ['kas', 'biyik', 'alim'],
        'fon': ['fon', 'fonlama', 'masa', 'bigudi'],
        'cilt': ['cilt', 'yuz bakimi', 'peeling'],
    };
    for (const [key, kws] of Object.entries(aliases)) {
        if (kws.some(k => n.includes(k))) {
            found = services.find(s => normalizeTR(s.name).includes(key));
            if (found) return found;
        }
    }

    // Fuzzy Levenshtein
    let best: any = null; let bestDist = Infinity;
    for (const s of services) {
        const sn = normalizeTR(s.name);
        const dist = levenshtein(n, sn);
        const threshold = Math.max(3, Math.floor(Math.max(n.length, sn.length) * 0.4));
        if (dist < threshold && dist < bestDist) { bestDist = dist; best = s; }
    }
    return best;
}

// ─── Date / Time validation ─────────────────────────────────────────────────

function validateDate(d: any): string {
    const today = new Date().toISOString().split('T')[0];
    if (!d) return today;
    const s = String(d);
    if (!s.match(/^\d{4}-\d{2}-\d{2}$/)) return today;
    const dt = new Date(s);
    if (isNaN(dt.getTime())) return today;
    const diffDays = (dt.getTime() - Date.now()) / 86400000;
    if (diffDays < -1 || diffDays > 365) return today;
    return s;
}

function validateTime(t: any): string {
    if (!t) return '10:00';
    const m = String(t).match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return '10:00';
    return `${String(Math.min(23, +m[1])).padStart(2, '0')}:${String(Math.min(59, +m[2])).padStart(2, '0')}`;
}

function calcEndTime(start: string, dur: number): string {
    const [h, m] = start.split(':').map(Number);
    const t = h * 60 + m + dur;
    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

// ─── Core auto-create logic ──────────────────────────────────────────────────

async function autoCreateFromExtracted(
    info: any,
    companyId: number,
    transcription: string
): Promise<{ autoCreated: boolean; appointmentId: number | null; matchedService: any | null; staffId: any }> {

    if (!info || (!info.time && !info.date)) {
        return { autoCreated: false, appointmentId: null, matchedService: null, staffId: null };
    }

    const servicesRes = await pool.query(
        'SELECT id, name, price, duration_minutes FROM services WHERE company_id = $1 AND is_active = true ORDER BY name',
        [companyId]
    );
    const services = servicesRes.rows;

    if (!services.length) {
        console.log('[AI] No active services for company', companyId);
        return { autoCreated: false, appointmentId: null, matchedService: null, staffId: null };
    }

    // Match service; fallback to first service (e.g. saç kesimi)
    let matchedService = matchService(services, info.serviceName);
    if (!matchedService) {
        console.log(`[AI] No match for "${info.serviceName}", using first: ${services[0].name}`);
        matchedService = services[0];
    }

    // Staff: by name or first available
    let staffId: any = null;
    if (info.staffName) {
        const sr = await pool.query(
            `SELECT sb.id FROM staff_boards sb JOIN users u ON u.id = sb.user_id
             WHERE sb.company_id = $1 AND (LOWER(u.first_name) LIKE $2 OR LOWER(u.last_name) LIKE $2) LIMIT 1`,
            [companyId, `%${normalizeTR(info.staffName)}%`]
        );
        if (sr.rows.length) staffId = sr.rows[0].id;
    }
    if (!staffId) {
        const sr = await pool.query('SELECT id FROM staff_boards WHERE company_id = $1 LIMIT 1', [companyId]);
        staffId = sr.rows[0]?.id || null;
    }

    const appDate = validateDate(info.date);
    const startTime = validateTime(info.time);
    const duration = matchedService.duration_minutes || 30;
    const endTime = calcEndTime(startTime, duration);
    const customerName = String(info.customerName || 'Misafir').replace(/^null$/i, 'Misafir').trim();

    const newApp = await appointmentService.createAppointment({
        company_id: companyId,
        service_id: matchedService.id,
        service_ids: [matchedService.id],
        services: [{ id: matchedService.id, price: matchedService.price, duration_minutes: duration, staff_id: staffId }],
        staff_id: staffId,
        customer_name: customerName,
        appointment_date: appDate,
        start_time: startTime,
        end_time: endTime,
        price: matchedService.price,
        notes: `Müşteri: ${customerName} | 🤖 AI OTOMATİK | ${info.note || ''} | "${transcription.substring(0, 180)}"`,
        status: 'approved'
    } as any);

    return { autoCreated: true, appointmentId: (newApp.id as number) ?? null, matchedService, staffId };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/ai/process-call-audio
 */
router.post('/process-call-audio', authMiddleware as any, (upload.single('audio') as any), async (req: any, res: any) => {
    try {
        const audioFile = req.file;
        const companyId = req.user?.company_id;

        if (!audioFile) {
            return res.status(400).json({ success: false, error: 'Ses dosyası bulunamadı.' });
        }

        let rules = '';
        if (companyId) {
            try {
                const compRes = await pool.query('SELECT ai_rules, ai_enabled FROM companies WHERE id = $1', [companyId]);
                const cd = compRes.rows[0];
                if (cd && cd.ai_enabled === false) {
                    fs.unlink(audioFile.path, () => {});
                    return res.status(403).json({ success: false, error: 'Yapay Zeka bu firma için devre dışı.' });
                }
                rules = cd?.ai_rules || '';
            } catch (e) {
                console.warn('[AI] Company settings check failed:', (e as any).message);
            }
        }

        // 1. Ücretsiz Local Ses Tanıma (ASR) Dene
        let transcription = '';
        try {
            console.log('[AI] VOSK Local STT Motoru deneniyor...');
            transcription = await LocalSTTEngine.transcribeAudio(audioFile.path);
        } catch (localSttError: any) {
            console.warn('[AI] Local STT Modeli bulunamadı veya hata verdi. Yedeğe (OpenAI) geçiliyor:', localSttError.message);
            try {
                transcription = await aiAssistantService.transcribeAudio(audioFile.path);
            } catch (e: any) {
                fs.unlink(audioFile.path, () => {});
                return res.status(422).json({ success: false, error: e.message, transcription: '' });
            }
        }

        if (!transcription || transcription.length < 5) {
            fs.unlink(audioFile.path, () => {});
            return res.status(200).json({ success: false, error: 'Görüşme çok kısaydı veya anlaşılamadı.', transcription });
        }

        console.log('[AI] Sesten Metne Çevrildi:', transcription);

        // 2. Ücretsiz Local NLP ile Cümleyi Anla (%100 Bedava, GPT-4 kullanılmaz)
        let info: any = null;
        try {
            info = await LocalNLPEngine.processText(companyId, transcription);
            console.log('[AI] Kendi NLP Motorumuzun Analizi:', JSON.stringify(info));
        } catch (nlpErr: any) {
            console.error('[AI] Local NLP Engine Error:', nlpErr);
            fs.unlink(audioFile.path, () => {});
            return res.status(500).json({ success: false, error: 'Yerel NLP motorunda hata oluştu.', transcription });
        }

        // 3. Auto-create (Açık Kaynak Sistem)
        let autoCreated = false;
        let appointmentId: number | null = null;
        let matchedServiceName: string | null = null;
        let creationError: string | null = null;

        if (companyId && info && info.confidence > 25) { // Eğer mantıklı bir şeyler bulduysa
            try {
                const result = await autoCreateFromExtracted(info, companyId, transcription);
                autoCreated = result.autoCreated;
                appointmentId = result.appointmentId;
                matchedServiceName = result.matchedService?.name || null;
            } catch (e: any) {
                creationError = e.message;
                console.error('[AI] Create error:', e.message);
            }
        }

        // 4. Öğrenme Makinesi için Kaydet
        if (companyId) {
            await aiAssistantService.saveCallLog({
                companyId,
                transcription,
                extractedInfo: info,
                appointmentId,
                wasAutoCreated: autoCreated,
                matchedServiceName,
                source: 'audio'
            });
        }

        fs.unlink(audioFile.path, () => {});

        res.json({
            success: true,
            data: { transcription, extractedInfo: info, autoCreated, appointmentId, matchedServiceName, creationError }
        });

    } catch (err: any) {
        if (req.file) fs.unlink(req.file.path, () => {});
        console.error('[AI] Call Error:', err);
        return res.status(500).json({ success: false, error: 'Ses işlenirken sistem hatası oluştu.' });
    }
});

/**
 * POST /api/ai/process-text-appointment
 */
router.post('/process-text-appointment', authMiddleware as any, async (req: any, res: any) => {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, error: 'Metin gerekli.' });

    try {
        const companyId: number = req.user?.company_id;
        let rules = '';
        if (companyId) {
            const cr = await pool.query('SELECT ai_rules, ai_enabled FROM companies WHERE id = $1', [companyId]);
            if (cr.rows[0]?.ai_enabled === false)
                return res.status(403).json({ success: false, error: 'Yapay Zeka bu firma için devre dışı.' });
            rules = cr.rows[0]?.ai_rules || '';
        }

        const info = await aiAssistantService.extractAppointmentInfo(text, rules, companyId);

        let autoCreated = false, appointmentId: number | null = null;
        let matchedServiceName: string | null = null, creationError: string | null = null;

        if (companyId && info) {
            try {
                const r = await autoCreateFromExtracted(info, companyId, text);
                autoCreated = r.autoCreated; appointmentId = r.appointmentId;
                matchedServiceName = r.matchedService?.name || null;
            } catch (e: any) { creationError = e.message; }
        }

        if (companyId) {
            await aiAssistantService.saveCallLog({
                companyId, transcription: text, extractedInfo: info,
                appointmentId, wasAutoCreated: autoCreated, matchedServiceName, source: 'text'
            });
        }

        res.json({ success: true, data: { extractedInfo: info, autoCreated, appointmentId, matchedServiceName, creationError } });

    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/ai/create-from-extracted  (manual retry frontend)
 */
router.post('/create-from-extracted', authMiddleware as any, async (req: any, res: any) => {
    const { extractedInfo, transcription } = req.body;
    if (!extractedInfo || !req.user?.company_id)
        return res.status(400).json({ success: false, error: 'Eksik parametre.' });

    try {
        const r = await autoCreateFromExtracted(extractedInfo, req.user.company_id, transcription || '');
        if (!r.autoCreated)
            return res.status(422).json({ success: false, error: `Hizmet eşleştirilemedi: "${extractedInfo.serviceName}"` });

        // Update log if already saved
        await pool.query(`
            UPDATE ai_call_logs SET appointment_id = $1, was_auto_created = true, matched_service_name = $2
            WHERE company_id = $3 AND transcription = $4 AND appointment_id IS NULL
            ORDER BY created_at DESC LIMIT 1
        `, [r.appointmentId, r.matchedService?.name, req.user.company_id, transcription]);

        res.json({ success: true, appointmentId: r.appointmentId, matchedServiceName: r.matchedService?.name });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/ai/call-logs  — AI admin panel: list company's call logs
 */
router.get('/call-logs', authMiddleware as any, async (req: any, res: any) => {
    try {
        const companyId = req.user?.company_id;
        if (!companyId) return res.status(403).json({ success: false, error: 'Firma bulunamadı.' });

        const limit = Math.min(parseInt(String(req.query.limit || '50')), 200);
        const offset = parseInt(String(req.query.offset || '0'));

        const result = await pool.query(`
            SELECT 
                l.id, l.transcription, l.extracted_info, l.appointment_id, l.was_auto_created,
                l.confidence, l.feedback, l.matched_service_name, l.source, l.created_at,
                a.customer_name, a.appointment_date, a.start_time, a.status as appt_status
            FROM ai_call_logs l
            LEFT JOIN appointments a ON a.id = l.appointment_id
            WHERE l.company_id = $1
            ORDER BY l.created_at DESC
            LIMIT $2 OFFSET $3
        `, [companyId, limit, offset]);

        const countResult = await pool.query(
            'SELECT COUNT(*) FROM ai_call_logs WHERE company_id = $1', [companyId]
        );

        res.json({
            success: true,
            data: result.rows,
            total: parseInt(countResult.rows[0].count),
            stats: {
                auto_created: result.rows.filter(r => r.was_auto_created).length,
                correct: result.rows.filter(r => r.feedback === 'correct').length,
                incorrect: result.rows.filter(r => r.feedback === 'incorrect').length,
            }
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * PATCH /api/ai/call-logs/:id/feedback  — Mark log as correct/incorrect
 */
router.patch('/call-logs/:id/feedback', authMiddleware as any, async (req: any, res: any) => {
    const { id } = req.params;
    const { feedback } = req.body; // 'correct' | 'incorrect' | 'pending'
    if (!['correct', 'incorrect', 'pending'].includes(feedback))
        return res.status(400).json({ success: false, error: 'feedback: correct | incorrect | pending' });

    try {
        await pool.query(
            'UPDATE ai_call_logs SET feedback = $1 WHERE id = $2 AND company_id = $3',
            [feedback, id, req.user?.company_id]
        );
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/ai/settings  — Get company AI settings
 */
router.get('/settings', authMiddleware as any, async (req: any, res: any) => {
    try {
        const companyId = req.user?.company_id;
        if (!companyId) return res.status(403).json({ success: false, error: 'Firma bulunamadı.' });

        const r = await pool.query(
            'SELECT ai_enabled, ai_rules FROM companies WHERE id = $1', [companyId]
        );
        res.json({ success: true, data: r.rows[0] || { ai_enabled: true, ai_rules: '' } });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * PATCH /api/ai/settings  — Update company AI settings
 */
router.patch('/settings', authMiddleware as any, async (req: any, res: any) => {
    const { ai_enabled, ai_rules } = req.body;
    try {
        const companyId = req.user?.company_id;
        if (!companyId) return res.status(403).json({ success: false, error: 'Firma bulunamadı.' });

        await pool.query(
            'UPDATE companies SET ai_enabled = $1, ai_rules = $2 WHERE id = $3',
            [ai_enabled !== undefined ? ai_enabled : true, ai_rules || '', companyId]
        );
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
