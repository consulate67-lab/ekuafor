import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import pool from '../config/database';
import { companyAuth, optionalCompanyAuth, canAccessCompany } from '../middleware/auth.middleware';
import appointmentService from '../services/appointment.service';
import {
    BookingError, getAvailability, listClassSessions, createClassSessions, cancelClassSessions,
    updateClassSessionCapacity, getClassSessionAttendees, nowInIstanbul,
} from '../services/booking.service';
import { logger } from '../utils/logger';

/**
 * Rezervasyon uç noktaları:
 *   GET    /api/availability                     → boş saatler (public)
 *   GET    /api/class-sessions                   → seanslar + kalan yer (public; firma kullanıcısı iptalleri de görür)
 *   POST   /api/class-sessions                   → seans aç, istenirse haftalık tekrar (firma)
 *   PATCH  /api/class-sessions/:id               → kapasite değiştir veya iptal et (firma)
 *   GET    /api/class-sessions/:id/attendees     → katılımcılar (firma)
 *   GET    /api/resources                        → saha / kulvar / oda listesi (public: sadece aktifler)
 *   POST/PUT/DELETE /api/resources[/:id]         → kaynak yönetimi (firma)
 */
const router = Router();

const intId = z.coerce.number().int().positive();
const optionalId = z.preprocess(v => (v === '' || v === undefined ? null : v), intId.nullable());
const idList = z.preprocess(
    v => (typeof v === 'string' ? v.split(',').filter(Boolean) : v),
    z.array(intId).min(1)
);

const handle = (fn: (req: Request, res: Response) => Promise<unknown>) =>
    (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(err => {
        if (err instanceof z.ZodError) return res.status(400).json({ success: false, error: 'Validasyon hatası', details: err.errors });
        if (err instanceof BookingError) return res.status(err.status).json({ success: false, error: err.message });
        logger.error({ err, path: req.path }, '[booking] beklenmeyen hata');
        next(err);
    });

/** Firma kullanıcısının yönetim yetkisi; board ekranı yalnızca okuyabilir. */
const companyIdForManage = (req: Request, res: Response): number | null => {
    const companyId = req.user?.role === 'super_admin' && req.body?.company_id ? Number(req.body.company_id) : Number(req.user?.companyId);
    if (!companyId || req.user?.role === 'board' || req.user?.role === 'customer') {
        res.status(403).json({ success: false, error: 'Bu işlem için yetkiniz yok' });
        return null;
    }
    return companyId;
};

router.get('/availability', handle(async (req, res) => {
    const q = z.object({
        company_id: intId,
        service_ids: idList.optional(),
        service_id: intId.optional(),
        date: z.string(),
        staff_id: optionalId.optional(),
        resource_id: optionalId.optional(),
        duration: intId.optional(),
    }).parse(req.query);
    const serviceIds = q.service_ids ?? (q.service_id ? [q.service_id] : []);
    const data = await getAvailability({
        companyId: q.company_id, serviceIds, date: q.date,
        staffId: q.staff_id, resourceId: q.resource_id, durationMinutes: q.duration,
    });
    res.json({ success: true, data });
}));

router.get('/class-sessions', optionalCompanyAuth, handle(async (req, res) => {
    const today = nowInIstanbul().date;
    const q = z.object({
        company_id: intId,
        from: z.string().default(today),
        to: z.string().optional(),
        service_id: optionalId.optional(),
    }).parse(req.query);
    const to = q.to ?? new Date(Date.parse(`${q.from}T00:00:00Z`) + 13 * 86400000).toISOString().slice(0, 10);
    const isCompany = canAccessCompany(req, q.company_id) && req.user?.role !== 'customer';
    const sessions = await listClassSessions({
        companyId: q.company_id, from: q.from, to, serviceId: q.service_id, includeCancelled: isCompany,
    });
    res.json({ success: true, data: sessions });
}));

router.post('/class-sessions', companyAuth, handle(async (req, res) => {
    const companyId = companyIdForManage(req, res);
    if (!companyId) return;
    const body = z.object({
        service_id: intId,
        staff_id: optionalId.optional(),
        resource_id: optionalId.optional(),
        date: z.string(),
        start_time: z.string(),
        duration_minutes: intId.optional(),
        capacity: z.coerce.number().int(),
        repeat_weeks: z.coerce.number().int().min(0).max(26).optional(),
    }).parse(req.body);
    const result = await createClassSessions({
        companyId, serviceId: body.service_id, staffId: body.staff_id, resourceId: body.resource_id,
        date: body.date, startTime: body.start_time, durationMinutes: body.duration_minutes,
        capacity: body.capacity, repeatWeeks: body.repeat_weeks,
    });
    res.status(201).json({ success: true, data: result });
}));

router.patch('/class-sessions/:id', companyAuth, handle(async (req, res) => {
    const companyId = companyIdForManage(req, res);
    if (!companyId) return;
    const sessionId = intId.parse(req.params.id);
    const body = z.object({
        capacity: z.coerce.number().int().optional(),
        status: z.literal('cancelled').optional(),
        scope: z.enum(['single', 'following']).default('single'),
    }).parse(req.body);

    if (body.status === 'cancelled') {
        const result = await cancelClassSessions(companyId, sessionId, body.scope);
        for (const appointmentId of result.appointment_ids) {
            await appointmentService.updateAppointmentStatus(appointmentId, 'cancelled').catch(err =>
                logger.error({ err, appointmentId }, '[class-sessions] randevu iptal bildirimi başarısız'));
        }
        return res.json({ success: true, data: result });
    }
    if (body.capacity !== undefined) {
        await updateClassSessionCapacity(companyId, sessionId, body.capacity);
        return res.json({ success: true });
    }
    res.status(400).json({ success: false, error: 'Değiştirilecek alan yok' });
}));

router.get('/class-sessions/:id/attendees', companyAuth, handle(async (req, res) => {
    const companyId = Number(req.user?.companyId);
    const sessionId = intId.parse(req.params.id);
    res.json({ success: true, data: await getClassSessionAttendees(companyId, sessionId) });
}));

const RESOURCE_TYPES = ['pitch', 'court', 'lane', 'pool', 'room', 'studio', 'cabin', 'chair', 'other'] as const;
const resourceSchema = z.object({
    name: z.string().trim().min(1).max(100),
    resource_type: z.enum(RESOURCE_TYPES).default('room'),
    display_order: z.coerce.number().int().default(0),
    is_active: z.boolean().optional(),
});

router.get('/resources', optionalCompanyAuth, handle(async (req, res) => {
    const companyId = req.query.company_id ? intId.parse(req.query.company_id) : Number(req.user?.companyId);
    if (!companyId) return res.status(400).json({ success: false, error: 'company_id gerekli' });
    const isCompany = canAccessCompany(req, companyId) && req.user?.role !== 'customer';
    const result = await pool.query(
        `SELECT r.id, r.name, r.resource_type, r.is_active, r.display_order,
                COALESCE(array_agg(sr.service_id) FILTER (WHERE sr.service_id IS NOT NULL), '{}') AS service_ids
         FROM resources r LEFT JOIN service_resources sr ON sr.resource_id = r.id
         WHERE r.company_id = $1 AND ($2::boolean OR r.is_active)
         GROUP BY r.id ORDER BY r.display_order, r.id`,
        [companyId, isCompany]
    );
    res.json({ success: true, data: result.rows });
}));

router.post('/resources', companyAuth, handle(async (req, res) => {
    const companyId = companyIdForManage(req, res);
    if (!companyId) return;
    const body = resourceSchema.parse(req.body);
    const result = await pool.query(
        `INSERT INTO resources (company_id, name, resource_type, display_order, is_active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, name, resource_type, is_active, display_order`,
        [companyId, body.name, body.resource_type, body.display_order, body.is_active ?? true]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
}));

router.put('/resources/:id', companyAuth, handle(async (req, res) => {
    const companyId = companyIdForManage(req, res);
    if (!companyId) return;
    const resourceId = intId.parse(req.params.id);
    const body = resourceSchema.partial().parse(req.body);
    const result = await pool.query(
        `UPDATE resources SET
            name = COALESCE($3, name), resource_type = COALESCE($4, resource_type),
            display_order = COALESCE($5, display_order), is_active = COALESCE($6, is_active)
         WHERE id = $1 AND company_id = $2
         RETURNING id, name, resource_type, is_active, display_order`,
        [resourceId, companyId, body.name ?? null, body.resource_type ?? null, body.display_order ?? null, body.is_active ?? null]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Kaynak bulunamadı' });
    res.json({ success: true, data: result.rows[0] });
}));

/** Kaynak silinmez, pasife alınır; geçmiş rezervasyonlar bozulmaz. */
router.delete('/resources/:id', companyAuth, handle(async (req, res) => {
    const companyId = companyIdForManage(req, res);
    if (!companyId) return;
    const resourceId = intId.parse(req.params.id);
    const result = await pool.query('UPDATE resources SET is_active = false WHERE id = $1 AND company_id = $2', [resourceId, companyId]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Kaynak bulunamadı' });
    res.json({ success: true });
}));

export default router;
