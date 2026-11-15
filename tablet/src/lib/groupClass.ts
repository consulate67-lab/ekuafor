import type { DayEvent, GroupSession, Service, Subscriber } from '../types';
import { ageFromBirthDate } from './sectorSubscriberProfile';
import { coversSlot, overlaps, slotEnd } from './slots';
import { addDays, toMinutes, todayKey } from './dates';

export function serviceCapacity(svc: Service | undefined): number {
  if (!svc) return 1;
  if (svc.bookingMode !== 'class' && !/^grup\b/i.test((svc.name || '').trim())) return 1;
  return Math.max(1, svc.capacity ?? 8);
}

export function isClassService(svc: Service | undefined): boolean {
  if (!svc) return false;
  if (svc.bookingMode === 'class') return true;
  if (svc.bookingMode === 'resource') return false;
  return /^(grup|wod)\b/i.test((svc.name || '').trim());
}

export function isResourceService(svc: Service | undefined): boolean {
  return svc?.bookingMode === 'resource';
}

/** Grup dersi ekranında “abone / öğrenci” etiketi */
export function groupParticipantLabel(sectorSlugs: string[]): string {
  const edu = sectorSlugs.some(s =>
    ['tutoring', 'music', 'pilates_yoga', 'fitness', 'crossfit', 'dance', 'martial', 'pool', 'coaching'].includes(s),
  );
  return edu ? 'Katılımcı (abone)' : 'Abone';
}

export function sessionAgeLabel(gs: { minAge?: number; maxAge?: number }): string {
  if (gs.minAge != null && gs.maxAge != null) return `${gs.minAge}–${gs.maxAge} yaş`;
  if (gs.minAge != null) return `${gs.minAge}+ yaş`;
  if (gs.maxAge != null) return `≤${gs.maxAge} yaş`;
  return '';
}

/** Abonenin yaşının seans sınırına uyup uymadığı */
export function subscriberFitsSessionAge(
  birthDate: string | undefined,
  session: { minAge?: number; maxAge?: number; date?: string },
): { ok: boolean; age: number | null; reason?: string } {
  const age = birthDate ? ageFromBirthDate(birthDate, session.date) : null;
  if (session.minAge == null && session.maxAge == null) return { ok: true, age };
  if (age == null) {
    return { ok: false, age: null, reason: 'Bu seans için doğum tarihi gerekli' };
  }
  if (session.minAge != null && age < session.minAge) {
    return { ok: false, age, reason: `Yaş ${age} — alt sınır ${session.minAge}` };
  }
  if (session.maxAge != null && age > session.maxAge) {
    return { ok: false, age, reason: `Yaş ${age} — üst sınır ${session.maxAge}` };
  }
  return { ok: true, age };
}

export function findGroupSession(
  sessions: GroupSession[],
  opts: { staffId: string; date: string; startTime: string; serviceId: string },
): GroupSession | undefined {
  return sessions.find(
    s =>
      s.staffId === opts.staffId &&
      s.date === opts.date &&
      s.startTime === opts.startTime &&
      s.serviceId === opts.serviceId,
  );
}

/** Slotu kapsayan grup seansları (çalışan + gün) */
export function groupSessionsCoveringSlot(
  sessions: GroupSession[],
  services: Service[],
  opts: { staffId: string; date: string; slot: string },
): GroupSession[] {
  return sessions.filter(gs => {
    if (gs.staffId !== opts.staffId || gs.date !== opts.date) return false;
    const svc = services.find(s => s.id === gs.serviceId);
    const duration = Math.max(15, svc?.durationMinutes || 60);
    const end = slotEnd(gs.startTime, duration);
    return coversSlot(gs.startTime, end, opts.slot);
  });
}

export function sessionOccupancy(
  gs: GroupSession,
  events: DayEvent[],
): { booked: number; capacity: number; remaining: number } {
  const attendees = sessionAttendees(events, {
    staffId: gs.staffId,
    date: gs.date,
    startTime: gs.startTime,
    serviceId: gs.serviceId,
  });
  const capacity = Math.max(1, gs.capacity);
  return {
    booked: attendees.length,
    capacity,
    remaining: Math.max(0, capacity - attendees.length),
  };
}

export function sessionsForDate(sessions: GroupSession[], date: string): GroupSession[] {
  return sessions
    .filter(s => s.date === date)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
}

/** Aynı adlı hizmet id’leri (eski kurulum / çift kayıt eşlemesi) */
export function relatedServiceIds(serviceId: string, services: Service[]): string[] {
  const svc = services.find(s => s.id === serviceId);
  const nameKey = (svc?.name || '').toLocaleLowerCase('tr-TR').trim();
  const ids = new Set<string>([serviceId]);
  if (nameKey) {
    for (const s of services) {
      if (s.name.toLocaleLowerCase('tr-TR').trim() === nameKey) ids.add(s.id);
    }
  }
  return [...ids];
}

/** Abonenin bu grup dersi (veya aynı adlı hizmet) için kalan hakkı */
export function subscriberRightsForService(
  sub: Subscriber,
  serviceId: string,
  services: Service[],
): { left: number; consumeId: string } {
  const related = relatedServiceIds(serviceId, services);
  let bestId = serviceId;
  let best = 0;
  for (const id of related) {
    const n = sub.remainingByService[id] || 0;
    if (n > best) {
      best = n;
      bestId = id;
    }
  }
  // Pakette var ama hak 0 — yine de listede görünsün
  if (best <= 0 && sub.serviceIds.some(id => related.includes(id))) {
    const packId = related.find(id => sub.serviceIds.includes(id)) || serviceId;
    return { left: 0, consumeId: packId };
  }
  return { left: best, consumeId: bestId };
}

/**
 * Bu grup dersini paketinde / hakkinda olan aboneler.
 * Aynı isimli hizmet id farklarını da kabul eder (abone tanıtırken seçilen Grup dersi).
 */
export function eligibleSubscribers(
  subscribers: Subscriber[],
  serviceId: string,
  date: string,
  query = '',
  services: Service[] = [],
): Subscriber[] {
  const q = query.trim().toLocaleLowerCase('tr-TR');
  const related = relatedServiceIds(serviceId, services);
  const list = subscribers.filter(s => {
    if (s.startDate > date || s.endDate < date) return false;
    const inPackage = s.serviceIds.some(id => related.includes(id));
    const hasRight = related.some(id => (s.remainingByService[id] || 0) > 0);
    if (!inPackage && !hasRight) return false;
    if (!q) return true;
    const label = `${s.firstName || ''} ${s.lastName || ''} ${s.name} ${s.phone}`.toLocaleLowerCase('tr-TR');
    return label.includes(q);
  });
  return list.sort((a, b) => {
    const ra = subscriberRightsForService(a, serviceId, services).left;
    const rb = subscriberRightsForService(b, serviceId, services).left;
    if (ra !== rb) return rb - ra;
    return subscriberLabel(a).localeCompare(subscriberLabel(b), 'tr');
  });
}

export function sessionAttendees(
  events: DayEvent[],
  opts: { staffId: string; date: string; startTime: string; serviceId: string },
): DayEvent[] {
  return events.filter(
    e =>
      e.kind === 'appointment' &&
      e.status !== 'cancelled' &&
      e.staffId === opts.staffId &&
      e.date === opts.date &&
      e.startTime === opts.startTime &&
      e.serviceId === opts.serviceId,
  );
}

export function sessionRemaining(capacity: number, attendees: DayEvent[]): number {
  return Math.max(0, capacity - attendees.length);
}

export function subscriberLabel(s: Subscriber): string {
  if (s.firstName) return `${s.firstName} ${s.lastName || ''}`.trim();
  return s.name || s.phone || 'Abone';
}

export function groupSessionEndTime(
  startTime: string,
  serviceId: string,
  services: Service[],
): string {
  const svc = services.find(s => s.id === serviceId);
  const duration = Math.max(15, svc?.durationMinutes || 60);
  return slotEnd(startTime, duration);
}

/** Aynı abone, aynı gün, çakışan saat aralığında başka grup dersi var mı? */
export function subscriberGroupConflict(
  sessions: GroupSession[],
  services: Service[],
  opts: {
    subscriberId: string;
    date: string;
    startTime: string;
    serviceId: string;
    excludeSessionId?: string;
  },
): GroupSession | null {
  const end = groupSessionEndTime(opts.startTime, opts.serviceId, services);
  for (const gs of sessions) {
    if (opts.excludeSessionId && gs.id === opts.excludeSessionId) continue;
    if (gs.date !== opts.date) continue;
    if (!(gs.subscriberIds || []).includes(opts.subscriberId)) continue;
    const otherEnd = groupSessionEndTime(gs.startTime, gs.serviceId, services);
    if (overlaps(opts.startTime, end, gs.startTime, otherEnd)) return gs;
  }
  return null;
}

/** Hizmeti verebilen ilk çalışan (otomatik atama) */
export function staffForGroupService(
  staffList: { id: string; serviceIds?: string[] }[],
  serviceId: string,
): string {
  const explicit = staffList.find(p => p.serviceIds?.includes(serviceId));
  if (explicit) return explicit.id;
  const any = staffList.find(p => !p.serviceIds?.length);
  return any?.id || staffList[0]?.id || '';
}

/**
 * Haftanın seçili günlerinden tarih listesi üretir.
 * weekdays: JS getDay — 0=Pazar … 6=Cumartesi
 */
export function expandWeekdayDates(
  fromDate: string,
  weekdays: number[],
  weeks: number,
): string[] {
  if (!weekdays.length || weeks < 1) return [];
  const start = fromDate || todayKey();
  const out: string[] = [];
  const seen = new Set<string>();
  const span = Math.max(1, weeks) * 7;
  for (let i = 0; i < span; i += 1) {
    const key = addDays(start, i);
    const [y, m, d] = key.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    if (!weekdays.includes(dow)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
