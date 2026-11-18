import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@shared': path.resolve(rootDir, '../shared'),
    },
  },
  server: {
    port: 5180,
    strictPort: true,
    fs: {
      allow: [rootDir, path.resolve(rootDir, '../shared')],
    },
  },
});
