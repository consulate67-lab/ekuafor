import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Company, Service } from '../types';
import { parseVoiceCommand } from '../lib/aiParser';
import { Device } from '@capacitor/device';
import { useAuthStore } from '../store/authStore';
import { 
    Users, 
    TrendingUp,
    AlertTriangle,
    Calendar,
    Mic,
    Plus
} from 'lucide-react';
import api from '../lib/api';
import Tesseract from 'tesseract.js';

export default function Dashboard() {
    const { user, logout } = useAuthStore();
    const [employeeStats, setEmployeeStats] = useState({
        total_appointments: 0,
        total_booked_value: 0,
        actual_collected: 0,
        total_expenses: 0
    });
    const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year'>('today');
    const [statsLoading, setStatsLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
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
    const [superAdminStats, setSuperAdminStats] = useState<any>(null);
    const [showExpiringModal, setShowExpiringModal] = useState(false);
    const [showCompaniesModal, setShowCompaniesModal] = useState(false);
    const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
    const [companiesModalTitle, setCompaniesModalTitle] = useState('');
    const [modalSearchTerm, setModalSearchTerm] = useState('');
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
                    setStatsLoading(true);
                    setFetchError(null);
                    const [compRes, reportRes] = await Promise.all([
                        api.get('/companies', { params: { nocache: 'true' } }),
                        api.get('/reports/super-admin', { params: { local_date: getLocalDateString() } })
                    ]);
                    setAllCompanies(compRes.data.data || []);
                    setSuperAdminStats(reportRes.data.data);
                } catch (e: any) {
                    console.error('Stats fetch error:', e);
                    setFetchError(e.response?.data?.error || e.message || 'Hata oluştu');
                } finally {
                    setStatsLoading(false);
                }
            } else if (user?.role === 'company_admin' || user?.role === 'staff') {
                try {
                    let services: any[] = [];
                    try {
                        const servicesRes = await api.get('/services');
                        services = servicesRes.data?.data || [];
                    } catch (e) {
                        console.warn('Services fetch failed', e);
                    }
                    setServices(services);
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
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const v = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            const result = v > 150 ? 255 : 0;
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
            const lines = rawText.split('\n').map(l => l.trim().toUpperCase()).filter(l => l.length > 0);
            let foundAmount: number | null = null;
            const keywords = ['TOPLAM', 'TOTAL', 'GENEL', 'KDV', 'ODENECEK', 'TUTAR', 'FIYAT', 'NAKIT', 'G.TOP', 'TOP*', 'TUTARI', 'TOPLAMA', 'AMOUNT'];
            const findPriceInStr = (str: string) => {
                const clean = str.replace(/[*TL ]/g, '').replace(',', '.');
                const matches = clean.match(/(\d+[.,]\d{2})|(\d+\d{2})/);
                if (matches) {
                    let valStr = matches[0].replace(',', '.');
                    if (!valStr.includes('.')) {
                        valStr = valStr.slice(0, -2) + '.' + valStr.slice(-2);
                    }
                    const val = parseFloat(valStr);
                    return isNaN(val) ? null : val;
                }
                return null;
            };
            for (let i = lines.length - 1; i >= 0; i--) {
                const isTotalLine = keywords.some(k => lines[i].includes(k));
                if (isTotalLine) {
                    const price = findPriceInStr(lines[i]);
                    if (price && price > 0) {
                        foundAmount = price;
                        break;
                    }
                    if (i + 1 < lines.length) {
                        const subPrice = findPriceInStr(lines[i + 1]);
                        if (subPrice && subPrice > 0) {
                            foundAmount = subPrice;
                            break;
                        }
                    }
                }
            }
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

    const handlePhotoClick = () => fileInputRef.current?.click();

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
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const trVoice = voices.find(v => v.lang.includes('tr'));
        if (trVoice) utterance.voice = trVoice;
        window.speechSynthesis.speak(utterance);
    };

    useEffect(() => {
        if (window.speechSynthesis) window.speechSynthesis.getVoices();
    }, []);

    const startVoiceCommand = () => {
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
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
            } catch (err) {
                alert('Mikrofon izni verilmedi.');
                setVoiceStep('IDLE');
                return;
            }
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
        recognition.onerror = () => setVoiceStep('IDLE');
        recognition.start();
    };

    const handleGuidedStep = async (step: typeof voiceStep, transcript: string) => {
        const rules = localStorage.getItem(`ai_rules_${user?.company_id}`) || '';
        if (step === 'NAME') {
            const cleanName = transcript.replace(/(ismini|adi|olan|musteri|isim)/gi, '').trim();
            const name = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
            setGuidedData((prev: any) => ({ ...prev, customerName: name }));
            setVoiceStep('DATE');
            setTimeout(() => {
                speak('Randevu tarihi nedir?');
                listenNextStep('DATE');
            }, 600);
        } else if (step === 'DATE') {
            const parsed = parseVoiceCommand(transcript, [], rules);
            setGuidedData((prev: any) => ({ ...prev, date: parsed.date }));
            setVoiceStep('TIME');
            setTimeout(() => {
                speak('Randevu saati kaçta olsun?');
                listenNextStep('TIME');
            }, 600);
        } else if (step === 'TIME') {
            const parsed = parseVoiceCommand(transcript, [], rules);
            setGuidedData((prev: any) => ({ ...prev, startTime: parsed.startTime }));
            setVoiceStep('SERVICE');
            setTimeout(() => {
                speak('Yapılacak işlem nedir?');
                listenNextStep('SERVICE');
            }, 600);
        } else if (step === 'SERVICE') {
            const parsed = parseVoiceCommand(transcript, services, rules);
            const service = services.find(s => s.id === parsed.serviceId);
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
                if (employees.length > 0) staffId = employees[0].user_id || employees[0].id;
            }
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
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    <div onClick={handlePhotoClick} className="cursor-pointer group relative">
                        {(user?.photo || companyInfo?.photo) ? (
                            <img
                                src={user?.photo || companyInfo?.photo}
                                alt={user?.first_name || companyInfo?.name}
                                className="w-32 h-32 rounded-[2.5rem] object-cover shadow-2xl border-4 border-white transition-all group-hover:scale-105 active:scale-95 text-xs text-transparent"
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

                {isLicenseExpired && (
                    <div className="mb-10 bg-rose-50 border-2 border-rose-100 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-rose-200/20">
                        <div className="w-16 h-16 bg-rose-500 rounded-3xl flex items-center justify-center text-3xl shadow-lg shadow-rose-500/20 flex-shrink-0 animate-bounce">💳</div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-xl font-black text-rose-900 uppercase tracking-tighter">İşletme Lisans Süresi Doldu</h3>
                            <p className="text-sm text-rose-600 font-bold mt-1 uppercase tracking-widest opacity-70">Sistemi kullanmaya devam etmek için işletme yöneticisinin ödeme yapması gerekmektedir.</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button onClick={handleRenewLicense} disabled={renewingLicense} className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all disabled:opacity-50">
                                {renewingLicense ? 'Bekleyiniz...' : 'Lisansı Yenile'}
                            </button>
                            <div className="px-6 py-2 bg-rose-100 text-rose-600 rounded-xl font-black text-[9px] uppercase tracking-widest text-center">ERİŞİM KISITLANDI</div>
                        </div>
                    </div>
                )}

                {!isLicenseExpired && companyInfo?.license_end_date && (() => {
                    const diff = new Date(companyInfo.license_end_date).getTime() - new Date().getTime();
                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    if (days <= 15) {
                        return (
                            <div className="mb-10 bg-amber-50 border-2 border-amber-100 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-amber-200/20">
                                <div className="w-16 h-16 bg-amber-500 rounded-3xl flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20 flex-shrink-0">⚠️</div>
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-xl font-black text-amber-900 uppercase tracking-tighter">Lisans Süresi Yaklaşıyor</h3>
                                    <p className="text-sm text-amber-600 font-bold mt-1 uppercase tracking-widest opacity-70">İşletme lisansının bitmesine {days} gün kaldı. Lütfen yöneticinize bildirin.</p>
                                </div>
                            </div>
                        );
                    }
                    return null;
                })()}

                {fetchError && (
                    <div className="mb-10 bg-red-50 border-2 border-red-100 p-6 rounded-[2.5rem] flex items-center gap-6 shadow-xl shadow-red-200/20 animate-in fade-in slide-in-from-top-4">
                        <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-red-900 uppercase tracking-tight">Veri Çekme Hatası</h3>
                            <p className="text-sm text-red-600 font-bold opacity-70">{fetchError}</p>
                        </div>
                        <button 
                            onClick={() => window.location.reload()}
                            className="ml-auto px-6 py-3 bg-white text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:shadow-md transition-all active:scale-95"
                        >
                            Yeniden Dene
                        </button>
                    </div>
                )}

                {user?.role === 'super_admin' && (
                    <>
                        <div className="card bg-slate-900 border-none shadow-2xl mb-12 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>
                            <div className="relative z-10 flex flex-col lg:flex-row gap-10 items-center justify-between">
                                <div className="space-y-6 max-w-xl">
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">PATRON YÖNETİM PANELİ</span>
                                        </div>
                                        <h1 className="text-4xl font-black text-white leading-tight">Sistem Analiz <span className="text-indigo-400">Merkezi</span></h1>
                                    </div>
                                    <p className="text-slate-400 text-sm font-medium leading-relaxed">Hoşgeldiniz Patron. Bugünün verileri, sistem büyümesi ve lisans takibi için aşağıdaki analizleri inceleyebilirsiniz.</p>
                                    <div className="flex flex-wrap gap-4 pt-2">
                                        <Link to="/companies/new" className="bg-indigo-500 hover:bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-indigo-500/20 active:scale-95 flex items-center gap-3">
                                            <Plus className="w-5 h-5" /> YENİ FİRMA TANIMLA
                                        </Link>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                                    <div 
                                        onClick={() => {
                                            setFilteredCompanies(allCompanies);
                                            setCompaniesModalTitle('Tüm Kayıtlı Firmalar');
                                            setModalSearchTerm('');
                                            setShowCompaniesModal(true);
                                        }}
                                        className="bg-white/5 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/5 flex-1 lg:min-w-[150px] text-center cursor-pointer hover:bg-white/10 transition-colors"
                                    >
                                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 opacity-60">TOPLAM FİRMA</p>
                                        <p className="text-5xl font-black text-white tracking-tighter">{allCompanies.length}</p>
                                    </div>
                                    <div className="bg-emerald-500/10 backdrop-blur-xl p-6 rounded-[2.5rem] border border-emerald-500/10 flex-1 lg:min-w-[150px] text-center">
                                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2 opacity-60">AKTİF YÖNETİCİ</p>
                                        <p className="text-5xl font-black text-emerald-400 tracking-tighter">{superAdminStats?.summary?.total_company_admins || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                            <div 
                                onClick={() => {
                                    const today = getLocalDateString();
                                    const filtered = allCompanies.filter((c: any) => c.created_at?.startsWith(today));
                                    setFilteredCompanies(filtered);
                                    setCompaniesModalTitle('Bugün Katılan Firmalar');
                                    setModalSearchTerm('');
                                    setShowCompaniesModal(true);
                                }}
                                className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 group hover:bg-indigo-600 transition-all duration-500 cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-white/20 transition-colors">🏢</div>
                                    <TrendingUp className="text-indigo-500 group-hover:text-white" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-white/60">Bugün Kayıt Olan</p>
                                <h3 className="text-3xl font-black text-slate-900 mt-1 group-hover:text-white">{superAdminStats?.summary?.new_companies_today || 0} <span className="text-sm">Firma</span></h3>
                            </div>
                            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 group hover:bg-emerald-600 transition-all duration-500">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-white/20 transition-colors">📅</div>
                                    <Calendar className="text-emerald-500 group-hover:text-white" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-white/60">Bugün Oluşturulan</p>
                                <h3 className="text-3xl font-black text-slate-900 mt-1 group-hover:text-white">{superAdminStats?.summary?.new_appointments_today || 0} <span className="text-sm">Randevu</span></h3>
                            </div>
                            <div onClick={() => setShowExpiringModal(true)} className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 group hover:bg-amber-600 transition-all duration-500 cursor-pointer">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-white/20 transition-colors">⏳</div>
                                    <AlertTriangle className="text-amber-500 group-hover:text-white" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-white/60">Lisansı Bitecek</p>
                                <h3 className="text-3xl font-black text-slate-900 mt-1 group-hover:text-white">{superAdminStats?.expiring_companies?.length || 0} <span className="text-sm">Firma</span></h3>
                            </div>
                            <div 
                                onClick={() => {
                                    setFilteredCompanies(allCompanies);
                                    setCompaniesModalTitle('Şehir Bazlı Dağılım');
                                    setModalSearchTerm('');
                                    setShowCompaniesModal(true);
                                }}
                                className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 group hover:bg-slate-900 transition-all duration-500 cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-white/20 transition-colors">📍</div>
                                    <Users className="text-slate-500 group-hover:text-white" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-white/60">Firma Yaygınlığı</p>
                                <h3 className="text-3xl font-black text-slate-900 mt-1 group-hover:text-white">{Array.from(new Set(allCompanies.map(c => c.city))).length} <span className="text-sm">Şehir</span></h3>
                            </div>
                        </div>

                        <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100 mb-12">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-8">Son 7 Günlük Aktivite Analizi</h3>
                            <div className="grid grid-cols-7 gap-4">
                                {superAdminStats?.trends?.map((t: any) => (
                                    <div key={t.date} className="flex flex-col items-center">
                                        <div className="w-full flex flex-col justify-end items-center gap-1 h-32 bg-slate-50 rounded-2xl p-2 relative overflow-hidden group">
                                            <div className="w-full bg-indigo-500 rounded-lg transition-all duration-500 group-hover:bg-indigo-600" style={{ height: `${Math.min(100, (t.company_count / 10) * 100)}%` }}></div>
                                            <div className="w-full bg-emerald-400 rounded-lg transition-all duration-500 group-hover:bg-emerald-500" style={{ height: `${Math.min(100, (t.appointment_count / 50) * 100)}%` }}></div>
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase mt-4 tracking-tighter">{t.date}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {showExpiringModal && (
                            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowExpiringModal(false)}></div>
                                <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95">
                                    <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-amber-50/50">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Lisans Süresi Azalanlar</h3>
                                            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mt-1">Önümüzdeki 30 gün içinde bitecek firmalar</p>
                                        </div>
                                        <button onClick={() => setShowExpiringModal(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-colors">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                    <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                        {superAdminStats?.expiring_companies?.length > 0 ? (
                                            <div className="space-y-4">
                                                {superAdminStats.expiring_companies.map((c: any) => (
                                                    <div key={c.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-amber-200 transition-all group">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm group-hover:text-amber-500 transition-colors">🏢</div>
                                                            <div>
                                                                <p className="font-black text-slate-900 uppercase">{c.name}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(c.license_end_date).toLocaleDateString()} tarihinde biter</p>
                                                            </div>
                                                        </div>
                                                        <div className="px-5 py-2 bg-amber-100 text-amber-700 rounded-2xl font-black text-[10px] uppercase tracking-widest">{c.days_left} GÜN KALDI</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-10 opacity-40">
                                                <p className="text-5xl mb-4">✅</p>
                                                <p className="font-black text-slate-900 uppercase">Herhangi bir aciliyet bulunmuyor</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {showCompaniesModal && (
                            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowCompaniesModal(false)}></div>
                                <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95">
                                    <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{companiesModalTitle}</h3>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Sisteme kayıtlı işletmelerin detaylı listesi</p>
                                        </div>
                                        <button onClick={() => setShowCompaniesModal(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-colors">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                    <div className="px-10 pb-6">
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                placeholder="Firma ismi veya şehir ara..." 
                                                value={modalSearchTerm}
                                                onChange={(e) => setModalSearchTerm(e.target.value)}
                                                className="w-full bg-slate-50 border-none rounded-2xl px-12 py-4 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            />
                                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        </div>
                                    </div>
                                    <div className="p-8 max-h-[50vh] overflow-y-auto custom-scrollbar">
                                        <div className="space-y-4">
                                            {filteredCompanies
                                                .filter(c => 
                                                    c.name?.toLowerCase().includes(modalSearchTerm.toLowerCase()) || 
                                                    c.city?.toLowerCase().includes(modalSearchTerm.toLowerCase())
                                                )
                                                .length > 0 ? filteredCompanies
                                                    .filter(c => 
                                                        c.name?.toLowerCase().includes(modalSearchTerm.toLowerCase()) || 
                                                        c.city?.toLowerCase().includes(modalSearchTerm.toLowerCase())
                                                    )
                                                    .map((c: any) => (
                                                <Link key={c.id} to={`/companies/${c.id}`} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-200 transition-all group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm group-hover:text-indigo-500 transition-colors">🏢</div>
                                                        <div>
                                                            <p className="font-black text-slate-900 uppercase">{c.name}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.city || 'Şehir Belirtilmemiş'} | {c.address?.slice(0, 30)}...</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                         <p className="text-[10px] font-black text-indigo-600 uppercase mb-1">{c.subscription_type || 'ÜCRETSİZ'}</p>
                                                         <p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(c.created_at).toLocaleDateString()} KAYIT</p>
                                                    </div>
                                                </Link>
                                            )) : (
                                                <div className="text-center py-10 opacity-40">
                                                    <p className="text-5xl mb-4">🔍</p>
                                                    <p className="font-black text-slate-900 uppercase">Filtreye uygun firma bulunamadı</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

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
                                        <button key={p} onClick={() => setSelectedPeriod(p)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${selectedPeriod === p ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-400 hover:text-slate-600'}`}>
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
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {(user?.role === 'company_admin' || user?.role === 'staff') && (
                        <>
                            <Link to="/appointments" className="card group hover:scale-[1.02] transition-all duration-300 border-pink-100">
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
                            <button disabled={true} onClick={() => !isLicenseExpired && startVoiceCommand()} className="w-full card group border-indigo-100 text-left relative overflow-hidden opacity-50 cursor-not-allowed">
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600"><Mic className="w-8 h-8" /></div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-1">Sesli Randevu</h3>
                                        <p className="text-sm text-gray-500 font-medium leading-relaxed">Geçici olarak devre dışı.</p>
                                    </div>
                                </div>
                            </button>
                            <button disabled={isLicenseExpired} onClick={() => !isLicenseExpired && setShowReports(true)} className={`card group border-amber-100 text-left ${isLicenseExpired ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] transition-all duration-300'}`}>
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
                            <button disabled={isLicenseExpired} onClick={() => { if (!isLicenseExpired) { setExpenseForm(prev => ({ ...prev, date: getLocalDateString() })); setShowExpenseModal(true); } }} className={`card group border-rose-100 text-left ${isLicenseExpired ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] transition-all duration-300'}`}>
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
                            <button onClick={openCustomersModal} className="card group hover:scale-[1.02] transition-all duration-300 border-indigo-100 text-left">
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
                            <a href={`https://wa.me/?text=${encodeURIComponent(`Merhaba! 👋\n\nSize özel randevu sayfamdan kolayca randevu oluşturabilirsiniz:\n${window.location.origin}/ekuafor/book/${user.company_id || 1}?staff=${user.id}`)}`} target="_blank" rel="noopener noreferrer" className="card group hover:scale-[1.02] transition-all duration-300 border-green-100">
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
                        </>
                    )}
                </div>

                <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col items-center gap-4 pb-8">
                    <button onClick={() => { if (window.confirm('Sistem verileri sıfırlanacak. Çıkış yapılacak. Devam edilsin mi?')) { localStorage.clear(); window.location.href = '/'; } }} className="text-[10px] font-bold text-gray-300 uppercase tracking-widest hover:text-pink-500 transition-colors">Sistemi Sıfırla</button>
                </div>
            </main>

            {showExpenseModal && (
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
                                    <input type="date" required value={expenseForm.date} onChange={e => setExpenseForm(prev => ({ ...prev, date: e.target.value }))} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-rose-500 outline-none" />
                                </div>
                                <div className="flex items-center justify-between mb-2 pl-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Tutar (₺)</label>
                                    <button type="button" onClick={startScanner} className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-rose-600 text-white px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md shadow-rose-500/30 active:scale-95 transition-all">Fiş Tara</button>
                                </div>
                                <input type="number" required min="0" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))} placeholder="0.00" className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-slate-900 font-black focus:ring-2 focus:ring-rose-500 outline-none text-2xl" />
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Açıklama</label>
                                    <textarea required value={expenseForm.description} onChange={e => setExpenseForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Masraf detayı..." rows={3} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none resize-none" />
                                </div>
                                <button type="submit" disabled={loading} className="w-full py-4 mt-2 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-50">
                                    {loading ? 'Kaydediliyor...' : 'Masrafı Kaydet'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {voiceStep !== 'IDLE' && (
                <div className="fixed inset-0 z-[100] bg-indigo-950/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-fade-in p-6">
                    <button onClick={() => setVoiceStep('IDLE')} className="absolute top-10 right-10 text-white/40 hover:text-white">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="relative mb-12">
                        {isListening && <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20 scale-150"></div>}
                        <div className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all ${isListening ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                            <svg className={`w-12 h-12 text-white ${isListening ? 'animate-bounce' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m8 0h-8m4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
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
                                <span className="text-white font-black text-lg">{services.find(s => s.id === guidedData.serviceId)?.name || '...'}</span>
                            </div>
                        </div>
                        {voiceStep === 'CONFIRM' && (
                            <div className="mt-12 flex gap-4 w-full">
                                <button onClick={() => setVoiceStep('IDLE')} className="flex-1 py-6 bg-white/10 text-white rounded-3xl font-black uppercase tracking-widest hover:bg-white/20 transition-all">İptal</button>
                                <button onClick={confirmGuidedAppointment} className="flex-1 py-6 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all">Onayla</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {customersModal.open && (
                <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 animate-in slide-in-from-bottom duration-300">
                    <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 shadow-sm z-10" style={{ paddingTop: 'env(safe-area-inset-top, 1rem)' }}>
                        <div className="flex items-center gap-3">
                            <button onClick={closeCustomersModal} className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-2xl text-slate-400 active:scale-90"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg></button>
                            <h3 className="font-black text-slate-900 uppercase tracking-tight">Müşterilerim</h3>
                        </div>
                    </header>
                    <div className="p-6 bg-white border-b border-slate-100">
                        <div className="relative">
                            <input type="text" placeholder="İsim veya telefon numarası ara..." value={customersModal.search} onChange={handleCustomerSearch} className="w-full bg-slate-50 border-none rounded-2xl px-12 py-4 text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none" />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2"><svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
                            {customersModal.loading && <div className="absolute right-4 top-1/2 -translate-y-1/2"><div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 pb-12">
                        {!customersModal.search ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                <div className="text-4xl mb-4">🔍</div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Arama yapmak için isim veya<br/>telefon numarası giriniz.</p>
                            </div>
                        ) : (
                            customersModal.history.map((h: any) => (
                                <div key={h.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col"><h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">{h.customer_name}</h4><span className="text-[10px] font-bold text-slate-400">{h.customer_phone}</span></div>
                                        <span className="text-[9px] font-black px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full uppercase tracking-widest">{new Date(h.appointment_date).toLocaleDateString('tr-TR')}</span>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl">
                                        <div className="flex justify-between items-center mb-2"><span className="text-[9px] font-black text-slate-400 uppercase">Hizmet</span><span className="text-[11px] font-black text-slate-700">{h.service_name}</span></div>
                                        <div className="border-t border-slate-200/50 pt-2"><span className="text-[9px] font-black text-slate-400 uppercase block mb-1">İşlem Notu</span><p className="text-xs text-slate-600 font-medium leading-relaxed italic">{h.technical_notes || 'Not girilmemiş.'}</p></div>
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
