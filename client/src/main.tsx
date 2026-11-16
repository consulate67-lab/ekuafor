import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { migrateStorageKeys } from './lib/storage'
import { consumeQrLandingParams } from './lib/customerQrUrl'
import './index.css'

migrateStorageKeys()

/** QR ?c=5 → #/firma/5 (kamera hash’i metin sanmasın diye query kullanıyoruz) */
const qrTarget = consumeQrLandingParams()
if (qrTarget && qrTarget !== window.location.href) {
    window.location.replace(qrTarget)
} else {
    ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
    )
}
