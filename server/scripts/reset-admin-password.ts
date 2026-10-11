// Admin şifre sıfırlama (sadece komut satırından; web üzerinden şifre sıfırlama uç noktası yoktur)
// Kullanım: railway run npx tsx scripts/reset-admin-password.ts <email>
//
// Railway env (DATABASE_URL) otomatik inject edilir. Yeni rastgele şifre üretir ve ekrana yazar.

import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { Pool } from 'pg';
import 'dotenv/config';

const ADMIN_EMAIL = process.argv[2];

if (!ADMIN_EMAIL) {
  console.error('Kullanım: npx tsx scripts/reset-admin-password.ts <email>');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL env variable missing');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});

function generatePassword(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < length; i++) {
    pw += chars[randomInt(chars.length)];
  }
  return pw;
}

async function main() {
  const result = await pool.query(
    'SELECT id, email, role FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [ADMIN_EMAIL]
  );

  if (result.rows.length === 0) {
    console.error('[reset-admin] Kullanıcı bulunamadı:', ADMIN_EMAIL);
    process.exit(1);
  }

  const user = result.rows[0];
  const newPassword = generatePassword(16);
  const hash = await bcrypt.hash(newPassword, 10);

  await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hash, user.id]);

  console.log('=== ADMIN RESET SUCCESS ===');
  console.log('email       :', user.email);
  console.log('user_id     :', user.id);
  console.log('role        :', user.role);
  console.log('NEW_PASSWORD:', newPassword);

  await pool.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('[reset-admin] HATA:', err);
  await pool.end().catch(() => {});
  process.exit(1);
});
