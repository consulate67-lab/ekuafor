import { useEffect, useRef, useState } from 'react';
import { reportsApi, type Period, type StaffStat, type Summary } from '../../api/business';
import { apiError } from '../../api/client';
import { PeriodTabs } from '../../components/business/PeriodTabs';
import { Card, EmptyState, Spinner, formatMoney } from '../../components/ui';
import { todayKey } from '../../lib/dates';
import type { Labels } from '../../lib/labels';

export function ReportsTab({ isAdmin, labels }: { isAdmin: boolean; labels: Labels }) {
    const [period, setPeriod] = useState<Period>('today');
    const [summary, setSummary] = useState<Summary | null>(null);
    const [staff, setStaff] = useState<StaffStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const requestRef = useRef(0);

    useEffect(() => {
        const request = ++requestRef.current;
        setLoading(true);
        setError('');
        const localDate = todayKey();
        Promise.all([
            reportsApi.summary(period, localDate),
            isAdmin ? reportsApi.staff(period, localDate) : Promise.resolve([]),
        ])
            .then(([s, st]) => {
                if (request !== requestRef.current) return;
                setSummary(s);
                setStaff(st.filter(row => row.count > 0 || row.actual_collected > 0));
            })
            .catch(err => request === requestRef.current && setError(apiError(err, 'Rapor yüklenemedi')))
            .finally(() => request === requestRef.current && setLoading(false));
    }, [period, isAdmin]);

    const net = summary ? summary.actual_collected - summary.total_expenses : 0;

    return (
        <div className="space-y-5">
            <PeriodTabs value={period} onChange={setPeriod} />
            {!isAdmin && <p className="text-xs font-bold text-slate-400 text-center">Sadece size ait randevular gösterilir.</p>}

            {error && <p role="alert" className="p-4 rounded-2xl bg-rose-50 text-rose-700 text-sm font-bold">{error}</p>}

            {loading || !summary ? (
                !error && <div className="py-12 flex justify-center"><Spinner /></div>
            ) : (
                <>
                    <Card className="bg-slate-900 border-slate-900 text-white">
                        {isAdmin ? (
                            <>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Net (tahsilat − masraf)</p>
                                <p className={`text-4xl font-black mt-1 ${net < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatMoney(net)}</p>
                            </>
                        ) : (
                            <>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Priminiz</p>
                                <p className="text-4xl font-black mt-1 text-emerald-400">{formatMoney(summary.commission)}</p>
                            </>
                        )}
                    </Card>
                    <div className="grid grid-cols-2 gap-3">
                        <Metric label="Randevu" value={String(summary.total_appointments)} />
                        <Metric label="Beklenen ciro" value={formatMoney(summary.total_booked_value)} hint="İptal hariç tüm randevular" />
                        <Metric label="Tahsilat" value={formatMoney(summary.actual_collected)} tone="text-emerald-600" />
                        {isAdmin && <Metric label="Masraf" value={formatMoney(summary.total_expenses)} tone="text-rose-600" />}
                    </div>

                    {isAdmin && (
                        <section aria-labelledby="staff-report" className="space-y-3">
                            <h2 id="staff-report" className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">{labels.staff} bazında</h2>
                            {staff.length === 0 ? (
                                <EmptyState icon="📊" title="Bu dönemde personel hareketi yok" />
                            ) : (
                                <ul className="space-y-2">
                                    {staff.map(row => (
                                        <li key={row.staff_id}>
                                            <Card className="flex items-center gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-black text-slate-900 truncate">{row.staff_name}</p>
                                                    <p className="text-xs font-bold text-slate-400">
                                                        {row.count} randevu{row.actual_commission > 0 && ` · prim ${formatMoney(row.actual_commission)}`}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="font-black text-emerald-600">{formatMoney(row.actual_collected)}</p>
                                                    <p className="text-[10px] font-bold text-slate-400">/ {formatMoney(row.total_booked_value)}</p>
                                                </div>
                                            </Card>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

function Metric({ label, value, hint, tone = 'text-slate-900' }: { label: string; value: string; hint?: string; tone?: string }) {
    return (
        <Card>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className={`text-xl font-black mt-1 truncate ${tone}`}>{value}</p>
            {hint && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{hint}</p>}
        </Card>
    );
}
