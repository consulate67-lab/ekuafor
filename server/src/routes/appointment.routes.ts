import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import jwt from 'jsonwebtoken';
import appointmentService from '../services/appointment.service';
import { authMiddleware } from '../middleware/auth.middleware';
import pool from '../config/database';
import { z } from 'zod';
import { logger } from '../utils/logger';

const router = Router();

const appointmentSchema = z.object({
    service_id: z.union([z.number(), z.string().transform(v => parseInt(v, 10))]).optional(),
    service_ids: z.array(z.number()).optional(),
    services: z.array(z.any()).optional(), // Add services array for staff overrides
    package_id: z.union([z.number(), z.string().transform(v => parseInt(v, 10))]).optional().nullable(),
    staff_id: z.union([z.number(), z.string().transform(v => parseInt(v, 10))]).optional().nullable(),
    appointment_date: z.string(),
    start_time: z.string(),
    end_time: z.string(),
    notes: z.string().optional(),
    price: z.union([z.number(), z.string().transform(v => parseFloat(v))]).optional(),
    customer_name: z.string().optional(),
    customer_phone: z.string().optional(),
    device_id: z.string().optional(),
});

// Randevuları listele (Firma bazlı, isteğe bağlı durum filtresiyle)
// 1. PUBLIC HANDLER: Check if it's a public booking request (via query params)
const publicAppointmentHandler = async (req: Request, res: Response, next: any) => {
    const companyId = req.query.company_id ? parseInt(req.query.company_id as string) : undefined;
    const customerPhone = req.query.customer_phone as string;
    const idsString = req.query.ids as string;
    const deviceId = req.query.device_id as string;

    if (companyId || customerPhone || idsString || deviceId) {
        try {
            console.log(`[GET /appointments] Public Access: Company=${companyId}, Phone=${customerPhone}, Ids=${idsString}`);

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

router.get('/', publicAppointmentHandler, authMiddleware, privateAppointmentHandler);

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

router.post('/', async (req: Request, res: Response) => {
    try {
        let companyId = req.body.company_id ? parseInt(req.body.company_id) : undefined;
        if (!companyId) return res.status(400).json({ success: false, error: 'Firma ID zorunludur' });

        const validatedData = appointmentSchema.parse(req.body);
        let finalStaffId = validatedData.staff_id;
        let status = 'pending';

        if (req.headers.authorization) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, env.JWT_SECRET) as any;
                if (!companyId && decoded.companyId) companyId = decoded.companyId;
                if (companyId && (decoded.companyId == companyId || decoded.role === 'super_admin')) status = req.body.status || 'approved';
                const roleResult = await pool.query('SELECT role FROM company_users WHERE company_id=$1 AND user_id=$2', [companyId, decoded.userId]);
                if (roleResult.rows[0]?.role === 'staff' && !finalStaffId) finalStaffId = decoded.userId;
            } catch (e) {}
        } else if (req.body.status) status = req.body.status;

        const appointment = await appointmentService.createAppointment({ ...validatedData, company_id: companyId as number, status: status as any, staff_id: finalStaffId ?? undefined });
        res.status(201).json({ success: true, data: appointment });
    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: 'Validasyon hatası', details: error.errors });
        // Detaylı hata log'u (02.09.2026): Drizzle pg hatası err.cause.detail'de gelir
        const anyErr = error as any;
        logger.error({
            errMessage: anyErr?.message,
            errCause: anyErr?.cause?.message,
            errDetail: anyErr?.cause?.detail || anyErr?.detail,
            errHint: anyErr?.cause?.hint,
            errCode: anyErr?.cause?.code || anyErr?.code,
            errPosition: anyErr?.cause?.position || anyErr?.position,
            errRoutine: anyErr?.cause?.routine,
            errStack: anyErr?.stack?.slice(0, 1500)
        }, '[POST /api/appointments] detaylı hata');
        res.status(500).json({
            success: false,
            error: anyErr?.message || 'Hata',
            detail: anyErr?.cause?.detail || anyErr?.detail || null,
            hint: anyErr?.cause?.hint || null,
            code: anyErr?.cause?.code || anyErr?.code || null,
            position: anyErr?.cause?.position || anyErr?.position || null
        });
    }
});

router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
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

router.post('/company/:companyId/send-customer-message', authMiddleware, async (req: Request, res: Response) => {
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

router.get('/company/:companyId/automation-rules', authMiddleware, async (req: Request, res: Response) => {
    try {
        const companyId = parseInt(req.params.companyId);
        if (req.user?.companyId !== companyId && req.user?.role !== 'super_admin') return res.status(403).json({ success: false });
        const rules = await appointmentService.getAutomationRules(companyId);
        res.json({ success: true, data: rules });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.post('/company/:companyId/automation-rules', authMiddleware, async (req: Request, res: Response) => {
    try {
        const companyId = parseInt(req.params.companyId);
        if (req.user?.companyId !== companyId && req.user?.role !== 'super_admin') return res.status(403).json({ success: false });
        const rule = await appointmentService.createAutomationRule(companyId, req.body);
        res.json({ success: true, data: rule });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.patch('/automation-rules/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const rule = await appointmentService.updateAutomationRule(parseInt(req.params.id), req.body);
        res.json({ success: true, data: rule });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.post('/company/:companyId/customers-sync', authMiddleware, async (req: Request, res: Response) => {
    try {
        const companyId = parseInt(req.params.companyId);
        if (req.user?.companyId !== companyId && req.user?.role !== 'super_admin') return res.status(403).json({ success: false });
        const customer = await appointmentService.syncCustomer(companyId, req.body);
        res.json({ success: true, data: customer });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

export default router;
