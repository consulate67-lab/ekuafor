import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db, pool } from '../db';
import { kvkkRequests } from '../db/schema/core';
import { authMiddleware, roleCheck } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/kvkk/data-request (PUBLIC)
 * KVKK md. 11 kapsamında veri sahibi talebi:
 *  - 'delete': verilerimin silinmesini istiyorum
 *  - 'correct': verilerimde düzeltme istiyorum
 *  - 'info': verilerim hakkında bilgi almak istiyorum
 *
 * Body: { requestType, requesterName, requesterEmail, requesterPhone?, companyId?, companyName?, reason? }
 *
 * KVKK md. 13: Talep en geç 30 gün içinde sonuçlandırılmalıdır.
 */
const requestSchema = z.object({
    requestType: z.enum(['delete', 'correct', 'info']),
    requesterName: z.string().min(2).max(200),
    requesterEmail: z.string().email().max(255),
    requesterPhone: z.string().max(20).optional(),
    companyId: z.number().int().optional(),
    companyName: z.string().max(255).optional(),
    reason: z.string().max(2000).optional(),
});

router.post('/data-request', async (req: Request, res: Response) => {
    try {
        const data = requestSchema.parse(req.body);
        const [created] = await db.insert(kvkkRequests).values({
            requestType: data.requestType,
            requesterName: data.requesterName,
            requesterEmail: data.requesterEmail,
            requesterPhone: data.requesterPhone || null,
            companyId: data.companyId || null,
            companyName: data.companyName || null,
            reason: data.reason || null,
            status: 'pending',
        }).returning();

        logger.info(
            {
                requestId: created.id,
                type: data.requestType,
                email: data.requesterEmail,
                companyId: data.companyId,
                companyName: data.companyName,
            },
            '[KVKK] Yeni veri sahibi talebi alındı'
        );

        res.status(201).json({
            success: true,
            message: 'Talebiniz alındı. KVKK md. 13 kapsamında en geç 30 gün içinde dönüş yapılacaktır.',
            requestId: created.id,
        });
    } catch (e: any) {
        if (e.name === 'ZodError') {
            return res.status(400).json({ success: false, error: 'Geçersiz veri', details: e.errors });
        }
        logger.error({ err: e.message }, '[KVKK] Talep oluşturma hatası');
        res.status(500).json({ success: false, error: 'Talep alınamadı' });
    }
});

/**
 * GET /api/kvkk/data-requests (ADMIN)
 * Tüm talepleri listele (en yeni önce).
 */
router.get('/data-requests', authMiddleware, roleCheck(['super_admin']), async (req: Request, res: Response) => {
    try {
        const status = String(req.query.status || '');
        let query = db.select().from(kvkkRequests).orderBy(kvkkRequests.createdAt).limit(500);
        const all = await query;
        const filtered = status ? all.filter(r => r.status === status) : all;
        res.json({ success: true, count: filtered.length, requests: filtered.reverse() });
    } catch (e: any) {
        logger.error({ err: e.message }, '[KVKK] Liste hatası');
        res.status(500).json({ success: false, error: 'Liste alınamadı' });
    }
});

/**
 * PATCH /api/kvkk/data-requests/:id (ADMIN)
 * Talebi işle: status güncelle, adminNote ekle.
 * Body: { status: 'processed' | 'rejected', adminNote? }
 */
router.patch('/data-requests/:id', authMiddleware, roleCheck(['super_admin']), async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
            return res.status(400).json({ success: false, error: 'Geçersiz id' });
        }
        const status = String(req.body?.status || '');
        if (!['processed', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, error: 'status: processed | rejected | pending' });
        }
        const adminNote = req.body?.adminNote ? String(req.body.adminNote).slice(0, 2000) : null;
        const [updated] = await db.update(kvkkRequests)
            .set({
                status,
                adminNote,
                processedAt: status !== 'pending' ? new Date() : null,
            })
            .where(kvkkRequests.id as any)
            .returning();

        if (!updated) {
            return res.status(404).json({ success: false, error: 'Talep bulunamadı' });
        }
        logger.info({ requestId: id, status, by: req.user?.email }, '[KVKK] Talep güncellendi');
        res.json({ success: true, request: updated });
    } catch (e: any) {
        logger.error({ err: e.message }, '[KVKK] Güncelleme hatası');
        res.status(500).json({ success: false, error: 'Güncellenemedi' });
    }
});

export default router;
