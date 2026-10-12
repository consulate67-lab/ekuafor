const pad = (n: number) => String(n).padStart(2, '0');

const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Cihazın yerel saatine göre bugünün `YYYY-MM-DD` hali. */
export const todayKey = () => toKey(new Date());

/** Sunucudan gelen tarih (`YYYY-MM-DD` veya ISO zaman damgası) → yerel `YYYY-MM-DD`. */
export const dateKey = (value: string | Date | null | undefined): string => {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : toKey(d);
};

export const addDays = (key: string, days: number) => {
    const [y, m, d] = key.split('-').map(Number);
    return toKey(new Date(y, m - 1, d + days));
};

/** "Bugün", "Yarın", "Dün" veya "14 Ekim Salı". */
export const dayLabel = (key: string) => {
    const today = todayKey();
    if (key === today) return 'Bugün';
    if (key === addDays(today, 1)) return 'Yarın';
    if (key === addDays(today, -1)) return 'Dün';
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
};

/** "09:30:00" → "09:30" */
export const shortTime = (time?: string | null) => (time ? time.slice(0, 5) : '');
