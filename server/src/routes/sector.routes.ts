import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { db } from '../db';
import { sectors, companySectors } from '../db/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

/**
 * Sektör endpoint'leri (Sprint 2 — multi-tenant mimari).
 *
 * - GET /api/sectors          → Aktif sektör listesi (public, landing page için)
 * - GET /api/sectors/:slug    → Tek sektör (public)
 * - GET /api/companies/:id/sectors         → Firmanın sektörleri (auth: company_owner veya admin)
 * - POST /api/companies/:id/sectors        → Sektör ata (auth: company_owner)
 * - DELETE /api/companies/:id/sectors/:sectorId → Sektör kaldır (auth: company_owner)
 */

// Public: tüm aktif sektörler (landing page için icon grid)
router.get('/sectors', async (_req, res) => {
    try {
        const rows = await db
            .select({
                id: sectors.id,
                slug: sectors.slug,
                name_tr: sectors.nameTr,
                name_en: sectors.nameEn,
                icon: sectors.icon,
                color: sectors.color,
                has_medical_consent: sectors.hasMedicalConsent,
                default_duration_minutes: sectors.defaultDurationMinutes,
                display_order: sectors.displayOrder,
            })
            .from(sectors)
            .where(eq(sectors.isActive, true))
            .orderBy(sectors.displayOrder, sectors.id);
        res.json({ success: true, sectors: rows });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Public: tek sektör (slug ile)
router.get('/sectors/:slug', async (req, res) => {
    try {
        const rows = await db
            .select()
            .from(sectors)
            .where(and(eq(sectors.slug, req.params.slug), eq(sectors.isActive, true)))
            .limit(1);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Sektör bulunamadı' });
        }
        res.json({ success: true, sector: rows[0] });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Auth: firmanın sektörlerini getir
router.get('/companies/:id/sectors', authMiddleware, async (req, res) => {
    try {
        const companyId = parseInt(req.params.id, 10);
        if (isNaN(companyId)) {
            return res.status(400).json({ success: false, error: 'Geçersiz firma ID' });
        }
        const rows = await db
            .select({
                sector_id: companySectors.sectorId,
                sector_slug: sectors.slug,
                sector_name_tr: sectors.nameTr,
                sector_name_en: sectors.nameEn,
                sector_icon: sectors.icon,
                sector_color: sectors.color,
                sub_specialty: companySectors.subSpecialty,
                is_primary: companySectors.isPrimary,
            })
            .from(companySectors)
            .innerJoin(sectors, eq(companySectors.sectorId, sectors.id))
            .where(eq(companySectors.companyId, companyId));
        res.json({ success: true, company_id: companyId, sectors: rows });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Auth: firma sektör ata
router.post('/companies/:id/sectors', authMiddleware, async (req, res) => {
    try {
        const companyId = parseInt(req.params.id, 10);
        const { sector_id, sub_specialty, is_primary } = req.body || {};
        if (isNaN(companyId)) {
            return res.status(400).json({ success: false, error: 'Geçersiz firma ID' });
        }
        if (!sector_id || typeof sector_id !== 'number') {
            return res.status(400).json({ success: false, error: 'sector_id (number) gerekli' });
        }

        // Eğer is_primary=true, diğer primary'leri false yap
        if (is_primary === true) {
            await db
                .update(companySectors)
                .set({ isPrimary: false })
                .where(eq(companySectors.companyId, companyId));
        }

        await db
            .insert(companySectors)
            .values({
                companyId,
                sectorId: sector_id,
                subSpecialty: sub_specialty || null,
                isPrimary: is_primary === true,
            })
            .onConflictDoUpdate({
                target: [companySectors.companyId, companySectors.sectorId],
                set: {
                    subSpecialty: sub_specialty || null,
                    isPrimary: is_primary === true,
                },
            });

        res.json({ success: true, company_id: companyId, sector_id, is_primary: !!is_primary });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Auth: firma sektör kaldır
router.delete('/companies/:id/sectors/:sectorId', authMiddleware, async (req, res) => {
    try {
        const companyId = parseInt(req.params.id, 10);
        const sectorId = parseInt(req.params.sectorId, 10);
        if (isNaN(companyId) || isNaN(sectorId)) {
            return res.status(400).json({ success: false, error: 'Geçersiz firma veya sektör ID' });
        }
        const result = await db
            .delete(companySectors)
            .where(
                and(
                    eq(companySectors.companyId, companyId),
                    eq(companySectors.sectorId, sectorId)
                )
            );
        res.json({ success: true, deleted: result.rowCount ?? 0, company_id: companyId, sector_id: sectorId });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
