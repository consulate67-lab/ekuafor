import { isHlsUrl } from './idleMedia';

/** Vite /media-proxy — CORS’suz HLS için */
export function proxiedStreamUrl(absoluteUrl: string): string {
  const url = absoluteUrl.trim();
  if (!url) return url;
  // Progressive (mp3/aac) genelde CORS’lu; doğrudan çal
  if (!isHlsUrl(url)) return url;
  return `/media-proxy?url=${encodeURIComponent(url)}`;
}

export function resolveAgainst(baseUrl: string, ref: string): string {
  try {
    return new URL(ref, baseUrl).href;
  } catch {
    return ref;
  }
}

/** m3u8 satırlarındaki göreli / mutlak adresleri proxy’ye çevir */
export function rewriteM3u8(body: string, playlistUrl: string): string {
  return body
    .split(/\r?\n/)
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/gi, (_m, uri: string) => {
          const abs = resolveAgainst(playlistUrl, uri);
          return `URI="${proxiedStreamUrl(abs)}"`;
        });
      }

      const abs = resolveAgainst(playlistUrl, trimmed);
      return proxiedStreamUrl(abs);
    })
    .join('\n');
}
