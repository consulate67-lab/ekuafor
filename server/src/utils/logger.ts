import pino from 'pino';
import { isDev } from '../config/env';

/**
 * Pino structured logger.
 *
 * - Development: pino-pretty (renkli, okunabilir)
 * - Production: raw JSON (log toplama araçları için ideal)
 *
 * Kullanım:
 *   import { logger } from './utils/logger';
 *   logger.info({ userId, action }, 'user logged in');
 *   logger.error({ err }, 'database query failed');
 */
export const logger = pino({
    level: isDev ? 'debug' : 'info',
    transport: isDev
        ? {
              target: 'pino-pretty',
              options: {
                  colorize: true,
                  translateTime: 'SYS:HH:MM:ss.l',
                  ignore: 'pid,hostname',
              },
          }
        : undefined,
});
