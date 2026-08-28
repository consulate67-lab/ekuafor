import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../middleware/errorHandler';

/**
 * errorHandler.test.ts — global error middleware unit testleri.
 *
 * Hataları yakalayıp JSON response'a çevirmesi, headers gönderilmişse next()'e
 * delege etmesi, stack trace'in sadece development'ta gösterilmesi.
 */

function makeRes(headersSent = false): Response {
    const res: any = {
        headersSent,
        statusCode: 200,
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    };
    return res as Response;
}

function makeReq(): Request {
    return {
        method: 'GET',
        originalUrl: '/api/test',
    } as Request;
}

describe('errorHandler', () => {
    it('responds with 500 + error message', () => {
        const err = new Error('something failed');
        const req = makeReq();
        const res = makeRes(false);
        const next = vi.fn() as NextFunction;

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: 'Internal Server Error',
                message: 'something failed',
            })
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('delegates to next() when headers already sent', () => {
        const err = new Error('late error');
        const req = makeReq();
        const res = makeRes(true);
        const next = vi.fn() as NextFunction;

        errorHandler(err, req, res, next);

        expect(next).toHaveBeenCalledWith(err);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });

    it('shows stack trace in development', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        const err = new Error('debug me');
        const req = makeReq();
        const res = makeRes(false);
        const next = vi.fn() as NextFunction;

        errorHandler(err, req, res, next);

        const jsonCall = (res.json as any).mock.calls[0][0];
        expect(jsonCall.stack).toBeDefined();
        expect(jsonCall.stack).toContain('debug me');

        process.env.NODE_ENV = originalEnv;
    });

    it('hides stack trace in production', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        const err = new Error('no leak');
        const req = makeReq();
        const res = makeRes(false);
        const next = vi.fn() as NextFunction;

        errorHandler(err, req, res, next);

        const jsonCall = (res.json as any).mock.calls[0][0];
        expect(jsonCall.stack).toBeUndefined();

        process.env.NODE_ENV = originalEnv;
    });

    it('handles error with no message', () => {
        const err: any = new Error();
        err.message = undefined;
        const req = makeReq();
        const res = makeRes(false);
        const next = vi.fn() as NextFunction;

        errorHandler(err, req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: 'Sunucu hatası', // fallback
            })
        );
    });
});
