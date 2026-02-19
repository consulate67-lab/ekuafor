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
            // 1. BUGÜN ise geçmiş saatleri hiç gösterme (5dk buffer)
            if (isToday && time < currentMin + 5) {
                continue; // Geçmiş slot - listeye ekleme
            }

            const slotEnd = time + duration;
            const h = Math.floor(time / 60);
            const m = time % 60;
            const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

            // 2. Çakışma kontrolü - mevcut randevularla kesişen slotlar DOLU (şeffaf)
            // Periyot gridine uyumlu: randevu 13:30-14:15 ise, 13:30 ve 14:00 slotları bloke
            // (çünkü 14:00 slotu randevunun bitiş saati 14:15'ten önce başlıyor)
            const isBusy = staffApps.some(app => {
                const [asH, asM] = app.start_time.split(':').map(Number);
                const [aeH, aeM] = app.end_time.split(':').map(Number);
                const appStart = asH * 60 + asM;
                const appEnd = aeH * 60 + aeM;

                // Bu slot aralığı (time -> slotEnd) mevcut randevuyla çakışıyor mu?
                return (time < appEnd && slotEnd > appStart);
            });

            slots.push({ time: timeStr, isAvailable: !isBusy });
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
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 text-center mb-6">
                            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-inner">
                                📅
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">Tarih Belirleyin</h3>
                            <p className="text-slate-400 text-xs font-medium mb-8">Lütfen size uygun olan günü seçin.</p>

                            <div className="relative mb-6">
                                <input
                                    ref={dateInputRef}
                                    type="date"
                                    min={new Date().toISOString().split('T')[0]}
                                    value={selection.date || ''}
                                    onChange={(e) => {
                                        setSelection({ ...selection, date: e.target.value });
                                    }}
                                    className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 font-black text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors text-center text-lg tracking-widest uppercase cursor-pointer"
                                />
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                            </div>

                            <button
                                disabled={!selection.date}
                                onClick={handleNext}
                                className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all ${selection.date ? 'bg-slate-900 text-white shadow-xl shadow-indigo-950/20 active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                            >
                                Devam Et
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 text-center font-bold uppercase tracking-widest opacity-50">
                            Takvimle etkileşime geçmek için kutucuğa dokunun
                        </p>
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
                                    className={`py-3 rounded-xl border font-bold transition-all shadow-sm ${slot.isAvailable
                                        ? 'bg-white border-gray-100 text-[#1e1b4b] hover:bg-[#1e1b4b] hover:text-white hover:border-[#1e1b4b]'
                                        : 'bg-transparent border-dashed border-gray-200 text-gray-300 cursor-not-allowed opacity-30 select-none'
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
                    <div className="animate-in slide-in-from-right duration-300 fade-in">
                        <button onClick={handleBack} className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 hover:text-gray-600">← Geri</button>
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Bilgilerinizi Girin</h2>

                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-6">
                            <div className="flex justify-between items-center border-b border-gray-50 pb-4 mb-4">
                                <span className="text-xs font-bold text-gray-400 uppercase">Personel</span>
                                <span className="font-bold text-gray-900">{selectedStaffUser?.first_name} {selectedStaffUser?.last_name}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-50 pb-4 mb-4">
                                <span className="text-xs font-bold text-gray-400 uppercase">Hizmet</span>
                                <span className="font-bold text-gray-900">{selectedService?.name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-400 uppercase">Tarih/Saat</span>
                                <span className="font-bold text-gray-900">{selection.date} / {selection.time}</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Adınız Soyadınız</label>
                                <input
                                    required
                                    type="text"
                                    value={selection.customerName}
                                    onChange={e => setSelection({ ...selection, customerName: e.target.value })}
                                    className="w-full p-4 bg-white rounded-xl border-2 border-gray-100 font-bold text-gray-900 focus:outline-none focus:border-pink-500 transition-colors"
                                    placeholder="Örn: Ahmet Yılmaz"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Telefon Numaranız</label>
                                <input
                                    required
                                    type="tel"
                                    value={selection.customerPhone}
                                    onChange={e => setSelection({ ...selection, customerPhone: e.target.value })}
                                    className="w-full p-4 bg-white rounded-xl border-2 border-gray-100 font-bold text-gray-900 focus:outline-none focus:border-pink-500 transition-colors"
                                    placeholder="Örn: 0555 555 55 55"
                                />
                            </div>
                            <button className="w-full btn-primary py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-500/30 mt-4 rounded-xl">
                                Randevuyu Onayla
                            </button>
                        </form>
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
