import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import pool from '../config/database';

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

/** Telegram bot / admin: yeni kurulum anahtarı üret */
router.post('/tablet/keys', async (req: Request, res: Response) => {
    try {
        if (!adminAuthorized(req)) {
            return res.status(401).json({ success: false, error: 'Yetkisiz' });
        }
        await ensureTabletTables();
        const key = makeKey();
        const createdBy = String(req.body?.createdBy || 'api').slice(0, 80);
        await pool.query(
            `INSERT INTO tablet_activation_keys (key_code, created_by, meta) VALUES ($1, $2, $3::jsonb)`,
            [key, createdBy, JSON.stringify({ source: createdBy })],
        );
        res.json({
            success: true,
            data: { key, status: 'unused', created_at: new Date().toISOString() },
        });
    } catch (error) {
        console.error('[tablet/keys]', error);
        res.status(500).json({ success: false, error: 'Anahtar üretilemedi' });
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

export default router;
