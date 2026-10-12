import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import pool from '../config/database';
import { env } from '../config/env';

const USER_FIELDS = 'id, email, first_name, last_name, phone, role, company_id, photo, created_at';

/**
 * Firmanın yönetici kullanıcısını döner; yoksa oluşturur. Yönetici anahtarıyla (admin_key) yapılan girişler
 * bu kullanıcı adına token alır, böylece `/auth/me` ve yetki kontrolleri gerçek bir kullanıcıya bağlanır.
 */
export async function getOrCreateCompanyAdmin(company: { id: number; name: string; phone?: string | null }) {
    const existing = await pool.query(
        `SELECT ${USER_FIELDS} FROM users WHERE company_id = $1 AND role = 'company_admin' ORDER BY id LIMIT 1`,
        [company.id]
    );
    if (existing.rows[0]) return existing.rows[0];

    // Şifre kimsenin bilmediği bir değer; yönetici e-posta/şifreyi daha sonra ayarlar.
    const password = await bcrypt.hash(randomBytes(24).toString('hex'), 10);
    const created = await pool.query(
        `INSERT INTO users (email, password, first_name, last_name, phone, role, company_id, is_active)
         VALUES ($1, $2, $3, 'Yönetici', $4, 'company_admin', $5, true)
         ON CONFLICT (email) DO UPDATE SET company_id = EXCLUDED.company_id
         RETURNING ${USER_FIELDS}`,
        [`firma-${company.id}@saloon.local`, password, company.name.slice(0, 100), company.phone || null, company.id]
    );
    return created.rows[0];
}

export const signUserToken = (user: { id: number; email: string; role: string; company_id?: number | null }, expiresIn: string = '30d') =>
    jwt.sign(
        { userId: user.id, email: user.email, role: user.role, companyId: user.company_id ?? undefined },
        env.JWT_SECRET,
        { expiresIn } as jwt.SignOptions
    );
