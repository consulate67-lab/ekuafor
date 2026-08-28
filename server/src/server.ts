import { createApp } from './app';
import { runMigrations } from './db/migrate';
import pool from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';

const app = createApp();

/**
 * Server bootstrap. Express app'i dinler ve DB migration'larını başlatır.
 * Migration'lar background'da çalışır — server yine de dinlemeye başlar.
 */
export const startServer = () => {
    const server = app.listen(env.PORT, () => {
        logger.info(
            {
                port: env.PORT,
                env: env.NODE_ENV,
                db: env.DATABASE_URL ? 'DATABASE_URL' : `${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`,
            },
            `🚀 Server running on port ${env.PORT}`
        );

        // Background migrations
        (async () => {
            logger.info('🏁 Starting background migrations...');
            try {
                await runMigrations();
                logger.info('✅ Background migrations finished successfully');
            } catch (e: any) {
                logger.error({ err: e }, '🔥 Background migration failed');
            }
        })();
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        logger.info({ signal }, 'Shutting down server...');
        server.close(async () => {
            logger.info('HTTP server closed');
            await pool.end();
            logger.info('Database pool closed');
            process.exit(0);
        });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
        logger.fatal({ err }, 'UNCAUGHT EXCEPTION');
    });

    process.on('unhandledRejection', (err: any) => {
        logger.fatal({ err }, 'UNHANDLED REJECTION');
    });

    return server;
};
