/**
 * Müşteri QR hedefi.
 *
 * Hash (#/firma/…) ve *.railway.app birçok telefonda “metin” kalır.
 * QR köprüsü: github.io/r.html?c=5 → canlı /?c=5 (kamera link açar).
 */
const APP_ORIGIN = 'https://web-production-db847.up.railway.app';
const QR_BRIDGE = 'https://consulate67-lab.github.io/ekuafor/r.html';

export function qrPublicOrigin(): string {
  const fromEnv =
    (typeof import.meta !== 'undefined' && (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_QR_URL) ||
    '';
  return (fromEnv || QR_BRIDGE).replace(/\/$/, '');
}

export function companyQrUrl(companyId: number): string {
  const id = Number(companyId);
  if (!Number.isFinite(id) || id <= 0) return '';
  const bridge = qrPublicOrigin();
  if (/r\.html$/i.test(bridge) || /\/r$/i.test(bridge)) {
    return `${bridge}?c=${id}`;
  }
  return `${bridge}/?c=${id}&ref=qr&install=1`;
}

/** Kısa yol (sunucu /c/:id → ?c=) — basılı materyal; .app host’ta kamera dostu değil */
export function companyQrShortUrl(companyId: number, origin = APP_ORIGIN): string {
  const id = Number(companyId);
  if (!Number.isFinite(id) || id <= 0) return origin || '';
  const base = (origin || '').replace(/\/$/, '');
  return `${base}/c/${id}`;
}

/** ?c= / ?firma= / eski hash QR → uygulama içi hash rotası */
export function consumeQrLandingParams(href = typeof window !== 'undefined' ? window.location.href : ''): string | null {
  try {
    const u = new URL(href);
    const fromQuery = u.searchParams.get('c') || u.searchParams.get('firma') || u.searchParams.get('company');
    const hashMatch = u.hash.match(/#\/(?:firma\/)?(\d+)/i);
    const id = fromQuery && /^\d+$/.test(fromQuery) ? fromQuery : hashMatch?.[1] || null;
    if (!id) return null;

    // Zaten doğru hash’teyse dokunma
    if (u.hash.startsWith(`#/firma/${id}`) && !fromQuery) return null;

    const ref = u.searchParams.get('ref') || 'qr';
    const install = u.searchParams.get('install') === '1' || ref === 'qr' ? '&install=1' : '';
    return `${u.origin}${u.pathname}#/firma/${id}?ref=${encodeURIComponent(ref)}${install}`;
  } catch {
    return null;
  }
}
