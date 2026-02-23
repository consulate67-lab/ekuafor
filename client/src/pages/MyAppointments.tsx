import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Appointment } from '../types';
import { Device } from '@capacitor/device';

export default function MyAppointments() {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [phoneInput, setPhoneInput] = useState('');
    const [isIdentifying, setIsIdentifying] = useState(false);
    const [ratingModal, setRatingModal] = useState<{ open: boolean; app: Appointment | null }>({ open: false, app: null });
    const [tempRating, setTempRating] = useState(5);
    const [tempComment, setTempComment] = useState('');
    const [isRating, setIsRating] = useState(false);

    const fetchMyAppointments = async () => {
        const phone = localStorage.getItem('customer_phone');
        const localIds = JSON.parse(localStorage.getItem('my_appointment_ids') || '[]');

        // Get Unique Device ID
        let deviceId = 'web-browser';
        try {
            const info = await Device.getId();
            deviceId = info.identifier;
            localStorage.setItem('device_id', deviceId);
        } catch (e) {
            console.warn('Capacitor Device ID not available, using fallback');
        }

        // If no phone AND no local IDs, we need to ask for identity
        if (!phone && localIds.length === 0) {
            // Try automatic sync by deviceId first (to detect re-installs)
            try {
                const autoSyncRes = await api.get('/appointments', { params: { device_id: deviceId } });
                const foundApps = autoSyncRes.data?.data || [];
                if (foundApps.length > 0) {
                    setAppointments(foundApps);
                    setLoading(false);
                    return;
                }
            } catch (e) {
                console.log('Auto-sync failed/Empty');
            }

            setLoading(false);
            setIsIdentifying(true);
            return;
        }

        try {
            setLoading(true);
            let myApps: Appointment[] = [];

            if (phone) {
                // Fetch by BOTH phone and device to ensure total sync (Dual-Verification)
                const deviceId = localStorage.getItem('device_id') || 'web-browser';

                const [deviceRes, phoneRes] = await Promise.all([
                    api.get('/appointments', { params: { device_id: deviceId } }),
                    api.get('/appointments', { params: { customer_phone: phone } })
                ]);

                const deviceApps = deviceRes.data?.data || [];
                const phoneApps = phoneRes.data?.data || [];

                // Deduplicate by ID
                const allMap = new Map();
                [...phoneApps, ...deviceApps].forEach(a => allMap.set(a.id, a));
                myApps = Array.from(allMap.values());
            } else if (localIds.length > 0) {
                // Priority 2: Fetch by local IDs (Classic)
                const res = await api.get('/appointments', { params: { ids: localIds.join(',') } });
                myApps = res.data?.data || [];
            }

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

    const handleIdentify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phoneInput || phoneInput.length < 10) {
            alert('Lütfen geçerli bir telefon numarası girin.');
            return;
        }

        try {
            setLoading(true);
            const deviceId = localStorage.getItem('device_id') || 'web-browser';

            // Sync this device with this phone in DB
            await api.post('/appointments/customers/sync', {
                device_id: deviceId,
                customer_phone: phoneInput
            });

            localStorage.setItem('customer_phone', phoneInput);
            fetchMyAppointments();
        } catch (err) {
            console.error('Identification/Sync failed', err);
            alert('Senkronizasyon başarısız oldu. Lütfen tekrar deneyin.');
            setLoading(false);
        }
    };

    const handleChangePhone = () => {
        if (window.confirm('Cihazdaki randevu geçmişini temizlemek ve farklı bir numara ile eşleşmek istiyor musunuz?')) {
            localStorage.removeItem('customer_phone');
            localStorage.removeItem('appointment_statuses');
            localStorage.removeItem('my_appointment_ids');
            setAppointments([]);
            setPhoneInput('');
            setIsIdentifying(true);
        }
    };

    const handleRate = async () => {
        if (!ratingModal.app?.id) return;
        try {
            setIsRating(true);
            await api.patch(`/appointments/${ratingModal.app.id}/rate`, {
                rating: tempRating,
                comment: tempComment
            });
            setRatingModal({ open: false, app: null });
            fetchMyAppointments();
        } catch (err) {
            alert('Puanlama kaydedilemedi. Lütfen tekrar deneyin.');
        } finally {
            setIsRating(false);
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

        // Listen for global status updates
        const handleSync = () => fetchMyAppointments();
        window.addEventListener('appointment-status-changed', handleSync);

        return () => window.removeEventListener('appointment-status-changed', handleSync);
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
                    <h2 className="text-3xl font-black mb-2 tracking-tight">Cihaz Hafızası</h2>
                    <p className="text-slate-400 text-sm mb-10 font-medium">Bu cihazda henüz bir randevunuz bulunmuyor. Başka cihazdaki randevularınızı getirmek için numaranızı girin.</p>

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
                            const isRated = (app.rating || 0) > 0;

                            return (
                                <div key={app.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all">
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

                                    {/* Rating Section */}
                                    {app.status === 'completed' && (
                                        <div className="mt-6 pt-5 border-t border-slate-50 flex items-center justify-between">
                                            {isRated ? (
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex gap-1 text-sm">
                                                        {[...Array(5)].map((_, i) => (
                                                            <span key={i} className={i < (app.rating || 0) ? 'text-amber-400' : 'text-slate-200'}>★</span>
                                                        ))}
                                                    </div>
                                                    {app.comment && <p className="text-[11px] text-slate-500 italic font-medium">"{app.comment}"</p>}
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Memnun kaldınız mı?</p>
                                                    <button
                                                        onClick={() => setRatingModal({ open: true, app })}
                                                        className="px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                                                    >
                                                        Hizmeti Puanla
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Rating Modal */}
            {ratingModal.open && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
                        <div className="text-center mb-8">
                            <div className="text-4xl mb-4">⭐</div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Hizmeti Puanlayın</h2>
                            <p className="text-slate-500 text-sm mt-1">{ratingModal.app?.service_name} işlemi nasıldı?</p>
                        </div>

                        <div className="flex justify-center gap-2 mb-8">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setTempRating(s)}
                                    className={`w-12 h-12 text-2xl rounded-2xl transition-all duration-300 ${s <= tempRating ? 'bg-amber-100 text-amber-500 scale-110 shadow-lg shadow-amber-200/50' : 'bg-slate-50 text-slate-300'}`}
                                >
                                    ★
                                </button>
                            ))}
                        </div>

                        <textarea
                            placeholder="Görüşlerinizi buraya yazabilirsiniz (isteğe bağlı)..."
                            value={tempComment}
                            onChange={(e) => setTempComment(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium focus:border-indigo-500 outline-none transition-all h-24 resize-none mb-8"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setRatingModal({ open: false, app: null })}
                                className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleRate}
                                disabled={isRating}
                                className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {isRating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Gönder'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Nav Spacer */}
            <div className="h-20"></div>
        </div>
    );
}
