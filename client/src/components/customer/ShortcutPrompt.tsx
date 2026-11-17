import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Button } from '../ui';
import {
  applyCompanyManifest,
  getShortcutPromptState,
  hasSaloonAppInstalled,
  isIosDevice,
  isStandaloneDisplay,
  markSaloonAppInstalled,
  setShortcutPromptState,
} from '../../lib/pinnedCompany';
import { addScannedCompanyId, getScannedCompanyIds } from '../../lib/scannedCompanies';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredInstall: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstall = e as BeforeInstallPromptEvent;
  });
}

type Step = 'ask' | 'ios' | 'android-help' | 'confirm-add' | 'added';

type Props = {
  companyId: number;
  companyName: string;
  themeColor?: string;
  /** true: QR / ana ekran akışında göster */
  enabled?: boolean;
  /** QR’da install=1: daha önce “hayır” dese bile kapıyı yeniden aç */
  force?: boolean;
};

/**
 * QR → uygulama kapısı.
 * İlk kez: ana ekrana ekle.
 * Uygulama zaten varsa: “Bu firmayı ekle” → listeye eklendi.
 */
export function ShortcutPrompt({ companyId, companyName, themeColor, enabled = true, force = false }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('ask');
  const [busy, setBusy] = useState(false);
  const [canNativeInstall, setCanNativeInstall] = useState(!!deferredInstall);
  const [wasNew, setWasNew] = useState(true);
  const [firmCount, setFirmCount] = useState(() => getScannedCompanyIds().length);

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      deferredInstall = e as BeforeInstallPromptEvent;
      setCanNativeInstall(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  useEffect(() => {
    if (!enabled || !companyId) return;

    applyCompanyManifest({ companyId, name: companyName, themeColor });
    const already = getScannedCompanyIds().includes(companyId);
    setWasNew(!already);
    setFirmCount(getScannedCompanyIds().length);

    const inApp = isStandaloneDisplay() || Capacitor.isNativePlatform();

    // Uygulama kurulu / ana ekranda → “Bu firmayı ekle” (otomatik ekleme yok)
    if (inApp || hasSaloonAppInstalled()) {
      setStep(already ? 'added' : 'confirm-add');
      setOpen(true);
      return;
    }

    const prev = getShortcutPromptState(companyId);
    if (prev === 'dismissed' && !force) {
      setOpen(false);
      return;
    }
    if (force && prev === 'dismissed') {
      setShortcutPromptState(companyId, 'pending');
    }

    // İlk kurulum: bu firmayı şimdiden listeye al
    addScannedCompanyId(companyId);
    setFirmCount(getScannedCompanyIds().length);
    setStep(isIosDevice() ? 'ios' : 'ask');
    const t = window.setTimeout(() => setOpen(true), 200);
    return () => window.clearTimeout(t);
  }, [companyId, companyName, themeColor, enabled, force]);

  if (!enabled || !open) return null;

  const continueToSite = () => {
    addScannedCompanyId(companyId);
    setShortcutPromptState(companyId, 'dismissed');
    setOpen(false);
  };

  const markInstalled = () => {
    addScannedCompanyId(companyId);
    markSaloonAppInstalled();
    setShortcutPromptState(companyId, 'accepted');
    setOpen(false);
  };

  const goPicker = () => {
    setShortcutPromptState(companyId, 'accepted');
    setOpen(false);
    navigate('/app', { replace: true });
  };

  const stayHere = () => {
    setShortcutPromptState(companyId, 'accepted');
    setOpen(false);
  };

  const confirmAddFirm = () => {
    addScannedCompanyId(companyId);
    setWasNew(true);
    setFirmCount(getScannedCompanyIds().length);
    setShortcutPromptState(companyId, 'accepted');
    setStep('added');
  };

  const accept = async () => {
    setBusy(true);
    addScannedCompanyId(companyId);
    applyCompanyManifest({ companyId, name: companyName, themeColor });

    try {
      if (deferredInstall) {
        await deferredInstall.prompt();
        const choice = await deferredInstall.userChoice;
        deferredInstall = null;
        setCanNativeInstall(false);
        if (choice.outcome === 'accepted') {
          markSaloonAppInstalled();
          markInstalled();
          setBusy(false);
          return;
        }
      }
    } catch {
      /* kullanıcı kapattı */
    }

    if (isIosDevice()) {
      setStep('ios');
      setBusy(false);
      return;
    }

    setStep('android-help');
    setBusy(false);
  };

  const accent = themeColor || '#4f46e5';

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accent} 0%, transparent 55%)`,
        }}
      />
      <div className="relative flex flex-1 flex-col px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="mb-8 flex justify-center">
            <img
              src="./app-icon.png"
              alt=""
              className="h-24 w-24 rounded-[1.75rem] shadow-2xl shadow-black/40 ring-2 ring-white/20"
            />
          </div>
          <p className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/50">
            Saloon uygulaması
          </p>
          <h1 className="mt-3 text-center text-2xl font-black leading-tight tracking-tight">
            {companyName}
          </h1>

          {step === 'confirm-add' && (
            <div className="mt-8 space-y-4">
              <p className="text-center text-sm font-semibold leading-relaxed text-white/75">
                Bu işletmeyi Saloon listenize ekleyin. Ana ekrandaki uygulamadan hepsine
                ulaşabilirsiniz.
              </p>
              <p className="text-center text-xs font-bold text-white/45">
                Şu an listede {firmCount} işletme
              </p>
              <div className="space-y-3 pt-2">
                <Button
                  block
                  size="lg"
                  onClick={confirmAddFirm}
                  className="!min-h-14 !rounded-2xl !bg-white !text-slate-950 !font-black"
                >
                  Bu firmayı ekle
                </Button>
                <button
                  type="button"
                  onClick={stayHere}
                  className="w-full py-3 text-sm font-bold text-white/55 hover:text-white/80"
                >
                  Eklemeden devam et
                </button>
              </div>
            </div>
          )}

          {step === 'added' && (
            <div className="mt-8 space-y-4">
              <p className="text-center text-sm font-semibold leading-relaxed text-white/75">
                {wasNew ? 'Firma listesine eklendi.' : 'Bu işletme zaten listenizde.'}
              </p>
              <p className="text-center text-xs font-bold text-white/45">
                Listenizde {firmCount} işletme
              </p>
              <div className="space-y-3 pt-2">
                <Button
                  block
                  size="lg"
                  onClick={goPicker}
                  className="!min-h-14 !rounded-2xl !bg-white !text-slate-950 !font-black !inline-flex !items-center !justify-center gap-2"
                >
                  <span aria-hidden className="text-xl leading-none">
                    ↑
                  </span>
                  İşletmelerim
                </Button>
                <button
                  type="button"
                  onClick={stayHere}
                  className="w-full py-3 text-sm font-bold text-white/55 hover:text-white/80"
                >
                  Bu firmada kal
                </button>
              </div>
            </div>
          )}

          {step === 'ask' && (
            <>
              <p className="mt-3 text-center text-sm font-semibold leading-relaxed text-white/70">
                QR okutuldu. Tarayıcı sekmesi yerine ana ekrandan uygulama gibi açılsın — birden fazla
                işletmeyi aynı uygulamada tutabilirsiniz.
              </p>
              <div className="mt-10 space-y-3">
                <Button
                  block
                  size="lg"
                  disabled={busy}
                  onClick={() => void accept()}
                  className="!min-h-14 !rounded-2xl !bg-white !text-slate-950 !font-black"
                >
                  {busy
                    ? 'Hazırlanıyor…'
                    : canNativeInstall
                      ? 'Uygulamayı ana ekrana ekle'
                      : 'Ana ekrana ekle'}
                </Button>
                <button
                  type="button"
                  onClick={continueToSite}
                  className="w-full py-3 text-sm font-bold text-white/55 hover:text-white/80"
                >
                  Şimdilik tarayıcıda devam et
                </button>
              </div>
            </>
          )}

          {step === 'ios' && (
            <div className="mt-8 space-y-4 rounded-3xl bg-white/10 p-5 ring-1 ring-white/15">
              <p className="text-sm font-black text-white">iPhone — 3 adım</p>
              <ol className="space-y-3 text-sm font-semibold text-white/80">
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-slate-900">
                    1
                  </span>
                  <span>
                    Alttaki <strong className="text-white">Paylaş</strong> (kare + ok) düğmesine
                    dokunun
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-slate-900">
                    2
                  </span>
                  <span>
                    <strong className="text-white">Ana Ekrana Ekle</strong> seçin
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-slate-900">
                    3
                  </span>
                  <span>
                    <strong className="text-white">Ekle</strong> — sonraki QR’lar aynı uygulamaya
                    eklenir; açılışta firma seçersiniz
                  </span>
                </li>
              </ol>
              <p className="text-xs font-semibold text-amber-200/90">
                Not: Safari dışında bu seçenek çıkmayabilir. “Safari’de Aç” deyin.
              </p>
              <div className="grid grid-cols-1 gap-2 pt-2">
                <Button
                  block
                  size="lg"
                  onClick={markInstalled}
                  className="!rounded-2xl !bg-white !text-slate-950 !font-black"
                >
                  Ana ekrana ekledim
                </Button>
                <button
                  type="button"
                  onClick={continueToSite}
                  className="w-full py-3 text-sm font-bold text-white/55"
                >
                  Şimdilik devam et
                </button>
              </div>
            </div>
          )}

          {step === 'android-help' && (
            <div className="mt-8 space-y-4 rounded-3xl bg-white/10 p-5 ring-1 ring-white/15">
              <p className="text-sm font-black text-white">Android — ana ekrana ekle</p>
              <ol className="space-y-3 text-sm font-semibold text-white/80">
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-slate-900">
                    1
                  </span>
                  <span>
                    Sağ üst <strong className="text-white">⋮</strong> menüyü açın
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-slate-900">
                    2
                  </span>
                  <span>
                    <strong className="text-white">Ana ekrana ekle</strong> /{' '}
                    <strong className="text-white">Uygulamayı yükle</strong>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-slate-900">
                    3
                  </span>
                  <span>Onaylayın — sonraki işletmeler aynı uygulamaya eklenir</span>
                </li>
              </ol>
              <div className="grid grid-cols-1 gap-2 pt-2">
                {canNativeInstall && (
                  <Button
                    block
                    size="lg"
                    disabled={busy}
                    onClick={() => void accept()}
                    className="!rounded-2xl !bg-white !text-slate-950 !font-black"
                  >
                    Tekrar dene
                  </Button>
                )}
                <Button
                  block
                  size="lg"
                  onClick={markInstalled}
                  className="!rounded-2xl !bg-white/20 !text-white !font-black"
                >
                  Ana ekrana ekledim
                </Button>
                <button
                  type="button"
                  onClick={continueToSite}
                  className="w-full py-3 text-sm font-bold text-white/55"
                >
                  Şimdilik devam et
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
