/**
 * Vitest global setup — client test ortamı.
 *
 * - jest-dom matchers (toBeInTheDocument, vs.)
 * - MSW server (API mock'ları)
 */
import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// === MSW: API mock'ları ===
// Production'da baseURL, test'te sabit
const API_BASE = 'http://localhost:3001/api';

export const handlers = [
    // Sağlık kontrolü
    http.get(`${API_BASE}/ping`, () => HttpResponse.json({ status: 'pong' })),

    // Auth — gerçek route'lar ihtiyaç halinde eklenir
    http.post(`${API_BASE}/auth/login`, () =>
        HttpResponse.json({ success: true, data: { token: 'mock-token', user: { id: 1, email: 'test@example.com' } } })
    ),

    // Catch-all: default
    http.all('*', ({ request }) => {
        console.warn('[MSW] Unhandled request:', request.method, request.url);
        return HttpResponse.json({ success: false, error: 'Not mocked' }, { status: 501 });
    }),
];

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
