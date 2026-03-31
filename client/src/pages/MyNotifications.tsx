import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function MyNotifications() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuthStore();

    const fetchNotifications = async () => {
        try {
            const phone = user?.phone || localStorage.getItem('customer_phone');
            if (!phone) {
                setLoading(false);
                return;
            }
            const res = await api.get('/appointments/customers/notifications', { params: { phone } });
            const data = res.data.data || [];
            setNotifications(data);
            
            // Kullanıcı bu sayfaya girdiğinde tüm bildirimleri "okundu" sayıp toplam sayıyı kaydediyoruz.
            localStorage.setItem('read_notifications_count', data.length.toString());
            
            // Eğer varsa bildirim rozetini sildirmek için CustomEvent gönderelim.
            window.dispatchEvent(new Event('notifications_read'));
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [user?.phone]);

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-slate-100"
                style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
                <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                    <button onClick={() => navigate('/')} className="p-2 -ml-2 text-gray-400 hover:text-indigo-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-black text-gray-900 uppercase tracking-widest text-center flex-1">Bildirimlerim</h1>
                    <div className="w-10" />
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-6">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Yükleniyor...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 p-10 shadow-sm">
                        <div className="text-6xl mb-6 grayscale opacity-20">🔔</div>
                        <h2 className="text-xl font-black text-slate-900 mb-2">Henüz bildiriminiz yok.</h2>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
                            Randevu onayları, iptalleri ve duyurular burada liste halinde görünür.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2 mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Son Bildirimler</span>
                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{notifications.length} Mesaj</span>
                        </div>
                        {notifications.map((n) => (
                            <div key={n.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex gap-4 hover:shadow-md transition-shadow active:scale-[0.98] transition-transform">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${n.type === 'push' ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'bg-emerald-50 text-emerald-600 shadow-inner'}`}>
                                    {n.type === 'push' ? (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                    ) : (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1 gap-2">
                                        <h3 className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">{n.title}</h3>
                                        <span className="text-[8px] text-slate-400 font-black whitespace-nowrap bg-slate-50 px-1.5 py-0.5 rounded-md uppercase">
                                            {new Date(n.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} {new Date(n.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-slate-500 text-xs leading-relaxed font-medium">{n.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
