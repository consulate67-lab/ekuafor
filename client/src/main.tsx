import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { migrateStorageKeys } from './lib/storage'
import { consumeQrLandingParams } from './lib/customerQrUrl'
import { addScannedCompanyId } from './lib/scannedCompanies'
import './index.css'

migrateStorageKeys()

const SESSION_READY = 'saloon_pwa_session_v1'

/** Ana ekran ikonu çoğu zaman kurulumdaki #/firma/X adresini açar — seçim ekranına al. */
function redirectStandaloneLaunchToPicker(): boolean {
  try {
    const nav = window.navigator as Navigator & { standalone?: boolean }
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || !!nav.standalone
    if (!standalone) return false

    const hash = window.location.hash || ''
    const m = hash.match(/^#\/firma\/(\d+)/i)
    if (!m) {
      sessionStorage.setItem(SESSION_READY, '1')
      return false
    }

    // Aynı oturumda firma sayfasındayken yenileme — kal
    if (sessionStorage.getItem(SESSION_READY) === '1') return false

    sessionStorage.setItem(SESSION_READY, '1')
    addScannedCompanyId(Number(m[1]))
    const base = `${window.location.pathname}${window.location.search}`
    window.location.replace(`${base}#/app`)
    return true
  } catch {
    return false
  }
}

/** QR ?c=5 → #/firma/5 (kamera hash’i metin sanmasın diye query kullanıyoruz) */
const qrTarget = consumeQrLandingParams()
if (qrTarget && qrTarget !== window.location.href) {
  window.location.replace(qrTarget)
} else if (!redirectStandaloneLaunchToPicker()) {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
