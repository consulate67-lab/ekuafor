import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { Appointment, Service, Company, User } from '../types';
import { App } from '@capacitor/app';

export default function BookingPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [company, setCompany] = useState<Company | null>(null);
    const [staff, setStaff] = useState<User[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    // Form Steps: 1-Staff, 2-Service, 3-Date, 4-Time, 5-CustomerInfo
    // If staff param exists, start at step 2
    const initialStaffId = searchParams.get('staff') ? Number(searchParams.get('staff')) : null;
    const [step, setStep] = useState(initialStaffId ? 2 : 1);

    // Android Hardware Back Button Support
    useEffect(() => {
        const backHandler = App.addListener('backButton', () => {
            if (step > 1) {
                // If we started with a staff param at step 2, don't go back to step 1
                if (step === 2 && initialStaffId) {
                    navigate(-1);
                } else {
                    setStep(prev => prev - 1);
                }
            } else {
                navigate(-1);
            }
        });

        return () => {
            backHandler.then(h => h.remove());
        };
    }, [step, navigate, initialStaffId]);

    const [selection, setSelection] = useState<{
        staffId: number | null;
        serviceId: number | null;
        date: string | null;
        time: string | null;
        customerName: string;
        customerPhone: string;
    }>({
        staffId: initialStaffId,
        serviceId: null,
        date: null,
        time: null,
        customerName: '',
        customerPhone: ''
    });

    const dateInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (step === 3 && dateInputRef.current) {
            setTimeout(() => {
                try {
                    dateInputRef.current?.showPicker();
                } catch (e) {
                    console.log('showPicker not supported', e);
                }
            }, 300);
        }
    }, [step]);

    useEffect(() => {
        const fetchCompanyData = async () => {
            try {
                // ... fetch company details
                const compRes = await api.get(`/companies/${id}`);
                const companyData = compRes.data.data;
                console.log('[BookingPage v1.7.3] Company data:', JSON.stringify({
                    work_start_time: companyData.work_start_time,
                    work_end_time: companyData.work_end_time,
                    slot_interval: companyData.slot_interval
                }));
                setCompany(companyData);

                // QR Auto-Favorite Logic
                if (searchParams.get('ref') === 'qr' && id) {
                    const companyId = Number(id);
                    const savedFavs = localStorage.getItem('saloon_favorites');
                    let favorites: number[] = savedFavs ? JSON.parse(savedFavs) : [];

                    if (!favorites.includes(companyId)) {
                        favorites.push(companyId);
                        localStorage.setItem('saloon_favorites', JSON.stringify(favorites));
                        console.log(`[BookingPage] Company ${companyId} added to favorites via QR`);
                    }
                }

                // 2. Services
                try {
                    const servicesRes = await api.get('/services', { params: { company_id: id } });
                    setServices(servicesRes.data?.data || []);
                } catch (e) {
                    console.error('Failed to load services', e);
                }

                // 3. Employees (Staff)
                try {
                    const usersRes = await api.get(`/companies/${id}/employees`);
                    setStaff(usersRes.data?.data || []);
                } catch (e) {
                    console.error('Failed to load employees', e);
                }

                // 4. Appointments - fetch wider range so all selectable dates have data
                try {
                    const today = new Date().toLocaleDateString('en-CA');
                    // Fetch 60 days ahead to cover all bookable dates
                    const futureDate = new Date();
                    futureDate.setDate(futureDate.getDate() + 60);
                    const endDate = futureDate.toLocaleDateString('en-CA');
                    const appsRes = await api.get('/appointments', {
                        params: {
                            company_id: id,
                            start_date: today,
                            end_date: endDate
                        }
                    });
                    setAppointments(appsRes.data?.data || []);
                } catch (e) {
                    console.error('Failed to load appointments', e);
                }

            } catch (err: any) {
                console.error('Critical failure in booking data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCompanyData();
    }, [id, searchParams]);

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const generateTimeSlots = () => {
        if (!company || !selection.date || !selection.serviceId) return [];

        const service = services.find(s => s.id === selection.serviceId);
        const duration = service?.duration_minutes || 30;

        const [startH, startM] = (company.work_start_time || '09:00').split(':').map(Number);
        const [endH, endM] = (company.work_end_time || '20:00').split(':').map(Number);

        const workBegin = startH * 60 + startM;
        const workEnd = endH * 60 + endM;

        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA');
        const isToday = selection.date === todayStr;
        const currentMin = now.getHours() * 60 + now.getMinutes();

        const slotInterval = company.slot_interval || 30;

        // Get all appointments for this staff on this date
        // Normalize: appointment_date from DB may be ISO "2026-02-19T00:00:00.000Z"
        const selectedDate = selection.date; // "2026-02-19"
        const staffApps = appointments.filter(a => {
            const appDate = (a.appointment_date || '').substring(0, 10); // "2026-02-19"
            const staffMatch = (Number(a.staff_id) === Number(selection.staffId)) || !a.staff_id;
            const companyMatch = Number(a.company_id) === Number(id);
            const notCancelled = a.status !== 'cancelled';
            const dateMatch = appDate === selectedDate;
            return staffMatch && companyMatch && notCancelled && dateMatch;
        });

        console.log(`[v1.7.3] generateTimeSlots: date=${selectedDate}, staffId=${selection.staffId}, found ${staffApps.length} appointments`, staffApps.map(a => ({ start: a.start_time, end: a.end_time, date: a.appointment_date, staff: a.staff_id, status: a.status })));

        const slots: { time: string; isAvailable: boolean }[] = [];

        for (let time = workBegin; time < workEnd; time += slotInterval) {
            const h = Math.floor(time / 60);
            const m = time % 60;
            const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            const slotEnd = time + duration;

            // 1. Check if it's in the past (Bugün için 5dk buffer)
            const isPast = isToday && (time < currentMin + 5);

            // 2. Check if it's busy (Approved or Pending)
            const isBusy = staffApps.some(app => {
                const [asH, asM] = app.start_time.split(':').map(Number);
                const [aeH, aeM] = app.end_time.split(':').map(Number);
                const appStart = asH * 60 + asM;
                const appEnd = aeH * 60 + aeM;
                return (time < appEnd && slotEnd > appStart);
            });

            slots.push({
                time: timeStr,
                isAvailable: !isPast && !isBusy
            });
        }
        return slots;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const service = services.find(s => s.id === selection.serviceId);
            const duration = service?.duration_minutes || 30;
            const [h, m] = (selection.time || '00:00').split(':').map(Number);
            const newStart = h * 60 + m;
            const newEnd = newStart + duration;
            const endH = Math.floor(newEnd / 60);
            const endM = newEnd % 60;
            const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

            // Çakışma kontrolü - son güvenlik katmanı
            const staffApps = appointments.filter(a => {
                const appDate = (a.appointment_date || '').substring(0, 10);
                return (Number(a.staff_id) === Number(selection.staffId) || !a.staff_id) &&
                    Number(a.company_id) === Number(id) &&
                    a.status !== 'cancelled' &&
                    appDate === selection.date;
            });

            const conflict = staffApps.find(app => {
                const [asH, asM] = app.start_time.split(':').map(Number);
                const [aeH, aeM] = app.end_time.split(':').map(Number);
                const appStart = asH * 60 + asM;
                const appEnd = aeH * 60 + aeM;
                return (newStart < appEnd && newEnd > appStart);
            });

            if (conflict) {
                alert(`⚠️ Bu saat aralığı dolu!\n\nSeçtiğiniz: ${selection.time} - ${endTime} (${duration} dk)\nMevcut randevu: ${conflict.start_time} - ${conflict.end_time}\n\nLütfen başka bir saat seçin.`);
                setStep(4); // Saat seçim ekranına geri dön
                return;
            }

            await api.post('/appointments', {
                company_id: Number(id),
                staff_id: selection.staffId,
                service_id: selection.serviceId,
                appointment_date: selection.date,
                start_time: selection.time,
                end_time: endTime,
                customer_name: selection.customerName,
                customer_phone: selection.customerPhone,
                notes: `Müşteri: ${selection.customerName} | Tel: ${selection.customerPhone}`,
                status: 'pending'
            });

            // Save phone locally to identify this customer in MyAppointments
            localStorage.setItem('customer_phone', selection.customerPhone);

            alert('Randevu talebiniz alındı! Onaylandığında size bildirim yapılacaktır.');
            navigate('/');
        } catch (err: any) {
            console.error('Booking failed', err);
            const serverMsg = err.response?.data?.error || err.message;
            alert('Randevu oluşturulurken bir hata oluştu: ' + serverMsg);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Yükleniyor...</div>;

    if (!company) return (
        <div className="min-h-screen flex items-center justify-center flex-col gap-4 p-6 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-4xl mb-2">
                ⚠️
            </div>
            <h2 className="text-xl font-bold text-gray-900">Firma Bulunamadı</h2>
            <p className="text-gray-500 max-w-xs">
                Lütfen geçerli bir bağlantı kullandığınızdan emin olun. Eğer bir hata olduğunu düşünüyorsanız sayfayı yenileyin.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
                <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-[#1e1b4b] text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
                >
                    Sayfayı Yenile
                </button>
                <button
                    onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                    }}
                    className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm"
                >
                    Sistemi Sıfırla (Veri Sorunu Varsa)
                </button>
            </div>
            <p className="text-[10px] text-gray-300 mt-10 uppercase tracking-widest">ID: {id} | v1.7</p>
        </div>
    );

    const selectedStaffUser = staff.find(u => (u.id === selection.staffId) || ((u as any).user_id === selection.staffId));
    const selectedService = services.find(s => s.id === selection.serviceId);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-white p-4 shadow-sm text-center sticky top-0 z-10">
                <h1 className="text-xl font-bold text-gray-900 heading-serif">{company.name}</h1>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Randevu Oluştur</p>
            </header>

            <div className="flex-1 max-w-md mx-auto w-full p-6">

                {/* Progress Bar */}
                <div className="flex gap-2 mb-8">
                    {[1, 2, 3, 4, 5].map(s => (
                        <div key={s} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${s <= step ? 'bg-[#b45309]' : 'bg-gray-200'}`}></div>
                    ))}
                </div>

                {/* Step 1: Staff Selection */}
                {step === 1 && (
                    <div className="animate-in slide-in-from-right duration-300 fade-in">
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Personel Seçimi</h2>
                        <div className="space-y-3">
                            {staff.map(u => (
                                <button
                                    key={u.id || (u as any).user_id}
                                    onClick={() => {
                                        setSelection({ ...selection, staffId: u.id || (u as any).user_id });
                                        handleNext();
                                    }}
                                    className="w-full bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all flex items-center gap-5 text-left group active:scale-[0.98]"
                                >
                                    <div className="w-16 h-16 bg-slate-50 text-[#1e1b4b] rounded-2xl flex items-center justify-center font-black text-xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                        {u.first_name[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-slate-900 text-lg group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{u.first_name} {u.last_name}</h3>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">{u.role === 'company_admin' ? 'Baş Uzman' : 'Uzman'}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {/* Dummy skills for now, in real case this would come from API */}
                                            {['Saç Tasarım', 'Sakal Tıraşı', 'Cilt Bakımı'].map(skill => (
                                                <span key={skill} className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md text-[8px] font-bold border border-slate-100 uppercase">{skill}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                    </div>
                                </button>
                            ))}
                            {staff.length === 0 && (
                                <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                                    <p className="text-gray-400 font-bold mb-4">Henüz personel bulunamadı.</p>
                                    <button
                                        onClick={() => {
                                            localStorage.clear();
                                            window.location.reload();
                                        }}
                                        className="bg-pink-600 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
                                    >
                                        Verileri Yenile
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 2: Service Selection */}
                {step === 2 && (
                    <div className="animate-in slide-in-from-right duration-300 fade-in">
                        <button onClick={handleBack} className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 hover:text-gray-600">← Geri</button>
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Hizmet Seçimi</h2>
                        <div className="space-y-3">
                            {services.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => {
                                        setSelection({ ...selection, serviceId: s.id! });
                                        handleNext();
                                    }}
                                    className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-pink-200 transition-all flex items-center gap-4 text-left"
                                >
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900">{s.name}</h3>
                                        <p className="text-xs text-gray-500">{s.duration_minutes} dakika</p>
                                    </div>
                                    <div className="font-black text-[#b45309]">₺{s.price}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 3: Date Selection */}
                {step === 3 && (
                    <div className="animate-in slide-in-from-right duration-300 fade-in">
                        <button onClick={handleBack} className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 hover:text-gray-600">← Geri</button>
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Tarih Seçimi</h2>
                        <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/40 border border-slate-100">
                            {/* Calendar Header */}
                            <div className="flex items-center justify-between mb-8 px-2">
                                <button
                                    onClick={() => {
                                        const d = new Date(selection.date || new Date());
                                        d.setMonth(d.getMonth() - 1);
                                        // Don't go before current month
                                        if (d.getMonth() >= new Date().getMonth() || d.getFullYear() > new Date().getFullYear()) {
                                            setSelection({ ...selection, date: d.toISOString().split('T')[0] });
                                        }
                                    }}
                                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <h3 className="text-lg font-black text-slate-900 capitalize tracking-tight">
                                    {new Date(selection.date || new Date()).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                                </h3>
                                <button
                                    onClick={() => {
                                        const d = new Date(selection.date || new Date());
                                        d.setMonth(d.getMonth() + 1);
                                        setSelection({ ...selection, date: d.toISOString().split('T')[0] });
                                    }}
                                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>

                            {/* Day Names */}
                            <div className="grid grid-cols-7 mb-4">
                                {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map(day => (
                                    <div key={day} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">{day}</div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-y-2">
                                {(() => {
                                    const date = new Date(selection.date || new Date());
                                    const year = date.getFullYear();
                                    const month = date.getMonth();
                                    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
                                    const daysCount = new Date(year, month + 1, 0).getDate();
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);

                                    // Adjust firstDay for Monday start (0=Pt, 6=Pz)
                                    const offset = firstDay === 0 ? 6 : firstDay - 1;

                                    const elements = [];
                                    // Empty cells
                                    for (let i = 0; i < offset; i++) {
                                        elements.push(<div key={`empty-${i}`} className="h-12" />);
                                    }
                                    // Days
                                    for (let d = 1; d <= daysCount; d++) {
                                        const dDate = new Date(year, month, d);
                                        // Use local-safe YYYY-MM-DD
                                        const dateStr = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}-${String(dDate.getDate()).padStart(2, '0')}`;
                                        const isSelected = selection.date === dateStr;
                                        const isPast = dDate < today;

                                        elements.push(
                                            <button
                                                key={d}
                                                disabled={isPast}
                                                onClick={() => setSelection({ ...selection, date: dateStr })}
                                                className={`h-12 w-full flex items-center justify-center rounded-2xl text-sm font-black transition-all ${isSelected
                                                        ? 'bg-[#b45309] text-white shadow-xl shadow-orange-500/40 scale-110 z-10'
                                                        : isPast
                                                            ? 'text-slate-200 cursor-not-allowed'
                                                            : 'text-slate-600 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {d}
                                            </button>
                                        );
                                    }
                                    return elements;
                                })()}
                            </div>

                            <button
                                disabled={!selection.date}
                                onClick={handleNext}
                                className={`w-full py-4 mt-8 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all ${selection.date ? 'bg-slate-900 text-white shadow-xl shadow-indigo-950/20 active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                            >
                                Randevu Saati Seç
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Time Selection */}
                {step === 4 && (
                    <div className="animate-in slide-in-from-right duration-300 fade-in">
                        <button onClick={handleBack} className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 hover:text-gray-600">← Geri</button>
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Saat Seçimi</h2>
                        <div className="grid grid-cols-3 gap-3">
                            {generateTimeSlots().length > 0 ? generateTimeSlots().map(slot => (
                                <button
                                    key={slot.time}
                                    disabled={!slot.isAvailable}
                                    onClick={() => {
                                        setSelection({ ...selection, time: slot.time });
                                        handleNext();
                                    }}
                                    className={`py-4 rounded-2xl font-black text-sm transition-all shadow-sm ${slot.isAvailable
                                        ? 'bg-white border-2 border-slate-100 text-[#1e1b4b] hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/20 active:scale-95'
                                        : 'bg-slate-50 border-2 border-transparent text-slate-200 cursor-not-allowed opacity-40 select-none'
                                        }`}
                                >
                                    {slot.time}
                                </button>
                            )) : (
                                <div className="col-span-3 text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <p className="text-gray-400 font-bold">Bu tarih için çalışma saatleri dışında kalıyor.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 5: Confirmation */}
                {step === 5 && (
                    <div className="animate-in slide-in-from-right duration-300 fade-in text-center">
                        <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between z-50 border-b border-slate-50">
                            <button onClick={handleBack} className="flex items-center gap-1 text-slate-400 font-bold text-sm">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                <span>Saat Seç</span>
                            </button>
                            <h2 className="font-black text-slate-900 tracking-tight">{company.name}</h2>
                            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                            </div>
                        </header>

                        <div className="pt-2 pb-6">
                            <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-200 ring-4 ring-emerald-50">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h2 className="text-xl font-black text-slate-900 mb-6 px-4 leading-tight">Randevunuzu neredeyse<br />onaylamak üzereyiz!</h2>

                            <div className="bg-white rounded-[2rem] p-1 border border-slate-100 shadow-xl shadow-slate-200/50 mb-6 mx-1 overflow-hidden">
                                <div className="p-4 flex items-center gap-4 bg-slate-50/50">
                                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-xl font-black text-slate-400">
                                        {selectedStaffUser?.first_name[0]}
                                    </div>
                                    <div className="text-left flex-1">
                                        <h3 className="font-black text-slate-900 text-base uppercase tracking-tight">{selectedStaffUser?.first_name} {selectedStaffUser?.last_name}</h3>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{selectedService?.name}</p>
                                    </div>
                                    <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                </div>
                                <div className="p-4 text-left border-t border-slate-100">
                                    <p className="text-slate-500 font-bold mb-0.5 text-xs capitalize">
                                        {new Date(selection.date!).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
                                    </p>
                                    <p className="text-2xl font-black text-slate-900 tracking-tight">{selection.time}</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4 text-left px-2">
                                <div className="space-y-3">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={selection.customerName}
                                            onChange={e => setSelection({ ...selection, customerName: e.target.value })}
                                            className="w-full p-4 bg-white rounded-2xl border-2 border-slate-100 font-bold text-slate-900 focus:outline-none focus:border-indigo-500 shadow-sm transition-all text-sm"
                                            placeholder="Adınız Soyadınız (Opsiyonel)"
                                        />
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="tel"
                                            value={selection.customerPhone}
                                            onChange={e => setSelection({ ...selection, customerPhone: e.target.value })}
                                            className="w-full p-4 bg-white rounded-2xl border-2 border-slate-100 font-bold text-slate-900 focus:outline-none focus:border-indigo-500 shadow-sm transition-all text-sm"
                                            placeholder="Telefon Numaranız (Opsiyonel)"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 px-2">
                                    <div className="flex items-start gap-4 group">
                                        <div className="w-5 h-5 rounded-full border-2 border-orange-500 flex-shrink-0 mt-0.5 group-hover:bg-orange-50 transition-colors"></div>
                                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">Numaranız randevu detaylarını paylaşmak için kullanılacaktır!</p>
                                    </div>
                                    <label className="flex items-center gap-4 cursor-pointer group">
                                        <input type="checkbox" className="hidden peer" defaultChecked />
                                        <div className="w-5 h-5 rounded-md border-2 border-slate-200 peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-all flex items-center justify-center">
                                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <span className="text-[11px] text-slate-400 font-medium uppercase tracking-tight">SMS ile bildirim almak istiyorum</span>
                                    </label>
                                </div>

                                <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-5 rounded-3xl font-black text-base uppercase tracking-widest shadow-2xl shadow-orange-200 active:scale-95 transition-all mt-6">
                                    Randevuyu Onayla
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Footer / Troubleshooting */}
                <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col items-center gap-4">
                    <button
                        onClick={() => {
                            if (window.confirm('Veriler sıfırlanacak. Devam edilsin mi?')) {
                                localStorage.clear();
                                window.location.reload();
                            }
                        }}
                        className="text-[10px] font-bold text-gray-300 uppercase tracking-widest hover:text-pink-500 transition-colors"
                    >
                        Sistemi Sıfırla
                    </button>
                    <div className="flex items-center gap-2 grayscale opacity-30">
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse"></div>
                        <span className="text-[9px] text-gray-400 font-bold tracking-tighter uppercase whitespace-nowrap">ID: {id} | Staff: {staff.length} | Svc: {services.length} | v1.7.3</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
