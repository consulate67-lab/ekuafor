import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import type { Ctx } from './index';
import type { ClassSession, Resource } from '../../types';

const RESOURCE_TYPES: Record<string, string> = {
    pitch: 'Saha', court: 'Kort', lane: 'Kulvar', pool: 'Havuz', room: 'Oda',
    studio: 'Stüdyo', cabin: 'Kabin', chair: 'Koltuk', other: 'Diğer',
};

interface Attendee { id: number; customer_name: string | null; customer_phone: string | null; party_size: number; status: string }

const today = () => new Date().toLocaleDateString('en-CA');
const daysFromToday = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString('en-CA');
};
const LIST_WINDOW_DAYS = 41;
const formatDay = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
const errorText = (err: any, fallback: string) => err?.response?.data?.error || fallback;

const cardClass = 'bg-white rounded-3xl p-5 shadow-xl shadow-slate-200/20';
const inputClass = 'w-full p-3 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 font-bold text-slate-900 outline-none';
const labelClass = 'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1';

export function SchedulingTab({ ctx }: { ctx: Ctx }) {
    const company = ctx.company;
    const classServices = useMemo(() => (ctx.companyServices || []).filter((s: any) => s.booking_mode === 'class'), [ctx.companyServices]);

    const [resources, setResources] = useState<Resource[]>([]);
    const [sessions, setSessions] = useState<ClassSession[]>([]);
    const [instructors, setInstructors] = useState<{ id: number; first_name: string; last_name: string }[]>([]);
    const [newResource, setNewResource] = useState({ name: '', resource_type: 'pitch' });
    const [sessionForm, setSessionForm] = useState({
        service_id: '', staff_id: '', resource_id: '', date: today(), start_time: '10:00', capacity: 8, repeat_weeks: 0,
    });
    const [attendees, setAttendees] = useState<Record<number, Attendee[]>>({});
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

    const load = useCallback(async () => {
        if (!company?.id) return;
        const [res, ses, emp] = await Promise.all([
            api.get('/resources', { params: { company_id: company.id } }),
            api.get('/class-sessions', { params: { company_id: company.id, from: today(), to: daysFromToday(LIST_WINDOW_DAYS) } }),
            api.get(`/companies/${company.id}/employees`),
        ]);
        setResources(res.data?.data || []);
        setSessions(ses.data?.data || []);
        setInstructors(emp.data?.data || []);
    }, [company?.id]);

    useEffect(() => {
        load().catch(err => setMessage({ kind: 'error', text: errorText(err, 'Veriler yüklenemedi') }));
    }, [load]);

    const run = async (action: () => Promise<unknown>, success: string) => {
        setBusy(true);
        setMessage(null);
        try {
            await action();
            setMessage({ kind: 'ok', text: success });
            await load();
        } catch (err) {
            setMessage({ kind: 'error', text: errorText(err, 'İşlem başarısız') });
        } finally {
            setBusy(false);
        }
    };

    const addResource = () => {
        if (!newResource.name.trim()) return;
        run(async () => {
            await api.post('/resources', { name: newResource.name.trim(), resource_type: newResource.resource_type, display_order: resources.length });
            setNewResource(prev => ({ ...prev, name: '' }));
        }, 'Alan eklendi');
    };

    const toggleResource = (r: Resource) =>
        run(() => api.put(`/resources/${r.id}`, { is_active: !r.is_active }), r.is_active ? 'Alan pasife alındı' : 'Alan yeniden açıldı');

    const createSessions = () => {
        if (!sessionForm.service_id) {
            setMessage({ kind: 'error', text: 'Önce grup dersi tipinde bir hizmet seçin' });
            return;
        }
        run(() => api.post('/class-sessions', {
            service_id: Number(sessionForm.service_id),
            staff_id: sessionForm.staff_id ? Number(sessionForm.staff_id) : null,
            resource_id: sessionForm.resource_id ? Number(sessionForm.resource_id) : null,
            date: sessionForm.date,
            start_time: sessionForm.start_time,
            capacity: Number(sessionForm.capacity),
            repeat_weeks: Number(sessionForm.repeat_weeks),
        }), sessionForm.repeat_weeks > 0 ? `${Number(sessionForm.repeat_weeks) + 1} seans oluşturuldu` : 'Seans oluşturuldu');
    };

    const cancelSession = (s: ClassSession) => {
        const scope = s.series_id && window.confirm('Bu seans haftalık bir serinin parçası.\n\nTamam: bu ve sonraki tüm seanslar iptal edilsin\nİptal: yalnızca bu seans')
            ? 'following' : 'single';
        if (!window.confirm(`${s.booked > 0 ? `${s.booked} kişilik kayıt iptal edilecek ve müşterilere bildirim gidecek. ` : ''}Devam edilsin mi?`)) return;
        run(() => api.patch(`/class-sessions/${s.id}`, { status: 'cancelled', scope }), 'Seans iptal edildi');
    };

    const changeCapacity = (s: ClassSession) => {
        const value = window.prompt('Yeni kapasite', String(s.capacity));
        if (!value) return;
        run(() => api.patch(`/class-sessions/${s.id}`, { capacity: Number(value) }), 'Kapasite güncellendi');
    };

    const toggleAttendees = async (s: ClassSession) => {
        if (attendees[s.id]) {
            setAttendees(prev => {
                const next = { ...prev };
                delete next[s.id];
                return next;
            });
            return;
        }
        try {
            const res = await api.get(`/class-sessions/${s.id}/attendees`);
            setAttendees(prev => ({ ...prev, [s.id]: res.data?.data || [] }));
        } catch (err) {
            setMessage({ kind: 'error', text: errorText(err, 'Katılımcılar alınamadı') });
        }
    };

    const sessionsByDay = sessions.reduce<Record<string, ClassSession[]>>((acc, s) => {
        acc[s.session_date] = [...(acc[s.session_date] || []), s];
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            {message && (
                <div role="status" className={`p-4 rounded-2xl text-sm font-bold ${message.kind === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{message.text}</div>
            )}

            <section className={cardClass}>
                <h2 className="text-lg font-black text-slate-900">Alanlar</h2>
                <p className="text-xs text-slate-400 font-bold mb-4">Saha, kulvar, oda gibi kiralanan veya derslerin yapıldığı yerler. Aynı alan aynı saatte iki kez satılmaz.</p>
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <input value={newResource.name} onChange={e => setNewResource(p => ({ ...p, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addResource()} placeholder="Örn: Saha 1, Kulvar 3, Reformer Salonu" className={`${inputClass} flex-1`} />
                    <select value={newResource.resource_type} onChange={e => setNewResource(p => ({ ...p, resource_type: e.target.value }))} className={`${inputClass} sm:w-40`}>
                        {Object.entries(RESOURCE_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                    <button onClick={addResource} disabled={busy || !newResource.name.trim()} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black disabled:opacity-40">Ekle</button>
                </div>
                {resources.length === 0 ? (
                    <p className="text-sm text-slate-400 font-bold text-center py-4">Henüz alan eklenmedi</p>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {resources.map(r => (
                            <li key={r.id} className="flex items-center justify-between py-3">
                                <div className={r.is_active ? '' : 'opacity-40'}>
                                    <p className="font-black text-slate-900">{r.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{RESOURCE_TYPES[r.resource_type] || r.resource_type}{r.is_active ? '' : ' · pasif'}</p>
                                </div>
                                <button onClick={() => toggleResource(r)} disabled={busy} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-black">
                                    {r.is_active ? 'Pasife al' : 'Aktif et'}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className={cardClass}>
                <h2 className="text-lg font-black text-slate-900">Grup Dersi Seansları</h2>
                <p className="text-xs text-slate-400 font-bold mb-4">Müşteriler kalan kapasite kadar kayıt olabilir. Haftalık tekrar ile aynı dersi ileri haftalara da açabilirsiniz.</p>
                {classServices.length === 0 ? (
                    <p className="text-sm text-amber-600 font-bold">Seans açmak için önce Hizmetler sekmesinde rezervasyon tipi "Grup dersi" olan bir hizmet ekleyin.</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="col-span-2 sm:col-span-3">
                            <label className={labelClass}>Ders</label>
                            <select value={sessionForm.service_id} onChange={e => setSessionForm(p => ({ ...p, service_id: e.target.value }))} className={inputClass}>
                                <option value="">Seçin</option>
                                {classServices.map((s: any) => <option key={s.id} value={s.id}>{s.name} · {s.duration_minutes} dk</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Eğitmen</label>
                            <select value={sessionForm.staff_id} onChange={e => setSessionForm(p => ({ ...p, staff_id: e.target.value }))} className={inputClass}>
                                <option value="">—</option>
                                {instructors.map(i => <option key={i.id} value={i.id}>{i.first_name} {i.last_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Salon</label>
                            <select value={sessionForm.resource_id} onChange={e => setSessionForm(p => ({ ...p, resource_id: e.target.value }))} className={inputClass}>
                                <option value="">—</option>
                                {resources.filter(r => r.is_active).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Kapasite</label>
                            <input type="number" min={1} max={500} value={sessionForm.capacity} onChange={e => setSessionForm(p => ({ ...p, capacity: Number(e.target.value) }))} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Tarih</label>
                            <input type="date" min={today()} value={sessionForm.date} onChange={e => setSessionForm(p => ({ ...p, date: e.target.value }))} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Saat</label>
                            <input type="time" step={300} value={sessionForm.start_time} onChange={e => setSessionForm(p => ({ ...p, start_time: e.target.value }))} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Haftalık tekrar</label>
                            <select value={sessionForm.repeat_weeks} onChange={e => setSessionForm(p => ({ ...p, repeat_weeks: Number(e.target.value) }))} className={inputClass}>
                                <option value={0}>Tekrarlama</option>
                                {[3, 7, 11, 25].map(n => <option key={n} value={n}>{n + 1} hafta</option>)}
                            </select>
                        </div>
                        <button onClick={createSessions} disabled={busy} className="col-span-2 sm:col-span-3 py-4 bg-indigo-600 text-white rounded-2xl font-black disabled:opacity-40">Seans Aç</button>
                    </div>
                )}
            </section>

            {Object.keys(sessionsByDay).length > 0 && (
                <section className="space-y-4">
                    {Object.entries(sessionsByDay).map(([date, daySessions]) => (
                        <div key={date} className={cardClass}>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{formatDay(date)}</h3>
                            <ul className="space-y-3">
                                {daySessions.map(s => {
                                    const cancelled = s.status === 'cancelled';
                                    return (
                                        <li key={s.id} className={`rounded-2xl border border-slate-100 p-4 ${cancelled ? 'opacity-50' : ''}`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-black text-slate-900">{s.start_time}–{s.end_time} · {s.service_name}</p>
                                                    <p className="text-xs font-bold text-slate-400 truncate">
                                                        {[s.staff_name, s.resource_name, s.series_id ? 'haftalık' : null].filter(Boolean).join(' · ') || '—'}
                                                    </p>
                                                </div>
                                                <span className={`shrink-0 text-xs font-black px-3 py-1 rounded-full ${cancelled ? 'bg-slate-100 text-slate-500' : s.remaining === 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
                                                    {cancelled ? 'İptal' : `${s.booked}/${s.capacity}`}
                                                </span>
                                            </div>
                                            {!cancelled && (
                                                <div className="flex gap-2 mt-3">
                                                    <button onClick={() => toggleAttendees(s)} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-black">Katılımcılar</button>
                                                    <button onClick={() => changeCapacity(s)} disabled={busy} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-black">Kapasite</button>
                                                    <button onClick={() => cancelSession(s)} disabled={busy} className="px-3 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-black ml-auto">İptal et</button>
                                                </div>
                                            )}
                                            {attendees[s.id] && (
                                                <ul className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                                                    {attendees[s.id].length === 0 && <li className="text-xs text-slate-400 font-bold">Henüz kayıt yok</li>}
                                                    {attendees[s.id].map(a => (
                                                        <li key={a.id} className="flex justify-between text-sm font-bold text-slate-700">
                                                            <span>{a.customer_name || 'İsimsiz'}{a.party_size > 1 ? ` (+${a.party_size - 1})` : ''}</span>
                                                            {a.customer_phone && <a href={`tel:${a.customer_phone}`} className="text-indigo-600">{a.customer_phone}</a>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </section>
            )}
        </div>
    );
}
