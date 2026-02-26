import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { Appointment, Service, Company, User } from '../types';
import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';

interface SelectionState {
    staffId: number | null;
    serviceId: number | null;
    serviceIds: number[];
    packageId: number | null;
    date: string | null;
    time: string | null;
    customerName: string;
    customerPhone: string;
}

export default function BookingPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [company, setCompany] = useState<Company | null>(null);
    const [staff, setStaff] = useState<User[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [packages, setPackages] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    // Form Steps: Dynamic based on company.booking_flow
    // 4-char code like SPDT, DSPT, PDST, etc. + step 5 = confirm
    const initialStaffId = searchParams.get('staff') ? Number(searchParams.get('staff')) : null;
    const [step, setStep] = useState(1);

    // Step content mapping based on booking_flow
    const getStepContent = (stepNum: number): 'service' | 'staff' | 'date' | 'time' | 'confirm' => {
        if (stepNum === 5) return 'confirm';
        const flow = company?.booking_flow || 'SPDT';
        const codeToKey: Record<string, 'service' | 'staff' | 'date' | 'time'> = { 'S': 'service', 'P': 'staff', 'D': 'date', 'T': 'time' };

        let steps: ('service' | 'staff' | 'date' | 'time')[];
        if (flow.length === 4) {
            steps = flow.split('').map(c => codeToKey[c] || 'service');
        } else {
            // Legacy 3-char codes
            const legacy: Record<string, ('service' | 'staff' | 'date' | 'time')[]> = {
                'SHP': ['service', 'staff', 'date', 'time'],
                'SDP': ['service', 'date', 'staff', 'time'],
                'SDT': ['service', 'date', 'time', 'staff'],
            };
            steps = legacy[flow] || ['service', 'staff', 'date', 'time'];
        }

        return steps[stepNum - 1] || 'service';
    };

    // Get step number for a given content type
    const getStepNumber = (content: 'service' | 'staff' | 'date' | 'time' | 'confirm'): number => {
        if (content === 'confirm') return 5;
        for (let i = 1; i <= 4; i++) {
            if (getStepContent(i) === content) return i;
        }
        return 1;
    };

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

    const [selection, setSelection] = useState<SelectionState>({
        staffId: initialStaffId,
        serviceId: null,
        serviceIds: [],
        packageId: null as number | null,
        date: null,
        time: null,
        customerName: '',
        customerPhone: ''
    });

    const dateInputRef = useRef<HTMLInputElement>(null);
    const firstAvailableTimeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (step === 4 && firstAvailableTimeRef.current) {
            setTimeout(() => {
                firstAvailableTimeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [step]);

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
                console.log('[BookingPage v1.9.3] Company data:', JSON.stringify({
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

                // 2. Services & Packages
                try {
                    const [servicesRes, packagesRes] = await Promise.all([
                        api.get('/services', { params: { company_id: id } }),
                        api.get('/packages', { params: { company_id: id } })
                    ]);
                    setServices(servicesRes.data?.data || []);
                    setPackages(packagesRes.data?.data || []);
                } catch (e) {
                    console.error('Failed to load services or packages', e);
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

    const handleNext = () => {
        const currentContent = getStepContent(step);
        const shouldSkipStaff = !!(selection.packageId || initialStaffId);

        if (currentContent === 'service' && shouldSkipStaff) {
            if (initialStaffId) {
                setSelection(prev => ({ ...prev, staffId: initialStaffId }));
            }
        }

        // Find next step, skipping staff if needed
        let nextStep = step + 1;
        if (shouldSkipStaff && getStepContent(nextStep) === 'staff') {
            nextStep++;
        }
        setStep(nextStep);
    };

    const handleBack = () => {
        const shouldSkipStaff = !!(initialStaffId || selection.packageId);

        let prevStep = step - 1;
        if (shouldSkipStaff && getStepContent(prevStep) === 'staff') {
            prevStep--;
        }
        if (prevStep < 1) prevStep = 1;
        setStep(prevStep);
    };

    const generateTimeSlots = () => {
        if (!company || !selection.date) return [];

        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA');
        const isToday = selection.date === todayStr;
        const currentMin = now.getHours() * 60 + now.getMinutes();

        const [startH, startM] = (company.work_start_time || '09:00').split(':').map(Number);
        const [endH, endM] = (company.work_end_time || '20:00').split(':').map(Number);
        const workBegin = startH * 60 + startM;
        const workEnd = endH * 60 + endM;
        const slotInterval = company.slot_interval || 30;

        const pkg = selection.packageId ? packages.find(p => p.id === selection.packageId) : null;
        const selectedServices = pkg
            ? pkg.services || []
            : services.filter(s => selection.serviceIds.includes(s.id!));

        const totalDuration = pkg
            ? pkg.duration_minutes
            : selectedServices.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);

        if (totalDuration === 0) return [];

        const slots: { time: string; isAvailable: boolean }[] = [];

        // Pre-parse all appointments for the day to avoid repeated parsing
        const dayApps = appointments.filter(a => (a.appointment_date || '').substring(0, 10) === selection.date && a.status !== 'cancelled');

        for (let time = workBegin; time < workEnd; time += slotInterval) {
            const timeStr = `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`;

            // 1. Past check
            if (isToday && (time < currentMin + 5)) {
                slots.push({ time: timeStr, isAvailable: false });
                continue;
            }

            // 2. Work end check
            if (time + totalDuration > workEnd) {
                slots.push({ time: timeStr, isAvailable: false });
                continue;
            }

            let canApplySlot = true;
            let currentOffset = 0;

            if (pkg) {
                // Multi-service sequential staff check
                for (const svc of selectedServices) {
                    const svcStart = time + currentOffset;
                    const svcEnd = svcStart + svc.duration_minutes;

                    // Find available staff for this specific service
                    const availableStaff = staff.filter(s => {
                        // Department filter
                        if (svc.department_id && s.department_id !== svc.department_id) return false;

                        // Check busy
                        const isBusy = dayApps.some(app => {
                            if (Number(app.staff_id) !== Number(s.id)) return false;
                            const [asH, asM] = app.start_time.split(':').map(Number);
                            const [aeH, aeM] = app.end_time.split(':').map(Number);
                            const appStart = asH * 60 + asM;
                            const appEnd = aeH * 60 + aeM;
                            return (svcStart < appEnd && svcEnd > appStart);
                        });
                        return !isBusy;
                    });

                    if (availableStaff.length === 0) {
                        canApplySlot = false;
                        break;
                    }

                    currentOffset += svc.duration_minutes;
                }
            } else {
                // Single staff check (Normal flow or single-staff selection)
                if (!selection.staffId) {
                    // Staff not yet selected - check if ANY staff is available
                    // This happens when time step comes before staff step in the flow
                    const staffStep = getStepNumber('staff');
                    const timeStep = getStepNumber('time');
                    if (staffStep > timeStep || selection.packageId) {
                        const slotEnd = time + totalDuration;
                        // Filter staff by selected service department
                        const relevantStaff = staff.filter(s => {
                            if (selectedServices.length === 1 && selectedServices[0].department_id) {
                                return s.department_id === selectedServices[0].department_id;
                            }
                            return true;
                        });
                        const anyAvailable = relevantStaff.some(s => {
                            const isBusy = dayApps.some(app => {
                                if (Number(app.staff_id) !== Number(s.id)) return false;
                                const [asH, asM] = app.start_time.split(':').map(Number);
                                const [aeH, aeM] = app.end_time.split(':').map(Number);
                                return (time < (aeH * 60 + aeM) && slotEnd > (asH * 60 + asM));
                            });
                            return !isBusy;
                        });
                        if (!anyAvailable) canApplySlot = false;
                    } else {
                        canApplySlot = false;
                    }
                } else {
                    const slotEnd = time + totalDuration;
                    const isBusy = dayApps.some(app => {
                        if (Number(app.staff_id) !== Number(selection.staffId)) return false;
                        const [asH, asM] = app.start_time.split(':').map(Number);
                        const [aeH, aeM] = app.end_time.split(':').map(Number);
                        return (time < (aeH * 60 + aeM) && slotEnd > (asH * 60 + asM));
                    });
                    if (isBusy) canApplySlot = false;
                }
            }

            slots.push({ time: timeStr, isAvailable: canApplySlot });
        }
        return slots;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let duration = 0;
            let totalPrice = 0;
            let finalServices: any[] = [];
            const pkg = selection.packageId ? packages.find(p => p.id === selection.packageId) : null;
            const [h, m] = (selection.time || '00:00').split(':').map(Number);
            const startTimeMins = h * 60 + m;

            // Pre-parse today's appointments for conflict checking
            const dayApps = appointments.filter(a => (a.appointment_date || '').substring(0, 10) === selection.date && a.status !== 'cancelled');

            if (pkg) {
                duration = pkg.duration_minutes;
                totalPrice = Number(pkg.price);
                let currentOffset = 0;

                for (const svc of (pkg.services || [])) {
                    const svcStart = startTimeMins + currentOffset;
                    const svcEnd = svcStart + svc.duration_minutes;

                    // 1. Identify candidates: First the assigned staff, then others in the same department
                    const candidates = staff.filter(s => !svc.department_id || s.department_id === svc.department_id);
                    // Sort to prioritize svc.staff_id if it exists
                    candidates.sort((a, b) => {
                        if (a.id === svc.staff_id) return -1;
                        if (b.id === svc.staff_id) return 1;
                        return 0;
                    });

                    // 2. Find first available candidate
                    let bestStaffId = svc.staff_id || selection.staffId; // Fallback to provided staff or selection
                    for (const candidate of candidates) {
                        const isBusy = dayApps.some(app => {
                            if (Number(app.staff_id) !== Number(candidate.id)) return false;
                            const [asH, asM] = app.start_time.split(':').map(Number);
                            const [aeH, aeM] = app.end_time.split(':').map(Number);
                            const appStart = asH * 60 + asM;
                            const appEnd = aeH * 60 + aeM;
                            return (svcStart < appEnd && svcEnd > appStart);
                        });
                        if (!isBusy) {
                            bestStaffId = candidate.id;
                            break;
                        }
                    }

                    finalServices.push({
                        service_id: svc.id,
                        staff_id: bestStaffId
                    });
                    currentOffset += svc.duration_minutes;
                }
            } else {
                const selectedServices = services.filter(s => selection.serviceIds.includes(s.id!));
                duration = selectedServices.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
                totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
                finalServices = selection.serviceIds.map(sid => ({
                    service_id: sid,
                    staff_id: selection.staffId
                }));
            }

            const newEnd = startTimeMins + duration;
            const endTime = `${String(Math.floor(newEnd / 60)).padStart(2, '0')}:${String(newEnd % 60).padStart(2, '0')}`;
            const serviceNames = pkg
                ? pkg.name
                : services.filter(s => selection.serviceIds.includes(s.id!)).map(s => s.name).join(', ');

            // Get Device ID
            let deviceId = undefined;
            try {
                const info = await Device.getId();
                deviceId = info.identifier;
            } catch (e) { }

            const res = await api.post('/appointments', {
                company_id: Number(id),
                staff_id: finalServices[0]?.staff_id || selection.staffId, // Principal staff
                service_id: finalServices[0]?.service_id,
                service_ids: finalServices.map(s => s.service_id),
                package_id: selection.packageId,
                appointment_date: selection.date,
                start_time: selection.time,
                end_time: endTime,
                customer_name: selection.customerName,
                customer_phone: selection.customerPhone,
                notes: `Müşteri: ${selection.customerName} | Tel: ${selection.customerPhone} | ${serviceNames}`,
                price: totalPrice,
                device_id: deviceId,
                status: 'pending',
                services: finalServices
            });
            const newApp = res.data?.data;
            if (newApp && newApp.id) {
                const savedIds = JSON.parse(localStorage.getItem('my_appointment_ids') || '[]');
                if (!savedIds.includes(newApp.id)) {
                    savedIds.push(newApp.id);
                    localStorage.setItem('my_appointment_ids', JSON.stringify(savedIds));
                }
            }

            // Phone is optional - if provided, save for backward compatibility only
            if (selection.customerPhone) {
                localStorage.setItem('customer_phone', selection.customerPhone);
            }

            // Request notification permission if not already granted
            if ("Notification" in window && Notification.permission === "default") {
                Notification.requestPermission();
            }

            alert('Randevu talebiniz alındı! Talebiniz onaylandığında size bildirim gönderilecektir. "Randevularım" sayfasından takip edebilirsiniz.');
            navigate('/ekuafor/my-appointments');
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
            <p className="text-[10px] text-gray-300 mt-10 uppercase tracking-widest">ID: {id} | v1.69</p>
        </div>
    );

    const selectedStaffUser = staff.find(u => (u.id === selection.staffId) || ((u as any).user_id === selection.staffId));
    let totalPrice = 0;
    let selectedSvsNames = '';
    if (selection.packageId) {
        const pkg = packages.find(p => p.id === selection.packageId);
        totalPrice = Number(pkg?.price || 0);
        selectedSvsNames = pkg?.name || '';
    } else {
        const selectedSvs = services.filter(s => selection.serviceIds.includes(s.id!));
        totalPrice = selectedSvs.reduce((sum, s) => sum + Number(s.price), 0);
        selectedSvsNames = selectedSvs.map(s => s.name).join(', ');
    }

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

                {/* Step 1: Service/Package Selection */}
                {getStepContent(step) === 'service' && (
                    <div className="animate-in slide-in-from-right duration-300 fade-in pb-32">
                        <h2 className="text-2xl font-black text-gray-900 mb-2">Hizmet Seçimi</h2>

                        <div className="flex gap-4 mb-6">
                            <button
                                onClick={() => setSelection({ ...selection, packageId: null })}
                                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${!selection.packageId ? 'bg-[#b45309] text-white shadow-lg shadow-orange-500/20' : 'bg-white text-slate-400 border border-slate-100'}`}
                            >
                                Tekli Hizmetler
                            </button>
                            <button
                                onClick={() => setSelection({ ...selection, serviceIds: [], packageId: packages[0]?.id || null })}
                                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${selection.packageId ? 'bg-[#b45309] text-white shadow-lg shadow-orange-500/20' : 'bg-white text-slate-400 border border-slate-100'}`}
                            >
                                Avantajlı Paketler
                            </button>
                        </div>

                        {!selection.packageId ? (
                            <div className="space-y-3">
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4 ml-2">İstediğiniz hizmetleri seçin</p>
                                {services.map(s => {
                                    const isSelected = selection.serviceIds.includes(s.id!);
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => {
                                                const newIds = isSelected
                                                    ? selection.serviceIds.filter(id => id !== s.id)
                                                    : [...selection.serviceIds, s.id!];
                                                setSelection({ ...selection, serviceIds: newIds });
                                            }}
                                            className={`w-full p-5 rounded-[2rem] border-2 transition-all flex items-center gap-4 text-left ${isSelected ? 'bg-indigo-50 border-indigo-500 shadow-lg' : 'bg-white border-transparent shadow-sm'}`}
                                        >
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-slate-200'}`}>
                                                {isSelected && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className={`font-black text-sm uppercase tracking-tight ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>{s.name}</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.duration_minutes} dakika {s.department_name ? `• ${s.department_name}` : ''}</p>
                                            </div>
                                            <div className={`font-black text-base ${isSelected ? 'text-indigo-600' : 'text-slate-900'}`}>₺{s.price}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4 ml-2">Size özel hazırlanmış paketler</p>
                                {packages.map(p => {
                                    const isSelected = selection.packageId === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => setSelection({ ...selection, packageId: p.id, serviceIds: [] })}
                                            className={`w-full p-6 rounded-[2.5rem] border-2 transition-all text-left relative overflow-hidden ${isSelected ? 'bg-amber-50 border-amber-500 shadow-xl' : 'bg-white border-transparent shadow-sm'}`}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-0 right-0 bg-amber-500 text-white px-4 py-1 rounded-bl-2xl text-[8px] font-black uppercase tracking-widest shadow-lg">SEÇİLDİ</div>
                                            )}
                                            <h3 className={`font-black text-lg uppercase tracking-tight mb-1 ${isSelected ? 'text-amber-900' : 'text-slate-900'}`}>{p.name}</h3>
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                {p.services?.map((ps: any) => (
                                                    <span key={ps.id} className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase ${isSelected ? 'bg-amber-200/50 text-amber-700' : 'bg-slate-50 text-slate-400'}`}>
                                                        {ps.name}
                                                    </span>
                                                ))}
                                            </div>
                                            {p.staff_first_name && (
                                                <p className="text-[9px] font-bold text-slate-400 mb-3 uppercase tracking-widest">👤 Personel: {p.staff_first_name} {p.staff_last_name}</p>
                                            )}
                                            <div className="flex items-center justify-between mt-auto">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.duration_minutes} DK</span>
                                                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.services?.length || 0} HİZMET</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    {(() => {
                                                        const standardTotal = p.services?.reduce((sum: number, ps: any) => {
                                                            const globalSvc = services.find(s => s.id === ps.id);
                                                            return sum + Number(globalSvc?.price || ps.price || 0);
                                                        }, 0) || 0;
                                                        if (standardTotal > Number(p.price)) {
                                                            return (
                                                                <span className="text-[10px] font-bold text-slate-400 line-through mb-0.5">₺{standardTotal}</span>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                    <div className="text-xl font-black text-amber-600">₺{p.price}</div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Sticky Next Button */}
                        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent z-50">
                            <button
                                disabled={selection.serviceIds.length === 0 && !selection.packageId}
                                onClick={handleNext}
                                className="w-full max-w-md mx-auto block bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl disabled:opacity-30 disabled:grayscale transition-all hover:bg-indigo-600 active:scale-95"
                            >
                                Devam Et {selection.packageId ? '(Paket Seçildi)' : selection.serviceIds.length > 0 ? `(${selection.serviceIds.length} Hizmet)` : ''}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Staff Selection */}
                {getStepContent(step) === 'staff' && (
                    <div className="animate-in slide-in-from-right duration-300 fade-in">
                        <button onClick={handleBack} className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 hover:text-gray-600">← Geri</button>
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Personel Seçimi</h2>
                        <div className="space-y-3">
                            {staff.filter(u => {
                                // Filter by department if a single service is selected or a package has a department
                                if (selection.packageId) {
                                    const pkg = packages.find(p => p.id === selection.packageId);
                                    if (pkg?.department_id) {
                                        return u.department_id === pkg.department_id;
                                    }
                                } else if (selection.serviceIds.length === 1) {
                                    const svc = services.find(s => s.id === selection.serviceIds[0]);
                                    if (svc?.department_id) {
                                        return u.department_id === svc.department_id;
                                    }
                                }
                                return true;
                            }).map(u => (
                                <button
                                    key={u.id || (u as any).user_id}
                                    onClick={() => {
                                        setSelection({ ...selection, staffId: u.id || (u as any).user_id });
                                        handleNext();
                                    }}
                                    className="w-full bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all flex items-center gap-5 text-left group active:scale-[0.98]"
                                >
                                    <div className="w-16 h-16 bg-slate-50 text-[#1e1b4b] rounded-2xl flex items-center justify-center font-black text-xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner overflow-hidden">
                                        {u.photo ? (
                                            <img src={u.photo} alt={u.first_name} className="w-full h-full object-cover" />
                                        ) : (
                                            u.first_name[0]
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-slate-900 text-lg group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{u.first_name} {u.last_name}</h3>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">{u.department_name || (u.role === 'company_admin' ? 'Baş Uzman' : 'Uzman')}</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 3: Date Selection */}
                {getStepContent(step) === 'date' && (
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
                {getStepContent(step) === 'time' && (
                    <div className="animate-in slide-in-from-right duration-300 fade-in">
                        <button onClick={handleBack} className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 hover:text-gray-600">← Geri</button>
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Saat Seçimi</h2>
                        <div className="grid grid-cols-3 gap-3">
                            {(() => {
                                const slots = generateTimeSlots();
                                if (slots.length === 0) {
                                    return (
                                        <div className="col-span-3 text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                            <p className="text-gray-400 font-bold">Bu tarih için çalışma saatleri dışında kalıyor.</p>
                                        </div>
                                    );
                                }

                                let foundFirst = false;
                                return slots.map(slot => {
                                    const isFirstActive = !foundFirst && slot.isAvailable;
                                    if (isFirstActive) foundFirst = true;

                                    return (
                                        <button
                                            key={slot.time}
                                            ref={isFirstActive ? firstAvailableTimeRef : null}
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
                                    );
                                });
                            })()}
                        </div>
                    </div>
                )}

                {/* Step 5: Confirmation */}
                {getStepContent(step) === 'confirm' && (
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
                                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                            {selectedSvsNames}
                                        </p>
                                        <p className="text-indigo-600 text-xs font-black mt-1">₺{totalPrice}</p>
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
                        <span className="text-[9px] text-gray-400 font-bold tracking-tighter uppercase whitespace-nowrap">ID: {id} | Staff: {staff.length} | Svc: {services.length} | v1.9.6</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
