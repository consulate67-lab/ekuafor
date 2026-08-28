import pinoHttp from 'pino-http';
import { logger } from '../utils/logger';
import { isDev } from '../config/env';

/**
 * HTTP request logger (pino-http).
 *
 * Her isteği structured JSON (prod) veya pretty (dev) olarak loglar.
 * Status code'a göre log seviyesi:
 *   - 5xx veya hata → error
 *   - 4xx → warn
 *   - 2xx/3xx → info
 *
 * Eski console.log tabanlı logger'ın yerini aldı (Aşama 3).
 */
export const requestLogger = pinoHttp({
    logger,
    customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
    },
    customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
        return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
    },
    serializers: {
        req: (req) => ({
            method: req.method,
            url: req.url,
            // user-agent, ip vs prod'da eklenebilir
        }),
        res: (res) => ({
            statusCode: res.statusCode,
        }),
    },
    // Development'ta request body'si loglanmaz, prod'da opsiyonel
    autoLogging: {
        ignore: (req) => {
            if (!isDev) return req.url === '/health' || req.url === '/api/health';
            return false;
        },
    },
});
