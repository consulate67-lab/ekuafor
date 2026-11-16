/** Onay bekleyen web randevuları için cihaz uyarı sesi (Web Audio). */

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

/** Kısa çift bip — yeni talep / tekrar hatırlatma */
export async function playPendingAlert(): Promise<void> {
  const ac = audioCtx();
  if (!ac) return;
  try {
    if (ac.state === 'suspended') await ac.resume();
  } catch {
    /* kullanıcı etkileşimi yoksa sessiz kalır */
  }

  const beep = (at: number, freq: number, dur = 0.18) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.22, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  };

  const t0 = ac.currentTime + 0.02;
  beep(t0, 880);
  beep(t0 + 0.28, 1175);
  beep(t0 + 0.56, 880);
}

export const PENDING_REMINDER_MS = 15 * 60 * 1000;
