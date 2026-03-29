import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

interface StaffInfo {
    id: number;
    first_name: string;
    last_name: string;
    board_code: string;
    gender: string;
    department_id: number;
    department_name: string;
    company_id: number;
    photo?: string;
}

export default function StaffPanel() {
    const navigate = useNavigate();
    const { logout, user } = useAuthStore();
    const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
    const [company, setCompany] = useState<any>(null);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportStats, setReportStats] = useState({
        total_booked_value: 0,
        actual_collected: 0,
        total_appointments: 0
    });

    useEffect(() => {
        // Eğer zaten auth store'da staff olarak giriş yapmışsa oradan alalım
        if (user && user.role === 'staff' && user.company_id) {
            setStaffInfo(user as any);
            // Şirket bilgisini de çekmemiz gerekebilir veya basitleştirebiliriz
            (async () => {
                try {
                    const compRes = await api.get(`/companies/${user.company_id}`);
                    setCompany(compRes.data.data);
                    fetchAppointments(user.company_id!, user.id);
                } catch (e) {
                    console.error('Company fetch error', e);
                } finally {
                    setLoading(false);
                }
            })();
            return;
        }

        const saved = localStorage.getItem('staff_board_code');
        if (!saved) {
            navigate('/login'); // Daha şık: Yetkisizse login'e gönder
            return;
        }

        (async () => {
            try {
                const res = await api.post('/companies/staff-login', { board_code: saved });
                if (res.data?.success) {
                    setStaffInfo(res.data.data.user);
                    setCompany(res.data.data.company);
                    fetchAppointments(res.data.data.company.id, res.data.data.user.id);
                    fetchReportStats(res.data.data.user.id);
                }
            } catch {
                localStorage.removeItem('staff_board_code');
                navigate('/login');
            } finally {
                setLoading(false);
            }
        })();
    }, [user]);

    const fetchReportStats = async (staffId: number) => {
        try {
            const d = new Date();
            const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            const res = await api.get('/reports/employee-stats', {
                params: {
                    period: 'today',
                    local_date: localDate,
                    staff_id: staffId // Added staff_id to params
                }
            });
            if (res.data.success) {
                setReportStats(res.data.data);
            }
        } catch (e) {
            console.error('Report stats error', e);
        }
    };

    const fetchAppointments = async (companyId: number, staffId: number) => {
        try {
            const [appsRes, servRes] = await Promise.all([
                api.get('/appointments', {
                    params: {
                        company_id: companyId,
                        start_date: selectedDate,
                        end_date: selectedDate
                    }
                }),
                api.get('/services', { params: { company_id: companyId } })
            ]);

            const allApps = appsRes.data?.data || [];
            // Sadece bu çalışana ait randevuları filtrele
            const myApps = allApps.filter((a: any) =>
                Number(a.staff_id) === Number(staffId) && a.status !== 'cancelled'
            );
            setAppointments(myApps.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time)));
            setServices(servRes.data?.data || []);
        } catch (err) {
            console.error('Fetch error', err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('staff_board_code');
        logout();
        navigate('/login');
    };

    const getServiceName = (serviceId: number) => {
        const s = services.find((sv: any) => sv.id === serviceId);
        return s?.name || 'Hizmet';
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: '⏳ Bekliyor' };
            case 'approved': return { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: '✅ Onaylı' };
            case 'completed': return { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: '🏁 Tamamlandı' };
            default: return { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700', label: status };
        }
    };

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
                <div className="text-white text-lg font-bold animate-pulse">Yükleniyor...</div>
            </div>
        );
    }

    if (!staffInfo || !company) return null;

    const nextApp = appointments.find(a => {
        const [h, m] = a.start_time.split(':').map(Number);
        return (h * 60 + m) >= nowMinutes && a.status !== 'completed' && a.status !== 'invoiced';
    });

    const completedToday = appointments.filter(a => a.status === 'completed' || a.status === 'invoiced').length;
    const pendingToday = appointments.filter(a => a.status === 'pending' || a.status === 'approved').length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white px-6 pt-16 pb-12 rounded-b-[3rem] shadow-2xl shadow-indigo-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-400/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-28 h-28 bg-purple-400/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>

                <div className="relative z-10 flex items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        {staffInfo.photo ? (
                            <img
                                src={staffInfo.photo}
                                alt={staffInfo.first_name}
                                className="w-32 h-32 rounded-[2.5rem] object-cover border-4 border-white/20 shadow-2xl"
                            />
                        ) : (
                            <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-500/30 flex items-center justify-center text-white font-black text-4xl border-4 border-white/20 shadow-2xl shrink-0">
                                {staffInfo.first_name?.[0]}{staffInfo.last_name?.[0]}
                            </div>
                        )}
                        <div>
                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] mb-1">{company.name}</p>
                            <h1 className="text-2xl font-black tracking-tight leading-tight">
                                {staffInfo.first_name} {staffInfo.last_name}
                            </h1>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${staffInfo.gender === 'erkek' ? 'bg-blue-500/20 text-blue-200' : 'bg-pink-500/20 text-pink-200'
                                    }`}>
                                    {staffInfo.gender === 'erkek' ? '♂ Erkek' : '♀ Kadın'}
                                </span>
                                {staffInfo.department_name && (
                                    <span className="px-2.5 py-0.5 bg-white/10 text-white/70 rounded-full text-[9px] font-black uppercase tracking-widest">
                                        {staffInfo.department_name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-500/20 text-red-200 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-red-500/30 active:scale-95 transition-all border border-red-500/20"
                    >
                        Çıkış
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="px-6 -mt-6 relative z-20">
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/40 border border-slate-50 flex flex-col items-center justify-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Potansiyel Kazanç</p>
                        <p className="text-2xl font-black text-indigo-600">₺{reportStats.total_booked_value.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/40 border border-slate-50 flex flex-col items-center justify-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tahsil Edilen</p>
                        <p className="text-2xl font-black text-emerald-600">₺{reportStats.actual_collected.toLocaleString()}</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/40 text-center border border-slate-50">
                        <p className="text-3xl font-black text-slate-900">{appointments.length}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Toplam</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/40 text-center border border-slate-50">
                        <p className="text-3xl font-black text-emerald-600">{completedToday}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Biten</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/40 text-center border border-slate-50">
                        <p className="text-3xl font-black text-amber-600">{pendingToday}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Bekleyen</p>
                    </div>
                </div>
            </div>

            {/* Today's Date */}
            <div className="px-6 mt-6">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                        {new Date(selectedDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', weekday: 'long' })}
                    </div>
                </div>
            </div>

            {/* Next Appointment Highlight */}
            {nextApp && (
                <div className="px-6 mt-4">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-5 text-white shadow-xl shadow-indigo-200">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/60 mb-2">Sıradaki Randevu</p>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xl font-black">{nextApp.customer_name || 'Misafir'}</p>
                                <p className="text-sm text-white/80 font-bold">{getServiceName(nextApp.service_id)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black">{nextApp.start_time?.substring(0, 5)}</p>
                                <p className="text-[10px] text-white/60 font-bold">{nextApp.end_time?.substring(0, 5)}'e kadar</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Appointments List */}
            <div className="px-6 mt-6 pb-24 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bugünkü Program</p>

                {appointments.length === 0 ? (
                    <div className="bg-white rounded-3xl p-10 text-center shadow-lg shadow-slate-200/20">
                        <span className="text-4xl block mb-3">☕</span>
                        <p className="text-slate-400 font-bold">Bugün randevunuz yok</p>
                        <p className="text-slate-300 text-xs mt-1">Güzel bir gün geçirin!</p>
                    </div>
                ) : (
                    appointments.map((app: any) => {
                        const badge = getStatusBadge(app.status);
                        const [appH, appM] = (app.start_time || '00:00').split(':').map(Number);
                        const isPast = (appH * 60 + appM) < nowMinutes;

                        return (
                            <div
                                key={app.id}
                                className={`bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/20 border transition-all ${isPast ? 'opacity-60 border-slate-50' : 'border-slate-100'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg font-black text-slate-900">
                                                {app.start_time?.substring(0, 5)}
                                            </span>
                                            <span className="text-slate-300 text-sm">→</span>
                                            <span className="text-sm font-bold text-slate-400">
                                                {app.end_time?.substring(0, 5)}
                                            </span>
                                        </div>
                                        <p className="font-black text-slate-900 text-base">{app.customer_name || 'Misafir'}</p>
                                        <p className="text-xs text-slate-400 font-bold mt-0.5">{getServiceName(app.service_id)}</p>
                                        {app.notes && (
                                            <p className="text-[11px] text-slate-400 mt-1 italic">📝 {app.notes}</p>
                                        )}
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${badge.bg} ${badge.text}`}>
                                        {badge.label}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
