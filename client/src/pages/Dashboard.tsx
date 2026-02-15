import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

export default function Dashboard() {
    const { user, logout } = useAuthStore();
    const [stats, setStats] = useState({
        companyCount: 0,
        activeAppointments: 0,
        todayIncome: 0,
        customerCount: 0
    });
    const [showQR, setShowQR] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            if (user?.role === 'super_admin') {
                try {
                    const res = await api.get('/companies');
                    setStats(prev => ({ ...prev, companyCount: res.data.data.length }));
                } catch (e) {
                    console.error('Stats fetch error:', e);
                }
            } else if (user?.role === 'company_admin' || user?.role === 'staff') {
                try {
                    // Safe fetch for appointments
                    let appointments: any[] = [];
                    try {
                        const appointmentsRes = await api.get('/appointments');
                        appointments = appointmentsRes.data?.data || [];
                    } catch (e) {
                        console.warn('Appointments fetch failed', e);
                    }

                    // Safe fetch for services
                    let services: any[] = [];
                    try {
                        const servicesRes = await api.get('/services');
                        services = servicesRes.data?.data || [];
                    } catch (e) {
                        console.warn('Services fetch failed', e);
                    }

                    const todayStr = new Date().toISOString().split('T')[0];

                    // Active Appointments (Today's pending or approved)
                    const activeApps = appointments.filter(a =>
                        a.appointment_date === todayStr &&
                        (a.status === 'approved' || a.status === 'pending')
                    );

                    // Today's Income (Approved or completed appointments)
                    const incomeApps = appointments.filter(a =>
                        a.appointment_date === todayStr &&
                        (a.status === 'approved' || a.status === 'completed')
                    );

                    const totalIncome = incomeApps.reduce((sum, app) => {
                        // If appointment has price override use it, else find service price
                        if (app.price) return sum + Number(app.price);
                        const service = services.find(s => s.id === app.service_id);
                        return sum + (service ? Number(service.price) : 0);
                    }, 0);

                    // Customer Count (Unique customers)
                    const uniqueCustomers = new Set(appointments.map(a => a.customer_name || a.customer_id)).size;

                    setStats(prev => ({
                        ...prev,
                        activeAppointments: activeApps.length,
                        todayIncome: totalIncome,
                        customerCount: uniqueCustomers
                    }));

                } catch (e) {
                    console.error('Stats calculation error:', e);
                }
            }
        };
        fetchStats();
    }, [user]);

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 to-violet-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
                                <span className="text-white font-serif text-xl">S</span>
                            </div>
                            <h1 className="text-xl font-bold heading-serif hidden md:block">Saloon Yönetim Paneli</h1>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-gray-900 leading-none">{user?.first_name} {user?.last_name}</p>
                                <p className="text-[10px] font-semibold text-pink-600 uppercase tracking-wider mt-1">{user?.role?.replace('_', ' ')}</p>
                            </div>
                            <button onClick={logout} className="btn-secondary py-2 px-4 text-xs font-bold border-gray-100">
                                Çıkış Yap
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-10 text-center sm:text-left">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Merhaba, {user?.first_name}! 👋</h2>
                    <p className="text-gray-500 font-medium">İşletmenizi yönetmek için ihtiyacınız olan her şey burada.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Firma Tanıtımı (SADECE ADMIN) */}
                    {user?.role === 'super_admin' && (
                        <Link to="/companies" className="card group hover:scale-[1.02] transition-all duration-300 border-pink-100">
                            <div className="flex items-center gap-5">
                                <div className="bg-pink-50 p-4 rounded-2xl group-hover:bg-pink-600 group-hover:text-white transition-colors duration-300">
                                    <svg className="w-8 h-8 text-pink-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Firma Bilgileri</h3>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Firma bilgilerini ve çalışma saatlerini düzenle.</p>
                                </div>
                            </div>
                        </Link>
                    )}

                    {/* Hizmet Yönetimi (İşletme Sahibi) */}
                    {user?.role === 'company_admin' && (
                        <Link to="/services" className="card group hover:scale-[1.02] transition-all duration-300 border-violet-100">
                            <div className="flex items-center gap-5">
                                <div className="bg-violet-50 p-4 rounded-2xl group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                                    <svg className="w-8 h-8 text-violet-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758L5 19m0-14l4.121 4.121" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Hizmet Tanımları</h3>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Yeni hizmet ekle, süre ve fiyatları belirle.</p>
                                </div>
                            </div>
                        </Link>
                    )}

                    {/* Randevu Yönetimi (İşletme Sahibi ve Çalışan) */}
                    {(user?.role === 'company_admin' || user?.role === 'staff') && (
                        <Link to="/appointments" className="card group hover:scale-[1.02] transition-all duration-300 border-pink-100">
                            <div className="flex items-center gap-5">
                                <div className="bg-pink-50 p-4 rounded-2xl group-hover:bg-pink-600 group-hover:text-white transition-colors duration-300">
                                    <svg className="w-8 h-8 text-pink-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Randevular</h3>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Onay bekleyenler ve takvim planı.</p>
                                </div>
                            </div>
                        </Link>
                    )}


                    {/* QR Kod (Sadece Firma Sahibi) */}
                    {(user?.role === 'company_admin' || user?.role === 'super_admin') && (
                        <button
                            onClick={() => setShowQR(true)}
                            className="card group hover:scale-[1.02] transition-all duration-300 border-gray-800 text-left w-full"
                        >
                            <div className="flex items-center gap-5">
                                <div className="bg-gray-900 p-4 rounded-2xl group-hover:bg-black group-hover:text-white transition-colors duration-300">
                                    <svg className="w-8 h-8 text-white group-hover:text-pink-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zm-6 0H6.4M6.4 16H8v4H6.4v-4zm-2.4-5h14M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 10h.01M14 10h.01M10 14h.01M14 14h.01" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Firma Karekodu</h3>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Müşterileriniz için hızlı randevu QR kodu.</p>
                                </div>
                            </div>
                        </button>
                    )}

                    {/* WhatsApp Paylaşım (Personel ve Yönetici) */}
                    {(user?.role === 'staff' || user?.role === 'company_admin') && (
                        <a
                            href={`https://wa.me/?text=${encodeURIComponent(`Merhaba! 👋\n\nSize özel randevu sayfamdan kolayca randevu oluşturabilirsiniz:\n${window.location.origin}/ekuafor/book/${user.company_id || 1}?staff=${user.id}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="card group hover:scale-[1.02] transition-all duration-300 border-green-100"
                        >
                            <div className="flex items-center gap-5">
                                <div className="bg-green-50 p-4 rounded-2xl group-hover:bg-green-500 group-hover:text-white transition-colors duration-300">
                                    <svg className="w-8 h-8 text-green-600 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Müşteri Davet Et</h3>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">WhatsApp üzerinden randevu linkini paylaş.</p>
                                </div>
                            </div>
                        </a>
                    )}


                </div>

                {/* İstatistikler */}
                <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Admin İstatistikleri */}
                    {user?.role === 'super_admin' && (
                        <div className="card py-8 flex flex-col items-center justify-center border-none bg-gradient-to-br from-white to-gray-50 hover:to-pink-50/20 transition-colors duration-500">
                            <p className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-2">Toplam Firma</p>
                            <p className="text-5xl font-bold text-gray-900 tracking-tight">{stats.companyCount}</p>
                        </div>
                    )}

                    {/* Çalışan İstatistikleri */}
                    {user?.role === 'staff' && (
                        <>
                            <div className="card py-8 flex flex-col items-center justify-center border-none bg-gradient-to-br from-white to-gray-50">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Aktif Randevu</p>
                                <p className="text-5xl font-bold text-gray-300 tracking-tight">{stats.activeAppointments}</p>
                            </div>
                            <div className="card py-8 flex flex-col items-center justify-center border-none bg-gradient-to-br from-white to-gray-50">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bugünkü Gelir</p>
                                <p className="text-5xl font-bold text-gray-300 tracking-tight">₺{stats.todayIncome.toLocaleString()}</p>
                            </div>
                            <div className="card py-8 flex flex-col items-center justify-center border-none bg-gradient-to-br from-white to-gray-50">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Toplam Müşteri</p>
                                <p className="text-5xl font-bold text-gray-300 tracking-tight">{stats.customerCount}</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Reset & Version */}
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
                        <span className="text-[9px] text-gray-400 font-bold tracking-tighter uppercase whitespace-nowrap">Dashboard v1.5 | {user?.role}</span>
                    </div>
                </div>
            </main>

            {/* QR Modal */}
            {showQR && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="card w-full max-w-sm shadow-2xl scale-in-center animate-in zoom-in-95 duration-300 bg-white p-8 text-center relative">
                        <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <h3 className="text-2xl font-black text-gray-900 mb-2">Firma Karekodu</h3>
                        <p className="text-sm text-gray-500 font-medium mb-6">Müşterileriniz bu kodu okutarak randevu alabilir.</p>

                        <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 inline-block mb-6">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}/ekuafor/book/${user?.company_id}`)}`}
                                alt="QR Code"
                                className="w-48 h-48"
                            />
                        </div>

                        <div className="flex gap-3">
                            <a
                                href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`${window.location.origin}/ekuafor/book/${user?.company_id}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 btn-primary py-3 text-sm font-bold"
                            >
                                İndir / Yazdır
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
