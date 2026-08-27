import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { mountRoutes } from './routes/registry';

dotenv.config();

/**
 * Express app factory. Tüm middleware + route registry burada bağlanır.
 * Server.ts bu app'i import edip dinler.
 */
export const createApp = (): Express => {
    const app = express();

    // CORS — mobil/web client'lar için geniş. Production'da origin whitelist'e
    // geçilecek (Aşama 3 — güvenlik).
    app.use(cors({
        origin: '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-No-Mock', 'X-Company-Id']
    }));

    // Body parsers
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ limit: '10mb', extended: true }));

    // Request logging (dev/prod ortak — Aşama 3'te pino'ya geçilecek)
    app.use(requestLogger);

    // Root banner
    app.get('/', (req, res) => {
        res.send('<h1>Salon Cebinde Backend is Live!</h1> <p>Try <a href="/api/ping">/api/ping</a></p>');
    });

    // All API routes (single mount point — /api/*)
    mountRoutes(app);

    // Global error handler (must be last)
    app.use(errorHandler);

    return app;
};