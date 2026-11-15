import { useMemo, useState } from 'react';
import { DateField } from '../components/DateField';
import { IconBack } from '../components/Icons';
import { formatDateTr, todayKey } from '../lib/dates';
import {
  eligibleSubscribers,
  expandWeekdayDates,
  groupParticipantLabel,
  groupSessionEndTime,
  isClassService,
  serviceCapacity,
  sessionAgeLabel,
  sessionOccupancy,
  staffForGroupService,
  subscriberGroupConflict,
  subscriberLabel,
  subscriberRightsForService,
} from '../lib/groupClass';
import { subscriberProfileForSectors } from '../lib/sectorSubscriberProfile';
import { WEEKDAY_OPTIONS } from '../lib/scheduleSubscriberProgram';
import { useAppStore } from '../store/appStore';
import type { GroupSession } from '../types';

type View = 'list' | 'form';

export function GroupClasses() {
  const company = useAppStore(s => s.company)!;
  const services = useAppStore(s => s.services);
  const staff = useAppStore(s => s.staff);
  const subscribers = useAppStore(s => s.subscribers);
  const groupSessions = useAppStore(s => s.groupSessions) || [];
  const events = useAppStore(s => s.events);
  const upsertGroupSession = useAppStore(s => s.upsertGroupSession);
  const removeGroupSession = useAppStore(s => s.removeGroupSession);
  const setScreen = useAppStore(s => s.setScreen);

  const classServices = useMemo(
    () => services.filter(s => isClassService(s)),
    [services],
  );
  const sectorSlugs = useMemo(
    () =>
      company.sectorSlugs?.length
        ? company.sectorSlugs
        : company.sectorSlug
          ? [company.sectorSlug]
          : [],
    [company.sectorSlugs, company.sectorSlug],
  );
  const participantLabel = useMemo(() => groupParticipantLabel(sectorSlugs), [sectorSlugs]);
  const ageRelevant = useMemo(
    () => subscriberProfileForSectors(sectorSlugs).ageRelevant,
    [sectorSlugs],
  );
  const today = useMemo(() => todayKey(), []);

  const [view, setView] = useState<View>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerSearched, setPickerSearched] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [name, setName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  /** Atanan tarihler (çoklu) */
  const [dates, setDates] = useState<string[]>([today]);
  const [draftDate, setDraftDate] = useState(today);
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5]);
  const [weeks, setWeeks] = useState(4);
  const [startTime, setStartTime] = useState(company.workStart || '10:00');
  const [capacity, setCapacity] = useState(8);
  const [minAge, setMinAge] = useState<string>('');
  const [maxAge, setMaxAge] = useState<string>('');
  const [subscriberIds, setSubscriberIds] = useState<string[]>([]);
  const [waitlistIds, setWaitlistIds] = useState<string[]>([]);

  const assignStaffForService = (svcId: string) => {
    const id = staffForGroupService(staff, svcId);
    setStaffId(id);
    return id;
  };

  const addDate = (iso: string) => {
    if (!iso) return;
    setDates(prev => (prev.includes(iso) ? prev : [...prev, iso].sort()));
  };

  const removeDate = (iso: string) => {
    setDates(prev => prev.filter(d => d !== iso));
  };

  const applyWeekdays = () => {
    const generated = expandWeekdayDates(draftDate || today, weekdays, weeks);
    if (!generated.length) {
      setError('Haftanın en az bir gününü seçin');
      return;
    }
    setDates(prev => [...new Set([...prev, ...generated])].sort());
    setError('');
  };

  const resetForm = () => {
    setEditId(null);
    setName('');
    const firstSvc = classServices[0]?.id || '';
    setServiceId(firstSvc);
    setStaffId(firstSvc ? staffForGroupService(staff, firstSvc) : '');
    setDates([today]);
    setDraftDate(today);
    setWeekdays([1, 3, 5]);
    setWeeks(4);
    setStartTime(company.workStart || '10:00');
    setCapacity(classServices[0] ? serviceCapacity(classServices[0]) : 8);
    setMinAge('');
    setMaxAge('');
    setSubscriberIds([]);
    setWaitlistIds([]);
    setPickerOpen(false);
    setPickerQuery('');
    setPickerSearched(false);
    setError('');
  };

  const openNew = () => {
    resetForm();
    setMsg('');
    setView('form');
  };

  const loadSession = (gs: GroupSession) => {
    setEditId(gs.id);
    setName(gs.name || '');
    setServiceId(gs.serviceId);
    setStaffId(gs.staffId || staffForGroupService(staff, gs.serviceId));
    setDates([gs.date]);
    setDraftDate(gs.date);
    setStartTime(gs.startTime);
    setCapacity(gs.capacity);
    setMinAge(gs.minAge != null ? String(gs.minAge) : '');
    setMaxAge(gs.maxAge != null ? String(gs.maxAge) : '');
    setSubscriberIds([...(gs.subscriberIds || [])]);
    setWaitlistIds([...(gs.waitlistSubscriberIds || [])]);
    setPickerOpen(false);
    setPickerQuery('');
    setPickerSearched(false);
    setError('');
    setMsg('');
    setView('form');
  };

  const onServiceChange = (id: string) => {
    setServiceId(id);
    const svc = services.find(s => s.id === id);
    setCapacity(serviceCapacity(svc));
    assignStaffForService(id);
    setSubscriberIds(prev =>
      prev.filter(sid => {
        const sub = subscribers.find(s => s.id === sid);
        if (!sub) return false;
        return (
          subscriberRightsForService(sub, id, services).left > 0 ||
          sub.serviceIds.includes(id)
        );
      }),
    );
  };

  const conflictFor = (subscriberId: string, onDate: string) =>
    subscriberGroupConflict(groupSessions, services, {
      subscriberId,
      date: onDate,
      startTime,
      serviceId,
      excludeSessionId: editId || undefined,
    });

  const addSubscriber = (id: string, asWaitlist = false) => {
    if (subscriberIds.includes(id) || waitlistIds.includes(id)) return;
    if (!dates.length) {
      setError('Önce en az bir tarih atayın');
      return;
    }
    for (const d of dates) {
      const conflict = conflictFor(id, d);
      if (conflict) {
        const cName =
          conflict.name ||
          services.find(s => s.id === conflict.serviceId)?.name ||
          'başka grup';
        setError(
          `Bu ${participantLabel.toLocaleLowerCase('tr')} ${formatDateTr(conflict.date)} ${conflict.startTime} saatinde “${cName}” dersinde`,
        );
        return;
      }
    }
    if (asWaitlist || subscriberIds.length >= capacity) {
      setError('');
      setWaitlistIds(prev => [...prev, id]);
      setPickerOpen(false);
      setPickerQuery('');
      setPickerSearched(false);
      setMsg(`${participantLabel} bekleme listesine alındı`);
      return;
    }
    setError('');
    setSubscriberIds(prev => [...prev, id]);
    setPickerOpen(false);
    setPickerQuery('');
    setPickerSearched(false);
  };

  const removeSubscriber = (id: string) => {
    setSubscriberIds(prev => prev.filter(x => x !== id));
  };

  const promoteFromWaitlist = (id: string) => {
    if (subscriberIds.length >= capacity) {
      setError(`Kapasite dolu (${capacity})`);
      return;
    }
    setWaitlistIds(prev => prev.filter(x => x !== id));
    setSubscriberIds(prev => [...prev, id]);
    setError('');
  };

  const primaryDate = dates[0] || today;

  const pickerResults = useMemo(() => {
    if (!serviceId || !pickerSearched) return [];
    const q = pickerQuery.trim();
    if (!q) return [];
    return eligibleSubscribers(subscribers, serviceId, primaryDate, q, services).filter(
      s => !subscriberIds.includes(s.id) && !waitlistIds.includes(s.id),
    );
  }, [
    serviceId,
    pickerSearched,
    pickerQuery,
    subscribers,
    primaryDate,
    services,
    subscriberIds,
    waitlistIds,
  ]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    const list = [...groupSessions].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.startTime < b.startTime ? 1 : -1;
    });
    if (!q) return list;
    return list.filter(gs => {
      const svc = services.find(s => s.id === gs.serviceId)?.name || '';
      const who = staff.find(s => s.id === gs.staffId);
      const staffLabel = who ? `${who.firstName} ${who.lastName}` : '';
      const names = (gs.subscriberIds || [])
        .map(id => {
          const s = subscribers.find(x => x.id === id);
          return s ? subscriberLabel(s) : '';
        })
        .join(' ');
      return `${gs.name || ''} ${svc} ${staffLabel} ${names} ${gs.date}`
        .toLocaleLowerCase('tr-TR')
        .includes(q);
    });
  }, [groupSessions, search, services, staff, subscribers]);

  const assignedStaff = staff.find(s => s.id === staffId);
  const endPreview =
    serviceId && startTime ? groupSessionEndTime(startTime, serviceId, services) : '';

  const save = () => {
    setError('');
    setMsg('');
    if (!serviceId) {
      setError('Grup dersi hizmeti seçin');
      return;
    }
    if (!dates.length || !startTime) {
      setError('En az bir tarih ve saat atayın');
      return;
    }
    const resolvedStaff = staffId || staffForGroupService(staff, serviceId);
    if (!resolvedStaff) {
      setError('Bu hizmeti verecek çalışan tanımlı değil');
      return;
    }
    const parsedMin = minAge.trim() === '' ? null : Math.max(0, Number(minAge));
    const parsedMax = maxAge.trim() === '' ? null : Math.max(0, Number(maxAge));
    if (parsedMin != null && Number.isNaN(parsedMin)) {
      setError('Alt yaş geçersiz');
      return;
    }
    if (parsedMax != null && Number.isNaN(parsedMax)) {
      setError('Üst yaş geçersiz');
      return;
    }
    if (parsedMin != null && parsedMax != null && parsedMin > parsedMax) {
      setError('Alt yaş üst yaştan büyük olamaz');
      return;
    }
    for (const d of dates) {
      for (const sid of subscriberIds) {
        const conflict = conflictFor(sid, d);
        if (conflict) {
          const sub = subscribers.find(s => s.id === sid);
          const cName =
            conflict.name ||
            services.find(s => s.id === conflict.serviceId)?.name ||
            'başka grup';
          setError(
            `${sub ? subscriberLabel(sub) : participantLabel} ${formatDateTr(conflict.date)} ${conflict.startTime} “${cName}” dersinde`,
          );
          return;
        }
      }
    }

    // Düzenleme: tek seans / tek tarih
    if (editId) {
      const result = upsertGroupSession({
        id: editId,
        name,
        staffId: resolvedStaff,
        serviceId,
        date: dates[0],
        startTime,
        capacity,
        minAge: parsedMin,
        maxAge: parsedMax,
        subscriberIds,
        waitlistSubscriberIds: waitlistIds,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMsg(result.message);
      setView('list');
      resetForm();
      return;
    }

    // Yeni: her tarih için ayrı seans (çalışana otomatik)
    let okCount = 0;
    const errors: string[] = [];
    for (const d of dates) {
      const result = upsertGroupSession({
        name,
        staffId: resolvedStaff,
        serviceId,
        date: d,
        startTime,
        capacity,
        minAge: parsedMin,
        maxAge: parsedMax,
        subscriberIds,
        waitlistSubscriberIds: waitlistIds,
      });
      if (result.ok) okCount += 1;
      else errors.push(`${formatDateTr(d)}: ${result.message}`);
    }
    if (!okCount) {
      setError(errors[0] || 'Kayıt başarısız');
      return;
    }
    setMsg(
      errors.length
        ? `${okCount} tarih atandı · ${errors.length} atlanamadı`
        : `${okCount} tarih için grup dersi tanımlandı`,
    );
    setView('list');
    resetForm();
  };

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            title="Geri"
            aria-label="Geri"
            onClick={() => (view === 'form' ? setView('list') : setScreen('settings'))}
            className="btn btn-secondary btn-icon !min-h-12 !w-12"
          >
            <IconBack className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Grup dersleri</p>
            <h1 className="truncate text-xl font-black text-slate-900">
              {view === 'form' ? (editId ? 'Dersi düzenle' : 'Yeni grup dersi') : 'Tanımlı seanslar'}
            </h1>
          </div>
          {view === 'list' && (
            <button type="button" onClick={openNew} className="btn btn-primary !min-h-11 !px-4">
              + Tanımla
            </button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {msg && view === 'list' && (
          <p className="mb-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{msg}</p>
        )}

        {view === 'list' && (
          <section className="space-y-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ara: ders, çalışan, abone…"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold"
            />
            {classServices.length === 0 && (
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                Önce Parametre → Hizmet’te rezervasyon tipini “Grup dersi” yapın.
              </p>
            )}
            {filtered.length === 0 ? (
              <p className="py-12 text-center text-sm font-bold text-slate-400">
                Henüz grup dersi yok. Tarih/saat programı + abone ile tanımlayın.
              </p>
            ) : (
              filtered.map(gs => {
                const occ = sessionOccupancy(gs, events);
                const svc = services.find(s => s.id === gs.serviceId);
                const who = staff.find(s => s.id === gs.staffId);
                const end = groupSessionEndTime(gs.startTime, gs.serviceId, services);
                const names = (gs.subscriberIds || [])
                  .map(id => {
                    const s = subscribers.find(x => x.id === id);
                    return s ? subscriberLabel(s) : null;
                  })
                  .filter(Boolean) as string[];
                return (
                  <article key={gs.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-black text-slate-900">
                          {gs.name || svc?.name || 'Grup dersi'}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          Program: {formatDateTr(gs.date)} · {gs.startTime}–{end}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-500">
                          Çalışan: {who ? `${who.firstName} ${who.lastName}` : '—'}
                          {gs.name && svc ? ` · ${svc.name}` : ''}
                        </p>
                        <p className="mt-1 text-sm font-black text-emerald-800">
                          Doluluk {occ.booked}/{occ.capacity}
                          {occ.remaining === 0 ? ' · dolu' : ` · ${occ.remaining} yer`}
                          {(gs.waitlistSubscriberIds?.length || 0) > 0
                            ? ` · bekleme ${gs.waitlistSubscriberIds!.length}`
                            : ''}
                          {sessionAgeLabel(gs) ? ` · ${sessionAgeLabel(gs)}` : ''}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-slate-600">
                          {names.length
                            ? `${participantLabel}ler: ${names.join(', ')}`
                            : `${participantLabel} seçilmedi`}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2">
                        <button type="button" onClick={() => loadSession(gs)} className="btn btn-secondary !min-h-10 !px-3">
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Bu grup dersi silinsin mi? Abone hakları iade edilir.')) {
                              removeGroupSession(gs.id);
                              setMsg('Grup dersi silindi');
                            }
                          }}
                          className="btn btn-danger-soft !min-h-10 !px-3"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        )}

        {view === 'form' && (
          <section className="mx-auto max-w-xl space-y-4 rounded-3xl bg-white p-6 shadow-sm">
            {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}

            <label className="block text-xs font-black uppercase text-slate-400">
              Seans adı (opsiyonel)
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Örn. Salı Yoga A"
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold"
              />
            </label>

            <label className="block text-xs font-black uppercase text-slate-400">
              Grup hizmeti
              <select
                value={serviceId}
                onChange={e => onServiceChange(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold"
              >
                <option value="">Seçin</option>
                {classServices.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.durationMinutes} dk · kap. {serviceCapacity(s)}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Program → çalışana otomatik
              </p>
              <p className="mt-1 text-sm font-black text-slate-800">
                {assignedStaff
                  ? `${assignedStaff.firstName} ${assignedStaff.lastName}`
                  : 'Bu hizmeti veren çalışan bulunamadı'}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                Hizmeti verebilen çalışana panelde bu tarih/saat atanır
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase text-slate-400">
                Tarih atamaları ({dates.length})
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {editId
                  ? 'Düzenlemede tek tarih güncellenir. Yeni seans için birden fazla tarih ekleyebilirsiniz.'
                  : 'Her tarih için aynı saat/abonelerle ayrı seans oluşur ve çalışana atanır.'}
              </p>

              <label className="mt-3 block text-xs font-black uppercase text-slate-400">
                Saat
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 font-bold"
                />
              </label>
              {endPreview && (
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Seans süresi: {startTime}–{endPreview}
                </p>
              )}

              {!editId && (
                <div className="mt-3 space-y-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Haftalık programdan ekle
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAY_OPTIONS.map(w => {
                      const on = weekdays.includes(w.key);
                      return (
                        <button
                          key={w.key}
                          type="button"
                          onClick={() =>
                            setWeekdays(prev =>
                              on ? prev.filter(x => x !== w.key) : [...prev, w.key].sort((a, b) => a - b),
                            )
                          }
                          className={`rounded-xl px-3 py-2 text-sm font-black ${
                            on ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
                          }`}
                        >
                          {w.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-black uppercase text-slate-400">
                      Başlangıç
                      <div className="mt-1">
                        <DateField value={draftDate} onChange={setDraftDate} />
                      </div>
                    </label>
                    <label className="text-xs font-black uppercase text-slate-400">
                      Hafta sayısı
                      <select
                        value={weeks}
                        onChange={e => setWeeks(Number(e.target.value) || 4)}
                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 font-bold"
                      >
                        {[1, 2, 4, 8, 12].map(n => (
                          <option key={n} value={n}>
                            {n} hafta
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button type="button" onClick={applyWeekdays} className="btn btn-secondary btn-block !min-h-11">
                    Seçili günleri tarihlere ekle
                  </button>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <div className="min-w-0 flex-1">
                  <DateField
                    value={draftDate}
                    onChange={iso => {
                      setDraftDate(iso);
                      if (editId) setDates([iso]);
                    }}
                  />
                </div>
                {!editId && (
                  <button
                    type="button"
                    onClick={() => addDate(draftDate)}
                    className="btn btn-dark !min-h-12 !px-4"
                  >
                    Tarih ekle
                  </button>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {dates.length === 0 ? (
                  <p className="text-sm font-semibold text-slate-400">Tarih yok — ekleyin</p>
                ) : (
                  dates.map(d => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-950 ring-1 ring-emerald-100"
                    >
                      {formatDateTr(d)}
                      {!editId && (
                        <button
                          type="button"
                          onClick={() => removeDate(d)}
                          className="text-xs text-rose-600"
                          aria-label="Tarihi çıkar"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))
                )}
              </div>
            </div>

            <label className="block text-xs font-black uppercase text-slate-400">
              Kapasite
              <input
                type="number"
                min={1}
                max={500}
                value={capacity}
                onChange={e => setCapacity(Math.max(1, Number(e.target.value) || 1))}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold"
              />
            </label>

            {ageRelevant && (
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-black uppercase text-slate-400">
                  Min yaş
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={minAge}
                    onChange={e => setMinAge(e.target.value)}
                    placeholder="—"
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold"
                  />
                </label>
                <label className="text-xs font-black uppercase text-slate-400">
                  Max yaş
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={maxAge}
                    onChange={e => setMaxAge(e.target.value)}
                    placeholder="—"
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold"
                  />
                </label>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black uppercase text-slate-400">
                  {participantLabel}ler ({subscriberIds.length}/{capacity})
                </p>
                <button
                  type="button"
                  disabled={!serviceId}
                  onClick={() => {
                    setPickerOpen(true);
                    setPickerQuery('');
                    setPickerSearched(false);
                    setError('');
                  }}
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40"
                >
                  {participantLabel} ara / liste
                </button>
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Paketi olan aboneler aranır. Kapasite dolunca bekleme listesine alınır. Aynı tarih/saatte başka grupta olan eklenemez.
              </p>

              <div className="mt-2 space-y-2">
                {subscriberIds.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-400">
                    Henüz {participantLabel.toLocaleLowerCase('tr')} eklenmedi
                  </p>
                ) : (
                  subscriberIds.map(id => {
                    const s = subscribers.find(x => x.id === id);
                    if (!s) return null;
                    const rights = subscriberRightsForService(s, serviceId, services);
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100"
                      >
                        <div>
                          <p className="font-black text-emerald-950">{subscriberLabel(s)}</p>
                          <p className="text-xs font-semibold text-emerald-800/80">
                            {s.phone} · hak {rights.left}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSubscriber(id)}
                          className="text-xs font-black text-rose-600"
                        >
                          Çıkar
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {waitlistIds.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-black uppercase text-amber-700">
                    Bekleme ({waitlistIds.length})
                  </p>
                  {waitlistIds.map(id => {
                    const s = subscribers.find(x => x.id === id);
                    if (!s) return null;
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-100"
                      >
                        <p className="font-black text-amber-950">{subscriberLabel(s)}</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => promoteFromWaitlist(id)}
                            className="text-xs font-black text-emerald-700"
                          >
                            Al
                          </button>
                          <button
                            type="button"
                            onClick={() => setWaitlistIds(prev => prev.filter(x => x !== id))}
                            className="text-xs font-black text-rose-600"
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setView('list');
                  resetForm();
                }}
                className="btn btn-secondary flex-1 !min-h-12"
              >
                Vazgeç
              </button>
              <button type="button" onClick={save} className="btn btn-primary flex-1 !min-h-12">
                Kaydet
              </button>
            </div>
          </section>
        )}
      </div>

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-lg space-y-3 rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-black">{participantLabel} ara</h3>
            <p className="text-xs font-semibold text-slate-500">
              Ad veya telefon yazıp Listele’ye basın. Kapasite doluysa bekleme listesine alınır.
            </p>
            <div className="flex gap-2">
              <input
                value={pickerQuery}
                onChange={e => {
                  setPickerQuery(e.target.value);
                  setPickerSearched(false);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (pickerQuery.trim()) setPickerSearched(true);
                  }
                }}
                placeholder="Ad / telefon…"
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold"
                autoFocus
              />
              <button
                type="button"
                disabled={!pickerQuery.trim()}
                onClick={() => setPickerSearched(true)}
                className="btn btn-dark !min-h-12 !px-4 disabled:opacity-40"
              >
                Listele
              </button>
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {!pickerSearched ? (
                <p className="py-6 text-center text-sm font-semibold text-slate-400">
                  Arama yapın — tüm aboneler burada listelenmez
                </p>
              ) : pickerResults.length === 0 ? (
                <p className="py-6 text-center text-sm font-semibold text-slate-400">
                  Eşleşen abone yok
                </p>
              ) : (
                pickerResults.map(s => {
                  const rights = subscriberRightsForService(s, serviceId, services);
                  const conflict = dates
                    .map(d => conflictFor(s.id, d))
                    .find(Boolean) || null;
                  const full = subscriberIds.length >= capacity;
                  const blocked = !!conflict;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={blocked}
                      onClick={() => addSubscriber(s.id, full)}
                      className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-left font-bold text-slate-800 ring-1 ring-slate-200 disabled:opacity-40"
                    >
                      <span>
                        {subscriberLabel(s)}
                        <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                          {s.phone} · hak {rights.left}
                          {conflict
                            ? ` · çakışma ${conflict.startTime}`
                            : ''}
                        </span>
                      </span>
                      <span className="text-xs font-black text-emerald-700">
                        {conflict ? 'Çakışma' : 'Ekle'}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setPickerOpen(false);
                setPickerQuery('');
                setPickerSearched(false);
              }}
              className="btn btn-secondary btn-block !min-h-12"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
