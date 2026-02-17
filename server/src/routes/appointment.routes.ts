import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import appointmentService from '../services/appointment.service';
import { authMiddleware } from '../middleware/auth.middleware';
import pool from '../config/database';
import { z } from 'zod';

const router = Router();

const appointmentSchema = z.object({
    service_id: z.union([z.number(), z.string().transform(v => parseInt(v, 10))]),
    staff_id: z.union([z.number(), z.string().transform(v => parseInt(v, 10))]).optional().nullable(),
    appointment_date: z.string(),
    start_time: z.string(),
    end_time: z.string(),
    notes: z.string().optional(),
    price: z.union([z.number(), z.string().transform(v => parseFloat(v))]).optional(),
});

// Randevuları listele (Firma bazlı, isteğe bağlı durum filtresiyle)
// Randevuları listele (Firma bazlı, isteğe bağlı durum filtresiyle)
// 1. PUBLIC HANDLER: Check if it's a public booking request (via query params)
const publicAppointmentHandler = async (req: Request, res: Response, next: any) => {
    // If company_id is present AND there is NO auth header (or we want to allow public even if logged in but searching public),
    // usually public booking check is:
    if (req.query.company_id) {
        try {
            const companyId = parseInt(req.query.company_id as string);
            // Public listing might need to be sanitized but for MVP we return full
            console.log(`[GET /appointments] Public Access: Company=${companyId}`);
            const appointments = await appointmentService.getAppointmentsByCompany(companyId, req.query.status as string);
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

        console.log(`[GET /appointments] Private Request: User=${userId}, Company=${companyId}`);

        if (!companyId || !userId) {
            console.log('[GET /appointments] Missing Info');
            return res.status(403).json({ success: false, error: 'Firma/Kullanıcı bilgisi eksik' });
        }

        // Check role within the company
        const roleResult = await pool.query(
            'SELECT role FROM company_users WHERE company_id=$1 AND user_id=$2',
            [companyId, userId]
        );
        const companyRole = roleResult.rows[0]?.role;
        console.log(`[GET /appointments] Company Role Found: ${companyRole}`);

        // Super Admin Bypass
        if (req.user?.role === 'super_admin') {
            // Allowed
        } else if (!companyRole) {
            console.log('[GET /appointments] No Role - Access Denied');
            return res.status(403).json({ success: false, error: 'Bu firmada yetkiniz bulunmuyor' });
        }

        // Default behavior: Everyone (Staff) sees their own appointments
        // unless they are a Super Admin, Company Admin (Owner/Manager), or explicitly want to see all.
        // This fixes Managers/Owners not seeing staff appointments.
        let staffId: number | undefined = userId;

        const isAdminOrManager = req.user?.role === 'super_admin' ||
            companyRole === 'owner' ||
            companyRole === 'manager' ||
            req.query.all === 'true';

        if (isAdminOrManager) {
            staffId = undefined; // Super admins or Admins/Managers see everything
            console.log(`[GET /appointments] Showing ALL (Admin/Manager role)`);
        } else {
            console.log(`[GET /appointments] Filtering for Staff User: ID=${staffId}`);
        }

        // Super Admin can override companyId via query param
        let targetCompanyId = companyId;
        if (req.user?.role === 'super_admin' && req.query.company_id) {
            targetCompanyId = parseInt(req.query.company_id as string);
            console.log(`[GET /appointments] Super Admin Overriding Company ID to: ${targetCompanyId}`);
        }

        const appointments = await appointmentService.getAppointmentsByCompany(
            targetCompanyId,
            req.query.status as string,
            staffId
        );
        console.log(`[GET /appointments] Found ${appointments.length} records.`);
        res.json({ success: true, data: appointments });
    } catch (error) {
        console.error('Randevu Listeleme Hatası:', error);
        next(error);
    }
};

router.get('/', publicAppointmentHandler, authMiddleware, privateAppointmentHandler);

// Tarih aralığına göre randevuları getir (Takvim için)
// Calendar is STRICTLY private
router.get('/calendar', authMiddleware, async (req: Request, res: Response, next: any) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.userId;
        const { start, end } = req.query;

        console.log(`[GET /calendar] Request: User=${userId}, Range=${start} to ${end}`);

        if (!companyId || !userId) {
            return res.status(403).json({ success: false, error: 'Firma/Kullanıcı bilgisi eksik' });
        }

        // Check company role
        const roleResult = await pool.query(
            'SELECT role FROM company_users WHERE company_id=$1 AND user_id=$2',
            [companyId, userId]
        );
        const companyRole = roleResult.rows[0]?.role;
        console.log(`[GET /calendar] Company Role: ${companyRole}`);

        if (req.user?.role === 'super_admin') {
            // Allowed
        } else if (!companyRole) {
            return res.status(403).json({ success: false, error: 'Bu firmada yetkiniz bulunmuyor' });
        }

        let staffId: number | undefined;
        if (companyRole === 'staff') {
            staffId = userId;
        }

        const appointments = await appointmentService.getAppointmentsByDateRange(
            companyId,
            start as string,
            end as string,
            staffId
        );
        console.log(`[GET /calendar] Found ${appointments.length} records.`);
        res.json({ success: true, data: appointments });
    } catch (error) {
        console.error('Calendar Error:', error);
        next(error);
    }
});

// Yeni randevu oluştur (Manuel giriş)
// Yeni randevu oluştur (Manuel giriş veya Public Booking)
// Yeni randevu oluştur (Manuel giriş veya Public Booking)
router.post('/', async (req: Request, res: Response) => {
    try {
        console.log('[POST /appointments] Body:', req.body);
        let companyId: number | undefined;
        let status = 'pending';

        if (req.body.company_id) {
            companyId = parseInt(req.body.company_id);
        }

        if (!companyId) {
            return res.status(400).json({ success: false, error: 'Firma ID zorunludur' });
        }

        const validatedData = appointmentSchema.parse(req.body);
        let finalStaffId = validatedData.staff_id;

        // 2. Auth Logic: Try to get companyId/StaffId from token
        if (req.headers.authorization) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(
                    token,
                    process.env.JWT_SECRET || 'your-secret-key'
                ) as any;

                // Fallback: Use companyId from token if not provided in body
                if (!companyId && decoded.companyId) {
                    companyId = decoded.companyId;
                }

                // If token is valid and belongs to this company (or super admin), trust the status
                if (companyId && (decoded.companyId == companyId || decoded.role === 'super_admin')) {
                    status = req.body.status || 'approved';
                }

                // Auto-assign staff_id if logged in user is a staff member and didn't provide one
                // We need to check their role in company_users to be sure, but token might have it.
                // Let's check DB for role
                const roleResult = await pool.query(
                    'SELECT role FROM company_users WHERE company_id=$1 AND user_id=$2',
                    [companyId, decoded.userId]
                );
                const role = roleResult.rows[0]?.role;
                if (role === 'staff' && !finalStaffId) {
                    finalStaffId = decoded.userId;
                    console.log(`[POST /appointments] Auto-assigning Staff ID: ${finalStaffId}`);
                }
            } catch (e) {
                console.log('[POST /appointments] Token verify failed or ignored:', e);
            }
        }

        const appointment = await appointmentService.createAppointment({
            ...validatedData,
            company_id: companyId as number,
            status: status as any,
            staff_id: finalStaffId ?? undefined
        });
        res.status(201).json({ success: true, data: appointment });
    } catch (error) {
        console.error('[POST /appointments] Error:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validasyon hatası', details: error.errors });
        }
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Randevu oluşturulurken hata oluştu'
        });
    }
});

// Randevu durumu güncelle (Onayla/İptal)
// Tablet Paneli için authMiddleware kaldırıldı (Board Key ile giriş yapıldığı için)
router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body;
        const appointment = await appointmentService.updateAppointmentStatus(id, status);
        if (!appointment) {
            return res.status(404).json({ success: false, error: 'Randevu bulunamadı' });
        }
        res.json({ success: true, data: appointment });
    } catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Randevu durumu güncellenirken hata oluştu'
        });
    }
});

// Geriye dönük uyumluluk için PATCH /:id desteği
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body;
        if (status) {
            const appointment = await appointmentService.updateAppointmentStatus(id, status);
            return res.json({ success: true, data: appointment });
        }
        res.status(400).json({ success: false, error: 'Status gereklidir' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Güncelleme hatası' });
    }
});

export default router;
