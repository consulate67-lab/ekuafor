import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Appointment } from '../types';

export default function MyAppointments() {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchMyAppointments = async () => {
            try {
                const phone = localStorage.getItem('customer_phone');
                if (!phone) {
                    setLoading(false);
                    return;
                }

                // In a real app, this would be a specific endpoint for customer appointments
                // For now, we fetch appointments and filter by phone in notes
                const res = await api.get('/appointments');
                const allApps = res.data?.data || [];

                const myApps = allApps.filter((app: Appointment) => {
                    return app.notes?.includes(phone) || app.customer_phone === phone;
                });

                setAppointments(myApps.sort((a: Appointment, b: Appointment) =>
                    new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
                ));
            } catch (err) {
                console.error('Failed to fetch appointments', err);
                setError('Randevularınız yüklenirken bir hata oluştu.');
            } finally {
                setLoading(false);
            }
        };

        fetchMyAppointments();
    }, []);

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending':
                return { label: 'Bekliyor', color: 'bg-amber-100 text-amber-700', icon: '⏳' };
            case 'approved':
                return { label: 'Onaylandı', color: 'bg-emerald-100 text-emerald-700', icon: '✅' };
            case 'completed':
                return { label: 'Tamamlandı', color: 'bg-blue-100 text-blue-700', icon: '🏁' };
            case 'cancelled':
                return { label: 'İptal Edildi', color: 'bg-red-100 text-red-700', icon: '❌' };
            default:
                return { label: status, color: 'bg-gray-100 text-gray-700', icon: '•' };
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
                    <div className="w-10"></div>
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
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                                            {status.icon} {status.label}
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
