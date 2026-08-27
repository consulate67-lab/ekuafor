import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler. Tüm route'lardan fırlayan hatalar burada yakalanır.
 * - Headers gönderilmemişse JSON 500 response yazar
 * - Headers gönderilmişse next(err) ile Express'in default davranışına bırakır
 * - Stack trace sadece development'ta gösterilir
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('------------------------------------------------');
    console.error(`[Global Error Handler] Error at ${req.method} ${req.originalUrl}`);
    console.error('Message:', err.message);
    if (err.stack) console.error('Stack:', err.stack);
    if (err.response) console.error('Axios/Ext Response:', err.response.data);
    console.error('------------------------------------------------');

    if (res.headersSent) {
        return next(err);
    }

    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: err.message || 'Sunucu hatası',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};