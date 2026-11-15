import { addDays, toMinutes } from './dates';
import { placeServicesOnDay, type Placement } from './scheduleCampaign';
import type { DayEvent, Service, Staff } from '../types';

/** JS getDay: 0=Pazar … 6=Cumartesi */
export const WEEKDAY_OPTIONS: { key: number; label: string }[] = [
  { key: 1, label: 'Pzt' },
  { key: 2, label: 'Sal' },
  { key: 3, label: 'Çar' },
  { key: 4, label: 'Per' },
  { key: 5, label: 'Cum' },
  { key: 6, label: 'Cmt' },
  { key: 0, label: 'Paz' },
];

export type ProgramVisit = {
  date: string;
  placements: Placement[];
};

type PlanInput = {
  startDate: string;
  endDate: string;
  weekdays: number[];
  timeStart: string;
  timeEnd: string;
  /** Her ziyarette yerleştirilecek hizmetler (paketten bir seans) */
  serviceIds: string[];
  services: Service[];
  staff: Staff[];
  events: DayEvent[];
  workStart: string;
  workEnd: string;
  slotInterval: number;
};

function dateWeekday(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

function enumerateDays(startDate: string, endDate: string): string[] {
  if (endDate < startDate) return [];
  const out: string[] = [];
  let cur = startDate;
  let guard = 0;
  while (cur <= endDate && guard < 800) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard += 1;
  }
  return out;
}

export function endDateFromMonths(startDate: string, months: number): string {
  const [y, m, d] = startDate.split('-').map(Number);
  const end = new Date(y, m - 1 + Math.max(1, months), d);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
}

/**
 * Kayıtlı plana göre: start–end aralığında seçilen hafta günlerinin
 * tamamında saat penceresi içinde boş slotlara ziyaret planlar.
 */
export function planSubscriberProgram(input: PlanInput): ProgramVisit[] {
  const {
    startDate,
    endDate,
    weekdays,
    timeStart,
    timeEnd,
    serviceIds,
    services,
    staff,
    events,
    workStart,
    workEnd,
    slotInterval,
  } = input;

  if (!weekdays.length || !serviceIds.length) return [];

  const windowStart = toMinutes(timeStart);
  const windowEnd = toMinutes(timeEnd);
  if (windowEnd <= windowStart) return [];

  const scheduleDays = enumerateDays(startDate, endDate)
    .filter(d => weekdays.includes(dateWeekday(d)))
    .sort();

  if (!scheduleDays.length) return [];

  const visits: ProgramVisit[] = [];
  let workingEvents = [...events];
  const fromTime = toMinutes(timeStart) >= toMinutes(workStart) ? timeStart : workStart;

  for (const date of scheduleDays) {
    const placements = placeServicesOnDay({
      date,
      fromTime,
      serviceIds,
      services,
      staff,
      events: workingEvents,
      workStart,
      workEnd,
      slotInterval,
    }).filter(p => {
      const sm = toMinutes(p.startTime);
      return sm >= windowStart && sm < windowEnd;
    });

    if (!placements.length) continue;

    for (const p of placements) {
      workingEvents = [
        ...workingEvents,
        {
          id: `tmp-${date}-${p.startTime}-${p.staffId}`,
          kind: 'appointment' as const,
          staffId: p.staffId,
          date,
          startTime: p.startTime,
          endTime: p.endTime,
          status: 'planned' as const,
          createdAt: '',
          updatedAt: '',
        },
      ];
    }
    visits.push({ date, placements });
  }

  return visits;
}
