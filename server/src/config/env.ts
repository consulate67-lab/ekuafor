import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Environment validation — zod schema + fail-fast.
 *
 * Server başlarken tüm gerekli env değişkenleri validate edilir. Hata varsa
 * process.exit(1) ile çıkılır — uygulama başlamaz.
 *
 * ÖNEMLİ: Production'da bu dosya her import edildiğinde validate çalışır.
 * Bu nedenle en üstte import edilir.
 *
 * Fail-fast örnekleri:
 * - JWT_SECRET tanımsız → exit
 * - JWT_SECRET < 32 karakter → exit
 * - DATABASE_URL + DB_* hiçbiri yok → exit
 * - NODE_ENV development dışında + ALLOWED_ORIGINS '*' → exit (CORS riski)
 */

const serverSchema = z.object({
    // === Server core ===
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),

    // === Database ===
    DATABASE_URL: z.string().url().optional(),
    DB_HOST: z.string().optional(),
    DB_PORT: z.coerce.number().int().optional(),
    DB_NAME: z.string().optional(),
    DB_USER: z.string().optional(),
    DB_PASSWORD: z.string().optional(),

    // === JWT (zorunlu, fallback yok) ===
    JWT_SECRET: z.string().min(32, 'JWT_SECRET en az 32 karakter olmalı (örn: openssl rand -hex 32)'),

    // === CORS ===
    ALLOWED_ORIGINS: z
        .string()
        .default('http://localhost:5173,http://localhost:3000,capacitor://localhost,app://.'),

    // === Türkiye API ===
    TURKIYE_API_BASE_URL: z.string().url().default('https://turkiyeapi.dev/api/v1'),

    // === Google Maps ===
    GOOGLE_MAPS_API_KEY: z.string().optional(),

    // === Firebase ===
    FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
    FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),

    // === OpenAI ===
    OPENAI_API_KEY: z.string().optional(),

    // === SMTP ===
    SMTP_HOST: z.string().default('smtp.gmail.com'),
    SMTP_PORT: z.coerce.number().int().default(587),
    SMTP_SECURE: z.coerce.boolean().default(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),

    // === Sentry (opsiyonel) ===
    SENTRY_DSN: z.string().url().optional(),

    // === Base URL (iyzico callback'leri için) ===
    BASE_URL: z.string().url().default('http://localhost:3000'),

    // === Redis (opsiyonel) ===
    REDIS_URL: z.string().url().optional(),
});

const parsed = serverSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('\n❌ Environment validation failed:\n');
    console.error(parsed.error.format());
    console.error('\n💡 Çözüm önerileri:');
    console.error('  - .env dosyası oluştur (.env.example\'dan kopyala)');
    console.error('  - JWT_SECRET üret: openssl rand -hex 32');
    console.error('  - DB bilgileri: DATABASE_URL veya DB_HOST+DB_NAME+DB_USER\n');
    process.exit(1);
}

// === Refine: DATABASE_URL veya DB_* zorunlu ===
if (!parsed.data.DATABASE_URL && (!parsed.data.DB_HOST || !parsed.data.DB_NAME || !parsed.data.DB_USER)) {
    console.error('❌ DATABASE_URL veya DB_HOST + DB_NAME + DB_USER zorunlu');
    process.exit(1);
}

// === Refine: Production'da ALLOWED_ORIGINS '*' içermemeli ===
const isProduction = parsed.data.NODE_ENV === 'production';
if (isProduction && parsed.data.ALLOWED_ORIGINS.includes('*')) {
    console.error('❌ NODE_ENV=production iken ALLOWED_ORIGINS \'*\' içeremez');
    console.error('   Production\'da spesifik origin belirtin (örn: https://app.example.com)');
    process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof serverSchema>;

// === Yardımcılar ===

/** ALLOWED_ORIGINS string'ini array'e çevirir. */
export const allowedOrigins: string[] = env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);

/** Production mı? */
export const isProd = env.NODE_ENV === 'production';

/** Development mı? */
export const isDev = env.NODE_ENV === 'development';
