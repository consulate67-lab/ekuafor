import { Router, Request, Response } from 'express';
import companyService from '../services/company.service';
import employeeRoutes from './employee.routes';
import { authMiddleware, roleCheck } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();

// Nested routes
router.use('/:companyId/employees', employeeRoutes);

// Validation schema
const companySchema = z.object({
    name: z.string().min(2, 'Firma adı en az 2 karakter olmalıdır'),
    description: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('Geçerli bir email adresi giriniz').optional(),
    website: z.string().url('Geçerli bir website adresi giriniz').optional(),

    address_line: z.string().optional(),
    province_id: z.number().optional(),
    province_name: z.string().optional(),
    district_id: z.number().optional(),
    district_name: z.string().optional(),
    neighborhood_id: z.number().optional(),
    neighborhood_name: z.string().optional(),
    postal_code: z.string().optional(),

    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),

    bank_name: z.string().optional(),
    bank_branch: z.string().optional(),
    iban: z.string().optional().transform(v => {
        if (!v) return v;
        const cleaned = v.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        console.log(`IBAN Cleaned: "${v}" -> "${cleaned}" (Length: ${cleaned.length})`);
        return cleaned;
    }).refine(
        v => {
            if (!v) return true;
            const isValid = /^TR\d{24}$/.test(v);
            console.log(`IBAN Regex Check: "${v}" -> ${isValid}`);
            return isValid;
        },
        (v) => ({
            message: `Geçerli bir IBAN giriniz. TR ile başlamalı ve 26 karakter olmalıdır (Şu an temizlenmiş hali: ${v?.length || 0} karakter)`
        })
    ),
    account_holder_name: z.string().optional(),

    commission_rate: z.number().min(0).max(100).optional(),
    payment_enabled: z.boolean().optional(),
});

/**
 * POST /api/companies
 * Yeni firma oluştur
 */
router.post('/', authMiddleware, roleCheck(['super_admin']), async (req: Request, res: Response) => {
    try {
        // Validation
        const validatedData = companySchema.parse(req.body);

        // Auth middleware'den gelen kullanıcı ID'si
        const createdBy = req.user!.userId;

        const company = await companyService.createCompany(validatedData, createdBy);

        res.status(201).json({
            success: true,
            data: company
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validasyon hatası',
                details: error.errors
            });
        }

        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Firma oluşturulurken hata oluştu'
        });
    }
});

/**
 * GET /api/companies
 * Tüm firmaları listele (Herkes görebilir veya sadece giriş yapanlar)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const filters = {
            is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
            is_verified: req.query.is_verified === 'true' ? true : req.query.is_verified === 'false' ? false : undefined,
            search: req.query.search as string | undefined
        };

        const companies = await companyService.getAllCompanies(filters);

        res.json({
            success: true,
            data: companies,
            count: companies.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Firmalar yüklenirken hata oluştu'
        });
    }
});

/**
 * GET /api/companies/:id
 * Belirli bir firmayı getir
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const company = await companyService.getCompanyById(id);

        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'Firma bulunamadı'
            });
        }

        res.json({
            success: true,
            data: company
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Firma yüklenirken hata oluştu'
        });
    }
});

/**
 * PUT /api/companies/:id
 * Firma güncelle
 */
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const validatedData = companySchema.partial().parse(req.body);

        const company = await companyService.updateCompany(id, validatedData);

        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'Firma bulunamadı'
            });
        }

        res.json({
            success: true,
            data: company
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validasyon hatası',
                details: error.errors
            });
        }

        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Firma güncellenirken hata oluştu'
        });
    }
});

/**
 * DELETE /api/companies/:id
 * Firma sil (soft delete)
 */
router.delete('/:id', authMiddleware, roleCheck(['super_admin']), async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const success = await companyService.deleteCompany(id);

        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'Firma bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Firma başarıyla silindi'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Firma silinirken hata oluştu'
        });
    }
});

/**
 * POST /api/companies/:id/verify
 * Firma onayla
 */
router.post('/:id/verify', authMiddleware, roleCheck(['super_admin']), async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const company = await companyService.verifyCompany(id);

        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'Firma bulunamadı'
            });
        }

        res.json({
            success: true,
            data: company,
            message: 'Firma başarıyla onaylandı'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Firma onaylanırken hata oluştu'
        });
    }
});

export default router;
