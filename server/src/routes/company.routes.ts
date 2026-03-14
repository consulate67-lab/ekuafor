import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { formatPhoneTo12Digits } from '../utils/phone';
import bcrypt from 'bcryptjs';
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
    city: nullableString,
    district: nullableString,
    neighborhood: nullableString,
    postal_code: nullableString,

    latitude: nullableNumber.refine(v => v === null || v === undefined || (v >= -90 && v <= 90), 'Geçerli bir enlem giriniz'),
    longitude: nullableNumber.refine(v => v === null || v === undefined || (v >= -180 && v <= 180), 'Geçerli bir boylam giriniz'),

    bank_name: nullableString,
    bank_branch: nullableString,
    iban: z.preprocess(v => (v === "" || v === null) ? null : v, z.string().nullable().optional().transform(v => {
        if (!v) return v;
        return v.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    })),
    bank_iban: z.preprocess(v => (v === "" || v === null) ? null : v, z.string().nullable().optional().transform(v => {
        if (!v) return v;
        return v.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    })),
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
    booking_flow: z.string().nullable().optional(),
    ai_rules: z.string().nullable().optional(),
    tax_number: nullableString,
    tax_office: nullableString,
    qnb_username: nullableString,
    qnb_password: nullableString,
    qnb_vkn: nullableString,
    efatura_test_mode: z.preprocess(v => (v === "" || v === null) ? null : v, z.boolean().nullable().optional()),
    invoice_prefix: z.string().max(3).nullable().optional(),
    ubl_incoming_alias: nullableString,
    ubl_outgoing_alias: nullableString,
    license_end_date: z.any().nullable().optional(),
    sms_enabled: z.preprocess(v => (v === "" || v === null) ? null : v, z.boolean().nullable().optional()),
    photo: nullableString,
    building_number: nullableString,
    door_number: nullableString,
    nace_code: nullableString,
    fax_number: nullableString,
});

/**
 * POST /api/companies/register
 * Herkese açık (Public) yeni firma kayıt isteği (Onaysız/Beklemede düşer)
 */
router.post('/register', async (req: Request, res: Response) => {
    try {
        const publicSchema = z.object({
            name: z.string().min(2, 'Firma adı en az 2 karakter olmalıdır'),
            phone: z.string().min(10, 'Geçerli bir telefon numarası giriniz'),
            email: z.string().email('Geçerli bir email adresi giriniz'),
            password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
            address_line: nullableString,
            city: nullableString,
            district: nullableString,
            latitude: nullableNumber,
            longitude: nullableNumber,
            target_genders: z.array(z.string()).optional()
        });

        const validatedData = publicSchema.parse(req.body);
        const lowerEmail = validatedData.email.toLowerCase().trim();

        // Check if email already exists in users table
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE LOWER(email) = $1',
            [lowerEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Bu e-posta adresi zaten kullanımda'
            });
        }

        const companyData: any = {
            ...validatedData,
            genders: validatedData.target_genders,
            is_active: false,
            is_verified: false,
            payment_enabled: false,
            commission_rate: 0
        };
        delete companyData.target_genders;
        const passwordHash = await bcrypt.hash(validatedData.password, 10);
        delete companyData.password;

        // created_by = null for public self-registration
        const company = await companyService.createCompany(companyData, null as any);

        // Create initial admin user for this company
        await pool.query(
            `INSERT INTO users (email, password, first_name, last_name, phone, role, company_id, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                lowerEmail,
                passwordHash,
                validatedData.name, // Using company name as temporary first name
                'Admin',
                validatedData.phone,
                'company_admin',
                company.id,
                true // Allow login even before full verification if they have email/pw? Or wait? 
            ]
        );

        res.status(201).json({
            success: true,
            data: {
                id: company.id,
                name: company.name,
                phone: company.phone,
                verification_code: company.verification_code // Geri döndür ki client SMS linkine eklesin
            },
            message: 'Kayıt başvurunuz alındı. Telefonunuzdaki SMS ekranına yönlendiriliyorsunuz.'
        });
    } catch (error) {
        console.error('Registration Error:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validasyon hatası',
                details: error.errors
            });
        }
        res.status(500).json({ 
            success: false, 
            error: 'Kayıt sırasında sunucu hatası oluştu',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * POST /api/companies/:id/setup-staff
 * Gerekli: admin_key, staffList (array of {first_name, last_name, phone})
 */
router.post('/:id/setup-staff', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { admin_key, staffList } = req.body;

        if (!admin_key || !Array.isArray(staffList) || staffList.length === 0) {
            return res.status(400).json({ success: false, error: 'Geçersiz parametreler' });
        }

        // Validate company and admin_key
        const compRes = await pool.query('SELECT name, board_key FROM companies WHERE id = $1 AND admin_key = $2 AND is_active = true', [id, admin_key]);
        if (compRes.rowCount === 0) {
            return res.status(403).json({ success: false, error: 'Yetkisiz erişim veya kapalı firma' });
        }

        const companyName = compRes.rows[0].name;

        const results = [];
        for (const staff of staffList) {
            if (!staff.first_name || !staff.last_name || !staff.phone || !staff.email) continue;

            const lowerEmail = staff.email.toLowerCase().trim();

            // Check if email already exists
            const existingUser = await pool.query('SELECT id, role FROM users WHERE LOWER(email) = $1', [lowerEmail]);
            
            let userId: number;
            let boardCode = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join(''); // Use 6 digits for more security

            if (existingUser.rows.length > 0) {
                userId = existingUser.rows[0].id;
                // If user exists, update their record with company_id and ensure role is 'staff' if they aren't admin
                const updateRole = existingUser.rows[0].role === 'customer' ? 'staff' : existingUser.rows[0].role;
                await pool.query(
                    'UPDATE users SET company_id = $1, role = $2, phone = $3, first_name = $4, last_name = $5 WHERE id = $6',
                    [parseInt(id as string), updateRole, formatPhoneTo12Digits(staff.phone), staff.first_name, staff.last_name, userId]
                );
            } else {
                const fakePw = '$2b$10$wI5uJmO/P8/1rFzFqI2f/e./6K67UHT71YmQdG5H73A7z241/O6lO'; // "123456"

                const insertRes = await pool.query(
                    `INSERT INTO users (first_name, last_name, phone, company_id, role, is_active, board_code, email, password)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
                    [
                        staff.first_name,
                        staff.last_name,
                        formatPhoneTo12Digits(staff.phone),
                        parseInt(id as string),
                        'staff',
                        true,
                        boardCode,
                        lowerEmail,
                        fakePw
                    ]
                );
                userId = insertRes.rows[0].id;
            }

            // FIX: company_users tablosuna da ekle ki yetki hatası almasınlar
            try {
                await pool.query(
                    'INSERT INTO company_users (company_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                    [parseInt(id as string), userId, 'staff']
                );
            } catch (e) {
                console.error('Error adding to company_users:', e);
            }

            // Send SMS to staff
            const staffEmail = staff.email.toLowerCase().trim();
            const smsMsg = `Sn. ${staff.first_name}, ${companyName} personeli olarak eklendiniz. Email: ${staffEmail}. Giris sifrenizi olusturmak icin: https://www.saloncebinde.com/#/set-password/${boardCode}/${staffEmail}`;
            
            // Background SMS sending
            require('../services/sms.service').default.sendSms(null as any, staff.phone, smsMsg).catch((e: any) => { 
                console.error('SMS Send Error in setup-staff:', e);
            });

            results.push({ id: userId });
        }

        // Sync Stats
        companyService.syncCompanyStats(parseInt(id)).catch(() => {});

        res.json({
            success: true,
            data: results,
            message: `${results.length} personel basariyla olusturuldu ve SMS gönderildi.`
        });
    } catch (err: any) {
        console.error('setup-staff error:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Personel kurulum hatası',
            details: err.message
        });
    }
});

/**
 * POST /api/companies
 * Yeni firma oluştur (Super Admin)
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

        const isLicenseExpired = company.license_end_date && new Date(company.license_end_date) < new Date();

        res.json({
            success: true,
            data: {
                ...company,
                is_license_expired: isLicenseExpired
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

        const isLicenseExpired = company.license_end_date && new Date(company.license_end_date) < new Date();

        res.json({
            success: true,
            data: {
                company: company,
                token: token,
                is_license_expired: isLicenseExpired
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
        console.log('--- Staff Creation Request ---');
        console.log('Company ID:', companyId);
        console.log('Body:', req.body);
        const { first_name, last_name, gender, department_id, photo, quantity, unit, email: providedEmail, phone, password } = req.body;

        if (!first_name || !last_name) {
            return res.status(400).json({ success: false, error: 'İsim ve soyisim gereklidir' });
        }

        // Benzersiz board_code oluştur
        const prefix = first_name.substring(0, 3).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const board_code = `${prefix}-${random}`;

        // Kullanıcı oluştur (E-posta yoksa board_code ile oluştur)
        const email = providedEmail ? providedEmail.toLowerCase().trim() : `${board_code.toLowerCase()}@staff.local`;
        
        let passwordHash = 'board-auth-only';
        if (password) {
            passwordHash = await bcrypt.hash(password, 10);
        }

        const userResult = await pool.query(
            `INSERT INTO users (email, password, role, first_name, last_name, phone, company_id, board_code, gender, department_id, photo, quantity, unit)
             VALUES ($1, $2, 'staff', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`,
            [email, passwordHash, first_name, last_name, formatPhoneTo12Digits(phone), companyId, board_code, gender || null, department_id || null, photo || null, quantity || null, unit || null]
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

        // Sync Stats
        companyService.syncCompanyStats(companyId).catch(() => {});

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
            `SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, u.phone, u.board_code, u.gender, u.department_id, u.photo, u.quantity, u.unit, d.name as department_name
             FROM users u
             LEFT JOIN departments d ON u.department_id = d.id
             LEFT JOIN company_users cu ON cu.user_id = u.id AND cu.company_id = $1
             WHERE (u.company_id = $1 OR cu.company_id = $1) AND u.role NOT IN ('customer', 'company_admin', 'super_admin')
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
 * DELETE /api/companies/:id/staff-boards/:userId
 * Firma personel board kodunu/ilişkisini sil
 */
router.delete('/:id/staff-boards/:userId', async (req: Request, res: Response) => {
    try {
        const { id, userId } = req.params;
        
        // Önce company_users'dan sil
        await pool.query(
            'DELETE FROM company_users WHERE company_id = $1 AND user_id = $2',
            [id, userId]
        );

        // Eğer kullanıcı sadece bu firmaya bağlıysa ve başka firmada yoksa tamamen silinebilir veya pasif edilebilir
        // Ama şimdilik sadece bağı koparmak yeterli olabilir. 
        // Eğer u.company_id == id ise onu da temizleyelim
        await pool.query(
            'UPDATE users SET company_id = NULL, board_code = NULL WHERE id = $1 AND company_id = $2',
            [userId, id]
        );

        // Sync Stats
        companyService.syncCompanyStats(parseInt(id)).catch(() => {});

        res.json({ success: true, message: 'Personel başarıyla silindi' });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Personel silinirken hata oluştu'
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
 * PUT /api/companies/:id/staff/:userId
 * Personel bilgilerini güncelle (İsim, Soyisim, Email, Telefon, Şifre vb.)
 */
router.put('/:id/staff/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { first_name, last_name, email, phone, password, gender, department_id, quantity, unit } = req.body;

        const updates: string[] = [];
        const values: any[] = [];
        let i = 1;

        if (first_name !== undefined) { updates.push(`first_name = $${i++}`); values.push(first_name); }
        if (last_name !== undefined) { updates.push(`last_name = $${i++}`); values.push(last_name); }
        if (email !== undefined) { updates.push(`email = $${i++}`); values.push(email.toLowerCase().trim()); }
        if (phone !== undefined) { 
            updates.push(`phone = $${i++}`); 
            values.push(phone ? formatPhoneTo12Digits(phone) : ''); 
        }
        if (gender !== undefined) { updates.push(`gender = $${i++}`); values.push(gender); }
        if (department_id !== undefined) { updates.push(`department_id = $${i++}`); values.push(department_id || null); }
        if (quantity !== undefined) { updates.push(`quantity = $${i++}`); values.push(quantity || null); }
        if (unit !== undefined) { updates.push(`unit = $${i++}`); values.push(unit || null); }

        if (password) {
            const passwordHash = await bcrypt.hash(password, 10);
            updates.push(`password = $${i++}`);
            values.push(passwordHash);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'Güncellenecek veri yok' });
        }

        values.push(userId);
        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`;
        
        const result = await pool.query(query, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Personel bulunamadı' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Staff Update Error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Personel güncellenirken hata oluştu'
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

        const isLicenseExpired = companyResult.rows[0].license_end_date && new Date(companyResult.rows[0].license_end_date) < new Date();

        res.json({
            success: true,
            data: {
                user: user,
                company: companyResult.rows[0],
                is_license_expired: isLicenseExpired
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
        const { code, password } = req.body;
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
        const adminResult = await pool.query('SELECT id, name, admin_key, license_end_date FROM companies WHERE UPPER(admin_key) = UPPER($1)', [code]);
        if (adminResult.rows.length > 0) {
            const comp = adminResult.rows[0];
            const isLicenseExpired = comp.license_end_date && new Date(comp.license_end_date) < new Date();

            // JWT token oluştur - firma admini olarak giriş yapsın
            const token = jwt.sign(
                { userId: comp.id, email: `admin_${comp.id}@saloncebinde.local`, role: 'company_admin', companyId: comp.id },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '30d' }
            );

            return res.json({
                success: true,
                data: {
                    type: 'admin',
                    redirect: `/company-panel`,
                    company_name: comp.name,
                    company_id: comp.id,
                    user_id: comp.id,
                    token: token,
                    is_license_expired: isLicenseExpired
                }
            });
        }

        // Sonra board_code mu kontrol et
        const staffResult = await pool.query(
            `SELECT u.id, u.first_name, u.last_name, u.board_code, u.company_id, u.photo, c.name as company_name, c.license_end_date
             FROM users u
             JOIN companies c ON u.company_id = c.id
             WHERE UPPER(u.board_code) = UPPER($1)`,
            [code]
        );
        if (staffResult.rows.length > 0) {
            const sr = staffResult.rows[0];
            const isLicenseExpired = sr.license_end_date && new Date(sr.license_end_date) < new Date();

            // JWT token oluştur - personel dashboard'a erişsin
            const token = jwt.sign(
                { userId: sr.id, email: `${sr.board_code}@staff.local`, role: 'staff', companyId: sr.company_id },
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
                    token: token,
                    is_license_expired: isLicenseExpired
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

/**
 * GET /api/companies/sms-callback
 * NetGSM veya diğer sağlayıcılardan gelen SMS bildirimlerini yakalar
 * Format: ?gsm=905XXXX&msg=CODE&tarih=...
 */
router.all('/sms-callback', async (req: Request, res: Response) => {
    try {
        console.log(`[SMS Callback] [${new Date().toISOString()}] New Request: ${req.method} ${req.originalUrl}`);

        // Netgsm and other provider values can be anywhere (query params, body, etc)
        const allData = { ...req.query, ...req.body, ...req.params };

        console.log('[SMS Callback] Collected Data:', JSON.stringify(allData));
        
        const gsm = allData.ceptel || allData.sourceNumber || allData.source_number || allData.gsm || allData.phone || allData.from || allData.source || allData.number || allData.sender;
        const msg = allData.mesaj || allData.content || allData.msg || allData.message || allData.text || allData.body || allData.sms_text;

        console.log(`[SMS Callback] Detected: GSM=${gsm}, MSG=${msg}`);

        let resultMessage = 'NOT_PROCESSED';
        if (msg && gsm) {
            const company = await companyService.verifyBySmsCode(String(msg), String(gsm));
            if (company) {
                console.log(`[SMS Callback] SUCCESS: Approved ${company.name}`);
                resultMessage = `SUCCESS: Approved ${company.name}`;
                
                // Track hit in DB for debugging
                await pool.query(
                    'INSERT INTO callback_logs (method, url, headers, all_data, detected_gsm, detected_msg, result) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [req.method, req.originalUrl, JSON.stringify(req.headers), JSON.stringify(allData), String(gsm), String(msg), resultMessage]
                ).catch(e => console.error('Error logging callback:', e));

                return res.json({ status: "OK", message: "Approved", company: company.name });
            } else {
                console.log(`[SMS Callback] FAILED: Dogrulama basarisiz (Kriterlere uyan kayit yok)`);
                resultMessage = 'FAILED: No matching company found';
            }
        } else {
            console.log(`[SMS Callback] ERROR: Parametreler eksik (GSM veya MSG bulunamadi)`);
            resultMessage = 'ERROR: Missing parameters';
        }

        // Always log failures too
        await pool.query(
            'INSERT INTO callback_logs (method, url, headers, all_data, detected_gsm, detected_msg, result) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [req.method, req.originalUrl, JSON.stringify(req.headers), JSON.stringify(allData), String(gsm || ''), String(msg || ''), resultMessage]
        ).catch(e => console.error('Error logging callback:', e));

        res.json({ status: resultMessage });
    } catch (err) {
        console.error('[SMS Callback] CRITICAL ERROR:', err);
        res.status(500).json({ status: "ERROR" });
    }
});

/**
 * GET /api/companies/debug/callback-logs
 * Debugging purposes only
 */
router.get('/debug/callback-logs', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM callback_logs ORDER BY created_at DESC LIMIT 50');
        res.json({ success: true, count: result.rowCount, data: result.rows });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/verify-test?gsm=...&msg=...
 */
router.get('/verify-test', async (req: Request, res: Response) => {
    try {
        const { gsm, msg } = req.query;
        if (!gsm || !msg) return res.send('GSM ve MSG gerekli');
        const company = await companyService.verifyBySmsCode(String(msg), String(gsm));
        res.json({ success: !!company, name: company?.name || 'BULUNAMADI' });
    } catch (e: any) {
        res.status(500).send(e.message);
    }
});

export default router;
