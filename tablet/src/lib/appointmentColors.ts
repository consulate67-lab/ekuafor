import type { DayEvent, Service } from '../types';
import { isClassService } from './groupClass';
import { toMinutes } from './dates';

export type ApptColor = {
  bg: string;
  text: string;
  ring: string;
  doneBg: string;
  doneText: string;
};

/** Üst üste binen randevuları ayırt etmek için palet */
export const APPOINTMENT_COLORS: ApptColor[] = [
  {
    bg: 'bg-brand-100',
    text: 'text-brand-900',
    ring: 'ring-brand-200',
    doneBg: 'bg-slate-700',
    doneText: 'text-white',
  },
  {
    bg: 'bg-violet-100',
    text: 'text-violet-950',
    ring: 'ring-violet-200',
    doneBg: 'bg-violet-800',
    doneText: 'text-white',
  },
  {
    bg: 'bg-sky-100',
    text: 'text-sky-950',
    ring: 'ring-sky-200',
    doneBg: 'bg-sky-800',
    doneText: 'text-white',
  },
  {
    bg: 'bg-rose-100',
    text: 'text-rose-950',
    ring: 'ring-rose-200',
    doneBg: 'bg-rose-800',
    doneText: 'text-white',
  },
  {
    bg: 'bg-teal-100',
    text: 'text-teal-950',
    ring: 'ring-teal-200',
    doneBg: 'bg-teal-800',
    doneText: 'text-white',
  },
  {
    bg: 'bg-orange-100',
    text: 'text-orange-950',
    ring: 'ring-orange-200',
    doneBg: 'bg-orange-800',
    doneText: 'text-white',
  },
];

/** Aynı çalışanın günündeki bireysel randevulara sırayla renk indeksi verir. */
export function appointmentColorIndexMap(
  personEvents: DayEvent[],
  services: Service[],
): Map<string, number> {
  const appts = personEvents
    .filter(e => {
      if (e.kind !== 'appointment') return false;
      return !isClassService(services.find(s => s.id === e.serviceId));
    })
    .sort(
      (a, b) =>
        toMinutes(a.startTime) - toMinutes(b.startTime) || a.id.localeCompare(b.id),
    );

  const map = new Map<string, number>();
  appts.forEach((e, i) => map.set(e.id, i % APPOINTMENT_COLORS.length));
  return map;
}

export function colorForAppointment(
  eventId: string,
  indexMap: Map<string, number>,
): ApptColor {
  const idx = indexMap.get(eventId) ?? 0;
  return APPOINTMENT_COLORS[idx % APPOINTMENT_COLORS.length];
}
