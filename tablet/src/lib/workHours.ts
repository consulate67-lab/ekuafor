import type { CompanySetup, Staff } from '../types';

export type DayHours = {
  workStart: string;
  workEnd: string;
  /** Cumartesi / Pazar ve firma hafta sonu kapalıysa */
  closed: boolean;
  isWeekend: boolean;
};

/** YYYY-MM-DD → Cumartesi veya Pazar mı? */
export function isWeekendDate(dateKey: string): boolean {
  const [y, m, d] = dateKey.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return false;
  const day = new Date(y, m - 1, d).getDay();
  return day === 0 || day === 6;
}

type CompanyHoursFields = Pick<
  CompanySetup,
  'workStart' | 'workEnd' | 'weekendWorkStart' | 'weekendWorkEnd' | 'weekendClosed'
>;

/** Firma saatleri — seçilen güne göre hafta içi veya hafta sonu. */
export function companyHoursForDate(
  company: CompanyHoursFields,
  dateKey: string,
): DayHours {
  const weekend = isWeekendDate(dateKey);
  if (weekend) {
    if (company.weekendClosed) {
      return {
        workStart: company.workStart,
        workEnd: company.workStart,
        closed: true,
        isWeekend: true,
      };
    }
    return {
      workStart: company.weekendWorkStart || company.workStart,
      workEnd: company.weekendWorkEnd || company.workEnd,
      closed: false,
      isWeekend: true,
    };
  }
  return {
    workStart: company.workStart,
    workEnd: company.workEnd,
    closed: false,
    isWeekend: false,
  };
}

/** Çalışan satırında gösterilecek saat — yoksa firma gün saati. */
export function staffHoursForDate(
  person: Staff,
  company: CompanyHoursFields,
  dateKey: string,
): { workStart: string; workEnd: string } {
  const day = companyHoursForDate(company, dateKey);
  if (day.closed) return { workStart: day.workStart, workEnd: day.workEnd };
  if (day.isWeekend) {
    return {
      workStart: person.weekendWorkStart || person.workStart || day.workStart,
      workEnd: person.weekendWorkEnd || person.workEnd || day.workEnd,
    };
  }
  return {
    workStart: person.workStart || day.workStart,
    workEnd: person.workEnd || day.workEnd,
  };
}

export function hoursLabel(h: DayHours): string {
  if (h.closed) return 'Kapalı';
  return `${h.workStart}–${h.workEnd}`;
}
