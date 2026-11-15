import { fromMinutes, toMinutes } from './dates';

/** SalonBoard.generateHours ile aynı mantık */
export function generateSlots(workStart: string, workEnd: string, slotInterval: number): string[] {
  const step = slotInterval > 0 ? slotInterval : 30;
  let current = toMinutes(workStart || '09:00');
  const end = toMinutes(workEnd || '20:00');
  const hours: string[] = [];
  while (current < end) {
    hours.push(fromMinutes(current));
    current += step;
  }
  return hours;
}

export function slotEnd(start: string, minutes: number): string {
  return fromMinutes(toMinutes(start) + Math.max(1, minutes || 30));
}

export function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

/** Slot başı etkinlik aralığında mı? [start, end) */
export function coversSlot(start: string, end: string, slot: string): boolean {
  const t = toMinutes(slot);
  return toMinutes(start) <= t && t < toMinutes(end);
}

export function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function snapToSlot(time: string, slots: string[]): string {
  if (!slots.length) return time;
  const t = toMinutes(time);
  let best = slots[0];
  for (const s of slots) {
    if (toMinutes(s) <= t) best = s;
    else break;
  }
  return best;
}

export function spanSlots(start: string, end: string, slots: string[]): string[] {
  return slots.filter(h => coversSlot(start, end, h));
}

/**
 * Bugün: bitmiş saat dilimlerini gizle, görünüm “şimdi”den başlasın.
 * Hâlâ süren bir randevu/izin varsa onun başlangıç slotundan göster.
 */
export function visibleSlotsFromNow(
  allSlots: string[],
  currentMinutes: number,
  slotInterval: number,
  ongoingEventStarts: string[] = [],
): string[] {
  if (!allSlots.length) return [];
  const step = slotInterval > 0 ? slotInterval : 30;

  let startIdx = allSlots.findIndex(s => toMinutes(s) + step > currentMinutes);
  if (startIdx < 0) startIdx = Math.max(0, allSlots.length - 1);

  for (const start of ongoingEventStarts) {
    const snapped = snapToSlot(start, allSlots);
    const i = allSlots.indexOf(snapped);
    if (i >= 0 && i < startIdx) startIdx = i;
  }

  return allSlots.slice(startIdx);
}
