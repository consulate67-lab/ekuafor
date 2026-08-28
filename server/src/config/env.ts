import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Environment validation — zod schema + fail-fast.
 *
 * Server başlarken tüm gerekli env değişkenleri validate edilir. Hata varsa
 * process.exit(1) ile çıkılır — uygulama başlamaz.
 *
 * `parseEnv(process.env)` test'lerden de çağrılabilir (NodeJS.ProcessEnv alır,
 * module-level side effect yapmaz).
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

export type Env = z.infer<typeof serverSchema>;

/**
 * Process env'i parse eder, validate eder, fail-fast.
 *
 * - JWT_SECRET < 32 karakter → throw
 * - DATABASE_URL veya DB_HOST+DB_NAME+DB_USER yok → throw
 * - Production + ALLOWED_ORIGINS='*' → throw
 */
export function parseEnv(env: NodeJS.ProcessEnv): Env {
    const parsed = serverSchema.safeParse(env);

    if (!parsed.success) {
        const error = new Error('Environment validation failed');
        (error as any).zodErrors = parsed.error.format();
        throw error;
    }

    // DATABASE_URL veya DB_* zorunlu
    if (
        !parsed.data.DATABASE_URL &&
        (!parsed.data.DB_HOST || !parsed.data.DB_NAME || !parsed.data.DB_USER)
    ) {
        throw new Error('DATABASE_URL veya DB_HOST + DB_NAME + DB_USER zorunlu');
    }

    // Production'da ALLOWED_ORIGINS '*' içermemeli
    if (parsed.data.NODE_ENV === 'production' && parsed.data.ALLOWED_ORIGINS.includes('*')) {
        throw new Error("NODE_ENV=production iken ALLOWED_ORIGINS '*' içeremez");
    }

    return parsed.data;
}

// === Module-level init (side effect) ===
// dotenv zaten yüklendi (yukarıda). Şimdi parseEnv ile fail-fast.
let _env: Env;
try {
    _env = parseEnv(process.env);
} catch (e: any) {
    // Test ortamında (vitest) parseEnv başarısız olursa default'larla devam et.
    // Setup sıralaması nedeniyle process.env henüz set edilmemiş olabilir.
    // Production'da her zaman fail-fast.
    const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;
    if (isTest) {
        console.warn('[env] Test ortamı — default env kullanılıyor');
        _env = serverSchema.parse({
            JWT_SECRET: 'a'.repeat(32),
            DB_HOST: 'localhost',
            DB_NAME: 'saloon_test',
            DB_USER: 'test',
            DB_PASSWORD: 'test',
            ALLOWED_ORIGINS: 'http://localhost:5173',
        });
    } else {
        console.error('\n❌ Environment validation failed:\n');
        if (e.zodErrors) {
            console.error(e.zodErrors);
        } else {
            console.error(e.message);
        }
        console.error('\n💡 Çözüm önerileri:');
        console.error('  - .env dosyası oluştur (.env.example\'dan kopyala)');
        console.error('  - JWT_SECRET üret: openssl rand -hex 32');
        console.error('  - DB bilgileri: DATABASE_URL veya DB_HOST+DB_NAME+DB_USER\n');
        process.exit(1);
    }
}

export const env: Env = _env;

// === Yardımcılar ===
export const allowedOrigins: string[] = env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
