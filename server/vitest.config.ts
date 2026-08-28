import { defineConfig } from 'vitest/config';

/**
 * Vitest konfigürasyonu — server.
 *
 * - globals: describe/it/expect global olarak kullanılabilir
 * - environment: node (server-side)
 * - setupFiles: test başlamadan önce çalışır (env ayarları, mock'lar)
 * - coverage: v8 provider, dist/ + node_modules + test dosyaları exclude
 *
 * Komutlar:
 *   npm test            → vitest run (CI için, bir kez çalışır)
 *   npm run test:watch  → vitest (development, watch mode)
 *   npm run test:cov    → vitest run --coverage
 */
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./src/__tests__/setup.ts'],
        include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            reportsDirectory: './coverage',
            exclude: [
                'node_modules/',
                'dist/',
                'drizzle/',
                'coverage/',
                '**/*.d.ts',
                '**/*.test.ts',
                '**/*.spec.ts',
                'src/__tests__/**',
            ],
        },
        testTimeout: 10000,
    },
});
