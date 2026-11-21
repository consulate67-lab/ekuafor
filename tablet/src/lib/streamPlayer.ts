import Hls from 'hls.js';
import { Capacitor } from '@capacitor/core';
import { isHlsUrl } from './idleMedia';
import { proxiedStreamUrl } from './mediaProxy';

export type StreamHandle = {
  destroy: () => void;
};

/** Dev (Vite) / preview: HLS’i aynı origin proxy’den çek — CORS engelini aşar */
function playableUrl(url: string): string {
  const clean = url.trim();
  if (!clean || !isHlsUrl(clean)) return clean;
  try {
    if (Capacitor.isNativePlatform()) return clean;
  } catch {
    /* web */
  }
  return proxiedStreamUrl(clean);
}

/**
 * HLS (TRT radyo dahil) için video elementi daha güvenilir;
 * progressive MP3/Icecast için audio yeterli.
 */
export function attachStream(
  el: HTMLMediaElement,
  url: string,
  onError: (msg: string) => void,
  onPlaying?: () => void,
): StreamHandle {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    onError('Akış adresi boş');
    return { destroy: () => undefined };
  }

  const src = playableUrl(cleanUrl);
  let destroyed = false;
  let networkFails = 0;
  const safeError = (msg: string) => {
    if (!destroyed) onError(msg);
  };

  const onMediaError = () => {
    const code = el.error?.code;
    safeError(
      code === 2
        ? 'Ağ hatası — internet bağlantısını kontrol edin'
        : code === 4
          ? 'Bu yayın bu cihazda açılamadı'
          : 'Yayın açılmadı',
    );
  };

  const onPlayingEvt = () => {
    networkFails = 0;
    if (!destroyed) onPlaying?.();
  };

  el.addEventListener('error', onMediaError);
  el.addEventListener('playing', onPlayingEvt);
  el.muted = false;
  el.volume = 1;

  const cleanupEl = () => {
    el.removeEventListener('error', onMediaError);
    el.removeEventListener('playing', onPlayingEvt);
    try {
      el.pause();
    } catch {
      /* ignore */
    }
    el.removeAttribute('src');
    el.removeAttribute('srcObject');
  };

  if (isHlsUrl(cleanUrl)) {
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 40,
        fragLoadingMaxRetry: 4,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        xhrSetup(xhr) {
          xhr.withCredentials = false;
        },
      });
      hls.loadSource(src);
      hls.attachMedia(el);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (destroyed) return;
        void el.play().catch(err => {
          safeError(
            err?.name === 'NotAllowedError'
              ? 'Tarayıcı sesi engelledi — Çal’a tekrar basın'
              : err?.message || 'Oynatma başlatılamadı',
          );
        });
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (destroyed || !data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          networkFails += 1;
          try {
            hls.startLoad();
          } catch {
            /* ignore */
          }
          if (networkFails >= 3) {
            safeError('Yayına ulaşılamadı — kanal geçici kapalı olabilir');
          }
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          try {
            hls.recoverMediaError();
          } catch {
            safeError('Yayın medya hatası');
          }
          return;
        }
        safeError('Yayın hatası');
      });
      return {
        destroy: () => {
          destroyed = true;
          cleanupEl();
          try {
            hls.destroy();
          } catch {
            /* ignore */
          }
        },
      };
    }

    if (el.canPlayType('application/vnd.apple.mpegurl')) {
      el.src = src;
      void el.play().catch(err => safeError(err?.message || 'Oynatma başlatılamadı'));
      return {
        destroy: () => {
          destroyed = true;
          cleanupEl();
        },
      };
    }

    safeError('Bu cihazda HLS (m3u8) desteklenmiyor');
    return {
      destroy: () => {
        destroyed = true;
        cleanupEl();
      },
    };
  }

  el.src = cleanUrl;
  void el.play().catch(err => {
    safeError(
      err?.name === 'NotAllowedError'
        ? 'Tarayıcı sesi engelledi — Çal’a tekrar basın'
        : err?.message || 'Oynatma başlatılamadı',
    );
  });

  return {
    destroy: () => {
      destroyed = true;
      cleanupEl();
    },
  };
}
