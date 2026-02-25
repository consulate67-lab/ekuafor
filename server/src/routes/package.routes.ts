import { Router, Request, Response } from 'express';
import packageService from '../services/package.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();

const packageSchema = z.object({
    name: z.string().min(2, 'Paket adı en az 2 karakter olmalıdır'),
    description: z.string().nullable().optional(),
    duration_minutes: z.preprocess((val) => Number(val), z.number().min(1, 'Süre en az 1 dakika olmalıdır')),
    price: z.preprocess((val) => Number(val), z.number().min(0, 'Ücret 0 veya daha fazla olmalıdır')),
    items: z.array(z.object({
        service_id: z.number(),
        staff_id: z.number().nullable().optional(),
        department_id: z.number().nullable().optional()
    })).min(1, 'En az bir hizmet seçilmelidir'),
    staff_id: z.number().nullable().optional(),
    department_id: z.number().nullable().optional(),
    company_id: z.number().optional(),
    id: z.number().nullable().optional()
});

// GET /api/packages
router.get('/', async (req: Request, res: Response) => {
    try {
        const company_id = req.query.company_id || (req as any).user?.companyId;
        if (!company_id) {
            return res.status(400).json({ success: false, error: 'company_id gereklidir' });
        }
        const data = await packageService.getPackagesByCompany(Number(company_id));
        res.json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/packages
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) return res.status(403).json({ success: false, error: 'Firma ID bulunamadı' });

        const validation = packageSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: 'Validasyon hatası',
                details: validation.error.errors.map(e => ({ path: e.path, message: e.message }))
            });
        }
        const { items, ...pkgData } = validation.data;

        const pkg = await packageService.createPackage(
            { ...pkgData, company_id: companyId },
            items
        );
        res.status(201).json({ success: true, data: pkg });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validasyon hatası', details: error.errors });
        }
        res.status(500).json({ success: false, error: error.message || 'Paket oluşturulurken hata oluştu' });
    }
});

// PUT /api/packages/:id
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const companyId = req.user?.companyId;
        if (!companyId) return res.status(403).json({ success: false, error: 'Firma ID bulunamadı' });

        const validation = packageSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: 'Validasyon hatası',
                details: validation.error.errors.map(e => ({ path: e.path, message: e.message }))
            });
        }
        const { items, ...pkgData } = validation.data;

        const pkg = await packageService.updatePackage(id, pkgData, items);
        if (!pkg) {
            return res.status(404).json({ success: false, error: 'Paket bulunamadı' });
        }
        res.json({ success: true, data: pkg });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validasyon hatası', details: error.errors });
        }
        res.status(500).json({ success: false, error: error.message || 'Paket güncellenirken hata oluştu' });
    }
});

// DELETE /api/packages/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const success = await packageService.deletePackage(id);
        if (!success) {
            return res.status(404).json({ success: false, error: 'Paket bulunamadı' });
        }
        res.json({ success: true, message: 'Paket silindi' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Paket silinirken hata oluştu' });
    }
});

export default router;
