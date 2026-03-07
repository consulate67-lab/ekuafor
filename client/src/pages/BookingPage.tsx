import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { Appointment, Service, Company, User } from '../types';
import { useAuthStore } from '../store/authStore';
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
    // --- 1. HOOKS (ALWAYS CALLED FIRST AND UNCONDITIONALLY) ---

    const { isAuthenticated, user } = useAuthStore();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [company, setCompany] = useState<Company | null>(null);
    const [staff, setStaff] = useState<User[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [packages, setPackages] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    const initialStaffId = searchParams.get('staff') ? Number(searchParams.get('staff')) : null;
    const [step, setStep] = useState(1);

    const [selection, setSelection] = useState<SelectionState>({
        staffId: initialStaffId,
        serviceId: null,
        serviceIds: [],
        packageId: null as number | null,
        date: null,
        time: null,
        customerName: user ? `${user.first_name} ${user.last_name || ''}`.trim() : '',
        customerPhone: user?.phone || ''
    });

    const dateInputRef = useRef<HTMLInputElement>(null);
    const firstAvailableTimeRef = useRef<HTMLButtonElement>(null);

    const steps = useMemo(() => {
        const flow = company?.booking_flow || 'SPDT';
        const codeToKey: Record<string, 'service' | 'staff' | 'date' | 'time'> = { 'S': 'service', 'P': 'staff', 'D': 'date', 'T': 'time' };
        let s: ('service' | 'staff' | 'date' | 'time')[];
        const legacy: Record<string, ('service' | 'staff' | 'date' | 'time')[]> = {
            'SHP': ['service', 'staff', 'date', 'time'],
            'SDP': ['service', 'date', 'staff', 'time'],
            'SDT': ['service', 'date', 'time', 'staff'],
        };
        if (flow.length === 4) {
            s = flow.split('').map(c => codeToKey[c] || 'service');
        } else {
            s = legacy[flow] || ['service', 'staff', 'date', 'time'];
        }
        return s;
    }, [company?.booking_flow]);

    const getStepContent = useCallback((stepNum: number): 'service' | 'staff' | 'date' | 'time' | 'confirm' => {
        if (stepNum === 5) return 'confirm';
        return steps[stepNum - 1] || 'service';
    }, [steps]);

    const getStepNumber = useCallback((content: 'service' | 'staff' | 'date' | 'time' | 'confirm'): number => {
        if (content === 'confirm') return 5;
        const idx = steps.indexOf(content as any);
        return idx !== -1 ? idx + 1 : 1;
    }, [steps]);

    const staffBusyMap = useMemo(() => {
        if (!selection.date || appointments.length === 0) return new Map<number, { start: number, end: number }[]>();
        const map = new Map<number, { start: number, end: number }[]>();
        const dayApps = appointments.filter(a => (a.appointment_date || '').substring(0, 10) === selection.date && a.status !== 'cancelled');
        dayApps.forEach(app => {
            const [asH, asM] = app.start_time.split(':').map(Number);
            const [aeH, aeM] = app.end_time.split(':').map(Number);
            const start = asH * 60 + asM;
            const end = aeH * 60 + aeM;
            const sId = Number(app.staff_id);
            if (!map.has(sId)) map.set(sId, []);
            map.get(sId)!.push({ start, end });
        });
        return map;
    }, [appointments, selection.date]);

    const timeSlots = useMemo(() => {
        if (!company || !selection.date || (services.length === 0 && packages.length === 0)) return [];
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
        const selectedServices = pkg ? pkg.services || [] : services.filter(s => selection.serviceIds.includes(s.id!));
        const totalDuration = pkg ? pkg.duration_minutes : selectedServices.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
        if (totalDuration === 0) return [];
        const slots: { time: string; isAvailable: boolean }[] = [];
        for (let time = workBegin; time < workEnd; time += slotInterval) {
            const timeStr = `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`;
            if (isToday && (time < currentMin + 5)) { slots.push({ time: timeStr, isAvailable: false }); continue; }
            if (time + totalDuration > workEnd) { slots.push({ time: timeStr, isAvailable: false }); continue; }
            let canApplySlot = true;
            if (pkg) {
                let currentOffset = 0;
                for (const svc of selectedServices) {
                    const svcStart = time + currentOffset;
                    const svcEnd = svcStart + svc.duration_minutes;
                    const availableStaff = staff.filter(s => {
                        if (svc.department_id && s.department_id !== svc.department_id) return false;
                        const busyRanges = staffBusyMap.get(Number(s.id)) || [];
                        const isBusy = busyRanges.some(r => svcStart < r.end && svcEnd > r.start);
                        return !isBusy;
                    });
                    if (availableStaff.length === 0) { canApplySlot = false; break; }
                    currentOffset += svc.duration_minutes;
                }
            } else {
                const slotEnd = time + totalDuration;
                if (!selection.staffId) {
                    const staffStep = getStepNumber('staff');
                    const timeStep = getStepNumber('time');
                    if (staffStep > timeStep) {
                        const relevantStaff = staff.filter(s => {
                            if (selectedServices.length === 1 && selectedServices[0].department_id) { return s.department_id === selectedServices[0].department_id; }
                            return true;
                        });
                        canApplySlot = relevantStaff.some(s => {
                            const busyRanges = staffBusyMap.get(Number(s.id)) || [];
                            return !busyRanges.some(r => time < r.end && slotEnd > r.start);
                        });
                    } else { canApplySlot = false; }
                } else {
                    const busyRanges = staffBusyMap.get(Number(selection.staffId)) || [];
                    canApplySlot = !busyRanges.some(r => time < r.end && slotEnd > r.start);
                }
            }
            slots.push({ time: timeStr, isAvailable: canApplySlot });
        }
        return slots;
    }, [company, selection.date, selection.staffId, selection.serviceIds, selection.packageId, services, packages, staff, staffBusyMap, getStepNumber]);

    const selectedStaffUser = useMemo(() => staff.find(u => (u.id === selection.staffId) || ((u as any).user_id === selection.staffId)), [staff, selection.staffId]);

    const totals = useMemo(() => {
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
        return { totalPrice, selectedSvsNames };
    }, [selection.packageId, selection.serviceIds, packages, services]);

    const { totalPrice, selectedSvsNames } = totals;

    const handleSubmit = useCallback(async (e?: React.FormEvent, customSelection?: SelectionState) => {
        if (e) e.preventDefault();
        const currentSel = customSelection || selection;
        try {
            let duration = 0;
            let finalPrice = 0;
            let finalServices: any[] = [];
            const pkg = currentSel.packageId ? packages.find(p => p.id === currentSel.packageId) : null;
            const [h, m] = (currentSel.time || '00:00').split(':').map(Number);
            const startTimeMins = h * 60 + m;
            const dayApps = appointments.filter(a => (a.appointment_date || '').substring(0, 10) === currentSel.date && a.status !== 'cancelled');
            if (pkg) {
                duration = pkg.duration_minutes;
                finalPrice = Number(pkg.price);
                let currentOffset = 0;
                for (const svc of (pkg.services || [])) {
                    const svcStart = startTimeMins + currentOffset;
                    const svcEnd = svcStart + svc.duration_minutes;
                    const candidates = staff.filter(s => !svc.department_id || s.department_id === svc.department_id);
                    candidates.sort((a, b) => { if (a.id === svc.staff_id) return -1; if (b.id === svc.staff_id) return 1; return 0; });
                    let bestStaffId = svc.staff_id || currentSel.staffId;
                    for (const candidate of candidates) {
                        const isBusy = dayApps.some(app => {
                            if (Number(app.staff_id) !== Number(candidate.id)) return false;
                            const [asH, asM] = app.start_time.split(':').map(Number);
                            const [aeH, aeM] = app.end_time.split(':').map(Number);
                            return (svcStart < (aeH * 60 + aeM) && svcEnd > (asH * 60 + asM));
                        });
                        if (!isBusy) { bestStaffId = candidate.id; break; }
                    }
                    finalServices.push({ service_id: svc.id, staff_id: bestStaffId });
                    currentOffset += svc.duration_minutes;
                }
            } else {
                const selectedServices = services.filter(s => currentSel.serviceIds.includes(s.id!));
                duration = selectedServices.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
                finalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
                finalServices = currentSel.serviceIds.map(sid => ({ service_id: sid, staff_id: currentSel.staffId }));
            }
            const endTime = `${String(Math.floor((startTimeMins + duration) / 60)).padStart(2, '0')}:${String((startTimeMins + duration) % 60).padStart(2, '0')}`;
            const serviceNames = pkg ? pkg.name : services.filter(s => currentSel.serviceIds.includes(s.id!)).map(s => s.name).join(', ');
            let deviceId = undefined;
            try { const info = await Device.getId(); deviceId = info.identifier; } catch (e) { }
            const cachedPhone = localStorage.getItem('customer_phone');
            const finalPhone = user?.phone || cachedPhone || currentSel.customerPhone;
            const res = await api.post('/appointments', {
                company_id: Number(id),
                staff_id: finalServices[0]?.staff_id || currentSel.staffId,
                service_id: finalServices[0]?.service_id,
                service_ids: finalServices.map(s => s.service_id),
                package_id: currentSel.packageId,
                appointment_date: currentSel.date,
                start_time: currentSel.time,
                end_time: endTime,
                customer_name: currentSel.customerName,
                customer_phone: finalPhone,
                notes: `Müşteri: ${currentSel.customerName} | Tel: ${finalPhone} | ${serviceNames}`,
                price: finalPrice,
                device_id: deviceId,
                status: 'pending',
                services: finalServices
            });
            if (res.data.success) {
                const newApp = res.data?.data;
                if (newApp?.id) {
                    const savedIds = JSON.parse(localStorage.getItem('my_appointment_ids') || '[]');
                    if (!savedIds.includes(newApp.id)) { savedIds.push(newApp.id); localStorage.setItem('my_appointment_ids', JSON.stringify(savedIds)); }
                }
                if (finalPhone && !cachedPhone) { localStorage.setItem('customer_phone', finalPhone); }
                if (deviceId && finalPhone) { try { await api.post('/appointments/customers/sync', { device_id: deviceId, customer_phone: finalPhone, push_token: localStorage.getItem('push_token') }); } catch (syncErr) { } }
                localStorage.removeItem('pending_booking');
                navigate('/my-appointments', { replace: true });
            }
        } catch (err: any) { console.error('Booking failed', err); alert('Hata: ' + (err.response?.data?.error || err.message)); }
    }, [id, appointments, packages, services, staff, selection, user, navigate]);

    useEffect(() => {
        const backHandler = App.addListener('backButton', () => {
            if (step > 1) {
                if (step === 2 && initialStaffId) { navigate(-1); } else { setStep(prev => prev - 1); }
            } else { navigate(-1); }
        });
        return () => { backHandler.then(h => h.remove()); };
    }, [step, navigate, initialStaffId]);

    useEffect(() => {
        if (user) {
            setSelection(prev => ({
                ...prev,
                customerName: prev.customerName || `${user.first_name} ${user.last_name || ''}`.trim(),
                customerPhone: prev.customerPhone || user.phone || ''
            }));
        }
    }, [user]);

    useEffect(() => {
        const checkPendingBooking = async () => {
            const pendingStr = localStorage.getItem('pending_booking');
            if (pendingStr && isAuthenticated) {
                try {
                    const pendingData = JSON.parse(pendingStr);
                    if (pendingData.companyId === id && pendingData.selection) {
                        localStorage.removeItem('pending_booking');
                        setSelection(pendingData.selection);
                        setStep(5);
                        setTimeout(() => { handleSubmit(undefined, pendingData.selection); }, 500);
                    }
                } catch (e) { console.error('Failed to parse pending booking', e); }
            }
        };
        checkPendingBooking();
    }, [isAuthenticated, id, handleSubmit]);

    useEffect(() => {
        if (step === 4 && firstAvailableTimeRef.current) {
            setTimeout(() => { firstAvailableTimeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
        }
    }, [step]);

    useEffect(() => {
        if (step === 3 && dateInputRef.current) {
            setTimeout(() => { try { dateInputRef.current?.showPicker(); } catch (e) { console.log('showPicker not supported', e); } }, 300);
        }
    }, [step]);

    useEffect(() => {
        const fetchCompanyData = async () => {
            try {
                const compRes = await api.get(`/companies/${id}`);
                const companyData = compRes.data.data;
                setCompany(companyData);
                if (searchParams.get('ref') === 'qr' && id) {
                    const companyId = Number(id);
                    const savedFavs = localStorage.getItem('saloon_favorites');
                    let favorites: number[] = savedFavs ? JSON.parse(savedFavs) : [];
                    if (!favorites.includes(companyId)) { favorites.push(companyId); localStorage.setItem('saloon_favorites', JSON.stringify(favorites)); }
                }
                const [servicesRes, packagesRes] = await Promise.all([
                    api.get('/services', { params: { company_id: id } }),
                    api.get('/packages', { params: { company_id: id } })
                ]);
                setServices(servicesRes.data?.data || []);
                setPackages(packagesRes.data?.data || []);
                const usersRes = await api.get(`/companies/${id}/employees`);
                setStaff(usersRes.data?.data || []);
                const today = new Date().toLocaleDateString('en-CA');
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + 60);
                const endDate = futureDate.toLocaleDateString('en-CA');
                const appsRes = await api.get('/appointments', { params: { company_id: id, start_date: today, end_date: endDate } });
                setAppointments(appsRes.data?.data || []);
            } catch (err: any) { console.error('Critical failure in booking data', err); } finally { setLoading(false); }
        };
        fetchCompanyData();
    }, [id, searchParams]);

    const handleNext = useCallback(() => {
        const currentContent = getStepContent(step);
        const shouldSkipStaff = !!(selection.packageId || initialStaffId);
        if (currentContent === 'service' && shouldSkipStaff) {
            if (initialStaffId) { setSelection(prev => ({ ...prev, staffId: initialStaffId })); }
        }
        let nextStep = step + 1;
        if (shouldSkipStaff && getStepContent(nextStep) === 'staff') { nextStep++; }
        setStep(nextStep);
    }, [step, selection.packageId, initialStaffId, getStepContent]);

    const handleBack = useCallback(() => {
        const shouldSkipStaff = !!(initialStaffId || selection.packageId);
        let prevStep = step - 1;
        if (shouldSkipStaff && getStepContent(prevStep) === 'staff') { prevStep--; }
        if (prevStep < 1) prevStep = 1;
        setStep(prevStep);
    }, [step, selection.packageId, initialStaffId, getStepContent]);

    // --- 2. RENDER (CRITICAL: ALL HOOKS ABOVE THIS POINT) ---

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {loading ? (
                <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-pink-100 border-t-pink-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p>Yükleniyor...</p>
                    </div>
                </div>
            ) : !company ? (
                <div className="min-h-screen flex items-center justify-center flex-col gap-4 p-6 text-center">
                    <h2 className="text-xl font-bold">Firma Bulunamadı</h2>
                    <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-6 py-2 rounded-xl mt-4">Tekrar Dene</button>
                    <p className="text-xs text-gray-400 mt-10 uppercase tracking-widest">ID: {id}</p>
                </div>
            ) : (
                <>
                    <header className="bg-white p-4 shadow-sm text-center sticky top-0 z-10">
                        <h1 className="text-xl font-bold text-gray-900">{company.name}</h1>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Randevu Oluştur</p>
                    </header>

                    <div className="flex-1 max-w-md mx-auto w-full p-6">
                        <div className="flex gap-2 mb-8">
                            {[1, 2, 3, 4, 5].map(s => (
                                <div key={s} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${s <= step ? 'bg-[#b45309]' : 'bg-gray-200'}`}></div>
                            ))}
                        </div>

                        {getStepContent(step) === 'service' && (
                            <div className="animate-in slide-in-from-right duration-300 fade-in pb-32">
                                <h2 className="text-2xl font-black text-gray-900 mb-2">{company?.service_label || 'Hizmet'} Seçimi</h2>
                                <div className="flex gap-4 mb-6">
                                    <button onClick={() => setSelection({ ...selection, packageId: null })} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-2xl ${!selection.packageId ? 'bg-[#b45309] text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>Tekli Hizmetler</button>
                                    <button onClick={() => setSelection({ ...selection, serviceIds: [], packageId: packages[0]?.id || null })} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-2xl ${selection.packageId ? 'bg-[#b45309] text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>Avantajlı Paketler</button>
                                </div>
                                {!selection.packageId ? (
                                    <div className="space-y-3">
                                        {services.map(s => {
                                            const isSelected = selection.serviceIds.includes(s.id!);
                                            return (
                                                <button key={s.id} onClick={() => {
                                                    const newIds = isSelected ? selection.serviceIds.filter(idx => idx !== s.id) : [...selection.serviceIds, s.id!];
                                                    setSelection({ ...selection, serviceIds: newIds });
                                                }} className={`w-full p-5 rounded-[2rem] border-2 flex items-center gap-4 text-left ${isSelected ? 'bg-indigo-50 border-indigo-500 shadow-lg' : 'bg-white border-transparent shadow-sm'}`}>
                                                    <div className="flex-1">
                                                        <h3 className="font-black text-sm uppercase">{s.name}</h3>
                                                        <p className="text-[10px] font-bold text-slate-400">{s.duration_minutes} dk</p>
                                                    </div>
                                                    <div className="font-black text-base">₺{s.price}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {packages.map(p => {
                                            const isSelected = selection.packageId === p.id;
                                            return (
                                                <button key={p.id} onClick={() => setSelection({ ...selection, packageId: p.id, serviceIds: [] })} className={`w-full p-6 rounded-[2.5rem] border-2 text-left relative ${isSelected ? 'bg-amber-50 border-amber-500 shadow-xl' : 'bg-white border-transparent shadow-sm'}`}>
                                                    <h3 className="font-black text-lg uppercase">{p.name}</h3>
                                                    <div className="text-xl font-black text-amber-600">₺{p.price}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent z-50">
                                    <button disabled={selection.serviceIds.length === 0 && !selection.packageId} onClick={handleNext} className="w-full max-w-md mx-auto block bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase shadow-2xl disabled:opacity-30">Devam Et</button>
                                </div>
                            </div>
                        )}

                        {getStepContent(step) === 'staff' && (
                            <div className="animate-in slide-in-from-right duration-300 fade-in">
                                <button onClick={handleBack} className="text-xs font-bold text-gray-400 mb-4">← Geri</button>
                                <h2 className="text-2xl font-black text-gray-900 mb-6">{company?.staff_label || 'Personel'} Seçimi</h2>
                                <div className="space-y-3">
                                    {staff.map(u => (
                                        <button key={u.id} onClick={() => { setSelection({ ...selection, staffId: u.id }); handleNext(); }} className="w-full bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5 text-left active:scale-[0.98]">
                                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-xl">{u.first_name?.[0]}</div>
                                            <div className="flex-1"><h3 className="font-black text-slate-900 text-lg uppercase">{u.first_name} {u.last_name}</h3></div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {getStepContent(step) === 'date' && (
                            <div className="animate-in slide-in-from-right duration-300 fade-in">
                                <button onClick={handleBack} className="text-xs font-bold text-gray-400 mb-4">← Geri</button>
                                <h2 className="text-2xl font-black text-gray-900 mb-6">Tarih Seçimi</h2>
                                <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-100">
                                    <input type="date" ref={dateInputRef} value={selection.date || ''} onChange={(e) => setSelection({ ...selection, date: e.target.value })} className="w-full p-4 border-2 border-slate-100 rounded-2xl mb-4 font-bold" />
                                    <button disabled={!selection.date} onClick={handleNext} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase">Randevu Saati Seç</button>
                                </div>
                            </div>
                        )}

                        {getStepContent(step) === 'time' && (
                            <div className="animate-in slide-in-from-right duration-300 fade-in">
                                <button onClick={handleBack} className="text-xs font-bold text-gray-400 mb-4">← Geri</button>
                                <h2 className="text-2xl font-black text-gray-900 mb-6">Saat Seçimi</h2>
                                <div className="grid grid-cols-3 gap-3">
                                    {timeSlots.map(slot => (
                                        <button key={slot.time} disabled={!slot.isAvailable} onClick={() => { setSelection({ ...selection, time: slot.time }); handleNext(); }} className={`py-4 rounded-2xl font-black text-sm transition-all shadow-sm ${slot.isAvailable ? 'bg-white border-2 border-slate-100 text-[#1e1b4b]' : 'bg-slate-50 text-slate-200'}`}>
                                            {slot.time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {getStepContent(step) === 'confirm' && (
                            <div className="animate-in slide-in-from-right duration-300 fade-in text-center">
                                <h2 className="text-xl font-black text-slate-900 mb-6 leading-tight">Randevunuzu neredeyse onaylamak üzereyiz!</h2>
                                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl mb-6 text-left">
                                    <h3 className="font-black text-slate-900 text-base uppercase">{selectedStaffUser?.first_name} {selectedStaffUser?.last_name}</h3>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase">{selectedSvsNames}</p>
                                    <p className="text-2xl font-black text-slate-900 mt-4">{selection.time}</p>
                                    <p className="text-sm font-bold text-indigo-600">₺{totalPrice}</p>
                                </div>
                                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                                    <input type="text" value={selection.customerName} onChange={e => setSelection({ ...selection, customerName: e.target.value })} className="w-full p-4 bg-white rounded-2xl border-2 border-slate-100 font-bold" placeholder="Adınız Soyadınız" />
                                    {!isAuthenticated && !localStorage.getItem('customer_phone') && (
                                        <input type="tel" value={selection.customerPhone} onChange={e => setSelection({ ...selection, customerPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className="w-full p-4 bg-white rounded-2xl border-2 border-slate-100 font-bold" placeholder="5XX XXX XX XX" required />
                                    )}
                                    <button type="submit" disabled={!isAuthenticated && !localStorage.getItem('customer_phone') && selection.customerPhone.length < 10} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-5 rounded-3xl font-black uppercase shadow-2xl">Randevuyu Onayla</button>
                                </form>
                            </div>
                        )}

                        <div className="mt-12 pt-8 border-t border-gray-100 text-center">
                            <button onClick={() => { if (confirm('Sıfırlansın mı?')) { localStorage.clear(); location.reload(); } }} className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Sistemi Sıfırla</button>
                            <p className="text-[9px] text-gray-300 mt-2 uppercase">v1.9.9 | ID: {id} | {company.name}</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
