import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import appointmentService from '../services/appointment.service';
import { authMiddleware } from '../middleware/auth.middleware';
import pool from '../config/database';
import { z } from 'zod';

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
// Randevuları listele (Firma bazlı, isteğe bağlı durum filtresiyle)
// 1. PUBLIC HANDLER: Check if it's a public booking request (via query params)
const publicAppointmentHandler = async (req: Request, res: Response, next: any) => {
    // If company_id is present AND there is NO auth header (or we want to allow public even if logged in but searching public),
    // usually public booking check is:
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
                // Fetch by device ID (prioritize this for auto-sync)
                appointments = await appointmentService.getAppointmentsByDevice(deviceId);
            } else if (customerPhone) {
                // Fetch by phone (across all companies or filtered by company if both provided)
                appointments = await appointmentService.getAppointmentsByPhone(customerPhone, companyId);
            } else {
                // Classic company-based public listing
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
        let companyRole = roleResult.rows[0]?.role;
        console.log(`[GET /appointments] Company Role Found: ${companyRole}`);

        // Fallback check in users table if company_users is missing
        if (!companyRole) {
            const userCheck = await pool.query(
                'SELECT role, company_id FROM users WHERE id = $1 AND company_id = $2',
                [userId, companyId]
            );
            if (userCheck.rows.length > 0) {
                companyRole = 'staff';
                console.log(`[GET /appointments] Fallback Role used: ${companyRole}`);
            }
        }

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
            staffId,
            req.query.start_date as string,
            req.query.end_date as string
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

// Finans: Firma bazlı tamamlanmış randevuları getir
router.get('/company/:companyId/completed', authMiddleware, async (req: Request, res: Response, next: any) => {
    try {
        const companyId = parseInt(req.params.companyId);
        const { startDate, endDate, search } = req.query;

        if (req.user?.companyId !== companyId && req.user?.role !== 'super_admin') {
            return res.status(403).json({ success: false, error: 'Bu veriye erişim yetkiniz yok' });
        }

        const appointments = await appointmentService.getCompletedAppointments(
            companyId,
            startDate as string,
            endDate as string,
            search as string
        );
        res.json({ success: true, data: appointments });
    } catch (error) {
        console.error('Completed Appointments Error:', error);
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
        } else if (req.body.status) {
            // For Board Login/Public trusted booking
            status = req.body.status;
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
        const { status, price, payment_method, technical_notes } = req.body;
        const appointment = await appointmentService.updateAppointmentStatus(id, status, price, payment_method, technical_notes);
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

// Hizmet bazlı onay (Paket randevuları için)
router.patch('/service/:apsId/status', async (req: Request, res: Response) => {
    try {
        const apsId = parseInt(req.params.apsId);
        const { status } = req.body;
        const service = await appointmentService.updateAppointmentServiceStatus(apsId, status);
        if (!service) {
            return res.status(404).json({ success: false, error: 'Hizmet kaydı bulunamadı' });
        }
        res.json({ success: true, data: service });
    } catch (error) {
        console.error('Update Service Status Error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Hizmet durumu güncellenirken hata oluştu'
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

// Cihaz ve Telefonu eşleştir
router.post('/customers/sync', async (req: Request, res: Response) => {
    try {
        const { device_id, customer_phone, push_token } = req.body;
        if (!device_id || !customer_phone) {
            return res.status(400).json({ success: false, error: 'Device ID ve Telefon gereklidir' });
        }
        await appointmentService.syncDeviceWithPhone(device_id, customer_phone, push_token);
        res.json({ success: true, message: 'Senkronizasyon başarılı' });
    } catch (err) {
        console.error('Sync Error:', err);
        res.status(500).json({ success: false, error: 'Senkronizasyon hatası' });
    }
});

// Randevuyu puanla ve yorumla
router.patch('/:id/rate', async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { rating, comment } = req.body;
        if (!rating) {
            return res.status(400).json({ success: false, error: 'Puan zorunludur' });
        }
        const appointment = await appointmentService.rateAppointment(id, rating, comment);
        if (!appointment) {
            return res.status(404).json({ success: false, error: 'Randevu bulunamadı' });
        }
        res.json({ success: true, data: appointment });
    } catch (err) {
        console.error('Rating Error:', err);
        res.status(500).json({ success: false, error: 'Puanlama hatası' });
    }
});

// Müşteri bildirimlerini getir
router.get('/customers/notifications', async (req: Request, res: Response) => {
    try {
        const { phone } = req.query;
        if (!phone) return res.json({ success: true, data: [] });

        const notifications = await appointmentService.getCustomerNotifications(phone as string);
        res.json({ success: true, data: notifications });
    } catch (err) {
        console.error('Notifications Error:', err);
        res.status(500).json({ success: false, error: 'Bildirimler alınamadı' });
    }
});

// Şirket yorumlarını getir
router.get('/companies/:id/reviews', async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const sort = req.query.sort as string;
        const reviews = await appointmentService.getCompanyReviews(id, sort);
        res.json({ success: true, data: reviews });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Yorumlar yüklenemedi' });
    }
});

// Müşteri geçmişini getir (Dashboard için)
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
    try {
        const companyId = req.user?.companyId;
        const search = req.query.search as string;
        if (!companyId) return res.status(403).json({ success: false, error: 'Yetkisiz' });
        if (!search || search.length < 2) return res.json({ success: true, data: [] });

        const history = await appointmentService.getCustomerHistory(companyId, search);
        res.json({ success: true, data: history });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Geçmiş yüklenemedi' });
    }
});

export default router;
