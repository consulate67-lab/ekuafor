import { useMemo, useState } from 'react';
import { SLOT_OPTIONS, type Staff, type Department, type GeoLocation } from '../types';
import { activateTabletKey } from '../lib/activation';
import { captureLocation, geoErrorMessage } from '../lib/geo';
import { sectorsByGroup, servicesFromSectors, getSector } from '../lib/sectorCatalog';
import {
  defaultStaffTitle,
  departmentNamesForSectors,
  staffTitlesForSectors,
} from '../lib/staffRoles';
import { uid } from '../lib/id';
import { useAppStore } from '../store/appStore';

type Step = 'welcome' | 'key' | 'company' | 'sector' | 'hours' | 'staff' | 'review';

const emptyStaff = (
  workStart: string,
  workEnd: string,
  deptId: string,
  title: string,
  serviceIds: string[] = [],
): Staff => ({
  id: uid('stf'),
  firstName: '',
  lastName: '',
  phone: '',
  title,
  departmentId: deptId,
  workStart,
  workEnd,
  serviceIds,
});

export function SetupWizard() {
  const completeSetup = useAppStore(s => s.completeSetup);
  const deviceId = useAppStore(s => s.deviceId);
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('20:00');
  const [slotInterval, setSlotInterval] = useState(30);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locError, setLocError] = useState('');
  const [locating, setLocating] = useState(false);
  const [staffCount, setStaffCount] = useState(3);
  const [sectorSlugs, setSectorSlugs] = useState<string[]>([]);
  const [activationKey, setActivationKey] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [keyBusy, setKeyBusy] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [setupDepartments, setSetupDepartments] = useState<Department[]>([]);
  const [draftServices, setDraftServices] = useState(() => servicesFromSectors([]));
  const [error, setError] = useState('');
  const [finishing, setFinishing] = useState(false);

  const grouped = useMemo(() => sectorsByGroup(), []);
  const selectedNames = sectorSlugs.map(s => getSector(s)?.name).filter(Boolean) as string[];
  const previewServices = useMemo(() => servicesFromSectors(sectorSlugs), [sectorSlugs]);
  const sectorTitles = useMemo(() => staffTitlesForSectors(sectorSlugs), [sectorSlugs]);
  const sectorDeptNames = useMemo(() => departmentNamesForSectors(sectorSlugs), [sectorSlugs]);

  const askLocation = async () => {
    setLocError('');
    setLocating(true);
    try {
      setLocation(await captureLocation());
    } catch (e) {
      setLocError(geoErrorMessage(e) || (e instanceof Error ? e.message : 'Konum alınamadı.'));
    } finally {
      setLocating(false);
    }
  };

  const toggleSector = (slug: string) => {
    setSectorSlugs(prev => (prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]));
    setError('');
  };

  const verifyKey = async () => {
    setError('');
    if (!keyInput.trim()) {
      setError('Kurulum anahtarını girin.');
      return;
    }
    if (!navigator.onLine) {
      setError('Kurulum için internet gerekli.');
      return;
    }
    setKeyBusy(true);
    const res = await activateTabletKey({ key: keyInput, deviceId });
    setKeyBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setActivationKey(res.key || keyInput.trim().toUpperCase());
    setStep('company');
  };

  const goCompanyNext = () => {
    if (!name.trim()) {
      setError('Firma adı zorunlu.');
      return;
    }
    setError('');
    setStep('sector');
  };

  const goSectorNext = () => {
    if (!sectorSlugs.length) {
      setError('En az bir sektör seçin.');
      return;
    }
    setError('');
    setDraftServices(servicesFromSectors(sectorSlugs));
    setStep('hours');
  };

  const prepareStaff = () => {
    if (workStart >= workEnd) {
      setError('Bitiş saati başlangıçtan sonra olmalı.');
      return;
    }
    setError('');
    const depts: Department[] = departmentNamesForSectors(sectorSlugs).map(n => ({
      id: uid('dept'),
      name: n,
    }));
    setSetupDepartments(depts);
    const defaultDeptId = depts[0]?.id || uid('dept');
    const defaultTitle = defaultStaffTitle(sectorSlugs);
    const svcs = servicesFromSectors(sectorSlugs);
    setDraftServices(svcs);
    const allIds = svcs.map(s => s.id);
    const count = Math.min(30, Math.max(1, staffCount));
    setStaff(
      Array.from({ length: count }, () =>
        emptyStaff(workStart, workEnd, defaultDeptId, defaultTitle, [...allIds]),
      ),
    );
    setStep('staff');
  };

  const updateStaff = (index: number, patch: Partial<Staff>) => {
    setStaff(prev => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const toggleStaffService = (index: number, serviceId: string) => {
    const cur = staff[index]?.serviceIds || [];
    const next = cur.includes(serviceId) ? cur.filter(id => id !== serviceId) : [...cur, serviceId];
    updateStaff(index, { serviceIds: next });
  };

  const readPhoto = (index: number, file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateStaff(index, { photo: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const finish = async () => {
    for (const s of staff) {
      if (!s.firstName.trim() || !s.lastName.trim() || !s.phone.trim()) {
        setError('Her çalışan için ad, soyad ve telefon girin.');
        setStep('staff');
        return;
      }
      if (!(s.serviceIds && s.serviceIds.length)) {
        setError(`${s.firstName || 'Çalışan'} için en az bir hizmet seçin.`);
        setStep('staff');
        return;
      }
    }
    if (!activationKey.trim()) {
      setError('Kurulum anahtarı eksik. Anahtar adımına dönün.');
      setStep('key');
      return;
    }
    if (!navigator.onLine) {
      setError('Kayıt için internet gerekli. Bağlantıyı açıp tekrar deneyin.');
      return;
    }
    setError('');
    setFinishing(true);
    const usedDeptIds = new Set(staff.map(s => s.departmentId));
    const departments =
      setupDepartments.filter(d => usedDeptIds.has(d.id)).length > 0
        ? setupDepartments.filter(d => usedDeptIds.has(d.id))
        : setupDepartments.length
          ? [setupDepartments[0]]
          : [{ id: uid('dept'), name: sectorDeptNames[0] || 'Genel' }];
    const fallbackDept = departments[0];
    const result = await completeSetup({
      company: {
        name: name.trim(),
        workStart,
        workEnd,
        slotInterval,
        location,
        sectorSlugs,
        sectorNames: selectedNames,
        sectorSlug: sectorSlugs[0],
        sectorName: selectedNames[0],
        activationKey,
      },
      departments,
      staff: staff.map(s => ({
        ...s,
        departmentId: departments.some(d => d.id === s.departmentId) ? s.departmentId : fallbackDept.id,
      })),
      services: draftServices,
    });
    setFinishing(false);
    if (!result.ok) {
      setError(result.message || 'Firma kaydı tamamlanamadı');
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-100 via-indigo-50 to-slate-100 px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-600">Saloon Tablet</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Offline kurulum</h1>
        <p className="mt-2 text-slate-600">Yatay kullanım · kurulum anahtarı internet ile doğrulanır · çoklu sektör ve personel-hizmet eşlemesi.</p>

        {step === 'welcome' && (
          <section className="mt-8 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-black">1. Konum</h2>
            <p className="mt-2 text-sm text-slate-500">İsteğe bağlı. Sonra kurulum anahtarı istenecek (internet zorunlu).</p>
            <button type="button" onClick={askLocation} disabled={locating} className="btn btn-primary mt-6">
              {locating ? 'Konum alınıyor…' : location ? 'Konumu yenile' : 'Konumu al'}
            </button>
            {location && (
              <p className="mt-4 text-sm font-semibold text-emerald-700">
                Konum alındı · {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </p>
            )}
            {locError && <p className="mt-3 text-sm font-bold text-rose-600">{locError}</p>}
            <div className="mt-8 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => { setLocation(null); setStep('key'); }} className="btn btn-secondary">
                Atla
              </button>
              <button type="button" onClick={() => setStep('key')} className="btn btn-dark">
                Anahtar adımı
              </button>
            </div>
          </section>
        )}

        {step === 'key' && (
          <section className="mt-8 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm space-y-4">
            <h2 className="text-xl font-black">2. Kurulum anahtarı</h2>
            <p className="text-sm text-slate-500">
              Telegram botundan aldığınız anahtarı girin. Bu adımda internet zorunludur; anahtar bu cihaza bağlanır.
            </p>
            <input
              value={keyInput}
              onChange={e => setKeyInput(e.target.value.toUpperCase())}
              placeholder="SLN-XXXX-XXXX"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-black tracking-widest"
            />
            {!navigator.onLine && <p className="text-sm font-bold text-amber-700">Çevrimdışısınız — internet açın.</p>}
            {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
            <div className="flex justify-between pt-2">
              <button type="button" onClick={() => setStep('welcome')} className="font-bold text-slate-500">
                Geri
              </button>
              <button type="button" disabled={keyBusy || !navigator.onLine} onClick={verifyKey} className="btn btn-dark">
                {keyBusy ? 'Doğrulanıyor…' : 'Anahtarı doğrula'}
              </button>
            </div>
          </section>
        )}

        {step === 'company' && (
          <section className="mt-8 space-y-5 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-black">3. Firma</h2>
            <p className="text-xs font-bold text-emerald-700">Anahtar: {activationKey}</p>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Firma adı</span>
              <input value={name} onChange={e => setName(e.target.value)} className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold" placeholder="Örn. Ayna Kuaför" />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Kaç kişi?</span>
              <input type="number" min={1} max={30} value={staffCount} onChange={e => setStaffCount(Number(e.target.value) || 1)} className="mt-1.5 w-40 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold" />
            </label>
            <p className="text-sm text-slate-500">
              Bölüm ve unvanlar sektör seçimine göre personel adımında atanır.
            </p>
            {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
            <div className="flex justify-between pt-2">
              <button type="button" onClick={() => setStep('key')} className="font-bold text-slate-500">Geri</button>
              <button type="button" onClick={goCompanyNext} className="btn btn-dark">Sektörler</button>
            </div>
          </section>
        )}

        {step === 'sector' && (
          <section className="mt-8 space-y-4">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">4. Sektörler (çoklu)</h2>
              <p className="mt-1 text-sm text-slate-500">Bir firmada birden fazla hizmet türü olabilir. Seçilenlerin hizmetleri birleşir.</p>
              <p className="mt-2 text-xs font-bold text-brand-700">{sectorSlugs.length} seçili</p>
            </div>
            {grouped.map(g => (
              <div key={g.group} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{g.group}</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {g.sectors.map(s => {
                    const on = sectorSlugs.includes(s.slug);
                    return (
                      <button
                        key={s.slug}
                        type="button"
                        onClick={() => toggleSector(s.slug)}
                        className={`rounded-2xl px-4 py-3 text-left text-sm font-black ring-1 ${
                          on ? 'bg-brand-600 text-white ring-brand-600' : 'bg-slate-50 text-slate-800 ring-slate-200'
                        }`}
                      >
                        {on ? '✓ ' : ''}{s.name}
                        <span className={`mt-0.5 block text-[11px] font-semibold ${on ? 'text-white/80' : 'text-slate-500'}`}>
                          {s.services.length} hizmet
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {previewServices.length > 0 && (
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="font-black">Birleşik hizmet önizleme ({previewServices.length})</h3>
                <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm">
                  {previewServices.map(s => (
                    <li key={s.id} className="flex justify-between gap-2 rounded-xl bg-slate-50 px-3 py-1.5 font-semibold">
                      <span>{s.name}</span>
                      <span className="text-slate-500">
                        {s.durationMinutes} dk
                        {s.processingMinutes ? ` · ${s.processingMinutes} dk bekleme` : ''}
                        {' · '}₺{s.price}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
            <div className="flex justify-between pb-8">
              <button type="button" onClick={() => setStep('company')} className="font-bold text-slate-500">Geri</button>
              <button type="button" onClick={goSectorNext} className="btn btn-dark">Devam</button>
            </div>
          </section>
        )}

        {step === 'hours' && (
          <section className="mt-8 space-y-5 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-black">5. Mesai ve slot</h2>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Açılış</span>
                <input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Kapanış</span>
                <input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold" />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {SLOT_OPTIONS.map(n => (
                <button key={n} type="button" onClick={() => setSlotInterval(n)} className={`rounded-xl px-4 py-2 text-sm font-black ${slotInterval === n ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {n} dk
                </button>
              ))}
            </div>
            {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
            <div className="flex justify-between pt-2">
              <button type="button" onClick={() => setStep('sector')} className="font-bold text-slate-500">Geri</button>
              <button type="button" onClick={prepareStaff} className="btn btn-dark">Çalışanlar</button>
            </div>
          </section>
        )}

        {step === 'staff' && (
          <section className="mt-8 space-y-4">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">6. Çalışanlar + hizmet eşlemesi</h2>
              <p className="mt-1 text-sm text-slate-500">Her çalışanın hangi hizmetleri vereceğini işaretleyin.</p>
            </div>
            {staff.map((s, i) => (
              <article key={s.id} className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <label className="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-100">
                    {s.photo ? <img src={s.photo} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-xs font-bold text-slate-400">Foto</span>}
                    <input type="file" accept="image/*" className="hidden" onChange={e => readPhoto(i, e.target.files?.[0])} />
                  </label>
                  <div className="grid flex-1 grid-cols-2 gap-3">
                    <input placeholder="Ad" value={s.firstName} onChange={e => updateStaff(i, { firstName: e.target.value })} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold" />
                    <input placeholder="Soyad" value={s.lastName} onChange={e => updateStaff(i, { lastName: e.target.value })} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold" />
                    <input placeholder="Telefon" value={s.phone} onChange={e => updateStaff(i, { phone: e.target.value.replace(/\D/g, '').slice(0, 11) })} className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <label className="block">
                    <span className="text-[10px] font-black uppercase text-slate-400">Hitap / unvan</span>
                    <select
                      value={s.title}
                      onChange={e => updateStaff(i, { title: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold"
                    >
                      {sectorTitles.map(t => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase text-slate-400">Bölüm</span>
                    <select
                      value={s.departmentId}
                      onChange={e => updateStaff(i, { departmentId: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold"
                    >
                      {setupDepartments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase text-slate-400">Mesai başı</span>
                    <input type="time" value={s.workStart} onChange={e => updateStaff(i, { workStart: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold" />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase text-slate-400">Mesai sonu</span>
                    <input type="time" value={s.workEnd} onChange={e => updateStaff(i, { workEnd: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold" />
                  </label>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Hizmetler</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {draftServices.map(svc => {
                      const on = (s.serviceIds || []).includes(svc.id);
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={() => toggleStaffService(i, svc.id)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-black ${on ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                        >
                          {on ? '✓ ' : ''}{svc.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>
            ))}
            {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
            <div className="flex justify-between pb-8">
              <button type="button" onClick={() => setStep('hours')} className="font-bold text-slate-500">Geri</button>
              <button
                type="button"
                onClick={() => {
                  for (const s of staff) {
                    if (!s.firstName.trim() || !s.lastName.trim() || !s.phone.trim()) {
                      setError('Her çalışan için ad, soyad ve telefon girin.');
                      return;
                    }
                    if (!(s.serviceIds && s.serviceIds.length)) {
                      setError(`${s.firstName || 'Çalışan'} için en az bir hizmet seçin.`);
                      return;
                    }
                  }
                  setError('');
                  setStep('review');
                }}
                className="btn btn-dark"
              >
                Özet
              </button>
            </div>
          </section>
        )}

        {step === 'review' && (
          <section className="mt-8 space-y-4 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-black">7. Onay ve kayıt</h2>
            <p className="text-sm text-slate-500">
              Bitirince firma merkez sisteme kaydedilir. İnternet zorunludur; kayıt başarısızsa kurulum burada kalır.
            </p>
            <ul className="space-y-2 text-sm font-semibold text-slate-700">
              <li>Anahtar: {activationKey}</li>
              <li>Firma: {name}</li>
              <li>Sektörler: {selectedNames.join(', ')}</li>
              <li>Hizmet: {draftServices.length}</li>
              <li>Mesai: {workStart} – {workEnd} · {slotInterval} dk</li>
              <li>Çalışan: {staff.length}</li>
            </ul>
            {!navigator.onLine && (
              <p className="text-sm font-bold text-amber-700">Çevrimdışısınız — kayıt için internet açın.</p>
            )}
            {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
            {finishing && (
              <p className="text-sm font-bold text-brand-700">Firma sisteme kaydediliyor…</p>
            )}
            <div className="flex justify-between pt-4">
              <button
                type="button"
                disabled={finishing}
                onClick={() => setStep('staff')}
                className="font-bold text-slate-500 disabled:opacity-40"
              >
                Geri
              </button>
              <button
                type="button"
                disabled={finishing || !navigator.onLine}
                onClick={() => void finish()}
                className="btn btn-primary disabled:opacity-50"
              >
                {finishing ? 'Kaydediliyor…' : 'Kaydet ve bitir'}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
