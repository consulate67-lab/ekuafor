import { useEffect, useMemo, useState } from 'react';
import { DateField } from '../components/DateField';
import { IconBack } from '../components/Icons';
import { formatDateRangeTr, formatDateTr, todayKey } from '../lib/dates';
import {
  sessionAgeLabel,
  sessionOccupancy,
  subscriberFitsSessionAge,
} from '../lib/groupClass';
import { uid } from '../lib/id';
import { WEEKDAY_OPTIONS, endDateFromMonths } from '../lib/scheduleSubscriberProgram';
import {
  ageFromBirthDate,
  subscriberProfileForSectors,
} from '../lib/sectorSubscriberProfile';
import { useAppStore } from '../store/appStore';
import type { DependentProfile, Subscriber, SubscriberGender } from '../types';

const MONTH_PRESETS = [1, 3, 6, 12];

function debtOf(s: Subscriber) {
  const total = s.totalPrice ?? s.pricePaid ?? 0;
  return Math.max(0, total - (s.pricePaid || 0));
}

function labelOf(s: Subscriber) {
  return s.firstName ? `${s.firstName} ${s.lastName || ''}`.trim() : s.name;
}

function weekdayLabels(keys: number[]) {
  return WEEKDAY_OPTIONS.filter(w => keys.includes(w.key))
    .map(w => w.label)
    .join(', ');
}

export function Subscribers() {
  const subscribers = useAppStore(s => s.subscribers);
  const campaigns = useAppStore(s => s.campaigns);
  const services = useAppStore(s => s.services);
  const company = useAppStore(s => s.company);
  const groupSessions = useAppStore(s => s.groupSessions) || [];
  const events = useAppStore(s => s.events);
  const upsertSubscriber = useAppStore(s => s.upsertSubscriber);
  const upsertGroupSession = useAppStore(s => s.upsertGroupSession);
  const removeSubscriber = useAppStore(s => s.removeSubscriber);
  const recordSubscriberPayment = useAppStore(s => s.recordSubscriberPayment);
  const saveSubscriberProgramPlan = useAppStore(s => s.saveSubscriberProgramPlan);
  const applySubscriberProgramPlan = useAppStore(s => s.applySubscriberProgramPlan);
  const setScreen = useAppStore(s => s.setScreen);

  const today = useMemo(() => todayKey(), []);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const sectorSlugs = useMemo(
    () =>
      company?.sectorSlugs?.length
        ? company.sectorSlugs
        : company?.sectorSlug
          ? [company.sectorSlug]
          : [],
    [company?.sectorSlugs, company?.sectorSlug],
  );
  const profile = useMemo(() => subscriberProfileForSectors(sectorSlugs), [sectorSlugs]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<SubscriberGender>(profile.defaultGender);
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [pickId, setPickId] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [totalPrice, setTotalPrice] = useState(0);
  const [pricePaid, setPricePaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [petName, setPetName] = useState('');
  const [petSpecies, setPetSpecies] = useState('');
  const [petNote, setPetNote] = useState('');

  const [selectedId, setSelectedId] = useState('');
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<'cash' | 'card'>('cash');

  const [planMonths, setPlanMonths] = useState(3);
  const [customMonths, setCustomMonths] = useState(3);
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5]);
  const [planStart, setPlanStart] = useState(today);
  const [timeStart, setTimeStart] = useState(company?.workStart || '10:00');
  const [timeEnd, setTimeEnd] = useState(company?.workEnd || '18:00');
  const [planMsg, setPlanMsg] = useState('');

  useEffect(() => {
    setGender(g => (profile.genders.includes(g) ? g : profile.defaultGender));
  }, [profile]);

  const available = services.filter(s => !serviceIds.includes(s.id));
  const selected = subscribers.find(s => s.id === selectedId) || null;

  const matchingSessions = useMemo(() => {
    if (!profile.showGroupSessions || !serviceIds.length) return [];
    return [...groupSessions]
      .filter(gs => serviceIds.includes(gs.serviceId) && gs.date >= today)
      .sort((a, b) => (a.date === b.date ? (a.startTime < b.startTime ? -1 : 1) : a.date < b.date ? -1 : 1));
  }, [profile.showGroupSessions, serviceIds, groupSessions, today]);

  useEffect(() => {
    setSessionIds(prev => prev.filter(id => matchingSessions.some(s => s.id === id)));
  }, [matchingSessions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr');
    const list = [...subscribers].sort((a, b) => labelOf(a).localeCompare(labelOf(b), 'tr'));
    if (!q) return list;
    return list.filter(s => {
      const hay = `${labelOf(s)} ${s.phone} ${s.note || ''}`.toLocaleLowerCase('tr');
      return hay.includes(q);
    });
  }, [subscribers, search]);

  const monthsValue = MONTH_PRESETS.includes(planMonths) ? planMonths : Math.max(1, customMonths);
  const previewEnd = endDateFromMonths(planStart, monthsValue);

  const pickCampaign = (id: string) => {
    setCampaignId(id);
    const c = campaigns.find(x => x.id === id);
    if (!c) return;
    setServiceIds([...c.serviceIds]);
    setTotalPrice(c.price);
    setPricePaid(c.price);
    setStartDate(c.startDate < today ? today : c.startDate);
    setEndDate(c.endDate);
  };

  const addFromList = () => {
    if (!pickId || serviceIds.includes(pickId)) return;
    setServiceIds(prev => [...prev, pickId]);
    setPickId('');
  };

  const removeSvc = (id: string) => setServiceIds(prev => prev.filter(x => x !== id));

  const toggleSession = (id: string) => {
    setSessionIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const toggleDay = (d: number) => {
    setWeekdays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b)));
  };

  const selectSub = (id: string) => {
    setSelectedId(id);
    setShowCreate(false);
    setPlanMsg('');
    const s = subscribers.find(x => x.id === id);
    if (s?.programPlan) {
      setPlanStart(s.programPlan.startDate);
      setPlanMonths(MONTH_PRESETS.includes(s.programPlan.months) ? s.programPlan.months : 0);
      setCustomMonths(s.programPlan.months);
      setWeekdays([...s.programPlan.weekdays]);
      setTimeStart(s.programPlan.timeStart);
      setTimeEnd(s.programPlan.timeEnd);
    }
  };

  const save = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Ad ve soyad gerekli');
      return;
    }
    if (!phone.trim()) {
      setError('Telefon gerekli');
      return;
    }
    if (!serviceIds.length) {
      setError('Listeden hizmet ekleyin veya kampanya seçin');
      return;
    }
    if (profile.birthDate === 'required' && !birthDate) {
      setError('Doğum tarihi gerekli');
      return;
    }
    if (birthDate && ageFromBirthDate(birthDate) == null) {
      setError('Doğum tarihi geçersiz');
      return;
    }

    for (const sid of sessionIds) {
      const gs = groupSessions.find(g => g.id === sid);
      if (!gs) continue;
      const fit = subscriberFitsSessionAge(birthDate || undefined, gs);
      if (!fit.ok) {
        const label = gs.name || services.find(s => s.id === gs.serviceId)?.name || 'Seans';
        setError(`${label}: ${fit.reason}`);
        return;
      }
      const occ = sessionOccupancy(gs, events);
      if (occ.remaining <= 0 && !(gs.waitlistSubscriberIds || []).length) {
        /* kapasite doluysa bekleme listesine alınacak */
      }
    }

    const camp = campaignId ? campaigns.find(c => c.id === campaignId) : undefined;
    const uses = Math.max(1, camp?.usesPerService ?? 1);
    const remaining: Record<string, number> = {};
    for (const id of serviceIds) remaining[id] = (remaining[id] || 0) + uses;

    const fn = firstName.trim();
    const ln = lastName.trim();
    const paid = Math.max(0, pricePaid);
    const total = Math.max(paid, totalPrice);
    const dependents: DependentProfile[] | undefined =
      profile.showPet && petName.trim()
        ? [
            {
              id: uid('dep'),
              kind: 'pet',
              name: petName.trim(),
              speciesOrDetail: petSpecies.trim() || undefined,
              note: petNote.trim() || undefined,
            },
          ]
        : undefined;
    const row: Subscriber = {
      id: uid('sub'),
      firstName: fn,
      lastName: ln,
      name: `${fn} ${ln}`.trim(),
      gender,
      birthDate: birthDate || undefined,
      phone: phone.replace(/\D/g, '').slice(0, 11),
      campaignId: campaignId || undefined,
      serviceIds: [...serviceIds],
      remainingByService: remaining,
      startDate,
      endDate,
      totalPrice: total,
      pricePaid: paid,
      paymentMethod,
      payments:
        paid > 0
          ? [{ id: uid('pay'), amount: paid, method: paymentMethod, at: new Date().toISOString(), note: 'İlk ödeme' }]
          : [],
      enrolledGroupSessionIds: sessionIds.length ? [...sessionIds] : undefined,
      dependents,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    upsertSubscriber(row);

    const enrolled: string[] = [];
    const enrollErrors: string[] = [];
    for (const sid of sessionIds) {
      const fresh = useAppStore.getState();
      const gs = (fresh.groupSessions || []).find(g => g.id === sid);
      if (!gs) continue;
      const occ = sessionOccupancy(gs, fresh.events);
      const already = (gs.subscriberIds || []).includes(row.id);
      if (already) {
        enrolled.push(sid);
        continue;
      }
      if (occ.remaining > 0) {
        const result = upsertGroupSession({
          id: gs.id,
          name: gs.name,
          staffId: gs.staffId,
          serviceId: gs.serviceId,
          date: gs.date,
          startTime: gs.startTime,
          capacity: gs.capacity,
          minAge: gs.minAge ?? null,
          maxAge: gs.maxAge ?? null,
          subscriberIds: [...(gs.subscriberIds || []), row.id],
          waitlistSubscriberIds: gs.waitlistSubscriberIds,
        });
        if (result.ok) enrolled.push(sid);
        else enrollErrors.push(result.message);
      } else {
        const result = upsertGroupSession({
          id: gs.id,
          name: gs.name,
          staffId: gs.staffId,
          serviceId: gs.serviceId,
          date: gs.date,
          startTime: gs.startTime,
          capacity: gs.capacity,
          minAge: gs.minAge ?? null,
          maxAge: gs.maxAge ?? null,
          subscriberIds: [...(gs.subscriberIds || [])],
          waitlistSubscriberIds: [...(gs.waitlistSubscriberIds || []), row.id],
        });
        if (result.ok) enrolled.push(sid);
        else enrollErrors.push(result.message);
      }
    }
    if (enrolled.length) {
      upsertSubscriber({ ...row, enrolledGroupSessionIds: enrolled });
    }

    setSelectedId(row.id);
    setShowCreate(false);
    setFirstName('');
    setLastName('');
    setGender(profile.defaultGender);
    setBirthDate('');
    setPhone('');
    setCampaignId('');
    setServiceIds([]);
    setSessionIds([]);
    setPetName('');
    setPetSpecies('');
    setPetNote('');
    setTotalPrice(0);
    setPricePaid(0);
    setNote('');
    setError(enrollErrors.length ? enrollErrors[0] : '');
    if (enrollErrors.length) setPlanMsg(enrollErrors[0]);
  };

  const addPayment = () => {
    if (!selectedId || payAmount <= 0) return;
    recordSubscriberPayment({ subscriberId: selectedId, amount: payAmount, method: payMethod });
    setPayAmount(0);
  };

  const savePlan = () => {
    if (!selectedId) {
      setPlanMsg('Soldan abone seçin');
      return;
    }
    if (!weekdays.length) {
      setPlanMsg('En az bir gün seçin');
      return;
    }
    const res = saveSubscriberProgramPlan({
      subscriberId: selectedId,
      startDate: planStart,
      months: monthsValue,
      weekdays,
      timeStart,
      timeEnd,
    });
    setPlanMsg(res.message);
  };

  const applyPlan = () => {
    if (!selectedId) {
      setPlanMsg('Soldan abone seçin');
      return;
    }
    const res = applySubscriberProgramPlan(selectedId);
    setPlanMsg(res.message);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" title="Geri" aria-label="Geri" onClick={() => setScreen('settings')} className="btn btn-secondary btn-icon !min-h-11 !w-11">
            <IconBack />
          </button>
          <div>
            <h1 className="text-xl font-black sm:text-2xl">Aboneler</h1>
            <p className="text-xs font-semibold text-slate-500">Liste · borç · kayıtlı program planı</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCreate(true);
              setSelectedId('');
              setPlanMsg('');
            }}
            className="btn btn-primary ml-auto !min-h-11 !px-4"
          >
            + Yeni abone
          </button>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 gap-0 overflow-hidden sm:gap-4 sm:p-4">
        {/* Sol: arama + isim listesi */}
        <aside className="flex w-full max-w-[280px] shrink-0 flex-col border-r border-slate-200 bg-white sm:max-w-[300px] sm:rounded-3xl sm:border sm:shadow-sm">
          <div className="border-b border-slate-100 p-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Abone ara…"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold"
            />
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto p-2">
            {filtered.map(s => {
              const debt = debtOf(s);
              const on = selectedId === s.id && !showCreate;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => selectSub(s.id)}
                    className={`mb-1 w-full rounded-2xl px-3 py-3 text-left transition ${
                      on ? 'bg-brand-600 text-white' : 'hover:bg-slate-50'
                    }`}
                  >
                    <p className={`truncate font-black ${on ? 'text-white' : 'text-slate-900'}`}>{labelOf(s)}</p>
                    <p className={`truncate text-xs font-semibold ${on ? 'text-white/80' : 'text-slate-500'}`}>
                      {s.phone}
                      {debt > 0 ? ` · borç ₺${debt}` : ''}
                      {s.programPlan ? ' · planlı' : ''}
                    </p>
                  </button>
                </li>
              );
            })}
            {!filtered.length && (
              <p className="px-3 py-8 text-center text-sm font-bold text-slate-400">
                {subscribers.length ? 'Sonuç yok' : 'Henüz abone yok'}
              </p>
            )}
          </ul>
        </aside>

        {/* Sağ: detay / oluştur */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-slate-100 p-3 sm:bg-transparent sm:p-0">
          {showCreate ? (
            <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Abone oluştur</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ad" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold" />
                <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Soyad" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold" />
                <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="Telefon" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold" />
              </div>
              {profile.hint && (
                <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">{profile.hint}</p>
              )}
              <div className={`grid gap-2 ${profile.genders.length > 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-3'}`}>
                {profile.genders.map(g => (
                  <button key={g} type="button" onClick={() => setGender(g)} className={`rounded-2xl py-3 text-sm font-black ${gender === g ? 'bg-brand-600 text-white' : 'bg-slate-100'}`}>
                    {g}
                  </button>
                ))}
              </div>
              {profile.birthDate !== 'hidden' && (
                <label className="block text-xs font-black uppercase text-slate-400">
                  Doğum tarihi{profile.birthDate === 'required' ? ' *' : ''}
                  <DateField value={birthDate} onChange={setBirthDate} className="mt-1" max={today} />
                  {birthDate && ageFromBirthDate(birthDate) != null && (
                    <span className="mt-1 block text-sm font-bold normal-case text-slate-600">
                      Yaş: {ageFromBirthDate(birthDate)}
                    </span>
                  )}
                </label>
              )}
              <div className="flex flex-wrap gap-2">
                {campaigns.filter(c => c.active).map(c => (
                  <button key={c.id} type="button" onClick={() => pickCampaign(c.id)} className={`rounded-xl px-3 py-2 text-xs font-black ${campaignId === c.id ? 'bg-brand-600 text-white' : 'bg-slate-100'}`}>
                    {c.name} · ₺{c.price}
                    {(c.usesPerService ?? 1) > 1 ? ` · ${c.usesPerService} hak` : ''}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select value={pickId} onChange={e => setPickId(e.target.value)} className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold">
                  <option value="">Hizmet seç…</option>
                  {available.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button type="button" onClick={addFromList} disabled={!pickId} className="btn btn-dark !min-h-12 sm:w-28 disabled:opacity-40">Ekle</button>
              </div>
              {!!serviceIds.length && (
                <div className="flex flex-wrap gap-1.5">
                  {serviceIds.map(id => (
                    <button key={id} type="button" onClick={() => removeSvc(id)} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                      {services.find(x => x.id === id)?.name || id} ×
                    </button>
                  ))}
                </div>
              )}
              {profile.showGroupSessions && serviceIds.length > 0 && (
                <div className="space-y-2 rounded-2xl bg-violet-50/80 p-4 ring-1 ring-violet-100">
                  <p className="text-xs font-black uppercase text-violet-800">Tanımlı seanslar</p>
                  <p className="text-xs font-semibold text-violet-700/80">
                    Seçilen hizmete ait gelecek seanslar. İşaretlediklerinize abone kaydedilir.
                  </p>
                  {matchingSessions.length === 0 ? (
                    <p className="text-sm font-semibold text-violet-600/70">
                      Bu hizmetler için henüz seans yok. Önce Grup dersleri’nden tanımlayın.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {matchingSessions.map(gs => {
                        const occ = sessionOccupancy(gs, events);
                        const svc = services.find(s => s.id === gs.serviceId);
                        const fit = subscriberFitsSessionAge(birthDate || undefined, gs);
                        const on = sessionIds.includes(gs.id);
                        const ageTxt = sessionAgeLabel(gs);
                        return (
                          <li key={gs.id}>
                            <button
                              type="button"
                              disabled={!fit.ok && !!(gs.minAge != null || gs.maxAge != null)}
                              onClick={() => toggleSession(gs.id)}
                              className={`w-full rounded-2xl px-3 py-3 text-left ring-1 transition ${
                                on
                                  ? 'bg-violet-600 text-white ring-violet-600'
                                  : 'bg-white text-slate-800 ring-violet-100 hover:bg-violet-50'
                              } disabled:opacity-40`}
                            >
                              <p className="font-black">
                                {gs.name || svc?.name || 'Seans'} · {formatDateTr(gs.date)} {gs.startTime}
                              </p>
                              <p className={`text-xs font-semibold ${on ? 'text-white/80' : 'text-slate-500'}`}>
                                Doluluk {occ.booked}/{occ.capacity}
                                {occ.remaining <= 0 ? ' · bekleme listesi' : ''}
                                {ageTxt ? ` · ${ageTxt}` : ''}
                                {!fit.ok && fit.reason ? ` · ${fit.reason}` : ''}
                              </p>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <label className="text-xs font-black uppercase text-slate-400">Başlangıç<DateField value={startDate} onChange={setStartDate} className="mt-1" /></label>
                <label className="text-xs font-black uppercase text-slate-400">Bitiş<DateField value={endDate} onChange={setEndDate} className="mt-1" min={startDate} /></label>
                <label className="text-xs font-black uppercase text-slate-400">Paket ₺<input type="number" value={totalPrice} onChange={e => setTotalPrice(Number(e.target.value) || 0)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-bold" /></label>
                <label className="text-xs font-black uppercase text-slate-400">Peşin ₺<input type="number" value={pricePaid} onChange={e => setPricePaid(Number(e.target.value) || 0)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-bold" /></label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPaymentMethod('cash')} className={`rounded-2xl py-3 font-black ${paymentMethod === 'cash' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>Nakit</button>
                <button type="button" onClick={() => setPaymentMethod('card')} className={`rounded-2xl py-3 font-black ${paymentMethod === 'card' ? 'bg-sky-600 text-white' : 'bg-slate-100'}`}>Kart</button>
              </div>
              {profile.showPet && (
                <div className="space-y-2 rounded-2xl bg-amber-50/80 p-4 ring-1 ring-amber-100">
                  <p className="text-xs font-black uppercase text-amber-800">Pet bilgisi</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input value={petName} onChange={e => setPetName(e.target.value)} placeholder="Pet adı" className="rounded-2xl border border-amber-100 bg-white px-4 py-3 font-bold" />
                    <input value={petSpecies} onChange={e => setPetSpecies(e.target.value)} placeholder="Tür (köpek / kedi…)" className="rounded-2xl border border-amber-100 bg-white px-4 py-3 font-bold" />
                  </div>
                  <input value={petNote} onChange={e => setPetNote(e.target.value)} placeholder="Not (ırk, alerji…)" className="w-full rounded-2xl border border-amber-100 bg-white px-4 py-3 font-bold" />
                </div>
              )}
              {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
              <button type="button" onClick={save} className="btn btn-primary btn-block !min-h-12">Kaydet</button>
            </section>
          ) : selected ? (
            <div className="space-y-4">
              <section className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xl font-black">
                      {labelOf(selected)}
                      {selected.gender ? ` · ${selected.gender}` : ''}
                    </p>
                    <p className="text-sm font-semibold text-slate-500">
                      {selected.phone} · toplam ₺{selected.totalPrice ?? selected.pricePaid} · ödenen ₺{selected.pricePaid} · borç ₺{debtOf(selected)}
                    </p>
                    {(selected.birthDate || selected.gender) && (
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {selected.gender || ''}
                        {selected.birthDate
                          ? ` · ${formatDateTr(selected.birthDate)}${
                              ageFromBirthDate(selected.birthDate) != null
                                ? ` (${ageFromBirthDate(selected.birthDate)} yaş)`
                                : ''
                            }`
                          : ''}
                      </p>
                    )}
                    {!!selected.dependents?.length && (
                      <p className="mt-1 text-sm font-bold text-amber-800">
                        {selected.dependents.map(d => `${d.name}${d.speciesOrDetail ? ` (${d.speciesOrDetail})` : ''}`).join(' · ')}
                      </p>
                    )}
                    {!!selected.enrolledGroupSessionIds?.length && (
                      <p className="mt-1 text-sm font-bold text-violet-800">
                        {selected.enrolledGroupSessionIds.length} seansa kayıtlı
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => removeSubscriber(selected.id)} className="btn btn-danger-soft !min-h-10 !px-4">
                    Sil
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selected.serviceIds.map(id => (
                    <span key={id} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {services.find(x => x.id === id)?.name || id} ({selected.remainingByService[id] ?? 0})
                    </span>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input type="number" value={payAmount || ''} onChange={e => setPayAmount(Number(e.target.value) || 0)} placeholder="Tahsilat ₺" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold" />
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setPayMethod('cash')} className={`rounded-2xl py-3 font-black ${payMethod === 'cash' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>Nakit</button>
                    <button type="button" onClick={() => setPayMethod('card')} className={`rounded-2xl py-3 font-black ${payMethod === 'card' ? 'bg-sky-600 text-white' : 'bg-slate-100'}`}>Kart</button>
                  </div>
                  <button type="button" onClick={addPayment} className="btn btn-primary !min-h-12">Ödeme kaydet</button>
                </div>
              </section>

              <section className="space-y-3 rounded-3xl bg-white p-5 shadow-sm">
                <h3 className="text-lg font-black">Program planı</h3>
                <p className="text-xs font-semibold text-slate-500">
                  Önce planı kaydedin; sonra uygula ile tarih aralığındaki <strong>tüm seçili günlere</strong> randevu yerleşir (tek güne değil).
                </p>

                {selected.programPlan && (
                  <div className="rounded-2xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-900 ring-1 ring-violet-100">
                    Kayıtlı plan: {formatDateRangeTr(selected.programPlan.startDate, selected.programPlan.endDate)}
                    <br />
                    {weekdayLabels(selected.programPlan.weekdays)} · {selected.programPlan.timeStart}–{selected.programPlan.timeEnd}
                    {selected.programPlan.appliedAt
                      ? ` · uygulandı (${selected.programPlan.eventIds?.length || 0} randevu)`
                      : ' · henüz uygulanmadı'}
                  </div>
                )}

                <label className="block text-xs font-black uppercase text-slate-400">
                  Plan başlangıç
                  <DateField value={planStart} onChange={setPlanStart} className="mt-1" />
                </label>
                <p className="text-sm font-bold text-slate-600">Bitiş (önizleme): {formatDateTr(previewEnd)}</p>

                <div>
                  <p className="text-xs font-black uppercase text-slate-400">Haftanın günleri</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {WEEKDAY_OPTIONS.map(d => (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => toggleDay(d.key)}
                        className={`rounded-xl px-3 py-2 text-sm font-black ${weekdays.includes(d.key) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-black uppercase text-slate-400">
                    Saat başı
                    <input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 font-bold" />
                  </label>
                  <label className="text-xs font-black uppercase text-slate-400">
                    Saat sonu
                    <input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 font-bold" />
                  </label>
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-slate-400">Süre</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {MONTH_PRESETS.map(m => (
                      <button key={m} type="button" onClick={() => setPlanMonths(m)} className={`rounded-xl px-3 py-2 text-sm font-black ${planMonths === m ? 'bg-violet-600 text-white' : 'bg-slate-100'}`}>
                        {m} ay
                      </button>
                    ))}
                    <button type="button" onClick={() => setPlanMonths(0)} className={`rounded-xl px-3 py-2 text-sm font-black ${planMonths === 0 ? 'bg-violet-600 text-white' : 'bg-slate-100'}`}>
                      Özel
                    </button>
                  </div>
                  {planMonths === 0 && (
                    <input type="number" min={1} max={36} value={customMonths} onChange={e => setCustomMonths(Math.max(1, Number(e.target.value) || 1))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 font-bold" />
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button type="button" onClick={savePlan} className="btn btn-dark btn-block !min-h-12">
                    1 · Planı kaydet
                  </button>
                  <button type="button" onClick={applyPlan} className="btn btn-primary btn-block !min-h-12">
                    2 · Plana göre randevu oluştur
                  </button>
                </div>
                {planMsg && <p className="text-sm font-bold text-slate-700">{planMsg}</p>}
              </section>
            </div>
          ) : (
            <div className="flex h-full min-h-[240px] items-center justify-center rounded-3xl bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-bold text-slate-400">Soldan abone seçin veya yeni abone ekleyin</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
