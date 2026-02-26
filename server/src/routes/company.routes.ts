import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import companyService from '../services/company.service';
import employeeRoutes from './employee.routes';
import { authMiddleware, roleCheck } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();

// Nested routes
router.use('/:companyId/employees', employeeRoutes);

// Helper for optional/nullable string fields that might be empty strings
const optionalString = z.preprocess(v => (v === "" || v === null) ? undefined : v, z.string().optional());
const nullableString = z.preprocess(v => (v === "" || v === null) ? null : v, z.string().nullable().optional());
const nullableNumber = z.preprocess(v => (v === "" || v === null) ? null : v, z.coerce.number().nullable().optional());

const companySchema = z.object({
    name: z.string().min(2, 'Firma adı en az 2 karakter olmalıdır'),
    description: nullableString,
    phone: nullableString,
    email: z.preprocess(v => (v === "" || v === null) ? null : v, z.string().email('Geçerli bir email adresi giriniz').nullable().optional()),
    website: z.preprocess(v => (v === "" || v === null) ? null : v, z.string().url('Geçerli bir website adresi giriniz').nullable().optional()),

    address_line: nullableString,
    address_line2: nullableString,
    province_id: nullableNumber,
    province_name: nullableString,
    district_id: nullableNumber,
    district_name: nullableString,
    neighborhood_id: nullableNumber,
    neighborhood_name: nullableString,
    postal_code: nullableString,

    latitude: nullableNumber.refine(v => v === null || v === undefined || (v >= -90 && v <= 90), 'Geçerli bir enlem giriniz'),
    longitude: nullableNumber.refine(v => v === null || v === undefined || (v >= -180 && v <= 180), 'Geçerli bir boylam giriniz'),

    bank_name: nullableString,
    bank_branch: nullableString,
    iban: z.preprocess(v => (v === "" || v === null) ? null : v, z.string().nullable().optional().transform(v => {
        if (!v) return v;
        return v.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    }).refine(
        v => {
            if (!v) return true;
            return /^TR[A-Z0-9]{13,32}$/.test(v);
        },
        'Geçerli bir IBAN giriniz'
    )),
    account_holder_name: nullableString,

    commission_rate: nullableNumber.refine(v => v === null || v === undefined || (v >= 0 && v <= 100), 'Komisyon oranı 0-100 arasında olmalıdır'),
    payment_enabled: z.preprocess(v => (v === "" || v === null) ? null : v, z.boolean().nullable().optional()),
    board_key: nullableString,
    work_start_time: nullableString,
    work_end_time: nullableString,
    slot_interval: nullableNumber.refine(v => v === null || v === undefined || (v >= 5 && v <= 480), 'Randevu aralığı 5-480 dakika arasında olmalıdır'),
    genders: z.array(z.string()).nullable().optional(),
    company_type: z.enum(['ÜST FİRMA', 'ASIL', 'ŞUBE']).nullable().optional(),
    main_company_id: nullableNumber,
    staff_label: z.string().max(50).nullable().optional(),
    service_label: z.string().max(50).nullable().optional(),
    tax_number: nullableString,
    tax_office: nullableString,
    city: nullableString,
    district: nullableString,
    qnb_username: nullableString,
    qnb_password: nullableString,
    qnb_vkn: nullableString,
    efatura_test_mode: z.preprocess(v => (v === "" || v === null) ? null : v, z.boolean().nullable().optional()),
    invoice_prefix: z.string().max(3).nullable().optional(),
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
            radius: req.query.radius ? parseFloat(req.query.radius as string) : undefined,
            gender: req.query.gender as string | undefined,
            company_type: req.query.company_type as string | undefined,
            exclude_parent: req.query.exclude_parent === 'true' ? true : undefined,
            sort: req.query.sort as 'rating' | 'reviews' | 'newest' | undefined
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
router.delete('/:id', async (req: Request, res: Response) => {
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
        const result = await pool.query('SELECT * FROM companies WHERE UPPER(admin_key) = UPPER($1)', [admin_key]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Geçersiz admin anahtarı' });
        }

        const company = result.rows[0];
        const userId = company.created_by || 0;

        // JWT token oluştur - admin panelindeki korumalı rotalara erişim için
        const token = jwt.sign(
            {
                userId: userId,
                email: company.email || `admin@${company.id}.local`,
                role: 'company_admin',
                companyId: company.id
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            data: {
                company: company,
                token: token
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
 * POST /api/companies/:id/create-staff-board
 * Personel board kodu oluştur (yeni kullanıcı + board_code)
 */
router.post('/:id/create-staff-board', async (req: Request, res: Response) => {
    try {
        const companyId = parseInt(req.params.id);
        const { first_name, last_name, gender, department_id, photo, quantity, unit } = req.body;

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
            `INSERT INTO users (email, password, role, first_name, last_name, phone, company_id, board_code, gender, department_id, photo, quantity, unit)
             VALUES ($1, $2, 'company_admin', $3, $4, '', $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [email, 'board-auth-only', first_name, last_name, companyId, board_code, gender || null, department_id || null, photo || null, quantity || null, unit || null]
        );

        // company_users bağlantısı ekle (constraint yoksa hata vermeden devam et)
        try {
            await pool.query(
                'INSERT INTO company_users (company_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                [companyId, userResult.rows[0].id, 'staff']
            );
        } catch (_) {
            // company_users ekleme başarısız olsa bile devam et
        }

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
            `SELECT DISTINCT u.id, u.first_name, u.last_name, u.board_code, u.gender, u.department_id, u.photo, u.quantity, u.unit, d.name as department_name
             FROM users u
             LEFT JOIN departments d ON u.department_id = d.id
             LEFT JOIN company_users cu ON cu.user_id = u.id AND cu.company_id = $1
             WHERE (u.company_id = $1 OR cu.company_id = $1) AND u.role != 'customer'
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
 * PATCH /api/companies/:id/staff/:userId/photo
 * Personel fotoğrafını güncelle
 */
router.patch('/:id/staff/:userId/photo', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { photo } = req.body;

        await pool.query(
            'UPDATE users SET photo = $1 WHERE id = $2',
            [photo, userId]
        );

        res.json({ success: true, message: 'Fotoğraf güncellendi' });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Fotoğraf güncellenirken hata oluştu'
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
            `SELECT u.id, u.first_name, u.last_name, u.board_code, u.gender, u.department_id, u.company_id, u.photo, d.name as department_name
             FROM users u
             LEFT JOIN departments d ON u.department_id = d.id
             WHERE UPPER(u.board_code) = UPPER($1)`,
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

        // Üst Yönetim Kodu (Özel Durum)
        if (code === '996633') {
            return res.json({
                success: true,
                data: {
                    type: 'admin',
                    redirect: '/main-management'
                }
            });
        }

        // Önce admin_key mi kontrol et
        const adminResult = await pool.query('SELECT id, name, admin_key FROM companies WHERE UPPER(admin_key) = UPPER($1)', [code]);
        if (adminResult.rows.length > 0) {
            return res.json({
                success: true,
                data: {
                    type: 'admin',
                    redirect: `/company-panel?key=${adminResult.rows[0].admin_key}`,
                    company_name: adminResult.rows[0].name
                }
            });
        }

        // Sonra board_code mu kontrol et
        const staffResult = await pool.query(
            `SELECT u.id, u.first_name, u.last_name, u.board_code, u.company_id, u.photo, c.name as company_name
             FROM users u
             JOIN companies c ON u.company_id = c.id
             WHERE UPPER(u.board_code) = UPPER($1)`,
            [code]
        );
        if (staffResult.rows.length > 0) {
            const sr = staffResult.rows[0];

            // JWT token oluştur - personel dashboard'a erişsin
            const token = jwt.sign(
                { userId: sr.id, email: `${sr.board_code}@staff.local`, role: 'company_admin', companyId: sr.company_id },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '7d' }
            );

            return res.json({
                success: true,
                data: {
                    type: 'staff',
                    redirect: `/dashboard`,
                    staff_name: `${sr.first_name} ${sr.last_name}`,
                    company_name: sr.company_name,
                    board_code: sr.board_code,
                    company_id: sr.company_id,
                    user_id: sr.id,
                    photo: sr.photo,
                    token: token
                }
            });
        }

        // SalonBoard board_key mi kontrol et
        const boardResult = await pool.query('SELECT id, name, board_key FROM companies WHERE UPPER(board_key) = UPPER($1)', [code]);
        if (boardResult.rows.length > 0) {
            return res.json({
                success: true,
                data: {
                    type: 'board',
                    redirect: `/board`,
                    company_name: boardResult.rows[0].name,
                    board_key: boardResult.rows[0].board_key
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
