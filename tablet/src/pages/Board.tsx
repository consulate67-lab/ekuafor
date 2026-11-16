import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useAppStore } from '../store/appStore';
import {
  addDays,
  dayLabel,
  formatDateTr,
  monthGrid,
  monthLabel,
  parseKey,
  shiftMonth,
  todayKey,
  toMinutes,
} from '../lib/dates';
import {
  generateSlots,
  nowMinutes,
  nowSlotIndex,
  overlapsSlotWindow,
  slotEnd,
  spanSlots,
} from '../lib/slots';
import {
  appointmentTimeline,
  processingWindow,
  staffBusyIntervals,
} from '../lib/processingWindows';
import { companyHoursForDate, hoursLabel, staffHoursForDate } from '../lib/workHours';
import {
  appointmentColorIndexMap,
  colorForAppointment,
} from '../lib/appointmentColors';
import { AppointmentTimeline } from '../components/AppointmentTimeline';
import {
  isEmbeddedBrowser,
  listenOnce,
  speechErrorMessage,
  speechSupported,
} from '../lib/speech';
import { IconExpense, IconReport, IconSettings } from '../components/Icons';
import {
  fetchPendingAppointments,
  setPendingAppointmentStatus,
  type PendingAppointment,
} from '../lib/pendingAppointments';
import { PENDING_REMINDER_MS, playPendingAlert, unlockPendingAlertAudio } from '../lib/pendingAlert';
import { titleLabel } from '../lib/staffRoles';
import {
  eligibleSubscribers,
  findGroupSession,
  groupSessionsCoveringSlot,
  isClassService,
  serviceCapacity,
  sessionAttendees,
  sessionOccupancy,
  sessionRemaining,
  sessionsForDate,
  subscriberLabel,
} from '../lib/groupClass';
import { type DayEvent } from '../types';

const BASE_COL_W = 88;
const BASE_STAFF_COL_W = 240;

function boardScale(staffCount: number) {
  if (staffCount <= 2) return 1.2;
  if (staffCount <= 4) return 1.05;
  if (staffCount <= 6) return 1;
  if (staffCount <= 9) return 0.88;
  if (staffCount <= 12) return 0.78;
  return 0.68;
}

export function Board() {
  const company = useAppStore(s => s.company)!;
  const staff = useAppStore(s => s.staff);
  const departments = useAppStore(s => s.departments);
  const services = useAppStore(s => s.services);
  const events = useAppStore(s => s.events);
  const expenses = useAppStore(s => s.expenses);
  const selectedDate = useAppStore(s => s.selectedDate);
  const setSelectedDate = useAppStore(s => s.setSelectedDate);
  const setScreen = useAppStore(s => s.setScreen);
  const addAppointment = useAppStore(s => s.addAppointment);
  const bookCampaignBlock = useAppStore(s => s.bookCampaignBlock);
  const assignGroupSession = useAppStore(s => s.assignGroupSession);
  const enrollSubscribersToClass = useAppStore(s => s.enrollSubscribersToClass);
  const removeGroupSession = useAppStore(s => s.removeGroupSession);
  const groupSessions = useAppStore(s => s.groupSessions) || [];
  const addLeave = useAppStore(s => s.addLeave);
  const completeAppointment = useAppStore(s => s.completeAppointment);
  const setEventStatus = useAppStore(s => s.setEventStatus);
  const addExpense = useAppStore(s => s.addExpense);
  const campaigns = useAppStore(s => s.campaigns);
  const subscribers = useAppStore(s => s.subscribers);
  const deviceId = useAppStore(s => s.deviceId);
  const ingestApprovedWebAppointment = useAppStore(s => s.ingestApprovedWebAppointment);

  type Sheet =
    | {
        mode: 'appointment';
        staffId: string;
        startTime: string;
        step: 'service' | 'name';
        /** Bekleme aralığında araya iş — bitiş sınırı HH:mm */
        insertUntil?: string;
        insertFromEventId?: string;
      }
    | { mode: 'groupClass'; staffId: string; startTime: string; serviceId: string }
    | { mode: 'leave'; staffId: string; startTime: string }
    | { mode: 'complete'; event: DayEvent }
    | { mode: 'expense'; staffId: string }
    | { mode: 'detail'; event: DayEvent }
    | { mode: 'pending' };

  const scrollRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const scrolledToNowForDate = useRef<string | null>(null);
  const knownPendingIdsRef = useRef<Set<number>>(new Set());
  const lastPendingReminderRef = useRef(0);

  const [tick, setTick] = useState(0);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [pendingList, setPendingList] = useState<PendingAppointment[]>([]);
  const [pendingBusyId, setPendingBusyId] = useState<number | null>(null);
  const [pendingMsg, setPendingMsg] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [subscriberId, setSubscriberId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [bookMsg, setBookMsg] = useState('');
  const [groupQuery, setGroupQuery] = useState('');
  const [groupSelected, setGroupSelected] = useState<string[]>([]);
  const [collected, setCollected] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  /** Abone tamamlamada: ödeme alındı mı? */
  const [subscriberPaid, setSubscriberPaid] = useState(false);
  const [consentOk, setConsentOk] = useState(false);
  const [leaveDuration, setLeaveDuration] = useState(60);
  const [note, setNote] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calYear, setCalYear] = useState(() => parseKey(selectedDate).y);
  const [calMonth, setCalMonth] = useState(() => parseKey(selectedDate).m);

  const dayHours = useMemo(
    () => companyHoursForDate(company, selectedDate),
    [
      company.workStart,
      company.workEnd,
      company.weekendWorkStart,
      company.weekendWorkEnd,
      company.weekendClosed,
      selectedDate,
    ],
  );

  const allSlots = useMemo(
    () =>
      dayHours.closed
        ? []
        : generateSlots(dayHours.workStart, dayHours.workEnd, company.slotInterval),
    [dayHours, company.slotInterval],
  );

  const dayEvents = useMemo(
    () => events.filter(e => e.date === selectedDate && e.status !== 'cancelled'),
    [events, selectedDate],
  );

  const isToday = selectedDate === todayKey();
  const currentMin = nowMinutes();
  /** Bugün: tüm gün saatleri (geçmiş + kalan); varsayılan kaydırma “şimdi”ye */
  const slots = allSlots;
  const scale = boardScale(staff.length);
  const COL_W = Math.round(BASE_COL_W * scale);
  const STAFF_COL_W = Math.round(BASE_STAFF_COL_W * Math.min(1.1, scale + 0.05));
  const ROW_H = Math.round(80 * scale);
  const PHOTO = Math.round(80 * scale);

  const scrollBoardToNow = (behavior: ScrollBehavior = 'smooth') => {
    if (!scrollRef.current || !slots.length) return;
    const idx = nowSlotIndex(slots, nowMinutes(), company.slotInterval || 30);
    const target = Math.max(0, idx * COL_W - 24);
    scrollRef.current.scrollTo({ left: target, behavior });
  };

  const refreshPending = async () => {
    const companyId = company.serverCompanyId;
    const key = company.activationKey;
    if (!companyId || !key || !navigator.onLine) {
      setPendingList([]);
      knownPendingIdsRef.current = new Set();
      return;
    }
    const res = await fetchPendingAppointments({
      deviceId,
      activationKey: key,
      companyId,
    });
    if (!res.ok) return;
    const next = res.data;
    const prevIds = knownPendingIdsRef.current;
    const hasNew = next.some(row => !prevIds.has(row.id));
    knownPendingIdsRef.current = new Set(next.map(row => row.id));
    setPendingList(next);
    if (hasNew && next.length > 0) {
      lastPendingReminderRef.current = Date.now();
      void playPendingAlert();
    }
  };

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isToday || !slots.length) {
      scrolledToNowForDate.current = null;
      return;
    }
    if (scrolledToNowForDate.current === selectedDate) return;
    scrolledToNowForDate.current = selectedDate;
    const t = window.setTimeout(() => scrollBoardToNow('smooth'), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, selectedDate, slots.length, COL_W, company.slotInterval]);

  useEffect(() => {
    void refreshPending();
    const id = window.setInterval(() => void refreshPending(), 20_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.serverCompanyId, company.activationKey, deviceId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (pendingList.length === 0) return;
      const now = Date.now();
      if (now - lastPendingReminderRef.current < PENDING_REMINDER_MS) return;
      lastPendingReminderRef.current = now;
      void playPendingAlert();
    }, 30_000);
    return () => clearInterval(id);
  }, [pendingList.length]);

  const openAppointment = (
    staffId: string,
    startTime: string,
    opts?: { insertUntil?: string; insertFromEventId?: string },
  ) => {
    setCustomerName('');
    setCustomerPhone('');
    setSubscriberId('');
    setCampaignId('');
    setBookMsg('');
    setNote('');
    setVoiceError('');
    setGroupQuery('');
    setGroupSelected([]);
    // Kapıdan gelen: doğrudan hizmet seç — isim zorunlu değil
    setSheet({
      mode: 'appointment',
      staffId,
      startTime,
      step: 'service',
      ...(opts?.insertUntil ? { insertUntil: opts.insertUntil } : {}),
      ...(opts?.insertFromEventId ? { insertFromEventId: opts.insertFromEventId } : {}),
    });
  };

  /** Randevudaki bekleme penceresinde araya iş alma akışını açar */
  const openInsertDuringWait = (event: DayEvent) => {
    if (event.kind !== 'appointment' || event.status !== 'planned') return;
    const svc = services.find(s => s.id === event.serviceId);
    const win = processingWindow(event.startTime, event.endTime, svc?.processingMinutes);
    if (!win) {
      setBookMsg('Bu randevuda bekleme süresi yok');
      return;
    }
    openAppointment(event.staffId, win.start, {
      insertUntil: win.end,
      insertFromEventId: event.id,
    });
  };

  /** İş bitişinden hemen sonra yeni randevu (ör. 14:15 → devam) */
  const openFollowOnAppointment = (event: DayEvent) => {
    if (event.kind !== 'appointment') return;
    if (toMinutes(event.endTime) >= toMinutes(dayHours.workEnd)) {
      setBookMsg('Mesai bitişinden sonra slot yok');
      return;
    }
    openAppointment(event.staffId, event.endTime);
  };

  const openGroupClass = (staffId: string, startTime: string, serviceId: string) => {
    setBookMsg('');
    setGroupQuery('');
    setGroupSelected([]);
    assignGroupSession({
      staffId,
      date: selectedDate,
      startTime,
      serviceId,
    });
    setSheet({ mode: 'groupClass', staffId, startTime, serviceId });
  };

  const dayGroupSessions = useMemo(
    () => sessionsForDate(groupSessions, selectedDate),
    [groupSessions, selectedDate],
  );

  const activeCampaigns = useMemo(
    () =>
      campaigns.filter(
        c => c.active && c.startDate <= selectedDate && c.endDate >= selectedDate,
      ),
    [campaigns, selectedDate],
  );

  const activeSubscribers = useMemo(
    () =>
      subscribers.filter(s => {
        if (s.startDate > selectedDate || s.endDate < selectedDate) return false;
        return Object.values(s.remainingByService).some(n => n > 0);
      }),
    [subscribers, selectedDate],
  );

  const remainingServiceIds = (subId: string) => {
    const sub = subscribers.find(s => s.id === subId);
    if (!sub) return [] as string[];
    const ids: string[] = [];
    for (const [sid, left] of Object.entries(sub.remainingByService)) {
      for (let i = 0; i < (left || 0); i++) ids.push(sid);
    }
    return ids.length ? ids : [...sub.serviceIds];
  };

  const placeBlock = (opts: {
    staffId: string;
    startTime: string;
    name: string;
    phone?: string;
    serviceIds: string[];
    campaignId?: string;
    subscriberId?: string;
    priceTotal?: number;
  }) => {
    const result = bookCampaignBlock({
      date: selectedDate,
      fromTime: opts.startTime,
      preferredStaffId: opts.staffId,
      customerName: opts.name,
      customerPhone: opts.phone,
      serviceIds: opts.serviceIds,
      campaignId: opts.campaignId,
      subscriberId: opts.subscriberId,
      priceTotal: opts.priceTotal,
    });
    setBookMsg(result.message);
    if (result.ok) setSheet(null);
    return result.ok;
  };

  const pickSubscriber = (id: string) => {
    if (!sheet || sheet.mode !== 'appointment') return;
    const sub = subscribers.find(s => s.id === id);
    if (!sub) return;
    setSubscriberId(id);
    setCustomerName(sub.name);
    setCustomerPhone(sub.phone);
    setCampaignId(sub.campaignId || '');
    setBookMsg('');
    // Araya iş: paket yerleşimi yok — kullanıcı sığan tek hizmeti seçer
    if (sheet.insertUntil) {
      setSheet({ ...sheet, step: 'service' });
      return;
    }
    const ids = remainingServiceIds(id);
    if (ids.length) {
      placeBlock({
        staffId: sheet.staffId,
        startTime: sheet.startTime,
        name: sub.name,
        phone: sub.phone,
        serviceIds: ids,
        campaignId: sub.campaignId,
        subscriberId: id,
        priceTotal: 0,
      });
      return;
    }
    setSheet({ ...sheet, step: 'service' });
  };

  const pickCampaign = (id: string) => {
    if (!sheet || sheet.mode !== 'appointment') return;
    const c = campaigns.find(x => x.id === id);
    if (!c?.serviceIds.length) return;
    setCampaignId(id);
    placeBlock({
      staffId: sheet.staffId,
      startTime: sheet.startTime,
      name: customerName.trim() || 'Misafir',
      phone: customerPhone || undefined,
      serviceIds: [...c.serviceIds],
      campaignId: id,
      subscriberId: subscriberId || undefined,
      priceTotal: subscriberId ? 0 : c.price,
    });
  };

  useEffect(() => {
    if (sheet?.mode === 'appointment' && sheet.step === 'name') {
      const t = window.setTimeout(() => nameInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [sheet]);

  const openLeave = (staffId: string, startTime: string) => {
    const step = company.slotInterval || 30;
    const remaining = Math.max(step, toMinutes(dayHours.workEnd) - toMinutes(startTime));
    setLeaveDuration(Math.min(step * 2, remaining));
    setNote('İzin');
    setSheet({ mode: 'leave', staffId, startTime });
  };

  const openComplete = (event: DayEvent) => {
    const isSub = !!event.subscriberId;
    const base = isSub
      ? 0
      : event.price ?? services.find(s => s.id === event.serviceId)?.price ?? 0;
    setCollected(base);
    setPaymentMethod('cash');
    setSubscriberPaid(false);
    setConsentOk(false);
    setBookMsg('');
    setSheet({ mode: 'complete', event });
  };

  const openExpense = (staffId: string) => {
    setExpAmount('');
    setExpDesc('');
    setSheet({ mode: 'expense', staffId });
  };

  const goServiceStep = () => {
    setSheet(s => (s && s.mode === 'appointment' ? { ...s, step: 'service' } : s));
  };

  const startVoice = async () => {
    setVoiceError('');
    if (isEmbeddedBrowser()) {
      nameInputRef.current?.focus();
      setVoiceError(
        'Cursor içi tarayıcıda mikrofon çalışmaz. http://localhost:5180 adresini Google Chrome’da açın; tablette klavye mikrofonunu kullanın.',
      );
      return;
    }
    if (!speechSupported()) {
      nameInputRef.current?.focus();
      setVoiceError('Ses tanıma yok. Google Chrome açın veya klavyedeki mikrofonu kullanın.');
      return;
    }
    if (!navigator.onLine) {
      nameInputRef.current?.focus();
      setVoiceError(speechErrorMessage('network'));
      return;
    }
    setListening(true);
    try {
      let text = '';
      try {
        text = await listenOnce('tr-TR');
      } catch (first) {
        // Bazı tarayıcılarda tr-TR network verir; tr ile bir kez daha dene
        const msg = first instanceof Error ? first.message : '';
        if (/network|language/i.test(msg)) {
          text = await listenOnce('tr');
        } else {
          throw first;
        }
      }
      if (text) {
        setCustomerName(text);
        setSheet(s => (s && s.mode === 'appointment' ? { ...s, step: 'service' } : s));
      } else {
        nameInputRef.current?.focus();
        setVoiceError(speechErrorMessage('no-speech'));
      }
    } catch (e) {
      const msg = e instanceof Error ? speechErrorMessage(e.message) : 'Ses alınamadı';
      setVoiceError(msg);
      nameInputRef.current?.focus();
    } finally {
      setListening(false);
    }
  };

  /** Kapıdan gelen: hizmete tek dokunuşla ekle; grup dersi → çalışana ata + abone paneli */
  const quickAddService = (id: string) => {
    if (!sheet || sheet.mode !== 'appointment') return;
    setCampaignId('');
    const svc = services.find(s => s.id === id);
    if (isClassService(svc)) {
      if (sheet.insertUntil) {
        setBookMsg('Bekleme aralığında grup dersi eklenemez');
        return;
      }
      openGroupClass(sheet.staffId, sheet.startTime, id);
      return;
    }
    const duration = Math.max(1, svc?.durationMinutes || company.slotInterval || 30);
    if (sheet.insertUntil) {
      const end = slotEnd(sheet.startTime, duration);
      if (toMinutes(end) > toMinutes(sheet.insertUntil)) {
        setBookMsg(
          `Bekleme ${sheet.startTime}–${sheet.insertUntil} · bu hizmet sığmıyor (${duration} dk)`,
        );
        return;
      }
    }
    const isSub = !!subscriberId;
    addAppointment({
      staffId: sheet.staffId,
      date: selectedDate,
      startTime: sheet.startTime,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone || undefined,
      serviceId: id,
      durationMinutes: svc?.durationMinutes,
      allowShort: !!sheet.insertUntil,
      price: isSub ? 0 : svc?.price || 0,
      subscriberId: subscriberId || undefined,
      note: sheet.insertFromEventId ? 'Araya iş (bekleme)' : undefined,
    });
    setSheet(null);
  };

  const toggleGroupSelect = (id: string) => {
    setGroupSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const submitGroupEnroll = () => {
    if (!sheet || sheet.mode !== 'groupClass') return;
    const result = enrollSubscribersToClass({
      staffId: sheet.staffId,
      date: selectedDate,
      startTime: sheet.startTime,
      serviceId: sheet.serviceId,
      subscriberIds: groupSelected,
    });
    setBookMsg(result.message);
    if (result.ok) {
      setGroupSelected([]);
    }
  };

  const leaveEndPreview = (() => {
    if (sheet?.mode !== 'leave') return '';
    const end = slotEnd(sheet.startTime, Math.max(company.slotInterval || 30, leaveDuration));
    return toMinutes(end) > toMinutes(dayHours.workEnd) ? dayHours.workEnd : end;
  })();

  const saveLeave = () => {
    if (!sheet || sheet.mode !== 'leave') return;
    const duration = Math.max(company.slotInterval || 30, leaveDuration || company.slotInterval);
    const end = slotEnd(sheet.startTime, duration);
    addLeave({
      staffId: sheet.staffId,
      date: selectedDate,
      startTime: sheet.startTime,
      endTime: toMinutes(end) > toMinutes(dayHours.workEnd) ? dayHours.workEnd : end,
      note: note || 'İzin',
    });
    setSheet(null);
  };

  const saveComplete = () => {
    if (!sheet || sheet.mode !== 'complete') return;
    const svc = services.find(s => s.id === sheet.event.serviceId);
    if (svc?.requiresConsent && !consentOk) {
      setBookMsg('Bu işlem için onam onayını işaretleyin');
      return;
    }
    if (sheet.event.subscriberId && !subscriberPaid) {
      completeAppointment(sheet.event.id, 0, null);
    } else {
      completeAppointment(sheet.event.id, collected, paymentMethod);
    }
    setSheet(null);
  };

  const decidePending = async (row: PendingAppointment, status: 'approved' | 'cancelled') => {
    const companyId = company.serverCompanyId;
    const key = company.activationKey;
    if (!companyId || !key) return;
    setPendingBusyId(row.id);
    setPendingMsg('');
    const res = await setPendingAppointmentStatus({
      deviceId,
      activationKey: key,
      companyId,
      appointmentId: row.id,
      status,
    });
    setPendingBusyId(null);
    setPendingMsg(res.message);
    if (!res.ok) return;
    setPendingList(prev => prev.filter(p => p.id !== row.id));
    if (status === 'approved') {
      const date = String(row.appointment_date).slice(0, 10);
      ingestApprovedWebAppointment({
        serverAppointmentId: row.id,
        date,
        startTime: String(row.start_time).slice(0, 5),
        endTime: String(row.end_time || '').slice(0, 5),
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        serviceName: row.service_name,
        staffName: row.staff_name,
        price: row.price != null ? Number(row.price) : undefined,
      });
      if (date !== selectedDate) setSelectedDate(date);
    }
  };

  const servicesForStaff = (staffId: string) => {
    const person = staff.find(s => s.id === staffId);
    if (!person?.serviceIds?.length) return services;
    return services.filter(s => person.serviceIds!.includes(s.id));
  };

  const saveExpense = () => {
    if (!sheet || sheet.mode !== 'expense') return;
    const amount = Number(expAmount);
    if (!(amount > 0)) return;
    addExpense({
      staffId: sheet.staffId,
      date: selectedDate,
      amount,
      description: expDesc,
    });
    setSheet(null);
  };

  const sectorSlugs =
    company.sectorSlugs?.length
      ? company.sectorSlugs
      : company.sectorSlug
        ? [company.sectorSlug]
        : [];
  const titleOf = (key: string) => titleLabel(key, sectorSlugs);
  const deptName = (id: string) => departments.find(d => d.id === id)?.name || '—';
  const staffName = (id: string) => {
    const s = staff.find(x => x.id === id);
    return s ? `${s.firstName} ${s.lastName}` : '—';
  };
  const serviceName = (id?: string) => services.find(s => s.id === id)?.name;

  const slotStep = company.slotInterval || 30;

  const isNowSlot = (slot: string) => {
    if (!isToday) return false;
    const [h, m] = slot.split(':').map(Number);
    const start = h * 60 + m;
    return currentMin >= start && currentMin < start + slotStep;
  };

  const isPastSlot = (slot: string) => {
    if (!isToday) return false;
    return toMinutes(slot) + slotStep <= currentMin;
  };

  const dayExpenseTotal = (staffId: string) =>
    expenses.filter(e => e.staffId === staffId && e.date === selectedDate).reduce((s, e) => s + e.amount, 0);

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-600">{company.name}</p>
            <div className="mt-1 flex items-center gap-2">
              <button type="button" aria-label="Önceki gün" onClick={() => setSelectedDate(addDays(selectedDate, -1))} className="h-9 w-9 rounded-xl bg-slate-100 font-black">‹</button>
              <button
                type="button"
                onClick={() => {
                  const { y, m } = parseKey(selectedDate);
                  setCalYear(y);
                  setCalMonth(m);
                  setCalendarOpen(true);
                }}
                className="rounded-2xl px-2 py-1 text-left hover:bg-slate-50 active:scale-[0.99]"
              >
                <h1 className="text-lg font-black leading-tight">{dayLabel(selectedDate)}</h1>
                <p className="text-xs font-semibold text-slate-500">
                  {formatDateTr(selectedDate)} · {hoursLabel(dayHours)}
                  {dayHours.isWeekend ? ' · hafta sonu' : ''} · {company.slotInterval} dk
                  {isToday && (
                    <span className="ml-2 text-brand-600">· sola çek → geçmiş · varsayılan: şimdi</span>
                  )}
                  {!isToday && selectedDate < todayKey() && (
                    <span className="ml-2 text-slate-600">· geçmiş gün · tüm saatler</span>
                  )}
                  {!isToday && selectedDate > todayKey() && (
                    <span className="ml-2 text-brand-600">· gelecek gün</span>
                  )}
                  <span className="ml-2 text-brand-600">· takvim</span>
                </p>
              </button>
              <button type="button" aria-label="Sonraki gün" onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="h-9 w-9 rounded-xl bg-slate-100 font-black">›</button>
              {selectedDate === todayKey() ? (
                <button
                  type="button"
                  onClick={() => scrollBoardToNow('smooth')}
                  className="min-h-9 rounded-xl border-2 border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-black text-brand-700"
                >
                  Şimdi
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayKey())}
                  className="min-h-9 rounded-xl border-2 border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-black text-brand-700"
                >
                  Bugün
                </button>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {company.serverCompanyId && (
              <button
                type="button"
                title="Onay bekleyen"
                aria-label="Onay bekleyen randevular"
                onClick={() => {
                  setPendingMsg('');
                  void refreshPending();
                  setSheet({ mode: 'pending' });
                  void unlockPendingAlertAudio();
                }}
                className="relative btn btn-secondary !min-h-11 !px-3 !text-xs font-black"
              >
                Onay
                {pendingList.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white">
                    {pendingList.length}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              title="Rapor"
              aria-label="Rapor"
              onClick={() => setScreen('reports')}
              className="btn btn-secondary btn-icon"
            >
              <IconReport />
            </button>
            <button
              type="button"
              title="Parametre"
              aria-label="Parametre"
              onClick={() => setScreen('settings')}
              className="btn btn-dark btn-icon"
            >
              <IconSettings />
            </button>
          </div>
        </div>
      </header>

      {dayGroupSessions.length > 0 && (
        <div className="shrink-0 border-b border-emerald-100 bg-emerald-50/80 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
              Tanımlı grup dersleri · doluluk
            </p>
            <button
              type="button"
              onClick={() => setScreen('groupClasses')}
              className="text-[10px] font-black uppercase tracking-widest text-emerald-800 underline"
            >
              Yönet
            </button>
          </div>
          <div className="mt-1.5 flex gap-2 overflow-x-auto pb-0.5">
            {dayGroupSessions.map(gs => {
              const occ = sessionOccupancy(gs, events);
              const svcName = serviceName(gs.serviceId) || 'Grup';
              const who = staffName(gs.staffId);
              const full = occ.remaining === 0;
              return (
                <button
                  key={gs.id}
                  type="button"
                  onClick={() => openGroupClass(gs.staffId, gs.startTime, gs.serviceId)}
                  className={`shrink-0 rounded-2xl px-3 py-2 text-left text-xs font-black ring-1 ${
                    full
                      ? 'bg-rose-50 text-rose-800 ring-rose-200'
                      : 'bg-white text-emerald-950 ring-emerald-200'
                  }`}
                >
                  <div className="truncate max-w-[10rem]">{svcName}</div>
                  <div className="mt-0.5 opacity-70">
                    {gs.startTime} · {who} · {occ.booked}/{occ.capacity}
                    {full ? ' dolu' : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div ref={scrollRef} className="board-scroll min-h-0 flex-1 px-2 py-3">
        <table className="border-separate text-sm" style={{ minWidth: STAFF_COL_W + slots.length * COL_W, borderSpacing: '0 16px' }}>
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 min-w-[240px] rounded-l-2xl bg-slate-50 px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                Çalışan
              </th>
              {slots.map((h, i) => (
                <th
                  key={h}
                  style={{ minWidth: COL_W, width: COL_W }}
                  className={`px-1 py-3 text-center text-[11px] font-black ${
                    i === slots.length - 1 ? 'rounded-r-2xl' : ''
                  } ${
                    isNowSlot(h)
                      ? 'bg-brand-600 text-white'
                      : isPastSlot(h)
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-slate-50 text-slate-500'
                  }`}
                >
                  {h}
                  {isNowSlot(h) && <div className="text-[8px] font-bold opacity-90">ŞİMDİ</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map(person => {
              const personEvents = dayEvents.filter(e => e.staffId === person.id);
              const colorMap = appointmentColorIndexMap(personEvents, services);
              const cells: ReactElement[] = [];

              const busyApptsAt = (s: string) =>
                personEvents.filter(e => {
                  if (e.kind !== 'appointment') return false;
                  const svc = services.find(x => x.id === e.serviceId);
                  if (isClassService(svc)) return false;
                  return staffBusyIntervals(e.startTime, e.endTime, svc?.processingMinutes).some(b =>
                    overlapsSlotWindow(b.start, b.end, s, slotStep),
                  );
                });

              for (let i = 0; i < slots.length; ) {
                const slot = slots[i];
                const past = isPastSlot(slot);
                const covering = personEvents.filter(e =>
                  overlapsSlotWindow(e.startTime, e.endTime, slot, slotStep),
                );
                const leaveEvt = covering.find(e => e.kind === 'leave');
                const busyAppts = busyApptsAt(slot);
                const processingEvt = covering.find(e => {
                  if (e.kind !== 'appointment') return false;
                  const svc = services.find(s => s.id === e.serviceId);
                  if (isClassService(svc)) return false;
                  if (busyAppts.some(b => b.id === e.id)) return false;
                  const win = processingWindow(e.startTime, e.endTime, svc?.processingMinutes);
                  if (!win) return false;
                  return overlapsSlotWindow(win.start, win.end, slot, slotStep);
                });
                const classEvts = covering.filter(e => {
                  if (e.kind !== 'appointment') return false;
                  return isClassService(services.find(s => s.id === e.serviceId));
                });
                const slotGroupSessions = groupSessionsCoveringSlot(groupSessions, services, {
                  staffId: person.id,
                  date: selectedDate,
                  slot,
                });
                const gs =
                  slotGroupSessions.find(s => classEvts.some(e => e.serviceId === s.serviceId)) ||
                  slotGroupSessions[0];

                if (leaveEvt) {
                  let span = 0;
                  for (let j = i; j < slots.length; j++) {
                    if (!overlapsSlotWindow(leaveEvt.startTime, leaveEvt.endTime, slots[j], slotStep)) break;
                    span += 1;
                  }
                  span = Math.max(1, span);
                  cells.push(
                    <td
                      key={`${leaveEvt.id}-${slot}`}
                      colSpan={span}
                      className="bg-white p-1 align-middle"
                      style={{ minWidth: COL_W * span }}
                    >
                      <button
                        type="button"
                        onClick={() => setSheet({ mode: 'detail', event: leaveEvt })}
                        style={{ height: ROW_H }}
                        className={`flex w-full flex-col justify-center rounded-2xl bg-amber-100 px-3 py-2 text-left font-bold text-amber-900 shadow-sm ring-1 ring-amber-200 ${
                          scale < 0.9 ? 'text-xs' : 'text-sm'
                        } ${past ? 'opacity-70' : ''}`}
                      >
                        <div className="truncate">İzin · kapalı</div>
                        <div className="text-xs opacity-70">
                          {leaveEvt.startTime}–{leaveEvt.endTime} ·{' '}
                          {toMinutes(leaveEvt.endTime) - toMinutes(leaveEvt.startTime)} dk
                        </div>
                      </button>
                    </td>,
                  );
                  i += span;
                  continue;
                }

                /** Üst üste / araya iş: aynı dilimde birden fazla randevu */
                if (busyAppts.length > 1) {
                  cells.push(
                    <td
                      key={`stack-${person.id}-${slot}`}
                      className="bg-white p-1 align-middle"
                      style={{ width: COL_W, minWidth: COL_W }}
                    >
                      <div
                        className={`flex flex-col gap-0.5 ${isNowSlot(slot) ? 'bg-brand-50/30' : ''} ${past ? 'opacity-80' : ''}`}
                        style={{ minHeight: ROW_H }}
                      >
                        {busyAppts.map(ev => {
                          const c = colorForAppointment(ev.id, colorMap);
                          const done = ev.status === 'done';
                          const tl = appointmentTimeline(
                            ev.startTime,
                            ev.endTime,
                            services.find(x => x.id === ev.serviceId)?.processingMinutes,
                          );
                          return (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={() => setSheet({ mode: 'detail', event: ev })}
                              className={`flex min-h-[2.1rem] flex-1 flex-col justify-center rounded-xl px-2 py-1 text-left font-bold shadow-sm ring-1 ${
                                done ? `${c.doneBg} ${c.doneText} ring-black/20` : `${c.bg} ${c.text} ${c.ring}`
                              }`}
                            >
                              <span className="truncate text-[10px] leading-tight">
                                {done ? '✓ ' : ''}
                                {ev.customerName || serviceName(ev.serviceId) || 'Misafir'}
                              </span>
                              <AppointmentTimeline segments={tl} compact inverted={done} />
                              {ev.note?.includes('Araya') && (
                                <span className="text-[8px] font-bold opacity-70">araya</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </td>,
                  );
                  i += 1;
                  continue;
                }

                if (busyAppts.length === 1) {
                  const active = busyAppts[0];
                  let span = 0;
                  let endsMidLast = false;
                  for (let j = i; j < slots.length; j++) {
                    const at = busyApptsAt(slots[j]);
                    if (at.length !== 1 || at[0].id !== active.id) break;
                    span += 1;
                    const slotEndMin = toMinutes(slots[j]) + slotStep;
                    // İş slot ortasında bitiyorsa (ör. 14:15) son dilimi ayır — sonrası için + kalsın
                    if (toMinutes(active.endTime) > toMinutes(slots[j]) && toMinutes(active.endTime) < slotEndMin) {
                      endsMidLast = true;
                      break;
                    }
                  }
                  span = Math.max(1, span);
                  const c = colorForAppointment(active.id, colorMap);
                  const done = active.status === 'done';
                  const procMins = services.find(x => x.id === active.serviceId)?.processingMinutes;
                  const timeline = appointmentTimeline(active.startTime, active.endTime, procMins);

                  const renderApptBtn = (opts?: { compact?: boolean }) => (
                    <button
                      type="button"
                      onClick={() => setSheet({ mode: 'detail', event: active })}
                      style={opts?.compact ? { minHeight: Math.round(ROW_H * 0.55) } : { minHeight: ROW_H }}
                      className={`flex w-full flex-col justify-center rounded-2xl px-3 py-1.5 text-left font-bold shadow-sm ring-1 ${
                        scale < 0.9 || opts?.compact ? 'text-xs' : 'text-sm'
                      } ${done ? `${c.doneBg} ${c.doneText} ring-black/20` : `${c.bg} ${c.text} ${c.ring}`} ${
                        past ? 'opacity-80' : ''
                      }`}
                    >
                      <div className="truncate">
                        {done
                          ? `✓ ${active.customerName || serviceName(active.serviceId) || 'Tamamlandı'}`
                          : active.customerName || serviceName(active.serviceId) || 'Misafir'}
                      </div>
                      <div className="text-xs opacity-70">
                        {active.serviceId && active.customerName
                          ? serviceName(active.serviceId)
                          : `${active.startTime}–${active.endTime}`}
                        {active.note?.includes('Araya') ? ' · araya' : ''}
                      </div>
                      {!opts?.compact && (
                        <>
                          <div className="mt-0.5">
                            <AppointmentTimeline segments={timeline} inverted={done} />
                          </div>
                          <div className="text-[11px] opacity-80">
                            {active.subscriberId
                              ? done
                                ? (active.collectedPrice ?? 0) > 0
                                  ? `Abone · ödendi ₺${active.collectedPrice}`
                                  : 'Abone · ödenmedi'
                                : 'Abone'
                              : done && active.collectedPrice != null
                                ? `Tahsil: ₺${active.collectedPrice}`
                                : active.price != null
                                  ? `₺${active.price}`
                                  : null}
                          </div>
                          {timeline.some(s => s.kind === 'wait') && !done && (
                            <div className="text-[9px] font-bold opacity-55">işlem arasında başka alınabilir</div>
                          )}
                        </>
                      )}
                      {opts?.compact && (
                        <AppointmentTimeline segments={timeline} compact inverted={done} />
                      )}
                    </button>
                  );

                  if (endsMidLast && span === 1) {
                    // Tek dilim, iş ortada bitiyor → üstte randevu, altta sonrası +
                    cells.push(
                      <td
                        key={`${active.id}-tail-${slot}`}
                        className="bg-white p-1 align-middle"
                        style={{ width: COL_W, minWidth: COL_W }}
                      >
                        <div className="flex flex-col gap-0.5" style={{ minHeight: ROW_H }}>
                          {renderApptBtn({ compact: true })}
                          <button
                            type="button"
                            title={`${active.endTime} sonrası randevu`}
                            onClick={() => openFollowOnAppointment(active)}
                            className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-[10px] font-black text-slate-500 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
                          >
                            + {active.endTime} sonrası
                          </button>
                        </div>
                      </td>,
                    );
                    i += 1;
                    continue;
                  }

                  const mainSpan = endsMidLast ? span - 1 : span;
                  if (mainSpan > 0) {
                    cells.push(
                      <td
                        key={`${active.id}-${slot}`}
                        colSpan={mainSpan}
                        className="bg-white p-1 align-middle"
                        style={{ minWidth: COL_W * mainSpan }}
                      >
                        {renderApptBtn()}
                      </td>,
                    );
                  }
                  if (endsMidLast) {
                    const tailSlot = slots[i + mainSpan];
                    cells.push(
                      <td
                        key={`${active.id}-tail-${tailSlot}`}
                        className="bg-white p-1 align-middle"
                        style={{ width: COL_W, minWidth: COL_W }}
                      >
                        <div className="flex flex-col gap-0.5" style={{ minHeight: ROW_H }}>
                          {renderApptBtn({ compact: true })}
                          <button
                            type="button"
                            title={`${active.endTime} sonrası randevu`}
                            onClick={() => openFollowOnAppointment(active)}
                            className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-[10px] font-black text-slate-500 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
                          >
                            + {active.endTime} sonrası
                          </button>
                        </div>
                      </td>,
                    );
                  }
                  i += span;
                  continue;
                }

                if (processingEvt && !gs && classEvts.length === 0) {
                  const pc = colorForAppointment(processingEvt.id, colorMap);
                  cells.push(
                    <td key={`proc-${processingEvt.id}-${slot}`} className="bg-white p-1 align-middle" style={{ width: COL_W, minWidth: COL_W }}>
                      <div className={`flex flex-col gap-1 ${isNowSlot(slot) ? 'bg-brand-50/40' : ''} ${past ? 'opacity-70' : ''}`} style={{ height: ROW_H }}>
                        <button
                          type="button"
                          title="Bekleme süresinde randevu ekle"
                          onClick={() => openAppointment(person.id, slot)}
                          className={`flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed px-1 ${pc.bg} ${pc.text} border-current/30 hover:brightness-95`}
                        >
                          <span className="text-sm font-black">+</span>
                          <span className="max-w-full truncate text-[9px] font-bold leading-tight">
                            bekleme
                          </span>
                          <span className="max-w-full truncate text-[8px] font-semibold opacity-80">
                            {processingEvt.customerName || serviceName(processingEvt.serviceId) || 'işlem'}
                          </span>
                        </button>
                        <button
                          type="button"
                          title="Bekleyen işlemi aç"
                          onClick={() => setSheet({ mode: 'detail', event: processingEvt })}
                          className="rounded-xl bg-slate-50 px-1 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-slate-100"
                        >
                          detay
                        </button>
                      </div>
                    </td>,
                  );
                  i += 1;
                  continue;
                }

                if (gs || classEvts.length > 0) {
                  const serviceId = gs?.serviceId || classEvts[0].serviceId!;
                  const startTime = gs?.startTime || classEvts[0].startTime;
                  const svc = services.find(s => s.id === serviceId);
                  const duration = Math.max(company.slotInterval || 30, svc?.durationMinutes || 60);
                  const endTime = slotEnd(startTime, duration);
                  const occ = gs
                    ? sessionOccupancy(gs, events)
                    : (() => {
                        const same = classEvts.filter(
                          e => e.serviceId === serviceId && e.startTime === startTime,
                        );
                        const capacity = serviceCapacity(svc);
                        return {
                          booked: same.length,
                          capacity,
                          remaining: Math.max(0, capacity - same.length),
                        };
                      })();
                  const coveredVisible = spanSlots(startTime, endTime, slots);
                  const firstCovered = coveredVisible[0];
                  if (slot !== firstCovered) {
                    i += 1;
                    continue;
                  }
                  const span = Math.max(1, coveredVisible.length);
                  cells.push(
                    <td
                      key={`gcls-${person.id}-${serviceId}-${startTime}-${slot}`}
                      colSpan={span}
                      className="bg-white p-1 align-middle"
                      style={{ minWidth: COL_W * span }}
                    >
                      <button
                        type="button"
                        onClick={() => openGroupClass(person.id, startTime, serviceId)}
                        style={{ height: ROW_H }}
                        className={`flex w-full flex-col justify-center rounded-2xl px-3 py-2 text-left font-bold shadow-sm ring-1 ${
                          scale < 0.9 ? 'text-xs' : 'text-sm'
                        } ${
                          occ.remaining === 0
                            ? 'bg-rose-100 text-rose-950 ring-rose-200'
                            : 'bg-emerald-100 text-emerald-950 ring-emerald-200'
                        }`}
                      >
                        <div className="truncate">
                          {serviceName(serviceId) || 'Grup dersi'} · {occ.booked}/{occ.capacity}
                        </div>
                        <div className="text-xs opacity-70">
                          {startTime}–{endTime} · grup
                          {occ.remaining === 0 ? ' · dolu' : ` · ${occ.remaining} yer`}
                        </div>
                      </button>
                    </td>,
                  );
                  i += span;
                  continue;
                }

                cells.push(
                  <td key={slot} className="bg-white p-1 align-middle" style={{ width: COL_W, minWidth: COL_W }}>
                    <div
                      className={`flex flex-col gap-1 ${isNowSlot(slot) ? 'bg-brand-50/40' : ''} ${past ? 'opacity-45' : ''}`}
                      style={{ height: ROW_H }}
                    >
                      <button
                        type="button"
                        title={past ? 'Geçmiş saat' : 'Randevu ekle'}
                        onClick={() => openAppointment(person.id, slot)}
                        className={`flex-1 rounded-xl text-sm font-black ${
                          past
                            ? 'bg-slate-100 text-slate-300'
                            : 'bg-slate-50 text-slate-300 hover:bg-brand-50 hover:text-brand-600'
                        }`}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        title="İzin"
                        onClick={() => openLeave(person.id, slot)}
                        className="rounded-xl bg-amber-50/60 px-1 py-1 text-[11px] font-bold text-amber-700/70 hover:bg-amber-100"
                      >
                        İzin
                      </button>
                    </div>
                  </td>,
                );
                i += 1;
              }

              const expSum = dayExpenseTotal(person.id);

              return (
                <tr key={person.id} className="shadow-sm">
                  <td className="sticky left-0 z-10 min-w-[240px] rounded-l-3xl border border-r-0 border-slate-100 bg-white px-4 py-4 shadow-[4px_0_12px_-8px_rgba(0,0,0,0.15)]">
                    <div className="flex items-center gap-4">
                      <div
                        className="shrink-0 overflow-hidden rounded-3xl bg-slate-100 ring-1 ring-slate-200"
                        style={{ width: PHOTO, height: PHOTO }}
                      >
                        {person.photo ? (
                          <img src={person.photo} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xl font-black text-slate-400">
                            {person.firstName.slice(0, 1)}{person.lastName.slice(0, 1)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`truncate font-black text-slate-900 ${scale < 0.9 ? 'text-sm' : 'text-base'}`}>
                          {person.firstName} {person.lastName}
                        </p>
                        <p className={`truncate font-semibold text-slate-500 ${scale < 0.9 ? 'text-xs' : 'text-sm'}`}>
                          {titleOf(person.title)} · {deptName(person.departmentId)}
                        </p>
                        <p className="text-xs font-bold text-slate-400">
                          {(() => {
                            const h = staffHoursForDate(person, company, selectedDate);
                            return `${h.workStart}–${h.workEnd}`;
                          })()}
                        </p>
                        <button
                          type="button"
                          title={expSum > 0 ? `Masraf gir · ₺${expSum}` : 'Masraf gir'}
                          aria-label={expSum > 0 ? `Masraf gir · ₺${expSum}` : 'Masraf gir'}
                          onClick={() => openExpense(person.id)}
                          className="btn btn-danger btn-icon relative mt-2 !h-10 !w-10 !min-h-10"
                        >
                          <IconExpense className="h-4 w-4" />
                          {expSum > 0 && (
                            <span className="absolute -right-1 -top-1 rounded-full bg-white px-1 text-[9px] font-black text-rose-600 ring-1 ring-rose-200">
                              ₺{expSum}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </td>
                  {cells}
                </tr>
              );
            })}
          </tbody>
        </table>
        {slots.length === 0 && (
          <p className="p-8 text-center text-sm font-bold text-slate-400">
            {dayHours.closed
              ? 'Hafta sonu kapalı — Parametreler → Mesai’den açabilirsiniz.'
              : 'Bu gün için gösterilecek saat dilimi yok.'}
          </p>
        )}
      </div>

      {calendarOpen && (
        <Modal onClose={() => setCalendarOpen(false)}>
          <h3 className="text-lg font-black">Tarih seç</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Geçmiş ve gelecek günlere gidebilirsiniz
          </p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Önceki ay"
              onClick={() => {
                const next = shiftMonth(calYear, calMonth, -1);
                setCalYear(next.year);
                setCalMonth(next.month);
              }}
              className="h-11 w-11 rounded-2xl border-2 border-slate-200 bg-white text-lg font-black"
            >
              ‹
            </button>
            <p className="text-base font-black capitalize">{monthLabel(calYear, calMonth)}</p>
            <button
              type="button"
              aria-label="Sonraki ay"
              onClick={() => {
                const next = shiftMonth(calYear, calMonth, 1);
                setCalYear(next.year);
                setCalMonth(next.month);
              }}
              className="h-11 w-11 rounded-2xl border-2 border-slate-200 bg-white text-lg font-black"
            >
              ›
            </button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-black uppercase text-slate-400">
            {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map(d => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthGrid(calYear, calMonth).map((key, idx) => {
              if (!key) return <div key={`e-${idx}`} className="h-11" />;
              const today = todayKey();
              const selected = key === selectedDate;
              const isTod = key === today;
              const hasEvents = events.some(e => e.date === key && e.status !== 'cancelled');
              const isPast = key < today;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedDate(key);
                    setCalendarOpen(false);
                  }}
                  className={`relative flex h-11 flex-col items-center justify-center rounded-xl text-sm font-black ${
                    selected
                      ? 'bg-brand-600 text-white'
                      : isTod
                        ? 'bg-brand-50 text-brand-800 ring-2 ring-brand-300'
                        : isPast
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-white text-slate-900 ring-1 ring-slate-200'
                  }`}
                >
                  {parseKey(key).d}
                  {hasEvents && (
                    <span
                      className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${
                        selected ? 'bg-white' : 'bg-brand-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setCalendarOpen(false)}
              className="flex-1 rounded-2xl border-2 border-slate-200 bg-white py-3 font-black"
            >
              Kapat
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(todayKey());
                setCalendarOpen(false);
              }}
              className="flex-1 rounded-2xl border-2 border-brand-600 bg-brand-600 py-3 font-black text-white"
            >
              Bugün
            </button>
          </div>
        </Modal>
      )}

      {/* Grup dersi: abone sorgula + çoklu ekle */}
      {sheet?.mode === 'groupClass' && (() => {
        const svc = services.find(s => s.id === sheet.serviceId);
        const gs = findGroupSession(groupSessions, {
          staffId: sheet.staffId,
          date: selectedDate,
          startTime: sheet.startTime,
          serviceId: sheet.serviceId,
        });
        const capacity = gs?.capacity ?? serviceCapacity(svc);
        const attendees = sessionAttendees(events, {
          staffId: sheet.staffId,
          date: selectedDate,
          startTime: sheet.startTime,
          serviceId: sheet.serviceId,
        });
        const remaining = sessionRemaining(capacity, attendees);
        const enrolledIds = new Set(attendees.map(a => a.subscriberId).filter(Boolean));
        const eligible = eligibleSubscribers(
          subscribers,
          sheet.serviceId,
          selectedDate,
          groupQuery,
        ).filter(s => !enrolledIds.has(s.id));
        const who = staffName(sheet.staffId);
        return (
          <Modal onClose={() => setSheet(null)}>
            <h3 className="text-lg font-black">Grup dersi</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {who} · {formatDateTr(selectedDate)} · {sheet.startTime} · {svc?.name || 'Ders'}
            </p>
            <p className="mt-2 text-sm font-black text-emerald-800">
              Doluluk {attendees.length}/{capacity} · kalan {remaining}
            </p>

            <label className="mt-4 block text-xs font-black uppercase text-slate-400">
              Abone ara
              <input
                value={groupQuery}
                onChange={e => setGroupQuery(e.target.value)}
                placeholder="Ad veya telefon"
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold"
              />
            </label>

            <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-400">
              Uygun aboneler ({eligible.length})
            </p>
            <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
              {eligible.length === 0 ? (
                <p className="text-sm font-semibold text-slate-500">Bu ders için hakkı olan abone yok</p>
              ) : (
                eligible.map(s => {
                  const left = s.remainingByService[sheet.serviceId] || 0;
                  const on = groupSelected.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleGroupSelect(s.id)}
                      disabled={remaining === 0 && !on}
                      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left font-bold ring-1 ${
                        on
                          ? 'bg-emerald-600 text-white ring-emerald-700'
                          : 'bg-slate-50 text-slate-800 ring-slate-200'
                      } disabled:opacity-40`}
                    >
                      <span>
                        {subscriberLabel(s)}
                        <span className={`mt-0.5 block text-xs ${on ? 'text-white/80' : 'text-slate-500'}`}>
                          {s.phone} · kalan hak {left}
                        </span>
                      </span>
                      <span className="text-xs font-black">{on ? 'Seçili' : '+'}</span>
                    </button>
                  );
                })
              )}
            </div>

            {bookMsg && <p className="mt-3 text-sm font-bold text-slate-700">{bookMsg}</p>}

            <button
              type="button"
              disabled={!groupSelected.length || groupSelected.length > remaining}
              onClick={submitGroupEnroll}
              className="btn btn-primary btn-block mt-4 !min-h-12 disabled:opacity-40"
            >
              Seçilenleri derse ekle ({groupSelected.length})
            </button>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Katılımcılar</p>
              <ul className="mt-2 space-y-1">
                {attendees.length === 0 && (
                  <li className="text-sm font-semibold text-slate-400">Henüz kayıt yok</li>
                )}
                {attendees.map(a => (
                  <li key={a.id} className="flex justify-between text-sm font-bold text-slate-700">
                    <span>{a.customerName || 'Abone'}</span>
                    <button
                      type="button"
                      className="text-xs font-black text-brand-700"
                      onClick={() => setSheet({ mode: 'detail', event: a })}
                    >
                      Detay
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {gs && attendees.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  removeGroupSession(gs.id);
                  setSheet(null);
                }}
                className="btn btn-danger-soft btn-block mt-4 !min-h-11"
              >
                Atamayı kaldır
              </button>
            )}
          </Modal>
        );
      })()}

      {/* Hızlı randevu: saat → hizmet (isim zorunlu değil) */}
      {sheet?.mode === 'appointment' && (
        <Modal onClose={() => setSheet(null)}>
          <h3 className="text-lg font-black">
            {sheet.insertUntil ? 'Araya iş al' : 'Hızlı randevu'}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {formatDateTr(selectedDate)} · {sheet.startTime}
            {sheet.insertUntil ? `–${sheet.insertUntil} bekleme` : ''}
            {' · '}hizmete dokunun, eklensin
          </p>
          {sheet.insertUntil && (
            <p className="mt-2 rounded-2xl bg-brand-50 px-3 py-2 text-xs font-bold text-brand-900">
              Mevcut işlemin bekleme süresi — yalnızca bu aralığa sığan hizmetler listelenir.
            </p>
          )}

          {sheet.step === 'service' && (
            <div className="mt-4 space-y-3">
              {activeSubscribers.length > 0 && (
                <label className="block text-xs font-black uppercase text-slate-400">
                  Abone (opsiyonel)
                  <select
                    value={subscriberId}
                    onChange={e => {
                      const id = e.target.value;
                      if (!id) {
                        setSubscriberId('');
                        setCustomerName('');
                        return;
                      }
                      pickSubscriber(id);
                    }}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800"
                  >
                    <option value="">Kapıdan gelen · isimsiz</option>
                    {activeSubscribers.map(s => {
                      const label = s.firstName ? `${s.firstName} ${s.lastName || ''}`.trim() : s.name;
                      return (
                        <option key={s.id} value={s.id}>
                          {label} · {s.phone}
                        </option>
                      );
                    })}
                  </select>
                </label>
              )}

              {customerName || subscriberId ? (
                <p className="text-sm font-black text-slate-800">
                  {customerName || 'Müşteri'}
                  {subscriberId ? ' · abone (tutar yok)' : ''}
                </p>
              ) : (
                <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                  İsim gerekmez — hizmete basınca randevu oluşur
                </p>
              )}

              {activeCampaigns.length > 0 && !subscriberId && !sheet.insertUntil && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Kampanya</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeCampaigns.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => pickCampaign(c.id)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-black ${
                          campaignId === c.id ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-800 ring-1 ring-violet-200'
                        }`}
                      >
                        {c.name} · ₺{c.price}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const insertCap = sheet.insertUntil
                  ? toMinutes(sheet.insertUntil) - toMinutes(sheet.startTime)
                  : null;
                const staffSvcs = servicesForStaff(sheet.staffId).filter(s => {
                  if (isClassService(s)) return false;
                  if (insertCap == null) return true;
                  const dur = Math.max(1, s.durationMinutes || 0);
                  return dur > 0 && dur <= insertCap;
                });
                const slotGroups = sheet.insertUntil
                  ? []
                  : groupSessions.filter(
                      gs =>
                        gs.staffId === sheet.staffId &&
                        gs.date === selectedDate &&
                        gs.startTime === sheet.startTime,
                    );
                return (
                  <div className="space-y-3">
                    {!sheet.insertUntil && (
                      <>
                        <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900">
                          Grup dersleri Parametre → Grup dersleri ekranından tanımlanır (tarih, çalışan, öğrenciler).
                          {slotGroups.length > 0
                            ? ` Bu saatte ${slotGroups.length} tanımlı seans var — paneldaki yeşil kutuya dokunun.`
                            : ''}
                        </p>
                        <button
                          type="button"
                          onClick={() => setScreen('groupClasses')}
                          className="btn btn-secondary btn-block !min-h-11"
                        >
                          Grup dersi tanımla
                        </button>
                      </>
                    )}
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Hizmet seç</p>
                    {staffSvcs.length === 0 ? (
                      <p className="text-sm font-semibold text-amber-700">
                        {insertCap != null
                          ? `Bekleme ${insertCap} dk — sığan bireysel hizmet yok.`
                          : 'Bu çalışana atanmış bireysel hizmet yok.'}
                      </p>
                    ) : (
                      <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto">
                        {staffSvcs.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => quickAddService(s.id)}
                            className="rounded-2xl bg-slate-50 px-4 py-3 text-left font-bold text-slate-800 ring-1 ring-slate-200 active:bg-brand-600 active:text-white"
                          >
                            <div>{s.name}</div>
                            <div className="text-xs text-slate-500">
                              {s.durationMinutes} dk
                              {s.processingMinutes
                                ? ` · ${s.processingMinutes} dk beklemede başka alınabilir`
                                : ''}
                              {subscriberId ? ' · abone hakkı' : ` · ₺${s.price}`}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {bookMsg && <p className="text-sm font-bold text-slate-700">{bookMsg}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setSheet(null)} className="flex-1 rounded-2xl bg-slate-100 py-3 font-black">
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => setSheet({ ...sheet, step: 'name' })}
                  className="flex-1 rounded-2xl bg-slate-900 py-3 font-black text-white"
                >
                  İsim ekle
                </button>
              </div>
            </div>
          )}

          {sheet.step === 'name' && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-bold text-slate-600">İsim opsiyonel — sonra hizmete dönün</p>
              <div className="flex gap-2">
                <input
                  ref={nameInputRef}
                  value={customerName}
                  onChange={e => {
                    setCustomerName(e.target.value);
                    if (!e.target.value) setSubscriberId('');
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      goServiceStep();
                    }
                  }}
                  placeholder="Müşteri adı (opsiyonel)"
                  autoComplete="name"
                  enterKeyHint="done"
                  inputMode="text"
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold"
                />
                <button
                  type="button"
                  onClick={startVoice}
                  disabled={listening}
                  className={`shrink-0 rounded-2xl px-4 py-3 font-black text-white ${listening ? 'bg-rose-500 animate-pulse' : 'bg-brand-600'}`}
                >
                  {listening ? 'Dinleniyor…' : '🎤 Ses'}
                </button>
              </div>
              <input
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="Telefon (opsiyonel)"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold"
              />
              {voiceError && <p className="text-sm font-bold text-rose-600">{voiceError}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setSheet(null)} className="flex-1 rounded-2xl bg-slate-100 py-3 font-black">
                  Vazgeç
                </button>
                <button type="button" onClick={goServiceStep} className="flex-1 rounded-2xl bg-brand-600 py-3 font-black text-white">
                  Hizmete dön
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {sheet?.mode === 'leave' && (
        <Modal onClose={() => setSheet(null)}>
          <h3 className="text-lg font-black">İzin gir</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{formatDateTr(selectedDate)} · başlangıç {sheet.startTime}</p>
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-black uppercase text-slate-400">
              Süre (dk)
              <input
                type="number"
                min={company.slotInterval || 30}
                step={company.slotInterval || 30}
                value={leaveDuration}
                onChange={e => setLeaveDuration(Math.max(company.slotInterval || 30, Number(e.target.value) || company.slotInterval))}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {[company.slotInterval || 30, 60, 90, 120, 180].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setLeaveDuration(d)}
                  className={`rounded-xl px-3 py-2 text-xs font-black ${
                    leaveDuration === d ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                  }`}
                >
                  {d} dk
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const rem = Math.max(
                    company.slotInterval || 30,
                    toMinutes(dayHours.workEnd) - toMinutes(sheet.startTime),
                  );
                  setLeaveDuration(rem);
                }}
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
              >
                Gün sonuna
              </button>
            </div>
            <p className="rounded-2xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900 ring-1 ring-amber-100">
              Bu süre kapanacak: {sheet.startTime} – {leaveEndPreview}
            </p>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="İzin notu" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setSheet(null)} className="btn btn-secondary flex-1">Vazgeç</button>
              <button type="button" onClick={saveLeave} className="btn flex-1 border-amber-500 bg-amber-500 text-white">
                Kaydet · kapat
              </button>
            </div>
          </div>
        </Modal>
      )}

      {sheet?.mode === 'complete' && (
        <Modal onClose={() => setSheet(null)}>
          <h3 className="text-lg font-black">
            {sheet.event.subscriberId ? 'Abone · tamamla' : 'Tahsilat'}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {sheet.event.customerName || serviceName(sheet.event.serviceId) || 'Misafir'} ·{' '}
            {serviceName(sheet.event.serviceId) || 'İşlem'}
          </p>
          {(() => {
            const svc = services.find(s => s.id === sheet.event.serviceId);
            if (!svc?.requiresConsent) return null;
            return (
              <label className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-3 text-sm font-bold text-amber-950 ring-1 ring-amber-100">
                <input
                  type="checkbox"
                  checked={consentOk}
                  onChange={e => setConsentOk(e.target.checked)}
                  className="mt-0.5"
                />
                Müşteri onamı alındı (lazer / dövme / estetik vb.)
              </label>
            );
          })()}
          {bookMsg && sheet.mode === 'complete' && (
            <p className="mt-2 text-sm font-bold text-rose-600">{bookMsg}</p>
          )}

          {sheet.event.subscriberId ? (
            <div className="mt-4 space-y-3">
              <p className="rounded-2xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-800 ring-1 ring-violet-100">
                Abone randevusu — board’da tutar gösterilmez. Ödeme durumunu burada işaretleyin.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSubscriberPaid(false);
                    setCollected(0);
                  }}
                  className={`rounded-2xl py-3 font-black ring-1 ${
                    !subscriberPaid
                      ? 'bg-slate-800 text-white ring-slate-800'
                      : 'bg-slate-50 text-slate-700 ring-slate-200'
                  }`}
                >
                  Ödenmedi
                </button>
                <button
                  type="button"
                  onClick={() => setSubscriberPaid(true)}
                  className={`rounded-2xl py-3 font-black ring-1 ${
                    subscriberPaid
                      ? 'bg-emerald-600 text-white ring-emerald-600'
                      : 'bg-slate-50 text-slate-700 ring-slate-200'
                  }`}
                >
                  Ödendi
                </button>
              </div>
              {subscriberPaid && (
                <>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setCollected(c => Math.max(0, c - 50))} className="h-14 w-14 rounded-2xl bg-slate-100 text-2xl font-black">−</button>
                    <input
                      type="number"
                      value={collected}
                      onChange={e => setCollected(Number(e.target.value) || 0)}
                      className="min-w-0 flex-1 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-2xl font-black text-emerald-800"
                    />
                    <button type="button" onClick={() => setCollected(c => c + 50)} className="h-14 w-14 rounded-2xl bg-slate-100 text-2xl font-black">+</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`rounded-2xl py-3 font-black ring-1 ${
                        paymentMethod === 'cash' ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-slate-50 text-slate-700 ring-slate-200'
                      }`}
                    >
                      Nakit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`rounded-2xl py-3 font-black ring-1 ${
                        paymentMethod === 'card' ? 'bg-sky-600 text-white ring-sky-600' : 'bg-slate-50 text-slate-700 ring-slate-200'
                      }`}
                    >
                      Kart
                    </button>
                  </div>
                </>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setSheet(null)} className="btn btn-secondary flex-1">Vazgeç</button>
                <button type="button" onClick={saveComplete} className="flex-1 rounded-2xl bg-emerald-600 py-3 font-black text-white">
                  {subscriberPaid ? `Tamamla · ödendi ₺${collected}` : 'Tamamla · ödenmedi'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-2 text-xs font-bold text-slate-400">
                İşlem tutarı: ₺{sheet.event.price ?? 0} — artırıp azaltabilirsiniz
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button type="button" onClick={() => setCollected(c => Math.max(0, c - 50))} className="h-14 w-14 rounded-2xl bg-slate-100 text-2xl font-black">−</button>
                <input
                  type="number"
                  value={collected}
                  onChange={e => setCollected(Number(e.target.value) || 0)}
                  className="min-w-0 flex-1 rounded-2xl border-2 border-brand-200 bg-brand-50 px-4 py-3 text-center text-2xl font-black text-brand-800"
                />
                <button type="button" onClick={() => setCollected(c => c + 50)} className="h-14 w-14 rounded-2xl bg-slate-100 text-2xl font-black">+</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[50, 100, -50, -100].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setCollected(c => Math.max(0, c + d))}
                    className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600"
                  >
                    {d >= 0 ? `+${d}` : d}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCollected(sheet.event.price ?? 0)}
                  className="rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-black text-brand-700"
                >
                  Liste fiyatı
                </button>
              </div>
              <p className="mt-4 text-xs font-black uppercase text-slate-400">Ödeme türü</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`rounded-2xl py-3 font-black ring-1 ${
                    paymentMethod === 'cash' ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-slate-50 text-slate-700 ring-slate-200'
                  }`}
                >
                  Nakit
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`rounded-2xl py-3 font-black ring-1 ${
                    paymentMethod === 'card' ? 'bg-sky-600 text-white ring-sky-600' : 'bg-slate-50 text-slate-700 ring-slate-200'
                  }`}
                >
                  Kart
                </button>
              </div>
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={() => setSheet(null)} className="btn btn-secondary flex-1">Vazgeç</button>
                <button type="button" onClick={saveComplete} className="flex-1 rounded-2xl bg-emerald-600 py-3 font-black text-white">
                  Tamamla · ₺{collected} · {paymentMethod === 'cash' ? 'Nakit' : 'Kart'}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {sheet?.mode === 'expense' && (
        <Modal onClose={() => setSheet(null)}>
          <h3 className="text-lg font-black">Masraf gir</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{staffName(sheet.staffId)} · {formatDateTr(selectedDate)}</p>
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-black uppercase text-slate-400">
              Tutar (₺)
              <input type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold" placeholder="0" />
            </label>
            <label className="block text-xs font-black uppercase text-slate-400">
              Açıklama
              <input value={expDesc} onChange={e => setExpDesc(e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold" placeholder="Malzeme, yol…" />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSheet(null)} className="btn btn-secondary flex-1">
                Vazgeç
              </button>
              <button type="button" onClick={saveExpense} className="btn btn-danger flex-1">
                Kaydet
              </button>
            </div>
          </div>
        </Modal>
      )}

      {sheet?.mode === 'pending' && (
        <Modal onClose={() => setSheet(null)}>
          <h3 className="text-lg font-black">Onay bekleyen randevular</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Web / QR talepleri · onayda müşteriye SMS gider · cevaplanmazsa 15 dk’da bir uyarı sesi
          </p>
          <div className="mt-4 max-h-[55vh] space-y-3 overflow-y-auto">
            {pendingList.length === 0 ? (
              <p className="py-6 text-center text-sm font-bold text-slate-400">Bekleyen talep yok</p>
            ) : (
              pendingList.map(row => (
                <article key={row.id} className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                  <p className="font-black text-slate-900">
                    {row.customer_name || 'Müşteri'} · {row.customer_phone || '—'}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {formatDateTr(String(row.appointment_date).slice(0, 10))} · {String(row.start_time).slice(0, 5)}
                    {row.service_name ? ` · ${row.service_name}` : ''}
                    {row.staff_name ? ` · ${row.staff_name}` : ''}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={pendingBusyId === row.id}
                      onClick={() => void decidePending(row, 'cancelled')}
                      className="btn btn-danger-soft flex-1 !min-h-11"
                    >
                      Reddet
                    </button>
                    <button
                      type="button"
                      disabled={pendingBusyId === row.id}
                      onClick={() => void decidePending(row, 'approved')}
                      className="btn flex-1 !min-h-11 border-emerald-600 bg-emerald-600 text-white"
                    >
                      Onayla
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
          {pendingMsg && <p className="mt-3 text-sm font-bold text-slate-700">{pendingMsg}</p>}
          <button type="button" onClick={() => setSheet(null)} className="btn btn-secondary btn-block mt-4 !min-h-11">
            Kapat
          </button>
        </Modal>
      )}

      {sheet?.mode === 'detail' && (() => {
        const detailSvc =
          sheet.event.kind === 'appointment'
            ? services.find(s => s.id === sheet.event.serviceId)
            : undefined;
        const waitWin =
          sheet.event.kind === 'appointment' && sheet.event.status === 'planned'
            ? processingWindow(
                sheet.event.startTime,
                sheet.event.endTime,
                detailSvc?.processingMinutes,
              )
            : null;
        const waitMins = waitWin
          ? toMinutes(waitWin.end) - toMinutes(waitWin.start)
          : 0;

        return (
          <Modal onClose={() => setSheet(null)}>
            <h3 className="text-lg font-black">
              {sheet.event.kind === 'leave' ? 'İzin ayrıntısı' : 'Randevu ayrıntısı'}
            </h3>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Çalışan" value={staffName(sheet.event.staffId)} />
              <Row label="Tarih" value={formatDateTr(sheet.event.date)} />
              <Row label="Saat" value={`${sheet.event.startTime} – ${sheet.event.endTime}`} />
              {sheet.event.kind === 'appointment' && (
                <>
                  <Row label="Müşteri" value={sheet.event.customerName || 'Misafir'} />
                  <Row label="Telefon" value={sheet.event.customerPhone || '—'} />
                  <Row label="Hizmet" value={serviceName(sheet.event.serviceId) || '—'} />
                  <div className={`rounded-2xl px-3 py-3 ring-1 ${waitWin ? 'bg-amber-50 ring-amber-100' : 'bg-slate-50 ring-slate-100'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${waitWin ? 'text-amber-800' : 'text-slate-500'}`}>
                      Randevu alan kişi · zaman çizelgesi
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm font-bold text-slate-800">
                      {appointmentTimeline(
                        sheet.event.startTime,
                        sheet.event.endTime,
                        detailSvc?.processingMinutes,
                      ).map(seg => (
                        <li key={`${seg.kind}-${seg.start}`} className="flex justify-between gap-2">
                          <span
                            className={
                              seg.kind === 'wait'
                                ? 'text-amber-800'
                                : seg.kind === 'continue'
                                  ? 'text-sky-800'
                                  : 'text-slate-600'
                            }
                          >
                            {seg.label}
                          </span>
                          <span className="tabular-nums">
                            {seg.start}–{seg.end}
                            {seg.kind === 'wait' ? ` · ${waitMins} dk` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {waitWin ? (
                      <p className="mt-2 text-[11px] font-semibold text-amber-900/80">
                        İşlem arasında araya randevu · bitişten sonra devam bağlanabilir
                      </p>
                    ) : (
                      <p className="mt-2 text-[11px] font-semibold text-slate-500">
                        Randevu alan kişi: başlangıçtan bitişe saat devamı
                      </p>
                    )}
                  </div>
                  {sheet.event.subscriberId ? (
                    <>
                      <Row label="Tür" value="Abone" />
                      <Row
                        label="Ödeme durumu"
                        value={
                          sheet.event.status !== 'done'
                            ? 'Henüz tamamlanmadı'
                            : (sheet.event.collectedPrice ?? 0) > 0
                              ? `Ödendi · ₺${sheet.event.collectedPrice}${
                                  sheet.event.paymentMethod === 'card'
                                    ? ' · Kart'
                                    : sheet.event.paymentMethod === 'cash'
                                      ? ' · Nakit'
                                      : ''
                                }`
                              : 'Ödenmedi (abone hakkı)'
                        }
                      />
                    </>
                  ) : (
                    <>
                      <Row label="Liste tutarı" value={sheet.event.price != null ? `₺${sheet.event.price}` : '—'} />
                      <Row label="Tahsil" value={sheet.event.collectedPrice != null ? `₺${sheet.event.collectedPrice}` : '—'} />
                      <Row
                        label="Ödeme"
                        value={
                          sheet.event.paymentMethod === 'cash'
                            ? 'Nakit'
                            : sheet.event.paymentMethod === 'card'
                              ? 'Kart'
                              : '—'
                        }
                      />
                    </>
                  )}
                </>
              )}
              <Row label="Durum" value={sheet.event.status === 'done' ? 'Tamamlandı' : sheet.event.status === 'cancelled' ? 'İptal' : 'Planlandı'} />
              <Row label="Not" value={sheet.event.note || '—'} />
            </dl>
            <div className="mt-5 space-y-2">
              {sheet.event.kind === 'appointment' && sheet.event.status === 'planned' && (
                <>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Randevu işlemleri
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openComplete(sheet.event)}
                      className="rounded-2xl bg-emerald-600 py-3.5 text-sm font-black text-white"
                    >
                      Tamamla
                    </button>
                    <button
                      type="button"
                      onClick={() => openComplete(sheet.event)}
                      className="rounded-2xl bg-teal-600 py-3.5 text-sm font-black text-white"
                    >
                      Tahsilat
                    </button>
                  </div>
                  <p className="pt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Yeni iş
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {waitWin && (
                      <button
                        type="button"
                        onClick={() => openInsertDuringWait(sheet.event)}
                        className="rounded-2xl bg-brand-600 py-3.5 text-sm font-black text-white"
                      >
                        Araya randevu al
                        <span className="mt-0.5 block text-[10px] font-bold opacity-80">
                          {waitWin.start}–{waitWin.end} bekleme
                        </span>
                      </button>
                    )}
                    {toMinutes(sheet.event.endTime) < toMinutes(dayHours.workEnd) && (
                      <button
                        type="button"
                        onClick={() => openFollowOnAppointment(sheet.event)}
                        className={`rounded-2xl bg-violet-600 py-3.5 text-sm font-black text-white ${
                          waitWin ? '' : 'sm:col-span-2'
                        }`}
                      >
                        Sonrasına randevu
                        <span className="mt-0.5 block text-[10px] font-bold opacity-80">
                          {sheet.event.endTime} itibarıyla bağla
                        </span>
                      </button>
                    )}
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {sheet.event.status !== 'cancelled' && sheet.event.status !== 'done' && (
                  <button
                    type="button"
                    onClick={() => {
                      setEventStatus(sheet.event.id, 'cancelled');
                      setSheet(null);
                    }}
                    className="rounded-2xl bg-rose-50 py-3 text-sm font-black text-rose-700 ring-1 ring-rose-100"
                  >
                    İptal et
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSheet(null)}
                  className={`rounded-2xl bg-slate-100 py-3 text-sm font-black text-slate-700 ${
                    sheet.event.status === 'cancelled' || sheet.event.status === 'done'
                      ? 'col-span-2'
                      : ''
                  }`}
                >
                  Kapat
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
      <dt className="font-bold text-slate-400">{label}</dt>
      <dd className="text-right font-black text-slate-900">{value}</dd>
    </div>
  );
}
