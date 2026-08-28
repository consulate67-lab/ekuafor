import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Vitest konfigürasyonu — client.
 *
 * - environment: jsdom (DOM simülasyonu, React Testing Library için)
 * - setupFiles: @testing-library/jest-dom matchers + MSW server
 * - coverage: v8 provider
 *
 * Komutlar:
 *   npm test            → vitest run
 *   npm run test:watch  → vitest
 *   npm run test:cov    → vitest run --coverage
 */
export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/__tests__/setup.ts'],
        include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
        css: false,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            reportsDirectory: './coverage',
            exclude: [
                'node_modules/',
                'dist/',
                'coverage/',
                '**/*.d.ts',
                '**/*.test.{ts,tsx}',
                '**/*.spec.{ts,tsx}',
                'src/__tests__/**',
                'src/main.tsx',
                'src/vite-env.d.ts',
            ],
        },
        testTimeout: 10000,
    },
});
