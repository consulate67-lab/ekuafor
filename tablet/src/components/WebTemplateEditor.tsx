import { useMemo, useState } from 'react';
import type { WebPageTemplate } from '@shared/webPageTemplates';
import type { WebPageProfile } from '../types';
import { compressImageFile } from '../lib/compressImage';
import { MiniPage } from './WebTemplatePreview';

type Props = {
  open: boolean;
  template: WebPageTemplate;
  companyName: string;
  draft: WebPageProfile;
  onChange: (patch: Partial<WebPageProfile>) => void;
  onClose: () => void;
};

/**
 * Seçili şablonun düzenleme ekranı — kapak, Salonumuz galerisi, slogan, hakkında, görünürlük.
 * Canlı mini önizleme solda/üstte güncellenir.
 */
export function WebTemplateEditor({ open, template, companyName, draft, onChange, onClose }: Props) {
  const [msg, setMsg] = useState('');
  const slots = useMemo(() => template.gallery.slice(0, 4), [template.gallery]);

  const gallerySrcs = useMemo(() => {
    return slots.map((slot, i) => {
      const custom = draft.gallery?.[i];
      return custom && custom.trim() ? custom : slot.src;
    });
  }, [slots, draft.gallery]);

  const tagline = (draft.tagline || '').trim() || template.tagline;
  const about = (draft.about || '').trim() || template.about;
  const dark = template.layout === 'dark-full' || template.theme.surface === '#111827';

  const setGallerySlot = (index: number, dataUrl: string | null) => {
    const next = [...(draft.gallery || [])];
    while (next.length < slots.length) next.push('');
    next[index] = dataUrl || '';
    onChange({ gallery: next });
  };

  const onFile = async (index: number, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMsg('Yalnızca görsel dosyası yükleyin');
      return;
    }
    try {
      const dataUrl = await compressImageFile(file);
      setGallerySlot(index, dataUrl);
      setMsg('');
    } catch {
      setMsg('Görsel yüklenemedi — başka bir foto deneyin');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-100">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 safe-top">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Şablon düzenle</p>
          <h2 className="truncate text-lg font-black text-slate-900">{template.name}</h2>
          <p className="truncate text-xs font-semibold text-slate-500">
            {template.styleName} · müşteri sayfasında böyle görünür
          </p>
        </div>
        <button type="button" onClick={onClose} className="btn btn-dark !min-h-11 shrink-0 px-5">
          Tamam
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-5xl gap-4 p-4 lg:grid-cols-2">
          {/* Canlı önizleme */}
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-slate-500">Canlı önizleme</p>
            <div className="overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-200">
              <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                <div
                  className="absolute inset-0 origin-top-left"
                  style={{ transform: 'scale(0.48)', width: '208%', height: '208%' }}
                  aria-hidden
                >
                  <MiniPage
                    layout={template.layout}
                    theme={template.theme}
                    hero={gallerySrcs[0]}
                    name={companyName.trim() || 'İşletmeniz'}
                    tagline={tagline}
                    ctaLabel={template.ctaLabel}
                    dark={dark}
                    thumbs={gallerySrcs.slice(1, 3)}
                  />
                </div>
              </div>
              <div className="space-y-2 border-t border-slate-100 p-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Hakkında (önizleme)</p>
                <p className="line-clamp-4 text-sm font-semibold leading-relaxed text-slate-600 whitespace-pre-wrap">
                  {about}
                </p>
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {gallerySrcs.map((src, i) => (
                    <div key={i} className="aspect-square overflow-hidden rounded-lg bg-slate-200">
                      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-bold text-slate-400">Salonumuz · 4 kare</p>
              </div>
            </div>
          </div>

          {/* Alanlar */}
          <div className="space-y-4">
            <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div>
                <p className="text-xs font-black uppercase text-slate-500">Üst kapak + Salonumuz</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  1. kare üst kapak (hero). 4 kare müşteri sayfasındaki <strong>Salonumuz</strong>{' '}
                  bölümüdür.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {slots.map((slot, index) => {
                  const custom = draft.gallery?.[index];
                  const preview = custom || slot.src;
                  return (
                    <label
                      key={index}
                      className="group relative flex aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200"
                    >
                      {preview ? (
                        <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-400">
                          Foto seç
                        </span>
                      )}
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-2 pt-6 text-[11px] font-black text-white">
                        {index === 0 ? 'Üst kapak' : `Salonumuz ${index + 1}`}
                        {custom ? ' · yüklendi' : ' · şablon'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={e => {
                          void onFile(index, e.target.files?.[0] || null);
                          e.target.value = '';
                        }}
                      />
                      {custom && (
                        <button
                          type="button"
                          className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white"
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            setGallerySlot(index, null);
                          }}
                        >
                          Kaldır
                        </button>
                      )}
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs font-black uppercase text-slate-500">Yazılar</p>
              <label className="block text-xs font-black uppercase text-slate-400">
                Slogan (üst başlığın altı)
                <input
                  value={draft.tagline ?? ''}
                  onChange={e => onChange({ tagline: e.target.value })}
                  placeholder={template.tagline}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold"
                />
              </label>
              <label className="block text-xs font-black uppercase text-slate-400">
                Hakkında
                <textarea
                  value={draft.about || ''}
                  onChange={e => onChange({ about: e.target.value })}
                  rows={5}
                  placeholder={template.about}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-relaxed"
                />
              </label>
              <label className="block text-xs font-black uppercase text-slate-400">
                İletişim notu
                <input
                  value={draft.contactNote || ''}
                  onChange={e => onChange({ contactNote: e.target.value })}
                  placeholder="Örn. WhatsApp tercih edilir"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold"
                />
              </label>
            </section>

            <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div>
                <p className="text-xs font-black uppercase text-slate-500">Sosyal ağlar</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Hesapları girin ve müşteri sayfasında nerede görüneceğini seçin.
                </p>
              </div>
              <label className="block text-xs font-black uppercase text-slate-400">
                Instagram
                <input
                  value={draft.instagram || ''}
                  onChange={e => onChange({ instagram: e.target.value })}
                  placeholder="@kullanici veya https://instagram.com/…"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold"
                />
              </label>
              <label className="block text-xs font-black uppercase text-slate-400">
                Facebook
                <input
                  value={draft.facebook || ''}
                  onChange={e => onChange({ facebook: e.target.value })}
                  placeholder="sayfa veya https://facebook.com/…"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold"
                />
              </label>
              <label className="block text-xs font-black uppercase text-slate-400">
                TikTok
                <input
                  value={draft.tiktok || ''}
                  onChange={e => onChange({ tiktok: e.target.value })}
                  placeholder="@kullanici veya https://tiktok.com/@…"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold"
                />
              </label>
              <fieldset className="space-y-2">
                <legend className="text-xs font-black uppercase text-slate-400">Nerede görünsün?</legend>
                {(
                  [
                    { id: 'about', label: 'Hakkında altında', hint: 'Tanıtım metninin hemen altında butonlar' },
                    { id: 'contact', label: 'İletişim bölümünde', hint: 'Telefon / e-posta listesinde' },
                    { id: 'both', label: 'Her ikisinde', hint: 'Hakkında + İletişim' },
                    { id: 'hero', label: 'Üst kapak / slogan altında', hint: 'Sayfanın en üstünde, ismin yanında' },
                    { id: 'hidden', label: 'Gizle', hint: 'Sayfada sosyal ağ gösterme' },
                  ] as const
                ).map(opt => {
                  const active = (draft.socialPlacement || 'about') === opt.id;
                  return (
                    <label
                      key={opt.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl px-3 py-3 ring-1 ${
                        active ? 'bg-brand-50 ring-brand-200' : 'bg-slate-50 ring-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="socialPlacement"
                        className="mt-1"
                        checked={active}
                        onChange={() => onChange({ socialPlacement: opt.id })}
                      />
                      <span>
                        <span className="block text-sm font-black text-slate-900">{opt.label}</span>
                        <span className="mt-0.5 block text-xs font-semibold text-slate-500">{opt.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            </section>

            <section className="space-y-2 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs font-black uppercase text-slate-500">Sayfada görünen alanlar</p>
              <Toggle
                checked={!!draft.hidePrices}
                onChange={v => onChange({ hidePrices: v })}
                title="Fiyatları gizle"
                hint="Hizmet kartlarında tutar görünmez"
              />
              <Toggle
                checked={draft.showPhone !== false}
                onChange={v => onChange({ showPhone: v })}
                title="Telefonu göster"
                hint="Kapalıysa Ara butonu gizlenir"
              />
              <Toggle
                checked={draft.showAddress !== false}
                onChange={v => onChange({ showAddress: v })}
                title="Adresi göster"
                hint="Kapalıysa adres satırı gizlenir"
              />
            </section>

            {msg && <p className="text-sm font-bold text-rose-700">{msg}</p>}
            <button type="button" onClick={onClose} className="btn btn-primary btn-block !min-h-12">
              Düzenlemeyi bitir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 rounded border-slate-300 text-brand-600"
      />
      <span>
        <span className="block text-sm font-black text-slate-900">{title}</span>
        <span className="mt-0.5 block text-xs font-semibold text-slate-500">{hint}</span>
      </span>
    </label>
  );
}
