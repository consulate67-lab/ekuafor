import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Appointment } from '../types';

export default function MyAppointments() {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchMyAppointments = async () => {
        try {
            const phone = localStorage.getItem('customer_phone');
            if (!phone) {
                setLoading(false);
                return;
            }

            // Fetch with phone param if supported, otherwise filter
            const res = await api.get('/appointments', { params: { customer_phone: phone } });
            const allApps = res.data?.data || [];

            // Robust local filtering
            const myApps = allApps.filter((app: Appointment) => {
                const phoneMatch = app.customer_phone === phone ||
                    app.notes?.includes(phone) ||
                    (app as any).phone === phone;
                return phoneMatch;
            });

            // Status Change Check for Notifications
            const savedStatuses = JSON.parse(localStorage.getItem('appointment_statuses') || '{}');
            myApps.forEach((app: Appointment) => {
                const prevStatus = savedStatuses[app.id!];
                if (prevStatus && prevStatus !== app.status) {
                    notifyStatusChange(app);
                }
                savedStatuses[app.id!] = app.status;
            });
            localStorage.setItem('appointment_statuses', JSON.stringify(savedStatuses));

            setAppointments(myApps.sort((a: Appointment, b: Appointment) =>
                new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
            ));
        } catch (err) {
            console.error('Failed to fetch appointments', err);
            setError('Randevularınız yüklenirken bir hata oluştu veya bağlantı kesildi.');
        } finally {
            setLoading(false);
        }
    };

    const notifyStatusChange = (app: Appointment) => {
        if (!("Notification" in window)) return;

        const statusLabel = app.status === 'approved' ? 'ONAYLANDI ✅' :
            app.status === 'cancelled' ? 'REDDEDİLDİ 🚫' : app.status;

        if (Notification.permission === "granted") {
            new Notification(`${app.company_name || 'Saloon'} Randevu Durumu`, {
                body: `${app.service_name} randevunuz ${statusLabel}. Saati: ${app.start_time}`,
                icon: '/ekuafor/favicon.ico'
            });
        }
    };

    useEffect(() => {
        fetchMyAppointments();

        // Polling every 60 seconds to check for status updates background
        const interval = setInterval(fetchMyAppointments, 60000);

        // Request permission on mount
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        return () => clearInterval(interval);
    }, []);

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending':
                return { label: 'Beklemede', color: 'bg-amber-100 text-amber-700 font-black', icon: '🕒' };
            case 'approved':
                return { label: 'Onaylandı', color: 'bg-emerald-500 text-white font-black', icon: '✅' };
            case 'completed':
                return { label: 'Tamamlandı', color: 'bg-blue-600 text-white font-black', icon: '🏁' };
            case 'cancelled':
                return { label: 'Reddedildi', color: 'bg-red-500 text-white font-black', icon: '🚫' };
            default:
                return { label: status, color: 'bg-gray-100 text-gray-700 font-bold', icon: '•' };
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Randevularınız Hazırlanıyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header */}
            <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-slate-100">
                <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-indigo-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-black text-gray-900 uppercase tracking-widest">Randevularım</h1>
                    <div className="flex items-center gap-3">
                        <button onClick={fetchMyAppointments} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:rotate-180 duration-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-8">
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl">
                        <p className="text-red-700 font-bold text-sm">{error}</p>
                    </div>
                )}

                {appointments.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 p-8">
                        <div className="text-6xl mb-6">📅</div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Henüz Randevunuz Yok</h3>
                        <p className="text-slate-500 text-sm mb-8">Henüz bir randevu oluşturmamışsınız veya numaranızla eşleşen kayıt bulunamadı.</p>
                        <Link to="/" className="btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-2xl shadow-xl shadow-indigo-500/20">
                            Hemen Keşfet
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {appointments.map((app) => {
                            const status = getStatusInfo(app.status);
                            const appDate = new Date(app.appointment_date);

                            return (
                                <div key={app.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">{app.company_name || 'Salon'}</p>
                                            <h3 className="text-lg font-black text-slate-900 leading-tight">{app.service_name}</h3>
                                        </div>
                                        <div className={`px-4 py-1.5 rounded-2xl text-[10px] uppercase tracking-tighter shadow-sm flex items-center gap-1.5 transition-all duration-500 animate-in zoom-in-50 ${status.color}`}>
                                            <span className="text-sm">{status.icon}</span>
                                            <span>{status.label}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tarih</p>
                                            <p className="text-sm font-bold text-slate-700">
                                                {appDate.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Saat</p>
                                            <p className="text-sm font-black text-indigo-600">
                                                {app.start_time.substring(0, 5)} - {app.end_time?.substring(0, 5)}
                                            </p>
                                        </div>
                                    </div>

                                    {app.status === 'pending' && (
                                        <div className="mt-4 p-3 bg-amber-50 rounded-2xl border border-amber-100">
                                            <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                                                ⚠️ Randevunuz onay bekliyor. Onaylandığında buradan takip edebilirsiniz.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Bottom Nav Spacer */}
            <div className="h-20"></div>
        </div>
    );
}
