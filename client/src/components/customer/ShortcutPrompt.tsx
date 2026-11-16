import { useEffect, useState } from 'react';
import { Button, Sheet } from '../ui';
import {
  applyCompanyManifest,
  getShortcutPromptState,
  isIosDevice,
  isStandaloneDisplay,
  setShortcutPromptState,
} from '../../lib/pinnedCompany';
import { addScannedCompanyId } from '../../lib/scannedCompanies';

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

type Props = {
  companyId: number;
  companyName: string;
  themeColor?: string;
  /** true: sayfa açılışında sor */
  enabled?: boolean;
};

export function ShortcutPrompt({ companyId, companyName, themeColor, enabled = true }: Props) {
  const [open, setOpen] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled || !companyId) return;
    addScannedCompanyId(companyId);
    applyCompanyManifest({ companyId, name: companyName, themeColor });

    if (isStandaloneDisplay()) {
      setShortcutPromptState(companyId, 'accepted');
      return;
    }
    if (getShortcutPromptState(companyId) !== 'pending') return;

    const t = window.setTimeout(() => setOpen(true), 900);
    return () => window.clearTimeout(t);
  }, [companyId, companyName, themeColor, enabled]);

  const dismiss = () => {
    setShortcutPromptState(companyId, 'dismissed');
    setOpen(false);
    setIosHelp(false);
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
        if (choice.outcome === 'accepted') {
          setShortcutPromptState(companyId, 'accepted');
          setOpen(false);
          setBusy(false);
          return;
        }
      }
    } catch {
      /* native prompt kapandı */
    }

    if (isIosDevice()) {
      setIosHelp(true);
      setBusy(false);
      return;
    }

    // Android / masaüstü: talimat + pin
    setShortcutPromptState(companyId, 'accepted');
    setIosHelp(true);
    setBusy(false);
  };

  return (
    <Sheet open={open} onClose={dismiss} title="Ana ekrana ekle">
      {!iosHelp ? (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-600 leading-relaxed">
            <strong className="text-slate-900">{companyName}</strong> uygulamasını telefonunuzun ana
            ekranına eklemek ister misiniz? Açıldığında QR okuttuğunuz işletmeler listelenir; tıklayınca
            web sayfasından randevu alırsınız.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button block variant="secondary" onClick={dismiss}>
              Hayır
            </Button>
            <Button block size="lg" disabled={busy} onClick={() => void accept()}>
              {busy ? 'Hazırlanıyor…' : 'Evet, ekle'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-600 leading-relaxed">
            {isIosDevice() ? (
              <>
                Safari’de alt menüden <strong>Paylaş</strong> → <strong>Ana Ekrana Ekle</strong> seçin.
                Uygulama açılınca işletmeleriniz listelenir.
              </>
            ) : (
              <>
                Tarayıcı menüsünden <strong>Ana ekrana ekle</strong> / <strong>Uygulamayı yükle</strong> seçin.
                Uygulama açılınca QR okuttuğunuz işletmeler listelenir.
              </>
            )}
          </p>
          <Button
            block
            size="lg"
            onClick={() => {
              setShortcutPromptState(companyId, 'accepted');
              setOpen(false);
              setIosHelp(false);
            }}
          >
            Tamam
          </Button>
        </div>
      )}
    </Sheet>
  );
}
