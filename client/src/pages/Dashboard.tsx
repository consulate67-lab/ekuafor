import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Company, Service } from '../types';
import { parseVoiceCommand } from '../lib/aiParser';
import { Device } from '@capacitor/device';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { Appointment } from '../types';

// Leaflet Icon Fix
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

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
    const [allCompanies, setAllCompanies] = useState<Company[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentApp, setPaymentApp] = useState<Appointment | null>(null);
    const [nfcState, setNfcState] = useState<'IDLE' | 'SCANNING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [, setLoading] = useState(false);
    const [editableAmount, setEditableAmount] = useState<number>(0);
    const [companyInfo, setCompanyInfo] = useState<any>(null);


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
                    const companyList = res.data.data || [];
                    setStats(prev => ({ ...prev, companyCount: companyList.length }));
                    setAllCompanies(companyList);
                } catch (e) {
                    console.error('Stats fetch error:', e);
                }
            } else if (user?.role === 'company_admin' || user?.role === 'staff') {
                try {
                    const todayStr = getLocalDateString();
                    // Safe fetch for appointments
                    let statsApps: any[] = [];
                    try {
                        const appointmentsRes = await api.get('/appointments', { params: { start_date: todayStr } });
                        statsApps = appointmentsRes.data?.data || [];
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
                    const activeApps = statsApps.filter(a =>
                        a.appointment_date === todayStr &&
                        (a.status === 'approved' || a.status === 'pending')
                    );

                    // Today's Income (Approved or completed appointments)
                    const incomeApps = statsApps.filter(a =>
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
                    const uniqueCustomers = new Set(statsApps.map(a => a.customer_name || a.customer_id)).size;

                    setStats(prev => ({
                        ...prev,
                        activeAppointments: activeApps.length,
                        todayIncome: totalIncome,
                        customerCount: uniqueCustomers
                    }));

                    setServices(services);

                    // Fetch today's appointments for the staff member
                    try {
                        const appsRes = await api.get('/appointments', {
                            params: {
                                company_id: user.company_id,
                                start_date: todayStr,
                                end_date: todayStr
                            }
                        });
                        const allApps = appsRes.data?.data || [];
                        const myApps = allApps.filter((a: any) =>
                            Number(a.staff_id) === Number(user.id) || user.role === 'company_admin'
                        );
                        setAppointments(myApps);
                    } catch (e) {
                        console.warn('Dashboard appointments fetch failed', e);
                    }

                    // Fetch company details for commission rates
                    try {
                        const compRes = await api.get(`/companies/${user.company_id}`);
                        setCompanyInfo(compRes.data?.data);
                    } catch (e) {
                        console.warn('Company info fetch failed', e);
                    }

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

    const handleStatusUpdate = async (id: number, status: string, currentPrice?: number) => {
        let finalPrice = currentPrice;

        if (status === 'completed') {
            const priceInput = window.prompt('Hizmet tamamlandı. Son tutarı onaylıyor musunuz?', currentPrice?.toString() || '0');
            if (priceInput === null) return;
            finalPrice = Number(priceInput);

            const app = appointments.find(a => a.id === id);
            if (app && finalPrice > 0) {
                setPaymentApp({ ...app, price: finalPrice });
                setEditableAmount(finalPrice);
                setShowPaymentModal(true);
                return;
            }
        }

        try {
            setLoading(true);
            await api.patch(`/appointments/${id}/status`, {
                status,
                price: finalPrice
            });
            window.location.reload();
        } catch (err: any) {
            alert('İşlem başarısız oldu');
        } finally {
            setLoading(false);
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
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest leading-loose">
                            {user?.role === 'super_admin' ? 'Saloon Sistem Yönetim Paneline Hoş Geldiniz' : 'İşletmenizi yönetmek için ihtiyacınız olan her şey burada.'}
                        </p>
                    </div>
                </div>

                {/* Admin Quick Search & Actions (Super Admin Only) */}
                {user?.role === 'super_admin' && (
                    <>
                        <div className="card bg-slate-900 border-none shadow-2xl mb-12 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>
                            <div className="relative z-10 flex flex-col lg:flex-row gap-10 items-center justify-between">
                                <div className="space-y-6 max-w-xl">
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{user?.email}</span>
                                        </div>
                                        <h1 className="text-4xl font-black text-white leading-tight">
                                            Firma Yönetim <span className="text-indigo-400">Merkezi</span>
                                        </h1>
                                    </div>
                                    <p className="text-slate-400 text-sm font-medium leading-relaxed">
                                        Sisteme yeni salonlar tanımlayabilir, mevcut işletmelerin bilgilerini (isim, adres, telefon) güncelleyebilir ve şube yapılarını yönetebilirsiniz.
                                    </p>
                                    <div className="flex flex-wrap gap-4 pt-2">
                                        <Link to="/companies/new" className="bg-indigo-500 hover:bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-indigo-500/20 active:scale-95 flex items-center gap-3">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                            YENİ FİRMA TANIMLA
                                        </Link>
                                        <Link to="/companies" className="bg-white/10 hover:bg-white/20 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all border border-white/10 active:scale-95">
                                            FİRMALARI YÖNET
                                        </Link>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                                    <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/5 flex-1 lg:min-w-[150px] text-center group/item hover:bg-white/10 transition-colors">
                                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 opacity-60">TOPLAM FİRMA</p>
                                        <p className="text-5xl font-black text-white tracking-tighter group-hover/item:scale-110 transition-transform duration-500">{stats.companyCount}</p>
                                    </div>
                                    <Link to="/main-management" className="bg-emerald-500/5 backdrop-blur-xl p-6 rounded-[2.5rem] border border-emerald-500/10 flex-1 lg:min-w-[150px] text-center group/item hover:bg-emerald-500/20 transition-all">
                                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2 opacity-60">ÜST YÖNETİM</p>
                                        <div className="flex items-center justify-center gap-2">
                                            <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944" /></svg>
                                            <span className="text-lg font-black text-white uppercase">YÖNET</span>
                                        </div>
                                    </Link>
                                    <Link to="/sms-settings" className="bg-indigo-500/5 backdrop-blur-xl p-6 rounded-[2.5rem] border border-indigo-500/10 flex-1 lg:min-w-[150px] text-center group/item hover:bg-indigo-500/20 transition-all">
                                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 opacity-60">SMS / OTP</p>
                                        <div className="flex items-center justify-center gap-2">
                                            <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                            <span className="text-lg font-black text-white uppercase">AYARLA</span>
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* TÜRKİYE HARİTASI VE ŞEHİR DAĞILIMI */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                            {/* Harita */}
                            <div className="lg:col-span-2 bg-white rounded-[3rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                                    <span className="text-2xl">🇹🇷</span> Firma Dağılım Haritası
                                </h3>
                                <div className="h-[500px] w-full rounded-3xl overflow-hidden shadow-inner border border-slate-50">
                                    <MapContainer
                                        center={[38.9637, 35.2433] as any}
                                        zoom={6}
                                        style={{ height: '100%', width: '100%' }}
                                        scrollWheelZoom={false}
                                    >
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        />
                                        {allCompanies.filter(c => c.latitude && c.longitude).map(c => (
                                            <Marker key={c.id} position={[Number(c.latitude), Number(c.longitude)] as any}>
                                                <Popup>
                                                    <div className="p-1">
                                                        <p className="font-black text-indigo-950 text-sm mb-0.5">{c.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{c.city || 'Belirsiz Şehir'}</p>
                                                        <Link to={`/companies/${c.id}`} className="text-[9px] text-indigo-500 font-bold hover:underline mt-2 block">DETAYLARI GÖR</Link>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        ))}
                                    </MapContainer>
                                </div>
                            </div>

                            {/* Şehir Listesi */}
                            <div className="bg-white rounded-[3rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col">
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6">Şehir Bazlı Kayıtlar</h3>
                                <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[500px]">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-100">
                                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Şehir</th>
                                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-2">Kayıtlı Firma</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {Object.entries(
                                                allCompanies.reduce((acc: any, c) => {
                                                    const city = c.city || 'Belirtilmemiş';
                                                    acc[city] = (acc[city] || 0) + 1;
                                                    return acc;
                                                }, {})
                                            )
                                                .sort((a: any, b: any) => b[1] - a[1])
                                                .map(([city, count]: [string, any]) => (
                                                    <tr key={city} className="hover:bg-slate-50 transition-colors group">
                                                        <td className="py-4 pl-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full group-hover:scale-150 transition-transform"></div>
                                                                <span className="text-sm font-bold text-slate-700">{city}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 text-right pr-2">
                                                            <span className="bg-indigo-50 px-4 py-1.5 rounded-full text-xs font-black text-indigo-700">
                                                                {count}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </>
                )}

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



                </div>

                {/* İstatistikler */}
                <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6">

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
                                {/* Today's Appointments List for Staff */}
                                <div className="mt-12 bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 text-left">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Bugünkü Programım</h3>
                                        <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                            CANLI
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {appointments.length === 0 ? (
                                            <div className="py-12 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                                                <p className="text-3xl mb-3">☕</p>
                                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Bugün için randevunuz bulunmuyor</p>
                                            </div>
                                        ) : (
                                            appointments.map((app) => (
                                                <div key={app.id} className="group bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                                        <div className="flex items-center gap-6">
                                                            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex flex-col items-center justify-center shadow-lg">
                                                                <span className="text-xs font-black uppercase text-indigo-400">{app.start_time.split(':')[0]}</span>
                                                                <span className="text-xs font-black opacity-50">{app.start_time.split(':')[1]}</span>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-lg font-black text-slate-900">{app.customer_name || 'Misafir'}</h4>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                                    {services.find(s => s.id === app.service_id)?.name || 'Hizmet'} | {app.start_time} - {app.end_time}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            {app.status === 'approved' && (
                                                                <button
                                                                    onClick={() => handleStatusUpdate(app.id!, 'completed', app.price)}
                                                                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
                                                                >
                                                                    Tamamla & Ödeme Al
                                                                </button>
                                                            )}
                                                            {app.status === 'completed' && (
                                                                <span className="px-6 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-emerald-100">
                                                                    ✓ Tamamlandı
                                                                </span>
                                                            )}
                                                            {app.status === 'pending' && (
                                                                <span className="px-6 py-4 bg-amber-50 text-amber-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-amber-100">
                                                                    ⏳ Onay Bekliyor
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
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
            {
                voiceStep !== 'IDLE' && (
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
                )
            }

            {/* Payment Modal (NFC / SoftPOS Simulation) */}
            {showPaymentModal && paymentApp && (
                <div className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-500">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />

                        <div className="text-center mb-8">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Ödeme Al</h3>
                            <div className="flex flex-col items-center gap-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hizmet Bedeli</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300">₺</span>
                                    <input
                                        type="number"
                                        value={editableAmount}
                                        onChange={(e) => setEditableAmount(Number(e.target.value))}
                                        className="w-40 text-center text-3xl font-black text-indigo-600 bg-slate-50 border-none rounded-2xl py-3 pl-8 focus:ring-2 focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Commission Breakdown */}
                        <div className="bg-slate-50 rounded-3xl p-6 mb-8 space-y-3 border border-slate-100">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <span>Platform Komisyonu ({companyInfo?.commission_rate || 0}%)</span>
                                <span className="text-slate-600">₺{(editableAmount * (companyInfo?.commission_rate || 0) / 100).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <span>Iyzico Komisyonu ({companyInfo?.iyzico_commission_rate || 0}%)</span>
                                <span className="text-slate-600">₺{(editableAmount * (companyInfo?.iyzico_commission_rate || 0) / 100).toFixed(2)}</span>
                            </div>
                            <div className="h-px bg-slate-200 mt-2" />
                            <div className="flex justify-between items-center pt-1">
                                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">Tahsil Edilecek Toplam</span>
                                <span className="text-2xl font-black text-indigo-600">
                                    ₺{(editableAmount + (editableAmount * (companyInfo?.commission_rate || 0) / 100) + (editableAmount * (companyInfo?.iyzico_commission_rate || 0) / 100)).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {nfcState === 'IDLE' && (
                            <div className="grid grid-cols-1 gap-4">
                                <button
                                    onClick={async () => {
                                        setNfcState('SCANNING');
                                        setTimeout(async () => {
                                            try {
                                                const res = await api.post('/payments/ceppos/initialize', {
                                                    appointment_id: paymentApp.id,
                                                    amount: editableAmount // Send the confirmed base amount
                                                });
                                                if (res.data.success) {
                                                    setNfcState('SUCCESS');
                                                    setTimeout(() => {
                                                        // After successful payment, the status and collected price are already set by backend
                                                        // We just need to reload
                                                        window.location.reload();
                                                    }, 1500);
                                                } else {
                                                    setNfcState('ERROR');
                                                }
                                            } catch (e) {
                                                setNfcState('ERROR');
                                            }
                                        }, 3000);
                                    }}
                                    className="p-6 bg-slate-900 text-white rounded-[2rem] flex items-center justify-between group active:scale-95 transition-all shadow-xl shadow-slate-200"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📱</div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-indigo-400">Temassız Ödeme</p>
                                            <p className="text-lg font-black leading-tight">SoftPOS / NFC</p>
                                        </div>
                                    </div>
                                    <svg className="w-6 h-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                </button>

                                <button
                                    onClick={async () => {
                                        try {
                                            setLoading(true);
                                            await api.patch(`/appointments/${paymentApp.id}/status`, {
                                                status: 'completed',
                                                price: editableAmount
                                            });
                                            window.location.reload();
                                        } catch (e) {
                                            alert('Hata oluştu');
                                            setLoading(false);
                                        }
                                    }}
                                    className="p-6 bg-slate-50 text-slate-900 rounded-[2rem] flex items-center justify-between group active:scale-95 transition-all"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">💵</div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Nakit Ödeme</p>
                                            <p className="text-lg font-black leading-tight">Elden Tahsilat</p>
                                        </div>
                                    </div>
                                    <svg className="w-6 h-6 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                </button>

                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="w-full py-4 text-slate-400 text-xs font-black uppercase tracking-widest mt-4"
                                >
                                    İptal
                                </button>
                            </div>
                        )}

                        {nfcState === 'SCANNING' && (
                            <div className="py-12 flex flex-col items-center">
                                <div className="relative mb-12">
                                    <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20 scale-150"></div>
                                    <div className="absolute inset-0 bg-indigo-400 rounded-full animate-pulse opacity-40 scale-125"></div>
                                    <div className="relative w-32 h-32 bg-slate-900 rounded-full flex items-center justify-center text-4xl shadow-2xl">⚡</div>
                                </div>
                                <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Kartı Yaklaştırın</h4>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">Temassız ödeme bekleniyor...</p>
                            </div>
                        )}

                        {nfcState === 'SUCCESS' && (
                            <div className="py-12 flex flex-col items-center animate-in zoom-in duration-500">
                                <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center text-5xl shadow-2xl mb-8">✓</div>
                                <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Ödeme Başarılı</h4>
                                <p className="text-emerald-500 font-black uppercase tracking-widest text-[10px]">İşlem onaylandı, iyzico kaydı oluşturuldu.</p>
                            </div>
                        )}

                        {nfcState === 'ERROR' && (
                            <div className="py-12 flex flex-col items-center">
                                <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center text-5xl shadow-2xl mb-8">!</div>
                                <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Ödeme Başarısız</h4>
                                <p className="text-red-500 font-black uppercase tracking-widest text-[10px] mb-8">İşlem reddedildi veya hata oluştu.</p>
                                <button onClick={() => setNfcState('IDLE')} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase">Tekrar Dene</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div >
    );
}
