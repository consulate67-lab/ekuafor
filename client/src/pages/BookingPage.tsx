import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { Service, Company, BookingMode, Availability, ClassSession } from '../types';
import { useAuthStore } from '../store/authStore';
import { App } from '@capacitor/app';
import { getDeviceId } from '../lib/device';

type StepKey = 'service' | 'staff' | 'duration' | 'date' | 'time' | 'session' | 'confirm';

interface Employee {
    id: number;
    first_name: string;
    last_name: string;
    title?: string | null;
    photo?: string | null;
    department_name?: string | null;
}

interface SelectionState {
    serviceIds: number[];
    staffId: number | null;
    duration: number | null;
    date: string | null;
    time: string | null;
    sessionId: number | null;
    partySize: number;
    customerName: string;
    customerPhone: string;
}

const MODE_ICON: Record<BookingMode, string> = { staff: '✨', resource: '📍', class: '👥' };
const STEP_CODES: Record<string, StepKey> = { S: 'service', P: 'staff', D: 'date', T: 'time' };
const LEGACY_FLOWS: Record<string, StepKey[]> = {
    SHP: ['service', 'staff', 'date', 'time'],
    SDP: ['service', 'date', 'staff', 'time'],
    SDT: ['service', 'date', 'time', 'staff'],
};

const localDate = (d: Date) => d.toLocaleDateString('en-CA');
const formatDay = (date: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }) =>
    new Date(`${date}T12:00:00`).toLocaleDateString('tr-TR', opts);
const formatPrice = (n: number) => `₺${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`;
const newRequestId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const formatDialNumber = (phone?: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/[^0-9]/g, '');
    return cleaned.length === 10 && cleaned.startsWith('5') ? '0' + cleaned : cleaned;
};

export default function BookingPageRoute() {
    const { id } = useParams<{ id: string }>();
    return <BookingPage key={id} id={id!} />;
}

function BookingPage({ id }: { id: string }) {
    const { isAuthenticated, user } = useAuthStore();
    const companyId = Number(id);
    /** İşletme kullanıcısı kendi firmasına müşteri adına randevu giriyor. */
    const isBusiness = !!user && ['company_admin', 'staff'].includes(user.role) && Number(user.company_id) === companyId;
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialStaffId = searchParams.get('staff') ? Number(searchParams.get('staff')) : null;

    const [company, setCompany] = useState<Company | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [staff, setStaff] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    const [stepIndex, setStepIndex] = useState(0);
    const [selection, setSelection] = useState<SelectionState>({
        serviceIds: [],
        staffId: initialStaffId,
        duration: null,
        date: null,
        time: null,
        sessionId: null,
        partySize: 1,
        customerName: user && !isBusiness ? `${user.first_name} ${user.last_name || ''}`.trim() : '',
        customerPhone: isBusiness ? '' : user?.phone || '',
    });
    const [availability, setAvailability] = useState<Availability | null>(null);
    const [sessions, setSessions] = useState<ClassSession[]>([]);
    const [sessionsServiceId, setSessionsServiceId] = useState<number | null>(null);
    const [fetching, setFetching] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const requestIdRef = useRef<string | null>(null);

    const update = (patch: Partial<SelectionState>) => setSelection(prev => ({ ...prev, ...patch }));

    const selectedServices = useMemo(
        () => selection.serviceIds.map(sid => services.find(s => s.id === sid)).filter((s): s is Service => !!s),
        [selection.serviceIds, services]
    );
    const mode: BookingMode = selectedServices[0]?.booking_mode || 'staff';
    const durationChoices = useMemo(() => {
        const s = selectedServices[0];
        if (!s || mode !== 'resource') return [];
        return s.duration_options?.length ? s.duration_options : [s.duration_minutes];
    }, [selectedServices, mode]);
    const hasStaffChoice = staff.length > 0 && !initialStaffId;

    const steps = useMemo<StepKey[]>(() => {
        if (mode === 'class') return ['service', 'session', 'confirm'];
        if (mode === 'resource') return ['service', ...(durationChoices.length > 1 ? ['duration' as const] : []), 'date', 'time', 'confirm'];
        const flow = company?.booking_flow || 'SPDT';
        const ordered = flow.length === 4 ? flow.split('').map(c => STEP_CODES[c] || 'service') : LEGACY_FLOWS[flow] || ['service', 'staff', 'date', 'time'];
        return [...ordered.filter(s => s !== 'staff' || hasStaffChoice), 'confirm'];
    }, [mode, durationChoices.length, company?.booking_flow, hasStaffChoice]);
    const step = steps[Math.min(stepIndex, steps.length - 1)];
    const staffAfterTime = steps.indexOf('staff') > steps.indexOf('time');

    const selectedSession = sessions.find(s => s.id === selection.sessionId) || null;
    const selectedSlot = availability?.slots.find(s => s.time === selection.time) || null;
    const selectedStaff = staff.find(s => s.id === selection.staffId) || null;
    const staffOptions = staffAfterTime && selectedSlot?.staff_ids ? staff.filter(s => selectedSlot.staff_ids!.includes(s.id)) : staff;

    const totalPrice = useMemo(() => {
        if (mode === 'class') return Number(selectedSession?.price ?? selectedServices[0]?.price ?? 0) * selection.partySize;
        if (mode === 'resource') {
            const s = selectedServices[0];
            return s ? Number(s.price) * (selection.duration || s.duration_minutes) / s.duration_minutes : 0;
        }
        return selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
    }, [mode, selectedServices, selectedSession, selection.partySize, selection.duration]);
    const totalDuration = mode === 'resource'
        ? selection.duration || selectedServices[0]?.duration_minutes || 0
        : selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);

    const goNext = useCallback(() => setStepIndex(i => Math.min(i + 1, steps.length - 1)), [steps.length]);
    const goBack = useCallback(() => {
        setError(null);
        if (stepIndex === 0) navigate(-1);
        else setStepIndex(i => i - 1);
    }, [stepIndex, navigate]);

    useEffect(() => {
        const handler = App.addListener('backButton', goBack);
        return () => { handler.then(h => h.remove()); };
    }, [goBack]);

    useEffect(() => {
        if (!user || isBusiness) return;
        setSelection(prev => ({
            ...prev,
            customerName: prev.customerName || `${user.first_name} ${user.last_name || ''}`.trim(),
            customerPhone: prev.customerPhone || user.phone || '',
        }));
    }, [user, isBusiness]);

    useEffect(() => {
        const load = async () => {
            try {
                const [compRes, servicesRes, staffRes] = await Promise.all([
                    api.get(`/companies/${id}`),
                    api.get('/services', { params: { company_id: id } }),
                    api.get(`/companies/${id}/employees`),
                ]);
                setCompany(compRes.data.data);
                setServices((servicesRes.data?.data || []).filter((s: Service) => s.is_active !== false));
                setStaff(staffRes.data?.data || []);
                if (searchParams.get('ref') === 'qr') {
                    const favorites: number[] = JSON.parse(localStorage.getItem('saloon_favorites') || '[]');
                    if (!favorites.includes(companyId)) localStorage.setItem('saloon_favorites', JSON.stringify([...favorites, companyId]));
                }
            } catch (err) {
                console.error('Booking data failed', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, companyId, searchParams]);

    useEffect(() => {
        if (step !== 'time' || !selection.date || selection.serviceIds.length === 0) return;
        let cancelled = false;
        setFetching(true);
        api.get('/availability', {
            params: {
                company_id: companyId,
                service_ids: selection.serviceIds.join(','),
                date: selection.date,
                staff_id: mode === 'staff' && !staffAfterTime ? selection.staffId || undefined : undefined,
                duration: mode === 'resource' ? selection.duration || undefined : undefined,
            },
        })
            .then(res => { if (!cancelled) setAvailability(res.data.data); })
            .catch(err => { if (!cancelled) { setAvailability(null); setError(err.response?.data?.error || 'Müsaitlik bilgisi alınamadı'); } })
            .finally(() => { if (!cancelled) setFetching(false); });
        return () => { cancelled = true; };
    }, [step, companyId, selection.date, selection.serviceIds, selection.staffId, selection.duration, mode, staffAfterTime, refreshKey]);

    useEffect(() => {
        if (step !== 'session' || !selection.serviceIds[0]) return;
        let cancelled = false;
        setFetching(true);
        api.get('/class-sessions', { params: { company_id: companyId, service_id: selection.serviceIds[0] } })
            .then(res => { if (!cancelled) { setSessions(res.data.data || []); setSessionsServiceId(selection.serviceIds[0]); } })
            .catch(err => { if (!cancelled) setError(err.response?.data?.error || 'Seanslar alınamadı'); })
            .finally(() => { if (!cancelled) setFetching(false); });
        return () => { cancelled = true; };
    }, [step, companyId, selection.serviceIds, refreshKey]);

    useEffect(() => {
        if (step === 'confirm' && !requestIdRef.current) requestIdRef.current = newRequestId();
        if (step !== 'confirm') requestIdRef.current = null;
    }, [step]);

    const toggleService = (service: Service) => {
        const serviceMode = service.booking_mode || 'staff';
        const isSelected = selection.serviceIds.includes(service.id!);
        let serviceIds: number[];
        if (isSelected) serviceIds = selection.serviceIds.filter(x => x !== service.id);
        else if (serviceMode !== 'staff' || mode !== 'staff') serviceIds = [service.id!];
        else serviceIds = [...selection.serviceIds, service.id!];
        const first = services.find(s => s.id === serviceIds[0]);
        const duration = first?.booking_mode === 'resource'
            ? (first.duration_options?.includes(first.duration_minutes) || !first.duration_options?.length ? first.duration_minutes : first.duration_options[0])
            : null;
        update({ serviceIds, duration, time: null, sessionId: null, partySize: 1 });
        if (serviceMode !== 'staff' && !isSelected) setTimeout(goNext, 0);
    };

    const preselectedRef = useRef(false);
    useEffect(() => {
        if (loading || preselectedRef.current) return;
        preselectedRef.current = true;
        const preselected = services.find(s => s.id === Number(searchParams.get('service')));
        if (preselected) toggleService(preselected);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, services]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        setError(null);
        try {
            const deviceId = isBusiness ? null : await getDeviceId();
            const cachedPhone = isBusiness ? null : localStorage.getItem('customer_phone');
            const phone = isBusiness ? selection.customerPhone : (user?.phone || cachedPhone || selection.customerPhone);
            const base = {
                company_id: companyId,
                customer_name: selection.customerName.trim() || undefined,
                customer_phone: phone || undefined,
                device_id: deviceId || undefined,
                client_request_id: requestIdRef.current,
            };
            const body = mode === 'class'
                ? { ...base, class_session_id: selection.sessionId, party_size: selection.partySize }
                : mode === 'resource'
                    ? { ...base, service_id: selection.serviceIds[0], appointment_date: selection.date, start_time: selection.time, duration_minutes: selection.duration }
                    : {
                        ...base,
                        staff_id: selection.staffId,
                        services: selection.serviceIds.map(service_id => ({ service_id, staff_id: selection.staffId })),
                        appointment_date: selection.date,
                        start_time: selection.time,
                    };
            const res = await api.post('/appointments', body);
            if (isBusiness) {
                navigate('/isletme', { replace: true });
                return;
            }
            const created = res.data?.data;
            if (created?.id) {
                const saved: number[] = JSON.parse(localStorage.getItem('my_appointment_ids') || '[]');
                if (!saved.includes(created.id)) localStorage.setItem('my_appointment_ids', JSON.stringify([...saved, created.id]));
            }
            if (phone && !cachedPhone) localStorage.setItem('customer_phone', phone);
            if (deviceId && phone) {
                api.post('/appointments/customers/sync', { device_id: deviceId, customer_phone: phone, push_token: localStorage.getItem('push_token') }).catch(() => { });
            }
            navigate('/my-appointments', { replace: true });
        } catch (err: any) {
            const message = err.response?.data?.error || 'Randevu oluşturulamadı, lütfen tekrar deneyin';
            setError(message);
            if (err.response?.status === 409) {
                update({ time: null, sessionId: null });
                setStepIndex(steps.indexOf(mode === 'class' ? 'session' : 'time'));
                setRefreshKey(k => k + 1);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-12 h-12 border-4 border-amber-100 border-t-amber-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (!company || services.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center flex-col gap-4 p-8 text-center bg-white">
                <span className="text-6xl">{company ? '📋' : '🏢'}</span>
                <h2 className="text-2xl font-black uppercase tracking-tight">{company ? 'Online randevu henüz açık değil' : 'Firma bulunamadı'}</h2>
                <p className="text-slate-500 font-medium max-w-xs">
                    {company ? 'Bu firma henüz hizmetlerini tanımlamamış. Telefonla ulaşabilirsiniz.' : 'Ulaşmaya çalıştığınız firma kayıtlı değil veya kaldırılmış.'}
                </p>
                <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
                    {company?.phone && (
                        <a href={`tel:${formatDialNumber(company.phone)}`} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest">Firmayı Ara</a>
                    )}
                    <button onClick={() => navigate(-1)} className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-black uppercase tracking-widest">Geri Dön</button>
                </div>
            </div>
        );
    }

    const serviceLabel = company.service_label || 'Hizmet';
    const staffLabel = company.staff_label || 'Personel';
    const dayOptions = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return localDate(d); });
    const today = localDate(new Date());
    const nowTime = new Date().toTimeString().slice(0, 5);
    const sessionsByDay = sessions.reduce<Record<string, ClassSession[]>>((acc, s) => {
        if (s.status !== 'scheduled' || (s.session_date === today && s.start_time <= nowTime)) return acc;
        acc[s.session_date] = [...(acc[s.session_date] || []), s];
        return acc;
    }, {});
    const maxParty = Math.max(1, Math.min(selectedSession?.remaining ?? 1, 10));

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-white/90 backdrop-blur-md px-6 pb-4 shadow-sm sticky top-0 z-40 border-b border-slate-100" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}>
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <button onClick={goBack} aria-label="Geri" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black">←</button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-black text-slate-900 truncate uppercase">{company.name}</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Rezervasyon</p>
                    </div>
                </div>
                <div className="max-w-md mx-auto flex gap-1.5 mt-4">
                    {steps.map((s, i) => (
                        <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${i <= stepIndex ? 'bg-amber-600' : 'bg-slate-100'}`} />
                    ))}
                </div>
            </header>

            <main className="flex-1 max-w-md mx-auto w-full p-5 pb-36">
                {error && (
                    <div role="alert" className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-bold">{error}</div>
                )}

                {step === 'service' && (
                    <section>
                        <h2 className="text-2xl font-black text-slate-900 mb-1">{serviceLabel} seçin</h2>
                        <p className="text-xs text-slate-400 font-bold mb-5">Birden fazla {serviceLabel.toLowerCase()} seçebilirsiniz; saha ve grup dersleri tek başına rezerve edilir.</p>
                        <div className="space-y-3">
                            {services.map(s => {
                                const isSelected = selection.serviceIds.includes(s.id!);
                                const sMode = s.booking_mode || 'staff';
                                return (
                                    <button key={s.id} onClick={() => toggleService(s)} className={`w-full p-4 rounded-3xl border-2 flex items-center gap-4 text-left transition-all ${isSelected ? 'bg-amber-50 border-amber-500 shadow-md' : 'bg-white border-transparent shadow-sm'}`}>
                                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center text-2xl">
                                            {s.photo ? <img src={s.photo} alt={s.name} className="w-full h-full object-cover" /> : MODE_ICON[sMode]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-sm uppercase truncate">{s.name}</h3>
                                            <p className="text-[11px] font-bold text-slate-400">
                                                {sMode === 'class' ? 'Grup dersi · ' : ''}
                                                {sMode === 'resource' && s.duration_options?.length ? s.duration_options.join(' / ') : s.duration_minutes} dk
                                            </p>
                                        </div>
                                        <div className="font-black text-base text-amber-600 whitespace-nowrap">{formatPrice(Number(s.price))}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {step === 'staff' && (
                    <section>
                        <h2 className="text-2xl font-black text-slate-900 mb-5">{staffLabel} seçin</h2>
                        <div className="space-y-3">
                            <button onClick={() => { update({ staffId: null }); goNext(); }} className="w-full bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 text-left active:scale-[0.98]">
                                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl">⚡</div>
                                <div>
                                    <h3 className="font-black text-slate-900 uppercase">Fark etmez</h3>
                                    <p className="text-[11px] font-bold text-slate-400">İlk müsait {staffLabel.toLowerCase()} atanır</p>
                                </div>
                            </button>
                            {staffOptions.map(u => (
                                <button key={u.id} onClick={() => { update({ staffId: u.id }); goNext(); }} className={`w-full bg-white p-5 rounded-3xl border-2 shadow-sm flex items-center gap-4 text-left active:scale-[0.98] ${selection.staffId === u.id ? 'border-amber-500' : 'border-transparent'}`}>
                                    <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center font-black text-2xl text-amber-600 overflow-hidden shrink-0">
                                        {u.photo ? <img src={u.photo} alt={u.first_name} className="w-full h-full object-cover" /> : u.first_name?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-slate-900 uppercase truncate">{u.first_name} {u.last_name}</h3>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase">{u.title || u.department_name || staffLabel}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {step === 'duration' && (
                    <section>
                        <h2 className="text-2xl font-black text-slate-900 mb-5">Süre seçin</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {durationChoices.map(d => {
                                const s = selectedServices[0];
                                const price = s ? Number(s.price) * d / s.duration_minutes : 0;
                                return (
                                    <button key={d} onClick={() => { update({ duration: d, time: null }); goNext(); }} className={`p-5 rounded-3xl border-2 bg-white shadow-sm text-center ${selection.duration === d ? 'border-amber-500' : 'border-transparent'}`}>
                                        <div className="text-2xl font-black text-slate-900">{d} dk</div>
                                        <div className="text-sm font-bold text-amber-600 mt-1">{formatPrice(price)}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {step === 'date' && (
                    <section>
                        <h2 className="text-2xl font-black text-slate-900 mb-5">Tarih seçin</h2>
                        <div className="grid grid-cols-4 gap-2">
                            {dayOptions.map(date => (
                                <button key={date} onClick={() => { update({ date, time: null }); goNext(); }} className={`py-3 rounded-2xl border-2 flex flex-col items-center ${selection.date === date ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-slate-100 text-slate-500'}`}>
                                    <span className="text-[10px] font-bold uppercase">{formatDay(date, { weekday: 'short' })}</span>
                                    <span className="text-xl font-black">{new Date(`${date}T12:00:00`).getDate()}</span>
                                    <span className="text-[10px] font-bold uppercase">{formatDay(date, { month: 'short' })}</span>
                                </button>
                            ))}
                        </div>
                        <label className="block bg-white rounded-3xl p-4 shadow-sm border border-slate-100 mt-4">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">Başka bir tarih</span>
                            <input type="date" value={selection.date || ''} min={localDate(new Date())} onChange={e => { if (e.target.value) { update({ date: e.target.value, time: null }); goNext(); } }} className="w-full p-3 bg-slate-50 rounded-2xl font-bold text-center" />
                        </label>
                    </section>
                )}

                {step === 'time' && (
                    <section>
                        <h2 className="text-2xl font-black text-slate-900 mb-1">Saat seçin</h2>
                        <p className="text-xs text-slate-400 font-bold mb-5">{selection.date && formatDay(selection.date)} · {totalDuration} dk</p>
                        {fetching || (!error && (availability?.date !== selection.date || availability?.duration !== totalDuration)) ? (
                            <div className="py-16 flex justify-center"><div className="w-10 h-10 border-4 border-amber-100 border-t-amber-600 rounded-full animate-spin" /></div>
                        ) : !availability?.slots.some(s => s.available) ? (
                            <div className="bg-white p-10 rounded-3xl text-center border border-slate-100">
                                <span className="text-4xl block mb-3">😴</span>
                                <p className="font-black text-slate-900 uppercase">Bu tarihte boş saat yok</p>
                                <button onClick={goBack} className="mt-5 text-amber-700 font-black uppercase text-xs tracking-widest">Tarih değiştir</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {availability.slots.map(slot => (
                                    <button key={slot.time} disabled={!slot.available} onClick={() => { update({ time: slot.time }); goNext(); }} className={`py-4 rounded-2xl font-black text-sm ${slot.available ? 'bg-white text-slate-900 shadow-sm active:scale-95' : 'bg-slate-100 text-slate-300 line-through'}`}>
                                        {slot.time}
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {step === 'session' && (
                    <section>
                        <h2 className="text-2xl font-black text-slate-900 mb-5">Seans seçin</h2>
                        {fetching || (!error && sessionsServiceId !== selection.serviceIds[0]) ? (
                            <div className="py-16 flex justify-center"><div className="w-10 h-10 border-4 border-amber-100 border-t-amber-600 rounded-full animate-spin" /></div>
                        ) : Object.keys(sessionsByDay).length === 0 ? (
                            <div className="bg-white p-10 rounded-3xl text-center border border-slate-100">
                                <span className="text-4xl block mb-3">🗓️</span>
                                <p className="font-black text-slate-900 uppercase">Önümüzdeki 2 haftada seans yok</p>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {Object.entries(sessionsByDay).map(([date, daySessions]) => (
                                    <div key={date}>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{formatDay(date)}</h3>
                                        <div className="space-y-2">
                                            {daySessions.map(s => {
                                                const full = s.remaining <= 0;
                                                return (
                                                    <button key={s.id} disabled={full} onClick={() => { update({ sessionId: s.id, partySize: 1 }); goNext(); }} className={`w-full p-4 rounded-3xl flex items-center gap-4 text-left ${full ? 'bg-slate-100 text-slate-400' : 'bg-white shadow-sm active:scale-[0.98]'}`}>
                                                        <div className="text-lg font-black w-24">{s.start_time}<span className="block text-[10px] font-bold text-slate-400">– {s.end_time}</span></div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-black text-sm truncate">{s.staff_name || s.service_name}</p>
                                                            {s.resource_name && <p className="text-[11px] font-bold text-slate-400 truncate">{s.resource_name}</p>}
                                                        </div>
                                                        <span className={`text-[11px] font-black px-3 py-1 rounded-full ${full ? 'bg-slate-200' : s.remaining <= 2 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
                                                            {full ? 'Dolu' : `${s.remaining} yer`}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {step === 'confirm' && (
                    <section>
                        <h2 className="text-2xl font-black text-slate-900 mb-5">Onaylayın</h2>
                        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-5 space-y-2">
                            <p className="font-black text-slate-900 uppercase">{selectedServices.map(s => s.name).join(', ')}</p>
                            {mode === 'class' && selectedSession ? (
                                <p className="text-sm font-bold text-slate-500">{formatDay(selectedSession.session_date)} · {selectedSession.start_time}–{selectedSession.end_time}{selectedSession.staff_name ? ` · ${selectedSession.staff_name}` : ''}</p>
                            ) : (
                                <p className="text-sm font-bold text-slate-500">{selection.date && formatDay(selection.date)} · {selection.time} · {totalDuration} dk</p>
                            )}
                            {mode === 'staff' && staff.length > 0 && (
                                <p className="text-sm font-bold text-slate-500">{staffLabel}: {selectedStaff ? `${selectedStaff.first_name} ${selectedStaff.last_name}` : 'ilk müsait'}</p>
                            )}
                            {mode === 'class' && (
                                <div className="flex items-center justify-between pt-2">
                                    <span className="text-sm font-bold text-slate-500">Kişi sayısı</span>
                                    <div className="flex items-center gap-3">
                                        <button type="button" aria-label="Azalt" disabled={selection.partySize <= 1} onClick={() => update({ partySize: selection.partySize - 1 })} className="w-9 h-9 rounded-full bg-slate-100 font-black disabled:opacity-30">−</button>
                                        <span className="font-black w-6 text-center">{selection.partySize}</span>
                                        <button type="button" aria-label="Artır" disabled={selection.partySize >= maxParty} onClick={() => update({ partySize: selection.partySize + 1 })} className="w-9 h-9 rounded-full bg-slate-100 font-black disabled:opacity-30">+</button>
                                    </div>
                                </div>
                            )}
                            <p className="text-2xl font-black text-amber-600 pt-2">{formatPrice(totalPrice)}</p>
                        </div>
                        <form id="booking-form" onSubmit={handleSubmit} className="space-y-3">
                            <input type="text" value={selection.customerName} onChange={e => update({ customerName: e.target.value })} className="w-full p-4 bg-white rounded-2xl border-2 border-slate-100 font-bold" placeholder={isBusiness ? 'Müşteri adı soyadı' : 'Adınız Soyadınız'} autoComplete={isBusiness ? 'off' : 'name'} required />
                            {isBusiness ? (
                                <input type="tel" inputMode="numeric" value={selection.customerPhone} onChange={e => update({ customerPhone: e.target.value.replace(/\D/g, '').slice(0, 11) })} className="w-full p-4 bg-white rounded-2xl border-2 border-slate-100 font-bold" placeholder="Müşteri telefonu (isteğe bağlı)" autoComplete="off" minLength={10} />
                            ) : !isAuthenticated && !localStorage.getItem('customer_phone') && (
                                <input type="tel" inputMode="numeric" value={selection.customerPhone} onChange={e => update({ customerPhone: e.target.value.replace(/\D/g, '').slice(0, 11) })} className="w-full p-4 bg-white rounded-2xl border-2 border-slate-100 font-bold" placeholder="5XX XXX XX XX" autoComplete="tel" required minLength={10} />
                            )}
                        </form>
                    </section>
                )}
            </main>

            {(step === 'service' && selection.serviceIds.length > 0 && mode === 'staff') && (
                <footer className="fixed bottom-0 inset-x-0 p-5 bg-gradient-to-t from-white via-white to-transparent z-40" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}>
                    <button onClick={goNext} className="w-full max-w-md mx-auto block bg-slate-900 text-white py-5 rounded-3xl font-black uppercase shadow-2xl">
                        Devam · {totalDuration} dk · {formatPrice(totalPrice)}
                    </button>
                </footer>
            )}
            {step === 'confirm' && (
                <footer className="fixed bottom-0 inset-x-0 p-5 bg-gradient-to-t from-white via-white to-transparent z-40" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}>
                    <button type="submit" form="booking-form" disabled={submitting} className="w-full max-w-md mx-auto block bg-gradient-to-r from-amber-500 to-amber-600 text-white py-5 rounded-3xl font-black uppercase shadow-2xl disabled:opacity-50">
                        {submitting ? 'Gönderiliyor…' : 'Rezervasyonu Onayla'}
                    </button>
                </footer>
            )}
        </div>
    );
}
