import { describe, it, expect } from 'vitest';
import { parseEnv, type Env } from '../../config/env';

/**
 * env.test.ts — zod schema + fail-fast validation testleri.
 *
 * DB bağlantısı gerektirmez, pure unit test.
 */

const validBaseEnv: NodeJS.ProcessEnv = {
    JWT_SECRET: 'test_jwt_secret_with_32_chars_minimum_for_testing',
    DB_HOST: 'localhost',
    DB_NAME: 'test_db',
    DB_USER: 'test_user',
    DB_PASSWORD: 'test_pass',
    ALLOWED_ORIGINS: 'http://localhost:5173',
};

describe('parseEnv', () => {
    describe('happy path', () => {
        it('parses valid env with DB_* fields', () => {
            const env = parseEnv(validBaseEnv);
            expect(env.JWT_SECRET).toBe(validBaseEnv.JWT_SECRET);
            expect(env.DB_HOST).toBe('localhost');
            expect(env.DB_NAME).toBe('test_db');
            expect(env.DB_USER).toBe('test_user');
            expect(env.NODE_ENV).toBe('development'); // default
            expect(env.PORT).toBe(3000); // default
        });

        it('parses valid env with DATABASE_URL', () => {
            const env = parseEnv({
                ...validBaseEnv,
                DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
            });
            expect(env.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
        });

        it('applies default values', () => {
            const env = parseEnv(validBaseEnv);
            expect(env.NODE_ENV).toBe('development');
            expect(env.PORT).toBe(3000);
            expect(env.TURKIYE_API_BASE_URL).toBe('https://turkiyeapi.dev/api/v1');
            expect(env.SMTP_HOST).toBe('smtp.gmail.com');
            expect(env.SMTP_PORT).toBe(587);
            expect(env.SMTP_SECURE).toBe(false);
        });

        it('coerces string PORT to number', () => {
            const env = parseEnv({ ...validBaseEnv, PORT: '8080' });
            expect(env.PORT).toBe(8080);
            expect(typeof env.PORT).toBe('number');
        });
    });

    describe('JWT_SECRET validation', () => {
        it('throws when JWT_SECRET is missing', () => {
            const { JWT_SECRET, ...env } = validBaseEnv;
            expect(() => parseEnv(env)).toThrow(/Environment validation failed/);
        });

        it('throws when JWT_SECRET is too short (< 32)', () => {
            expect(() =>
                parseEnv({ ...validBaseEnv, JWT_SECRET: 'short_secret' })
            ).toThrow(/Environment validation failed/);
        });

        it('accepts exactly 32-char JWT_SECRET', () => {
            const env = parseEnv({
                ...validBaseEnv,
                JWT_SECRET: 'a'.repeat(32),
            });
            expect(env.JWT_SECRET).toHaveLength(32);
        });
    });

    describe('database validation', () => {
        it('throws when no DATABASE_URL or DB_* fields', () => {
            const { DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, ...env } = validBaseEnv;
            expect(() => parseEnv(env)).toThrow(/DATABASE_URL veya DB_HOST/);
        });

        it('throws when only some DB_* fields provided', () => {
            const { DB_NAME, DB_USER, ...env } = validBaseEnv;
            expect(() => parseEnv(env)).toThrow(/DATABASE_URL veya DB_HOST/);
        });
    });

    describe('production guards', () => {
        it('throws when production + ALLOWED_ORIGINS contains *', () => {
            expect(() =>
                parseEnv({
                    ...validBaseEnv,
                    NODE_ENV: 'production',
                    ALLOWED_ORIGINS: 'https://app.example.com,*',
                })
            ).toThrow(/NODE_ENV=production iken ALLOWED_ORIGINS/);
        });

        it('accepts production with specific origins', () => {
            const env = parseEnv({
                ...validBaseEnv,
                NODE_ENV: 'production',
                ALLOWED_ORIGINS: 'https://app.example.com,https://admin.example.com',
            });
            expect(env.NODE_ENV).toBe('production');
            expect(env.ALLOWED_ORIGINS).toContain('https://app.example.com');
        });

        it('accepts development with * in ALLOWED_ORIGINS (but env throws)', () => {
            // Development'ta * kabul edilir mi? Hayır, refine her zaman çalışır
            // (yalnızca production check yapıyor)
            const env = parseEnv({
                ...validBaseEnv,
                NODE_ENV: 'development',
                ALLOWED_ORIGINS: '*',
            });
            expect(env.ALLOWED_ORIGINS).toBe('*');
        });
    });

    describe('NODE_ENV validation', () => {
        it('accepts development, production, test', () => {
            for (const env of ['development', 'production', 'test'] as const) {
                const result = parseEnv({ ...validBaseEnv, NODE_ENV: env });
                expect(result.NODE_ENV).toBe(env);
            }
        });

        it('rejects invalid NODE_ENV', () => {
            expect(() =>
                parseEnv({ ...validBaseEnv, NODE_ENV: 'staging' as any })
            ).toThrow(/Environment validation failed/);
        });
    });
});
