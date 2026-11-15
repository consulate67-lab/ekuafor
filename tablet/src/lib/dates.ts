const pad = (n: number) => String(n).padStart(2, '0');

export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const addDays = (key: string, n: number) => {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};

/** Görüntüleme: gün.ay.yıl (ör. 13.11.2026) — depolama YYYY-MM-DD kalır */
export const formatDateTr = (key?: string | null) => {
  if (!key) return '—';
  const raw = String(key).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return raw;
  return `${m[3]}.${m[2]}.${m[1]}`;
};

export const formatDateRangeTr = (start?: string | null, end?: string | null) =>
  `${formatDateTr(start)} → ${formatDateTr(end)}`;

export const dayLabel = (key: string) => {
  const today = todayKey();
  if (key === today) return 'Bugün';
  if (key === addDays(today, 1)) return 'Yarın';
  if (key === addDays(today, -1)) return 'Dün';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const fromMinutes = (total: number) =>
  `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;

export const parseKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
};

export const monthLabel = (year: number, month: number) =>
  new Date(year, month - 1, 1).toLocaleDateString('tr-TR', {
    month: 'long',
    year: 'numeric',
  });

/** Ay ızgarası: Pazartesi başlangıç. null = boş hücre */
export const monthGrid = (year: number, month: number): (string | null)[] => {
  const first = new Date(year, month - 1, 1);
  // JS: 0=Pazar … 6=Cumartesi → Pazartesi=0
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(`${year}-${pad(month)}-${pad(d)}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

export const shiftMonth = (year: number, month: number, delta: number) => {
  const dt = new Date(year, month - 1 + delta, 1);
  return { year: dt.getFullYear(), month: dt.getMonth() + 1 };
};