import { createApp } from './app';
import { runMigrations } from './db/migrator';
import pool from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';

const app = createApp();

/**
 * Server bootstrap. Önce bekleyen DB migration'larını uygular, sonra dinlemeye başlar.
 * Migration başarısız olursa süreç kapanır; Railway healthcheck geçmediği için eski sürüm çalışmaya devam eder.
 */
export const startServer = async () => {
    try {
        await runMigrations();
        logger.info('✅ Database migrations applied');
    } catch (err) {
        logger.fatal({ err }, '🔥 Database migration failed');
        await pool.end().catch(() => undefined);
        process.exit(1);
    }

    const server = app.listen(env.PORT, () => {
        logger.info(
            {
                port: env.PORT,
                env: env.NODE_ENV,
                db: env.DATABASE_URL ? 'DATABASE_URL' : `${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`,
            },
            `🚀 Server running on port ${env.PORT}`
        );
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
