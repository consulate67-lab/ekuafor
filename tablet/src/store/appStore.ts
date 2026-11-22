import { create } from 'zustand';
import { clearState, loadState, loadStateAsync, saveState } from '../lib/storage';
import { uid } from '../lib/id';
import { buildSnapshot, pushSnapshot } from '../lib/sync';
import { slotEnd } from '../lib/slots';
import { finalizeCompanyOnServer } from '../lib/finalizeSetup';
import { placeServicesOnDay } from '../lib/scheduleCampaign';
import { companyHoursForDate } from '../lib/workHours';
import {
  findGroupSession,
  isClassService,
  serviceCapacity,
  sessionAttendees,
  staffForGroupService,
  subscriberFitsSessionAge,
  subscriberGroupConflict,
  subscriberLabel,
  subscriberRightsForService,
} from '../lib/groupClass';
import { formatDateRangeTr, isPastDateTime } from '../lib/dates';
import { endDateFromMonths, planSubscriberProgram } from '../lib/scheduleSubscriberProgram';
import type {
  Campaign,
  CompanySetup,
  DayEvent,
  Department,
  GroupSession,
  IdleMediaSettings,
  Screen,
  Service,
  Staff,
  StaffExpense,
  StaffTitle,
  Subscriber,
  SubscriberPayment,
  SubscriberProgramPlan,
  TabletState,
} from '../types';
import { normalizeMediaSettings } from '../lib/idleMedia';
import { isWebServerFirst } from '../lib/runtime';
import { boardPayloadFromState, fetchBoard, saveBoard } from '../lib/boardApi';

interface AppStore extends TabletState {
  screen: Screen;
  selectedDate: string;
  hydrated: boolean;
  lastFinalizeMessage?: string;
  /** Railway board revision (web) */
  boardRevision: number;
  cloudSaveMessage?: string;
  hydrate: () => Promise<void>;
  /** Web: anahtar + companyId ile Railway board yükle */
  bootstrapFromServer: (activationKey: string, companyId?: number) => Promise<{
    ok: boolean;
    message: string;
  }>;
  persist: () => void;
  setScreen: (s: Screen) => void;
  setSelectedDate: (d: string) => void;
  updateMediaSettings: (patch: Partial<IdleMediaSettings>) => void;
  completeSetup: (payload: {
    company: Omit<CompanySetup, 'setupCompletedAt'>;
    departments: Department[];
    staff: Staff[];
    services?: Service[];
  }) => Promise<{ ok: boolean; message: string }>;
  updateCompany: (patch: Partial<CompanySetup>) => void;
  upsertStaff: (staff: Staff) => void;
  removeStaff: (id: string) => void;
  upsertDepartment: (dept: Department) => void;
  upsertService: (service: Service) => void;
  replaceServices: (services: Service[]) => void;
  removeService: (id: string) => void;
  upsertCampaign: (c: Campaign) => void;
  removeCampaign: (id: string) => void;
  upsertSubscriber: (s: Subscriber) => void;
  removeSubscriber: (id: string) => void;
  recordSubscriberPayment: (input: {
    subscriberId: string;
    amount: number;
    method: 'cash' | 'card';
    note?: string;
  }) => void;
  /** Planı aboneye kaydet (henüz randevu yok) */
  saveSubscriberProgramPlan: (input: {
    subscriberId: string;
    startDate: string;
    months: number;
    weekdays: number[];
    timeStart: string;
    timeEnd: string;
  }) => { ok: boolean; message: string };
  /** Kayıtlı plana göre tarih aralığındaki tüm seçili günlere randevu oluştur */
  applySubscriberProgramPlan: (subscriberId: string) => {
    ok: boolean;
    message: string;
    eventIds: string[];
    visitCount: number;
  };
  addAppointment: (input: {
    staffId: string;
    date: string;
    startTime: string;
    /** Kapıdan gelen / isimsiz hızlı randevu için boş bırakılabilir */
    customerName?: string;
    customerPhone?: string;
    serviceId?: string;
    durationMinutes?: number;
    /**
     * true: slot süresine yuvarlama — bekleme aralığına kısa iş sığdırmak için.
     * Süre doğrudan durationMinutes / hizmet süresi kullanılır.
     */
    allowShort?: boolean;
    price?: number;
    note?: string;
    subscriberId?: string;
    campaignId?: string;
    /** false: program planında hak düşmez */
    consumeRemaining?: boolean;
  }) => string | null;
  /** Kampanya/abone hizmetlerini güne yerleştirir; oluşturulan event id listesi */
  bookCampaignBlock: (input: {
    date: string;
    fromTime: string;
    preferredStaffId?: string;
    customerName: string;
    customerPhone?: string;
    campaignId?: string;
    subscriberId?: string;
    serviceIds: string[];
    priceTotal?: number;
  }) => { ok: boolean; message: string; eventIds: string[] };
  /** Grup dersi tanımı oluştur / güncelle (+ öğrencileri senkronize et) */
  upsertGroupSession: (input: {
    id?: string;
    name?: string;
    staffId: string;
    serviceId: string;
    date: string;
    startTime: string;
    capacity?: number;
    minAge?: number | null;
    maxAge?: number | null;
    subscriberIds: string[];
    waitlistSubscriberIds?: string[];
  }) => { ok: boolean; message: string; session: GroupSession | null };
  /** Eski uyumluluk: boş katılımcılı seans oluştur */
  assignGroupSession: (input: {
    staffId: string;
    date: string;
    startTime: string;
    serviceId: string;
  }) => { ok: boolean; message: string; session: GroupSession | null };
  removeGroupSession: (id: string) => void;
  /** Grup dersine abone(ler) ekle — kapasite + yinelenme kontrolü */
  enrollSubscribersToClass: (input: {
    staffId: string;
    date: string;
    startTime: string;
    serviceId: string;
    subscriberIds: string[];
  }) => { ok: boolean; message: string; eventIds: string[] };
  addLeave: (input: {
    staffId: string;
    date: string;
    startTime: string;
    endTime: string;
    note?: string;
  }) => void;
  completeAppointment: (
    id: string,
    collectedPrice: number,
    paymentMethod?: 'cash' | 'card' | null,
  ) => void;
  setEventStatus: (id: string, status: DayEvent['status']) => void;
  addExpense: (input: { staffId: string; date: string; amount: number; description: string }) => void;
  removeExpense: (id: string) => void;
  syncReports: () => Promise<string>;
  retryFinalize: () => Promise<string>;
  /** Web’den onaylanan randevuyu board’a yazar (yinelenmez) */
  ingestApprovedWebAppointment: (input: {
    serverAppointmentId: number;
    date: string;
    startTime: string;
    endTime: string;
    customerName?: string;
    customerPhone?: string;
    serviceName?: string;
    staffName?: string;
    price?: number;
  }) => string | null;
  resetAll: () => void;
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

let cloudSaveTimer: ReturnType<typeof setTimeout> | null = null;

function applyBoardPayload(
  set: (partial: Partial<AppStore>) => void,
  get: () => AppStore,
  payload: NonNullable<Awaited<ReturnType<typeof fetchBoard>>['payload']>,
  opts: { companyId: number; revision: number; activationKey: string },
) {
  const key = opts.activationKey.trim().toUpperCase();
  const company = payload.company
    ? {
        ...payload.company,
        activationKey: key || payload.company.activationKey,
        serverCompanyId: opts.companyId || payload.company.serverCompanyId,
      }
    : null;
  set({
    company,
    departments: payload.departments || [],
    staff: payload.staff || [],
    services: payload.services || [],
    events: payload.events || [],
    expenses: payload.expenses || [],
    campaigns: payload.campaigns || [],
    subscribers: payload.subscribers || [],
    groupSessions: payload.groupSessions || [],
    mediaSettings: normalizeMediaSettings(payload.mediaSettings),
    boardRevision: opts.revision || 0,
    lastSyncAt: new Date().toISOString(),
    screen: company ? 'board' : get().screen,
  });
}

export const useAppStore = create<AppStore>((set, get) => ({
  ...loadState(),
  screen: 'setup',
  selectedDate: today(),
  hydrated: false,
  boardRevision: 0,

  hydrate: async () => {
    const data = await loadStateAsync();
    set({
      ...data,
      expenses: data.expenses || [],
      campaigns: data.campaigns || [],
      subscribers: data.subscribers || [],
      groupSessions: data.groupSessions || [],
      mediaSettings: normalizeMediaSettings(data.mediaSettings),
      boardRevision: 0,
      selectedDate: today(),
    });

    if (isWebServerFirst() && navigator.onLine) {
      const key = String(data.company?.activationKey || '').trim();
      if (key) {
        const board = await fetchBoard({
          deviceId: data.deviceId,
          activationKey: key,
          companyId: data.company?.serverCompanyId,
        });
        if (board.ok && board.payload?.company) {
          applyBoardPayload(set, get, board.payload, {
            companyId: board.companyId || data.company?.serverCompanyId || 0,
            revision: board.revision || 0,
            activationKey: key,
          });
          set({ hydrated: true, deviceId: data.deviceId });
          // Önbellek (otorite sunucu)
          try {
            get().persist();
          } catch {
            /* ignore */
          }
          return;
        }
        if (board.ok && board.companyId) {
          set({
            company: data.company
              ? { ...data.company, serverCompanyId: board.companyId, activationKey: key }
              : data.company,
            hydrated: true,
            screen: data.company ? 'board' : 'setup',
          });
          return;
        }
      }
    }

    set({
      hydrated: true,
      screen: data.company ? 'board' : 'setup',
    });
    get().persist();
  },

  bootstrapFromServer: async (activationKey, companyId) => {
    if (!navigator.onLine) return { ok: false, message: 'İnternet gerekli' };
    const key = activationKey.trim().toUpperCase();
    const board = await fetchBoard({
      deviceId: get().deviceId,
      activationKey: key,
      companyId,
    });
    if (!board.ok) return { ok: false, message: board.message || 'Board yüklenemedi' };

    if (board.payload?.company) {
      applyBoardPayload(set, get, board.payload, {
        companyId: board.companyId || companyId || 0,
        revision: board.revision || 0,
        activationKey: key,
      });
      get().persist();
      return { ok: true, message: board.message || 'Panel Railway’den yüklendi' };
    }

    if (board.companyId) {
      set({
        company: {
          name: get().company?.name || 'Firma',
          workStart: '09:00',
          workEnd: '19:00',
          slotInterval: 30,
          location: null,
          activationKey: key,
          serverCompanyId: board.companyId,
          setupCompletedAt: new Date().toISOString(),
        },
        screen: 'board',
      });
      get().persist();
      return { ok: true, message: 'Firma bağlandı — panel hazır' };
    }

    return { ok: false, message: 'Firma board’u bulunamadı' };
  },

  persist: () => {
    const s = get();
    const snapshot: TabletState = {
      deviceId: s.deviceId,
      company: s.company,
      departments: s.departments,
      staff: s.staff,
      services: s.services,
      events: s.events,
      expenses: s.expenses,
      campaigns: s.campaigns,
      subscribers: s.subscribers,
      groupSessions: s.groupSessions || [],
      syncQueue: s.syncQueue,
      lastSyncAt: s.lastSyncAt,
      mediaSettings: normalizeMediaSettings(s.mediaSettings),
    };

    // APK: yerel otorite. Web: önbellek + Railway.
    try {
      saveState(snapshot);
    } catch {
      /* quota */
    }

    if (!isWebServerFirst()) return;

    const companyId = s.company?.serverCompanyId;
    const key = String(s.company?.activationKey || '').trim();
    if (!companyId || !key || !navigator.onLine) return;

    if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => {
      void (async () => {
        const cur = get();
        const cid = cur.company?.serverCompanyId;
        const akey = String(cur.company?.activationKey || '').trim();
        if (!cid || !akey) return;
        const result = await saveBoard({
          deviceId: cur.deviceId,
          activationKey: akey,
          companyId: cid,
          expectedRevision: cur.boardRevision || undefined,
          payload: boardPayloadFromState(cur),
        });
        if (result.ok) {
          set({
            boardRevision: result.revision ?? cur.boardRevision,
            lastSyncAt: new Date().toISOString(),
            cloudSaveMessage: undefined,
          });
        } else {
          set({ cloudSaveMessage: result.message });
        }
      })();
    }, 700);
  },

  setScreen: screen => set({ screen }),
  setSelectedDate: selectedDate => set({ selectedDate }),

  updateMediaSettings: patch => {
    const current = normalizeMediaSettings(get().mediaSettings);
    set({ mediaSettings: normalizeMediaSettings({ ...current, ...patch }) });
    get().persist();
  },

  completeSetup: async ({ company, departments, staff, services }) => {
    if (!navigator.onLine) {
      return {
        ok: false,
        message: 'Kurulumu tamamlamak için internet gerekli. Firma kaydı sunucuya yazılmalı.',
      };
    }
    if (!String(company.activationKey || '').trim()) {
      return { ok: false, message: 'Kurulum anahtarı eksik. Anahtar adımına dönün.' };
    }

    const nextServices = services && services.length ? services : get().services;
    const draftCompany: CompanySetup = {
      ...company,
      setupCompletedAt: new Date().toISOString(),
    };
    const draftState = {
      ...get(),
      company: draftCompany,
      departments,
      staff,
      services: nextServices,
      campaigns: [] as Campaign[],
      subscribers: [] as Subscriber[],
    };

    const result = await finalizeCompanyOnServer(draftState);
    if (!result.ok || !result.companyId) {
      set({ lastFinalizeMessage: result.message });
      return {
        ok: false,
        message: result.message || 'Firma kaydı tamamlanamadı',
      };
    }

    set({
      company: { ...draftCompany, serverCompanyId: result.companyId },
      departments,
      staff,
      services: nextServices,
      campaigns: [],
      subscribers: [],
      screen: 'board',
      lastFinalizeMessage: result.message,
      boardRevision: 0,
    });
    get().persist();
    // Web: ilk board’u hemen Railway’e yaz
    if (isWebServerFirst() && navigator.onLine) {
      const cur = get();
      const saved = await saveBoard({
        deviceId: cur.deviceId,
        activationKey: String(cur.company?.activationKey || ''),
        companyId: result.companyId,
        payload: boardPayloadFromState(cur),
      });
      if (saved.ok && saved.revision) {
        set({ boardRevision: saved.revision, lastSyncAt: new Date().toISOString() });
      }
    }
    return { ok: true, message: result.message || 'Firma sisteme kaydedildi' };
  },

  retryFinalize: async () => {
    const result = await finalizeCompanyOnServer(get());
    if (result.ok && result.companyId) {
      set({
        company: get().company
          ? { ...get().company!, serverCompanyId: result.companyId }
          : get().company,
        lastFinalizeMessage: result.message,
      });
      get().persist();
    } else {
      set({ lastFinalizeMessage: result.message });
    }
    return result.message;
  },

  updateCompany: patch => {
    const company = get().company;
    if (!company) return;
    set({ company: { ...company, ...patch } });
    get().persist();
  },

  upsertStaff: staff => {
    const list = get().staff;
    const idx = list.findIndex(s => s.id === staff.id);
    const next = [...list];
    if (idx >= 0) next[idx] = staff;
    else next.push(staff);
    set({ staff: next });
    get().persist();
  },

  removeStaff: id => {
    set({ staff: get().staff.filter(s => s.id !== id) });
    get().persist();
  },

  upsertDepartment: dept => {
    const list = get().departments;
    const idx = list.findIndex(d => d.id === dept.id);
    const next = [...list];
    if (idx >= 0) next[idx] = dept;
    else next.push(dept);
    set({ departments: next });
    get().persist();
  },

  upsertService: service => {
    const list = get().services;
    const idx = list.findIndex(s => s.id === service.id);
    const next = [...list];
    if (idx >= 0) next[idx] = service;
    else next.push(service);
    set({ services: next });
    get().persist();
  },

  replaceServices: services => {
    set({ services });
    get().persist();
  },

  removeService: id => {
    set({ services: get().services.filter(s => s.id !== id) });
    get().persist();
  },

  upsertCampaign: c => {
    const list = get().campaigns;
    const idx = list.findIndex(x => x.id === c.id);
    const next = [...list];
    if (idx >= 0) next[idx] = c;
    else next.push(c);
    set({ campaigns: next });
    get().persist();
  },

  removeCampaign: id => {
    set({ campaigns: get().campaigns.filter(c => c.id !== id) });
    get().persist();
  },

  upsertSubscriber: sub => {
    const list = get().subscribers;
    const idx = list.findIndex(x => x.id === sub.id);
    const next = [...list];
    if (idx >= 0) next[idx] = sub;
    else next.push(sub);
    set({ subscribers: next });
    get().persist();
  },

  removeSubscriber: id => {
    set({ subscribers: get().subscribers.filter(s => s.id !== id) });
    get().persist();
  },

  recordSubscriberPayment: input => {
    const amount = Math.max(0, input.amount);
    if (!amount) return;
    const pay: SubscriberPayment = {
      id: uid('pay'),
      amount,
      method: input.method,
      at: new Date().toISOString(),
      note: input.note,
    };
    set({
      subscribers: get().subscribers.map(s => {
        if (s.id !== input.subscriberId) return s;
        const payments = [...(s.payments || []), pay];
        const pricePaid = Math.round((s.pricePaid || 0) + amount);
        return { ...s, payments, pricePaid, paymentMethod: input.method };
      }),
    });
    get().persist();
  },

  saveSubscriberProgramPlan: input => {
    const sub = get().subscribers.find(s => s.id === input.subscriberId);
    if (!sub) return { ok: false, message: 'Abone yok' };
    if (!input.weekdays.length) return { ok: false, message: 'En az bir gün seçin' };
    const months = Math.max(1, input.months);
    const startDate = input.startDate;
    const endDate = endDateFromMonths(startDate, months);
    const plan: SubscriberProgramPlan = {
      startDate,
      endDate,
      months,
      weekdays: [...input.weekdays].sort(),
      timeStart: input.timeStart,
      timeEnd: input.timeEnd,
      createdAt: new Date().toISOString(),
    };
    set({
      subscribers: get().subscribers.map(s =>
        s.id === input.subscriberId ? { ...s, programPlan: plan, startDate, endDate } : s,
      ),
    });
    get().persist();
    return {
      ok: true,
      message: `Plan kaydedildi · ${formatDateRangeTr(startDate, endDate)} · ${plan.weekdays.length} gün/hafta`,
    };
  },

  applySubscriberProgramPlan: subscriberId => {
    const company = get().company;
    const sub = get().subscribers.find(s => s.id === subscriberId);
    if (!company || !sub) return { ok: false, message: 'Abone / firma yok', eventIds: [], visitCount: 0 };
    const plan = sub.programPlan;
    if (!plan) return { ok: false, message: 'Önce program planını kaydedin', eventIds: [], visitCount: 0 };

    const serviceIds = [...new Set(sub.serviceIds)];
    if (!serviceIds.length) {
      return { ok: false, message: 'Abonede hizmet yok', eventIds: [], visitCount: 0 };
    }

    // Aynı planın önceki randevularını iptal et (yeniden uygula)
    if (plan.eventIds?.length) {
      const cancel = new Set(plan.eventIds);
      set({
        events: get().events.map(e =>
          cancel.has(e.id)
            ? { ...e, status: 'cancelled' as const, updatedAt: new Date().toISOString() }
            : e,
        ),
      });
    }

    const visits = planSubscriberProgram({
      startDate: plan.startDate,
      endDate: plan.endDate,
      weekdays: plan.weekdays,
      timeStart: plan.timeStart,
      timeEnd: plan.timeEnd,
      serviceIds,
      services: get().services,
      staff: get().staff,
      events: get().events.filter(e => e.status !== 'cancelled'),
      company,
    });

    if (!visits.length) {
      return { ok: false, message: 'Aralıkta uygun slot bulunamadı', eventIds: [], visitCount: 0 };
    }

    const name = sub.firstName ? `${sub.firstName} ${sub.lastName || ''}`.trim() : sub.name;
    const ids: string[] = [];

    for (const visit of visits) {
      for (const p of visit.placements) {
        const id = get().addAppointment({
          staffId: p.staffId,
          date: visit.date,
          startTime: p.startTime,
          customerName: name,
          customerPhone: sub.phone,
          serviceId: p.serviceId,
          price: 0,
          subscriberId: sub.id,
          campaignId: sub.campaignId,
          note: `Abone program · ${formatDateRangeTr(plan.startDate, plan.endDate)}`,
          consumeRemaining: false,
        });
        if (id) ids.push(id);
      }
    }

    const applied: SubscriberProgramPlan = {
      ...plan,
      eventIds: ids,
      appliedAt: new Date().toISOString(),
    };
    set({
      subscribers: get().subscribers.map(s =>
        s.id === subscriberId ? { ...s, programPlan: applied } : s,
      ),
    });
    get().persist();

    return {
      ok: true,
      message: `${visits.length} güne · ${ids.length} randevu yerleştirildi (${formatDateRangeTr(plan.startDate, plan.endDate)})`,
      eventIds: ids,
      visitCount: visits.length,
    };
  },

  addAppointment: input => {
    const interval = get().company?.slotInterval || 30;
    if (isPastDateTime(input.date, input.startTime, interval)) {
      return null;
    }
    const service = get().services.find(s => s.id === input.serviceId);
    const raw = input.durationMinutes || service?.durationMinutes || interval;
    const duration = input.allowShort ? Math.max(1, raw) : Math.max(interval, raw);
    const price = input.price ?? service?.price ?? 0;
    const now = new Date().toISOString();
    const id = uid('evt');
    const event: DayEvent = {
      id,
      kind: 'appointment',
      staffId: input.staffId,
      date: input.date,
      startTime: input.startTime,
      endTime: slotEnd(input.startTime, duration),
      customerName: (input.customerName || '').trim() || undefined,
      customerPhone: input.customerPhone,
      serviceId: input.serviceId,
      price: input.subscriberId ? 0 : price,
      note: input.note,
      subscriberId: input.subscriberId,
      campaignId: input.campaignId,
      status: 'planned',
      createdAt: now,
      updatedAt: now,
    };
    set({ events: [...get().events, event] });

    if (input.consumeRemaining !== false && input.subscriberId && input.serviceId) {
      set({
        subscribers: get().subscribers.map(s => {
          if (s.id !== input.subscriberId) return s;
          const rem = { ...s.remainingByService };
          if (rem[input.serviceId!] != null) {
            rem[input.serviceId!] = Math.max(0, (rem[input.serviceId!] || 0) - 1);
          }
          return { ...s, remainingByService: rem };
        }),
      });
    }

    get().persist();
    return id;
  },

  bookCampaignBlock: input => {
    const company = get().company;
    if (!company) return { ok: false, message: 'Firma yok', eventIds: [] };

    const day = companyHoursForDate(company, input.date);
    if (day.closed) {
      return { ok: false, message: 'Bu gün (hafta sonu) kapalı', eventIds: [] };
    }

    const placements = placeServicesOnDay({
      date: input.date,
      fromTime: input.fromTime,
      preferredStaffId: input.preferredStaffId,
      serviceIds: input.serviceIds,
      services: get().services,
      staff: get().staff,
      events: get().events,
      workStart: day.workStart,
      workEnd: day.workEnd,
      slotInterval: company.slotInterval || 30,
    });

    if (!placements.length) {
      return { ok: false, message: 'Uygun boş saat bulunamadı', eventIds: [] };
    }

    const perPrice =
      input.priceTotal != null && placements.length
        ? Math.round(input.priceTotal / placements.length)
        : undefined;

    const ids: string[] = [];
    for (const p of placements) {
      const id = get().addAppointment({
        staffId: p.staffId,
        date: input.date,
        startTime: p.startTime,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        serviceId: p.serviceId,
        price: perPrice,
        subscriberId: input.subscriberId,
        campaignId: input.campaignId,
        note: input.campaignId ? 'Kampanya' : input.subscriberId ? 'Abone' : undefined,
      });
      if (id) ids.push(id);
    }

    return {
      ok: true,
      message: `${ids.length} hizmet yerleştirildi`,
      eventIds: ids,
    };
  },

  upsertGroupSession: input => {
    const svc = get().services.find(s => s.id === input.serviceId);
    if (!svc || !isClassService(svc)) {
      return { ok: false, message: 'Grup dersi tipinde bir hizmet seçin', session: null };
    }
    if (!input.date || !input.startTime) {
      return { ok: false, message: 'Tarih ve saat programı gerekli', session: null };
    }
    const autoStaff =
      input.staffId || staffForGroupService(get().staff, input.serviceId);
    if (!autoStaff) {
      return { ok: false, message: 'Bu hizmeti verecek çalışan yok', session: null };
    }
    const subscriberIds = [...new Set(input.subscriberIds.filter(Boolean))];
    const capacity = Math.max(1, input.capacity ?? serviceCapacity(svc));
    if (subscriberIds.length > capacity) {
      return {
        ok: false,
        message: `Kapasite ${capacity}; ${subscriberIds.length} abone seçildi`,
        session: null,
      };
    }

    const now = new Date().toISOString();
    const list = get().groupSessions || [];
    const existing = input.id ? list.find(s => s.id === input.id) : undefined;

    const keyPreview = {
      staffId: autoStaff,
      date: input.date,
      startTime: input.startTime,
      serviceId: input.serviceId,
    };
    const currentAttendees = existing
      ? sessionAttendees(get().events, {
          staffId: existing.staffId,
          date: existing.date,
          startTime: existing.startTime,
          serviceId: existing.serviceId,
        })
      : sessionAttendees(get().events, keyPreview);

    const minAge =
      input.minAge === null
        ? undefined
        : input.minAge != null
          ? Math.max(0, input.minAge)
          : existing?.minAge;
    const maxAge =
      input.maxAge === null
        ? undefined
        : input.maxAge != null
          ? Math.max(0, input.maxAge)
          : existing?.maxAge;

    for (const sid of subscriberIds) {
      const sub = get().subscribers.find(s => s.id === sid);
      if (!sub) {
        return { ok: false, message: 'Geçersiz abone seçimi', session: null };
      }
      if (sub.startDate > input.date || sub.endDate < input.date) {
        return {
          ok: false,
          message: `${subscriberLabel(sub)} bu tarihte abone değil`,
          session: null,
        };
      }
      const ageCheck = subscriberFitsSessionAge(sub.birthDate, {
        minAge,
        maxAge,
        date: input.date,
      });
      if (!ageCheck.ok) {
        return {
          ok: false,
          message: `${subscriberLabel(sub)}: ${ageCheck.reason}`,
          session: null,
        };
      }
      const conflict = subscriberGroupConflict(list, get().services, {
        subscriberId: sid,
        date: input.date,
        startTime: input.startTime,
        serviceId: input.serviceId,
        excludeSessionId: existing?.id,
      });
      if (conflict) {
        const cName = conflict.name || get().services.find(s => s.id === conflict.serviceId)?.name || 'başka grup';
        return {
          ok: false,
          message: `${subscriberLabel(sub)} aynı tarih/saatte “${cName}” dersinde (${conflict.startTime})`,
          session: null,
        };
      }
    }

    const clash = list.find(
      s =>
        s.id !== existing?.id &&
        s.staffId === autoStaff &&
        s.date === input.date &&
        s.startTime === input.startTime &&
        s.serviceId === input.serviceId,
    );
    if (clash) {
      return { ok: false, message: 'Bu çalışan/saat için aynı ders zaten tanımlı', session: null };
    }

    const waitlist = [...new Set((input.waitlistSubscriberIds || []).filter(Boolean))].filter(
      id => !subscriberIds.includes(id),
    );

    const session: GroupSession = {
      id: existing?.id || uid('gcls'),
      name: (input.name || '').trim() || undefined,
      staffId: autoStaff,
      serviceId: input.serviceId,
      date: input.date,
      startTime: input.startTime,
      capacity,
      ...(minAge != null ? { minAge } : {}),
      ...(maxAge != null ? { maxAge } : {}),
      subscriberIds,
      waitlistSubscriberIds: waitlist.length ? waitlist : undefined,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    set({
      groupSessions: existing
        ? list.map(s => (s.id === existing.id ? session : s))
        : [...list, session],
    });

    const want = new Set(subscriberIds);

    for (const e of currentAttendees) {
      if (!e.subscriberId || want.has(e.subscriberId)) continue;
      const sid = e.subscriberId;
      const svcId = session.serviceId;
      set({
        events: get().events.map(ev =>
          ev.id === e.id
            ? { ...ev, status: 'cancelled' as const, updatedAt: now }
            : ev,
        ),
        subscribers: get().subscribers.map(s => {
          if (s.id !== sid) return s;
          const rem = { ...s.remainingByService };
          rem[svcId] = (rem[svcId] || 0) + 1;
          return { ...s, remainingByService: rem };
        }),
      });
    }

    const stillAttending = sessionAttendees(get().events, {
      staffId: session.staffId,
      date: session.date,
      startTime: session.startTime,
      serviceId: session.serviceId,
    });
    const enrolled = new Set(
      stillAttending.map(e => e.subscriberId).filter(Boolean) as string[],
    );
    for (const sid of subscriberIds.filter(id => !enrolled.has(id))) {
      const sub = get().subscribers.find(s => s.id === sid);
      if (!sub) continue;
      const rights = subscriberRightsForService(sub, session.serviceId, get().services);
      // Hak düşümü abonenin paketindeki (aynı adlı) hizmet id’sinden yapılır
      if (rights.left > 0 && rights.consumeId !== session.serviceId) {
        set({
          subscribers: get().subscribers.map(s => {
            if (s.id !== sid) return s;
            const rem = { ...s.remainingByService };
            rem[rights.consumeId] = Math.max(0, (rem[rights.consumeId] || 0) - 1);
            return { ...s, remainingByService: rem };
          }),
        });
      }
      get().addAppointment({
        staffId: session.staffId,
        date: session.date,
        startTime: session.startTime,
        customerName: subscriberLabel(sub),
        customerPhone: sub.phone,
        serviceId: session.serviceId,
        durationMinutes: svc.durationMinutes,
        price: 0,
        subscriberId: sid,
        note: session.name ? `Grup: ${session.name}` : 'Grup dersi',
        // Aynı id ise addAppointment düşsün; farklı id’de yukarıda düştük
        consumeRemaining: rights.left > 0 && rights.consumeId === session.serviceId,
      });
    }

    get().persist();
    return {
      ok: true,
      message: existing ? 'Grup dersi güncellendi' : 'Grup dersi tanımlandı',
      session,
    };
  },

  assignGroupSession: input => {
    const existing = findGroupSession(get().groupSessions || [], input);
    if (existing) {
      return { ok: true, message: 'Seans zaten tanımlı', session: existing };
    }
    return get().upsertGroupSession({
      ...input,
      subscriberIds: [],
    });
  },

  removeGroupSession: id => {
    const gs = (get().groupSessions || []).find(s => s.id === id);
    if (!gs) return;
    const now = new Date().toISOString();
    const attendees = sessionAttendees(get().events, {
      staffId: gs.staffId,
      date: gs.date,
      startTime: gs.startTime,
      serviceId: gs.serviceId,
    });
    for (const e of attendees) {
      if (!e.subscriberId) continue;
      const sid = e.subscriberId;
      const svcId = gs.serviceId;
      set({
        events: get().events.map(ev =>
          ev.id === e.id
            ? { ...ev, status: 'cancelled' as const, updatedAt: now }
            : ev,
        ),
        subscribers: get().subscribers.map(s => {
          if (s.id !== sid) return s;
          const rem = { ...s.remainingByService };
          rem[svcId] = (rem[svcId] || 0) + 1;
          return { ...s, remainingByService: rem };
        }),
      });
    }
    set({ groupSessions: (get().groupSessions || []).filter(s => s.id !== id) });
    get().persist();
  },

  enrollSubscribersToClass: input => {
    const existing = findGroupSession(get().groupSessions || [], input);
    const mergedIds = [
      ...new Set([...(existing?.subscriberIds || []), ...input.subscriberIds]),
    ];
    const result = get().upsertGroupSession({
      id: existing?.id,
      name: existing?.name,
      staffId: input.staffId,
      serviceId: input.serviceId,
      date: input.date,
      startTime: input.startTime,
      capacity: existing?.capacity,
      subscriberIds: mergedIds,
    });
    return {
      ok: result.ok,
      message: result.message,
      eventIds: [],
    };
  },

  addLeave: input => {
    const now = new Date().toISOString();
    const event: DayEvent = {
      id: uid('leave'),
      kind: 'leave',
      staffId: input.staffId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      note: input.note || 'İzin',
      status: 'planned',
      createdAt: now,
      updatedAt: now,
    };
    set({ events: [...get().events, event] });
    get().persist();
  },

  completeAppointment: (id, collectedPrice, paymentMethod) => {
    const amount = Math.max(0, collectedPrice);
    set({
      events: get().events.map(e =>
        e.id === id
          ? {
              ...e,
              status: 'done' as const,
              collectedPrice: amount,
              paymentMethod: amount > 0 ? paymentMethod || 'cash' : undefined,
              updatedAt: new Date().toISOString(),
            }
          : e,
      ),
    });
    get().persist();
  },

  setEventStatus: (id, status) => {
    set({
      events: get().events.map(e =>
        e.id === id ? { ...e, status, updatedAt: new Date().toISOString() } : e,
      ),
    });
    get().persist();
  },

  addExpense: input => {
    const row: StaffExpense = {
      id: uid('exp'),
      staffId: input.staffId,
      date: input.date,
      amount: Math.max(0, input.amount),
      description: input.description.trim() || 'Masraf',
      createdAt: new Date().toISOString(),
    };
    set({ expenses: [row, ...get().expenses] });
    get().persist();
  },

  removeExpense: id => {
    set({ expenses: get().expenses.filter(e => e.id !== id) });
    get().persist();
  },

  syncReports: async () => {
    const state = get();
    const queued = buildSnapshot(state);
    const nextQueue = [...state.syncQueue, queued];
    set({ syncQueue: nextQueue });
    get().persist();

    if (!state.company?.serverCompanyId) {
      const fin = await finalizeCompanyOnServer(get());
      if (fin.ok && fin.companyId) {
        set({
          company: { ...get().company!, serverCompanyId: fin.companyId },
          lastFinalizeMessage: fin.message,
        });
        get().persist();
      }
    }

    const result = await pushSnapshot(get());
    if (result.ok) {
      set({
        lastSyncAt: new Date().toISOString(),
        syncQueue: [],
        events: get().events.map(e => ({ ...e, syncedAt: new Date().toISOString() })),
      });
      get().persist();
    }
    return result.message;
  },

  ingestApprovedWebAppointment: input => {
    const exists = get().events.some(e => e.serverAppointmentId === input.serverAppointmentId);
    if (exists) return null;

    const staffList = get().staff;
    let staffId = staffList[0]?.id;
    if (input.staffName) {
      const norm = input.staffName.trim().toLocaleLowerCase('tr');
      const match = staffList.find(
        s => `${s.firstName} ${s.lastName}`.trim().toLocaleLowerCase('tr') === norm,
      );
      if (match) staffId = match.id;
    }
    if (!staffId) return null;

    const svc = input.serviceName
      ? get().services.find(
          s =>
            s.name.trim().toLocaleLowerCase('tr') ===
            input.serviceName!.trim().toLocaleLowerCase('tr'),
        )
      : undefined;

    const now = new Date().toISOString();
    const id = uid('evt');
    const start = input.startTime.slice(0, 5);
    const end =
      (input.endTime || '').slice(0, 5) ||
      slotEnd(start, svc?.durationMinutes || get().company?.slotInterval || 30);
    const event: DayEvent = {
      id,
      kind: 'appointment',
      staffId,
      date: input.date,
      startTime: start,
      endTime: end,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      serviceId: svc?.id,
      price: input.price ?? svc?.price ?? 0,
      note: 'Web randevu',
      serverAppointmentId: input.serverAppointmentId,
      status: 'planned',
      createdAt: now,
      updatedAt: now,
    };
    set({ events: [...get().events, event] });
    get().persist();
    return id;
  },

  resetAll: () => {
    void clearState({ wipeBackup: true }).then(() => {
      const fresh = loadState();
      set({ ...fresh, screen: 'setup', selectedDate: today(), hydrated: true });
    });
  },
}));

export type { StaffTitle };
