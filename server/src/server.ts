import dotenv from 'dotenv';
import { createApp } from './app';
import { runMigrations } from './db/migrate';
import pool from './config/database';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const app = createApp();

/**
 * Server bootstrap. Express app'i dinler ve DB migration'larını başlatır.
 * Migration'lar background'da çalışır — server yine de dinlemeye başlar.
 */
export const startServer = () => {
    const server = app.listen(PORT, () => {
        console.log('================================================');
        console.log(`🚀 SERVIS CALISIYOR! PORT: ${PORT}`);
        console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
        console.log(`🔗 DB_URL_TEST: ${process.env.DATABASE_URL ? 'VAR' : 'YOK'}`);
        console.log('================================================');

        // Background migrations
        (async () => {
            console.log('🏁 Starting background migrations...');
            try {
                await runMigrations();
                console.log('✅ Background migrations finished successfully.');
            } catch (e) {
                console.error('🔥 Background migration failed:', e);
            }
        })();
    });

    // Graceful shutdown
    const shutdown = async () => {
        console.log('Shutting down server...');
        server.close(async () => {
            console.log('HTTP server closed.');
            await pool.end();
            console.log('Database pool closed.');
            process.exit(0);
        });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    process.on('uncaughtException', (err) => {
        console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
        console.error(err.name, err.message);
        console.error(err.stack);
    });

    process.on('unhandledRejection', (err: any) => {
        console.error('UNHANDLED REJECTION! 💥');
        console.error(err.name, err.message);
    });

    return server;
};