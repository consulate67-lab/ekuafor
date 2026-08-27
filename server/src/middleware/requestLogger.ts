import { Request, Response, NextFunction } from 'express';

/**
 * Her HTTP isteğini loglar: method, URL, status, süre (ms).
 * Dev ortamında console.log, prod'da pino'ya geçilecek (Aşama 3).
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[REQ] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${duration}ms`);
    });
    next();
};