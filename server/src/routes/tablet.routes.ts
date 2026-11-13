import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { formatPhoneTo12Digits } from '../utils/phone';

/**
 * Tablet: senkron + kurulum aktivasyon anahtarı.
 * Anahtar Telegram botu veya TABLET_KEY_SECRET ile üretilir.
 */
const router = Router();

async function ensureTabletTables() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS tablet_sync_snapshots (
            id SERIAL PRIMARY KEY,
            device_id VARCHAR(80) NOT NULL,
            company_name VARCHAR(255),
            payload JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS tablet_activation_keys (
            id SERIAL PRIMARY KEY,
            key_code VARCHAR(32) NOT NULL UNIQUE,
            status VARCHAR(20) NOT NULL DEFAULT 'unused',
            device_id VARCHAR(80),
            company_name VARCHAR(255),
            created_by VARCHAR(80),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            used_at TIMESTAMPTZ,
            meta JSONB
        )
    `);
}

function makeKey(): string {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
    return `SLN-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

function adminAuthorized(req: Request): boolean {
    const secret = process.env.TABLET_KEY_SECRET || process.env.JWT_SECRET || '';
    const header = String(req.header('X-Tablet-Key-Secret') || req.body?.secret || '');
    return !!secret && header === secret;
}

async function insertActivationKey(createdBy: string): Promise<string> {
    await ensureTabletTables();
    const key = makeKey();
    await pool.query(
        `INSERT INTO tablet_activation_keys (key_code, created_by, meta) VALUES ($1, $2, $3::jsonb)`,
        [key, createdBy.slice(0, 80), JSON.stringify({ source: createdBy })],
    );
    return key;
}

async function telegramSend(chatId: number | string, text: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
    });
}

function telegramAllowed(chatId: number | string): boolean {
    const raw = String(process.env.TELEGRAM_ALLOWED_CHAT_IDS || '').trim();
    if (!raw) return true;
    return raw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .includes(String(chatId));
}

/** Telegram bot / admin: yeni kurulum anahtarı üret */
router.post('/tablet/keys', async (req: Request, res: Response) => {
    try {
        if (!adminAuthorized(req)) {
            return res.status(401).json({ success: false, error: 'Yetkisiz' });
        }
        const createdBy = String(req.body?.createdBy || 'api').slice(0, 80);
        const key = await insertActivationKey(createdBy);
        res.json({
            success: true,
            data: { key, status: 'unused', created_at: new Date().toISOString() },
        });
    } catch (error) {
        console.error('[tablet/keys]', error);
        res.status(500).json({ success: false, error: 'Anahtar üretilemedi' });
    }
});

/**
 * Telegram webhook: /start /key /yeni
 * setWebhook → https://…/api/tablet/telegram/webhook
 */
router.post('/tablet/telegram/webhook', async (req: Request, res: Response) => {
    try {
        const msg = req.body?.message;
        const chatId = msg?.chat?.id;
        const text = String(msg?.text || '').trim();
        res.json({ ok: true });
        if (!chatId || !text) return;

        if (!telegramAllowed(chatId)) {
            await telegramSend(chatId, 'Bu botu kullanma yetkiniz yok.');
            return;
        }

        const cmd = text.split(/\s+/)[0].toLowerCase();
        if (cmd === '/start') {
            await telegramSend(
                chatId,
                'Saloon Tablet kurulum botu.\nYeni anahtar için: /key veya /yeni',
            );
            return;
        }
        if (cmd === '/key' || cmd === '/yeni') {
            try {
                const key = await insertActivationKey(`tg:${chatId}`);
                await telegramSend(
                    chatId,
                    `Kurulum anahtarı (bir cihaz):\n\n${key}\n\nTablette kurulumda bu kodu girin. İnternet gerekli.`,
                );
            } catch (e) {
                await telegramSend(
                    chatId,
                    `Anahtar üretilemedi: ${e instanceof Error ? e.message : e}`,
                );
            }
            return;
        }
        await telegramSend(chatId, 'Komutlar: /start  /key  /yeni');
    } catch (error) {
        console.error('[tablet/telegram/webhook]', error);
        if (!res.headersSent) res.json({ ok: true });
    }
});

/** Kurulum: anahtarı cihaza bağla (internet zorunlu) */
router.post('/tablet/activate', async (req: Request, res: Response) => {
    try {
        await ensureTabletTables();
        const deviceId = String(req.header('X-Device-Id') || req.body?.deviceId || '').slice(0, 80);
        const key = String(req.body?.key || '')
            .trim()
            .toUpperCase()
            .slice(0, 32);
        if (!deviceId || !key) {
            return res.status(400).json({ success: false, error: 'deviceId ve key gerekli' });
        }

        const found = await pool.query(
            `SELECT id, key_code, status, device_id FROM tablet_activation_keys WHERE key_code = $1`,
            [key],
        );
        if (!found.rows.length) {
            return res.status(404).json({ success: false, error: 'Geçersiz kurulum anahtarı' });
        }
        const row = found.rows[0];
        if (row.status === 'used' && row.device_id && row.device_id !== deviceId) {
            return res.status(409).json({ success: false, error: 'Bu anahtar başka cihazda kullanılmış' });
        }
        if (row.status === 'revoked') {
            return res.status(410).json({ success: false, error: 'Anahtar iptal edilmiş' });
        }

        await pool.query(
            `UPDATE tablet_activation_keys
             SET status = 'used', device_id = $2, used_at = COALESCE(used_at, NOW())
             WHERE id = $1`,
            [row.id, deviceId],
        );

        res.json({
            success: true,
            message: 'Kurulum anahtarı onaylandı',
            data: { key, device_id: deviceId },
        });
    } catch (error) {
        console.error('[tablet/activate]', error);
        res.status(500).json({ success: false, error: 'Aktivasyon başarısız' });
    }
});

/**
 * Kurulum bitti: tablet firmasını merkez companies + staff + services olarak kaydet.
 * Aktivasyon anahtarı cihazla eşleşmiş olmalı. Aynı cihaz/anahtar tekrar çağırırsa mevcut company_id döner.
 */
router.post('/tablet/setup/finalize', async (req: Request, res: Response) => {
    try {
        await ensureTabletTables();
        const deviceId = String(req.header('X-Device-Id') || req.body?.deviceId || '').slice(0, 80);
        const activationKey = String(req.body?.activationKey || '')
            .trim()
            .toUpperCase()
            .slice(0, 32);
        const companyIn = req.body?.company || {};
        const departmentsIn = Array.isArray(req.body?.departments) ? req.body.departments : [];
        const staffIn = Array.isArray(req.body?.staff) ? req.body.staff : [];
        const servicesIn = Array.isArray(req.body?.services) ? req.body.services : [];
        const sectorSlugs: string[] = Array.isArray(companyIn.sectorSlugs)
            ? companyIn.sectorSlugs.map((s: unknown) => String(s)).filter(Boolean)
            : [];

        if (!deviceId) {
            return res.status(400).json({ success: false, error: 'deviceId gerekli' });
        }
        if (!activationKey) {
            return res.status(400).json({ success: false, error: 'activationKey gerekli' });
        }
        const companyName = String(companyIn.name || '').trim();
        if (companyName.length < 2) {
            return res.status(400).json({ success: false, error: 'Firma adı gerekli' });
        }

        const keyRes = await pool.query(
            `SELECT id, key_code, status, device_id, company_name, meta
             FROM tablet_activation_keys WHERE key_code = $1`,
            [activationKey],
        );
        if (!keyRes.rows.length) {
            return res.status(404).json({ success: false, error: 'Geçersiz kurulum anahtarı' });
        }
        const keyRow = keyRes.rows[0];
        if (keyRow.status === 'revoked') {
            return res.status(410).json({ success: false, error: 'Anahtar iptal edilmiş' });
        }
        if (keyRow.device_id && keyRow.device_id !== deviceId) {
            return res.status(409).json({ success: false, error: 'Anahtar başka cihaza bağlı' });
        }

        const meta = (keyRow.meta && typeof keyRow.meta === 'object' ? keyRow.meta : {}) as Record<
            string,
            unknown
        >;
        if (meta.company_id) {
            return res.json({
                success: true,
                message: 'Firma zaten sisteme kayıtlı',
                data: { company_id: Number(meta.company_id), reused: true },
            });
        }

        const workStart = String(companyIn.workStart || '09:00').slice(0, 5);
        const workEnd = String(companyIn.workEnd || '19:00').slice(0, 5);
        const slotInterval = Math.min(
            480,
            Math.max(5, Number(companyIn.slotInterval) || 30),
        );
        const lat =
            companyIn.location?.latitude != null ? Number(companyIn.location.latitude) : null;
        const lng =
            companyIn.location?.longitude != null ? Number(companyIn.location.longitude) : null;

        const boardKey = crypto.randomBytes(4).toString('hex').toUpperCase();
        const adminKey = String(Math.floor(100000 + Math.random() * 900000));
        const verificationCode = Array.from({ length: 5 }, () =>
            'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 30)],
        ).join('');
        const licenseEnd = new Date();
        licenseEnd.setDate(licenseEnd.getDate() + 90);

        const client = await pool.connect();
        let companyId = 0;
        try {
            await client.query('BEGIN');

            const ins = await client.query(
                `INSERT INTO companies (
                    name, latitude, longitude,
                    is_active, is_verified, board_key, admin_key,
                    work_start_time, work_end_time, slot_interval,
                    genders, company_type, booking_flow, verification_code,
                    license_status, license_end_date, sms_enabled, payment_enabled, commission_rate
                 ) VALUES (
                    $1, $2, $3,
                    true, true, $4, $5,
                    $6, $7, $8,
                    $9::text[], 'ASIL', 'SPDT', $10,
                    'active', $11, true, false, 0
                 ) RETURNING id`,
                [
                    companyName,
                    lat,
                    lng,
                    boardKey,
                    adminKey,
                    workStart,
                    workEnd,
                    slotInterval,
                    [],
                    verificationCode,
                    licenseEnd.toISOString(),
                ],
            );
            companyId = ins.rows[0].id;

            for (const slug of sectorSlugs) {
                await client.query(
                    `INSERT INTO company_sectors (company_id, sector_id, is_primary)
                     SELECT $1, id, $3 FROM sectors WHERE slug = $2 AND is_active
                     ON CONFLICT DO NOTHING`,
                    [companyId, slug, slug === sectorSlugs[0]],
                );
            }

            const deptMap = new Map<string, number>();
            for (const d of departmentsIn) {
                const localId = String(d.id || d.localId || '');
                const name = String(d.name || 'Genel').slice(0, 100);
                const dr = await client.query(
                    `INSERT INTO departments (company_id, name) VALUES ($1, $2) RETURNING id`,
                    [companyId, name],
                );
                if (localId) deptMap.set(localId, dr.rows[0].id);
            }
            if (!deptMap.size) {
                const dr = await client.query(
                    `INSERT INTO departments (company_id, name) VALUES ($1, $2) RETURNING id`,
                    [companyId, 'Genel'],
                );
                deptMap.set('default', dr.rows[0].id);
            }
            const defaultDeptId = [...deptMap.values()][0];

            const serviceMap = new Map<string, number>();
            for (const s of servicesIn) {
                const localId = String(s.localId || s.id || '');
                const name = String(s.name || '').trim();
                if (!name) continue;
                const duration = Math.max(5, Number(s.durationMinutes) || slotInterval);
                const price = Math.max(0, Number(s.price) || 0);
                const sr = await client.query(
                    `INSERT INTO services (company_id, name, duration_minutes, price, booking_mode, is_active, department_id)
                     VALUES ($1, $2, $3, $4, 'staff', true, $5) RETURNING id`,
                    [companyId, name.slice(0, 255), duration, price, defaultDeptId],
                );
                if (localId) serviceMap.set(localId, sr.rows[0].id);
            }

            const fakePw = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
            for (const st of staffIn) {
                const firstName = String(st.firstName || '').trim().slice(0, 100);
                const lastName = String(st.lastName || '').trim().slice(0, 100);
                if (!firstName || !lastName) continue;
                const phoneRaw = String(st.phone || '').replace(/\D/g, '');
                const phone = phoneRaw ? formatPhoneTo12Digits(phoneRaw) : null;
                const title = String(st.title || 'Personel').slice(0, 100);
                const boardCode = `${firstName.slice(0, 3).toUpperCase()}-${crypto
                    .randomBytes(2)
                    .toString('hex')
                    .toUpperCase()}`;
                const email = `tablet-${deviceId.slice(0, 12)}-${boardCode.toLowerCase()}@staff.local`;
                const deptLocal = String(st.departmentId || '');
                const departmentId = (deptLocal && deptMap.get(deptLocal)) || defaultDeptId;

                await client.query(
                    `INSERT INTO users (
                        email, password, role, first_name, last_name, phone,
                        company_id, is_active, board_code, department_id, title
                     ) VALUES ($1, $2, 'staff', $3, $4, $5, $6, true, $7, $8, $9)`,
                    [email, fakePw, firstName, lastName, phone, companyId, boardCode, departmentId, title],
                );
            }

            await client.query(
                `UPDATE tablet_activation_keys
                 SET status = 'used',
                     device_id = $2,
                     company_name = $3,
                     used_at = COALESCE(used_at, NOW()),
                     meta = COALESCE(meta, '{}'::jsonb) || $4::jsonb
                 WHERE id = $1`,
                [
                    keyRow.id,
                    deviceId,
                    companyName,
                    JSON.stringify({
                        company_id: companyId,
                        finalized_at: new Date().toISOString(),
                        service_count: serviceMap.size,
                        staff_count: staffIn.length,
                    }),
                ],
            );

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        res.status(201).json({
            success: true,
            message: 'Firma sisteme kaydedildi',
            data: {
                company_id: companyId,
                admin_key: adminKey,
                board_key: boardKey,
            },
        });
    } catch (error) {
        console.error('[tablet/setup/finalize]', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Firma kaydı başarısız',
        });
    }
});

router.post('/tablet/sync', async (req: Request, res: Response) => {
    try {
        const deviceId = String(req.header('X-Device-Id') || req.body?.deviceId || '').slice(0, 80);
        if (!deviceId) {
            return res.status(400).json({ success: false, error: 'X-Device-Id gerekli' });
        }

        const payload = req.body || {};
        try {
            await ensureTabletTables();
            await pool.query(
                `INSERT INTO tablet_sync_snapshots (device_id, company_name, payload) VALUES ($1, $2, $3::jsonb)`,
                [deviceId, payload.company?.name || null, JSON.stringify(payload)],
            );
            if (payload.company?.activationKey) {
                await pool.query(
                    `UPDATE tablet_activation_keys SET company_name = $2 WHERE key_code = $1`,
                    [String(payload.company.activationKey).toUpperCase(), payload.company.name || null],
                );
            }
        } catch (dbErr) {
            console.warn('[tablet/sync] DB write skipped:', dbErr instanceof Error ? dbErr.message : dbErr);
        }

        res.json({
            success: true,
            data: {
                device_id: deviceId,
                received_at: new Date().toISOString(),
                event_count: Array.isArray(payload.events) ? payload.events.length : 0,
            },
        });
    } catch (error) {
        console.error('[tablet/sync]', error);
        res.status(500).json({ success: false, error: 'Senkron kaydı alınamadı' });
    }
});

router.get('/tablet/sync/:deviceId', async (req: Request, res: Response) => {
    try {
        const deviceId = String(req.params.deviceId || '').slice(0, 80);
        const result = await pool.query(
            `SELECT id, device_id, company_name, created_at
             FROM tablet_sync_snapshots
             WHERE device_id = $1
             ORDER BY id DESC
             LIMIT 20`,
            [deviceId],
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Okunamadı',
        });
    }
});

/** Tablet cihazı + aktivasyon anahtarı → company_id doğrula */
async function assertTabletCompanyAccess(
    deviceId: string,
    activationKey: string,
    companyId: number,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
    await ensureTabletTables();
    if (!deviceId || !activationKey || !companyId) {
        return { ok: false, status: 400, error: 'deviceId, activationKey ve companyId gerekli' };
    }
    const key = activationKey.trim().toUpperCase().slice(0, 32);
    const found = await pool.query(
        `SELECT device_id, status, meta FROM tablet_activation_keys WHERE key_code = $1`,
        [key],
    );
    if (!found.rows.length) {
        return { ok: false, status: 404, error: 'Geçersiz kurulum anahtarı' };
    }
    const row = found.rows[0];
    if (row.status === 'revoked') {
        return { ok: false, status: 410, error: 'Anahtar iptal edilmiş' };
    }
    if (row.device_id && row.device_id !== deviceId) {
        return { ok: false, status: 409, error: 'Anahtar başka cihaza bağlı' };
    }
    const meta = (row.meta && typeof row.meta === 'object' ? row.meta : {}) as Record<string, unknown>;
    const linked = Number(meta.company_id);
    if (!linked || linked !== companyId) {
        return { ok: false, status: 403, error: 'Bu firma bu tablete bağlı değil' };
    }
    return { ok: true };
}

/** Onay bekleyen web randevuları */
router.get('/tablet/appointments/pending', async (req: Request, res: Response) => {
    try {
        const deviceId = String(req.header('X-Device-Id') || req.query.deviceId || '').slice(0, 80);
        const activationKey = String(req.header('X-Activation-Key') || req.query.activationKey || '');
        const companyId = Number(req.query.companyId);
        const access = await assertTabletCompanyAccess(deviceId, activationKey, companyId);
        if (!access.ok) {
            return res.status(access.status).json({ success: false, error: access.error });
        }

        const result = await pool.query(
            `SELECT a.id, a.company_id, a.appointment_date, a.start_time, a.end_time, a.status,
                    a.customer_name, a.customer_phone, a.price, a.notes, a.staff_id,
                    COALESCE(s.name, '') AS service_name,
                    COALESCE(u.first_name || ' ' || u.last_name, '') AS staff_name
             FROM appointments a
             LEFT JOIN services s ON s.id = a.service_id
             LEFT JOIN users u ON u.id = a.staff_id
             WHERE a.company_id = $1 AND a.status = 'pending'
             ORDER BY a.appointment_date ASC, a.start_time ASC
             LIMIT 50`,
            [companyId],
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('[tablet/appointments/pending]', error);
        res.status(500).json({ success: false, error: 'Bekleyen randevular alınamadı' });
    }
});

/** Tablettten onay / red — SMS mevcut appointmentService üzerinden gider */
router.patch('/tablet/appointments/:id/status', async (req: Request, res: Response) => {
    try {
        const appointmentId = parseInt(String(req.params.id), 10);
        const deviceId = String(req.header('X-Device-Id') || req.body?.deviceId || '').slice(0, 80);
        const activationKey = String(req.header('X-Activation-Key') || req.body?.activationKey || '');
        const companyId = Number(req.body?.companyId);
        const status = String(req.body?.status || '');
        if (!Number.isFinite(appointmentId)) {
            return res.status(400).json({ success: false, error: 'Geçersiz id' });
        }
        if (status !== 'approved' && status !== 'cancelled') {
            return res.status(400).json({ success: false, error: 'status: approved | cancelled' });
        }
        const access = await assertTabletCompanyAccess(deviceId, activationKey, companyId);
        if (!access.ok) {
            return res.status(access.status).json({ success: false, error: access.error });
        }

        const existing = await pool.query(
            `SELECT id, company_id, status FROM appointments WHERE id = $1`,
            [appointmentId],
        );
        if (!existing.rows.length) {
            return res.status(404).json({ success: false, error: 'Randevu bulunamadı' });
        }
        if (Number(existing.rows[0].company_id) !== companyId) {
            return res.status(403).json({ success: false, error: 'Bu firmanın randevusu değil' });
        }

        const appointmentService = (await import('../services/appointment.service')).default;
        const updated = await appointmentService.updateAppointmentStatus(appointmentId, status);
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Güncellenemedi' });
        }
        res.json({ success: true, data: updated, message: status === 'approved' ? 'Onaylandı' : 'Reddedildi' });
    } catch (error) {
        console.error('[tablet/appointments/status]', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Durum güncellenemedi',
        });
    }
});

export default router;
