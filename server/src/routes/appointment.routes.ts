import { Router, Request, Response } from 'express';
import appointmentService from '../services/appointment.service';
import { createBooking, BookingError } from '../services/booking.service';
import { authMiddleware, companyAuth, optionalCompanyAuth, canAccessCompany, requireCompanyAccess } from '../middleware/auth.middleware';
import pool from '../config/database';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { normalizePhone } from '../utils/phone';

const router = Router();

const id = z.preprocess(v => (v === '' ? null : v), z.coerce.number().int().positive().nullable().optional());
const positive = z.coerce.number().int().positive().optional();
const money = z.coerce.number().nonnegative().optional();

const bookingSchema = z.object({
    company_id: z.coerce.number().int().positive(),
    services: z.array(z.object({
        service_id: id,
        id: id,
        staff_id: id,
        duration_minutes: positive,
        price: money,
    })).optional(),
    service_ids: z.array(z.coerce.number().int().positive()).optional(),
    service_id: id,
    staff_id: id,
    resource_id: id,
    class_session_id: id,
    party_size: positive,
    appointment_date: z.string().optional(),
    start_time: z.string().optional(),
    duration_minutes: positive,
    price: money,
    status: z.enum(['pending', 'approved', 'completed']).optional(),
    notes: z.string().max(1000).optional().nullable(),
    customer_name: z.string().max(255).optional().nullable(),
    customer_phone: z.string().max(20).optional().nullable(),
    device_id: z.string().max(255).optional().nullable(),
    client_request_id: z.string().max(64).optional().nullable(),
});

// Randevuları listele (Firma bazlı, isteğe bağlı durum filtresiyle)
// 1. PUBLIC HANDLER: müşterinin kendi randevuları (cihaz / telefon / id) ve firmanın kendi listesi (token veya board anahtarı)
const publicAppointmentHandler = async (req: Request, res: Response, next: any) => {
    const companyId = req.query.company_id ? parseInt(req.query.company_id as string) : undefined;
    const customerPhone = req.query.customer_phone as string;
    const idsString = req.query.ids as string;
    const deviceId = req.query.device_id as string;

    if (companyId && !customerPhone && !idsString && !deviceId && !canAccessCompany(req, companyId)) {
        return res.status(403).json({ success: false, error: 'Bu firmanın randevularını görme yetkiniz yok' });
    }

    if (companyId || customerPhone || idsString || deviceId) {
        try {
            let appointments;
            if (idsString) {
                const ids = idsString.split(',').map(s => parseInt(s)).filter(id => !isNaN(id));
                appointments = await appointmentService.getAppointmentsByIds(ids);
            } else if (deviceId) {
                appointments = await appointmentService.getAppointmentsByDevice(deviceId);
            } else if (customerPhone) {
                appointments = await appointmentService.getAppointmentsByPhone(customerPhone, companyId);
            } else {
                appointments = await appointmentService.getAppointmentsByCompany(
                    companyId!,
                    req.query.status as string,
                    undefined,
                    req.query.start_date as string,
                    req.query.end_date as string
                );
            }
            return res.json({ success: true, data: appointments });
        } catch (error) {
            console.error('[GET /appointments] Public Error:', error);
            return next(error);
        }
    }
    next();
};

// 2. PRIVATE HANDLER: Dashboard access (authenticated via authMiddleware)
const privateAppointmentHandler = async (req: Request, res: Response, next: any) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.userId;

        if (!companyId || !userId) return res.status(403).json({ success: false, error: 'Firma/Kullanıcı bilgisi eksik' });

        const roleResult = await pool.query('SELECT role FROM company_users WHERE company_id=$1 AND user_id=$2', [companyId, userId]);
        let companyRole = roleResult.rows[0]?.role;

        if (!companyRole) {
            const userCheck = await pool.query('SELECT role, company_id FROM users WHERE id = $1 AND company_id = $2', [userId, companyId]);
            if (userCheck.rows.length > 0) companyRole = 'staff';
        }

        if (req.user?.role === 'super_admin') { /* allowed */ } 
        else if (!companyRole) return res.status(403).json({ success: false, error: 'Bu firmada yetkiniz bulunmuyor' });

        let staffId: number | undefined = userId;
        const isAdminOrManager = req.user?.role === 'super_admin' || companyRole === 'owner' || companyRole === 'manager' || req.query.all === 'true';

        if (isAdminOrManager) staffId = undefined;

        let targetCompanyId = companyId;
        if (req.user?.role === 'super_admin' && req.query.company_id) targetCompanyId = parseInt(req.query.company_id as string);

        const appointments = await appointmentService.getAppointmentsByCompany(targetCompanyId, req.query.status as string, staffId, req.query.start_date as string, req.query.end_date as string);
        res.json({ success: true, data: appointments });
    } catch (error) {
        next(error);
    }
};

router.get('/', optionalCompanyAuth, publicAppointmentHandler, authMiddleware, privateAppointmentHandler);

router.get('/calendar', authMiddleware, async (req: Request, res: Response, next: any) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.userId;
        const { start, end } = req.query;
        if (!companyId || !userId) return res.status(403).json({ success: false, error: 'Firma/Kullanıcı bilgisi eksik' });

        const roleResult = await pool.query('SELECT role FROM company_users WHERE company_id=$1 AND user_id=$2', [companyId, userId]);
        const companyRole = roleResult.rows[0]?.role;
        if (req.user?.role !== 'super_admin' && !companyRole) return res.status(403).json({ success: false, error: 'Bu firmada yetkiniz bulunmuyor' });

        let staffId: number | undefined;
        if (companyRole === 'staff') staffId = userId;

        const appointments = await appointmentService.getAppointmentsByDateRange(companyId, start as string, end as string, staffId);
        res.json({ success: true, data: appointments });
    } catch (error) {
        next(error);
    }
});

router.get('/company/:companyId/completed', authMiddleware, async (req: Request, res: Response, next: any) => {
    try {
        const companyId = parseInt(req.params.companyId);
        const { startDate, endDate, search } = req.query;
        if (req.user?.companyId !== companyId && req.user?.role !== 'super_admin') return res.status(403).json({ success: false, error: 'Yetkisiz' });
        const appointments = await appointmentService.getCompletedAppointments(companyId, startDate as string, endDate as string, search as string);
        res.json({ success: true, data: appointments });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/appointments
 * Müşteri (anonim veya müşteri hesabı) → `pending`. Firma kullanıcısı / board → varsayılan `approved`,
 * çalışma saati ve fiyat kısıtı yok. Çakışma ve kapasite kontrolü her durumda sunucuda yapılır.
 */
router.post('/', optionalCompanyAuth, async (req: Request, res: Response) => {
    try {
        const body = bookingSchema.parse(req.body);
        const user = req.user;
        const byCompany = !!user && user.role !== 'customer' && canAccessCompany(req, body.company_id);

        const items = body.services?.length
            ? body.services.map(s => ({ serviceId: Number(s.service_id ?? s.id), staffId: s.staff_id, durationMinutes: s.duration_minutes, price: s.price }))
            : (body.service_ids?.length ? body.service_ids : body.service_id ? [body.service_id] : []).map(serviceId => ({ serviceId }));
        if (!body.class_session_id && (items.length === 0 || items.some(i => !i.serviceId))) {
            return res.status(400).json({ success: false, error: 'En az bir hizmet seçilmelidir' });
        }

        const appointment = await createBooking({
            companyId: body.company_id,
            items,
            staffId: body.staff_id ?? (byCompany && user?.role === 'staff' ? user.userId : null),
            resourceId: body.resource_id,
            classSessionId: body.class_session_id,
            partySize: body.party_size,
            date: body.appointment_date,
            startTime: body.start_time,
            durationMinutes: body.duration_minutes,
            price: body.price,
            status: byCompany ? (body.status || 'approved') : 'pending',
            notes: body.notes,
            customerId: user?.role === 'customer' ? user.userId : null,
            customerName: body.customer_name,
            customerPhone: body.customer_phone,
            deviceId: body.device_id,
            clientRequestId: body.client_request_id,
            byCompany,
        });
        res.status(201).json({ success: true, data: appointment });
    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: 'Validasyon hatası', details: error.errors });
        if (error instanceof BookingError) return res.status(error.status).json({ success: false, error: error.message });
        logger.error({ err: error }, '[POST /api/appointments] randevu oluşturulamadı');
        res.status(500).json({ success: false, error: 'Randevu oluşturulamadı' });
    }
});

/**
 * PATCH /api/appointments/:id/rate
 * Tamamlanmış randevuyu, randevuyu alan cihaz / telefon / müşteri hesabı puanlayabilir.
 */
router.patch('/:id/rate', optionalCompanyAuth, async (req: Request, res: Response) => {
    try {
        const appointmentId = parseInt(req.params.id, 10);
        const rating = Number(req.body?.rating);
        if (Number.isNaN(appointmentId)) return res.status(400).json({ success: false, error: 'Geçersiz id' });
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ success: false, error: 'Puan 1-5 arasında olmalıdır' });

        const found = await pool.query('SELECT status, device_id, customer_phone, customer_id FROM appointments WHERE id = $1', [appointmentId]);
        const row = found.rows[0];
        if (!row) return res.status(404).json({ success: false, error: 'Randevu bulunamadı' });

        const { device_id, customer_phone } = req.body || {};
        const isOwner = (!!device_id && row.device_id === device_id)
            || (!!customer_phone && !!row.customer_phone && normalizePhone(String(customer_phone)) === row.customer_phone)
            || (req.user?.role === 'customer' && !!row.customer_id && req.user.userId === row.customer_id);
        if (!isOwner) return res.status(403).json({ success: false, error: 'Bu randevuyu puanlama yetkiniz yok' });
        if (row.status !== 'completed') return res.status(409).json({ success: false, error: 'Sadece tamamlanan randevular puanlanabilir' });

        const comment = typeof req.body?.comment === 'string' ? req.body.comment.slice(0, 1000) : undefined;
        const appointment = await appointmentService.rateAppointment(appointmentId, rating, comment);
        res.json({ success: true, data: appointment });
    } catch (error) {
        logger.error({ err: error }, '[PATCH /api/appointments/:id/rate] puanlama hatası');
        res.status(500).json({ success: false, error: 'Puanlama kaydedilemedi' });
    }
});

router.patch('/:id/status', companyAuth, async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const existing = await pool.query('SELECT company_id FROM appointments WHERE id = $1', [id]);
        if (existing.rows.length === 0) return res.status(404).json({ success: false, error: 'Bulunamadı' });
        if (!canAccessCompany(req, existing.rows[0].company_id)) {
            return res.status(403).json({ success: false, error: 'Bu firmada yetkiniz bulunmuyor.' });
        }

        const { status, price, payment_method, technical_notes, used_materials } = req.body;
        const appointment = await appointmentService.updateAppointmentStatus(id, status, price, payment_method, technical_notes, used_materials);
        if (!appointment) return res.status(404).json({ success: false, error: 'Bulunamadı' });
        res.json({ success: true, data: appointment });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Hata' });
    }
});

router.post('/customers/sync', async (req: Request, res: Response) => {
    try {
        const { device_id, customer_phone, push_token } = req.body;
        if (!device_id || !customer_phone) return res.status(400).json({ success: false, error: 'Eksik bilgi' });
        await appointmentService.syncDeviceWithPhone(device_id, customer_phone, push_token);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Hata' });
    }
});

router.get('/customers/notifications', async (req: Request, res: Response) => {
    try {
        const { phone } = req.query;
        if (!phone) return res.json({ success: true, data: [] });
        const notifications = await appointmentService.getCustomerNotifications(phone as string);
        res.json({ success: true, data: notifications });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.get('/companies/:id/reviews', async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const reviews = await appointmentService.getCompanyReviews(id, req.query.sort as string);
        res.json({ success: true, data: reviews });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.get('/history', authMiddleware, async (req: Request, res: Response) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) return res.status(403).json({ success: false });
        const history = await appointmentService.getCustomerHistory(companyId, req.query.search as string);
        res.json({ success: true, data: history });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// --- CRM ROUTES ---

router.get('/company/:companyId/customers-crm', authMiddleware, async (req: Request, res: Response) => {
    try {
        const companyId = parseInt(req.params.companyId);
        if (req.user?.companyId !== companyId && req.user?.role !== 'super_admin') return res.status(403).json({ success: false });
        const customers = await appointmentService.getCustomersCRM(companyId, req.query.search as string);
        res.json({ success: true, data: customers });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

router.post('/company/:companyId/send-customer-message', authMiddleware, requireCompanyAccess('companyId'), async (req: Request, res: Response) => {
    try {
        const companyId = parseInt(req.params.companyId);
        const { phone: rawPhone, message, type } = req.body;
        const { normalizePhone } = require('../utils/phone');
        const phone = normalizePhone(rawPhone);

        if (type === 'push') {
            const pushService = require('../services/push.service').default;
            const token = await pushService.getPushTokenByPhone(phone);
            if (!token) return res.status(404).json({ success: false, error: 'Push token bulunamadı' });
            await pushService.sendNotification(token, 'Yeni Mesaj', message, { type: 'manual' }, phone);
        } else if (type === 'sms') {
            const smsService = require('../services/sms.service').default;
            await smsService.sendSms(companyId, phone, message);
        }
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
