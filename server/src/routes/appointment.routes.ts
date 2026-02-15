import { Router, Request, Response } from 'express';
import appointmentService from '../services/appointment.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();

const appointmentSchema = z.object({
    service_id: z.number(),
    staff_id: z.number().optional(),
    appointment_date: z.string(),
    start_time: z.string(),
    end_time: z.string(),
    notes: z.string().optional(),
    price: z.number().optional(),
});

// Randevuları listele (Firma bazlı, isteğe bağlı durum filtresiyle)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const companyId = req.user?.companyId;
        const status = req.query.status as string;
        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Firma ID bulunamadı' });
        }
        const appointments = await appointmentService.getAppointmentsByCompany(companyId, status);
        res.json({ success: true, data: appointments });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Randevular yüklenirken hata oluştu' });
    }
});

// Tarih aralığına göre randevuları getir (Takvim için)
router.get('/calendar', authMiddleware, async (req: Request, res: Response) => {
    try {
        const companyId = req.user?.companyId;
        const { start, end } = req.query;
        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Firma ID bulunamadı' });
        }
        const appointments = await appointmentService.getAppointmentsByDateRange(
            companyId,
            start as string,
            end as string
        );
        res.json({ success: true, data: appointments });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Takvim verileri yüklenirken hata oluştu' });
    }
});

// Yeni randevu oluştur (Manuel giriş)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Firma ID bulunamadı' });
        }
        const validatedData = appointmentSchema.parse(req.body);
        const appointment = await appointmentService.createAppointment({
            ...validatedData,
            company_id: companyId,
            status: 'approved' // İşletme sahibi eklediği için direkt onaylı
        });
        res.status(201).json({ success: true, data: appointment });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validasyon hatası', details: error.errors });
        }
        res.status(500).json({ success: false, error: 'Randevu oluşturulurken hata oluştu' });
    }
});

// Randevu durumu güncelle (Onayla/İptal)
router.patch('/:id/status', authMiddleware, async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body;
        const appointment = await appointmentService.updateAppointmentStatus(id, status);
        if (!appointment) {
            return res.status(404).json({ success: false, error: 'Randevu bulunamadı' });
        }
        res.json({ success: true, data: appointment });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Randevu durumu güncellenirken hata oluştu' });
    }
});

export default router;
