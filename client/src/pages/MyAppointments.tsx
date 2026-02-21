import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Appointment } from '../types';

export default function MyAppointments() {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [phoneInput, setPhoneInput] = useState('');
    const [isIdentifying, setIsIdentifying] = useState(false);

    const fetchMyAppointments = async () => {
        const phone = localStorage.getItem('customer_phone');
        if (!phone) {
            setLoading(false);
            setIsIdentifying(true);
            return;
        }

        try {
            setLoading(true);
            // Normalizing phone for local matching too
            const cleanPhone = phone.replace(/\D/g, '').replace(/^0/, '');

            const res = await api.get('/appointments', { params: { customer_phone: phone } });
            const allApps = res.data?.data || [];

            // Local fallback match if server side has any gaps
            const myApps = allApps.filter((app: any) => {
                const appNotes = (app.notes || '').replace(/\D/g, '');
                const appPhone = (app.customer_phone || app.phone || '').replace(/\D/g, '');
                return appNotes.includes(cleanPhone) || appPhone.includes(cleanPhone);
            });

            // Status Change Check for Notifications
            const savedStatuses = JSON.parse(localStorage.getItem('appointment_statuses') || '{}');
            myApps.forEach((app: Appointment) => {
                const prevStatus = savedStatuses[app.id!];
                // Trigger notification on change
                if (prevStatus && prevStatus !== app.status) {
                    notifyStatusChange(app);
                }
                savedStatuses[app.id!] = app.status;
            });
            localStorage.setItem('appointment_statuses', JSON.stringify(savedStatuses));

            setAppointments(myApps.sort((a: Appointment, b: Appointment) =>
                new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
            ));
            setLastRefresh(new Date());
            setError('');
            setIsIdentifying(false);
        } catch (err: any) {
            console.error('Failed to fetch appointments', err);
            setError(err.response?.status === 404 ? 'Randevu bulunamadı.' : 'Bağlantı hatası! Lütfen internetinizi kontrol edin.');
        } finally {
            setLoading(false);
        }
    };

    const handleIdentify = (e: React.FormEvent) => {
        e.preventDefault();
        if (!phoneInput || phoneInput.length < 10) {
            alert('Lütfen geçerli bir telefon numarası girin.');
            return;
        }
        localStorage.setItem('customer_phone', phoneInput);
        fetchMyAppointments();
    };

    const handleChangePhone = () => {
        if (window.confirm('Farklı bir numara ile randevularınızı görmek istiyor musunuz?')) {
            localStorage.removeItem('customer_phone');
            localStorage.removeItem('appointment_statuses');
            setAppointments([]);
            setPhoneInput('');
            setIsIdentifying(true);
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

    if (isIdentifying) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white translate-all duration-500">
                <div className="w-full max-w-sm text-center">
                    <div className="w-20 h-20 bg-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/40 rotate-12">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    </div>
                    <h2 className="text-3xl font-black mb-2 tracking-tight">Kayıtlı Cihazınız</h2>
                    <p className="text-slate-400 text-sm mb-10 font-medium">Randevularınızı takip etmek için telefon numaranızı girin.</p>

                    <form onSubmit={handleIdentify} className="space-y-4">
                        <input
                            type="tel"
                            placeholder="05XX XXX XX XX"
                            value={phoneInput}
                            onChange={e => setPhoneInput(e.target.value)}
                            className="w-full bg-white/5 border-2 border-white/10 p-5 rounded-2xl text-center text-xl font-black tracking-widest focus:border-indigo-500 focus:bg-white/10 outline-none transition-all placeholder:text-white/20"
                            autoFocus
                        />
                        <button className="w-full bg-indigo-600 hover:bg-indigo-500 py-5 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl shadow-indigo-600/30 active:scale-[0.98] transition-all">
                            Randevularımı Getir
                        </button>
                    </form>
                    <button onClick={() => navigate('/')} className="mt-8 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Ana Sayfaya Dön</button>
                </div>
            </div>
        );
    }

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
            <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-slate-100 safe-top">
                <div className="max-w-md mx-auto px-4 py-6 flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-indigo-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-black text-gray-900 uppercase tracking-widest">Randevularım</h1>
                    <div className="flex items-center gap-3">
                        {lastRefresh && (
                            <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">
                                {lastRefresh.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        )}
                        {localStorage.getItem('customer_phone') && (
                            <button onClick={handleChangePhone} className="p-2 text-slate-300 hover:text-indigo-500 transition-colors" title="Cihaz Kaydını Sil">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </button>
                        )}
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
                    <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 p-8 shadow-sm">
                        <div className="text-6xl mb-6">📅</div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Randevu Bulunamadı</h2>
                        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                            {localStorage.getItem('customer_phone') ? 
                                <span><b>{localStorage.getItem('customer_phone')}</b> numarası ile eşleşen bir randevu kaydı bulunamadı.</span> : 
                                'Henüz bir randevu oluşturmamışsınız.'}
                        </p>
                        
                        {localStorage.getItem('customer_phone') && (
                            <button 
                                onClick={handleChangePhone} 
                                className="mb-10 text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] px-6 py-3 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
                            >
                                Farklı Numara ile Dene
                            </button>
                        )}

                        <Link to="/" className="btn-primary flex items-center justify-center gap-3 px-8 py-5 rounded-2xl shadow-2xl shadow-indigo-500/20 w-full group">
                            <span className="text-sm uppercase tracking-widest font-black">Yeni Randevu Al</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
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
