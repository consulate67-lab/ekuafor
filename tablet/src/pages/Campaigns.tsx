import { useMemo, useState } from 'react';
import { DateField } from '../components/DateField';
import { IconBack } from '../components/Icons';
import { addDays, formatDateRangeTr, todayKey } from '../lib/dates';
import { uid } from '../lib/id';
import { packagesForSectors, type SectorPackageTemplate } from '../lib/sectorPackages';
import { useAppStore } from '../store/appStore';
import type { Campaign } from '../types';

type View = 'define' | 'list' | 'edit';

export function Campaigns() {
  const company = useAppStore(s => s.company);
  const campaigns = useAppStore(s => s.campaigns);
  const services = useAppStore(s => s.services);
  const upsertCampaign = useAppStore(s => s.upsertCampaign);
  const removeCampaign = useAppStore(s => s.removeCampaign);
  const setScreen = useAppStore(s => s.setScreen);

  const sectorSlugs = useMemo(
    () =>
      company?.sectorSlugs?.length
        ? company.sectorSlugs
        : company?.sectorSlug
          ? [company.sectorSlug]
          : [],
    [company?.sectorSlugs, company?.sectorSlug],
  );
  const packageTemplates = useMemo(() => packagesForSectors(sectorSlugs), [sectorSlugs]);

  const today = useMemo(() => todayKey(), []);
  const [view, setView] = useState<View>('define');
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [usesPerService, setUsesPerService] = useState(1);
  const [templateKey, setTemplateKey] = useState<string | undefined>();
  const [pickId, setPickId] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const available = services.filter(s => !serviceIds.includes(s.id));

  const applyTemplate = (t: SectorPackageTemplate) => {
    const ids = t.serviceNames
      .map(n => services.find(s => s.name.toLocaleLowerCase('tr-TR') === n.toLocaleLowerCase('tr-TR'))?.id)
      .filter(Boolean) as string[];
    if (!ids.length) {
      setError(`Şablon hizmetleri bulunamadı: ${t.serviceNames.join(', ')}. Önce Hizmet listesini kontrol edin.`);
      return;
    }
    setName(t.name);
    setPrice(t.price);
    setStartDate(today);
    setEndDate(addDays(today, t.validityDays));
    setServiceIds(ids);
    setUsesPerService(t.usesPerService);
    setTemplateKey(t.key);
    setError('');
    setMsg(`Şablon yüklendi: ${t.name}`);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr');
    const list = [...campaigns].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    if (!q) return list;
    return list.filter(c => {
      const svc = c.serviceIds.map(id => services.find(s => s.id === id)?.name || '').join(' ');
      return `${c.name} ${svc}`.toLocaleLowerCase('tr').includes(q);
    });
  }, [campaigns, search, services]);

  const resetForm = () => {
    setName('');
    setPrice(0);
    setStartDate(today);
    setEndDate(today);
    setServiceIds([]);
    setUsesPerService(1);
    setTemplateKey(undefined);
    setPickId('');
    setError('');
    setEditId(null);
  };

  const loadCampaign = (c: Campaign) => {
    setEditId(c.id);
    setName(c.name);
    setPrice(c.price);
    setStartDate(c.startDate);
    setEndDate(c.endDate);
    setServiceIds([...c.serviceIds]);
    setUsesPerService(c.usesPerService ?? 1);
    setTemplateKey(c.templateKey);
    setPickId('');
    setError('');
    setMsg('');
    setView('edit');
  };

  const addFromList = () => {
    if (!pickId || serviceIds.includes(pickId)) return;
    setServiceIds(prev => [...prev, pickId]);
    setPickId('');
  };

  const removeSvc = (id: string) => setServiceIds(prev => prev.filter(x => x !== id));

  const save = () => {
    if (!name.trim()) {
      setError('Kampanya adı gerekli');
      return;
    }
    if (!serviceIds.length) {
      setError('Listeden en az bir hizmet ekleyin');
      return;
    }
    if (endDate < startDate) {
      setError('Bitiş tarihi başlangıçtan önce olamaz');
      return;
    }

    if (editId) {
      const existing = campaigns.find(c => c.id === editId);
      upsertCampaign({
        id: editId,
        name: name.trim(),
        price: Math.max(0, price),
        startDate,
        endDate,
        serviceIds: [...serviceIds],
        usesPerService: Math.max(1, usesPerService),
        templateKey,
        active: existing?.active ?? true,
        createdAt: existing?.createdAt || new Date().toISOString(),
      });
      setMsg('Kampanya güncellendi');
      setView('list');
      resetForm();
      return;
    }

    upsertCampaign({
      id: uid('cmp'),
      name: name.trim(),
      price: Math.max(0, price),
      startDate,
      endDate,
      serviceIds: [...serviceIds],
      usesPerService: Math.max(1, usesPerService),
      templateKey,
      active: true,
      createdAt: new Date().toISOString(),
    });
    resetForm();
    setMsg('Kampanya kaydedildi');
  };

  const deleteCurrent = () => {
    if (!editId) return;
    if (!confirm('Bu kampanya silinsin mi?')) return;
    removeCampaign(editId);
    resetForm();
    setView('list');
    setMsg('Kampanya silindi');
  };

  const goBack = () => {
    if (view === 'edit') {
      resetForm();
      setView('list');
      return;
    }
    if (view === 'list') {
      setSearch('');
      setView('define');
      return;
    }
    setScreen('settings');
  };

  const formTitle = view === 'edit' ? 'Kampanyayı düzenle' : 'Yeni kampanya';

  return (
    <div className="min-h-full bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" title="Geri" aria-label="Geri" onClick={goBack} className="btn btn-secondary btn-icon !min-h-12 !w-12">
            <IconBack />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black">
              {view === 'list' ? 'Kampanya listesi' : view === 'edit' ? 'Kampanya düzenle' : 'Kampanyalar'}
            </h1>
            <p className="text-sm font-semibold text-slate-500">
              {view === 'list'
                ? 'Seçerek düzenleyin veya silin'
                : 'Ad · tarih aralığı · fiyat · hizmet'}
            </p>
          </div>
          {view === 'define' && (
            <button type="button" onClick={() => { setMsg(''); setView('list'); }} className="btn btn-dark !min-h-12 !px-4">
              Liste ({campaigns.length})
            </button>
          )}
          {view === 'list' && (
            <button type="button" onClick={() => { resetForm(); setView('define'); }} className="btn btn-primary !min-h-12 !px-4">
              + Yeni
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
        {msg && view !== 'edit' && (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{msg}</p>
        )}

        {(view === 'define' || view === 'edit') && (
          <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-black">{formTitle}</h2>
              {view === 'define' && (
                <button type="button" onClick={() => { setMsg(''); setView('list'); }} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
                  Kayıtlı listeyi aç
                </button>
              )}
            </div>
            {view === 'define' && packageTemplates.length > 0 && (
              <div className="space-y-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs font-black uppercase text-slate-400">Sektör paket şablonları</p>
                <div className="flex flex-wrap gap-2">
                  {packageTemplates.map(t => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-800 ring-1 ring-slate-200 hover:bg-brand-50"
                    >
                      {t.name} · ₺{t.price} · {t.usesPerService} hak
                    </button>
                  ))}
                </div>
              </div>
            )}
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Kampanya / paket adı"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-bold"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <label className="text-xs font-black uppercase text-slate-400">
                Başlangıç
                <DateField value={startDate} onChange={setStartDate} className="mt-1" />
              </label>
              <label className="text-xs font-black uppercase text-slate-400">
                Bitiş
                <DateField value={endDate} onChange={setEndDate} className="mt-1" min={startDate} />
              </label>
              <label className="text-xs font-black uppercase text-slate-400">
                Fiyat (₺)
                <input type="number" value={price} onChange={e => setPrice(Number(e.target.value) || 0)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 font-bold" />
              </label>
              <label className="text-xs font-black uppercase text-slate-400">
                Hak / hizmet
                <input
                  type="number"
                  min={1}
                  value={usesPerService}
                  onChange={e => setUsesPerService(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 font-bold"
                />
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-black uppercase text-slate-400">Hizmet ekle</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={pickId}
                  onChange={e => setPickId(e.target.value)}
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-bold"
                >
                  <option value="">Listeden hizmet seçin…</option>
                  {available.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.durationMinutes} dk · ₺{s.price}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={addFromList} disabled={!pickId} className="btn btn-dark !min-h-12 sm:w-36 disabled:opacity-40">
                  Ekle
                </button>
              </div>
              {serviceIds.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {serviceIds.map(id => {
                    const s = services.find(x => x.id === id);
                    return (
                      <li key={id} className="flex items-center justify-between gap-2 rounded-2xl bg-brand-50 px-4 py-3 ring-1 ring-brand-100">
                        <span className="font-bold text-brand-900">{s?.name || id}</span>
                        <button type="button" onClick={() => removeSvc(id)} className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-rose-600 ring-1 ring-rose-100">
                          Çıkar
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm font-semibold text-slate-400">Henüz hizmet eklenmedi</p>
              )}
            </div>

            {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
            <button type="button" onClick={save} className="btn btn-primary btn-block !min-h-12 !text-base">
              {view === 'edit' ? 'Değişiklikleri kaydet' : 'Kampanyayı kaydet'}
            </button>
            {view === 'edit' && (
              <button type="button" onClick={deleteCurrent} className="btn btn-danger-soft btn-block !min-h-12">
                Kampanyayı sil
              </button>
            )}
          </section>
        )}

        {view === 'list' && (
          <section className="space-y-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Kampanya ara…"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base font-bold shadow-sm"
            />
            {filtered.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => loadCampaign(c)}
                className="w-full rounded-3xl bg-white p-5 text-left shadow-sm transition active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-black">{c.name}</p>
                    <p className="text-sm font-semibold text-slate-500">
                      {formatDateRangeTr(c.startDate, c.endDate)} · ₺{c.price}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.serviceIds.map(id => (
                        <span key={id} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          {services.find(s => s.id === id)?.name || id}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-black text-brand-600">Düzenle ›</span>
                </div>
              </button>
            ))}
            {!filtered.length && (
              <p className="py-10 text-center text-sm font-bold text-slate-400">
                {campaigns.length ? 'Sonuç yok' : 'Henüz kampanya yok'}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
