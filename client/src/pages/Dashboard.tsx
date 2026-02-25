import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { Service } from '../types';
import { parseVoiceCommand } from '../lib/aiParser';
import { Device } from '@capacitor/device';

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
    const [voiceStep, setVoiceStep] = useState<'IDLE' | 'NAME' | 'DATE' | 'TIME' | 'SERVICE' | 'CONFIRM'>('IDLE');
    const [guidedData, setGuidedData] = useState<any>({
        customerName: '',
        date: '',
        serviceId: null,
        startTime: '09:00',
        endTime: '09:30',
        price: 0
    });
    const [employeeStats, setEmployeeStats] = useState({
        total_appointments: 0,
        total_revenue: 0
    });
    const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year'>('today');
    const [statsLoading, setStatsLoading] = useState(false);
    const [showReports, setShowReports] = useState(false);


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

    const fetchEmployeeStats = async (period: 'today' | 'week' | 'month' | 'year') => {
        if (user?.role !== 'staff' && user?.role !== 'company_admin') return;
        setStatsLoading(true);
        try {
            const res = await api.get('/reports/employee-stats', { params: { period } });
            if (res.data.success) {
                setEmployeeStats(res.data.data);
            }
        } catch (e) {
            console.error('Employee stats fetch error:', e);
        } finally {
            setStatsLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'staff' || user?.role === 'company_admin') {
            fetchEmployeeStats(selectedPeriod);
        }
    }, [user, selectedPeriod]);


    const speak = (text: string) => {
        if (!window.speechSynthesis) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Mobile browsers often need to load voices first
        const voices = window.speechSynthesis.getVoices();
        const trVoice = voices.find(v => v.lang.includes('tr'));
        if (trVoice) utterance.voice = trVoice;

        window.speechSynthesis.speak(utterance);
    };

    // Pre-initialize voices
    useEffect(() => {
        if (window.speechSynthesis) {
            window.speechSynthesis.getVoices();
        }
    }, []);

    const startVoiceCommand = () => {
        // Warm up speech synthesis for mobile
        if (window.speechSynthesis) {
            const warmUp = new SpeechSynthesisUtterance('');
            warmUp.lang = 'tr-TR';
            window.speechSynthesis.speak(warmUp);
        }

        setVoiceStep('NAME');
        setGuidedData({
            customerName: '',
            date: getLocalDateString(),
            startTime: '09:00',
            endTime: '09:30',
            serviceId: null,
            price: 0
        });
        speak('Müşterinin ismi nedir?');
        listenNextStep('NAME');
    };

    const listenNextStep = async (step: typeof voiceStep) => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Tarayıcınız sesli komut özelliğini desteklemiyor.');
            setVoiceStep('IDLE');
            return;
        }

        // Force permission check via getUserMedia - check if mediaDevices exists
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                console.log('Mic permission granted');
            } catch (err) {
                console.error('Mic permission denied', err);
                alert('Mikrofon izni verilmedi. Lütfen uygulama ayarlarından mikrofon iznini etkinleştirin.');
                setVoiceStep('IDLE');
                return;
            }
        } else {
            console.warn('mediaDevices not supported, proceeding with SpeechRecognition directly');
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'tr-TR';
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = (event: any) => {
            const result = event.results[event.results.length - 1];
            const transcript = result[0].transcript.toLowerCase();
            setVoiceTranscript(transcript);

            if (result.isFinal) {
                setTimeout(() => handleGuidedStep(step, transcript), 300);
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Recognition error', event.error);
            if (event.error === 'not-allowed') {
                alert('Mikrofon izni kapalı.');
            }
            setVoiceStep('IDLE');
        };

        recognition.start();
    };

    const handleGuidedStep = async (step: typeof voiceStep, transcript: string) => {
        const rules = localStorage.getItem(`ai_rules_${user?.company_id} `) || '';

        if (step === 'NAME') {
            // Clean common filler words
            const cleanName = transcript.replace(/(ismini|adi|olan|musteri|isim)/gi, '').trim();
            const name = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
            setGuidedData((prev: any) => ({ ...prev, customerName: name }));
            setVoiceStep('DATE');
            setTimeout(() => {
                speak('Randevu tarihi nedir?');
                listenNextStep('DATE');
            }, 600);
        }
        else if (step === 'DATE') {
            // Use aiParser just for date extraction from this transcript
            const parsed = parseVoiceCommand(transcript, [], rules);
            setGuidedData((prev: any) => ({ ...prev, date: parsed.date }));
            setVoiceStep('TIME');
            setTimeout(() => {
                speak('Randevu saati kaçta olsun?');
                listenNextStep('TIME');
            }, 600);
        }
        else if (step === 'TIME') {
            const parsed = parseVoiceCommand(transcript, [], rules);
            setGuidedData((prev: any) => ({ ...prev, startTime: parsed.startTime }));
            setVoiceStep('SERVICE');
            setTimeout(() => {
                speak('Yapılacak işlem nedir?');
                listenNextStep('SERVICE');
            }, 600);
        }
        else if (step === 'SERVICE') {
            const parsed = parseVoiceCommand(transcript, services, rules);
            const service = services.find(s => s.id === parsed.serviceId);

            // Calculate end time based on previously captured startTime and service duration
            let finalEndTime = parsed.endTime;
            if (service && guidedData.startTime) {
                const [h, m] = guidedData.startTime.split(':').map(Number);
                const duration = service.duration_minutes || 30;
                const totalMin = h * 60 + m + duration;
                const endH = Math.floor(totalMin / 60) % 24;
                const endM = totalMin % 60;
                finalEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
            }

            setGuidedData((prev: any) => ({
                ...prev,
                serviceId: parsed.serviceId,
                endTime: finalEndTime,
                price: parsed.price
            }));
            setVoiceStep('CONFIRM');
            speak('Randevuyu onaylıyor musunuz?');
        }
    };

    const confirmGuidedAppointment = async () => {
        try {
            if (!user?.company_id) return;

            let staffId = (user.role === 'staff') ? user.id : undefined;
            if (!staffId) {
                const empRes = await api.get(`/companies/${user.company_id}/employees`);
                const employees = empRes.data?.data || [];
                if (employees.length > 0) {
                    staffId = employees[0].user_id || employees[0].id;
                }
            }

            // Get Device ID
            let deviceId = undefined;
            try {
                const info = await Device.getId();
                deviceId = info.identifier;
            } catch (e) { }

            await api.post('/appointments', {
                company_id: user.company_id,
                service_id: guidedData.serviceId,
                staff_id: staffId,
                appointment_date: guidedData.date,
                start_time: guidedData.startTime,
                end_time: guidedData.endTime,
                customer_name: guidedData.customerName,
                notes: `Müşteri: ${guidedData.customerName} | Sesli Komut`,
                price: guidedData.price,
                device_id: deviceId,
                status: 'approved'
            });

            alert('Randevu başarıyla eklendi.');
            window.location.reload();
        } catch (err: any) {
            console.error('Guided booking error', err);
            alert('Randevu oluşturulurken hata oluştu.');
            setVoiceStep('IDLE');
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
                <div className="mb-10 flex flex-col sm:flex-row items-center gap-4 pt-4 sm:text-left text-center">
                    {user?.photo ? (
                        <img
                            src={user.photo}
                            alt={user.first_name}
                            className="w-14 h-14 rounded-2xl object-cover shadow-md border-2 border-white"
                        />
                    ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md border-2 border-white">
                            {user?.first_name?.[0]}-{user?.last_name?.[0]}
                        </div>
                    )}
                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-1">Merhaba, {user?.first_name}! 👋</h2>
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest leading-loose">İşletmenizi yönetmek için ihtiyacınız olan her şey burada.</p>
                    </div>
                </div>

                {/* Raporlama Bölümü - Modal Olarak Güncellendi */}
                {showReports && (user?.role === 'staff' || user?.role === 'company_admin') && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowReports(false)}></div>

                        <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Çalışan Raporu</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">İstatistiki veriler ve kazanç özeti</p>
                                </div>
                                <button onClick={() => setShowReports(false)} className="p-2 bg-white rounded-full shadow-sm text-slate-400 hover:text-slate-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="flex bg-slate-100 p-1 rounded-2xl w-fit mx-auto">
                                    {(['today', 'week', 'month', 'year'] as const).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setSelectedPeriod(p)}
                                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${selectedPeriod === p
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-gray-400 hover:text-slate-600'
                                                }`}
                                        >
                                            {p === 'today' ? 'Bugün' : p === 'week' ? 'Hafta' : p === 'month' ? 'Ay' : 'Yıl'}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-4">
                                    <div className="bg-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100 flex flex-col items-center text-center">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm mb-4">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Toplam Randevu</p>
                                        <p className={`text-4xl font-black text-indigo-900 ${statsLoading ? 'animate-pulse' : ''}`}>{employeeStats.total_appointments}</p>
                                    </div>

                                    <div className="bg-amber-50/50 p-8 rounded-[2rem] border border-amber-100 flex flex-col items-center text-center">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-600 shadow-sm mb-4">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z" /><path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM7.001 11a1 1 0 011-1h8a1 1 0 110 2h-8a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                        </div>
                                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Toplam Gelir</p>
                                        <p className={`text-4xl font-black text-amber-900 ${statsLoading ? 'animate-pulse' : ''}`}>₺{employeeStats.total_revenue.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* 1. Randevu Yönetimi */}
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

                    {/* 2. Sesli Randevu */}
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

                    {/* 3. Hizmet Yönetimi */}
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

                    {/* 4. Çalışan Raporu */}
                    {(user?.role === 'company_admin' || user?.role === 'staff') && (
                        <button
                            onClick={() => setShowReports(true)}
                            className="card group hover:scale-[1.02] transition-all duration-300 border-amber-100 text-left"
                        >
                            <div className="flex items-center gap-5">
                                <div className="bg-amber-50 p-4 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                                    <svg className="w-8 h-8 text-amber-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Çalışan Raporu</h3>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Kazanç ve randevu istatistiklerini gör.</p>
                                </div>
                            </div>
                        </button>
                    )}

                    {/* 5. WhatsApp Davet */}
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

                    {/* Firma Tanıtımı (YENİ - İşletme Profili) */}
                    {(user?.role === 'super_admin' || user?.role === 'company_admin') && (
                        <Link
                            to={user?.role === 'super_admin' ? "/companies" : `/companies/${user?.company_id}/edit`}
                            className="card group hover:scale-[1.02] transition-all duration-300 border-indigo-100"
                        >
                            <div className="flex items-center gap-5">
                                <div className="bg-indigo-50 p-4 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                    <svg className="w-8 h-8 text-indigo-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Firma Tanıtımı</h3>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">İşletme bilgilerini, görsellerini ve profilini yönet.</p>
                                </div>
                            </div>
                        </Link>
                    )}

                    {/* Üst Yönetim (SADECE SUPER ADMIN) */}
                    {user?.role === 'super_admin' && (
                        <Link to="/main-management" className="card group hover:scale-[1.02] transition-all duration-300 border-emerald-100">
                            <div className="flex items-center gap-5">
                                <div className="bg-emerald-50 p-4 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                                    <svg className="w-8 h-8 text-emerald-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Üst Yönetim</h3>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Grup firmalarını ve raporlarını yönetin.</p>
                                </div>
                            </div>
                        </Link>
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
                        <div className="col-span-full space-y-8">
                            {/* Rapor Filtreleri */}
                            <div className="flex bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-gray-100 w-fit mx-auto sm:mx-0">
                                {(['today', 'week', 'month', 'year'] as const).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setSelectedPeriod(p)}
                                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${selectedPeriod === p
                                            ? 'bg-slate-900 text-white shadow-lg'
                                            : 'text-gray-400 hover:text-slate-600 hover:bg-white'
                                            }`}
                                    >
                                        {p === 'today' ? 'Bugün' : p === 'week' ? 'Bu Hafta' : p === 'month' ? 'Bu Ay' : 'Bu Yıl'}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="card group relative overflow-hidden flex flex-col items-center justify-center border-none bg-gradient-to-br from-indigo-50/50 to-white hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 py-10">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <svg className="w-24 h-24 text-indigo-900" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] mb-3 relative z-10">Toplam Randevu</p>
                                    <p className={`text-6xl font-black text-slate-900 tracking-tight relative z-10 ${statsLoading ? 'animate-pulse opacity-50' : ''}`}>
                                        {employeeStats.total_appointments}
                                    </p>
                                    <div className="mt-4 flex items-center gap-2 px-3 py-1 bg-indigo-100/50 rounded-full">
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                                        <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">Performans</span>
                                    </div>
                                </div>

                                <div className="card group relative overflow-hidden flex flex-col items-center justify-center border-none bg-gradient-to-br from-amber-50/50 to-white hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-500 py-10">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <svg className="w-24 h-24 text-amber-900" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z" />
                                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM7.001 11a1 1 0 011-1h8a1 1 0 110 2h-8a1 1 0 01-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-[0.2em] mb-3 relative z-10">Toplam Gelir</p>
                                    <p className={`text-6xl font-black text-slate-900 tracking-tight relative z-10 ${statsLoading ? 'animate-pulse opacity-50' : ''}`}>
                                        <span className="text-3xl text-amber-600 mr-1">₺</span>
                                        {employeeStats.total_revenue.toLocaleString()}
                                    </p>
                                    <div className="mt-4 flex items-center gap-2 px-3 py-1 bg-amber-100/50 rounded-full">
                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                                        <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Hakediş</span>
                                    </div>
                                </div>
                            </div>
                        </div>
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

            {/* Ses Dinleme Overlay (Yönlendirmeli) */}
            {voiceStep !== 'IDLE' && (
                <div className="fixed inset-0 z-[100] bg-indigo-950/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-fade-in p-6">
                    <button
                        onClick={() => setVoiceStep('IDLE')}
                        className="absolute top-10 right-10 text-white/40 hover:text-white"
                    >
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    <div className="relative mb-12">
                        {isListening && (
                            <>
                                <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20 scale-150"></div>
                                <div className="absolute inset-0 bg-indigo-400 rounded-full animate-pulse opacity-40 scale-125"></div>
                            </>
                        )}
                        <div className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all ${isListening ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                            <svg className={`w-12 h-12 text-white ${isListening ? 'animate-bounce' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m8 0h-8m4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </div>
                    </div>

                    <div className="text-center max-w-lg w-full">
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-4">
                            {voiceStep === 'NAME' && '1. Müşteri İsmi?'}
                            {voiceStep === 'DATE' && '2. Randevu Tarihi?'}
                            {voiceStep === 'TIME' && '3. Randevu Saati?'}
                            {voiceStep === 'SERVICE' && '4. Yapılacak İşlem?'}
                            {voiceStep === 'CONFIRM' && 'Son Kontrol'}
                        </h2>

                        <p className="text-indigo-300 font-bold uppercase tracking-[0.2em] text-[11px] mb-12">
                            {voiceStep === 'NAME' && 'Müşterinin adını söyleyin'}
                            {voiceStep === 'DATE' && 'Bugün, Yarın veya bir gün söyleyin'}
                            {voiceStep === 'TIME' && 'Saat bilgisini söyleyin (örn: 14:30)'}
                            {voiceStep === 'SERVICE' && 'Hangi hizmet yapılacak?'}
                            {voiceStep === 'CONFIRM' && 'Randevu detayları aşağıdadır'}
                        </p>

                        <div className="space-y-4 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 text-left">
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Müşteri</span>
                                <span className="text-white font-black text-lg">{guidedData.customerName || '...'}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/5 py-4">
                                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Tarih / Saat</span>
                                <span className="text-white font-black text-lg">{guidedData.date ? new Date(guidedData.date).toLocaleDateString('tr-TR') : '...'} - {guidedData.startTime}</span>
                            </div>
                            <div className="flex justify-between items-center py-4">
                                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Hizmet</span>
                                <span className="text-white font-black text-lg">
                                    {services.find(s => s.id === guidedData.serviceId)?.name || (voiceStep === 'CONFIRM' ? 'Belirlenemedi' : '...')}
                                </span>
                            </div>
                        </div>

                        {voiceStep === 'CONFIRM' && (
                            <div className="mt-12 flex gap-4 w-full">
                                <button
                                    onClick={() => setVoiceStep('IDLE')}
                                    className="flex-1 py-6 bg-white/10 text-white rounded-3xl font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={confirmGuidedAppointment}
                                    className="flex-1 py-6 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all"
                                >
                                    Onayla
                                </button>
                            </div>
                        )}

                        {voiceStep !== 'CONFIRM' && isListening && voiceTranscript && (
                            <div className="mt-8 text-white/60 italic font-medium">
                                "{voiceTranscript}..."
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
