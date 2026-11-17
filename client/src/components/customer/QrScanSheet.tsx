import { useEffect, useRef, useState } from 'react';
import { extractCompanyIdFromAppUrl } from '../../lib/scannedCompanies';
import { Button, Sheet } from '../ui';

type JsQR = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  opts?: { inversionAttempts?: string },
) => { data: string } | null;

declare global {
  interface Window {
    jsQR?: JsQR;
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  onCompanyId: (id: number) => void;
};

/**
 * Yüklü Saloon uygulaması içinden QR okutma — firma doğrudan bu cihazın listesine eklenir.
 */
export function QrScanSheet({ open, onClose, onCompanyId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('Barkodu çerçeveye hizalayın');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError('');
    setHint('Barkodu çerçeveye hizalayın');

    const stop = () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      const v = videoRef.current;
      if (v) v.srcObject = null;
    };

    const tick = () => {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const jsQR = window.jsQR;
      if (video && canvas && jsQR && video.readyState >= 2) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w && h) {
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const image = ctx.getImageData(0, 0, w, h);
            const code = jsQR(image.data, w, h, { inversionAttempts: 'dontInvert' });
            if (code?.data) {
              const id = extractCompanyIdFromAppUrl(code.data.trim());
              if (id) {
                stop();
                onCompanyId(id);
                onClose();
                return;
              }
              setHint('Bu QR bir Saloon işletmesi değil');
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    (async () => {
      try {
        if (!window.jsQR) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('jsQR'));
            document.head.appendChild(s);
          });
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          setError('Bu cihazda kamera kullanılamıyor');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' } },
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) {
          setError(
            window.jsQR
              ? 'Kamera izni gerekli — ayarlardan izin verin'
              : 'QR okuyucu yüklenemedi — interneti kontrol edin',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [open, onClose, onCompanyId]);

  return (
    <Sheet open={open} onClose={onClose} title="QR okut">
      <p className="text-sm font-semibold text-slate-600 mb-3">
        Yeni işletmeyi bu uygulamaya eklemek için duvardaki veya masadaki QR’ı okutun.
      </p>
      {error ? (
        <div className="rounded-2xl bg-rose-50 px-4 py-6 text-center text-sm font-bold text-rose-700">
          {error}
          <Button className="mt-4" block onClick={onClose}>
            Kapat
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 aspect-[3/4]">
            <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-48 rounded-3xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            <p className="absolute bottom-4 inset-x-0 text-center text-xs font-bold text-white drop-shadow">
              {hint}
            </p>
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <Button block variant="secondary" onClick={onClose}>
            İptal
          </Button>
        </div>
      )}
    </Sheet>
  );
}
