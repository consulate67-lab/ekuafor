import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/_dev/admin-reset-password
 *
 * Development-only admin endpoint (2026-09-27 eklendi).
 * Super admin sifre sifirlama + 7 gunluk JWT token uretir.
 *
 * Guvenlik:
 * - ADMIN_KEY env variable ile korunuyor (X-Admin-Key header)
 * - Endpoint Railway container icinde kosuyor, internal DB DNS cozumlenir
 * - Sadece ONE-SHOT kullanimi icin tasarlandi, sonra silinecek
 *
 * Body: { email: string } veya query: ?email=
 * Header: X-Admin-Key: <ADMIN_KEY>
 *
 * Response: { success, email, newPassword, jwt, userId, role, expiresIn }
 */
router.post('/admin-reset-password', async (req: Request, res: Response) => {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) {
        return res.status(503).json({ success: false, error: 'ADMIN_KEY env not configured' });
    }

    const providedKey = req.headers['x-admin-key'];
    if (!providedKey || providedKey !== adminKey) {
        logger.warn({ ip: req.ip, path: req.path }, '_dev reset-password: invalid admin key');
        return res.status(403).json({ success: false, error: 'Forbidden: invalid admin key' });
    }

    const email = (req.body?.email || req.query?.email) as string;
    if (!email) {
        return res.status(400).json({ success: false, error: 'email required (body.email or ?email=)' });
    }

    // Lazy import (server config DATABASE_URL okuyor)
    const { default: pool } = await import('../config/database');

    try {
        // 1. User'i bul
        const result = await pool.query(
            'SELECT id, email, role, full_name FROM users WHERE email = $1 LIMIT 1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found', email });
        }

        const user = result.rows[0];

        // 2. Yeni sifre uret
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let newPassword = '';
        for (let i = 0; i < 16; i++) {
            newPassword += chars[Math.floor(Math.random() * chars.length)];
        }

        // 3. bcrypt hash
        const hash = await bcrypt.hash(newPassword, 10);

        // 4. password_hash guncelle
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [hash, user.id]
        );

        // 5. JWT token
        if (!process.env.JWT_SECRET) {
            return res.status(503).json({ success: false, error: 'JWT_SECRET missing' });
        }
        const token = jwt.sign(
            {
                sub: String(user.id),
                email: user.email,
                role: user.role || 'super_admin',
                type: 'admin',
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        logger.info(
            { adminKey: '***', targetEmail: email, targetUserId: user.id },
            '_dev admin-reset-password: SUCCESS'
        );

        return res.json({
            success: true,
            email: user.email,
            userId: user.id,
            role: user.role || 'super_admin',
            fullName: user.full_name ?? null,
            newPassword,
            token,
            expiresIn: '7d',
        });
    } catch (err: any) {
        logger.error({ err: err?.message }, '_dev admin-reset-password failed');
        return res.status(500).json({ success: false, error: err?.message || 'Internal error' });
    }
});

/**
 * GET /api/_dev/admin-info
 *
 * Debug icin user bilgisi (sifre gostermeden)
 */
router.get('/admin-info', async (req: Request, res: Response) => {
    const adminKey = process.env.ADMIN_KEY;
    const providedKey = req.headers['x-admin-key'];
    if (!adminKey || providedKey !== adminKey) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const email = req.query?.email as string;
    if (!email) {
        return res.status(400).json({ success: false, error: 'email required' });
    }
    const { default: pool } = await import('../config/database');
    const result = await pool.query(
        'SELECT id, email, role, full_name, created_at, updated_at FROM users WHERE email = $1',
        [email]
    );
    if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.json({ success: true, user: result.rows[0] });
});

export default router;
