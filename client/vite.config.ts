import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    base: './',
    resolve: {
        alias: {
            '@shared': path.resolve(__dirname, '../shared'),
        },
    },
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
        chunkSizeWarningLimit: 1500,
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
                        '@capacitor/geolocation'
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
