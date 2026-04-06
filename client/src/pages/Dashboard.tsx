import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Company, Service } from '../types';
import { parseVoiceCommand } from '../lib/aiParser';
import { Device } from '@capacitor/device';
import { useAuthStore } from '../store/authStore';
import { 
    Package, 
    Users, 
    TrendingUp,
    AlertTriangle,
    Calendar,
    Mic,
    Plus
} from 'lucide-react';
import api from '../lib/api';

// Leaflet Icon Fix
import Tesseract from 'tesseract.js';

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
        customerCount: 0,
        lowStockCount: 0
    });
    const [employeeStats, setEmployeeStats] = useState({
        total_appointments: 0,
        total_booked_value: 0,
        actual_collected: 0,
        total_expenses: 0
    });
    const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year'>('today');
    const [statsLoading, setStatsLoading] = useState(false);
    const [showReports, setShowReports] = useState(false);
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
    const [allCompanies, setAllCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(false);
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [isLicenseExpired, setIsLicenseExpired] = useState(false);
    const [expenseForm, setExpenseForm] = useState({
        amount: '',
        description: '',
        date: ''
    });
    const [renewingLicense, setRenewingLicense] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // OCR States
    const [isScanningReceipt, setIsScanningReceipt] = useState(false);
    const [ocrLoading, setOcrLoading] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [customersModal, setCustomersModal] = useState({ open: false, search: '', history: [] as any[], loading: false });
    const searchTimeout = useRef<any>(null);

    const fetchCustomerHistory = async (search: string) => {
        if (!search || search.length < 2) {
            setCustomersModal(prev => ({ ...prev, history: [], loading: false, search }));
            return;
        }

        setCustomersModal(prev => ({ ...prev, loading: true, search }));
        try {
            const res = await api.get('/appointments/history', { params: { search } });
            setCustomersModal(prev => ({ ...prev, history: res.data.data || [], loading: false }));
        } catch (err) {
            console.error('History fetch error:', err);
            setCustomersModal(prev => ({ ...prev, loading: false }));
        }
    };

    // Back button support for Customers Modal
    useEffect(() => {
        const handlePopState = () => {
            if (customersModal.open) {
                setCustomersModal(prev => ({ ...prev, open: false }));
            }
        };

        if (customersModal.open) {
            window.addEventListener('popstate', handlePopState);
        }

        return () => window.removeEventListener('popstate', handlePopState);
    }, [customersModal.open]);

    const openCustomersModal = () => {
        window.history.pushState({ modal: 'customers' }, '');
        setCustomersModal(prev => ({ ...prev, open: true }));
    };

    const closeCustomersModal = () => {
        if (customersModal.open) {
            window.history.back();
        }
    };

    const handleCustomerSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setCustomersModal(prev => ({ ...prev, search: val }));
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => fetchCustomerHistory(val), 500);
    };

    const handleRenewLicense = async () => {
        try {
            setRenewingLicense(true);
            const res = await api.post('/payments/license/initialize', { months: 12 });
            if (res.data.success && res.data.data.paymentPageUrl) {
                window.location.href = res.data.data.paymentPageUrl;
            }
        } catch (err: any) {
            alert(err.response?.data?.error || 'Ödeme başlatılamadı');
        } finally {
            setRenewingLicense(false);
        }
    };

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
                    const res = await api.get('/companies', { headers: { 'X-No-Mock': 'true' } });
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

                    // Staff appointments fetch removed since schedule is not shown here anymore

                    // Fetch company details for commission rates
                    try {
                        const compRes = await api.get(`/companies/${user.company_id}`);
                        const comp = compRes.data?.data;
                        setCompanyInfo(comp);
                        if (comp?.license_end_date) {
                            const isExpired = new Date(comp.license_end_date) < new Date();
                            setIsLicenseExpired(isExpired);
                        }
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
            const res = await api.get('/reports/employee-stats', { params: { period, local_date: getLocalDateString() } });
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

        // Cleanup: Stop any accidental active camera stream on unmount
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [user, selectedPeriod]);



    const startScanner = async () => {
        setIsScanningReceipt(true);
        setOcrLoading(false);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.setAttribute("playsinline", "true");
                videoRef.current.play();
            }
        } catch (e: any) {
            alert('Kamera açılamadı: ' + e.message);
            setIsScanningReceipt(false);
        }
    };

    const stopScanner = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
        setIsScanningReceipt(false);
    };

    const captureReceipt = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Tesseract'ın daha iyi okuması için yüksek çözünürlük ve ön işleme
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 1. Resmi Çiz
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 2. Gelişmiş Ön İşleme (Görüntü kalitesini artır)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            // Grayscale (Luminance method for better weight)
            const v = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];

            // Contrast & Thresholding
            const result = v > 150 ? 255 : 0; // Biraz daha parlak eşik
            data[i] = data[i + 1] = data[i + 2] = result;
        }
        ctx.putImageData(imageData, 0, 0);

        setOcrLoading(true);
        try {
            const worker = await Tesseract.createWorker('tur');
            await worker.setParameters({
                tessedit_char_whitelist: '0123456789.,ABCDEFGHIJKLMNOPQRSTUVWXYZabcçdefgğhıijklmnoöprsştuüvyz *:=-+TL'
            });

            const ret = await worker.recognize(canvas.toDataURL('image/jpeg', 0.95));
            const rawText = ret.data.text;
            await worker.terminate();

            console.log('[OCR Ham Metin]', rawText);

            const lines = rawText.split('\n').map(l => l.trim().toUpperCase()).filter(l => l.length > 0);
            let foundAmount: number | null = null;

            // Genişletilmiş anahtar kelimeler
            const keywords = ['TOPLAM', 'TOTAL', 'GENEL', 'KDV', 'ODENECEK', 'TUTAR', 'FIYAT', 'NAKIT', 'G.TOP', 'TOP*', 'TUTARI', 'TOPLAMA', 'AMOUNT'];

            // Fiyat ayıklama fonksiyonu - Daha esnek
            const findPriceInStr = (str: string) => {
                // Yıldızları, TL simgelerini ve boşlukları temizle, virgülü noktaya çevir
                const clean = str.replace(/[*TL ]/g, '').replace(',', '.');
                // Sayı+Nokta+2 hane (Örn: 125.50 veya 1.250.50 gibi durumlar için son kısmı yakala)
                const matches = clean.match(/(\d+[.,]\d{2})|(\d+\d{2})/);
                if (matches) {
                    let valStr = matches[0].replace(',', '.');
                    // Eğer nokta yoksa son 2 haneyi kuruş kabul et (OCR bazen noktayı kaçırır)
                    if (!valStr.includes('.')) {
                        valStr = valStr.slice(0, -2) + '.' + valStr.slice(-2);
                    }
                    const val = parseFloat(valStr);
                    return isNaN(val) ? null : val;
                }
                return null;
            };

            // 1. Strateji: Anahtar kelime içeren satırları sondan başa tara (Genelde toplam alttadır)
            for (let i = lines.length - 1; i >= 0; i--) {
                const isTotalLine = keywords.some(k => lines[i].includes(k));
                if (isTotalLine) {
                    const price = findPriceInStr(lines[i]);
                    if (price && price > 0) {
                        foundAmount = price;
                        break;
                    }
                    // Bazen tutar bir alt satırda olur
                    if (i + 1 < lines.length) {
                        const subPrice = findPriceInStr(lines[i + 1]);
                        if (subPrice && subPrice > 0) {
                            foundAmount = subPrice;
                            break;
                        }
                    }
                }
            }

            // 2. Strateji (Fallback): Hiçbir şey bulunamazsa tüm metindeki en büyük sayıyı al (Makul sınırlar: 1 - 50.000 TL)
            if (foundAmount === null) {
                const allWords = rawText.replace(',', '.').match(/(\d+\.\d{2})/g);
                if (allWords) {
                    const vals = allWords.map(v => parseFloat(v)).filter(v => v > 0 && v < 50000);
                    if (vals.length > 0) {
                        foundAmount = Math.max(...vals);
                    }
                }
            }

            if (foundAmount !== null && foundAmount > 0) {
                setExpenseForm(prev => ({ ...prev, amount: foundAmount!.toFixed(2) }));
                stopScanner();
                // Tutarın girildiğine dair küçük bir sesli geri bildirim veya görsel efekt eklenebilir
            } else {
                alert('Tutar tam olarak okunamadı. Lütfen fişi düz, net ve gölgesiz bir şekilde tutarak tekrar deneyin.');
            }
        } catch (e) {
            console.error('OCR İşleme Hatası', e);
            alert('Fiş okuma sırasında bir hata oluştu.');
        } finally {
            setOcrLoading(false);
        }
    };

    const handleExpenseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/expenses', {
                amount: Number(expenseForm.amount),
                description: expenseForm.description,
                date: expenseForm.date || getLocalDateString()
            });
            if (res.data.success) {
                alert('Masraf başarıyla eklendi');
                setShowExpenseModal(false);
                setExpenseForm({ amount: '', description: '', date: getLocalDateString() });
                if (user?.role === 'staff' || user?.role === 'company_admin') {
                    fetchEmployeeStats(selectedPeriod);
                }
            }
        } catch (error) {
            console.error('Expense add error:', error);
            alert('Masraf eklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                await handlePhotoUpload(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePhotoUpload = async (photo: string) => {
        const currentUser = user;
        if (!currentUser) return;
        
        setLoading(true);
        try {
            // Everyone (Staff & Admin) should update their own personal photo
            // Company logo update is managed separately in Company Panel
            const res = await api.patch(`/companies/${currentUser.company_id}/staff/${currentUser.id}/photo`, { photo });
            if (res.data.success) {
                alert('Profil fotoğrafınız başarıyla güncellendi');
                window.location.reload();
            }
        } catch (err: any) {
            alert(err.response?.data?.error || 'Fotoğraf yüklenemedi');
        } finally {
            setLoading(false);
        }
    };


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
                            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20">
                                <img src="/app-icon.png" alt="Logo" className="w-full h-full object-cover" />
                            </div>
                            <h1 className="text-lg font-black heading-serif text-gray-900 tracking-tight">Salon Cebinde</h1>
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
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                    <div
                        onClick={handlePhotoClick}
                        className="cursor-pointer group relative"
                    >
                        {(user?.photo || companyInfo?.photo) ? (
                            <img
                                src={user?.photo || companyInfo?.photo}
                                alt={user?.first_name || companyInfo?.name}
                                className="w-32 h-32 rounded-[2.5rem] object-cover shadow-2xl border-4 border-white transition-all group-hover:scale-105 active:scale-95 text-xs text-transparent"
                                onError={(e) => {
                                    // Fallback if image fails to load
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        ) : (
                            <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-black text-4xl shadow-2xl border-4 border-white transition-all group-hover:scale-105 active:scale-95">
                                {(user?.first_name?.[0] || companyInfo?.name?.[0] || 'K')}{(user?.last_name?.[0] || companyInfo?.name?.[1] || 'U')}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {
                    isLicenseExpired && (
                        <div className="mb-10 bg-rose-50 border-2 border-rose-100 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-rose-200/20">
                            <div className="w-16 h-16 bg-rose-500 rounded-3xl flex items-center justify-center text-3xl shadow-lg shadow-rose-500/20 flex-shrink-0 animate-bounce">
                                💳
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-xl font-black text-rose-900 uppercase tracking-tighter">İşletme Lisans Süresi Doldu</h3>
                                <p className="text-sm text-rose-600 font-bold mt-1 uppercase tracking-widest opacity-70">Sistemi kullanmaya devam etmek için işletme yöneticisinin ödeme yapması gerekmektedir.</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={handleRenewLicense}
                                    disabled={renewingLicense}
                                    className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all disabled:opacity-50"
                                >
                                    {renewingLicense ? 'Bekleyiniz...' : 'Lisansı Yenile'}
                                </button>
                                <div className="px-6 py-2 bg-rose-100 text-rose-600 rounded-xl font-black text-[9px] uppercase tracking-widest text-center">
                                    ERİŞİM KISITLANDI
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    !isLicenseExpired && companyInfo?.license_end_date && (() => {
                        const diff = new Date(companyInfo.license_end_date).getTime() - new Date().getTime();
                        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                        if (days <= 15) {
                            return (
                                <div className="mb-10 bg-amber-50 border-2 border-amber-100 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-amber-200/20">
                                    <div className="w-16 h-16 bg-amber-500 rounded-3xl flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20 flex-shrink-0">
                                        ⚠️
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h3 className="text-xl font-black text-amber-900 uppercase tracking-tighter">Lisans Süresi Yaklaşıyor</h3>
                                        <p className="text-sm text-amber-600 font-bold mt-1 uppercase tracking-widest opacity-70">İşletme lisansının bitmesine {days} gün kaldı. Lütfen yöneticinize bildirin.</p>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()
                }

                {/* Admin Quick Search & Actions (Super Admin Only) */}
                {
                    user?.role === 'super_admin' && (
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
                                            Sisteme yeni salonlar tanımlayabilir ve her bir firmanın Board (Kurulum) kodunu buradan hızlıca yönetebilirsiniz.
                                        </p>
                                        <div className="flex flex-wrap gap-4 pt-2">
                                            <Link to="/companies/new" className="bg-indigo-500 hover:bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-indigo-500/20 active:scale-95 flex items-center gap-3">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                                YENİ FİRMA TANIMLA
                                            </Link>
                                            <Link to="/companies" className="bg-white/10 hover:bg-white/20 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all border border-white/10 active:scale-95">
                                                TÜMÜNÜ YÖNET
                                            </Link>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                                        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/5 flex-1 lg:min-w-[150px] text-center group/item hover:bg-white/10 transition-colors">
                                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 opacity-60">TOPLAM FİRMA</p>
                                            <p className="text-5xl font-black text-white tracking-tighter group-hover/item:scale-110 transition-transform duration-500">{stats.companyCount || allCompanies.length}</p>
                                        </div>
                                        <Link to="/main-management" className="bg-emerald-500/5 backdrop-blur-xl p-6 rounded-[2.5rem] border border-emerald-500/10 flex-1 lg:min-w-[150px] text-center group/item hover:bg-emerald-500/20 transition-all">
                                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2 opacity-60">ÜST YÖNETİM</p>
                                            <div className="flex items-center justify-center gap-2">
                                                <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944" /></svg>
                                                <span className="text-lg font-black text-white uppercase">YÖNET</span>
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {/* FIRMA ERİŞİM ANAHTARLARI TABLOSU (Board Key Listesi) */}
                            <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-200/50 border border-slate-100 mb-12">
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Firma Giriş Anahtarları</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Board Key ve Yönetici Kodları</p>
                                    </div>
                                    <div className="bg-indigo-50 px-6 py-2 rounded-2xl">
                                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Board Sayısı: {allCompanies.length}</span>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b-2 border-slate-50">
                                                <th className="pb-5 pl-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Firma Adı / Şehir</th>
                                                <th className="pb-5 text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em]">Board Key</th>
                                                <th className="pb-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Yönetici Key</th>
                                                <th className="pb-5 text-right pr-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Durum</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {allCompanies.map((c) => (
                                                <tr key={c.id} className="hover:bg-slate-50/80 transition-all duration-300 group">
                                                    <td className="py-6 pl-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                                {c.name?.[0].toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-900 uppercase tracking-tight">{c.name}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{c.city || 'Belirsiz'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-6">
                                                        <span className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-black text-xs tracking-widest border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                            {c.board_key || 'KOD YOK'}
                                                        </span>
                                                    </td>
                                                    <td className="py-6">
                                                        <span className="text-slate-400 font-mono font-bold text-xs">
                                                            {c.admin_key || 'KOD YOK'}
                                                        </span>
                                                    </td>
                                                    <td className="py-6 text-right pr-4">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Aktif</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
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
                    )
                }

                {/* Raporlama Bölümü - Sadece çalışanlar için (Modal) */}
                {
                    showReports && (user?.role === 'staff' || user?.role === 'company_admin') && (
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

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4">
                                        <div className="bg-indigo-50/20 p-4 rounded-[2rem] border border-indigo-100/50 flex flex-col items-center text-center">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm mb-3">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                                            </div>
                                            <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Randevu</p>
                                            <p className={`text-2xl font-black text-indigo-900 ${statsLoading ? 'animate-pulse' : ''}`}>{employeeStats.total_appointments}</p>
                                        </div>

                                        <div className="bg-amber-50/20 p-4 rounded-[2rem] border border-amber-100/50 flex flex-col items-center text-center">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm mb-3">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                            </div>
                                            <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest mb-1">Potansiyel Kazanç</p>
                                            <p className={`text-2xl font-black text-amber-900 ${statsLoading ? 'animate-pulse' : ''}`}>₺{employeeStats.total_booked_value.toLocaleString()}</p>
                                        </div>

                                        <div className="bg-emerald-50/20 p-4 rounded-[2rem] border border-emerald-100/50 flex flex-col items-center text-center">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm mb-3">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                            <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Tahsil Edilen</p>
                                            <p className={`text-2xl font-black text-emerald-900 ${statsLoading ? 'animate-pulse' : ''}`}>₺{employeeStats.actual_collected.toLocaleString()}</p>
                                        </div>

                                        <div className="bg-rose-50/20 p-4 rounded-[2rem] border border-rose-100/50 flex flex-col items-center text-center">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-600 shadow-sm mb-3">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                                            </div>
                                            <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest mb-1">Gider/Masraf</p>
                                            <p className={`text-2xl font-black text-rose-900 ${statsLoading ? 'animate-pulse' : ''}`}>₺{employeeStats.total_expenses.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* 1. Randevular */}
                    {(user?.role === 'company_admin' || user?.role === 'staff') && (
                        <Link
                            to="/appointments"
                            className="card group hover:scale-[1.02] transition-all duration-300 border-pink-100"
                        >
                            <div className="flex items-center gap-5">
                                <div className="bg-pink-50 p-4 rounded-2xl group-hover:bg-pink-600 group-hover:text-white transition-colors duration-300">
                                    <Calendar className="w-8 h-8 text-pink-600 group-hover:text-white" />
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
                            disabled={true}
                            onClick={() => !isLicenseExpired && startVoiceCommand()}
                            className="w-full card group border-indigo-100 text-left relative overflow-hidden opacity-50 cursor-not-allowed"
                        >
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600">
                                    <Mic className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Sesli Randevu</h3>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Geçici olarak devre dışı.</p>
                                </div>
                            </div>
                        </button>
                    )}

                    {/* 3. Envanter & Stok Kestirmesi - SADECE FİRMA ADMİNİ */}
                    {user?.role === 'company_admin' && (
                        <Link
                            to="/inventory"
                            className="card group hover:scale-[1.02] transition-all duration-300 border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30"
                        >
                            <div className="flex items-center gap-5">
                                <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform duration-300">
                                    <Package className="w-8 h-8" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">Envanter & Stok</h3>
                                        {stats.lowStockCount > 0 && (
                                            <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
                                                {stats.lowStockCount} KRİTİK
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest leading-relaxed opacity-70">Malzeme takibi ve personel zimmetleri.</p>
                                </div>
                            </div>
                        </Link>
                    )}

                    {/* 4. Çalışan Raporu */}
                    {(user?.role === 'staff' || user?.role === 'company_admin') && (
                        <button
                            disabled={isLicenseExpired}
                            onClick={() => !isLicenseExpired && setShowReports(true)}
                            className={`card group border-amber-100 text-left ${isLicenseExpired ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] transition-all duration-300'}`}
                        >
                            <div className="flex items-center gap-5">
                                <div className="bg-amber-50 p-4 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                                    <TrendingUp className="w-8 h-8 text-amber-600 group-hover:text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Çalışan Raporu</h3>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Kazanç ve randevu istatistiklerini gör.</p>
                                </div>
                            </div>
                        </button>
                    )}

                    {/* 5. Masraf Girme */}
                    {(user?.role === 'company_admin' || user?.role === 'staff') && (
                        <button
                            disabled={isLicenseExpired}
                            onClick={() => {
                                if (isLicenseExpired) return;
                                setExpenseForm(prev => ({ ...prev, date: getLocalDateString() }));
                                setShowExpenseModal(true);
                            }}
                            className={`card group border-rose-100 text-left ${isLicenseExpired ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] transition-all duration-300'}`}
                        >
                            <div className="flex items-center gap-5">
                                <div className="bg-rose-50 p-4 rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300">
                                    <AlertTriangle className="w-8 h-8 text-rose-600 group-hover:text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Masraf Gir</h3>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Yeni bir gider veya masraf kalemi ekle.</p>
                                </div>
                            </div>
                        </button>
                    )}

                    {/* 6. Müşterilerim */}
                    {(user?.role === 'staff' || user?.role === 'company_admin') && (
                        <button
                            onClick={openCustomersModal}
                            className="card group hover:scale-[1.02] transition-all duration-300 border-indigo-100 text-left"
                        >
                            <div className="flex items-center gap-5">
                                <div className="bg-indigo-50 p-4 rounded-2xl group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                                    <Users className="w-8 h-8 text-indigo-600 group-hover:text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Müşterilerim</h3>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Müşteri işlem geçmişini sorgula ve detayları gör.</p>
                                </div>
                            </div>
                        </button>
                    )}

                    {/* 7. WhatsApp Davet */}
                    {(user?.role === 'staff' || user?.role === 'company_admin') && (
                        <a
                            href={`https://wa.me/?text=${encodeURIComponent(`Merhaba! 👋\n\nSize özel randevu sayfamdan kolayca randevu oluşturabilirsiniz:\n${window.location.origin}/ekuafor/book/${user.company_id || 1}?staff=${user.id}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="card group hover:scale-[1.02] transition-all duration-300 border-green-100"
                        >
                            <div className="flex items-center gap-5">
                                <div className="bg-green-50 p-4 rounded-2xl group-hover:bg-green-500 group-hover:text-white transition-colors duration-300">
                                    <Plus className="w-8 h-8 text-green-600 group-hover:text-white" />
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

                    {/* Çalışan İstatistikleri - Kaldırıldı */}

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
            </main >

            {/* Expense Modal */}
            {
                showExpenseModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !loading && setShowExpenseModal(false)}></div>
                        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-rose-50">
                                <div>
                                    <h3 className="text-xl font-black text-rose-900 uppercase tracking-tight">Yeni Masraf Ekle</h3>
                                    <p className="text-[10px] font-bold text-rose-600 opacity-70 uppercase tracking-widest mt-1">Harcamalarınızı kayıt altına alın</p>
                                </div>
                                <button onClick={() => setShowExpenseModal(false)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-rose-500 shadow-sm hover:scale-110 transition-transform">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {isScanningReceipt ? (
                                <div className="p-6">
                                    <div className="relative rounded-3xl overflow-hidden bg-black aspect-[3/4] shadow-inner mb-4">
                                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                                        <canvas ref={canvasRef} className="hidden" />

                                        {ocrLoading && (
                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
                                                <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                                <p className="text-white font-black text-xs uppercase tracking-widest">Fiş Okunuyor...</p>
                                            </div>
                                        )}

                                        <div className="absolute inset-x-8 inset-y-8 border-2 border-white/30 rounded-2xl pointer-events-none"></div>
                                        <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
                                            <p className="text-[10px] text-white/80 font-black uppercase tracking-[0.2em] px-4 py-1.5 bg-black/50 rounded-full inline-block backdrop-blur-md">Toplam Tutarı Hizalayın</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button type="button" onClick={stopScanner} disabled={ocrLoading} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">İptal</button>
                                        <button type="button" onClick={captureReceipt} disabled={ocrLoading} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/30 active:scale-95 transition-all">Fotoğraf Çek</button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleExpenseSubmit} className="p-8 space-y-5">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Tarih</label>
                                        <input
                                            type="date"
                                            required
                                            value={expenseForm.date}
                                            onChange={e => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                                            className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between mb-2 pl-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Tutar (₺)</label>
                                        <button
                                            type="button"
                                            onClick={startScanner}
                                            className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-rose-600 text-white px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md shadow-rose-500/30 hover:shadow-lg hover:shadow-rose-500/40 hover:scale-105 active:scale-95 transition-all duration-200"
                                        >
                                            {/* Scan / receipt icon */}
                                            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h8M4 18h5" />
                                                <rect x="14" y="12" width="7" height="9" rx="1.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15h3M16 17.5h1.5" />
                                            </svg>
                                            Fiş Tara
                                        </button>
                                    </div>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={expenseForm.amount}
                                        onChange={e => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-slate-900 font-black focus:ring-2 focus:ring-rose-500 outline-none text-2xl"
                                    />
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Açıklama</label>
                                        <textarea
                                            required
                                            value={expenseForm.description}
                                            onChange={e => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Masraf detayı..."
                                            rows={3}
                                            className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-4 mt-2 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {loading ? 'Kaydediliyor...' : 'Masrafı Kaydet'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                )
            }

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

            {/* Payment Modal removed */}
            {/* Customers History Modal */}
            {customersModal.open && (
                <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 animate-in slide-in-from-bottom duration-300">
                    <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 shadow-sm z-10"
                            style={{ paddingTop: 'env(safe-area-inset-top, 1rem)' }}>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={closeCustomersModal}
                                className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-2xl text-slate-400 active:scale-90"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <h3 className="font-black text-slate-900 uppercase tracking-tight">Müşterilerim</h3>
                        </div>
                    </header>

                    <div className="p-6 bg-white border-b border-slate-100">
                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="İsim veya telefon numarası ara..."
                                value={customersModal.search}
                                onChange={handleCustomerSearch}
                                className="w-full bg-slate-50 border-none rounded-2xl px-12 py-4 text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            {customersModal.loading && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 pb-12">
                        {!customersModal.search ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                <div className="text-4xl mb-4">🔍</div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Arama yapmak için isim veya<br/>telefon numarası giriniz.</p>
                            </div>
                        ) : customersModal.history.length === 0 && !customersModal.loading ? (
                            <div className="text-center py-20 opacity-40">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sonuç bulunamadı.</p>
                            </div>
                        ) : (
                            customersModal.history.map((h: any) => (
                                <div key={h.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">{h.customer_name}</h4>
                                            <span className="text-[10px] font-bold text-slate-400">{h.customer_phone}</span>
                                        </div>
                                        <span className="text-[9px] font-black px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full uppercase tracking-widest">
                                            {new Date(h.appointment_date).toLocaleDateString('tr-TR')}
                                        </span>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[9px] font-black text-slate-400 uppercase">Hizmet</span>
                                            <span className="text-[11px] font-black text-slate-700">{h.service_name}</span>
                                        </div>
                                        <div className="border-t border-slate-200/50 pt-2">
                                            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">İşlem Notu</span>
                                            <p className="text-xs text-slate-600 font-medium leading-relaxed italic">
                                                {h.technical_notes || 'Not girilmemiş.'}
                                            </p>
                                        </div>
                                        {h.used_materials && (
                                            <div className="border-t border-slate-200/50 pt-2 mt-2">
                                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Kullanılan Malzemeler</span>
                                                <p className="text-xs text-slate-600 font-medium leading-relaxed italic">
                                                    {h.used_materials}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
