import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { parseVoiceCommand } from '../lib/aiParser';
import { Service } from '../types';

export default function Dashboard() {
    const { user, logout } = useAuthStore();
    const [stats, setStats] = useState({
        companyCount: 0,
        activeAppointments: 0,
        todayIncome: 0,
        customerCount: 0
    });
    const [services, setServices] = useState<Service[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState('');

    const getLocalDateString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

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
                    const todayStr = getLocalDateString();
                    // Safe fetch for appointments
                    let appointments: any[] = [];
                    try {
                        const appointmentsRes = await api.get('/appointments', { params: { start_date: todayStr } });
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

                    setServices(services);

                } catch (e) {
                    console.error('Stats calculation error:', e);
                }
            }
        };
        fetchStats();
    }, [user]);

    const startVoiceCommand = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Tarayıcınız sesli komut özelliğini desteklemiyor.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'tr-TR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = async (event: any) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            setVoiceTranscript(transcript);
            await processVoiceTranscript(transcript);
            setTimeout(() => setVoiceTranscript(''), 3000);
        };

        recognition.start();
    };

    const processVoiceTranscript = async (transcript: string) => {
        try {
            if (!user?.company_id) return;

            const rules = localStorage.getItem(`ai_rules_${user.company_id}`) || '';
            const result = parseVoiceCommand(transcript, services, rules);

            if (!result.serviceId) {
                alert('Üzgünüm, hangi hizmeti istediğinizi anlayamadım. (Hizmet bulunamadı)');
                return;
            }

            const matchedService = services.find(s => s.id === result.serviceId);

            // Fetch employees to assign a staff_id if not present
            let staffId = (user.role === 'staff') ? user.id : undefined;
            let staffName = (user.role === 'staff') ? `${user.first_name} ${user.last_name || ''}` : 'Belirtilmedi';

            if (!staffId) {
                try {
                    const empRes = await api.get(`/companies/${user.company_id}/employees`);
                    const employees = empRes.data?.data || [];
                    if (employees.length > 0) {
                        const firstEmp = employees[0];
                        staffId = firstEmp.user_id || firstEmp.id;
                        staffName = `${firstEmp.first_name} ${firstEmp.last_name || ''}`;
                    }
                } catch (e) {
                    console.warn('Employees fetch failed for voice command', e);
                }
            }

            const confirmMsg = `
🤖 YAPAY ZEKA ÖNERİSİ:
-------------------------
Müşteri: ${result.customerName}
Hizmet: ${matchedService?.name}
Personel: ${staffName}
Tarih: ${new Date(result.date).toLocaleDateString('tr-TR')}
Saat: ${result.startTime} - ${result.endTime}
-------------------------
Onaylıyor musunuz?
            `;

            if (window.confirm(confirmMsg)) {
                await api.post('/appointments', {
                    company_id: user.company_id,
                    service_id: result.serviceId,
                    staff_id: staffId,
                    appointment_date: result.date,
                    start_time: result.startTime,
                    end_time: result.endTime,
                    customer_name: result.customerName,
                    notes: result.notes,
                    price: result.price,
                    status: 'approved'
                });

                alert('Randevu başarıyla eklendi.');
                window.location.reload(); // Stats refresh
            }
        } catch (err: any) {
            console.error('Voice parse error', err);
            const serverMsg = err.response?.data?.error;
            alert(serverMsg ? `Hata: ${serverMsg}` : 'Randevu oluşturulurken bir teknik hata oluştu.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4">
                    <div className="relative flex justify-center items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#1e1b4b] to-[#b45309] flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <span className="text-white font-serif text-lg">S</span>
                            </div>
                            <h1 className="text-lg font-black heading-serif text-gray-900 tracking-tight">Saloon Yönetim</h1>
                        </div>

                        <div className="absolute right-0 flex items-center gap-3">
                            <button onClick={logout} className="p-2 text-gray-400 hover:text-[#b45309] transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    {voiceTranscript && (
                        <div className="mt-4 bg-pink-50 text-pink-600 px-4 py-2 rounded-xl text-[11px] font-bold animate-pulse border border-pink-100 italic text-center mx-auto max-w-md">
                            " {voiceTranscript} "
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-10 text-center sm:text-left pt-4">
                    <h2 className="text-xl font-black text-gray-900 mb-1">Merhaba, {user?.first_name}! 👋</h2>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest leading-loose">İşletmenizi yönetmek için ihtiyacınız olan her şey burada.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Sesli Randevu (İşletme Sahibi ve Çalışan) - EN BAŞA ALINDI */}
                    {(user?.role === 'company_admin' || user?.role === 'staff') && (
                        <button
                            onClick={startVoiceCommand}
                            className={`card group hover:scale-[1.02] transition-all duration-300 border-indigo-100 text-left relative overflow-hidden ${isListening ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                        >
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m8 0h-8m4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Sesli Randevu</h3>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Konuşarak hızlıca randevu oluştur.</p>
                                </div>
                            </div>
                        </button>
                    )}

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
                </div>
            </main>

            {/* Ses Dinleme Overlay */}
            {isListening && (
                <div className="fixed inset-0 z-[100] bg-indigo-950/90 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20 scale-150"></div>
                        <div className="absolute inset-0 bg-indigo-400 rounded-full animate-pulse opacity-40 scale-125"></div>
                        <div className="relative w-32 h-32 bg-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(79,70,229,0.6)]">
                            <svg className="w-16 h-16 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m8 0h-8m4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="mt-12 text-3xl font-black text-white tracking-tighter animate-pulse">Sizi Dinliyorum...</h2>
                    <p className="mt-4 text-indigo-200 font-bold uppercase tracking-[0.3em] text-[10px]">Lütfen randevu detaylarını söyleyin</p>

                    {voiceTranscript && (
                        <div className="mt-10 max-w-lg px-8 py-4 bg-white/10 rounded-2xl border border-white/10 text-center">
                            <p className="text-white font-medium italic text-lg leading-relaxed">
                                "{voiceTranscript}"
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
