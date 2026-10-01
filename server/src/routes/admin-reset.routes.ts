/**
 * POST /api/_admin-reset/super-admin-password
 *
 * ONE-SHOT admin password reset for super_admin user.
 * Sprint 2 tamamlandiktan sonra /api/_dev/* endpointleri silindi.
 * Login erisimi acil olarak acmak icin gecici endpoint eklenmistir.
 *
 * Body veya query: { email: string, newPassword?: string }
 * Response: { success, userId, email, role, newPassword }
 *
 * SILINECEK: Sprint 3 baslangicinda (veya login geri acilinca).
 */
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

const router = Router();

router.post('/super-admin-password', async (req: Request, res: Response) => {
    const email = (req.body?.email || req.query?.email) as string;
    if (!email) {
        return res.status(400).json({ success: false, error: 'email required' });
    }
    const { default: pool } = await import('../config/database');
    try {
        const result = await pool.query(
            'SELECT id, email, role FROM users WHERE email = $1 LIMIT 1',
            [email]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'user not found' });
        }
        const user = result.rows[0];

        // Default: 16-char random password (önceki admin-reset-password pattern'i)
        let newPassword = req.body?.newPassword || req.query?.newPassword as string;
        if (!newPassword) {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
            newPassword = '';
            for (let i = 0; i < 16; i++) {
                newPassword += chars[Math.floor(Math.random() * chars.length)];
            }
        }

        const hash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, user.id]);

        logger.info(
            { targetEmail: email, targetUserId: user.id },
            '_admin-reset super-admin-password: SUCCESS'
        );

        return res.json({
            success: true,
            userId: user.id,
            email: user.email,
            role: user.role || 'super_admin',
            newPassword,
        });
    } catch (err: any) {
        logger.error({ err: err?.message }, '_admin-reset failed');
        return res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
