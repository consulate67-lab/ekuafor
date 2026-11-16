import { useMemo, useState } from 'react';
import { IconBack } from '../components/Icons';
import { activateTabletKey } from '../lib/activation';
import { companyPublicUrl, qrImageUrl } from '../lib/webUrl';
import { useAppStore } from '../store/appStore';

export function QrPage() {
  const company = useAppStore(s => s.company);
  const deviceId = useAppStore(s => s.deviceId);
  const updateCompany = useAppStore(s => s.updateCompany);
  const retryFinalize = useAppStore(s => s.retryFinalize);
  const setScreen = useAppStore(s => s.setScreen);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [keyInput, setKeyInput] = useState(company?.activationKey || '');

  const url = useMemo(() => {
    const id = company?.serverCompanyId;
    return id ? companyPublicUrl(id) : '';
  }, [company?.serverCompanyId]);

  const hasKey = !!company?.activationKey?.trim();

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setMsg('Kopyalanamadı — URL’yi elle seçin');
    }
  };

  const bindKey = async () => {
    const raw = keyInput.trim().toUpperCase();
    if (!raw) {
      setMsg('Kurulum anahtarını girin');
      return;
    }
    if (!navigator.onLine) {
      setMsg('Anahtar için internet gerekli');
      return;
    }
    setBusy(true);
    setMsg('');
    const res = await activateTabletKey({ key: raw, deviceId });
    if (!res.ok) {
      setBusy(false);
      setMsg(res.message);
      return;
    }
    const key = res.key || raw;
    updateCompany({ activationKey: key });
    setKeyInput(key);
    const fin = await retryFinalize();
    setBusy(false);
    setMsg(fin);
  };

  const register = async () => {
    if (!company?.activationKey?.trim()) {
      setMsg('Önce kurulum anahtarını girin');
      return;
    }
    setBusy(true);
    setMsg(await retryFinalize());
    setBusy(false);
  };

  return (
    <div className="min-h-full bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <button type="button" title="Geri" aria-label="Geri" onClick={() => setScreen('settings')} className="btn btn-secondary btn-icon !min-h-12 !w-12">
          <IconBack />
        </button>
        <h1 className="mt-3 text-2xl font-black">QR · Web sayfası</h1>
        <p className="text-sm font-semibold text-slate-500">
          Müşteri kamerayla okutunca site açılır (iPhone’da üstteki sarı şeride dokunun). Safari’de
          Paylaş → Ana Ekrana Ekle ile uygulama gibi kalır.
        </p>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
        {!company?.serverCompanyId ? (
          <section className="space-y-4 rounded-3xl bg-amber-50 p-6 ring-1 ring-amber-100">
            <p className="font-black text-amber-900">Firma henüz merkeze kaydolmamış</p>
            <p className="text-sm font-semibold text-amber-800">
              QR için kurulum anahtarı + internet gerekir. Telegram botundan aldığınız anahtarı girin.
            </p>

            {!hasKey && (
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase text-amber-800">
                  Kurulum anahtarı
                  <input
                    value={keyInput}
                    onChange={e => setKeyInput(e.target.value.toUpperCase())}
                    placeholder="SLN-XXXX-XXXX"
                    className="mt-1 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3.5 font-bold tracking-wider"
                    autoCapitalize="characters"
                  />
                </label>
                <button type="button" disabled={busy} onClick={() => void bindKey()} className="btn btn-primary btn-block !min-h-12">
                  {busy ? 'Kaydediliyor…' : 'Anahtarı bağla ve kaydet'}
                </button>
              </div>
            )}

            {hasKey && (
              <>
                <p className="rounded-2xl bg-white px-3 py-2 font-mono text-xs font-bold text-slate-600">
                  Anahtar: {company?.activationKey}
                </p>
                <button type="button" disabled={busy} onClick={() => void register()} className="btn btn-primary btn-block !min-h-12">
                  {busy ? 'Kaydediliyor…' : 'Firmayı sisteme kaydet'}
                </button>
              </>
            )}

            {msg && <p className="text-sm font-bold text-slate-700">{msg}</p>}
          </section>
        ) : (
          <section className="space-y-5 rounded-3xl bg-white p-6 text-center shadow-sm">
            <p className="text-lg font-black">{company?.name}</p>
            <p className="text-xs font-bold text-slate-400">Firma id · {company?.serverCompanyId}</p>
            <div className="mx-auto w-full max-w-xs overflow-hidden rounded-3xl bg-white p-4 ring-1 ring-slate-100">
              <img src={qrImageUrl(url, 480)} alt="Firma QR kodu" className="mx-auto h-auto w-full" />
            </div>
            <p className="break-all px-2 font-mono text-xs font-semibold text-slate-500">{url}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" onClick={copy} className="btn btn-dark btn-block !min-h-12">
                {copied ? 'Kopyalandı' : 'URL kopyala'}
              </button>
              <a href={url} target="_blank" rel="noreferrer" className="btn btn-primary btn-block !min-h-12 !inline-flex !items-center !justify-center">
                Sayfayı aç
              </a>
            </div>
            {msg && <p className="text-sm font-bold text-slate-700">{msg}</p>}
          </section>
        )}
      </div>
    </div>
  );
}
