import path from 'path';
import bcrypt from 'bcryptjs';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index';
import { logger } from '../utils/logger';

/**
 * Şema değişiklikleri yalnızca `server/drizzle/` altındaki migration dosyalarıyla yapılır.
 * Yeni değişiklik: `src/db/schema` düzenle → `npx drizzle-kit generate --name <ad>`.
 */
const migrationsFolder = path.resolve(__dirname, '../../drizzle');

/**
 * Eski otomatik migrate.ts ile kurulmuş veritabanında baseline zaten uygulanmış sayılır;
 * drizzle'ın kayıt tablosu yoksa baseline kaydı elle eklenir.
 */
const markLegacyBaseline = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(727274)');
        const { rows } = await client.query(
            `SELECT to_regclass('drizzle.__drizzle_migrations') AS journal, to_regclass('public.companies') AS companies`
        );
        if (!rows[0].journal && rows[0].companies) {
            const [baseline] = readMigrationFiles({ migrationsFolder });
            await client.query('CREATE SCHEMA IF NOT EXISTS drizzle');
            await client.query(
                'CREATE TABLE drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)'
            );
            await client.query('INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)', [
                baseline.hash,
                baseline.folderMillis,
            ]);
            logger.info('Mevcut veritabanı baseline migration ile işaretlendi');
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/** Boş kurulumda ilk super admin; mevcut hesaba dokunmaz. */
const seedSuperAdmin = async () => {
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;
    if (!email || !password) return;
    await pool.query(
        `INSERT INTO users (email, password, role, first_name, last_name, is_active)
         VALUES ($1, $2, 'super_admin', 'Super', 'Admin', true)
         ON CONFLICT (email) DO NOTHING`,
        [email.toLowerCase().trim(), await bcrypt.hash(password, 10)]
    );
};

export const runMigrations = async () => {
    await markLegacyBaseline();
    await migrate(db, { migrationsFolder });
    await seedSuperAdmin();
};
