import { describe, it, expect, beforeEach } from 'vitest';

/**
 * api.test.ts — Axios instance, baseURL, request/response interceptor'ları.
 *
 * Not: api.ts import edildiğinde axios.create + interceptor use'lar bir kez
 * çalışır. Her test'te interceptor'ları doğrulamak için axios.interceptors
 * listesini kontrol ediyoruz.
 *
 * import.meta.env Vite-specific — vitest'te varsayılan değerler kullanılır.
 */

describe('api client', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('creates an axios instance with default baseURL', async () => {
        const apiModule = await import('../../lib/api');
        const api = apiModule.default;

        // Default baseURL dev'te (VITE_API_URL yok, isProduction false)
        expect(api.defaults.baseURL).toMatch(/\/api$/);
    });

    it('sets Content-Type: application/json header', async () => {
        const { default: api } = await import('../../lib/api');
        expect(api.defaults.headers['Content-Type']).toBe('application/json');
    });

    it('sets 30 second timeout', async () => {
        const { default: api } = await import('../../lib/api');
        expect(api.defaults.timeout).toBe(30000);
    });

    describe('request interceptor', () => {
        it('adds Authorization header when token exists in localStorage', async () => {
            localStorage.setItem('token', 'test-jwt-123');
            const { default: api } = await import('../../lib/api');

            const config: any = { headers: {} };
            // İlk request interceptor'ı çağır
            const handlers = (api.interceptors.request as any).handlers;
            const onFulfilled = handlers[0].fulfilled;
            const result = onFulfilled(config);

            expect(result.headers.Authorization).toBe('Bearer test-jwt-123');
        });

        it('does NOT add Authorization header when no token', async () => {
            const { default: api } = await import('../../lib/api');

            const config: any = { headers: {} };
            const handlers = (api.interceptors.request as any).handlers;
            const onFulfilled = handlers[0].fulfilled;
            const result = onFulfilled(config);

            expect(result.headers.Authorization).toBeUndefined();
        });
    });

    describe('response interceptor', () => {
        it('removes token from localStorage on 401', async () => {
            localStorage.setItem('token', 'expired-token');
            localStorage.setItem('user_data', JSON.stringify({ id: 1 }));
            const { default: api } = await import('../../lib/api');

            const handlers = (api.interceptors.response as any).handlers;
            const onRejected = handlers[0].rejected;
            const error = { response: { status: 401 } };

            await expect(onRejected(error)).rejects.toEqual(error);
            expect(localStorage.getItem('token')).toBeNull();
            expect(localStorage.getItem('user_data')).toBeNull();
        });

        it('passes through non-401 errors without clearing localStorage', async () => {
            localStorage.setItem('token', 'valid-token');
            const { default: api } = await import('../../lib/api');

            const handlers = (api.interceptors.response as any).handlers;
            const onRejected = handlers[0].rejected;
            const error = { response: { status: 500 } };

            await expect(onRejected(error)).rejects.toEqual(error);
            expect(localStorage.getItem('token')).toBe('valid-token');
        });
    });
});
