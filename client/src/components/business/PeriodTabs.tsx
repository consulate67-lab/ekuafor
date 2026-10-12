import type { Period } from '../../api/business';

const PERIODS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Bugün' },
    { key: 'week', label: 'Bu hafta' },
    { key: 'month', label: 'Bu ay' },
    { key: 'year', label: 'Bu yıl' },
];

export function PeriodTabs({ value, onChange }: { value: Period; onChange: (period: Period) => void }) {
    return (
        <div role="tablist" className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-2xl">
            {PERIODS.map(p => (
                <button
                    key={p.key}
                    type="button"
                    role="tab"
                    aria-selected={value === p.key}
                    onClick={() => onChange(p.key)}
                    className={`py-2 rounded-xl text-xs font-black transition ${value === p.key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}
                >
                    {p.label}
                </button>
            ))}
        </div>
    );
}
