import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Appointment, Service, Company } from '../types';

export default function AppointmentManagement() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formError, setFormError] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAppointment, setNewAppointment] = useState({
        service_id: 0,
        appointment_date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '10:00',
        notes: ''
    });
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

    const [company, setCompany] = useState<Company | null>(null);

    const fetchData = async () => {
        try {
            // 1. Get User & Company
            let companyId = null;
            try {
                const meRes = await api.get('/auth/me');
                if (meRes.data?.data?.company_id) {
                    companyId = meRes.data.data.company_id;
                    const companyRes = await api.get(`/companies/${companyId}`);
                    setCompany(companyRes.data?.data || null);
                }
            } catch (err) {
                console.warn('Company/Auth fetch failed', err);
            }

            // 2. Get Appointments & Services separately
            try {
                const appResponse = await api.get('/appointments');
                setAppointments(appResponse.data?.data || []);
            } catch (err) {
                console.warn('Appointments fetch failed', err);
                setAppointments([]);
            }

            try {
                const svcResponse = await api.get('/services');
                setServices(svcResponse.data?.data || []);
            } catch (err) {
                console.warn('Services fetch failed', err);
                setServices([]);
            }

        } catch (err) {
            console.error('General fetch error', err);
            setError('Veriler yüklenirken hata oluştu. Lütfen sayfayı yenileyin.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleStatusUpdate = async (id: number, status: string) => {
        try {
            await api.patch(`/appointments/${id}/status`, { status });
            fetchData();
        } catch (err) {
            setError('Durum güncellenirken hata oluştu');
        }
    };

    const handleAddAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(''); // Clear previous errors
        try {
            await api.post('/appointments', { ...newAppointment, status: 'approved' });
            setShowAddForm(false);
            fetchData();
        } catch (err: any) {
            console.error('Appointment Error:', err);
            setFormError(err.response?.data?.error || 'Randevu kaydedilirken hata oluştu');
        }
    };

    const pendingAppointments = appointments.filter(a => a.status === 'pending');

    // Simple Calendar Logic
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const days = Array.from({ length: getDaysInMonth(currentYear, currentMonth) }, (_, i) => i + 1);

    if (loading && appointments.length === 0) return <div className="p-8 text-center font-bold text-gray-400 animate-pulse">Veriler Hazırlanıyor...</div>;

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <Link to="/dashboard" className="text-pink-600 hover:text-pink-800 text-xs font-bold uppercase tracking-widest mb-1 inline-block">
                        ← Dashboard
                    </Link>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Randevu Yönetimi</h2>
                    <p className="text-gray-500 font-medium">Bekleyen onaylar ve günlük randevu planınızı takip edin.</p>
                </div>

                {company && (
                    <div className="hidden xl:flex gap-6 mx-auto">
                        {(() => {
                            const todayStr = new Date().toISOString().split('T')[0];
                            const now = new Date();
                            const currentMinutes = now.getHours() * 60 + now.getMinutes();

                            const [startH, startM] = (company.work_start_time || '09:00').split(':').map(Number);
                            const [endH, endM] = (company.work_end_time || '20:00').split(':').map(Number);

                            const startTotalMinutes = startH * 60 + startM;
                            const endTotalMinutes = endH * 60 + endM;

                            // Calculate today's approved appointments duration
                            const todayApps = appointments.filter(a => a.status === 'approved' && a.appointment_date === todayStr);
                            const totalBusyMinutes = todayApps.reduce((acc, app) => {
                                const [sH, sM] = app.start_time.split(':').map(Number);
                                const [eH, eM] = (app.end_time || app.start_time).split(':').map(Number);
                                // Simple fix if end_time missing, assume 30m? Actually mock server guarantees end_time now.
                                let duration = (eH * 60 + eM) - (sH * 60 + sM);
                                if (duration < 0) duration += 24 * 60; // Over midnight edge case (unlikely for day view)
                                return acc + duration;
                            }, 0);

                            // Remaining Time Logic
                            // If now is before start, we count from start. If after end, 0.
                            const effectiveStart = Math.max(currentMinutes, startTotalMinutes);
                            const remainingMinutes = Math.max(0, endTotalMinutes - effectiveStart);

                            // Estimate capacity (avg 45 mins per client)
                            const possibleClients = Math.floor(remainingMinutes / 45);

                            return (
                                <>
                                    <div className="bg-white/50 backdrop-blur-sm px-5 py-3 rounded-2xl border border-pink-100 shadow-sm flex flex-col items-center min-w-[100px]">
                                        <p className="text-[10px] font-bold text-pink-500 uppercase tracking-widest mb-1">DOLU</p>
                                        <p className="text-2xl font-black text-gray-800">{(totalBusyMinutes / 60).toFixed(1)}<span className="text-sm text-gray-400 font-medium ml-1">sa</span></p>
                                    </div>
                                    <div className="bg-white/50 backdrop-blur-sm px-5 py-3 rounded-2xl border border-blue-100 shadow-sm flex flex-col items-center min-w-[100px]">
                                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">KALAN</p>
                                        <p className="text-2xl font-black text-gray-800">{(remainingMinutes / 60).toFixed(1)}<span className="text-sm text-gray-400 font-medium ml-1">sa</span></p>
                                    </div>
                                    <div className="bg-white/50 backdrop-blur-sm px-5 py-3 rounded-2xl border border-emerald-100 shadow-sm flex flex-col items-center min-w-[100px]">
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">KAPASİTE</p>
                                        <p className="text-2xl font-black text-gray-800">~{possibleClients}<span className="text-sm text-gray-400 font-medium ml-1">Kişi</span></p>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}
                <button
                    onClick={() => { setShowAddForm(true); setFormError(''); setError(''); }}
                    className="btn-primary py-3 px-6 shadow-xl shadow-pink-500/20 font-bold"
                >
                    Manuel Randevu Ekle
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-xl animate-in fade-in slide-in-from-top-4">
                    <p className="text-red-700 font-bold text-sm">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Left Column: Pending List */}
                <div className="lg:col-span-1">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                            {pendingAppointments.length}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Onay Bekleyenler</h3>
                    </div>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {pendingAppointments.map(app => (
                            <div key={app.id} className="card p-5 border-l-4 border-amber-400 hover:shadow-lg transition-all duration-300">
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-bold text-gray-900">{app.customer_name || 'Misafir Müşteri'}</h4>
                                    <span className="text-[10px] font-black bg-amber-50 text-amber-600 px-2 py-1 rounded uppercase">{app.start_time}</span>
                                </div>
                                <p className="text-sm font-bold text-pink-600 mb-4">{app.service_name}</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleStatusUpdate(app.id!, 'approved')}
                                        className="flex-1 btn-primary py-2 text-xs font-bold"
                                    >
                                        Onayla
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate(app.id!, 'cancelled')}
                                        className="flex-1 btn-secondary py-2 text-xs font-bold border-gray-100 text-red-500"
                                    >
                                        Reddet
                                    </button>
                                </div>
                            </div>
                        ))}
                        {pendingAppointments.length === 0 && (
                            <div className="py-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                                <p className="text-gray-400 font-bold">Bekleyen randevu yok.</p>
                            </div>
                        )}
                    </div>

                    {/* Left Column: Mini Calendar */}
                    <div className="card p-4 mt-6 border-pink-100 shadow-sm">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">{today.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}</h3>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'].map(d => (
                                <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
                            ))}
                            {days.map(day => {
                                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const isSelected = selectedDate === dateStr;
                                const hasApproved = appointments.some(a => a.status === 'approved' && a.appointment_date === dateStr);
                                const isToday = new Date().toISOString().split('T')[0] === dateStr;

                                return (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedDate(dateStr)}
                                        className={`
                                            h-9 w-full rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all relative
                                            ${isSelected ? 'bg-pink-600 text-white shadow-md transform scale-105' : 'hover:bg-pink-50 text-gray-700 bg-gray-50/50'}
                                            ${isToday && !isSelected ? 'border-2 border-pink-200' : ''}
                                        `}
                                    >
                                        <span>{day}</span>
                                        {hasApproved && !isSelected && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-pink-500"></div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: Calendar & Daily View */}
                <div className="lg:col-span-2">


                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-8 bg-pink-600 rounded-full"></div>
                        <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">
                            Günlük Plan ({new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })})
                        </h3>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <div className="min-w-[800px]">
                                {/* Timeline Header */}
                                <div className="flex border-b border-gray-200 bg-gray-50/50">
                                    <div className="w-32 flex-shrink-0 p-3 border-r border-gray-200">
                                        <span className="text-xs font-black text-gray-400 uppercase">Zaman</span>
                                    </div>
                                    <div className="flex-1 flex relative h-10">
                                        {Array.from({ length: 13 }, (_, i) => i + 8).map(hour => (
                                            <div key={hour} className="flex-1 border-r border-gray-100 flex items-center justify-start pl-1">
                                                <span className="text-[10px] font-bold text-gray-400">{String(hour).padStart(2, '0')}:00</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Day Row (Single) */}
                                {(() => {
                                    const d = new Date(selectedDate);
                                    // No day shifting logic needed anymore, we use selectedDate directly
                                    const dateStr = selectedDate;
                                    const isToday = new Date().toISOString().split('T')[0] === dateStr;

                                    // Filter appointments for this day
                                    const dayAppointments = appointments.filter(a =>
                                        a.status === 'approved' &&
                                        a.appointment_date === dateStr
                                    );

                                    return (
                                        <div className="flex border-b border-gray-100 transition-colors bg-white">
                                            {/* Day Label Column */}
                                            <div className={`w-32 flex-shrink-0 p-3 border-r border-gray-200 flex flex-col justify-center ${isToday ? 'bg-pink-100/50' : ''}`}>
                                                <span className={`text-xs font-bold uppercase ${isToday ? 'text-pink-600' : 'text-gray-500'}`}>
                                                    {d.toLocaleDateString('tr-TR', { weekday: 'long' })}
                                                </span>
                                                <span className={`text-sm font-black ${isToday ? 'text-pink-700' : 'text-gray-900'}`}>
                                                    {d.getDate()} {d.toLocaleDateString('tr-TR', { month: 'short' })}
                                                </span>
                                            </div>

                                            {/* Timeline Area */}
                                            <div className="flex-1 relative h-32 bg-repeating-linear-gradient-to-r from-transparent to-transparent via-gray-50/50" style={{ backgroundImage: 'linear-gradient(to right, transparent 0%, transparent 95%, #f3f4f6 100%)', backgroundSize: `${100 / 12}% 100%` }}>
                                                {/* Vertical Grid Lines */}
                                                <div className="absolute inset-0 flex pointer-events-none">
                                                    {Array.from({ length: 12 }).map((_, idx) => (
                                                        <div key={idx} className="flex-1 border-r border-gray-100/50 h-full"></div>
                                                    ))}
                                                </div>

                                                {dayAppointments.length === 0 && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="text-gray-300 font-bold text-sm bg-gray-50 px-3 py-1 rounded-full">Bugün için randevu yok</span>
                                                    </div>
                                                )}

                                                {dayAppointments.map(app => {
                                                    const [startH, startM] = app.start_time.split(':').map(Number);
                                                    const [endH, endM] = app.end_time.split(':').map(Number); // Assuming end_time exists

                                                    // Calculate position relative to 08:00 - 20:00 (12 hours = 720 minutes)
                                                    const startTotalM = (startH * 60) + startM;
                                                    const endTotalM = (endH * 60) + endM;
                                                    const dayStartM = 8 * 60; // 08:00

                                                    // Convert to percentage
                                                    // Clamping to 0-100% to avoid overflow if time is out of 08:00-20:00 range
                                                    let leftPercent = ((startTotalM - dayStartM) / 720) * 100;

                                                    // Calculate width
                                                    let durationM = endTotalM - startTotalM;
                                                    let widthPercent = (durationM / 720) * 100;

                                                    // Adjust if out of bounds (visual fix)
                                                    if (leftPercent < 0) {
                                                        widthPercent += leftPercent; // Reduce width
                                                        leftPercent = 0;
                                                    }
                                                    if (leftPercent + widthPercent > 100) {
                                                        widthPercent = 100 - leftPercent;
                                                    }

                                                    if (widthPercent <= 0) return null; // Don't render if invalid

                                                    return (
                                                        <div
                                                            key={app.id}
                                                            className="absolute top-2 bottom-2 bg-pink-500 border-2 border-white shadow-md rounded-md z-10 hover:z-20 group transition-all cursor-pointer hover:bg-pink-600 flex overflow-hidden"
                                                            style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, minWidth: '4px' }}
                                                            title={`${app.start_time} - ${app.end_time}: ${app.customer_name} (${app.service_name})`}
                                                            onClick={() => setSelectedAppointment(app)}
                                                        >
                                                            <div className="px-2 py-1 text-white text-[10px] leading-tight flex flex-col overflow-hidden w-full">
                                                                <span className="font-bold truncate">{app.customer_name || 'Misafir'}</span>
                                                                <span className="truncate opacity-90 text-[9px]">{app.service_name}</span>
                                                                <span className="text-[8px] opacity-75 mt-auto">{app.start_time} - {app.end_time}</span>
                                                            </div>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleStatusUpdate(app.id!, 'cancelled'); }}
                                                                className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-white text-red-500 rounded-full p-0.5 shadow-sm transform scale-75 hover:scale-100 transition-all border border-gray-200"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Manual Appointment Modal */}
            {showAddForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="card w-full max-w-lg shadow-2xl scale-in-center animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Manuel Randevu</h3>
                            <button onClick={() => { setShowAddForm(false); setFormError(''); setError(''); }} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {formError && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg animate-pulse">
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    <p className="text-red-700 font-bold text-sm">{formError}</p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleAddAppointment} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase ml-1 tracking-wider">Hizmet Seçimi</label>
                                <select
                                    required
                                    className="input-field py-3 bg-gray-50 appearance-none font-bold text-gray-900"
                                    value={newAppointment.service_id}
                                    onChange={(e) => {
                                        const serviceId = parseInt(e.target.value);
                                        const service = services.find(s => s.id === serviceId);
                                        let newEndTime = newAppointment.end_time;

                                        if (service && newAppointment.start_time) {
                                            const [h, m] = newAppointment.start_time.split(':').map(Number);
                                            const totalMin = h * 60 + m + (service.duration_minutes || 30);
                                            const endH = Math.floor(totalMin / 60);
                                            const endM = totalMin % 60;
                                            newEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                                        }
                                        setNewAppointment({ ...newAppointment, service_id: serviceId, end_time: newEndTime });
                                    }}
                                >
                                    <option value="">Seçiniz...</option>
                                    {services.map(s => <option key={s.id} value={s.id}>{s.name} - ₺{s.price}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase ml-1 tracking-wider">Tarih</label>
                                    <input
                                        type="date"
                                        required
                                        className="input-field py-3 font-bold text-gray-900"
                                        value={newAppointment.appointment_date}
                                        onChange={(e) => setNewAppointment({ ...newAppointment, appointment_date: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase ml-1 tracking-wider">Saat</label>
                                        <input
                                            type="time"
                                            required
                                            className="input-field py-3 font-bold text-gray-900"
                                            value={newAppointment.start_time}
                                            onChange={(e) => {
                                                const start = e.target.value;
                                                let end = newAppointment.end_time;

                                                // Auto-calc end time if service selected
                                                if (newAppointment.service_id) {
                                                    const service = services.find(s => s.id === newAppointment.service_id);
                                                    if (service) {
                                                        const [h, m] = start.split(':').map(Number);
                                                        const totalMin = h * 60 + m + (service.duration_minutes || 30);
                                                        const endH = Math.floor(totalMin / 60);
                                                        const endM = totalMin % 60;
                                                        end = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                                                    }
                                                }
                                                setNewAppointment({ ...newAppointment, start_time: start, end_time: end });
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase ml-1 tracking-wider">Bitiş Saati</label>
                                        <input
                                            type="time"
                                            required
                                            className="input-field py-3 font-bold text-gray-900"
                                            value={newAppointment.end_time}
                                            onChange={(e) => setNewAppointment({ ...newAppointment, end_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase ml-1 tracking-wider">Not (Opsiyonel)</label>
                                <textarea
                                    className="input-field py-3 min-h-[80px]"
                                    placeholder="Müşteri talebi, özel notlar..."
                                    value={newAppointment.notes}
                                    onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="w-full btn-primary py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-pink-500/30">
                                Randevu Oluştur
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Appointment Details Modal */}
            {selectedAppointment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="card w-full max-w-md shadow-2xl scale-in-center animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 to-violet-500"></div>

                        <div className="flex justify-between items-start mb-6 mt-2">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Randevu Detayı</h3>
                                <span className={`
                                    inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mt-1
                                    ${selectedAppointment.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                                        selectedAppointment.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'}
                                `}>
                                    {selectedAppointment.status === 'approved' ? 'Onaylandı' :
                                        selectedAppointment.status === 'pending' ? 'Bekliyor' : selectedAppointment.status}
                                </span>
                            </div>
                            <button onClick={() => setSelectedAppointment(null)} className="text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full p-2 hover:bg-gray-100 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tarih</p>
                                    <p className="font-bold text-gray-900">{new Date(selectedAppointment.appointment_date).toLocaleDateString('tr-TR')}</p>
                                </div>
                                <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Saat</p>
                                    <p className="font-bold text-gray-900">{selectedAppointment.start_time} - {selectedAppointment.end_time}</p>
                                </div>
                            </div>

                            <div className="bg-white border-2 border-pink-50 rounded-xl p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-lg">
                                    {(selectedAppointment.customer_name?.[0] || 'M').toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-pink-400 uppercase tracking-wider mb-0.5">Müşteri</p>
                                    <h4 className="font-bold text-gray-900 text-lg leading-none">{selectedAppointment.customer_name || 'Misafir Müşteri'}</h4>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Hizmet</p>
                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <span className="font-bold text-gray-900">{selectedAppointment.service_name}</span>
                                        <span className="font-black text-pink-600">
                                            {selectedAppointment.price ? `₺${selectedAppointment.price}` :
                                                `₺${services.find(s => s.id === selectedAppointment.service_id)?.price || 0}`}
                                        </span>
                                    </div>
                                </div>
                                {selectedAppointment.notes && (
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Notlar</p>
                                        <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 text-sm font-medium text-yellow-800">
                                            {selectedAppointment.notes}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => {
                                        handleStatusUpdate(selectedAppointment.id!, 'cancelled');
                                        setSelectedAppointment(null);
                                    }}
                                    className="flex-1 btn-secondary border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 py-3 text-sm font-bold"
                                >
                                    Randevuyu İptal Et
                                </button>
                                <button
                                    onClick={() => setSelectedAppointment(null)}
                                    className="flex-1 btn-primary py-3 text-sm font-bold"
                                >
                                    Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Reset */}
            <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col items-center gap-4 pb-8">
                <button
                    onClick={() => {
                        if (window.confirm('Sistem verileri sıfırlanacak. Çıkış yapılacak. Devam edilsin mi?')) {
                            localStorage.clear();
                            window.location.href = '/';
                        }
                    }}
                    className="text-[10px] font-bold text-gray-300 uppercase tracking-widest hover:text-pink-500 transition-colors"
                >
                    Sistemi Sıfırla
                </button>
                <div className="flex items-center gap-2 grayscale opacity-30">
                    <span className="text-[9px] text-gray-400 font-bold tracking-tighter uppercase whitespace-nowrap">Appointments v1.5</span>
                </div>
            </div>
        </div>
    );
}
