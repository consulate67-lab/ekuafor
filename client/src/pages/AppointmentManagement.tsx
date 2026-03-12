import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Appointment, Service, Company } from '../types';
import { parseVoiceCommand } from '../lib/aiParser';
import { Device } from '@capacitor/device';

export default function AppointmentManagement() {
    const getLocalDateString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDateKey = (dateStr: any) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [packages, setPackages] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formError, setFormError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAppointment, setNewAppointment] = useState({
        service_id: 0,
        service_ids: [] as number[],
        staff_id: 0,
        appointment_date: getLocalDateString(),
        start_time: '09:00',
        end_time: '10:00',
        customer_name: '',
        customer_phone: '',
        package_id: 0,
        notes: '',
        price: 0,
        serviceStaffOverrides: {} as Record<number, number>,
        servicePriceOverrides: {} as Record<number, number>,
        serviceDurationOverrides: {} as Record<number, number>,
        activeTab: 'services' as 'services' | 'packages'
    });

    const [company, setCompany] = useState<Company | null>(null);
    const [voiceStep, setVoiceStep] = useState<'IDLE' | 'NAME' | 'DATE' | 'TIME' | 'SERVICE' | 'CONFIRM'>('IDLE');
    const [isListening, setIsListening] = useState(false);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [staffMode, setStaffMode] = useState(false);
    const showAllStaff = true;
    const [selectedDate, setSelectedDate] = useState(getLocalDateString());
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const [guidedData, setGuidedData] = useState<any>({});
    const [completionModal, setCompletionModal] = useState<{
        open: boolean;
        app: Appointment | null;
        amount: number;
        technical_notes: string;
    }>({
        open: false,
        app: null,
        amount: 0,
        technical_notes: ''
    });
    const [customerHistory, setCustomerHistory] = useState<Appointment[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

    const speak = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        window.speechSynthesis.speak(utterance);
    };

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const userRes = await api.get('/auth/me');
            const user = userRes.data.data;
            if (!user) throw new Error('Oturum kapalı');

            setUserInfo(user);
            setStaffMode(user.role === 'staff' || user.role === 'admin' || user.role === 'company_admin');

            const compId = user.company_id;
            if (!compId) throw new Error('Firma bilgisi bulunamadı');

            const [compRes, appRes, servRes, packRes, staffRes] = await Promise.all([
                api.get(`/companies/${compId}`),
                api.get('/appointments'), // This uses companyId from token in backend
                api.get('/services', { params: { company_id: compId } }),
                api.get('/packages', { params: { company_id: compId } }),
                api.get(`/companies/${compId}/staff-boards`)
            ]);

            setCompany(compRes.data.data);
            setAppointments(appRes.data.data || []);
            setServices(servRes.data.data || []);
            setPackages(packRes.data.data || []);
            setStaff(staffRes.data.data || []);
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            setError('Veriler yüklenirken hata oluştu: ' + msg);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };





    useEffect(() => {
        fetchData();
    }, []);

    const startVoiceCommand = () => {
        setVoiceStep('NAME');
        setGuidedData({});
        speak('Randevu almak istediğiniz kişinin adı nedir?');
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
        const rules = localStorage.getItem(`ai_rules_${company?.id}`) || '';

        if (step === 'NAME') {
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
            if (!company) return;

            let staffId = undefined;
            const empRes = await api.get(`/companies/${company.id}/employees`);
            const employees = empRes.data?.data || [];
            if (employees.length > 0) {
                const firstEmp = employees[0];
                staffId = firstEmp.user_id || firstEmp.id;
            }

            // Get Device ID
            let deviceId = undefined;
            try {
                const info = await Device.getId();
                deviceId = info.identifier;
            } catch (e) { }

            await api.post('/appointments', {
                company_id: company.id,
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

    const handleWhatsAppNotify = (app: Appointment) => {
        const notes = app.notes || '';
        const phoneMatch = notes.match(/Tel:\s*([\d\s+-]+)/);
        const nameMatch = notes.match(/Müşteri:\s*([^|]+)/);

        let phone = phoneMatch ? phoneMatch[1].replace(/\s+/g, '') : '';
        const customerName = nameMatch ? nameMatch[1].trim() : (app.customer_name || 'Değerli Müşterimiz');

        if (!phone) {
            alert('Müşteri telefon numarası bulunamadı (Notlarda "Tel: ..." formatında olmalı).');
            return;
        }

        if (phone.startsWith('0')) phone = '90' + phone.substring(1);
        if (phone.length === 10) phone = '90' + phone;

        const date = new Date(app.appointment_date).toLocaleDateString('tr-TR');
        const message = `Merhaba ${customerName}, ${company?.name || 'SaloonTR'} bünyesindeki randevunuz ${date} günü saat ${app.start_time} - ${app.end_time} için onaylanmıştır. İyi günler dileriz.`;

        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    };

    const handleStatusUpdate = async (id: number, status: string, currentPrice?: number) => {
        let msg = '';
        let finalPrice = currentPrice;

        if (status === 'cancelled') msg = 'Bu randevuyu iptal etmek istediğinize emin misiniz?';
        if (status === 'approved') msg = 'Bu randevuyu onaylamak istiyor musunuz?';

        if (status === 'completed') {
            const app = appointments.find(a => a.id === id);

            // If already paid, just update status directly
            if (app?.payment_status === 'paid') {
                if (!window.confirm('Ödemesi zaten alınmış bu randevuyu tamamlamak istiyor musunuz?')) return;
                try {
                    setLoading(true);
                    await api.patch(`/appointments/${id}/status`, { status: 'completed' });
                    fetchData();
                    return;
                } catch (err) {
                    alert('Hata oluştu');
                } finally {
                    setLoading(false);
                }
                return;
            }

            setCompletionModal({
                open: true,
                app: app || null,
                amount: currentPrice || app?.services?.reduce((sum: number, s: any) => sum + Number(s.price || 0), 0) || 0,
                technical_notes: ''
            });
            return;
        }

        if (msg && !window.confirm(msg)) return;

        try {
            await api.patch(`/appointments/${id}/status`, {
                status,
                price: finalPrice
            });
            fetchData();
        } catch (err: any) {
            const serverError = err.response?.data?.error;
            const message = serverError ? `Sunucu Hatası: ${serverError}` : (err.message || 'Bilinmeyen hata');
            setError(message);
            alert(message);
        }
    };

    const updateNewAppointmentTime = (startTime: string) => {
        let duration = 30;
        if (newAppointment.package_id) {
            const pkg = packages.find(p => p.id === newAppointment.package_id);
            if (pkg) {
                duration = pkg.services?.reduce((sum: number, ps: any) =>
                    sum + (newAppointment.serviceDurationOverrides[ps.id] || ps.duration_minutes || 0), 0) || pkg.duration_minutes;
            }
        } else if (newAppointment.service_ids.length > 0) {
            const selectedServices = services.filter(sv => newAppointment.service_ids.includes(sv.id!));
            duration = selectedServices.reduce((sum, sv) => sum + (sv.duration_minutes || 0), 0);
        }

        const [sh, sm] = startTime.split(':').map(Number);
        const totalMin = sh * 60 + sm + duration;
        const endH = Math.floor(totalMin / 60);
        const endM = totalMin % 60;
        const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

        setNewAppointment({ ...newAppointment, start_time: startTime, end_time: endTime });
    };

    const handleAddAppointment = async (e: FormEvent) => {
        e.preventDefault();
        setFormError('');
        try {
            const customerName = newAppointment.customer_name;
            const customerPhone = newAppointment.customer_phone;
            let finalNotes = '';
            if (customerName) finalNotes += `Müşteri: ${customerName} `;
            if (customerPhone) finalNotes += `| Tel: ${customerPhone} `;
            if (newAppointment.notes) finalNotes += `| ${newAppointment.notes}`;

            const selectedPackage = newAppointment.package_id ? packages.find(p => p.id === newAppointment.package_id) : null;
            const selectedServices = services.filter(s => newAppointment.service_ids.includes(s.id!));

            const sSelections = selectedPackage
                ? selectedPackage.services.map((s: any) => ({
                    id: s.id,
                    price: (newAppointment.servicePriceOverrides[s.id] !== undefined) ? newAppointment.servicePriceOverrides[s.id] : s.price,
                    duration_minutes: (newAppointment.serviceDurationOverrides[s.id] !== undefined) ? newAppointment.serviceDurationOverrides[s.id] : s.duration_minutes,
                    staff_id: newAppointment.serviceStaffOverrides[s.id] || newAppointment.staff_id || undefined
                }))
                : selectedServices.map(s => ({
                    id: s.id,
                    price: s.price,
                    duration_minutes: s.duration_minutes,
                    staff_id: newAppointment.staff_id || undefined
                }));

            const hasOverrides = Object.keys(newAppointment.servicePriceOverrides).length > 0 || Object.keys(newAppointment.serviceDurationOverrides).length > 0;
            const totalPr = (selectedPackage && !hasOverrides) ? Number(selectedPackage.price) : sSelections.reduce((sum: number, s: any) => sum + Number(s.price), 0);
            const totalDur = (selectedPackage && !hasOverrides) ? Number(selectedPackage.duration_minutes) : sSelections.reduce((sum: number, s: any) => sum + Number(s.duration_minutes), 0);

            // Geçmiş zaman kontrolü
            const todayStr = new Date().toISOString().split('T')[0];
            if (newAppointment.appointment_date === todayStr) {
                const now = new Date();
                const currentMinutes = now.getHours() * 60 + now.getMinutes();
                const [sh, sm] = newAppointment.start_time.split(':').map(Number);
                const startMinutes = sh * 60 + sm;

                if (startMinutes < currentMinutes) {
                    setFormError('⚠️ Geçmiş bir saate randevu oluşturamazsınız.');
                    return;
                }
            }

            // ÇAKIŞMA KONTROLÜ - BOARDDA OLDUĞU GİBİ
            const [newSh, newSm] = newAppointment.start_time.split(':').map(Number);
            const newStartTotal = newSh * 60 + newSm;
            const newEndTotal = newStartTotal + totalDur;

            // Mevcut randevuları aynı tarih ve aynı personel için filtrele
            const existingDayApps = appointments.filter(a => {
                const appDate = formatDateKey(a.appointment_date);
                const targetDate = formatDateKey(newAppointment.appointment_date);

                // Eğer personel seçili ise o personele bak, yoksa genel bak (opsiyonel ama boardda personel bazlıdır)
                const isSameStaff = newAppointment.staff_id ? (Number(a.staff_id) === Number(newAppointment.staff_id)) : true;

                return isSameStaff && a.status !== 'cancelled' && appDate === targetDate;
            });

            const conflict = existingDayApps.find(app => {
                const [asH, asM] = app.start_time.split(':').map(Number);
                const [aeH, aeM] = app.end_time.split(':').map(Number);
                const appStart = asH * 60 + asM;
                const appEnd = aeH * 60 + aeM;
                // Kesişme kontrolü: (Baslangic1 < Bitis2) && (Bitis1 > Baslangic2)
                return (newStartTotal < appEnd && newEndTotal > appStart);
            });

            if (conflict) {
                const conflictName = conflict.customer_name || 'Başka bir müşteri';
                setFormError(`⚠️ ÇAKIŞMA: Bu saatte (${conflict.start_time} - ${conflict.end_time}) ${conflictName} için randevu var.`);
                return;
            }

            const eh = Math.floor(newEndTotal / 60);
            const em = newEndTotal % 60;
            const finalEndTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;

            await api.post('/appointments', {
                ...newAppointment,
                service_id: newAppointment.service_ids[0],
                service_ids: newAppointment.service_ids,
                services: sSelections,
                price: totalPr,
                end_time: finalEndTime,
                package_id: newAppointment.package_id === 0 ? undefined : newAppointment.package_id,
                staff_id: newAppointment.staff_id === 0 ? undefined : newAppointment.staff_id,
                company_id: company?.id,
                notes: finalNotes.trim(),
                status: 'approved'
            });

            setNewAppointment({
                service_id: 0,
                service_ids: [],
                staff_id: 0,
                appointment_date: getLocalDateString(),
                start_time: '09:00',
                end_time: '10:00',
                customer_name: '',
                customer_phone: '',
                package_id: 0,
                notes: '',
                price: 0,
                serviceStaffOverrides: {},
                servicePriceOverrides: {},
                serviceDurationOverrides: {},
                activeTab: 'services'
            });
            setShowAddForm(false);
            alert('Randevu başarıyla ONAYLI olarak oluşturuldu.');
            await fetchData();
            window.location.reload();
        } catch (err: any) {
            setFormError(err.response?.data?.error || 'Randevu kaydedilirken hata oluştu');
        }
    };

    const pendingAppointments = appointments.filter(a => {
        if (a.status !== 'pending') return false;
        if (showAllStaff || !userInfo) return true;

        const myId = Number(userInfo?.id);
        const hasServices = a.services && a.services.length > 0;

        if (hasServices) {
            const assignedToMe = a.services?.some((s: any) => Number(s.staff_id) === myId);
            if (assignedToMe) return true;

            const anyoneAssigned = a.services?.some((s: any) => s.staff_id);
            if (!anyoneAssigned && (Number(a.staff_id) === myId || !a.staff_id)) return true;

            return false;
        }

        return Number(a.staff_id) === myId || !a.staff_id;
    });

    if (loading && appointments.length === 0) return <div className="p-8 text-center font-bold text-gray-400 animate-pulse">Veriler Hazırlanıyor...</div>;

    return (
        <div className="min-h-screen bg-slate-50/30">
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            {/* Header Area */}
            <div className="bg-white px-6 pt-12 pb-6 border-b border-slate-100 sticky top-0 z-40 backdrop-blur-xl bg-white/80">
                <div className="flex justify-between items-center mb-4">
                    <Link to="/dashboard" className="flex items-center gap-1 text-pink-600 font-bold text-xs uppercase tracking-widest">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                        Panel
                    </Link>
                    <div className="flex gap-2">
                        <button
                            onClick={startVoiceCommand}
                            className={`p-2.5 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400 hover:text-pink-600'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m8 0h-8m4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </button>
                        <button
                            onClick={() => { setShowAddForm(true); setFormError(''); setError(''); }}
                            className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg hover:bg-slate-800 transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        </button>
                    </div>
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Randevu Yönetimi</h2>
                {voiceTranscript && (
                    <div className="mt-2 bg-pink-50 text-pink-600 px-3 py-1.5 rounded-xl text-[10px] font-bold animate-pulse border border-pink-100 italic">
                        " {voiceTranscript} "
                    </div>
                )}
            </div>

            <div className="px-6 py-6">
                {/* Horizontal Date Picker */}
                <div className="mb-8 -mx-6 px-6 overflow-x-auto no-scrollbar flex gap-3 pb-2">
                    {(() => {
                        const items = [];
                        const start = new Date();
                        for (let i = -2; i < 12; i++) {
                            const d = new Date();
                            d.setDate(start.getDate() + i);
                            const ds = formatDateKey(d);
                            const isSel = selectedDate === ds;
                            const isToday = getLocalDateString() === ds;
                            items.push(
                                <button
                                    key={ds}
                                    onClick={() => setSelectedDate(ds)}
                                    className={`flex-shrink-0 w-16 py-4 rounded-3xl flex flex-col items-center transition-all ${isSel ? 'bg-pink-600 text-white shadow-xl shadow-pink-200' : 'bg-white text-slate-400 border border-slate-100'}`}
                                >
                                    <span className="text-[10px] font-bold uppercase opacity-60 mb-1">{d.toLocaleDateString('tr-TR', { weekday: 'short' })}</span>
                                    <span className="text-lg font-black">{d.getDate()}</span>
                                    {isToday && !isSel && <div className="w-1 h-1 bg-pink-500 rounded-full mt-1"></div>}
                                </button>
                            );
                        }
                        return items;
                    })()}
                </div>

                {/* Onay Bekleyenler Compact */}
                {pendingAppointments.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px] font-black">{pendingAppointments.length}</span>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Onay Bekleyenler</h3>
                        </div>
                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
                            {pendingAppointments.map(app => (
                                <div key={app.id} className="flex-shrink-0 w-64 bg-white p-4 rounded-2xl border border-amber-100 shadow-sm shadow-amber-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-900 text-sm truncate pr-2">
                                            {(() => {
                                                const nameMatch = app.notes?.match(/Müşteri:\s*([^|]+)/);
                                                return nameMatch ? nameMatch[1].trim() : (app.customer_name || 'Misafir');
                                            })()}
                                        </h4>
                                        <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase">{app.start_time}</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-pink-600 mb-3">{app.service_name}</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleStatusUpdate(app.id!, 'approved')} className="flex-1 bg-slate-900 text-white py-2 rounded-xl text-[10px] font-bold">Onayla</button>
                                        <button onClick={() => handleStatusUpdate(app.id!, 'cancelled')} className="px-3 bg-slate-100 text-slate-400 py-2 rounded-xl text-[10px] font-bold">×</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-xl">
                        <p className="text-red-700 font-bold text-sm">{error}</p>
                    </div>
                )}

                {/* Daily Appointments List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                            {new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} Randevuları
                        </h3>
                        {/* Show all staff toggle removed as per user request */}
                    </div>

                    <div className="space-y-3">
                        {(() => {
                            const filtered = appointments.filter(a => formatDateKey(a.appointment_date) === selectedDate && (a.status === 'approved' || a.status === 'completed'));

                            // Explode appointments into individual services (Distribution)
                            let flatList = filtered.flatMap((app: any) => {
                                if (!app.services || app.services.length === 0) {
                                    return [{
                                        ...app,
                                        display_id: app.id,
                                        display_start_time: app.start_time,
                                        display_service_name: app.service_name || 'Hizmet',
                                        display_price: app.price,
                                        display_staff_name: app.staff_name,
                                        display_staff_id: app.staff_id,
                                        is_subservice: false
                                    }];
                                }
                                return app.services.map((s: any) => ({
                                    ...app,
                                    display_id: `${app.id}-${s.aps_id}`,
                                    display_start_time: s.start_time || app.start_time,
                                    display_service_name: s.name,
                                    display_price: s.price,
                                    display_staff_name: s.service_staff_name,
                                    display_staff_id: s.staff_id,
                                    is_subservice: true
                                }));
                            });

                            // Filter based on showAllStaff preference (Expert Mode)
                            if (!showAllStaff && userInfo) {
                                const myId = Number(userInfo?.id);
                                flatList = flatList.filter((item: any) => {
                                    // If a specific assignment exists for this service, it MUST be mine
                                    if (item.display_staff_id !== undefined && item.display_staff_id !== null) {
                                        return Number(item.display_staff_id) === myId;
                                    }
                                    // If no specific assignment, root assignment must be mine or unassigned
                                    if (item.staff_id) {
                                        return Number(item.staff_id) === myId;
                                    }
                                    // Completely unassigned items show for everyone
                                    return true;
                                });
                            }

                            const sorted = flatList.sort((a: any, b: any) => (a.display_start_time || '').localeCompare(b.display_start_time || ''));

                            if (sorted.length === 0) {
                                return (
                                    <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 border-dashed">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200 text-2xl">📅</div>
                                        <p className="text-slate-400 font-bold text-sm">
                                            {staffMode ? 'Sizin için bugün randevu bulunmuyor.' : 'Randevu bulunmuyor.'}
                                        </p>
                                    </div>
                                );
                            }

                            return sorted.map((item: any) => {
                                const startTime = item.display_start_time || '00:00';
                                return (
                                    <div
                                        key={item.display_id}
                                        onClick={() => setSelectedAppointment(item)}
                                        className={`p-4 rounded-2xl border shadow-sm flex items-center gap-3 active:scale-[0.98] transition-all ${item.status === 'completed' ? 'bg-slate-50/50 border-slate-100 opacity-60' : 'bg-white border-slate-100'}`}
                                    >
                                        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border ${item.status === 'completed' ? 'bg-slate-100 border-slate-200' : 'bg-slate-50 border-slate-100'}`}>
                                            <span className={`text-xs font-black leading-none ${item.status === 'completed' ? 'text-slate-400' : 'text-slate-900'}`}>{startTime.split(':')[0]}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">:{startTime.split(':')[1]}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className={`font-black text-sm truncate uppercase tracking-tight ${item.status === 'completed' ? 'text-slate-400' : 'text-slate-900'}`}>
                                                    {(() => {
                                                        const nameMatch = item.notes?.match(/Müşteri:\s*([^|]+)/);
                                                        const extracted = nameMatch ? nameMatch[1].trim() : '';
                                                        return extracted || item.customer_name || 'Misafir';
                                                    })()}
                                                </h4>
                                                {item.is_subservice && (
                                                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-500 text-[7px] font-black rounded uppercase">Alt İşlem</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                                                {item.package_name && !item.is_subservice && (
                                                    <span className="text-amber-600">[{item.package_name}] </span>
                                                )}
                                                <span className={item.is_subservice ? 'text-emerald-600 font-black' : ''}>
                                                    {item.is_subservice ? `✂️ ${item.display_service_name}` : (item.service_name || 'Hizmet Bilgisi Yok')}
                                                </span>
                                                {!staffMode && item.display_staff_name && (
                                                    <span className="text-slate-400 ml-1"> | Uzman: {item.display_staff_name}</span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs font-black block ${item.status === 'completed' ? 'text-slate-400' : 'text-pink-600'}`}>₺{item.display_price || item.price || '0'}</span>
                                            <span className={`text-[9px] font-bold uppercase ${item.status === 'completed' ? 'text-slate-400' : 'text-emerald-500'}`}>
                                                {item.status === 'completed' ? 'Tamamlandı' : 'Onaylı'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

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
                    <div className="flex items-center gap-2 grayscale opacity-30">
                        <span className="text-[9px] text-gray-400 font-bold tracking-tighter uppercase whitespace-nowrap">Appointments Edition v1.84.0</span>
                    </div>
                </div>
            </div>

            {/* Manual Appointment Modal */}
            {showAddForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white p-8 rounded-[3rem] w-full max-w-lg max-h-[95vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Manuel Randevu</h3>
                            <button onClick={() => { setShowAddForm(false); setFormError(''); setError(''); }} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {formError && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl">
                                <p className="text-red-700 font-bold text-xs">{formError}</p>
                            </div>
                        )}

                        <form onSubmit={handleAddAppointment} className="space-y-6">
                            <div className="flex gap-4 mb-4">
                                <button
                                    type="button"
                                    onClick={() => setNewAppointment({ ...newAppointment, activeTab: 'services', package_id: 0 })}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${newAppointment.activeTab === 'services' ? 'bg-pink-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
                                >
                                    Hizmetler
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewAppointment({ ...newAppointment, activeTab: 'packages', service_ids: [], package_id: newAppointment.package_id || (packages[0]?.id || 0) })}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${newAppointment.activeTab === 'packages' ? 'bg-pink-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
                                >
                                    Paketler
                                </button>
                            </div>

                            {newAppointment.activeTab === 'services' ? (
                                <>
                                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase ml-1 tracking-wider">Hizmet Seçimi</label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto bg-slate-50 p-4 rounded-2xl">
                                        {services.map(s => {
                                            const isSelected = newAppointment.service_ids.includes(s.id!);
                                            return (
                                                <label key={s.id} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${isSelected ? 'bg-white border-pink-500 shadow-sm' : 'bg-transparent border-transparent'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            className="w-5 h-5 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                let newIds = [...newAppointment.service_ids];
                                                                if (e.target.checked) {
                                                                    newIds.push(s.id!);
                                                                } else {
                                                                    newIds = newIds.filter(id => id !== s.id);
                                                                }

                                                                // Calculate total duration and price
                                                                const selectedServices = services.filter(sv => newIds.includes(sv.id!));
                                                                const totalDur = selectedServices.reduce((sum, sv) => sum + (sv.duration_minutes || 0), 0);
                                                                const totalPr = selectedServices.reduce((sum, sv) => sum + (sv.price || 0), 0);

                                                                let newEndTime = newAppointment.end_time;
                                                                if (newAppointment.start_time) {
                                                                    const [h, m] = newAppointment.start_time.split(':').map(Number);
                                                                    const totalMin = h * 60 + m + totalDur;
                                                                    const endH = Math.floor(totalMin / 60);
                                                                    const endM = totalMin % 60;
                                                                    newEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                                                                }

                                                                setNewAppointment({ ...newAppointment, service_ids: newIds, end_time: newEndTime, price: totalPr });
                                                            }}
                                                        />
                                                        <div>
                                                            <p className={`text-xs font-black ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>{s.name}</p>
                                                            <p className="text-[10px] font-bold text-slate-400">{s.duration_minutes} Dakika</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-black text-pink-600">₺{s.price}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-3 max-h-64 overflow-y-auto bg-slate-50 p-4 rounded-2xl">
                                        {packages.length === 0 ? (
                                            <div className="text-center py-6">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Henüz paket tanımlanmamış</p>
                                            </div>
                                        ) : (
                                            packages.map(p => {
                                                const isSelected = newAppointment.package_id === p.id;
                                                return (
                                                    <div key={p.id} className="space-y-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => setNewAppointment({ ...newAppointment, package_id: p.id, service_ids: [], serviceStaffOverrides: {} })}
                                                            className={`w-full p-4 rounded-2xl border-2 transition-all flex flex-col gap-1 text-left ${isSelected ? 'bg-pink-50 border-pink-500 shadow-sm' : 'bg-white border-transparent text-slate-600'}`}
                                                        >
                                                            <p className={`text-xs font-black uppercase leading-tight ${isSelected ? 'text-pink-600' : 'text-slate-900'}`}>{p.name}</p>
                                                            <p className="text-[10px] font-bold text-slate-400">₺{p.price} | {p.duration_minutes} dk</p>
                                                        </button>

                                                        {isSelected && (
                                                            <div className="pl-6 space-y-4 animate-in slide-in-from-left duration-300 border-l-4 border-pink-200 ml-2">
                                                                <p className="text-[10px] font-black text-pink-600 uppercase tracking-widest pl-2">🛠️ İşlem Dağılımı</p>
                                                                <div className="space-y-2">
                                                                    {p.services?.map((ps: any) => (
                                                                        <div key={ps.id} className="flex items-center justify-between gap-4 bg-white p-3 rounded-2xl border-2 border-slate-100 shadow-sm transition-all hover:border-pink-300">
                                                                            <div className="flex flex-col flex-1 min-w-0">
                                                                                <span className="text-[10px] font-black text-slate-900 uppercase truncate">{ps.name}</span>
                                                                                <div className="flex gap-2 mt-1">
                                                                                    <div className="flex-1">
                                                                                        <label className="block text-[7px] font-bold text-slate-400 uppercase mb-0.5 ml-1">Süre (Dk)</label>
                                                                                        <div className="w-full px-2 py-1.5 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-400">
                                                                                            {ps.duration_minutes}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex-1">
                                                                                        <label className="block text-[7px] font-bold text-slate-400 uppercase mb-0.5 ml-1">Fiyat (₺)</label>
                                                                                        <div className="w-full px-2 py-1.5 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-400">
                                                                                            {ps.price}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex flex-col items-end gap-1 px-1">
                                                                                <span className="text-[8px] font-black text-slate-400 uppercase">{company?.staff_label || 'Uzman'}</span>
                                                                                <select
                                                                                    value={newAppointment.serviceStaffOverrides[ps.id] || newAppointment.staff_id || (staff[0]?.user_id || staff[0]?.id)}
                                                                                    onChange={(e) => {
                                                                                        setNewAppointment(prev => ({
                                                                                            ...prev,
                                                                                            serviceStaffOverrides: {
                                                                                                ...prev.serviceStaffOverrides,
                                                                                                [ps.id]: Number(e.target.value)
                                                                                            }
                                                                                        }));
                                                                                    }}
                                                                                    className="text-[10px] font-bold bg-pink-50 text-pink-900 border-none rounded-xl p-2 outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
                                                                                >
                                                                                    {staff.map(s => (
                                                                                        <option key={s.user_id || s.id} value={s.user_id || s.id}>
                                                                                            {s.first_name}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div className="flex justify-between items-center bg-pink-50/50 p-4 rounded-2xl border-2 border-pink-100 shadow-inner mt-2">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[8px] font-black text-pink-600 uppercase tracking-widest">TOPLAM SÜRE</span>
                                                                        <span className="text-sm font-black text-pink-900">
                                                                            {p.duration_minutes || 0} DK
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex flex-col items-end">
                                                                        <span className="text-[8px] font-black text-pink-600 uppercase tracking-widest">TOPLAM FİYAT</span>
                                                                        <span className="text-lg font-black text-pink-900">
                                                                            ₺{p.price || 0}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <p className="text-[8px] font-bold text-slate-400 italic pl-2">* Hizmetler yukarıdan aşağıya sırayla atanacaktır.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase ml-1 tracking-wider">Tarih</label>
                                    <input
                                        type="date"
                                        required
                                        min={getLocalDateString()}
                                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 font-bold text-slate-900"
                                        value={newAppointment.appointment_date}
                                        onChange={(e) => setNewAppointment({ ...newAppointment, appointment_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase ml-1 tracking-wider">Saat</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowTimePicker(true)}
                                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 font-black text-slate-900 text-left flex items-center justify-between"
                                    >
                                        <span>{newAppointment.start_time}</span>
                                        <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase ml-1 tracking-wider">Müşteri Adı</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 font-bold text-slate-900"
                                        placeholder="Ad Soyad"
                                        value={newAppointment.customer_name}
                                        onChange={(e) => setNewAppointment({ ...newAppointment, customer_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase ml-1 tracking-wider">Telefon</label>
                                    <input
                                        type="tel"
                                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 font-bold text-slate-900"
                                        placeholder="05XX XXX XX XX"
                                        value={newAppointment.customer_phone}
                                        onChange={(e) => setNewAppointment({ ...newAppointment, customer_phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-pink-600 text-white py-5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-pink-200 hover:bg-pink-700 active:scale-95 transition-all">
                                Randevu Oluştur
                            </button>
                        </form>
                    </div>
                </div >
            )
            }

            {/* Appointment Details Modal */}
            {
                selectedAppointment && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white p-8 rounded-[3rem] w-full max-w-md max-h-[95vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300 relative">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Randevu Detayı</h3>
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mt-1 bg-emerald-100 text-emerald-600">Onaylandı</span>
                                </div>
                                <button onClick={() => setSelectedAppointment(null)} className="text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full p-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-black text-xl">
                                        {(() => {
                                            const nameMatch = selectedAppointment.notes?.match(/Müşteri:\s*([^|]+)/);
                                            const extracted = nameMatch ? nameMatch[1].trim() : '';
                                            const name = extracted || selectedAppointment.customer_name || 'Misafir';
                                            return name.charAt(0).toUpperCase();
                                        })()}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-black text-slate-900 text-lg leading-none truncate">
                                            {(() => {
                                                const nameMatch = selectedAppointment.notes?.match(/Müşteri:\s*([^|]+)/);
                                                const extracted = nameMatch ? nameMatch[1].trim() : '';
                                                return extracted || selectedAppointment.customer_name || 'Misafir';
                                            })()}
                                        </h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Müşteri</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Zaman</p>
                                        <p className="font-black text-slate-900 text-sm">{(selectedAppointment as any).display_start_time || selectedAppointment.start_time}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tarih</p>
                                        <p className="font-black text-slate-900 text-sm">{new Date(selectedAppointment.appointment_date).toLocaleDateString('tr-TR')}</p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Hizmetler</p>
                                    <div className="space-y-2">
                                        {selectedAppointment.services && selectedAppointment.services.length > 0 ? (
                                            selectedAppointment.services.map((s: any, idx: number) => {
                                                const isThisSub = (selectedAppointment as any).is_subservice && (selectedAppointment as any).aps_id === s.aps_id;
                                                return (
                                                    <div key={idx} className={`flex justify-between items-center p-2 rounded-xl border transition-all ${isThisSub ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-100' : 'bg-white/50 border-slate-100'}`}>
                                                        <div className="flex flex-col min-w-0 pr-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`font-black text-xs uppercase tracking-tight truncate ${isThisSub ? 'text-indigo-900' : 'text-slate-800'}`}>{s.name}</span>
                                                                {isThisSub && <span className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse"></span>}
                                                            </div>
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{s.start_time} - {s.end_time} | {s.service_staff_name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            {s.original_price && Number(s.original_price) !== Number(s.price) && (
                                                                <span className="text-[8px] font-bold line-through text-slate-400">₺{s.original_price}</span>
                                                            )}
                                                            <span className={`font-black text-[10px] ${isThisSub ? 'text-indigo-600' : 'text-slate-800'}`}>₺{s.price}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="flex justify-between items-center">
                                                <span className="font-black text-slate-900">{selectedAppointment.package_name || selectedAppointment.service_name || 'Hizmet Bilgisi Yok'}</span>
                                                <span className="font-black text-pink-600">₺{selectedAppointment.price || 0}</span>
                                            </div>
                                        )}
                                    </div>
                                    {selectedAppointment.services && selectedAppointment.services.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center px-1">
                                            <span className="text-[9px] font-black text-slate-400 uppercase">Toplam</span>
                                            <div className="flex items-center gap-2">
                                                {(() => {
                                                    const originalTotal = selectedAppointment.services?.reduce((sum: number, s: any) => sum + (Number(s.original_price) || 0), 0);
                                                    if (originalTotal > Number(selectedAppointment.price)) {
                                                        return <span className="text-[10px] font-bold line-through text-slate-400">₺{originalTotal}</span>;
                                                    }
                                                    return null;
                                                })()}
                                                <span className="text-sm font-black text-indigo-600">₺{selectedAppointment.price}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Teknik Notlar Bölümü */}
                                    <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">İşlem Detayları & Geçmiş</span>
                                            <button 
                                                onClick={async () => {
                                                    const phone = selectedAppointment.customer_phone;
                                                    if (phone) {
                                                        const res = await api.get('/appointments', { params: { customer_phone: phone } });
                                                        setCustomerHistory(res.data.data.filter((a: Appointment) => a.id !== selectedAppointment.id && a.technical_notes));
                                                        setShowHistory(true);
                                                    }
                                                }}
                                                className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest bg-white px-2 py-1 rounded-lg shadow-sm border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all"
                                            >
                                                Geçmiş Notlar
                                            </button>
                                        </div>
                                        {selectedAppointment.technical_notes ? (
                                            <p className="text-xs font-medium text-indigo-900 leading-relaxed bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                                                {selectedAppointment.technical_notes}
                                            </p>
                                        ) : (
                                            <p className="text-[10px] italic text-indigo-300 font-bold uppercase tracking-widest text-center py-2">Not bulunamadı</p>
                                        )}
                                    </div>
                                </div>

                                {selectedAppointment.status !== 'completed' && (
                                    <div className="flex flex-col gap-3">
                                        {selectedAppointment.status === 'approved' && (
                                            <button
                                                onClick={() => {
                                                    handleStatusUpdate(selectedAppointment.id!, 'completed', selectedAppointment.price);
                                                }}
                                                disabled={loading}
                                                className={`w-full ${selectedAppointment.payment_status === 'paid' ? 'bg-emerald-600 shadow-emerald-100' : 'bg-indigo-600 shadow-indigo-100'} text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:opacity-90 transition-all disabled:opacity-50`}
                                            >
                                                {selectedAppointment.payment_status === 'paid' ? '✓ Hizmeti Tamamla' : 'Tamamla & Ödeme Al'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleWhatsAppNotify(selectedAppointment)}
                                            className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all"
                                        >
                                            WhatsApp ile Bildir
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleStatusUpdate(selectedAppointment.id!, 'cancelled', selectedAppointment.price);
                                                setSelectedAppointment(null);
                                            }}
                                            className="w-full bg-slate-50 text-red-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all"
                                        >
                                            Randevuyu İptal Et
                                        </button>
                                    </div>
                                )}

                                {selectedAppointment.status === 'completed' && (
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            Bu randevu tamamlanmıştır ve üzerinde işlem yapılamaz.
                                        </p>
                                    </div>
                                )}
                            </div>
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

            {/* Completion & Amount Confirmation Modal */}
            {
                completionModal.open && completionModal.app && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4">
                                    💰
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Hizmet Tamamla</h3>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Lütfen toplam tutarı onaylayın</p>
                            </div>

                            <div className="mb-8">
                                <div className="text-center mb-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ödenecek Tutar</span>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-indigo-200">₺</span>
                                    <input
                                        type="number"
                                        value={completionModal.amount}
                                        onChange={(e) => setCompletionModal(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-6 text-center text-4xl font-black text-indigo-600 focus:border-indigo-500 focus:bg-white transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="mb-8">
                                <div className="text-center mb-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">İşlem Detayı (Teknik Notlar)</span>
                                </div>
                                <textarea
                                    value={completionModal.technical_notes}
                                    onChange={(e) => setCompletionModal(prev => ({ ...prev, technical_notes: e.target.value }))}
                                    placeholder="Kullanılan boya, malzeme veya teknik detaylar..."
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:bg-white transition-all outline-none resize-none"
                                    rows={4}
                                />
                            </div>

                            <div className="space-y-3">
                                <button
                                    disabled={true}
                                    className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest cursor-not-allowed opacity-70 flex items-center justify-center gap-2"
                                >
                                    💳 Kredi Kartı (Pasif)
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            setLoading(true);
                                            await api.patch(`/appointments/${completionModal.app!.id}/status`, {
                                                status: 'completed',
                                                price: completionModal.amount,
                                                payment_method: 'unspecified',
                                                technical_notes: completionModal.technical_notes
                                            });
                                            setCompletionModal({ open: false, app: null, amount: 0, technical_notes: '' });
                                            setSelectedAppointment(null);
                                            fetchData();
                                        } catch (e) {
                                            alert('İşlem başarısız');
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    💵 Nakit Ödeme (Tamamla)
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            setLoading(true);
                                            await api.patch(`/appointments/${completionModal.app!.id}/status`, {
                                                status: 'completed',
                                                price: completionModal.amount,
                                                payment_method: 'unspecified',
                                                technical_notes: completionModal.technical_notes
                                            });
                                            setCompletionModal({ open: false, app: null, amount: 0, technical_notes: '' });
                                            setSelectedAppointment(null);
                                            fetchData();
                                        } catch (e) {
                                            alert('İşlem başarısız');
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                                >
                                    ✅ SADECE TAMAMLA
                                </button>
                                <button
                                    onClick={() => {
                                        setCompletionModal({ open: false, app: null, amount: 0, technical_notes: '' });
                                        setSelectedAppointment(null);
                                    }}
                                    className="w-full py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest"
                                >
                                    Geri Dön
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modern Time Picker Modal */}
            {
                showTimePicker && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
                        <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Saat Belirle</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manuel yazabilir veya seçebilirsiniz</p>
                                </div>
                                <button onClick={() => setShowTimePicker(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Manuel Giriş Alanı */}
                            <div className="mb-6">
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="SS:DD"
                                        value={newAppointment.start_time}
                                        onChange={(e) => {
                                            let val = e.target.value.replace(/[^0-9]/g, '');
                                            if (val.length > 4) val = val.substring(0, 4);
                                            
                                            let formatted = val;
                                            if (val.length >= 3) {
                                                formatted = val.substring(0, 2) + ':' + val.substring(2);
                                            } else if (val.length === 2 && e.nativeEvent instanceof InputEvent && e.nativeEvent.inputType !== 'deleteContentBackward') {
                                                formatted = val + ':';
                                            }
                                            
                                            // Basic validation for hours and minutes
                                            if (formatted.includes(':')) {
                                                const [h, m] = formatted.split(':');
                                                if (Number(h) > 23) formatted = '23' + (m ? ':' + m : '');
                                                if (m && Number(m) > 59) formatted = h + ':59';
                                            }

                                            updateNewAppointmentTime(formatted);
                                        }}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-6 text-center text-4xl font-black text-slate-900 group-focus-within:border-pink-500 group-focus-within:bg-white transition-all outline-none"
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-pink-500 transition-colors">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 mb-4 opacity-60 hover:opacity-100 transition-opacity">
                                {/* Saat Sütunu */}
                                <div className="flex-1 bg-slate-50 rounded-[2rem] p-3">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">HIZLI SAAT</p>
                                    <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                                        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => {
                                            const currentH = newAppointment.start_time.split(':')[0];
                                            const isSel = currentH === h;
                                            return (
                                                <button
                                                    key={h}
                                                    type="button"
                                                    onClick={() => {
                                                        const m = newAppointment.start_time.split(':')[1] || '00';
                                                        updateNewAppointmentTime(`${h}:${m}`);
                                                    }}
                                                    className={`py-2 rounded-xl font-black text-xs transition-all ${isSel ? 'bg-pink-600 text-white shadow-md' : 'bg-white text-slate-400 hover:bg-pink-50'}`}
                                                >
                                                    {h}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Dakika Sütunu */}
                                <div className="flex-1 bg-slate-50 rounded-[2rem] p-3">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">HIZLI DK</p>
                                    <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                                        {['00', '15', '30', '45'].map(m => {
                                            const currentM = newAppointment.start_time.split(':')[1];
                                            const isSel = currentM === m;
                                            return (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => {
                                                        const h = newAppointment.start_time.split(':')[0] || '09';
                                                        updateNewAppointmentTime(`${h}:${m}`);
                                                    }}
                                                    className={`py-2 rounded-xl font-black text-xs transition-all ${isSel ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 hover:bg-indigo-50'}`}
                                                >
                                                    {m}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowTimePicker(false)}
                                className="w-full bg-slate-900 text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all hover:bg-slate-800"
                            >
                                SEÇİMİ TAMAMLA
                            </button>
                        </div>
                    </div>
                )
            }
            {/* History Modal */}
            {
                showHistory && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-indigo-950/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-lg rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Müşteri İşlem Geçmişi</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Önceki randevulara ait teknik notlar</p>
                                </div>
                                <button onClick={() => setShowHistory(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                                {customerHistory.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-slate-300 font-black text-xs uppercase tracking-widest">Kayıtlı işlem detayı bulunamadı</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {customerHistory.map((h: Appointment, idx: number) => (
                                            <div key={h.id || idx} className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 flex flex-col gap-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        {new Date(h.appointment_date).toLocaleDateString('tr-TR')} - {h.start_time}
                                                    </span>
                                                    <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                        {h.service_name}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold text-slate-700 leading-relaxed italic">
                                                    "{h.technical_notes}"
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setShowHistory(false)}
                                className="w-full mt-8 bg-slate-900 text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}


