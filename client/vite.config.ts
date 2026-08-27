import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    base: './',
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true
            }
        }
    },
    build: {
        // Pages are lazy-loaded via React.lazy, each becomes its own chunk.
        // This config separates the rest into well-known vendor chunks so the
        // initial bundle stays small and cache-friendly across deploys.
        chunkSizeWarningLimit: 1500,  // 1.5 MB uyarı eşiği (eski: 500 KB)
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': [
                        'react',
                        'react-dom',
                        'react-router-dom',
                        'react-hook-form',
                        '@hookform/resolvers'
                    ],
                    'capacitor': [
                        '@capacitor/core',
                        '@capacitor/app',
                        '@capacitor/camera',
                        '@capacitor/device',
                        '@capacitor/geolocation',
                        '@capacitor/push-notifications'
                    ],
                    'firebase-vendor': [
                        'firebase/app',
                        'firebase/messaging'
                    ],
                    'maps-vendor': [
                        'leaflet',
                        'react-leaflet',
                        '@react-leaflet/core'
                    ]
                }
            }
        }
    }
})
