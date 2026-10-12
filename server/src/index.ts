/**
 * Entry point. Server'ı başlatır.
 *
 * Mimari:
 *   app.ts        → Express factory (middleware + route registry)
 *   server.ts     → Bootstrap (migrations, listen, shutdown)
 *   db/migrator.ts → drizzle/ altındaki SQL migration'larını uygular
 *   routes/       → Domain route'lar (auth, company, ...)
 *   middleware/   → Global middleware (logger, errorHandler)
 *   services/     → İş mantığı katmanı
 */
import { startServer } from './server';

startServer();