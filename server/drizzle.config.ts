import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Drizzle Kit konfigürasyonu.
 *
 * - `dialect: 'postgresql'` — pg modülü kullanıyoruz
 * - `schema` — Drizzle schema dosyalarının yolu (src/db/schema/index.ts tüm
 *   domain schema'larını re-export eder)
 * - `out` — Üretilen migration dosyalarının yolu
 *
 * Komutlar:
 *   npx drizzle-kit generate   — Schema'dan SQL migration üretir (DB gerektirmez)
 *   npx drizzle-kit push       — Schema'yı doğrudan DB'ye uygular (dev only)
 *   npx drizzle-kit migrate    — Migration'ı çalıştırır
 *   npx drizzle-kit studio     — Local DB GUI
 */
export default defineConfig({
    dialect: 'postgresql',
    schema: './src/db/schema/index.ts',
    out: './drizzle',
    dbCredentials: {
        url: process.env.DATABASE_URL || 'postgresql://localhost:5432/saloon_db',
    },
    verbose: true,
});
