import { Router, Request, Response } from 'express';
import serviceService from '../services/service.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();

const serviceSchema = z.object({
    name: z.string().min(2, 'Hizmet adı en az 2 karakter olmalıdır'),
    description: z.string().optional(),
    duration_minutes: z.number().min(1, 'Süre en az 1 dakika olmalıdır'),
    price: z.number().min(0, 'Ücret 0 veya daha fazla olmalıdır'),
});

// Debug middleware for this router
router.use((req, res, next) => {
    console.log(`[ServiceRouter] Request received: ${req.method} ${req.path}`);
    next();
});

// Ping route for debugging
router.get('/ping', (req, res) => {
    res.json({ success: true, message: 'Service routes working', timestamp: new Date() });
});

// Tüm hizmetleri listele (Firma bazlı) - Hem '/' hem de boş string '' yakalasın
// Tüm hizmetleri listele (Firma bazlı) - Hem '/' hem de boş string '' yakalasın
// Tüm hizmetleri listele (Firma bazlı) - Hem '/' hem de boş string '' yakalasın
// Tüm hizmetleri listele (Firma bazlı) - Hem '/' hem de boş string '' yakalasın
const publicServiceHandler = async (req: Request, res: Response, next: any) => {
    if (req.query.company_id) {
        try {
            const companyId = parseInt(req.query.company_id as string);
            console.log(`[GET /services] Public Access: Company=${companyId}`);
            if (isNaN(companyId)) {
                return res.status(400).json({ success: false, error: 'Geçersiz firma ID' });
            }
            const services = await serviceService.getServicesByCompany(companyId);
            return res.json({ success: true, data: services });
        } catch (error) {
            console.error('[GET /services] Public Error:', error);
            // Pass to error handler
            return next(error);
        }
    }
    next();
};

const privateServiceHandler = async (req: Request, res: Response, next: any) => {
    try {
        const companyId = req.user?.companyId;
        console.log(`[GET /services] Private Access: Company=${companyId}`);

        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Firma ID bulunamadı' });
        }
        const services = await serviceService.getServicesByCompany(companyId);
        res.json({ success: true, data: services });
    } catch (error) {
        console.error('[GET /services] Private Error:', error);
        next(error);
    }
};

router.get(['/', ''], publicServiceHandler, authMiddleware, privateServiceHandler);

// Yeni hizmet ekle
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const companyId = req.user?.companyId;
        console.log('Hizmet ekleme isteği:', { body: req.body, companyId });

        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Firma ID bulunamadı. Lütfen bir firmaya bağlı olduğunuzdan emin olun.' });
        }

        const validatedData = serviceSchema.parse(req.body);
        const service = await serviceService.createService({ ...validatedData, company_id: companyId });
        console.log('Hizmet başarıyla oluşturuldu:', service.id);
        res.status(201).json({ success: true, data: service });
    } catch (error: any) {
        console.error('Hizmet oluşturma hatası:', error);

        // Postgres Foreign Key Error (23503)
        // Bu hata genellikle company_id'nin companies tablosunda karşılığı olmadığında alınır.
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                error: 'Bağlı olduğunuz firma bilgisi sistemde bulunamadı. Lütfen yönetici ile iletişime geçin.'
            });
        }

        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validasyon hatası', details: error.errors });
        }
        res.status(500).json({ success: false, error: error.message || 'Hizmet oluşturulurken hata oluştu' });
    }
});

// Hizmet güncelle
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const validatedData = serviceSchema.partial().parse(req.body);
        const service = await serviceService.updateService(id, validatedData);
        if (!service) {
            return res.status(404).json({ success: false, error: 'Hizmet bulunamadı' });
        }
        res.json({ success: true, data: service });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Hizmet güncellenirken hata oluştu' });
    }
});

// Hizmet sil
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const success = await serviceService.deleteService(id);
        if (!success) {
            return res.status(404).json({ success: false, error: 'Hizmet bulunamadı' });
        }
        res.json({ success: true, message: 'Hizmet silindi' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Hizmet silinirken hata oluştu' });
    }
});

export default router;
