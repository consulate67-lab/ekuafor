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

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState<{ person: any, hour: string } | null>(null);
    const [fastForm, setFastForm] = useState({
        customerName: '',
        serviceId: '',
        notes: ''
    });

    const hours = Array.from({ length: 14 }, (_, i) => `${i + 8}:00`); // 08:00 to 21:00

    const fetchData = useCallback(async (compId: number) => {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Parallel fetch for speed
            const [appsRes, staffRes, servRes] = await Promise.all([
                api.get('/appointments', { params: { company_id: compId, start_date: today, end_date: today } }),
                api.get(`/companies/${compId}/employees`),
                api.get('/services', { params: { company_id: compId } })
            ]);

            setAppointments(appsRes.data.data || []);
            setStaff(staffRes.data.data || []);
            setServices(servRes.data.data || []);
        } catch (err) {
            console.error('Data sync failed', err);
        }
    }, []);

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

            // Refresher every 30 seconds
            const interval = setInterval(() => fetchData(compId), 30000);
            return () => clearInterval(interval);
        }
    }, [boardKey, fetchData]);

    const handleFastSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCell || !company) return;

        try {
            setLoading(true);
            const today = new Date().toISOString().split('T')[0];
            const startTime = selectedCell.hour;
            // Default 1 hour duration if no service selected
            const endTimeHour = parseInt(startTime.split(':')[0]) + 1;
            const endTime = `${endTimeHour}:00`;

            await api.post('/appointments', {
                company_id: company.id,
                staff_id: selectedCell.person.user_id || selectedCell.person.id,
                service_id: fastForm.serviceId ? parseInt(fastForm.serviceId) : (services[0]?.id || 1), // Fallback to first service or ID 1
                appointment_date: today,
                start_time: startTime,
                end_time: endTime,
                customer_name: fastForm.customerName || 'Misafir Müşteri',
                notes: fastForm.notes,
                status: 'approved' // Tablet direct entries are auto-approved
            });

            setIsModalOpen(false);
            setFastForm({ customerName: '', serviceId: '', notes: '' });
            fetchData(company.id!);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Randevu eklenemedi');
        } finally {
            setLoading(false);
        }
    };

    if (!boardKey) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl text-center">
                    <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl">
                        📟
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 mb-2">Salon Board</h1>
                    <p className="text-gray-500 mb-8 font-medium">Lütfen tablet erişim anahtarını giriniz.</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="text"
                            value={inputKey}
                            onChange={e => setInputKey(e.target.value.toUpperCase())}
                            placeholder="ERİŞİM ANAHTARI"
                            className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-gray-100 font-black text-center text-xl tracking-[0.3em] focus:border-amber-500 transition-colors uppercase"
                            required
                        />
                        {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
                        <button
                            disabled={loading}
                            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
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
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans overflow-hidden">
            {/* Board Header */}
            <header className="bg-white px-8 py-5 shadow-sm flex justify-between items-center z-20">
                <div className="flex items-center gap-6">
                    <div className="bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center gap-3">
                        <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-xs font-black uppercase tracking-widest leading-none mt-0.5">Live Board</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 leading-none mb-1 uppercase tracking-tight">{company?.name || 'Yükleniyor...'}</h1>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {pendingCount > 0 && (
                        <div className="bg-amber-100 text-amber-700 px-6 py-3 rounded-full flex items-center gap-3 animate-bounce">
                            <span className="w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-black text-sm">{pendingCount}</span>
                            <span className="text-xs font-black uppercase tracking-widest">Bekleyen İstek Var</span>
                        </div>
                    )}
                    <button
                        onClick={() => {
                            if (confirm('Sistemden çıkış yapılsın mı?')) {
                                localStorage.removeItem('salon_board_key');
                                window.location.reload();
                            }
                        }}
                        className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>
            </header>

            {/* Matrix View */}
            <div className="flex-1 overflow-auto p-4 lg:p-8">
                <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden inline-block min-w-full">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="sticky left-0 z-10 bg-gray-50 p-6 text-left border-b border-r border-gray-100 min-w-[200px]">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Uzman / Saat</span>
                                </th>
                                {hours.map(hour => (
                                    <th key={hour} className="p-6 text-center border-b border-gray-100 min-w-[150px]">
                                        <span className="text-sm font-black text-gray-700">{hour}</span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {staff.map(person => {
                                const pId = person.user_id || person.id;
                                return (
                                    <tr key={pId} className="group transition-colors hover:bg-slate-50/50">
                                        <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 p-6 border-b border-r border-gray-100 font-bold text-gray-900 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm uppercase">
                                                    {person.first_name?.[0] || 'U'}{person.last_name?.[0] || 'Z'}
                                                </div>
                                                <div>
                                                    <p className="leading-none mb-1">{person.first_name} {person.last_name}</p>
                                                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Personel</span>
                                                </div>
                                            </div>
                                        </td>
                                        {hours.map(hour => {
                                            const hourNum = parseInt(hour.split(':')[0]);
                                            const personApps = appointments.filter(a =>
                                                Number(a.staff_id) === Number(pId) &&
                                                parseInt(a.start_time.split(':')[0]) === hourNum
                                            );

                                            return (
                                                <td
                                                    key={hour}
                                                    className="p-3 border-b border-gray-100 align-top cursor-cell hover:bg-amber-50/30 transition-colors relative"
                                                    onClick={() => {
                                                        setSelectedCell({ person, hour });
                                                        setIsModalOpen(true);
                                                    }}
                                                >
                                                    <div className="space-y-1">
                                                        {personApps.length === 0 && (
                                                            <div className="opacity-0 group-hover:opacity-100 flex items-center justify-center py-4 border-2 border-dashed border-gray-100 rounded-2xl text-[10px] text-gray-400 font-bold uppercase tracking-widest transition-opacity">
                                                                + Ekle
                                                            </div>
                                                        )}
                                                        {personApps.map(app => (
                                                            <div
                                                                key={app.id}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className={`p-3 rounded-2xl border-l-4 shadow-sm transition-all hover:scale-[1.02] ${app.status === 'approved' ? 'bg-indigo-50 border-indigo-500 text-indigo-900' :
                                                                    app.status === 'pending' ? 'bg-amber-50 border-amber-500 text-amber-900 animate-pulse' :
                                                                        app.status === 'completed' ? 'bg-green-50 border-green-500 text-green-900 opacity-60' :
                                                                            'bg-gray-50 border-gray-300 text-gray-500'
                                                                    }`}
                                                            >
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <span className="text-[10px] font-black uppercase tracking-tighter">{app.start_time}</span>
                                                                    {app.status === 'pending' && <span className="w-2 h-2 bg-amber-500 rounded-full"></span>}
                                                                </div>
                                                                <p className="text-xs font-bold truncate leading-tight mb-1">{app.customer_name || 'Müşteri'}</p>
                                                                <p className="text-[9px] font-medium opacity-70 truncate uppercase">{app.service_name}</p>
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

            {/* Float Summary / Legend */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md border border-white px-8 py-4 rounded-3xl shadow-2xl flex gap-8 z-30">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Beklemede</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Onaylı</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tamamlandı</span>
                </div>
                <div className="w-px h-4 bg-gray-200 self-center"></div>
                <div className="flex items-center gap-2 text-gray-400">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Canlı Senkronizasyon</span>
                </div>
            </div>
            {/* Fast Appointment Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl animate-scale-up">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 leading-tight">Hızlı Randevu</h2>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
                                    {selectedCell?.person.first_name} • {selectedCell?.hour}
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleFastSubmit} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Müşteri (Opsiyonel)</label>
                                <input
                                    type="text"
                                    value={fastForm.customerName}
                                    onChange={e => setFastForm(prev => ({ ...prev, customerName: e.target.value }))}
                                    placeholder="Müşteri Adı / Misafir"
                                    className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all font-bold text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">İşlem Tipi (Opsiyonel)</label>
                                <select
                                    value={fastForm.serviceId}
                                    onChange={e => setFastForm(prev => ({ ...prev, serviceId: e.target.value }))}
                                    className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all font-bold text-gray-900 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBzdHJva2U9InJnYigxNTYsIDE2MywgMTc1KSIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE5IDlsLTcgNy03LTciPjwvcGF0aD48L3N2Zz4=')] bg-[length:24px] bg-[right_20px_center] bg-no-repeat"
                                >
                                    <option value="">İşlem Seçilmeyebilir</option>
                                    {services.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} - ₺{s.price}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Not (Opsiyonel)</label>
                                <textarea
                                    value={fastForm.notes}
                                    onChange={e => setFastForm(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Kısa not..."
                                    rows={2}
                                    className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all font-bold text-gray-900 resize-none"
                                />
                            </div>

                            <button
                                disabled={loading}
                                className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {loading ? 'Kaydediliyor...' : 'Randevuyu Oluştur'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
