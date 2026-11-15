import { coversSlot, generateSlots, slotEnd } from './slots';
import {
  overlapsAnyBusy,
  staffBusyIntervals,
  type TimeInterval,
} from './processingWindows';
import { toMinutes } from './dates';
import type { DayEvent, Service, Staff } from '../types';

export type Placement = {
  staffId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
};

type Input = {
  date: string;
  /** Tıklanan hücre saati — yerleştirme buradan başlar */
  fromTime: string;
  /** Tercih edilen çalışan (hücre); yapamıyorsa diğerleri */
  preferredStaffId?: string;
  serviceIds: string[];
  services: Service[];
  staff: Staff[];
  events: DayEvent[];
  workStart: string;
  workEnd: string;
  slotInterval: number;
};

function staffCanDo(person: Staff, serviceId: string): boolean {
  if (!person.serviceIds?.length) return true;
  return person.serviceIds.includes(serviceId);
}

/** Personelin blokladığı aralıklar — boya beklemesi vb. hariç. */
function staffBusySpans(
  staffId: string,
  date: string,
  events: DayEvent[],
  services: Service[],
): TimeInterval[] {
  const spans: TimeInterval[] = [];
  for (const e of events) {
    if (e.staffId !== staffId || e.date !== date || e.status === 'cancelled') continue;
    if (e.kind === 'leave') {
      spans.push({ start: e.startTime, end: e.endTime });
      continue;
    }
    if (e.kind === 'appointment' && e.serviceId) {
      const svc = services.find(s => s.id === e.serviceId);
      if (svc?.bookingMode === 'class') continue;
      spans.push(...staffBusyIntervals(e.startTime, e.endTime, svc?.processingMinutes));
    }
  }
  return spans;
}

function isFree(
  staffId: string,
  date: string,
  start: string,
  end: string,
  events: DayEvent[],
  tentative: Placement[],
  services: Service[],
  /** Yerleştirilen hizmetin kendi bekleme süresi */
  processingMinutes?: number,
): boolean {
  const existing = staffBusySpans(staffId, date, events, services);
  const ownBusy = staffBusyIntervals(start, end, processingMinutes);
  for (const own of ownBusy) {
    if (overlapsAnyBusy(own.start, own.end, existing)) return false;
  }
  for (const t of tentative) {
    if (t.staffId !== staffId) continue;
    const tSvc = services.find(s => s.id === t.serviceId);
    const tBusy = staffBusyIntervals(t.startTime, t.endTime, tSvc?.processingMinutes);
    for (const own of ownBusy) {
      if (overlapsAnyBusy(own.start, own.end, tBusy)) return false;
    }
  }
  return true;
}

/**
 * Kampanya / abone hizmetlerini gün içinde en yakın boş slotlara yerleştirir.
 * Her hizmet için uygun personeller arasından en erken boşluğu seçer.
 */
export function placeServicesOnDay(input: Input): Placement[] {
  const {
    date,
    fromTime,
    preferredStaffId,
    serviceIds,
    services,
    staff,
    events,
    workStart,
    workEnd,
    slotInterval,
  } = input;

  const slots = generateSlots(workStart, workEnd, slotInterval);
  const fromMin = toMinutes(fromTime);
  const startSlots = slots.filter(s => toMinutes(s) >= fromMin);
  const searchSlots = startSlots.length ? startSlots : slots;

  const out: Placement[] = [];
  let cursorMin = fromMin;

  for (const serviceId of serviceIds) {
    const svc = services.find(s => s.id === serviceId);
    if (!svc) continue;
    const duration = Math.max(slotInterval, svc.durationMinutes || slotInterval);

    const candidates = staff.filter(p => staffCanDo(p, serviceId));
    if (!candidates.length) continue;

    const ordered = [
      ...candidates.filter(c => c.id === preferredStaffId),
      ...candidates.filter(c => c.id !== preferredStaffId),
    ];

    let placed: Placement | null = null;
    const trySlots = searchSlots.filter(s => toMinutes(s) >= cursorMin);

    for (const slot of trySlots.length ? trySlots : searchSlots) {
      const end = slotEnd(slot, duration);
      if (toMinutes(end) > toMinutes(workEnd)) continue;

      for (const person of ordered) {
        if (
          !isFree(
            person.id,
            date,
            slot,
            end,
            events,
            out,
            services,
            svc.processingMinutes,
          )
        )
          continue;
        // Tercih edilen kişi için slot gerçekten o hücreyi kapsıyor mu kontrol
        if (preferredStaffId === person.id && !coversSlot(slot, end, fromTime) && toMinutes(slot) < cursorMin) {
          continue;
        }
        placed = {
          staffId: person.id,
          serviceId,
          startTime: slot,
          endTime: end,
        };
        break;
      }
      if (placed) break;
    }

    if (placed) {
      out.push(placed);
      cursorMin = toMinutes(placed.endTime);
    }
  }

  return out;
}
