import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Company, Appointment } from '../types';

export default function SalonBoard() {
    const navigate = useNavigate();
    const [boardKey, setBoardKey] = useState<string | null>(localStorage.getItem('salon_board_key'));
    const [inputKey, setInputKey] = useState('');
    const [company, setCompany] = useState<Company | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentHour, setCurrentHour] = useState(new Date().getHours());
    const [currentDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [selectedDate, setSelectedDate] = useState(currentDate);

    // Staff Mode: when a staff member logs in via board_code
    const [staffMode, setStaffMode] = useState(false);
    const [staffInfo, setStaffInfo] = useState<any>(null);

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [selectedCell, setSelectedCell] = useState<{ person: any, hour: string } | null>(null);
    const [fastForm, setFastForm] = useState({
        customerName: '',
        serviceId: '',
        serviceIds: [] as number[],
        notes: '',
        staffId: '',
        appointmentDate: '',
        startTime: ''
    });

    // Helper to generate consistent color for staff
    const getStaffColor = (name: string) => {
        const colors = [
            '#4f46e5', '#db2777', '#059669', '#d97706', '#7c3aed',
            '#2563eb', '#dc2626', '#0891b2', '#16a34a', '#be185d'
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const generateHours = () => {
        if (!company) return Array.from({ length: 14 }, (_, i) => `${i + 8}:00`);

        const [startH, startM] = (company.work_start_time || '08:00').split(':').map(Number);
        const [endH, endM] = (company.work_end_time || '21:00').split(':').map(Number);
        const interval = company.slot_interval || 30;

        const hours = [];
        let currentMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;

        while (currentMin < endMin) {
            const h = Math.floor(currentMin / 60);
            const m = currentMin % 60;
            hours.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
            currentMin += interval;
        }
        return hours;
    };

    const hours = generateHours();

    const fetchData = useCallback(async (compId: number, date?: string) => {
        try {
            const dateToFetch = date || selectedDate;

            const [appsRes, staffRes, servRes] = await Promise.all([
                api.get('/appointments', { params: { company_id: compId, start_date: dateToFetch, end_date: dateToFetch } }),
                api.get(`/companies/${compId}/employees`),
                api.get('/services', { params: { company_id: compId } })
            ]);

            setAppointments(appsRes.data.data || []);
            setStaff(staffRes.data.data || []);
            setServices(servRes.data.data || []);
        } catch (err) {
            console.error('Veri senkronizasyonu başarısız', err);
        }
    }, [selectedDate]);

    const handleLogin = async (e?: React.FormEvent | string) => {
        if (e && typeof e !== 'string') e.preventDefault();
        const keyToUse = typeof e === 'string' ? e : inputKey;

        setLoading(true);
        setError('');
        try {
            const res = await api.post('/companies/board-login', { board_key: keyToUse });
            if (res.data.success) {
                const companyData = res.data.data;
                localStorage.setItem('salon_board_key', keyToUse);
                localStorage.setItem('salon_board_company_id', companyData.id.toString());
                setBoardKey(keyToUse);
                setCompany(companyData);
                fetchData(companyData.id);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Geçersiz anahtar');
        } finally {
            setLoading(false);
        }
    };

    // Staff Mode: auto-login if staff_board_code exists
    useEffect(() => {
        const staffCode = localStorage.getItem('staff_board_code');
        if (staffCode && !boardKey) {
            (async () => {
                try {
                    const res = await api.post('/companies/staff-login', { board_code: staffCode });
                    if (res.data?.success) {
                        const { user, company: comp } = res.data.data;
                        setStaffMode(true);
                        setStaffInfo(user);
                        setCompany(comp);
                        setBoardKey('staff-mode');
                        localStorage.setItem('salon_board_company_id', comp.id.toString());
                        fetchData(comp.id);
                    }
                } catch {
                    localStorage.removeItem('staff_board_code');
                }
            })();
        }
    }, []);

    useEffect(() => {
        const storedId = localStorage.getItem('salon_board_company_id');
        if (boardKey && boardKey !== 'staff-mode' && storedId) {
            const compId = parseInt(storedId);
            api.get(`/companies/${compId}`).then(res => {
                const cd = res.data.data;
                setCompany(cd);
            });
            fetchData(compId);

            const interval = setInterval(() => {
                fetchData(compId);
                setCurrentHour(new Date().getHours());
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [boardKey, fetchData]);

    // In staff mode, filter staff list to only show the logged-in staff member
    const displayStaff = staffMode && staffInfo
        ? staff.filter(s => s.user_id === staffInfo.id || s.id === staffInfo.id)
        : staff;

    const handleStaffLogout = () => {
        localStorage.removeItem('staff_board_code');
        localStorage.removeItem('salon_board_company_id');
        setStaffMode(false);
        setStaffInfo(null);
        setBoardKey(null);
        setCompany(null);
        navigate('/');
    };


    // Auto-scroll to current hour
    useEffect(() => {
        if (staff.length > 0) {
            const container = document.getElementById('matrix-container');
            const currentHourCol = document.getElementById(`hour-col-${currentHour}`);
            if (container && currentHourCol) {
                const scrollPos = currentHourCol.offsetLeft - 300; // Offset for sticky column
                container.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
            }
        }
    }, [staff, currentHour]);

    const handleFastSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company) return;

        try {
            setLoading(true);
            const date = fastForm.appointmentDate || selectedDate;
            const startTime = fastForm.startTime || selectedCell?.hour || '08:00';
            const staffId = fastForm.staffId || selectedCell?.person.user_id || selectedCell?.person.id;

            // GEÇMİŞ TARİH/SAAT KONTROLÜ
            if (date < currentDate) {
                alert('⚠️ Geçmiş bir tarihe randevu eklenemez.');
                setLoading(false);
                return;
            }

            if (date === currentDate) {
                const [sh, sm] = startTime.split(':').map(Number);
                const selectedTotal = sh * 60 + sm;
                const now = new Date();
                const currentTotal = now.getHours() * 60 + now.getMinutes();
                if (selectedTotal < currentTotal) {
                    alert('⚠️ Geçmiş bir saate randevu eklenemez.');
                    setLoading(false);
                    return;
                }
            }

            if (!staffId) {
                alert('Lütfen bir personel seçin');
                setLoading(false);
                return;
            }

            const sIds = fastForm.serviceIds.length > 0 ? fastForm.serviceIds : [(services[0]?.id || 1)];
            const selectedServices = services.filter(s => sIds.includes(s.id));
            const duration = selectedServices.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
            const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);

            const [sh, sm] = startTime.split(':').map(Number);
            const newStart = sh * 60 + sm;
            const newEnd = newStart + duration;
            const eh = Math.floor(newEnd / 60);
            const em = newEnd % 60;
            const endTime = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;

            // ÇAKIŞMA KONTROLÜ - mevcut randevularla karşılaştır
            const existingApps = appointments.filter(a => {
                const appDate = (a.appointment_date || '').substring(0, 10);
                return Number(a.staff_id) === Number(staffId) &&
                    a.status !== 'cancelled' &&
                    appDate === date;
            });

            const conflict = existingApps.find(app => {
                const [asH, asM] = app.start_time.split(':').map(Number);
                const [aeH, aeM] = app.end_time.split(':').map(Number);
                const appStart = asH * 60 + asM;
                const appEnd = aeH * 60 + aeM;
                return (newStart < appEnd && newEnd > appStart);
            });

            if (conflict) {
                alert(`⚠️ Çakışma tespit edildi!\n\nSeçilen saat: ${startTime} - ${endTime} (${duration} dk)\nMevcut randevu: ${conflict.start_time} - ${conflict.end_time} (${conflict.customer_name || 'Misafir'})\n\nLütfen başka bir saat seçin.`);
                setLoading(false);
                return;
            }

            await api.post('/appointments', {
                company_id: company.id,
                staff_id: parseInt(staffId.toString()),
                service_id: sIds[0],
                service_ids: sIds,
                appointment_date: date,
                start_time: startTime,
                end_time: endTime,
                customer_name: fastForm.customerName || 'Misafir Müşteri',
                notes: fastForm.notes,
                price: totalPrice,
                status: 'approved'
            });

            setIsModalOpen(false);
            setFastForm({ customerName: '', serviceId: '', serviceIds: [], notes: '', staffId: '', appointmentDate: '', startTime: '' });
            setSelectedCell(null);
            if (company.id) await fetchData(company.id);
            window.location.reload();
        } catch (err: any) {
            console.error('Randevu kayıt hatası:', err);
            alert(err.response?.data?.error || 'Randevu kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: number, newStatus: string) => {
        let msg = '';
        if (newStatus === 'cancelled') msg = 'Bu randevuyu iptal etmek istediğinize emin misiniz?';
        if (newStatus === 'approved') msg = 'Bu randevuyu onaylamak istiyor musunuz?';
        if (newStatus === 'completed') msg = 'Bu randevuyu tamamlandı olarak işaretlemek istiyor musunuz?';

        if (msg && !confirm(msg)) return;

        try {
            setLoading(true);
            await api.patch(`/appointments/${id}/status`, { status: newStatus });
            setIsDetailModalOpen(false);
            if (company?.id) fetchData(company.id);
        } catch (err: any) {
            alert(err.response?.data?.error || 'İşlem başarısız oldu');
        } finally {
            setLoading(false);
        }
    };

    if (!boardKey) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 bg-mesh-gradient">
                <div className="max-w-md w-full bg-white/10 backdrop-blur-2xl rounded-[3rem] p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border border-white/10 text-center animate-fade-in">
                    <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-orange-500 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-4xl shadow-2xl shadow-orange-500/20 rotate-3">
                        📟
                    </div>
                    <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Salon Paneli</h1>
                    <p className="text-slate-400 mb-10 font-medium">Cihazınızı yetkilendirmek için anahtarı girin.</p>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <input
                            type="text"
                            value={inputKey}
                            onChange={e => setInputKey(e.target.value)}
                            placeholder="•••• •••• ••••"
                            className="w-full p-6 bg-white/5 rounded-2xl border-2 border-white/10 font-mono text-center text-2xl tracking-[0.4em] text-amber-400 focus:border-amber-500 focus:bg-white/10 transition-all outline-none uppercase"
                            required
                        />
                        {error && <p className="text-red-400 text-sm font-bold bg-red-400/10 py-3 rounded-xl">{error}</p>}
                        <button
                            disabled={loading}
                            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 py-6 rounded-2xl font-black uppercase tracking-widest shadow-[0_20px_40px_-10px_rgba(245,158,11,0.3)] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Bağlanıyor...' : 'Sistemi Başlat'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const pendingCount = appointments.filter(a => a.status === 'pending').length;

    const getSpecialDay = (dateStr: string) => {
        const d = new Date(dateStr);
        const day = d.getDate();
        const month = d.getMonth() + 1;

        const fixedDays: Record<string, string> = {
            '1-1': 'Yılbaşı',
            '23-4': 'Ulusal Egemenlik ve Çocuk Bayramı',
            '1-5': 'Emek ve Dayanışma Günü',
            '19-5': 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı',
            '15-7': 'Demokrasi ve Milli Birlik Günü',
            '30-8': 'Zafer Bayramı',
            '28-10': 'Cumhuriyet Bayramı (Arife)',
            '29-10': 'Cumhuriyet Bayramı',
            '10-11': 'Atatürk\'ü Anma Günü'
        };

        return fixedDays[`${day}-${month}`] || null;
    };

    const specialDay = getSpecialDay(selectedDate);

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans overflow-hidden selection:bg-indigo-100">
            {/* Ultra Modern Header */}
            {/* Premium Streamlined Header */}
            <header className="bg-white px-6 lg:px-8 py-4 border-b border-slate-100 z-50 shadow-sm sticky top-0">
                <div className="flex items-center justify-between gap-6">
                    {/* Left: Brand & Integrated Legend */}
                    <div className="flex items-center gap-10 flex-1 min-w-0">
                        <div className="flex flex-col min-w-max">
                            <h1 className="text-xl lg:text-3xl font-black text-slate-900 leading-none mb-1 uppercase tracking-tighter">
                                {company?.name || 'Yükleniyor...'}
                            </h1>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="bg-slate-100 text-slate-900 border-none rounded-lg px-3 py-1 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                                    />
                                </div>
                                {specialDay && (
                                    <div className="text-amber-500 text-[10px] font-black animate-pulse flex items-center gap-1">
                                        ✨ <span className="uppercase">{specialDay}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Legend: Aligned with Brand Name */}
                        <div className="hidden lg:flex items-center gap-6 border-l-2 border-slate-50 pl-10 h-10">
                            <div className="flex items-center gap-2.5 group cursor-default">
                                <div className="w-3 h-3 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.4)] group-hover:scale-125 transition-transform"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] group-hover:text-slate-600 transition-colors">Yeni Talep</span>
                            </div>
                            <div className="flex items-center gap-2.5 group cursor-default">
                                <div className="w-3 h-3 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.4)] group-hover:scale-125 transition-transform"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] group-hover:text-slate-600 transition-colors">Onaylandı</span>
                            </div>
                            <div className="flex items-center gap-2.5 group cursor-default">
                                <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)] group-hover:scale-125 transition-transform"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] group-hover:text-slate-600 transition-colors">Tamamlandı</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Modern Actions */}
                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex flex-col items-end border-r border-slate-100 pr-6">
                            <span className="text-lg font-black text-slate-900 tracking-tighter leading-none">
                                {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Sync</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {pendingCount > 0 && (
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-amber-500 rounded-xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                                    <div className="relative flex items-center bg-amber-500 text-white px-4 py-2.5 rounded-xl gap-2 font-black shadow-lg shadow-amber-200 animate-bounce">
                                        <span className="text-sm">{pendingCount}</span>
                                        <span className="text-[10px] uppercase tracking-widest hidden sm:inline">Talep</span>
                                    </div>
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    setFastForm({
                                        customerName: '',
                                        serviceId: services[0]?.id?.toString() || '',
                                        serviceIds: [] as number[],
                                        notes: '',
                                        staffId: staff[0]?.user_id || staff[0]?.id || '',
                                        appointmentDate: selectedDate,
                                        startTime: hours.find(h => {
                                            const hNum = parseInt(h.split(':')[0]);
                                            return hNum >= currentHour;
                                        }) || '09:00'
                                    });
                                    setIsModalOpen(true);
                                }}
                                className="group relative w-12 h-12 flex items-center justify-center bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200/50 hover:bg-black hover:scale-105 active:scale-90 transition-all duration-300 overflow-hidden"
                                title="Yeni Randevu Ekle"
                                style={{ margin: 0 }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-slate-800 to-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <svg className="relative z-10 w-6 h-6 transform group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm('Sistemden çıkış yapılsın mı?')) {
                                        if (staffMode) handleStaffLogout();
                                        else { localStorage.removeItem('salon_board_key'); window.location.reload(); }
                                    }
                                }}
                                className="group w-12 h-12 rounded-2xl bg-white border-2 border-slate-50 text-slate-400 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all duration-300 flex items-center justify-center shadow-lg shadow-slate-100/50 active:scale-90"
                                title="Güvenli Çıkış"
                            >
                                <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>


            {/* Matrix Container */}
            <div id="matrix-container" className="flex-1 overflow-auto p-4 lg:p-5 scroll-smooth bg-slate-50/50">
                <div className="bg-white rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 inline-block min-w-full">
                    <table className="border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-slate-900">
                                <th className="sticky top-0 left-0 z-[100] bg-slate-900 p-4 lg:p-5 text-left border-b border-white/5 min-w-[240px] lg:min-w-[280px] shadow-[10px_0_30px_-15px_rgba(0,0,0,0.3)] rounded-tl-[1.5rem]">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">Organizasyon</span>
                                        <span className="text-base font-black text-white tracking-tight">Uzmanlar</span>
                                    </div>
                                </th>
                                {hours.map(hour => {
                                    const hNum = parseInt(hour.split(':')[0]);
                                    const isCurrent = hNum === currentHour && selectedDate === currentDate;
                                    const isPast = (selectedDate < currentDate) || (selectedDate === currentDate && hNum < currentHour);

                                    return (
                                        <th
                                            key={hour}
                                            id={`hour-col-${hNum}`}
                                            className={`sticky top-0 z-[80] p-2 lg:p-3 text-center border-b border-white/5 min-w-[90px] transition-all relative ${isCurrent ? 'bg-white/10' : 'bg-slate-900'}`}
                                        >
                                            <div className="flex flex-col items-center gap-0.5 transition-all">
                                                <span className={`text-sm lg:text-base font-black tracking-tight ${isCurrent ? 'text-white' : isPast ? 'text-slate-600' : 'text-slate-400'}`}>
                                                    {hour}
                                                </span>
                                                {isCurrent && (
                                                    <span className="px-1.5 py-0.2 bg-emerald-500 text-[6px] text-white font-black uppercase tracking-widest rounded-full">
                                                        ŞİMDİ
                                                    </span>
                                                )}
                                            </div>
                                            {isCurrent && <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full"></div>}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayStaff.map(person => {
                                const pId = person.user_id || person.id;
                                const staffColor = getStaffColor(`${person.first_name} ${person.last_name}`);
                                return (
                                    <tr key={pId} className="group transition-all">
                                        <td className="sticky left-0 z-[50] bg-white p-2 lg:p-3 border-r border-slate-100 font-bold text-slate-900 shadow-[10px_0_30px_-15px_rgba(0,0,0,0.1)] group-hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-16 h-16 lg:w-20 lg:h-20 rounded-3xl text-white flex items-center justify-center font-black text-xl lg:text-3xl uppercase shadow-xl shrink-0 overflow-hidden border-4 border-white"
                                                    style={{ backgroundColor: person.photo ? 'transparent' : staffColor }}
                                                >
                                                    {person.photo ? (
                                                        <img src={person.photo} alt={person.first_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <>{person.first_name?.[0] || 'U'}{person.last_name?.[0] || 'Z'}</>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-base lg:text-xl font-black text-slate-800 leading-tight tracking-tight group-hover:text-indigo-600 transition-colors">
                                                        {person.first_name}
                                                    </p>
                                                    <p className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                                                        {person.last_name}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        {hours.map(hour => {
                                            const now = new Date();
                                            const currentTotal = now.getHours() * 60 + now.getMinutes();
                                            const [hh, mm] = hour.split(':').map(Number);
                                            const slotTotal = hh * 60 + mm;
                                            const slotInterval = company?.slot_interval || 30;
                                            const nextSlotTotal = slotTotal + slotInterval;

                                            const isSlotCurrent = selectedDate === currentDate && currentTotal >= slotTotal && currentTotal < nextSlotTotal;
                                            const isSlotPast = (selectedDate < currentDate) || (selectedDate === currentDate && currentTotal >= nextSlotTotal);
                                            const todayDate = selectedDate;

                                            // Find appointments that are active during this slot
                                            const activeAtSlot = appointments.filter(a => {
                                                const appDate = (a.appointment_date || '').substring(0, 10);
                                                if (Number(a.staff_id) !== Number(pId) || a.status === 'cancelled' || appDate !== todayDate) return false;

                                                const [asH, asM] = a.start_time.split(':').map(Number);
                                                const [aeH, aeM] = a.end_time.split(':').map(Number);
                                                const appStart = asH * 60 + asM;
                                                const appEnd = aeH * 60 + aeM;

                                                // Active if it covers any part of this slot [slotTotal, nextSlotTotal)
                                                return slotTotal < appEnd && appStart < nextSlotTotal;
                                            });

                                            const isOccupied = activeAtSlot.length > 0;
                                            const isSlotFree = !isOccupied;

                                            return (
                                                <td
                                                    key={hour}
                                                    className={`p-1 lg:p-1.5 border-r border-slate-50 align-top transition-all relative ${isSlotCurrent ? 'bg-indigo-50/10' : ''} ${isSlotPast && isSlotFree ? 'bg-slate-50/20 grayscale opacity-40 pointer-events-none' : !isOccupied ? 'cursor-cell hover:bg-slate-50/80' : ''}`}
                                                    onClick={() => {
                                                        if (isOccupied || isSlotPast) return;

                                                        const pId = person.user_id || person.id;
                                                        setSelectedCell({ person, hour });
                                                        setFastForm({
                                                            customerName: '',
                                                            serviceId: services[0]?.id?.toString() || '',
                                                            serviceIds: [],
                                                            notes: '',
                                                            staffId: pId.toString(),
                                                            appointmentDate: selectedDate,
                                                            startTime: hour
                                                        });
                                                        setIsModalOpen(true);
                                                    }}
                                                >
                                                    <div className={`space-y-1.5 min-h-[80px] transition-all ${isSlotPast && isSlotFree ? 'opacity-10' : ''}`}>
                                                        {/* Boş slot - sadece gelecekteyse Müsait göster */}
                                                        {isSlotFree && !isSlotPast && (
                                                            <div className="opacity-0 group-hover:opacity-100 flex items-center justify-center h-[72px] border-2 border-dashed border-slate-200 rounded-lg text-[8px] text-slate-400 font-black uppercase tracking-widest transition-all bg-white shadow-sm">
                                                                +
                                                            </div>
                                                        )}

                                                        {/* Render all active appointments for this slot */}
                                                        {activeAtSlot.map(app => {
                                                            const startsHere = app.start_time.substring(0, 5) === hour;
                                                            return (
                                                                <div
                                                                    key={app.id}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedAppointment(app);
                                                                        setIsDetailModalOpen(true);
                                                                    }}
                                                                    className={`p-1.5 lg:p-2 rounded-xl border-l-[3px] shadow-md shadow-slate-200/40 transition-all hover:scale-[1.03] hover:shadow-xl active:scale-95 cursor-pointer w-full ${isSlotPast ? 'grayscale-[0.6] opacity-60' : ''} ${!startsHere ? 'opacity-70 border-dashed border-l-2' : ''} ${app.status === 'approved' ? 'bg-white text-slate-900' :
                                                                        app.status === 'pending' ? 'bg-amber-50 border-amber-500 text-amber-900 animate-pulse' :
                                                                            app.status === 'completed' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 opacity-60' :
                                                                                'bg-slate-50 border-slate-300 text-slate-500'
                                                                        }`}
                                                                    style={app.status === 'approved' ? { borderLeftColor: staffColor } : {}}
                                                                >
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                                                                {app.start_time.substring(0, 5)} {startsHere ? '' : '(devam)'}
                                                                            </span>
                                                                            {isSlotCurrent && startsHere && <span className="w-1 h-1 bg-indigo-500 rounded-full animate-ping"></span>}
                                                                        </div>
                                                                        <span className={`px-1 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest ${app.status === 'approved' ? 'bg-indigo-100 text-indigo-600' :
                                                                            app.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                                                                'bg-slate-100 text-slate-400'
                                                                            }`}>
                                                                            {app.status === 'approved' ? 'V' : app.status === 'pending' ? '!' : 'G'}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs font-black truncate leading-none mb-0.5 tracking-tight">{app.customer_name || 'Misafir'}</p>
                                                                    <p className="text-[7px] font-bold text-slate-400 truncate uppercase tracking-widest leading-none">
                                                                        {app.services && app.services.length > 0
                                                                            ? app.services.map((s: any) => s.name).join(', ')
                                                                            : (app.service_name || 'Hizmet')}
                                                                    </p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>


            {/* New/Fast Appointment Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white w-full max-w-2xl rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-100 animate-scale-up">
                        <div className="relative p-12 bg-gradient-to-br from-slate-50 to-white">
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <div className="inline-flex px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">Rezarvasyon Formu</div>
                                    <h2 className="text-4xl font-black text-slate-900 leading-none tracking-tighter">
                                        {selectedCell ? 'Hızlı Randevu' : 'Yeni Randevu'}
                                    </h2>
                                </div>
                                <button onClick={() => { setIsModalOpen(false); setSelectedCell(null); }} className="w-16 h-16 bg-white border border-slate-100 rounded-3xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:rotate-90 transition-all shadow-sm">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <form onSubmit={handleFastSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Müşteri İsmi</label>
                                        <input
                                            type="text"
                                            value={fastForm.customerName}
                                            onChange={e => setFastForm(prev => ({ ...prev, customerName: e.target.value }))}
                                            placeholder="İsim veya Misafir"
                                            className="w-full p-6 bg-white rounded-3xl border-2 border-slate-100 focus:border-indigo-500 transition-all font-black text-xl text-slate-900 outline-none"
                                        />
                                    </div>

                                    <div className="space-y-4 col-span-1 md:col-span-2">
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Hizmet Seçimi (Birden Fazla Seçebilirsiniz)</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-4 bg-slate-50 rounded-[2.5rem]">
                                            {services.map(s => {
                                                const isSelected = fastForm.serviceIds.includes(s.id);
                                                return (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onClick={() => {
                                                            const newIds = isSelected
                                                                ? fastForm.serviceIds.filter(id => id !== s.id)
                                                                : [...fastForm.serviceIds, s.id];
                                                            setFastForm({ ...fastForm, serviceIds: newIds });
                                                        }}
                                                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col gap-1 text-center items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-transparent text-slate-600'}`}
                                                    >
                                                        <p className={`text-[9px] font-black uppercase leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>{s.name}</p>
                                                        <p className={`text-[8px] font-bold ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>₺{s.price}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Uzman</label>
                                        <select
                                            disabled={!!selectedCell}
                                            value={fastForm.staffId || selectedCell?.person.user_id || selectedCell?.person.id}
                                            onChange={e => setFastForm(prev => ({ ...prev, staffId: e.target.value }))}
                                            className="w-full p-6 bg-white rounded-3xl border-2 border-slate-100 focus:border-indigo-500 transition-all font-black text-xl text-slate-900 outline-none appearance-none cursor-pointer disabled:bg-slate-50"
                                        >
                                            {staff.map(s => <option key={s.user_id || s.id} value={s.user_id || s.id}>{s.first_name} {s.last_name}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Tarih</label>
                                        <input
                                            type="date"
                                            disabled={!!selectedCell}
                                            min={currentDate}
                                            value={fastForm.appointmentDate}
                                            onChange={e => setFastForm(prev => ({ ...prev, appointmentDate: e.target.value }))}
                                            className="w-full p-6 bg-white rounded-3xl border-2 border-slate-100 focus:border-indigo-500 transition-all font-black text-xl text-slate-900 outline-none disabled:bg-slate-50"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Başlangıç Saati</label>
                                        <select
                                            disabled={!!selectedCell}
                                            value={fastForm.startTime || selectedCell?.hour}
                                            onChange={e => setFastForm(prev => ({ ...prev, startTime: e.target.value }))}
                                            className="w-full p-6 bg-white rounded-3xl border-2 border-slate-100 focus:border-indigo-500 transition-all font-black text-xl text-slate-900 outline-none cursor-pointer disabled:bg-slate-50"
                                        >
                                            {hours.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Notlar</label>
                                    <textarea
                                        value={fastForm.notes}
                                        onChange={e => setFastForm(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Kısa notlar..."
                                        rows={2}
                                        className="w-full p-6 bg-white rounded-3xl border-2 border-slate-100 focus:border-indigo-500 transition-all font-medium text-slate-600 outline-none resize-none"
                                    />
                                </div>

                                <button
                                    disabled={loading}
                                    className="w-full bg-slate-900 text-white py-8 rounded-[2.5rem] font-black uppercase tracking-[0.3em] shadow-[0_24px_48px_-12px_rgba(15,23,42,0.4)] hover:bg-slate-800 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 text-xl"
                                >
                                    {loading ? 'Kaydediliyor...' : 'Randevuyu Onayla'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Appointment Detail Modal */}
            {isDetailModalOpen && selectedAppointment && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white w-full max-w-lg rounded-[4rem] overflow-hidden shadow-2xl animate-scale-up">
                        <div className="p-12">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <div className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 ${selectedAppointment.status === 'approved' ? 'bg-indigo-50 text-indigo-600' :
                                        selectedAppointment.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                                            'bg-slate-100 text-slate-500'
                                        }`}>
                                        {selectedAppointment.status === 'approved' ? 'ONAYLI RANDEVU' : 'BEKLEYEN RANDEVU'}
                                    </div>
                                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{selectedAppointment.customer_name || 'Misafir'}</h2>
                                </div>
                                <button onClick={() => setIsDetailModalOpen(false)} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2.5rem]">
                                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-2xl shadow-sm">✂️</div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hizmet</p>
                                        <p className="text-xl font-black text-slate-800 uppercase tracking-tight">{selectedAppointment.service_name}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 bg-slate-50 rounded-[2.5rem]">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saat</p>
                                        <p className="text-xl font-black text-slate-800">{selectedAppointment.start_time}</p>
                                    </div>
                                    <div className="p-6 bg-slate-50 rounded-[2.5rem]">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Uzman</p>
                                        <p className="text-lg font-black text-slate-800 truncate">{selectedAppointment.staff_name || 'Belirsiz'}</p>
                                    </div>
                                </div>

                                {selectedAppointment.notes && (
                                    <div className="p-8 bg-indigo-50/50 border border-indigo-100/50 rounded-[2.5rem]">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Müşteri Notu</p>
                                        <p className="text-slate-700 font-bold leading-relaxed">{selectedAppointment.notes}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 mt-8">
                                <div className="flex gap-4">
                                    {selectedAppointment.status === 'pending' && (
                                        <button
                                            onClick={() => handleUpdateStatus(selectedAppointment.id!, 'approved')}
                                            disabled={loading}
                                            className="flex-1 bg-emerald-500 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all disabled:opacity-50"
                                        >
                                            Onayla
                                        </button>
                                    )}

                                    {selectedAppointment.status === 'approved' && (
                                        <button
                                            onClick={() => handleUpdateStatus(selectedAppointment.id!, 'completed')}
                                            disabled={loading}
                                            className="flex-1 bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
                                        >
                                            Tamamla
                                        </button>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    {selectedAppointment.status !== 'cancelled' && selectedAppointment.status !== 'completed' && (
                                        <button
                                            onClick={() => handleUpdateStatus(selectedAppointment.id!, 'cancelled')}
                                            disabled={loading}
                                            className="flex-1 bg-red-50 text-red-600 py-6 rounded-[2rem] font-black uppercase tracking-widest hover:bg-red-100 transition-all disabled:opacity-50"
                                        >
                                            İptal Et
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsDetailModalOpen(false)}
                                        className="flex-1 bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"
                                    >
                                        Kapat
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
