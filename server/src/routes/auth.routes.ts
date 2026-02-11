import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { z } from 'zod';

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
    role: z.enum(['super_admin', 'company_admin', 'customer']).default('customer')
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
            `INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, phone, role, created_at`,
            [
                validatedData.email,
                passwordHash,
                validatedData.first_name,
                validatedData.last_name,
                validatedData.phone,
                validatedData.role
            ]
        );

        const user = result.rows[0];

        // JWT token oluştur
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
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
            'SELECT * FROM users WHERE email = $1 AND is_active = true',
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
        const isPasswordValid = await bcrypt.compare(validatedData.password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Email veya şifre hatalı'
            });
        }

        // JWT token oluştur
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        // Şifreyi response'dan çıkar
        const { password_hash, ...userWithoutPassword } = user;

        res.json({
            success: true,
            data: {
                user: userWithoutPassword,
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
            error: error instanceof Error ? error.message : 'Giriş sırasında hata oluştu'
        });
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
            'SELECT id, email, first_name, last_name, phone, role, created_at FROM users WHERE id = $1 AND is_active = true',
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

export default router;
