type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

const ERROR_TR: Record<string, string> = {
  network:
    'Google ses servisine bağlanılamadı. Google Chrome kullanın (Cursor tarayıcısı çalışmaz) ve internet açık olsun. Tablette klavye mikrofonunu da kullanabilirsiniz.',
  'not-allowed': 'Mikrofon izni verilmedi. Adres çubuğundaki kilit ikonundan mikrofona izin verin.',
  'service-not-allowed': 'Ses tanıma bu ortamda kapalı. Google Chrome’da açın.',
  'audio-capture': 'Mikrofon bulunamadı veya başka uygulama kullanıyor.',
  'no-speech': 'Ses algılanmadı. Tekrar Ses’e basın veya adı yazın.',
  aborted: 'Dinleme iptal edildi.',
  'language-not-supported': 'Türkçe ses tanıma desteklenmiyor. Chrome deneyin.',
};

export function speechSupported(): boolean {
  const w = window as SpeechWindow;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/** Cursor / Electron gömülü tarayıcıda Google STT genelde network hatası verir */
export function isEmbeddedBrowser(): boolean {
  const ua = navigator.userAgent;
  return /Electron/i.test(ua) || /Cursor/i.test(ua);
}

export function speechErrorMessage(codeOrMessage: string): string {
  const key = codeOrMessage.trim().toLowerCase();
  if (ERROR_TR[key]) return ERROR_TR[key];
  for (const [k, v] of Object.entries(ERROR_TR)) {
    if (key.includes(k)) return v;
  }
  return codeOrMessage || 'Ses alınamadı';
}

async function ensureMicPermission(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) return;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach(t => t.stop());
}

/**
 * Google Web Speech (tr-TR). Chrome + internet gerekir.
 * Cursor içi tarayıcıda genellikle çalışmaz.
 */
export async function listenOnce(lang = 'tr-TR'): Promise<string> {
  if (isEmbeddedBrowser()) {
    throw new Error(
      'Bu pencere ses tanımayı desteklemiyor. http://localhost:5180 adresini Google Chrome’da açın.',
    );
  }

  try {
    await ensureMicPermission();
  } catch {
    throw new Error(speechErrorMessage('not-allowed'));
  }

  const w = window as SpeechWindow;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) {
    throw new Error('Bu tarayıcıda sesli giriş yok. Google Chrome kullanın.');
  }

  return new Promise((resolve, reject) => {
    const rec = new Ctor();
    let settled = false;
    let started = false;
    let best = '';

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      fn();
    };

    const timeoutId = window.setTimeout(() => {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      if (best.trim()) {
        finish(() => resolve(best.trim()));
      } else {
        finish(() => reject(new Error(speechErrorMessage('no-speech'))));
      }
    }, 10_000);

    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      started = true;
    };

    rec.onresult = ev => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
        const piece = ev.results[i]?.[0]?.transcript || '';
        if (ev.results[i].isFinal) {
          best = `${best} ${piece}`.trim();
        } else {
          interim += piece;
        }
      }
      if (!best && interim) best = interim.trim();
      if (best && ev.results[ev.results.length - 1]?.isFinal) {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
        finish(() => resolve(best.trim()));
      }
    };

    rec.onerror = ev => {
      const code = ev.error || 'Ses alınamadı';
      if (code === 'aborted' && settled) return;
      if (code === 'no-speech' && best.trim()) {
        finish(() => resolve(best.trim()));
        return;
      }
      finish(() => reject(new Error(speechErrorMessage(code))));
    };

    rec.onend = () => {
      if (best.trim()) {
        finish(() => resolve(best.trim()));
        return;
      }
      if (!started) {
        finish(() =>
          reject(
            new Error(
              'Mikrofon başlatılamadı. Google Chrome’da açıp mikrofona izin verin.',
            ),
          ),
        );
        return;
      }
      finish(() => reject(new Error(speechErrorMessage('no-speech'))));
    };

    try {
      rec.start();
    } catch (e) {
      finish(() =>
        reject(e instanceof Error ? e : new Error('Mikrofon açılamadı')),
      );
    }
  });
}
