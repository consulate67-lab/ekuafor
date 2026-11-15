import { fromMinutes, toMinutes } from './dates';
import { coversSlot, overlaps } from './slots';

export type TimeInterval = { start: string; end: string };

/** En az bu kadar el işi (dk) kalır; tamamı bloklanır. */
const MIN_HANDS_ON = 10;

export function clampProcessingMinutes(
  durationMinutes: number,
  processingMinutes?: number,
): number {
  if (!processingMinutes || processingMinutes <= 0 || durationMinutes <= MIN_HANDS_ON) {
    return 0;
  }
  return Math.min(processingMinutes, durationMinutes - MIN_HANDS_ON);
}

/**
 * Boya / maske / lifting vb.: ortadaki bekleme penceresi.
 * Personel bu aralıkta başka müşteri alabilir.
 */
export function processingWindow(
  startTime: string,
  endTime: string,
  processingMinutes?: number,
): TimeInterval | null {
  const total = toMinutes(endTime) - toMinutes(startTime);
  const proc = clampProcessingMinutes(total, processingMinutes);
  if (proc <= 0) return null;
  const handsOn = total - proc;
  const before = Math.floor(handsOn / 2);
  const pStart = toMinutes(startTime) + before;
  return { start: fromMinutes(pStart), end: fromMinutes(pStart + proc) };
}

/** Personelin gerçekten meşgul olduğu aralıklar (bekleme hariç). */
export function staffBusyIntervals(
  startTime: string,
  endTime: string,
  processingMinutes?: number,
): TimeInterval[] {
  const win = processingWindow(startTime, endTime, processingMinutes);
  if (!win) return [{ start: startTime, end: endTime }];
  const out: TimeInterval[] = [];
  if (toMinutes(startTime) < toMinutes(win.start)) {
    out.push({ start: startTime, end: win.start });
  }
  if (toMinutes(win.end) < toMinutes(endTime)) {
    out.push({ start: win.end, end: endTime });
  }
  return out.length ? out : [{ start: startTime, end: endTime }];
}

export function overlapsAnyBusy(start: string, end: string, busy: TimeInterval[]): boolean {
  return busy.some(b => overlaps(start, end, b.start, b.end));
}

export function slotInProcessingWindow(
  startTime: string,
  endTime: string,
  processingMinutes: number | undefined,
  slot: string,
): boolean {
  const win = processingWindow(startTime, endTime, processingMinutes);
  if (!win) return false;
  return coversSlot(win.start, win.end, slot);
}

export function slotIsStaffBusy(
  startTime: string,
  endTime: string,
  processingMinutes: number | undefined,
  slot: string,
): boolean {
  return staffBusyIntervals(startTime, endTime, processingMinutes).some(b =>
    coversSlot(b.start, b.end, slot),
  );
}
