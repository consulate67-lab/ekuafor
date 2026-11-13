import { useEffect, useMemo, useState } from 'react';
import { IconBack, IconReport } from '../components/Icons';
import { useAppStore } from '../store/appStore';
import { STAFF_TITLES, SLOT_OPTIONS, type Staff, type StaffTitle, type WebPageProfile } from '../types';
import { uid } from '../lib/id';
import { EXAMPLE_PROMPT, EXAMPLE_PROMPT_HINT, generateAboutAi } from '../lib/generateAbout';
import { pushWebProfile } from '../lib/pushWebProfile';
import { pushStaffPhotos } from '../lib/pushStaffPhotos';
import { reverseGeocode } from '../lib/reverseGeocode';
import { companyPublicUrl, companyWebsiteDisplay } from '../lib/webUrl';
import { getSector, sectorsByGroup } from '../lib/sectorCatalog';
import {
  defaultWebTemplateId,
  getWebTemplate,
  listWebTemplatesForSectors,
} from '@shared/webPageTemplates';

type Tab = 'hours' | 'staff' | 'services' | 'webpage';

export function Settings() {
  const company = useAppStore(s => s.company)!;
  const staff = useAppStore(s => s.staff);
  const services = useAppStore(s => s.services);
  const departments = useAppStore(s => s.departments);
  const deviceId = useAppStore(s => s.deviceId);
  const updateCompany = useAppStore(s => s.updateCompany);
  const upsertStaff = useAppStore(s => s.upsertStaff);
  const removeStaff = useAppStore(s => s.removeStaff);
  const upsertService = useAppStore(s => s.upsertService);
  const removeService = useAppStore(s => s.removeService);
  const setScreen = useAppStore(s => s.setScreen);
  const resetAll = useAppStore(s => s.resetAll);
  const persist = useAppStore(s => s.persist);

  const [tab, setTab] = useState<Tab>('hours');
  const [draftStaff, setDraftStaff] = useState<Staff | null>(null);
  const [svcName, setSvcName] = useState('');
  const [svcDuration, setSvcDuration] = useState(30);
  const [svcPrice, setSvcPrice] = useState(0);
  const sectorSlugs = useMemo(
    () =>
      company.sectorSlugs?.length
        ? company.sectorSlugs
        : company.sectorSlug
          ? [company.sectorSlug]
          : [],
    [company.sectorSlugs, company.sectorSlug],
  );
  const sectorTemplates = useMemo(() => listWebTemplatesForSectors(sectorSlugs), [sectorSlugs]);

  const defaultPhone = useMemo(() => {
    const fromWeb = company.webPage?.phone?.replace(/\D/g, '');
    if (fromWeb) return fromWeb.slice(0, 11);
    const usta = staff.find(s => s.title === 'usta' && s.phone);
    const any = staff.find(s => s.phone);
    return (usta || any)?.phone?.replace(/\D/g, '').slice(0, 11) || '';
  }, [company.webPage?.phone, staff]);

  const defaultWebsite = useMemo(
    () =>
      company.serverCompanyId ? companyWebsiteDisplay(company.serverCompanyId) : '',
    [company.serverCompanyId],
  );

  const [webDraft, setWebDraft] = useState<WebPageProfile>(() => {
    const base = company.webPage || {};
    return {
      ...base,
      templateId: base.templateId || defaultWebTemplateId(sectorSlugs[0]),
      phone: base.phone || defaultPhone,
      website: base.website || defaultWebsite,
    };
  });
  const [webBusy, setWebBusy] = useState(false);
  const [webMsg, setWebMsg] = useState('');
  const [aboutPrompt, setAboutPrompt] = useState(EXAMPLE_PROMPT);
  const [aiBusy, setAiBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoMsg, setGeoMsg] = useState('');

  const patchWeb = (patch: Partial<WebPageProfile>) => {
    setWebDraft(prev => ({ ...prev, ...patch }));
  };

  const fillFromLocation = async (force = false) => {
    const loc = company.location;
    if (!loc) {
      setGeoMsg('Kurulumda konum yok — Mesai’den konum ekleyin veya adresi elle yazın.');
      return;
    }
    if (!force && webDraft.address && webDraft.city) return;
    setGeoBusy(true);
    setGeoMsg('Konumdan adres çözülüyor…');
    const resolved = await reverseGeocode(loc.latitude, loc.longitude);
    setGeoBusy(false);
    if (!resolved) {
      setGeoMsg('Adres çözülemedi — interneti kontrol edin veya elle girin.');
      return;
    }
    setWebDraft(prev => ({
      ...prev,
      address: force || !prev.address?.trim() ? resolved.address || prev.address : prev.address,
      district: force || !prev.district?.trim() ? resolved.district || prev.district : prev.district,
      city: force || !prev.city?.trim() ? resolved.city || prev.city : prev.city,
    }));
    setGeoMsg(
      `Konumdan dolduruldu: ${[resolved.district, resolved.city].filter(Boolean).join(' / ') || 'ok'}`,
    );
  };

  const fillContactDefaults = () => {
    setWebDraft(prev => ({
      ...prev,
      phone: prev.phone?.trim() ? prev.phone : defaultPhone,
      // Domain değişince eski www.saloncebinde.com değerini de güncelle
      website: defaultWebsite || prev.website,
    }));
  };

  /** Web sekmesine girince telefon / site / konumdan adres */
  useEffect(() => {
    if (tab !== 'webpage') return;
    fillContactDefaults();
    void fillFromLocation(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, company.location?.latitude, company.location?.longitude, company.serverCompanyId, defaultPhone, defaultWebsite]);

  const runAiAbout = async () => {
    setAiBusy(true);
    setWebMsg('');
    const result = await generateAboutAi({
      prompt: aboutPrompt,
      company: {
        ...company,
        webPage: { ...company.webPage, ...webDraft },
      },
      deviceId,
      templateId: webDraft.templateId,
    });
    setAiBusy(false);
    if (result.ok && result.text) {
      patchWeb({ about: result.text });
      setWebMsg(result.message);
    } else {
      setWebMsg(result.message || 'Metin üretilemedi');
    }
  };

  const selectTemplate = (templateId: string) => {
    const tpl = getWebTemplate(templateId);
    setWebDraft(prev => ({
      ...prev,
      templateId,
      about: prev.about?.trim() ? prev.about : tpl?.about || prev.about,
    }));
  };

  const setCompanySector = (slug: string) => {
    const sec = getSector(slug);
    if (!sec) return;
    updateCompany({
      sectorSlug: slug,
      sectorName: sec.name,
      sectorSlugs: [slug],
      sectorNames: [sec.name],
    });
    const tplId = defaultWebTemplateId(slug);
    const tpl = getWebTemplate(tplId);
    setWebDraft(prev => ({
      ...prev,
      templateId: tplId,
      about: prev.about?.trim() ? prev.about : tpl?.about || prev.about,
    }));
  };

  /** Deneme / eski kurulumda sektör boşsa erkek berberi ata */
  useEffect(() => {
    const has =
      (company.sectorSlugs && company.sectorSlugs.length > 0) || !!company.sectorSlug;
    if (has) return;
    setCompanySector('barber');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca eksik sektörü bir kez doldur
  }, [company.sectorSlug, company.sectorSlugs]);

  const saveWebPage = async () => {
    const slug = sectorSlugs[0] || 'barber';
    if (!sectorSlugs.length) setCompanySector(slug);
    const next = {
      ...webDraft,
      templateId: webDraft.templateId || defaultWebTemplateId(slug),
      phone: webDraft.phone || defaultPhone,
      website: defaultWebsite || webDraft.website,
    };
    setWebDraft(next);
    updateCompany({ webPage: next });
    persist();
    setWebBusy(true);
    setWebMsg('');
    const state = useAppStore.getState();
    const result = await pushWebProfile(state);
    const photos = await pushStaffPhotos(state);
    setWebBusy(false);
    setWebMsg(
      photos.ok
        ? `${result.message} · ${photos.message}`
        : result.message,
    );
  };

  const sectorGroups = useMemo(() => sectorsByGroup(), []);

  const saveStaff = () => {
    if (!draftStaff || !draftStaff.firstName.trim() || !draftStaff.lastName.trim()) return;
    upsertStaff(draftStaff);
    setDraftStaff(null);
    void pushStaffPhotos(useAppStore.getState());
  };

  const addService = () => {
    if (!svcName.trim()) return;
    upsertService({
      id: uid('svc'),
      name: svcName.trim(),
      durationMinutes: svcDuration,
      price: svcPrice,
    });
    setSvcName('');
    setSvcDuration(30);
    setSvcPrice(0);
  };

  const hub: { key: string; label: string; hint: string; onClick: () => void }[] = [
    { key: 'campaigns', label: 'Kampanyalar', hint: 'Paket / fiyat / hizmet seti', onClick: () => setScreen('campaigns') },
    { key: 'subscribers', label: 'Aboneler', hint: 'Müşteri kartı · hak takibi', onClick: () => setScreen('subscribers') },
    {
      key: 'webpage',
      label: 'Web sayfası',
      hint: 'Hakkında · iletişim · sektör içeriği',
      onClick: () => {
        const base = company.webPage || {};
        setWebDraft({
          ...base,
          templateId: base.templateId || defaultWebTemplateId(sectorSlugs[0]),
          phone: base.phone || defaultPhone,
          website: base.website || defaultWebsite,
        });
        setTab('webpage');
      },
    },
    { key: 'qr', label: 'QR kod', hint: 'Müşteri barkodu · randevu', onClick: () => setScreen('qr') },
  ];

  return (
    <div className="min-h-full bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" title="Panele dön" aria-label="Panele dön" onClick={() => setScreen('board')} className="btn btn-secondary btn-icon !min-h-12 !w-12">
              <IconBack />
            </button>
            <button type="button" title="Rapor" aria-label="Rapor" onClick={() => setScreen('reports')} className="btn btn-secondary btn-icon !min-h-12 !w-12">
              <IconReport />
            </button>
          </div>
          <p className="text-sm font-bold text-slate-400">{company.name}</p>
        </div>
        <h1 className="mt-3 text-2xl font-black sm:text-3xl">Parametreler</h1>
        <p className="text-sm font-semibold text-slate-500">Tanımlar · kampanya · abone · QR web</p>
      </header>

      <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {hub.map(item => (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className="rounded-3xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-100 transition active:scale-[0.99]"
            >
              <p className="text-lg font-black text-slate-900">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">{item.hint}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-3xl bg-white p-2 shadow-sm sm:grid-cols-4">
          {([
            ['hours', 'Mesai'],
            ['staff', 'Çalışan'],
            ['services', 'Hizmet'],
            ['webpage', 'Web'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-2xl py-4 text-base font-black ${tab === key ? 'bg-brand-600 text-white' : 'text-slate-500'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'hours' && (
          <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black">Firma çalışma saatleri</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-xs font-black uppercase text-slate-400">
                Açılış
                <input type="time" value={company.workStart} onChange={e => updateCompany({ workStart: e.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-bold" />
              </label>
              <label className="block text-xs font-black uppercase text-slate-400">
                Kapanış
                <input type="time" value={company.workEnd} onChange={e => updateCompany({ workEnd: e.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-bold" />
              </label>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-slate-400">Slot süresi</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SLOT_OPTIONS.map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => updateCompany({ slotInterval: n })}
                    className={`rounded-2xl px-4 py-3 text-sm font-black ${company.slotInterval === n ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {n} dk
                  </button>
                ))}
              </div>
            </div>
            {company.location && (
              <p className="text-sm font-semibold text-slate-500">
                Konum: {company.location.latitude.toFixed(5)}, {company.location.longitude.toFixed(5)}
              </p>
            )}
            {(company.sectorNames?.length || company.sectorName) && (
              <p className="text-sm font-semibold text-slate-500">
                Sektör: {(company.sectorNames || [company.sectorName]).filter(Boolean).join(' · ')}
              </p>
            )}
          </section>
        )}

        {tab === 'staff' && (
          <section className="space-y-3">
            {staff.map(s => (
              <article key={s.id} className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm">
                <div className="h-14 w-14 overflow-hidden rounded-2xl bg-slate-100">
                  {s.photo ? <img src={s.photo} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black">{s.firstName} {s.lastName}</p>
                  <p className="text-sm font-semibold text-slate-500">
                    {STAFF_TITLES.find(t => t.key === s.title)?.label} · {s.phone}
                  </p>
                </div>
                <button type="button" onClick={() => setDraftStaff(s)} className="btn btn-secondary !min-h-11 !px-4">Düzenle</button>
                <button type="button" onClick={() => removeStaff(s.id)} className="btn btn-danger-soft !min-h-11 !px-4">Sil</button>
              </article>
            ))}
            <button
              type="button"
              onClick={() =>
                setDraftStaff({
                  id: uid('stf'),
                  firstName: '',
                  lastName: '',
                  phone: '',
                  title: 'kalfa',
                  departmentId: departments[0]?.id || uid('dept'),
                  workStart: company.workStart,
                  workEnd: company.workEnd,
                })
              }
              className="btn btn-dark btn-block !min-h-12 !text-base"
            >
              + Çalışan ekle
            </button>
          </section>
        )}

        {tab === 'webpage' && (
          <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-black">Web sayfası</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Firmanızın sektörüne ait hazır şablonlardan birini seçin; QR sayfası bu şablonla açılır.
              </p>
              {company.serverCompanyId ? (
                <p className="mt-2 break-all rounded-2xl bg-slate-50 px-3 py-2 font-mono text-xs font-bold text-slate-600">
                  {companyPublicUrl(company.serverCompanyId)}
                </p>
              ) : (
                <p className="mt-2 text-sm font-bold text-amber-700">Firma henüz sisteme kayıtlı değil — önce QR ekranından kaydı tamamlayın.</p>
              )}
              {sectorSlugs.length > 0 && (
                <p className="mt-2 text-sm font-bold text-emerald-700">
                  Sektör: {sectorSlugs.map(s => getSector(s)?.name || s).join(' · ')}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-black uppercase text-slate-400">Sektör seç</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Web şablonları seçilen sektöre göre gelir. Bu deneme firma için erkek berberi önerilir.
              </p>
              <div className="mt-2 max-h-56 space-y-3 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-3">
                {sectorGroups.map(g => (
                  <div key={g.group}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{g.group}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {g.sectors.map(s => {
                        const on = sectorSlugs.includes(s.slug);
                        return (
                          <button
                            key={s.slug}
                            type="button"
                            onClick={() => setCompanySector(s.slug)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-black ${
                              on ? 'bg-brand-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'
                            }`}
                          >
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {sectorTemplates.length > 0 && (
              <div>
                <p className="text-xs font-black uppercase text-slate-400">
                  Şablonlar ({sectorTemplates.length} · sektöre özel)
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {sectorTemplates.map(t => {
                    const on = webDraft.templateId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => selectTemplate(t.id)}
                        className={`rounded-2xl p-3 text-left ring-2 transition ${
                          on ? 'ring-brand-600 bg-brand-50' : 'ring-slate-100 bg-slate-50'
                        }`}
                      >
                        <div
                          className="mb-2 h-14 rounded-xl"
                          style={{
                            background: `linear-gradient(135deg, ${t.theme.heroFrom}, ${t.theme.heroTo})`,
                          }}
                        />
                        <p className="text-sm font-black text-slate-900">{t.name}</p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500 line-clamp-2">{t.tagline}</p>
                        <p className="mt-1 font-mono text-[10px] font-bold text-slate-400">{t.id}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2 rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-100">
              <p className="text-xs font-black uppercase text-violet-700">AI ile hakkında</p>
              <label className="block text-xs font-black uppercase text-slate-500">
                Prompt
                <textarea
                  value={aboutPrompt}
                  onChange={e => setAboutPrompt(e.target.value)}
                  rows={2}
                  placeholder={EXAMPLE_PROMPT_HINT}
                  className="mt-1 w-full rounded-2xl border border-violet-100 bg-white px-3 py-2.5 text-sm font-bold text-slate-800"
                />
              </label>
              <p className="text-[11px] font-semibold text-violet-600/90">
                Anahtar kelimeleri yazın; AI bunlardan firma tanıtım metni üretir.
              </p>
              <button
                type="button"
                disabled={aiBusy || !aboutPrompt.trim()}
                onClick={() => void runAiAbout()}
                className="btn btn-dark !min-h-11 w-full disabled:opacity-50"
              >
                {aiBusy ? 'Üretiliyor…' : 'AI ile doldur'}
              </button>
            </div>

            <label className="block text-xs font-black uppercase text-slate-400">
              Hakkında
              <textarea
                value={webDraft.about || ''}
                onChange={e => patchWeb({ about: e.target.value })}
                rows={4}
                placeholder="İşletmenizi anlatın… (AI ile doldur veya elle yazın)"
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs font-black uppercase text-slate-400">
                İletişim telefon
                <input
                  value={webDraft.phone || ''}
                  onChange={e => patchWeb({ phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                  placeholder="05xx…"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold"
                />
              </label>
              <label className="block text-xs font-black uppercase text-slate-400">
                E-posta
                <input
                  value={webDraft.email || ''}
                  onChange={e => patchWeb({ email: e.target.value })}
                  placeholder="info@…"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black uppercase text-slate-400">Adres (konumdan)</p>
              <button
                type="button"
                disabled={geoBusy || !company.location}
                onClick={() => void fillFromLocation(true)}
                className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 disabled:opacity-40"
              >
                {geoBusy ? 'Çözülüyor…' : 'Konumdan yeniden doldur'}
              </button>
            </div>
            {geoMsg && <p className="text-xs font-bold text-slate-600">{geoMsg}</p>}
            <label className="block text-xs font-black uppercase text-slate-400">
              Adres
              <input
                value={webDraft.address || ''}
                onChange={e => patchWeb({ address: e.target.value })}
                placeholder="Sokak, no…"
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-black uppercase text-slate-400">
                İlçe
                <input
                  value={webDraft.district || ''}
                  onChange={e => patchWeb({ district: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold"
                />
              </label>
              <label className="block text-xs font-black uppercase text-slate-400">
                İl
                <input
                  value={webDraft.city || ''}
                  onChange={e => patchWeb({ city: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold"
                />
              </label>
            </div>
            <label className="block text-xs font-black uppercase text-slate-400">
              Web sitesi
              <input
                value={webDraft.website || ''}
                onChange={e => patchWeb({ website: e.target.value })}
                placeholder="https://…/#/firma/…"
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold"
                readOnly={!!company.serverCompanyId}
              />
              {company.serverCompanyId && (
                <a
                  href={companyPublicUrl(company.serverCompanyId)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-sm font-black text-brand-600"
                >
                  Siteyi aç ↗
                </a>
              )}
            </label>
            <label className="block text-xs font-black uppercase text-slate-400">
              İletişim notu
              <input
                value={webDraft.contactNote || ''}
                onChange={e => patchWeb({ contactNote: e.target.value })}
                placeholder="Örn. WhatsApp tercih edilir"
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold"
              />
            </label>
            {webMsg && <p className="text-sm font-bold text-slate-700">{webMsg}</p>}
            <button type="button" disabled={webBusy} onClick={() => void saveWebPage()} className="btn btn-primary btn-block !min-h-12">
              {webBusy ? 'Kaydediliyor…' : 'Web sayfasını kaydet'}
            </button>
          </section>
        )}

        {tab === 'services' && (
          <section className="space-y-3">
            {company.sectorName && (
              <p className="text-sm font-bold text-slate-500">Sektör: {company.sectorName}</p>
            )}
            {services.map(s => (
              <article key={s.id} className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-black">{s.name}</p>
                    <label className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
                      Süre
                      <input
                        type="number"
                        value={s.durationMinutes}
                        onChange={e =>
                          upsertService({
                            ...s,
                            durationMinutes: Number(e.target.value) || company.slotInterval || 30,
                          })
                        }
                        className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-slate-800"
                      />
                      dk · ₺
                      <input
                        type="number"
                        value={s.price}
                        onChange={e => upsertService({ ...s, price: Number(e.target.value) || 0 })}
                        className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-slate-800"
                      />
                    </label>
                    {!!s.resources?.length && (
                      <ul className="mt-2 space-y-0.5 text-xs font-semibold text-slate-500">
                        {s.resources.map(r => (
                          <li key={r.id}>
                            {r.kind === 'equipment' ? 'Ekipman' : 'Malzeme'}: {r.name}
                            {r.defaultQty ? ` ×${r.defaultQty}` : ''}
                            {r.unit ? ` ${r.unit}` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button type="button" onClick={() => removeService(s.id)} className="btn btn-danger-soft !min-h-11 !px-4">
                    Sil
                  </button>
                </div>
              </article>
            ))}
            <div className="space-y-3 rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Yeni hizmet</h2>
              <input value={svcName} onChange={e => setSvcName(e.target.value)} placeholder="Hizmet adı" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-bold" />
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-black uppercase text-slate-400">
                  Süre (dk)
                  <input type="number" value={svcDuration} onChange={e => setSvcDuration(Number(e.target.value) || 30)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 font-bold" />
                </label>
                <label className="text-xs font-black uppercase text-slate-400">
                  Fiyat
                  <input type="number" value={svcPrice} onChange={e => setSvcPrice(Number(e.target.value) || 0)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 font-bold" />
                </label>
              </div>
              <button type="button" onClick={addService} className="btn btn-primary btn-block !min-h-12">Kaydet</button>
            </div>
          </section>
        )}

        <button
          type="button"
          onClick={() => {
            if (confirm('Tüm tablet verisi silinsin mi? Kurulum yeniden başlar.')) resetAll();
          }}
          className="btn btn-danger-soft btn-block !min-h-12"
        >
          Kurulumu sıfırla
        </button>
      </div>

      {draftStaff && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-lg space-y-3 rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-black">Çalışan</h3>
            <div className="grid grid-cols-2 gap-2">
              <input value={draftStaff.firstName} onChange={e => setDraftStaff({ ...draftStaff, firstName: e.target.value })} placeholder="Ad" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 font-bold" />
              <input value={draftStaff.lastName} onChange={e => setDraftStaff({ ...draftStaff, lastName: e.target.value })} placeholder="Soyad" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 font-bold" />
            </div>
            <input value={draftStaff.phone} onChange={e => setDraftStaff({ ...draftStaff, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="Telefon" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 font-bold" />
            <select value={draftStaff.title} onChange={e => setDraftStaff({ ...draftStaff, title: e.target.value as StaffTitle })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 font-bold">
              {STAFF_TITLES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="time" value={draftStaff.workStart} onChange={e => setDraftStaff({ ...draftStaff, workStart: e.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 font-bold" />
              <input type="time" value={draftStaff.workEnd} onChange={e => setDraftStaff({ ...draftStaff, workEnd: e.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 font-bold" />
            </div>
            <label className="block text-xs font-black uppercase text-slate-400">
              Fotoğraf
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-sm"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setDraftStaff({ ...draftStaff, photo: String(reader.result) });
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setDraftStaff(null)} className="btn btn-secondary flex-1 !min-h-12">Vazgeç</button>
              <button type="button" onClick={saveStaff} className="btn btn-primary flex-1 !min-h-12">Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
