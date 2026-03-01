import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { z } from 'zod';
import otpService from '../services/otp.service';
import appointmentService from '../services/appointment.service';

const router = Router();

const loginSchema = z.object({
    email: z.string().email('Geçerli bir email adresi giriniz'),
    password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır')
});

const registerSchema = z.object({
    email: z.string().email('Geçerli bir email adresi giriniz'),
    password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
    first_name: z.string().min(2, 'Ad en az 2 karakter olmalıdır'),
    last_name: z.string().min(2, 'Soyad en az 2 karakter olmalıdır'),
    phone: z.string().optional(),
    role: z.enum(['super_admin', 'company_admin', 'customer']).default('customer'),
    company_id: z.number().optional()
});

/**
 * POST /api/auth/register
 * Yeni kullanıcı kaydı
 */
router.post('/register', async (req: Request, res: Response) => {
    try {
        const validatedData = registerSchema.parse(req.body);

        // Email kontrolü
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [validatedData.email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Bu email adresi zaten kullanılıyor'
            });
        }

        // Şifreyi hashle
        const passwordHash = await bcrypt.hash(validatedData.password, 10);

        // Kullanıcıyı oluştur
        const result = await pool.query(
            `INSERT INTO users (email, password, first_name, last_name, phone, role, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, first_name, last_name, phone, role, company_id, created_at`,
            [
                validatedData.email,
                passwordHash,
                validatedData.first_name,
                validatedData.last_name,
                validatedData.phone || null,
                validatedData.role,
                validatedData.company_id || null
            ]
        );

        const user = result.rows[0];

        // JWT token oluştur
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role, companyId: user.company_id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            data: {
                user,
                token
            }
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
            error: error instanceof Error ? error.message : 'Kayıt sırasında hata oluştu'
        });
    }
});

/**
 * POST /api/auth/login
 * Kullanıcı girişi
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const validatedData = loginSchema.parse(req.body);

        // Kullanıcıyı bul
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [validatedData.email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Email veya şifre hatalı'
            });
        }

        const user = result.rows[0];

        // Şifreyi kontrol et
        // DİKKAT: Veritabanında sütun adı 'password'
        const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Email veya şifre hatalı'
            });
        }

        // JWT token oluştur
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role, companyId: user.company_id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        // Şifreyi response'dan çıkar (Güvenlik)
        const { password, ...userWithoutPassword } = user;

        res.json({
            success: true,
            data: {
                user: userWithoutPassword,
                token
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Giriş sırasında hata oluştu'
        });
    }
});

/**
 * POST /api/auth/send-otp
 * Telefon numarasına OTP gönder
 */
router.post('/send-otp', async (req: Request, res: Response) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, error: 'Telefon numarası gereklidir' });
        }

        const result = await otpService.sendOtp(phone);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/auth/verify-otp
 * OTP kodunu doğrula ve giriş yap
 */
router.post('/verify-otp', async (req: Request, res: Response) => {
    try {
        const { phone, code, first_name, last_name, device_id } = req.body;

        if (!phone || !code) {
            return res.status(400).json({ success: false, error: 'Telefon ve kod gereklidir' });
        }

        const isValid = await otpService.verifyOtp(phone, code);
        if (!isValid) {
            return res.status(400).json({ success: false, error: 'Geçersiz veya süresi dolmuş kod' });
        }

        // Formata getir (905...)
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '90' + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('90')) {
            formattedPhone = '90' + formattedPhone;
        }

        // Kullanıcıyı bul veya oluştur
        let userResult = await pool.query(
            'SELECT * FROM users WHERE phone = $1 OR email = $2',
            [formattedPhone, `${formattedPhone}@saloon.com`]
        );

        let user;
        if (userResult.rows.length === 0) {
            // Yeni müşteri oluştur
            const passwordHash = await bcrypt.hash(Math.random().toString(36), 10);
            const registerResult = await pool.query(
                `INSERT INTO users (email, password, first_name, last_name, phone, role)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id, email, first_name, last_name, phone, role, created_at`,
                [
                    `${formattedPhone}@saloon.com`,
                    passwordHash,
                    first_name || 'Müşteri',
                    last_name || 'Yeni',
                    formattedPhone,
                    'customer'
                ]
            );
            user = registerResult.rows[0];
        } else {
            user = userResult.rows[0];
        }

        // Cihaz ve telefon eşleştirmesi (ve randevuların sahiplenilmesi)
        if (device_id) {
            await appointmentService.syncDeviceWithPhone(device_id, formattedPhone);
            await appointmentService.claimAppointmentsByDevice(device_id, formattedPhone, user.id);
        }

        // JWT token oluştur
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role, companyId: user.company_id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '30d' } // Mobilde daha uzun süre
        );

        const { password, ...userWithoutPassword } = user;

        res.json({
            success: true,
            data: {
                user: userWithoutPassword,
                token
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/auth/me
 * Mevcut kullanıcı bilgilerini getir
 */
router.get('/me', async (req: Request, res: Response) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Token bulunamadı'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;

        const result = await pool.query(
            'SELECT id, email, first_name, last_name, phone, role, company_id, photo, created_at FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Kullanıcı bulunamadı'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Geçersiz token'
        });
    }
});

// Update user company (Fix for missing company_id) - Support both POST and PUT
router.all('/update-company', async (req: Request, res: Response) => {
    if (req.method !== 'POST' && req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ success: false, error: 'Token bulunamadı' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        const { company_id } = req.body;

        if (!company_id) {
            return res.status(400).json({ success: false, error: 'Firma ID gereklidir' });
        }

        // Update user
        const result = await pool.query(
            'UPDATE users SET company_id = $1 WHERE id = $2 RETURNING *',
            [company_id, decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
        }

        const user = result.rows[0];

        // Generate new token with updated companyId
        const newToken = jwt.sign(
            { userId: user.id, email: user.email, role: user.role, companyId: user.company_id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        // Remove password from response
        const { password, ...userWithoutPassword } = user;

        res.json({
            success: true,
            data: { user: userWithoutPassword, token: newToken }
        });
    } catch (error: any) {
        console.error('Update Company Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
