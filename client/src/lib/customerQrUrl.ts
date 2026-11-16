/**
 * Müşteri QR hedefi.
 * Hash (#/firma/…) birçok telefon kamerasında “metin” sayılır ve tarayıcı açılmaz.
 * Query (?c=5) standart URL olduğu için kamera doğrudan siteyi açar.
 */
export function companyQrUrl(companyId: number, origin = typeof window !== 'undefined' ? window.location.origin : ''): string {
  const id = Number(companyId);
  if (!Number.isFinite(id) || id <= 0) return origin || '';
  const base = (origin || '').replace(/\/$/, '');
  return `${base}/?c=${id}&ref=qr&install=1`;
}

/** Kısa yol (sunucu /c/:id → ?c=) — basılı materyal için */
export function companyQrShortUrl(companyId: number, origin = typeof window !== 'undefined' ? window.location.origin : ''): string {
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
