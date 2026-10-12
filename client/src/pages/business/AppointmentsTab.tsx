import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { businessAppointmentsApi, type PaymentMethod } from '../../api/business';
import { apiError } from '../../api/client';
import { Button, Card, EmptyState, Sheet, Spinner, StatusBadge, formatMoney } from '../../components/ui';
import { addDays, dateKey, dayLabel, shortTime, todayKey } from '../../lib/dates';
import { dialNumber } from '../../lib/phone';
import type { Labels } from '../../lib/labels';
import type { Appointment } from '../../types';

const REFRESH_MS = 60_000;

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
    { key: 'cash', label: 'Nakit', icon: '💵' },
    { key: 'card', label: 'Kart', icon: '💳' },
    { key: 'transfer', label: 'Havale', icon: '🏦' },
];

const serviceText = (a: Appointment) =>
    a.services?.map(s => s.name).filter(Boolean).join(', ') || a.service_name || 'Randevu';

const priceOf = (a: Appointment) =>
    Number(a.price) || (a.services || []).reduce((sum, s) => sum + Number(s.price || 0), 0);

interface Props {
    companyId: number;
    labels: Labels;
    onPendingCount: (count: number) => void;
}

export function AppointmentsTab({ companyId, labels, onPendingCount }: Props) {
    const navigate = useNavigate();
    const [date, setDate] = useState(todayKey);
    const [day, setDay] = useState<Appointment[]>([]);
    const [pending, setPending] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState<number | null>(null);
    const [rejecting, setRejecting] = useState<Appointment | null>(null);
    const [completing, setCompleting] = useState<Appointment | null>(null);
    const requestRef = useRef(0);

    const load = useCallback(async (silent = false) => {
        const request = ++requestRef.current;
        if (!silent) setLoading(true);
        try {
            const [dayList, pendingList] = await Promise.all([
                businessAppointmentsApi.list({ start_date: date, end_date: date }),
                businessAppointmentsApi.list({ start_date: todayKey(), status: 'pending' }),
            ]);
            if (request !== requestRef.current) return;
            setDay(dayList);
            setPending([...pendingList].sort((a, b) =>
                dateKey(a.appointment_date).localeCompare(dateKey(b.appointment_date)) || a.start_time.localeCompare(b.start_time)));
            onPendingCount(pendingList.length);
            setError('');
        } catch (err) {
            if (request === requestRef.current) setError(apiError(err, 'Randevular yüklenemedi'));
        } finally {
            if (request === requestRef.current) setLoading(false);
        }
    }, [date, onPendingCount]);

    useEffect(() => {
        load();
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') load(true);
        }, REFRESH_MS);
        return () => clearInterval(timer);
    }, [load]);

    const setStatus = async (a: Appointment, status: Appointment['status'], extra?: { price?: number; payment_method?: PaymentMethod }) => {
        setBusyId(a.id!);
        try {
            await businessAppointmentsApi.setStatus(a.id!, status, extra);
            await load(true);
            return true;
        } catch (err) {
            setError(apiError(err, 'İşlem yapılamadı'));
            return false;
        } finally {
            setBusyId(null);
        }
    };

    const timeline = useMemo(
        () => day.filter(a => a.status !== 'cancelled').sort((a, b) => a.start_time.localeCompare(b.start_time)),
        [day]
    );
    const cancelledCount = day.length - timeline.length;
    const expected = timeline.reduce((sum, a) => sum + priceOf(a), 0);
    const doneCount = timeline.filter(a => a.status === 'completed').length;

    return (
        <div className="space-y-6">
            {error && (
                <div role="alert" className="p-4 rounded-2xl bg-rose-50 text-rose-700 text-sm font-bold flex items-center justify-between gap-3">
                    <span>{error}</span>
                    <button type="button" className="underline shrink-0" onClick={() => load()}>Tekrar dene</button>
                </div>
            )}

            {pending.length > 0 && (
                <section aria-labelledby="pending-title" className="space-y-3">
                    <h2 id="pending-title" className="text-xs font-black text-amber-600 uppercase tracking-widest">
                        Onay bekleyenler · {pending.length}
                    </h2>
                    {pending.map(a => (
                        <Card key={a.id} className="border-amber-100 bg-amber-50/40">
                            <AppointmentInfo appointment={a} labels={labels} showDate />
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <Button variant="danger" size="lg" disabled={busyId === a.id} onClick={() => setRejecting(a)}>Reddet</Button>
                                <Button variant="success" size="lg" loading={busyId === a.id} onClick={() => setStatus(a, 'approved')}>Onayla</Button>
                            </div>
                        </Card>
                    ))}
                </section>
            )}

            <section aria-labelledby="day-title" className="space-y-3">
                <div className="flex items-center gap-2">
                    <button type="button" aria-label="Önceki gün" onClick={() => setDate(d => addDays(d, -1))} className="w-10 h-10 rounded-2xl bg-white border border-slate-100 font-black text-slate-500">‹</button>
                    <label className="flex-1 relative text-center">
                        <span id="day-title" className="block text-base font-black text-slate-900">{dayLabel(date)}</span>
                        <input
                            type="date"
                            value={date}
                            onChange={e => e.target.value && setDate(e.target.value)}
                            aria-label="Tarih seç"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    </label>
                    <button type="button" aria-label="Sonraki gün" onClick={() => setDate(d => addDays(d, 1))} className="w-10 h-10 rounded-2xl bg-white border border-slate-100 font-black text-slate-500">›</button>
                </div>
                {date !== todayKey() && (
                    <button type="button" onClick={() => setDate(todayKey())} className="block mx-auto text-xs font-black text-brand-600">Bugüne dön</button>
                )}

                <div className="grid grid-cols-3 gap-2 text-center">
                    <Stat label="Randevu" value={String(timeline.length)} />
                    <Stat label="Tamamlanan" value={String(doneCount)} />
                    <Stat label="Beklenen" value={formatMoney(expected)} />
                </div>

                {loading ? (
                    <div className="py-12 flex justify-center"><Spinner /></div>
                ) : timeline.length === 0 ? (
                    <EmptyState
                        title="Bu gün için randevu yok"
                        description={cancelledCount ? `${cancelledCount} iptal edilmiş randevu var.` : undefined}
                        action={<Button onClick={() => navigate(`/book/${companyId}`)}>+ Randevu ekle</Button>}
                    />
                ) : (
                    <ol className="space-y-3">
                        {timeline.map(a => (
                            <li key={a.id} className="flex gap-3">
                                <div className="w-12 shrink-0 pt-4 text-right">
                                    <p className="text-sm font-black text-slate-900">{shortTime(a.start_time)}</p>
                                    <p className="text-[10px] font-bold text-slate-400">{shortTime(a.end_time)}</p>
                                </div>
                                <Card className={`flex-1 ${a.status === 'completed' ? 'opacity-70' : ''}`}>
                                    <AppointmentInfo appointment={a} labels={labels} />
                                    {a.status === 'approved' && (
                                        <div className="grid grid-cols-2 gap-2 mt-3">
                                            <Button variant="secondary" size="sm" disabled={busyId === a.id} onClick={() => setRejecting(a)}>İptal et</Button>
                                            <Button variant="primary" size="sm" disabled={busyId === a.id} onClick={() => setCompleting(a)}>Tamamla</Button>
                                        </div>
                                    )}
                                    {a.status === 'pending' && (
                                        <div className="grid grid-cols-2 gap-2 mt-3">
                                            <Button variant="danger" size="sm" disabled={busyId === a.id} onClick={() => setRejecting(a)}>Reddet</Button>
                                            <Button variant="success" size="sm" loading={busyId === a.id} onClick={() => setStatus(a, 'approved')}>Onayla</Button>
                                        </div>
                                    )}
                                    {a.status === 'completed' && (
                                        <p className="mt-2 text-xs font-bold text-emerald-700">
                                            Tahsil edildi: {formatMoney(a.collected_price ?? a.price)}
                                            {a.payment_method && ` · ${PAYMENT_METHODS.find(m => m.key === a.payment_method)?.label ?? ''}`}
                                        </p>
                                    )}
                                </Card>
                            </li>
                        ))}
                    </ol>
                )}
                {!loading && timeline.length > 0 && cancelledCount > 0 && (
                    <p className="text-center text-xs font-bold text-slate-400">{cancelledCount} iptal edilmiş randevu listede gösterilmiyor</p>
                )}
            </section>

            <button
                type="button"
                onClick={() => navigate(`/book/${companyId}`)}
                aria-label="Randevu ekle"
                className="fixed right-5 bottom-24 z-[90] w-14 h-14 rounded-full bg-brand-600 text-white text-3xl font-black shadow-xl shadow-brand-600/30 active:scale-95 transition"
            >
                +
            </button>

            <Sheet
                open={!!rejecting}
                onClose={() => setRejecting(null)}
                title={rejecting?.status === 'pending' ? 'Randevu reddedilsin mi?' : 'Randevu iptal edilsin mi?'}
                footer={
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" onClick={() => setRejecting(null)}>Vazgeç</Button>
                        <Button
                            variant="danger"
                            loading={busyId === rejecting?.id}
                            onClick={async () => {
                                if (rejecting && await setStatus(rejecting, 'cancelled')) setRejecting(null);
                            }}
                        >
                            {rejecting?.status === 'pending' ? 'Reddet' : 'İptal et'}
                        </Button>
                    </div>
                }
            >
                {rejecting && <AppointmentInfo appointment={rejecting} labels={labels} showDate />}
                <p className="mt-4 text-sm font-medium text-slate-500">Müşteriye telefon numarası varsa SMS ile bilgi verilir.</p>
            </Sheet>

            {completing && (
                <CompleteSheet
                    appointment={completing}
                    busy={busyId === completing.id}
                    onClose={() => setCompleting(null)}
                    onConfirm={async (price, method) => {
                        if (await setStatus(completing, 'completed', { price, payment_method: method })) setCompleting(null);
                    }}
                />
            )}
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 py-3 px-2">
            <p className="text-base font-black text-slate-900 truncate">{value}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
        </div>
    );
}

function AppointmentInfo({ appointment: a, labels, showDate }: { appointment: Appointment; labels: Labels; showDate?: boolean }) {
    const who = a.resource_name ? `${labels.resource}: ${a.resource_name}` : a.staff_name ? `${labels.staff}: ${a.staff_name}` : null;
    return (
        <div className="space-y-1">
            <div className="flex items-start justify-between gap-2">
                <p className="font-black text-slate-900 truncate">{a.customer_name || 'Müşteri'}</p>
                <StatusBadge status={a.status} />
            </div>
            <p className="text-sm font-bold text-slate-600">{serviceText(a)}{(a.party_size ?? 1) > 1 ? ` · ${a.party_size} kişi` : ''}</p>
            <p className="text-xs font-bold text-slate-400">
                {showDate && `${dayLabel(dateKey(a.appointment_date))} · ${shortTime(a.start_time)} · `}
                {who && `${who} · `}
                {formatMoney(priceOf(a))}
            </p>
            {a.customer_phone && (
                <a href={`tel:${dialNumber(a.customer_phone)}`} className="inline-block text-xs font-black text-brand-600">📞 {dialNumber(a.customer_phone)}</a>
            )}
            {a.notes && <p className="text-xs font-medium text-slate-500 italic">“{a.notes}”</p>}
        </div>
    );
}

function CompleteSheet({ appointment, busy, onClose, onConfirm }: {
    appointment: Appointment;
    busy: boolean;
    onClose: () => void;
    onConfirm: (price: number, method: PaymentMethod) => void;
}) {
    const [amount, setAmount] = useState(String(priceOf(appointment) || ''));
    const [method, setMethod] = useState<PaymentMethod>('cash');
    const value = Number(amount.replace(',', '.'));
    const valid = amount !== '' && Number.isFinite(value) && value >= 0;

    return (
        <Sheet
            open
            onClose={onClose}
            title="Randevuyu tamamla"
            footer={<Button block size="lg" variant="success" loading={busy} disabled={!valid} onClick={() => onConfirm(value, method)}>Tahsil et ve tamamla</Button>}
        >
            <p className="text-sm font-bold text-slate-500 mb-4">{appointment.customer_name || 'Müşteri'} · {serviceText(appointment)}</p>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2" htmlFor="collect-amount">Tahsil edilen tutar</label>
            <div className="relative mb-5">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400">₺</span>
                <input
                    id="collect-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={e => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
                    className="w-full pl-10 pr-4 py-4 rounded-2xl border-2 border-slate-100 text-2xl font-black text-slate-900 outline-none focus:border-brand-500"
                />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Ödeme yöntemi</p>
            <div role="radiogroup" className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(m => (
                    <button
                        key={m.key}
                        type="button"
                        role="radio"
                        aria-checked={method === m.key}
                        onClick={() => setMethod(m.key)}
                        className={`py-4 rounded-2xl border-2 font-black text-sm transition ${method === m.key ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-100 text-slate-500'}`}
                    >
                        <span className="block text-2xl mb-1" aria-hidden>{m.icon}</span>
                        {m.label}
                    </button>
                ))}
            </div>
        </Sheet>
    );
}
