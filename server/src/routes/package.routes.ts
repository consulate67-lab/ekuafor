import { Router, Request, Response } from 'express';
import packageService from '../services/package.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();

const packageSchema = z.object({
    name: z.string().min(2, 'Paket adı en az 2 karakter olmalıdır'),
    description: z.string().optional(),
    duration_minutes: z.number().min(1, 'Süre en az 1 dakika olmalıdır'),
    price: z.number().min(0, 'Ücret 0 veya daha fazla olmalıdır'),
    service_ids: z.array(z.number()).min(1, 'En az bir hizmet seçilmelidir')
});

// Tüm paketleri listele (Firma bazlı)
const publicPackageHandler = async (req: Request, res: Response, next: any) => {
    const { company_id } = req.query;
    if (company_id) {
        try {
            const companyId = parseInt(company_id as string);
            console.log(`[GET /packages] Public Access Attempt: Company=${companyId}`);
            if (isNaN(companyId)) {
                console.log(`[GET /packages] Invalid Company ID: ${company_id}`);
                return res.status(400).json({ success: false, error: 'Geçersiz firma ID' });
            }
            const packages = await packageService.getPackagesByCompany(companyId);
            console.log(`[GET /packages] Found ${packages.length} packages for Company=${companyId}`);
            return res.json({ success: true, data: packages });
        } catch (error) {
            console.error('[GET /packages] Public Error:', error);
            return next(error);
        }
    }
    next();
};

const privatePackageHandler = async (req: Request, res: Response, next: any) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Firma ID bulunamadı' });
        }
        const packages = await packageService.getPackagesByCompany(companyId);
        res.json({ success: true, data: packages });
    } catch (error) {
        next(error);
    }
};

router.get(['/', ''], publicPackageHandler, authMiddleware, privatePackageHandler);

// Yeni paket ekle
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Firma ID bulunamadı' });
        }

        const { service_ids, ...pkgData } = packageSchema.parse(req.body);
        const pkg = await packageService.createPackage({ ...pkgData, company_id: companyId }, service_ids);
        res.status(201).json({ success: true, data: pkg });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validasyon hatası', details: error.errors });
        }
        res.status(500).json({ success: false, error: error.message || 'Paket oluşturulurken hata oluştu' });
    }
});

// Paket güncelle
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { service_ids, ...pkgData } = packageSchema.partial().parse(req.body);
        const pkg = await packageService.updatePackage(id, pkgData, service_ids);
        if (!pkg) {
            return res.status(404).json({ success: false, error: 'Paket bulunamadı' });
        }
        res.json({ success: true, data: pkg });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Paket güncellenirken hata oluştu' });
    }
});

// Paket sil
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
