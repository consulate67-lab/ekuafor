import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { migrateStorageKeys } from './lib/storage'
import { consumeQrLandingParams } from './lib/customerQrUrl'
import { addScannedCompanyId } from './lib/scannedCompanies'
import './index.css'

migrateStorageKeys()

const SESSION_READY = 'saloon_pwa_session_v1'

/**
 * Açılış URL’sini düzelt — asla location.replace ile sayfayı kesme.
 * (Hash-only replace React’i mount etmeden boş ekran bırakıyordu.)
 */
function prepareLaunch() {
  try {
    const qrTarget = consumeQrLandingParams()
    if (qrTarget && qrTarget !== window.location.href) {
      const u = new URL(qrTarget)
      window.history.replaceState(null, '', `${u.pathname}${u.search}${u.hash}`)
    }

    const nav = window.navigator as Navigator & { standalone?: boolean }
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || !!nav.standalone
    if (!standalone) return

    const hash = window.location.hash || ''
    const m = hash.match(/^#\/firma\/(\d+)/i)
    if (!m) {
      sessionStorage.setItem(SESSION_READY, '1')
      return
    }

    // Aynı oturumda firma sayfasındayken yenileme — kal
    if (sessionStorage.getItem(SESSION_READY) === '1') return

    sessionStorage.setItem(SESSION_READY, '1')
    addScannedCompanyId(Number(m[1]))
    const base = `${window.location.pathname}${window.location.search}`
    window.history.replaceState(null, '', `${base}#/app`)
  } catch {
    /* ignore */
  }
}

prepareLaunch()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
