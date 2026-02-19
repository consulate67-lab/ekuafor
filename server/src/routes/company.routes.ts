import { Router, Request, Response } from 'express';
import pool from '../config/database';
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
    province_id: z.coerce.number().optional(),
    province_name: z.string().optional(),
    district_id: z.coerce.number().optional(),
    district_name: z.string().optional(),
    neighborhood_id: z.coerce.number().optional(),
    neighborhood_name: z.string().optional(),
    postal_code: z.string().optional(),

    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),

    bank_name: z.string().optional(),
    bank_branch: z.string().optional(),
    iban: z.string().optional().transform(v => v ? v.replace(/[^A-Z0-9]/gi, '').toUpperCase() : v).refine(
        v => {
            if (!v) return true;
            // Extremely lenient: allow any TR... between 15 and 34 chars
            return /^TR[A-Z0-9]{13,32}$/.test(v);
        },
        'Geçerli bir IBAN giriniz'
    ),
    account_holder_name: z.string().optional(),

    commission_rate: z.coerce.number().min(0).max(100).optional(),
    payment_enabled: z.boolean().optional(),
    board_key: z.string().optional(),
    work_start_time: z.string().optional(),
    work_end_time: z.string().optional(),
    slot_interval: z.coerce.number().min(5).max(480).optional(),
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
            search: req.query.search as string | undefined,
            lat: req.query.lat ? parseFloat(req.query.lat as string) : undefined,
            lng: req.query.lng ? parseFloat(req.query.lng as string) : undefined,
            radius: req.query.radius ? parseFloat(req.query.radius as string) : undefined
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

/**
 * POST /api/companies/board-login
 * Tablet Dashboard girişi için board_key doğrula
 */
router.post('/board-login', async (req: Request, res: Response) => {
    try {
        const { board_key } = req.body;
        if (!board_key) {
            return res.status(400).json({ success: false, error: 'Board Key gereklidir' });
        }

        const result = await companyService.getAllCompanies(); // Simple lookup for now
        const company = result.find(c => (c as any).board_key === board_key);

        if (!company) {
            return res.status(401).json({ success: false, error: 'Geçersiz Board Key' });
        }

        res.json({
            success: true,
            data: company
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Giriş yapılırken hata oluştu'
        });
    }
});

/**
 * POST /api/companies/admin-login
 * Firma admin paneline admin_key ile giriş
 */
router.post('/admin-login', async (req: Request, res: Response) => {
    try {
        const { admin_key } = req.body;
        if (!admin_key) {
            return res.status(400).json({ success: false, error: 'Admin anahtarı gereklidir' });
        }

        const result = await pool.query('SELECT * FROM companies WHERE admin_key = $1', [admin_key]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Geçersiz admin anahtarı' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Giriş yapılırken hata oluştu'
        });
    }
});

/**
 * POST /api/companies/:id/create-staff-board
 * Personel board kodu oluştur (yeni kullanıcı + board_code)
 */
router.post('/:id/create-staff-board', async (req: Request, res: Response) => {
    try {
        const companyId = parseInt(req.params.id);
        const { first_name, last_name, gender, department_id } = req.body;

        if (!first_name || !last_name) {
            return res.status(400).json({ success: false, error: 'İsim ve soyisim gereklidir' });
        }

        // Benzersiz board_code oluştur
        const prefix = first_name.substring(0, 3).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const board_code = `${prefix}-${random}`;

        // Kullanıcı oluştur (şifre olmadan, board_code ile erişim)
        const email = `${board_code.toLowerCase()}@staff.local`;
        const userResult = await pool.query(
            `INSERT INTO users (email, password, role, first_name, last_name, phone, company_id, board_code, gender, department_id)
             VALUES ($1, $2, 'company_admin', $3, $4, '', $5, $6, $7, $8)
             RETURNING *`,
            [email, 'board-auth-only', first_name, last_name, companyId, board_code, gender || null, department_id || null]
        );

        // company_users bağlantısı ekle
        await pool.query(
            'INSERT INTO company_users (company_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [companyId, userResult.rows[0].id, 'staff']
        );

        res.status(201).json({ success: true, data: userResult.rows[0] });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Personel oluşturulurken hata oluştu'
        });
    }
});

/**
 * GET /api/companies/:id/staff-boards
 * Firma personel board kodlarını listele
 */
router.get('/:id/staff-boards', async (req: Request, res: Response) => {
    try {
        const companyId = parseInt(req.params.id);
        const result = await pool.query(
            `SELECT u.id, u.first_name, u.last_name, u.board_code, u.gender, u.department_id, d.name as department_name
             FROM users u
             LEFT JOIN departments d ON u.department_id = d.id
             WHERE u.company_id = $1 AND u.board_code IS NOT NULL
             ORDER BY u.first_name`,
            [companyId]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Personel listesi yüklenirken hata oluştu'
        });
    }
});
/**
 * POST /api/companies/staff-login
 * Çalışan board_code ile giriş (cihaz bazlı)
 */
router.post('/staff-login', async (req: Request, res: Response) => {
    try {
        const { board_code } = req.body;
        if (!board_code) {
            return res.status(400).json({ success: false, error: 'Board kodu gereklidir' });
        }

        const userResult = await pool.query(
            `SELECT u.id, u.first_name, u.last_name, u.board_code, u.gender, u.department_id, u.company_id, d.name as department_name
             FROM users u
             LEFT JOIN departments d ON u.department_id = d.id
             WHERE u.board_code = $1`,
            [board_code]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Geçersiz board kodu' });
        }

        const user = userResult.rows[0];
        const companyResult = await pool.query('SELECT * FROM companies WHERE id = $1', [user.company_id]);

        if (companyResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Firma bulunamadı' });
        }

        res.json({
            success: true,
            data: {
                user: user,
                company: companyResult.rows[0]
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Giriş yapılırken hata oluştu'
        });
    }
});

/**
 * POST /api/companies/check-code
 * Evrensel kod kontrol: admin_key mi board_code mu?
 * QR tarayıcı veya elle giriş sonrası doğru ekrana yönlendirir.
 */
router.post('/check-code', async (req: Request, res: Response) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, error: 'Kod gereklidir' });
        }

        // Önce admin_key mi kontrol et
        const adminResult = await pool.query('SELECT id, name FROM companies WHERE admin_key = $1', [code]);
        if (adminResult.rows.length > 0) {
            return res.json({
                success: true,
                data: {
                    type: 'admin',
                    redirect: `/company-panel?key=${code}`,
                    company_name: adminResult.rows[0].name
                }
            });
        }

        // Sonra board_code mu kontrol et
        const staffResult = await pool.query(
            `SELECT u.id, u.first_name, u.last_name, u.board_code, c.name as company_name
             FROM users u
             JOIN companies c ON u.company_id = c.id
             WHERE u.board_code = $1`,
            [code]
        );
        if (staffResult.rows.length > 0) {
            return res.json({
                success: true,
                data: {
                    type: 'staff',
                    redirect: `/staff-panel`,
                    staff_name: `${staffResult.rows[0].first_name} ${staffResult.rows[0].last_name}`,
                    company_name: staffResult.rows[0].company_name,
                    board_code: code
                }
            });
        }

        // SalonBoard board_key mi kontrol et
        const boardResult = await pool.query('SELECT id, name FROM companies WHERE board_key = $1', [code]);
        if (boardResult.rows.length > 0) {
            return res.json({
                success: true,
                data: {
                    type: 'board',
                    redirect: `/board`,
                    company_name: boardResult.rows[0].name,
                    board_key: code
                }
            });
        }

        return res.status(404).json({ success: false, error: 'Geçersiz kod. Lütfen doğru kodu giriniz.' });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Kod kontrol edilirken hata oluştu'
        });
    }
});

export default router;
