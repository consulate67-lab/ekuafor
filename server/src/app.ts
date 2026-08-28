import express, { Express } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { mountRoutes } from './routes/registry';
import { allowedOrigins, env, isDev } from './config/env';
import { logger } from './utils/logger';

/**
 * Express app factory. Tüm middleware + route registry burada bağlanır.
 * Server.ts bu app'i import edip dinler.
 *
 * Aşama 3 — Güvenlik sertleştirme:
 *   - CORS: wildcard '*' kaldırıldı, env.ALLOWED_ORIGINS whitelist kullanılıyor
 *   - Rate limit: global + auth endpoint'leri için sıkı
 *   - Logging: console.log → pino structured logger
 *   - Env validation: src/config/env.ts zod fail-fast
 */
export const createApp = (): Express => {
    const app = express();

    // Güven: Proxy arkasında çalışabilir (Railway/Render)
    app.set('trust proxy', 1);

    // === CORS — origin whitelist ===
    app.use(cors({
        origin: (origin, callback) => {
            // Mobile/Capacitor origin header olmayabilir; izin ver
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
                callback(null, true);
            } else {
                logger.warn({ origin, allowed: allowedOrigins }, 'CORS blocked');
                callback(new Error(`CORS: origin not allowed: ${origin}`));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-No-Mock', 'X-Company-Id'],
    }));

    // === Rate limit — global ===
    const globalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 dakika
        max: isDev ? 1000 : 200,   // dev: gevşek, prod: sıkı
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, error: 'Çok fazla istek, lütfen sonra tekrar deneyin' },
    });
    app.use(globalLimiter as any);

    // === Auth endpoint'leri için sıkı rate limit ===
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: isDev ? 50 : 10,     // dev: 50, prod: 10
        skipSuccessfulRequests: true,
        message: { success: false, error: 'Çok fazla auth denemesi' },
    });
    app.use('/api/auth/login', authLimiter as any);
    app.use('/api/auth/register', authLimiter as any);
    app.use('/api/auth/forgot-password', authLimiter as any);

    // === Body parsers ===
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ limit: '10mb', extended: true }));

    // === Request logging (pino-http) ===
    app.use(requestLogger);

    // === Root banner ===
    app.get('/', (req, res) => {
        res.send('<h1>Salon Cebinde Backend is Live!</h1> <p>Try <a href="/api/ping">/api/ping</a></p>');
    });

    // === All API routes (single mount point — /api/*) ===
    mountRoutes(app);

    // === Global error handler (must be last) ===
    app.use(errorHandler);

    logger.info(
        { env: env.NODE_ENV, origins: allowedOrigins },
        'Express app created with hardened security'
    );

    return app;
};
