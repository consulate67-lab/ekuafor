import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Appointment } from '../types';
import { Device } from '@capacitor/device';
import { useAuthStore } from '../store/authStore';

// Unique device fingerprint generator for web browsers (persistent across sessions)
const getOrCreateWebFingerprint = (): string => {
    const KEY = 'ekuafor_device_fingerprint';
    let fp = localStorage.getItem(KEY);
    if (fp) return fp;

    // Generate a stable fingerprint from browser properties + random component
    const nav = window.navigator;
    const screen = window.screen;
    const raw = [
        nav.userAgent,
        nav.language,
        screen.width,
        screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        Math.random().toString(36).substring(2, 10),
        Date.now().toString(36)
    ].join('|');

    // Simple hash
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        const char = raw.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    fp = 'WEB-' + Math.abs(hash).toString(36).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    localStorage.setItem(KEY, fp);
    return fp;
};

export default function MyAppointments() {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
    const [deviceId, setDeviceId] = useState<string>('');
    const { user } = useAuthStore();

    // Rating states
    const [ratingModal, setRatingModal] = useState<{ open: boolean; app: Appointment | null }>({ open: false, app: null });
    const [tempRating, setTempRating] = useState(5);
    const [tempComment, setTempComment] = useState('');
    const [isRating, setIsRating] = useState(false);

    // Get device ID on mount
    useEffect(() => {
        const initDevice = async () => {
            let id = 'web-browser';
            try {
                const isNative = (window as any).Capacitor?.isNativePlatform();
                if (isNative) {
                    const info = await Device.getId();
                    id = info.identifier;
                } else {
                    id = getOrCreateWebFingerprint();
                }
            } catch (e) {
                id = getOrCreateWebFingerprint();
            }
            localStorage.setItem('device_id', id);
            setDeviceId(id);
        };
        initDevice();
    }, []);

    const fetchMyAppointments = async () => {
        if (!deviceId) return; // Prevent 403 Forbidden from empty query device_id

        try {
            setLoading(true);
            setError('');

            // Primary: fetch by device ID
            const deviceRes = await api.get('/appointments', { params: { device_id: deviceId } });
            let myApps: Appointment[] = deviceRes.data?.data || [];

            // Also check localStorage IDs as fallback
            const localIds = JSON.parse(localStorage.getItem('my_appointment_ids') || '[]');
            if (localIds.length > 0) {
                try {
                    const idsRes = await api.get('/appointments', { params: { ids: localIds.join(',') } });
                    const idApps = idsRes.data?.data || [];
                    // Merge & deduplicate
                    const allMap = new Map<number, Appointment>();
                    myApps.forEach((a: Appointment) => allMap.set(a.id!, a));
                    idApps.forEach((a: Appointment) => allMap.set(a.id!, a));
                    myApps = Array.from(allMap.values());
                } catch (e) {
                    // Ignore ID fetch failures
                }
            }

            // Also check by phone if saved (backward compatibility) or from auth
            const savedPhone = user?.phone || localStorage.getItem('customer_phone');
            if (savedPhone) {
                try {
                    const phoneRes = await api.get('/appointments', { params: { customer_phone: savedPhone } });
                    const phoneApps = phoneRes.data?.data || [];
                    const allMap = new Map<number, Appointment>();
                    myApps.forEach((a: Appointment) => allMap.set(a.id!, a));
                    phoneApps.forEach((a: Appointment) => allMap.set(a.id!, a));
                    myApps = Array.from(allMap.values());
                } catch (e) { }
            }

            // Status change notifications
            const savedStatuses = JSON.parse(localStorage.getItem('appointment_statuses') || '{}');
            myApps.forEach((app: Appointment) => {
                const prevStatus = savedStatuses[app.id!];
                if (prevStatus && prevStatus !== app.status) {
                    notifyStatusChange(app);
                }
                savedStatuses[app.id!] = app.status;
            });
            localStorage.setItem('appointment_statuses', JSON.stringify(savedStatuses));

            // Sort: newest first
            setAppointments(myApps.sort((a: Appointment, b: Appointment) =>
                new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
            ));
        } catch (err: any) {
            console.error('Failed to fetch appointments', err);
            setError('Bağlantı hatası! Lütfen internetinizi kontrol edin.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (deviceId || user?.phone) {
            fetchMyAppointments();
        }
    }, [deviceId, user?.phone]);

    const processPayment = async (appId: number) => {
        try {
            const res = await api.post('/payments/initialize', { appointment_id: appId });
            if (res.data.success && res.data.data.paymentPageUrl) {
                // In real app, we might use a WebView or redirect
                window.location.href = res.data.data.paymentPageUrl;
            } else {
                alert('Ödeme başlatılamadı. Lütfen tekrar deneyin.');
            }
        } catch (err: any) {
            console.error('Payment initialization failed', err);
            alert('Hata: ' + (err.response?.data?.error || 'Ödeme servisine bağlanılamadı'));
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
            new Notification(`${app.company_name || 'Salon Cebimde'} Randevu Durumu`, {
                body: `${app.service_name} randevunuz ${statusLabel}. Saati: ${app.start_time}`,
                icon: '/ekuafor/favicon.ico'
            });
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending':
                return { label: 'Onay Bekliyor', color: 'bg-amber-100 text-amber-700', dotColor: 'bg-amber-400', icon: '🕒' };
            case 'approved':
                return { label: 'Onaylandı', color: 'bg-emerald-100 text-emerald-700', dotColor: 'bg-emerald-400', icon: '✅' };
            case 'completed':
                return { label: 'Tamamlandı', color: 'bg-blue-100 text-blue-700', dotColor: 'bg-blue-400', icon: '🏁' };
            case 'cancelled':
                return { label: 'İptal Edildi', color: 'bg-red-100 text-red-700', dotColor: 'bg-red-400', icon: '🚫' };
            default:
                return { label: status, color: 'bg-gray-100 text-gray-700', dotColor: 'bg-gray-400', icon: '•' };
        }
    };

    // Split appointments into active and past
    const now = new Date();
    // use en-CA to avoid UTC offset issues bridging midnight locally
    const todayStr = now.toLocaleDateString('en-CA');
    const nowMins = now.getHours() * 60 + now.getMinutes();

    const activeAppointments = appointments.filter(app => {
        const appDate = app.appointment_date.substring(0, 10);
        if (app.status === 'cancelled') return false;
        if (app.status === 'completed') return false;
        if (appDate > todayStr) return true;
        if (appDate === todayStr) {
            const [h, m] = (app.end_time || '00:00').split(':').map(Number);
            return (h * 60 + m) > nowMins;
        }
        return false;
    });

    const pastAppointments = appointments.filter(app => {
        if (app.status === 'cancelled' || app.status === 'completed') return true;
        const appDate = app.appointment_date.substring(0, 10);
        if (appDate < todayStr) return true;
        if (appDate === todayStr) {
            const [h, m] = (app.end_time || '00:00').split(':').map(Number);
            return (h * 60 + m) <= nowMins;
        }
        return false;
    });

    const displayApps = activeTab === 'active' ? activeAppointments : pastAppointments;

    // Loading screen
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Randevularınız Yükleniyor...</p>
                </div>
            </div>
        );
    }

    const renderAppointmentCard = (app: Appointment) => {
        const status = getStatusInfo(app.status);
        const appDate = new Date(app.appointment_date);
        const isRated = (app.rating || 0) > 0;
        const isPast = activeTab === 'past';

        return (
            <div key={app.id} className={`bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-all ${isPast ? 'opacity-80' : ''}`}>
                {/* Top colored bar */}
                <div className={`h-1 ${app.status === 'pending' ? 'bg-amber-400' : app.status === 'approved' ? 'bg-emerald-400' : app.status === 'completed' ? 'bg-blue-400' : 'bg-red-400'}`}></div>

                <div className="p-5">
                    {/* Header row */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1 truncate">{app.company_name || 'Salon'}</p>
                            <h3 className="text-base font-black text-slate-900 leading-tight truncate">
                                {app.package_name || app.service_name || 'Hizmet'}
                            </h3>
                            {app.staff_name && (
                                <p className="text-xs text-slate-400 font-bold mt-0.5">👤 {app.staff_name}</p>
                            )}
                        </div>
                        <div className={`px-3 py-1.5 rounded-xl text-[9px] uppercase tracking-tight font-black flex items-center gap-1 flex-shrink-0 ml-2 ${status.color}`}>
                            <span>{status.icon}</span>
                            <span>{status.label}</span>
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className="flex gap-3">
                        <div className="flex-1 bg-slate-50 rounded-2xl p-3">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">📅 Tarih</p>
                            <p className="text-sm font-bold text-slate-700">
                                {appDate.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold capitalize">
                                {appDate.toLocaleDateString('tr-TR', { weekday: 'long' })}
                            </p>
                        </div>
                        <div className="flex-1 bg-slate-50 rounded-2xl p-3">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">🕐 Saat</p>
                            <p className="text-lg font-black text-indigo-600">
                                {app.start_time?.substring(0, 5)}
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold">
                                {app.end_time?.substring(0, 5)}'e kadar
                            </p>
                        </div>
                    </div>

                    {/* Price */}
                    {app.price && Number(app.price) > 0 && (
                        <div className="mt-3 flex items-center justify-between px-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ücret</span>
                            <span className="text-sm font-black text-slate-700">₺{Number(app.price).toFixed(0)}</span>
                        </div>
                    )}

                    {/* Pending notice */}
                    {app.status === 'pending' && !isPast && (
                        <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                            <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                                ⏳ Randevunuz onay bekliyor. İşletme onayladığında bildirim alacaksınız.
                            </p>
                        </div>
                    )}

                    {/* Rating section for completed/past */}
                    {(app.status === 'completed' || isPast) && app.status !== 'cancelled' && (
                        <div className="mt-4 pt-4 border-t border-slate-50">
                            {isRated ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i} className={`text-sm ${i < (app.rating || 0) ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                                            ))}
                                        </div>
                                        {app.comment && <span className="text-[10px] text-slate-400 italic truncate max-w-[140px]">"{app.comment}"</span>}
                                    </div>
                                    <span className="text-[8px] font-black text-emerald-500 uppercase">Puanlandı</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold text-slate-400">Memnun kaldınız mı?</p>
                                    <div className="flex gap-2">
                                        {(app as any).payment_status === 'unpaid' && Number(app.price) > 0 && (
                                            <button
                                                onClick={() => processPayment(app.id!)}
                                                className="px-4 py-2 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                                            >
                                                💳 Ödeme Yap
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { setRatingModal({ open: true, app }); setTempRating(5); setTempComment(''); }}
                                            className="px-4 py-2 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                                        >
                                            ⭐ Puanla
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header */}
            <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-slate-100"
                style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
                <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                    <button onClick={() => navigate('/')} className="p-2 -ml-2 text-gray-400 hover:text-indigo-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-black text-gray-900 uppercase tracking-widest">Randevularım</h1>
                    <button onClick={fetchMyAppointments} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:rotate-180 duration-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                </div>

                {/* Tab Bar */}
                <div className="max-w-md mx-auto px-4 pb-3">
                    <div className="flex bg-slate-100 rounded-2xl p-1">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'active'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Aktif
                            {activeAppointments.length > 0 && (
                                <span className={`ml-1.5 inline-flex w-5 h-5 items-center justify-center rounded-full text-[9px] font-black ${activeTab === 'active' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                                    {activeAppointments.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('past')}
                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'past'
                                ? 'bg-white text-slate-700 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Geçmiş
                            {pastAppointments.length > 0 && (
                                <span className={`ml-1.5 inline-flex w-5 h-5 items-center justify-center rounded-full text-[9px] font-black ${activeTab === 'past' ? 'bg-slate-200 text-slate-600' : 'bg-slate-200 text-slate-500'}`}>
                                    {pastAppointments.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-6">
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl">
                        <p className="text-red-700 font-bold text-sm">{error}</p>
                    </div>
                )}

                {displayApps.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-100 p-8 shadow-sm">
                        <div className="text-5xl mb-5">{activeTab === 'active' ? '📋' : '📂'}</div>
                        <h2 className="text-xl font-black text-slate-900 mb-2 tracking-tight">
                            {activeTab === 'active' ? 'Aktif Randevu Yok' : 'Geçmiş Randevu Yok'}
                        </h2>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed max-w-xs mx-auto">
                            {activeTab === 'active'
                                ? 'Şu anda bekleyen veya onaylanmış bir randevunuz bulunmuyor.'
                                : 'Henüz tamamlanmış bir randevunuz yok.'
                            }
                        </p>

                        {activeTab === 'active' && (
                            <Link to="/" className="inline-flex items-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 transition-all">
                                <span>Yeni Randevu Al</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {displayApps.map(app => renderAppointmentCard(app))}
                    </div>
                )}

                {/* Bottom action for active tab */}
                {activeTab === 'active' && displayApps.length > 0 && (
                    <div className="mt-8">
                        <Link to="/" className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-indigo-200 hover:text-indigo-600 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            <span>Yeni Randevu Al</span>
                        </Link>
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
                            <p className="text-slate-500 text-sm mt-1">{ratingModal.app?.service_name || ratingModal.app?.package_name} nasıldı?</p>
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
                            placeholder="Görüşlerinizi yazabilirsiniz (isteğe bağlı)..."
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
