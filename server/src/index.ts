/**
 * Entry point. Server'ı başlatır.
 *
 * Mimari:
 *   app.ts        → Express factory (middleware + route registry)
 *   server.ts     → Bootstrap (listen, shutdown, migrations)
 *   db/migrate.ts → Idempotent schema migrations
 *   routes/       → Domain route'lar (auth, company, ...)
 *   middleware/   → Global middleware (logger, errorHandler)
 *   services/     → İş mantığı katmanı
 */
import { startServer } from './server';

startServer();