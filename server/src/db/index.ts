import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config();

/**
 * Drizzle ORM client.
 *
 * Drizzle'in Node Postgres adapter'ı (pg modülü üzerinden) kullanılır.
 * Connection pool, mevcut config/database.ts'den alınır (dry-run uyumluluk).
 *
 * Kullanım:
 *   import { db } from './db';
 *   import { users } from './db/schema';
 *   const all = await db.select().from(users);
 */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DATABASE_URL ? undefined : (process.env.DB_HOST || 'localhost'),
    port: process.env.DATABASE_URL ? undefined : parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DATABASE_URL ? undefined : (process.env.DB_NAME || 'saloon_db'),
    user: process.env.DATABASE_URL ? undefined : (process.env.DB_USER || 'postgres'),
    password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
    ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1')
        ? { rejectUnauthorized: false }
        : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
});

export const db = drizzle(pool, { schema });
export { pool };

export type Database = typeof db;
