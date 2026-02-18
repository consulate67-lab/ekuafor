import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { Appointment, Service, Company, User } from '../types';

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

                // 4. Appointments
                try {
                    const today = new Date().toISOString().split('T')[0];
                    const appsRes = await api.get('/appointments', {
                        params: {
                            company_id: id,
                            start_date: today
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

        const startTime = startH * 60 + startM;
        const endTime = endH * 60 + endM;

        const slots: string[] = [];

        // Find existing appointments for selected staff and date
        const staffApps = appointments.filter(a =>
            (a.staff_id === selection.staffId || !a.staff_id) && // Assuming appointments are linked to staff or company
            a.company_id === Number(id) &&
            a.status !== 'cancelled' &&
            a.appointment_date === selection.date
        );

        // Simple collision detection
        for (let time = startTime; time <= endTime - duration; time += 30) {
            const slotEnd = time + duration;

            const isBusy = staffApps.some(app => {
                const [asH, asM] = app.start_time.split(':').map(Number);
                const [aeH, aeM] = app.end_time.split(':').map(Number);
                const appStart = asH * 60 + asM;
                const appEnd = aeH * 60 + aeM;

                return (time < appEnd && slotEnd > appStart); // Overlap condition
            });

            if (!isBusy) {
                const h = Math.floor(time / 60);
                const m = time % 60;
                slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
            }
        }
        return slots;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const service = services.find(s => s.id === selection.serviceId);
            const duration = service?.duration_minutes || 30;
            const [h, m] = (selection.time || '00:00').split(':').map(Number);
            const totalMin = h * 60 + m + duration;
            const endH = Math.floor(totalMin / 60);
            const endM = totalMin % 60;
            const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

            await api.post('/appointments', {
                company_id: Number(id),
                staff_id: selection.staffId,
                service_id: selection.serviceId,
                appointment_date: selection.date,
                start_time: selection.time,
                end_time: endTime,
                customer_name: selection.customerName,
                notes: `Müşteri: ${selection.customerName} | Tel: ${selection.customerPhone}`,
                status: 'pending'
            });

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
                    className="w-full bg-pink-600 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
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
                        <div key={s} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${s <= step ? 'bg-pink-600' : 'bg-gray-200'}`}></div>
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
                                    className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-pink-200 transition-all flex items-center gap-4 text-left"
                                >
                                    <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-full flex items-center justify-center font-bold text-lg">
                                        {u.first_name[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{u.first_name} {u.last_name}</h3>
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{u.role === 'company_admin' ? 'Yönetici' : 'Uzman'}</p>
                                    </div>
                                    <div className="ml-auto text-gray-300">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
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
                                    <div className="font-black text-pink-600">₺{s.price}</div>
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
                        <input
                            ref={dateInputRef} // Add ref
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            value={selection.date || ''}
                            onChange={(e) => {
                                setSelection({ ...selection, date: e.target.value });
                            }}
                            className="w-full p-4 bg-white rounded-2xl border-2 border-gray-100 font-bold text-gray-900 focus:outline-none focus:border-pink-500 transition-colors text-lg mb-4"
                        />
                        <button
                            disabled={!selection.date}
                            onClick={handleNext}
                            className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all ${selection.date ? 'bg-pink-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
                        >
                            Devam Et
                        </button>
                        <p className="text-xs text-gray-400 mt-4 text-center" onClick={() => dateInputRef.current?.showPicker()}>
                            Takvimi açmak için tıklayın
                        </p>
                    </div>
                )}

                {/* Step 4: Time Selection */}
                {step === 4 && (
                    <div className="animate-in slide-in-from-right duration-300 fade-in">
                        <button onClick={handleBack} className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 hover:text-gray-600">← Geri</button>
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Saat Seçimi</h2>
                        <div className="grid grid-cols-3 gap-3">
                            {generateTimeSlots().length > 0 ? generateTimeSlots().map(t => (
                                <button
                                    key={t}
                                    onClick={() => {
                                        setSelection({ ...selection, time: t });
                                        handleNext();
                                    }}
                                    className="py-3 bg-white rounded-xl border border-gray-100 font-bold text-gray-700 hover:bg-pink-600 hover:text-white hover:border-pink-600 transition-all shadow-sm"
                                >
                                    {t}
                                </button>
                            )) : (
                                <div className="col-span-3 text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <p className="text-gray-400 font-bold">Uygun saat bulunamadı.</p>
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
                            <button className="w-full btn-primary py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-pink-500/30 mt-4">
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
                        <span className="text-[9px] text-gray-400 font-bold tracking-tighter uppercase whitespace-nowrap">ID: {id} | Staff: {staff.length} | Svc: {services.length} | v1.43</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
