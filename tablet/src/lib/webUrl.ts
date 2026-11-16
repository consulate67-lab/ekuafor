/**
 * Müşteri web / QR hedefi.
 *
 * Telefon kameraları (özellikle Xiaomi/MIUI) `*.railway.app` adresini
 * tıklanabilir link saymayıp düz metin gösteriyor (.app TLD).
 * QR için kameranın tanıdığı köprü: GitHub Pages (.io) → Railway.
 *
 * www.saloncebinde.com DNS’i Railway’e (CNAME → h1cy29co.up.railway.app)
 * bağlanınca VITE_WEB_URL / VITE_QR_URL ile .com’a geçin.
 */
const APP_ORIGIN = 'https://web-production-db847.up.railway.app';
/** Kamera dostu QR köprüsü (.io — metin değil link açılır) */
const QR_BRIDGE = 'https://consulate67-lab.github.io/ekuafor/r.html';

export function webAppOrigin(): string {
  return (import.meta.env.VITE_WEB_URL || APP_ORIGIN).replace(/\/$/, '');
}

/** QR barkoduna yazılan adres — kamera link olarak tanısın diye köprü */
export function qrLandingOrigin(): string {
  const custom = (import.meta.env.VITE_QR_URL || '').replace(/\/$/, '');
  if (custom) return custom;
  return QR_BRIDGE;
}

/**
 * Firma QR hedefi.
 * Köprü: …/r.html?c=5 → /c/5 → firma (kamera .app’i metin sanmasın)
 */
export function companyPublicUrl(companyId: number): string {
  const bridge = qrLandingOrigin();
  if (/r\.html$/i.test(bridge) || /\/r$/i.test(bridge)) {
    return `${bridge}?c=${companyId}`;
  }
  return `${bridge.replace(/\/$/, '')}/c/${companyId}`;
}

/** Web sitesi alanında gösterilen adres (tıklanabilir tam URL) */
export function companyWebsiteDisplay(companyId: number): string {
  return companyPublicUrl(companyId);
}

export function qrImageUrl(data: string, size = 400): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}
