import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Company, Appointment } from '../types';

export default function SalonBoard() {
    const [boardKey, setBoardKey] = useState<string | null>(localStorage.getItem('salon_board_key'));
    const [inputKey, setInputKey] = useState('');
    const [company, setCompany] = useState<Company | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentHour, setCurrentHour] = useState(new Date().getHours());
    const [selectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [selectedCell, setSelectedCell] = useState<{ person: any, hour: string } | null>(null);
    const [fastForm, setFastForm] = useState({
        customerName: '',
        serviceId: '',
        notes: '',
        staffId: '',
        appointmentDate: '',
        startTime: ''
    });

    // Helper to generate consistent color for staff
    const getStaffColor = (name: string) => {
        const colors = [
            '#4f46e5', '#db2777', '#059669', '#d97706', '#7c3aed',
            '#2563eb', '#dc2626', '#0891b2', '#16a34a', '#be185d'
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const hours = Array.from({ length: 14 }, (_, i) => `${i + 8}:00`); // 08:00 to 21:00

    const fetchData = useCallback(async (compId: number, date?: string) => {
        try {
            const dateToFetch = date || selectedDate;

            const [appsRes, staffRes, servRes] = await Promise.all([
                api.get('/appointments', { params: { company_id: compId, start_date: dateToFetch, end_date: dateToFetch } }),
                api.get(`/companies/${compId}/employees`),
                api.get('/services', { params: { company_id: compId } })
            ]);

            setAppointments(appsRes.data.data || []);
            setStaff(staffRes.data.data || []);
            setServices(servRes.data.data || []);
        } catch (err) {
            console.error('Veri senkronizasyonu başarısız', err);
        }
    }, [selectedDate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/companies/board-login', { board_key: inputKey });
            if (res.data.success) {
                const companyData = res.data.data;
                localStorage.setItem('salon_board_key', inputKey);
                localStorage.setItem('salon_board_company_id', companyData.id.toString());
                setBoardKey(inputKey);
                setCompany(companyData);
                fetchData(companyData.id);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Giriş başarısız. Lütfen anahtarı kontrol edin.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const storedId = localStorage.getItem('salon_board_company_id');
        if (boardKey && storedId) {
            const compId = parseInt(storedId);
            api.get(`/companies/${compId}`).then(res => setCompany(res.data.data));
            fetchData(compId);

            const interval = setInterval(() => {
                fetchData(compId);
                setCurrentHour(new Date().getHours());
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [boardKey, fetchData]);

    // Auto-scroll to current hour
    useEffect(() => {
        if (staff.length > 0) {
            const container = document.getElementById('matrix-container');
            const currentHourCol = document.getElementById(`hour-col-${currentHour}`);
            if (container && currentHourCol) {
                const scrollPos = currentHourCol.offsetLeft - 300; // Offset for sticky column
                container.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
            }
        }
    }, [staff, currentHour]);

    const handleFastSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company) return;

        try {
            setLoading(true);
            const date = fastForm.appointmentDate || selectedDate;
            const startTime = fastForm.startTime || selectedCell?.hour || '08:00';
            const staffId = fastForm.staffId || selectedCell?.person.user_id || selectedCell?.person.id;

            if (!staffId) {
                alert('Lütfen bir personel seçin');
                return;
            }

            const endTimeHour = parseInt(startTime.split(':')[0]) + 1;
            const endTime = `${endTimeHour}:00`;

            await api.post('/appointments', {
                company_id: company.id,
                staff_id: parseInt(staffId.toString()),
                service_id: fastForm.serviceId ? parseInt(fastForm.serviceId) : (services[0]?.id || 1),
                appointment_date: date,
                start_time: startTime,
                end_time: endTime,
                customer_name: fastForm.customerName || 'Misafir Müşteri',
                notes: fastForm.notes,
                status: 'approved'
            });

            setIsModalOpen(false);
            setFastForm({ customerName: '', serviceId: '', notes: '', staffId: '', appointmentDate: '', startTime: '' });
            setSelectedCell(null);
            if (company.id) fetchData(company.id);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelAppointment = async (id: number) => {
        if (!confirm('Bu randevuyu iptal etmek istediğinize emin misiniz?')) return;

        try {
            setLoading(true);
            await api.patch(`/appointments/${id}/status`, { status: 'cancelled' });
            setIsDetailModalOpen(false);
            if (company?.id) fetchData(company.id);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Randevu iptal edilemedi');
        } finally {
            setLoading(false);
        }
    };

    if (!boardKey) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 bg-mesh-gradient">
                <div className="max-w-md w-full bg-white/10 backdrop-blur-2xl rounded-[3rem] p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border border-white/10 text-center animate-fade-in">
                    <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-orange-500 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-4xl shadow-2xl shadow-orange-500/20 rotate-3">
                        📟
                    </div>
                    <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Salon Paneli</h1>
                    <p className="text-slate-400 mb-10 font-medium">Cihazınızı yetkilendirmek için anahtarı girin.</p>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <input
                            type="text"
                            value={inputKey}
                            onChange={e => setInputKey(e.target.value.toUpperCase())}
                            placeholder="•••• •••• ••••"
                            className="w-full p-6 bg-white/5 rounded-2xl border-2 border-white/10 font-mono text-center text-2xl tracking-[0.4em] text-amber-400 focus:border-amber-500 focus:bg-white/10 transition-all outline-none"
                            required
                        />
                        {error && <p className="text-red-400 text-sm font-bold bg-red-400/10 py-3 rounded-xl">{error}</p>}
                        <button
                            disabled={loading}
                            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 py-6 rounded-2xl font-black uppercase tracking-widest shadow-[0_20px_40px_-10px_rgba(245,158,11,0.3)] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Bağlanıyor...' : 'Sistemi Başlat'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const pendingCount = appointments.filter(a => a.status === 'pending').length;

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans overflow-hidden selection:bg-indigo-100">
            {/* Ultra Modern Header */}
            <header className="bg-white/70 backdrop-blur-xl px-10 py-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] border-b border-slate-100 flex justify-between items-center z-50">
                <div className="flex items-center gap-8">
                    <div className="relative">
                        <div className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl flex items-center gap-3 shadow-xl shadow-slate-900/10">
                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]"></span>
                            <span className="text-[11px] font-black uppercase tracking-widest leading-none mt-0.5">Canlı Matris</span>
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 leading-none mb-1.5 uppercase tracking-tighter decoration-indigo-500 underline-offset-4 decoration-4">
                            {company?.name || 'Yükleniyor...'}
                        </h1>
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-black text-indigo-500 uppercase tracking-widest animate-pulse">
                                {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <button
                        onClick={() => {
                            setFastForm({
                                customerName: '',
                                serviceId: '',
                                notes: '',
                                staffId: staff[0]?.user_id || staff[0]?.id || '',
                                appointmentDate: selectedDate,
                                startTime: '09:00'
                            });
                            setIsModalOpen(true);
                        }}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-3"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                        Yeni Randevu
                    </button>
                    {pendingCount > 0 && (
                        <div className="bg-amber-50 border border-amber-100 text-amber-900 px-6 py-3 rounded-[1.5rem] flex items-center gap-4 animate-bounce shadow-lg shadow-amber-200/20">
                            <div className="flex -space-x-2">
                                <span className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-black text-sm ring-4 ring-white shadow-lg">{pendingCount}</span>
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest">Bekleyen İstek</span>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            if (confirm('Sistemden çıkış yapılsın mı?')) {
                                localStorage.removeItem('salon_board_key');
                                window.location.reload();
                            }
                        }}
                        className="group w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all flex items-center justify-center shadow-sm"
                    >
                        <svg className="w-7 h-7 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* Matrix Container */}
            <div id="matrix-container" className="flex-1 overflow-auto p-6 lg:p-10 scroll-smooth bg-slate-50/50">
                <div className="bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 inline-block min-w-full">
                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-black">
                                <th className="sticky left-0 z-[60] bg-black p-8 text-left border-b border-white/10 min-w-[300px] shadow-[10px_0_30px_-15px_rgba(0,0,0,0.3)] rounded-tl-[3rem]">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mb-1">Organizasyon</span>
                                        <span className="text-xl font-black text-white tracking-tight">Uzmanlar</span>
                                    </div>
                                </th>
                                {hours.map(hour => {
                                    const hNum = parseInt(hour.split(':')[0]);
                                    const isCurrent = hNum === currentHour;
                                    const isPast = hNum < currentHour;

                                    return (
                                        <th
                                            key={hour}
                                            id={`hour-col-${hNum}`}
                                            className={`p-8 text-center border-b border-white/10 min-w-[180px] transition-all relative ${isCurrent ? 'bg-white/5' : ''}`}
                                        >
                                            <div className={`flex flex-col items-center gap-1 transition-all ${isCurrent ? 'scale-110' : ''}`}>
                                                <span className={`text-lg font-black tracking-tight ${isCurrent ? 'text-indigo-400' : isPast ? 'text-slate-600' : 'text-slate-200'}`}>
                                                    {hour}
                                                </span>
                                                {isCurrent && (
                                                    <span className="px-3 py-1 bg-indigo-500 text-[9px] text-white font-black uppercase tracking-widest rounded-full shadow-lg">
                                                        ŞİMDİ
                                                    </span>
                                                )}
                                                {!isCurrent && isPast && selectedDate === new Date().toISOString().split('T')[0] && <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Geçti</span>}
                                            </div>
                                            {isCurrent && selectedDate === new Date().toISOString().split('T')[0] && <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-indigo-500 rounded-t-full"></div>}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {staff.map(person => {
                                const pId = person.user_id || person.id;
                                const staffColor = getStaffColor(`${person.first_name} ${person.last_name}`);
                                return (
                                    <tr key={pId} className="group transition-colors">
                                        <td className="sticky left-0 z-[50] bg-white p-8 border-r border-slate-100 font-bold text-slate-900 shadow-[10px_0_30px_-15px_rgba(0,0,0,0.1)] group-hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-5">
                                                <div className="relative">
                                                    <div
                                                        className="w-14 h-14 rounded-2xl text-white flex items-center justify-center font-black text-lg uppercase shadow-lg shadow-inner"
                                                        style={{ backgroundColor: staffColor }}
                                                    >
                                                        {person.first_name?.[0] || 'U'}{person.last_name?.[0] || 'Z'}
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full"></div>
                                                </div>
                                                <div>
                                                    <p className="text-lg font-black text-slate-800 leading-none mb-1.5 tracking-tight group-hover:opacity-80 transition-opacity">{person.first_name} {person.last_name}</p>
                                                    <span className="inline-flex px-2 py-0.5 bg-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-md">Uzman</span>
                                                </div>
                                            </div>
                                        </td>
                                        {hours.map(hour => {
                                            const hNum = parseInt(hour.split(':')[0]);
                                            const isCurrent = hNum === currentHour;
                                            const isPast = hNum < currentHour;

                                            const personApps = appointments.filter(a =>
                                                Number(a.staff_id) === Number(pId) &&
                                                parseInt(a.start_time.split(':')[0]) === hNum &&
                                                a.status !== 'cancelled'
                                            );

                                            return (
                                                <td
                                                    key={hour}
                                                    className={`p-4 border-r border-slate-50 align-top cursor-cell hover:bg-slate-50/80 transition-all relative ${isCurrent ? 'bg-indigo-50/10' : ''} ${isPast ? 'bg-slate-50/20' : ''}`}
                                                    onClick={() => {
                                                        setSelectedCell({ person, hour });
                                                        setIsModalOpen(true);
                                                    }}
                                                >
                                                    <div className={`space-y-2 min-h-[100px] transition-all ${isPast && personApps.length === 0 ? 'opacity-20' : ''}`}>
                                                        {personApps.length === 0 && (
                                                            <div className="opacity-0 group-hover:opacity-100 flex items-center justify-center h-20 border-3 border-dashed border-slate-200 rounded-3xl text-[11px] text-slate-400 font-black uppercase tracking-widest transition-all bg-white shadow-sm">
                                                                + Müsait
                                                            </div>
                                                        )}
                                                        {personApps.map(app => (
                                                            <div
                                                                key={app.id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedAppointment(app);
                                                                    setIsDetailModalOpen(true);
                                                                }}
                                                                className={`p-5 rounded-3xl border-l-[6px] shadow-xl shadow-slate-200/40 transition-all hover:scale-[1.03] hover:shadow-2xl active:scale-95 cursor-pointer ${isPast && selectedDate === new Date().toISOString().split('T')[0] ? 'grayscale-[0.4] opacity-70' : ''} ${app.status === 'approved' ? 'bg-white text-slate-900 group-hover:bg-slate-50' :
                                                                    app.status === 'pending' ? 'bg-amber-50 border-amber-500 text-amber-900 animate-pulse' :
                                                                        app.status === 'completed' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 opacity-60' :
                                                                            'bg-slate-50 border-slate-300 text-slate-500'
                                                                    }`}
                                                                style={app.status === 'approved' ? { borderLeftColor: staffColor } : {}}
                                                            >
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{app.start_time}</span>
                                                                        {isCurrent && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span>}
                                                                    </div>
                                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${app.status === 'approved' ? 'bg-indigo-100 text-indigo-600' :
                                                                        app.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                                                            'bg-slate-100 text-slate-400'
                                                                        }`}>
                                                                        {app.status === 'approved' ? 'ONAYLI' : app.status === 'pending' ? 'YENİ' : 'GEÇMİŞ'}
                                                                    </span>
                                                                </div>
                                                                <p className="text-base font-black truncate leading-tight mb-1 tracking-tight">{app.customer_name || 'Misafir'}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest">{app.service_name}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Float Premium Legend */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-2xl px-10 py-5 rounded-[2.5rem] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.3)] flex items-center gap-10 z-[100] border border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-amber-500 rounded-xl shadow-lg shadow-amber-500/20"></div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Yeni Talep</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20"></div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Onaylandı</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20"></div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Tamamlandı</span>
                </div>
                <div className="w-px h-6 bg-slate-800"></div>
                <div className="flex items-center gap-3 text-emerald-400 group">
                    <div className="relative">
                        <svg className="w-5 h-5 animate-spin group-hover:animate-none group-hover:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <div className="absolute inset-0 bg-emerald-400/20 blur-lg animate-pulse rounded-full"></div>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] animate-pulse">Canlı Senk</span>
                </div>
            </div>

            {/* New/Fast Appointment Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white w-full max-w-2xl rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-100 animate-scale-up">
                        <div className="relative p-12 bg-gradient-to-br from-slate-50 to-white">
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <div className="inline-flex px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">Rezarvasyon Formu</div>
                                    <h2 className="text-4xl font-black text-slate-900 leading-none tracking-tighter">
                                        {selectedCell ? 'Hızlı Randevu' : 'Yeni Randevu'}
                                    </h2>
                                </div>
                                <button onClick={() => { setIsModalOpen(false); setSelectedCell(null); }} className="w-16 h-16 bg-white border border-slate-100 rounded-3xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:rotate-90 transition-all shadow-sm">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <form onSubmit={handleFastSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Müşteri İsmi</label>
                                        <input
                                            type="text"
                                            value={fastForm.customerName}
                                            onChange={e => setFastForm(prev => ({ ...prev, customerName: e.target.value }))}
                                            placeholder="İsim veya Misafir"
                                            className="w-full p-6 bg-white rounded-3xl border-2 border-slate-100 focus:border-indigo-500 transition-all font-black text-xl text-slate-900 outline-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Hizmet</label>
                                        <select
                                            value={fastForm.serviceId}
                                            onChange={e => setFastForm(prev => ({ ...prev, serviceId: e.target.value }))}
                                            className="w-full p-6 bg-white rounded-3xl border-2 border-slate-100 focus:border-indigo-500 transition-all font-black text-xl text-slate-900 outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="">Hizmet Seçin</option>
                                            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Uzman</label>
                                        <select
                                            disabled={!!selectedCell}
                                            value={fastForm.staffId || selectedCell?.person.user_id || selectedCell?.person.id}
                                            onChange={e => setFastForm(prev => ({ ...prev, staffId: e.target.value }))}
                                            className="w-full p-6 bg-white rounded-3xl border-2 border-slate-100 focus:border-indigo-500 transition-all font-black text-xl text-slate-900 outline-none appearance-none cursor-pointer disabled:bg-slate-50"
                                        >
                                            {staff.map(s => <option key={s.user_id || s.id} value={s.user_id || s.id}>{s.first_name} {s.last_name}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Tarih</label>
                                        <input
                                            type="date"
                                            disabled={!!selectedCell}
                                            value={fastForm.appointmentDate || selectedDate}
                                            onChange={e => setFastForm(prev => ({ ...prev, appointmentDate: e.target.value }))}
                                            className="w-full p-6 bg-white rounded-3xl border-2 border-slate-100 focus:border-indigo-500 transition-all font-black text-xl text-slate-900 outline-none disabled:bg-slate-50"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Başlangıç Saati</label>
                                        <select
                                            disabled={!!selectedCell}
                                            value={fastForm.startTime || selectedCell?.hour}
                                            onChange={e => setFastForm(prev => ({ ...prev, startTime: e.target.value }))}
                                            className="w-full p-6 bg-white rounded-3xl border-2 border-slate-100 focus:border-indigo-500 transition-all font-black text-xl text-slate-900 outline-none cursor-pointer disabled:bg-slate-50"
                                        >
                                            {hours.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Notlar</label>
                                    <textarea
                                        value={fastForm.notes}
                                        onChange={e => setFastForm(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Kısa notlar..."
                                        rows={2}
                                        className="w-full p-6 bg-white rounded-3xl border-2 border-slate-100 focus:border-indigo-500 transition-all font-medium text-slate-600 outline-none resize-none"
                                    />
                                </div>

                                <button
                                    disabled={loading}
                                    className="w-full bg-slate-900 text-white py-8 rounded-[2.5rem] font-black uppercase tracking-[0.3em] shadow-[0_24px_48px_-12px_rgba(15,23,42,0.4)] hover:bg-slate-800 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 text-xl"
                                >
                                    {loading ? 'Kaydediliyor...' : 'Randevuyu Onayla'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Appointment Detail Modal */}
            {isDetailModalOpen && selectedAppointment && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white w-full max-w-lg rounded-[4rem] overflow-hidden shadow-2xl animate-scale-up">
                        <div className="p-12">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <div className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 ${selectedAppointment.status === 'approved' ? 'bg-indigo-50 text-indigo-600' :
                                        selectedAppointment.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                                            'bg-slate-100 text-slate-500'
                                        }`}>
                                        {selectedAppointment.status === 'approved' ? 'ONAYLI RANDEVU' : 'BEKLEYEN RANDEVU'}
                                    </div>
                                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{selectedAppointment.customer_name || 'Misafir'}</h2>
                                </div>
                                <button onClick={() => setIsDetailModalOpen(false)} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2.5rem]">
                                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-2xl shadow-sm">✂️</div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hizmet</p>
                                        <p className="text-xl font-black text-slate-800 uppercase tracking-tight">{selectedAppointment.service_name}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 bg-slate-50 rounded-[2.5rem]">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saat</p>
                                        <p className="text-xl font-black text-slate-800">{selectedAppointment.start_time}</p>
                                    </div>
                                    <div className="p-6 bg-slate-50 rounded-[2.5rem]">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Uzman</p>
                                        <p className="text-lg font-black text-slate-800 truncate">{selectedAppointment.staff_name || 'Belirsiz'}</p>
                                    </div>
                                </div>

                                {selectedAppointment.notes && (
                                    <div className="p-8 bg-indigo-50/50 border border-indigo-100/50 rounded-[2.5rem]">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Müşteri Notu</p>
                                        <p className="text-slate-700 font-bold leading-relaxed">{selectedAppointment.notes}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4 mt-8">
                                <button
                                    onClick={() => handleCancelAppointment(selectedAppointment.id!)}
                                    disabled={loading}
                                    className="flex-1 bg-red-50 text-red-600 py-6 rounded-[2rem] font-black uppercase tracking-widest hover:bg-red-100 transition-all disabled:opacity-50"
                                >
                                    İptal Et
                                </button>
                                <button
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="flex-1 bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"
                                >
                                    Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
