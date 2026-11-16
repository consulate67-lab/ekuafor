/**
 * Müşteri web uygulaması (QR hedefi).
 * www.saloncebinde.com şu an 89.19.30.85’e gidiyor ve SSL kırık —
 * canlı site Railway’de: web-production-db847.up.railway.app
 * Domain düzelince VITE_WEB_URL=https://www.saloncebinde.com verin.
 */
const DEFAULT_WEB = 'https://web-production-db847.up.railway.app';

export function webAppOrigin(): string {
  return (import.meta.env.VITE_WEB_URL || DEFAULT_WEB).replace(/\/$/, '');
}

/**
 * Firma QR hedefi — query (?c=) kullanır.
 * Hash (#/firma/…) birçok kamerada tıklanmayan düz metin olur.
 */
export function companyPublicUrl(companyId: number): string {
  return `${webAppOrigin()}/?c=${companyId}&ref=qr&install=1`;
}

/** Web sitesi alanında gösterilen adres (tıklanabilir tam URL) */
export function companyWebsiteDisplay(companyId: number): string {
  return companyPublicUrl(companyId);
}

export function qrImageUrl(data: string, size = 400): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}
