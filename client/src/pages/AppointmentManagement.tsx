import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Appointment, Service, Company } from '../types';

export default function AppointmentManagement() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formError, setFormError] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAppointment, setNewAppointment] = useState({
        service_id: 0,
        staff_id: 0,
        appointment_date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '10:00',
        notes: '',
        price: 0
    });
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [voiceTranscript, setVoiceTranscript] = useState('');

    const [company, setCompany] = useState<Company | null>(null);

    const [isListening, setIsListening] = useState(false);

    const fetchData = async () => {
        try {
            // 1. Get User & Company
            let companyId = null;
            try {
                const meRes = await api.get('/auth/me');
                if (meRes.data?.data?.company_id) {
                    companyId = meRes.data.data.company_id;
                    const companyRes = await api.get(`/companies/${companyId}`);
                    setCompany(companyRes.data?.data || null);
                }
            } catch (err) {
                console.warn('Company/Auth fetch failed', err);
            }

            // 2. Get Appointments & Services separately
            try {
                const appResponse = await api.get('/appointments');
                setAppointments(appResponse.data?.data || []);
            } catch (err) {
                console.warn('Appointments fetch failed', err);
                setAppointments([]);
            }

            try {
                const svcResponse = await api.get('/services');
                setServices(svcResponse.data?.data || []);
            } catch (err) {
                console.warn('Services fetch failed', err);
                setServices([]);
            }

        } catch (err) {
            console.error('General fetch error', err);
            setError('Veriler yüklenirken hata oluştu. Lütfen sayfayı yenileyin.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Voice Recognition Logic
    const startVoiceCommand = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Tarayıcınız sesli komut özelliğini desteklemiyor.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'tr-TR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = async (event: any) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            console.log('Sesli Komut:', transcript);
            setVoiceTranscript(transcript);

            // Directly call processing
            await processVoiceTranscript(transcript);
        };

        recognition.start();
    };

    const processVoiceTranscript = async (transcript: string) => {
        try {
            // Parse logic (Simple NLP)
            let date = new Date().toISOString().split('T')[0];
            if (transcript.includes('yarın')) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                date = tomorrow.toISOString().split('T')[0];
            }

            // Time Parsing
            let time = '09:00';
            const timeMatch = transcript.match(/(\d{1,2})[:\s](\d{2})/); // 17:00 or 17 00
            const hourOnlyMatch = transcript.match(/saat\s?(\d{1,2})/); // saat 5

            if (timeMatch) {
                time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
            } else if (hourOnlyMatch) {
                let h = parseInt(hourOnlyMatch[1]);
                if (transcript.includes('akşam') && h < 12) h += 12;
                time = `${String(h).padStart(2, '0')}:00`;
            }

            // Service Matching
            const matchedService = services.find(s => transcript.includes(s.name.toLowerCase()));
            if (!matchedService) {
                alert(`Hizmet anlaşılamadı. Şu hizmetlerden birini söyleyin: ${services.map(s => s.name).join(', ')}`);
                return;
            }

            // Customer Name (Experimental)
            let customerPart = transcript.split('randevu')[0].split('için').pop()?.trim() || 'Sesli Müşteri';
            customerPart = customerPart.replace(matchedService.name.toLowerCase(), '').trim();

            // Validation
            const duration = matchedService.duration_minutes || 30;
            const [h, m] = time.split(':').map(Number);
            const totalMin = h * 60 + m + duration;
            const endH = Math.floor(totalMin / 60);
            const endM = totalMin % 60;
            const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

            if (window.confirm(`${date} tarihinde saat ${time} için ${matchedService.name} (Müşteri: ${customerPart}) randevusu oluşturulsun mu?`)) {
                const finalNotes = `Sesli Komut: ${transcript} | Müşteri: ${customerPart}`;
                await api.post('/appointments', {
                    company_id: company?.id,
                    service_id: matchedService.id,
                    appointment_date: date,
                    start_time: time,
                    end_time: endTime,
                    notes: finalNotes,
                    price: matchedService.price,
                    status: 'approved'
                });
                fetchData();
                alert('Randevu başarıyla eklendi.');
                setVoiceTranscript(''); // Clear after success
            }

        } catch (err) {
            console.error('Voice parse error', err);
            alert('Komut anlaşılamadı. Lütfen örneğe uygun söyleyin: "Bugün akşam 5 için Saç Kesim Ahmet Yılmaza randevu oluştur"');
        }
    };

    const handleWhatsAppNotify = (app: Appointment) => {
        const notes = app.notes || '';
        // Extract phone from "Tel: 0555..." or similar
        const phoneMatch = notes.match(/Tel:\s*([\d\s+-]+)/);
        const nameMatch = notes.match(/Müşteri:\s*([^|]+)/);

        let phone = phoneMatch ? phoneMatch[1].replace(/\s+/g, '') : '';
        const customerName = nameMatch ? nameMatch[1].trim() : (app.customer_name || 'Değerli Müşterimiz');

        if (!phone) {
            alert('Müşteri telefon numarası bulunamadı (Notlarda "Tel: ..." formatında olmalı).');
            return;
        }

        // Basic Turkish formatting: 05xx -> 905xx
        if (phone.startsWith('0')) phone = '90' + phone.substring(1);
        if (phone.length === 10) phone = '90' + phone;

        const date = new Date(app.appointment_date).toLocaleDateString('tr-TR');
        const message = `Merhaba ${customerName}, ${company?.name || 'Saloon'} bünyesindeki randevunuz ${date} günü saat ${app.start_time} - ${app.end_time} için onaylanmıştır. İyi günler dileriz.`;

        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    };

    const handleStatusUpdate = async (id: number, status: string) => {
        try {
            await api.patch(`/appointments/${id}/status`, { status });
            fetchData();
        } catch (err: any) {
            console.error('Update Error Full:', err);
            const serverError = err.response?.data?.error;
            const message = serverError ? `Sunucu Hatası: ${serverError}` : (err.message || 'Bilinmeyen hata');
            setError(message);
            alert(message);
        }
    };

    const handleAddAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(''); // Clear previous errors
        try {
            // Append customer name to notes manually if backend doesn't support customer_name column
            const customerName = (newAppointment as any).customer_name;
            const finalNotes = customerName ? `Müşteri: ${customerName} | ${newAppointment.notes}` : newAppointment.notes;

            const res = await api.post('/appointments', {
                ...newAppointment,
                staff_id: newAppointment.staff_id === 0 ? undefined : newAppointment.staff_id,
                company_id: company?.id, // Fix: send company_id
                notes: finalNotes,
                status: 'approved'
            });

            // RESET FORM
            setNewAppointment({
                service_id: 0,
                staff_id: 0,
                appointment_date: new Date().toISOString().split('T')[0],
                start_time: '09:00',
                end_time: '10:00',
                notes: '',
                price: 0
            });
            // Clear customer_name specifically since it's added via casting
            (newAppointment as any).customer_name = '';

            setShowAddForm(false);

            // Check what status was actually saved
            const savedStatus = res.data?.data?.status;
            if (savedStatus === 'approved') {
                alert('Randevu başarıyla ONAYLI olarak oluşturuldu.');
            } else {
                alert(`Randevu oluşturuldu ancak durumu: ${savedStatus}. Yönetici onayı gerekebilir.`);
            }

            fetchData();
        } catch (err: any) {
            console.error('Appointment Error:', err);
            setFormError(err.response?.data?.error || 'Randevu kaydedilirken hata oluştu');
        }
    };

    const pendingAppointments = appointments.filter(a => a.status === 'pending');

    // Simple Calendar Logic
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const days = Array.from({ length: getDaysInMonth(currentYear, currentMonth) }, (_, i) => i + 1);

    if (loading && appointments.length === 0) return <div className="p-8 text-center font-bold text-gray-400 animate-pulse">Veriler Hazırlanıyor...</div>;

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <Link to="/dashboard" className="text-pink-600 hover:text-pink-800 text-xs font-bold uppercase tracking-widest mb-1 inline-block">
                        ← Dashboard
                    </Link>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Randevu Yönetimi</h2>
                    <p className="text-gray-500 font-medium">Bekleyen onaylar ve günlük randevu planınızı takip edin.</p>
                </div>

                {/* Hidden Voice Input Area (Background processing) */}
                <div className="sr-only opacity-0 absolute pointer-events-none">
                    <input
                        type="text"
                        readOnly
                        value={voiceTranscript}
                        id="voice-hidden-input"
                        aria-hidden="true"
                    />
                </div>

                {company && (
                    <div className="hidden xl:flex gap-6 mx-auto">
                        {(() => {
                            const todayStr = new Date().toISOString().split('T')[0];

                            const [startH, startM] = (company.work_start_time || '09:00').split(':').map(Number);
                            const [endH, endM] = (company.work_end_time || '20:00').split(':').map(Number);

                            const startTotalMinutes = startH * 60 + startM;
                            const endTotalMinutes = endH * 60 + endM;

                            // Calculate today's approved appointments duration
                            const todayApps = appointments.filter(a =>
                                a.status === 'approved' &&
                                (a.appointment_date.toString().split('T')[0] === todayStr)
                            );

                            const totalBusyMinutes = todayApps.reduce((acc, app) => {
                                const [sH, sM] = app.start_time.split(':').map(Number);
                                const [eH, eM] = (app.end_time || app.start_time).split(':').map(Number);
                                let duration = (eH * 60 + eM) - (sH * 60 + sM);
                                if (duration < 0) duration += 24 * 60;
                                return acc + duration;
                            }, 0);

                            // Total Capacity Logic (Capacity - Usage)
                            const totalWorkMinutes = endTotalMinutes - startTotalMinutes;
                            // Ensure non-negative if calculations go weird
                            const remainingMinutes = Math.max(0, totalWorkMinutes - totalBusyMinutes);

                            return (
                                <>
                                    <div className="bg-white/50 backdrop-blur-sm px-5 py-3 rounded-2xl border border-pink-100 shadow-sm flex flex-col items-center min-w-[100px]">
                                        <p className="text-[10px] font-bold text-pink-500 uppercase tracking-widest mb-1">TOPLAM RANDEVU ZAMANI</p>
                                        <p className="text-2xl font-black text-gray-800">{(totalBusyMinutes / 60).toFixed(1)}<span className="text-sm text-gray-400 font-medium ml-1">sa</span></p>
                                    </div>
                                    <div className="bg-white/50 backdrop-blur-sm px-5 py-3 rounded-2xl border border-blue-100 shadow-sm flex flex-col items-center min-w-[100px]">
                                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">BOŞ ZAMAN</p>
                                        <p className="text-2xl font-black text-gray-800">{(remainingMinutes / 60).toFixed(1)}<span className="text-sm text-gray-400 font-medium ml-1">sa</span></p>
                                    </div>
                                    <div className="bg-white/50 backdrop-blur-sm px-5 py-3 rounded-2xl border border-emerald-100 shadow-sm flex flex-col items-center min-w-[100px]">
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">TOPLAM RANDEVU</p>
                                        <p className="text-2xl font-black text-gray-800">{todayApps.length}<span className="text-sm text-gray-400 font-medium ml-1">Adet</span></p>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}
                <div className="flex gap-3">
                    <button
                        onClick={startVoiceCommand}
                        className={`
                            flex items-center gap-2 py-3 px-6 rounded-2xl font-bold transition-all
                            ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-pink-600 border border-pink-100 shadow-sm hover:shadow-md'}
                        `}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m8 0h-8m4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        <span>{isListening ? 'Dinleniyor...' : 'Sesle Ekle'}</span>
                    </button>
                    <button
                        onClick={() => { setShowAddForm(true); setFormError(''); setError(''); }}
                        className="btn-primary py-3 px-6 shadow-xl shadow-pink-500/20 font-bold"
                    >
                        Manuel Randevu Ekle
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-xl animate-in fade-in slide-in-from-top-4">
                    <p className="text-red-700 font-bold text-sm">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Left Column: Pending List */}
                <div className="lg:col-span-1">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                            {pendingAppointments.length}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Onay Bekleyenler</h3>
                    </div>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {pendingAppointments.map(app => {
                            const nameMatch = app.notes?.match(/Müşteri:\s*([^|]+)/);
                            const displayName = nameMatch ? nameMatch[1].trim() : (app.customer_name || 'Misafir Müşteri');

                            return (
                                <div key={app.id} className="card p-5 border-l-4 border-amber-400 hover:shadow-lg transition-all duration-300">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-bold text-gray-900">{displayName}</h4>
                                        <span className="text-[10px] font-black bg-amber-50 text-amber-600 px-2 py-1 rounded uppercase">{app.start_time}</span>
                                    </div>
                                    <p className="text-sm font-bold text-pink-600 mb-4">{app.service_name}</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleStatusUpdate(app.id!, 'approved')}
                                            className="flex-1 btn-primary py-2 text-xs font-bold"
                                        >
                                            Onayla
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate(app.id!, 'cancelled')}
                                            className="flex-1 btn-secondary py-2 text-xs font-bold border-gray-100 text-red-500"
                                        >
                                            Reddet
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {pendingAppointments.length === 0 && (
                            <div className="py-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                                <p className="text-gray-400 font-bold">Bekleyen randevu yok.</p>
                            </div>
                        )}
                    </div>

                    {/* Left Column: Mini Calendar */}
                    <div className="card p-4 mt-6 border-pink-100 shadow-sm">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">{today.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}</h3>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'].map(d => (
                                <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
                            ))}
                            {/* Empty cells for previous month */}
                            {Array.from({ length: (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7 }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}
                            {days.map(day => {
                                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const isSelected = selectedDate === dateStr;
                                const hasApproved = appointments.some(a =>
                                    a.status === 'approved' &&
                                    (a.appointment_date.toString().split('T')[0] === dateStr)
                                );
                                const isToday = new Date().toISOString().split('T')[0] === dateStr;

                                return (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedDate(dateStr)}
                                        className={`
                                            h-9 w-full rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all relative
                                            ${isSelected ? 'bg-pink-600 text-white shadow-md transform scale-105' : 'hover:bg-pink-50 text-gray-700 bg-gray-50/50'}
                                            ${isToday && !isSelected ? 'border-2 border-pink-200' : ''}
                                        `}
                                    >
                                        <span>{day}</span>
                                        {hasApproved && !isSelected && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-pink-500"></div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: Calendar & Daily View */}
                <div className="lg:col-span-2 space-y-8">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-8 bg-pink-600 rounded-full"></div>
                            <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">
                                Günlük Plan ({new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })})
                            </h3>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <div className="min-w-[800px]">
                                    {/* Timeline Header */}
                                    <div className="flex border-b border-gray-200 bg-gray-50/50">
                                        <div className="w-32 flex-shrink-0 p-3 border-r border-gray-200">
                                            <span className="text-xs font-black text-gray-400 uppercase">Zaman</span>
                                        </div>
                                        <div className="flex-1 flex relative h-10">
                                            {Array.from({ length: 13 }, (_, i) => i + 8).map(hour => (
                                                <div key={hour} className="flex-1 border-r border-gray-100 flex items-center justify-start pl-1">
                                                    <span className="text-[10px] font-bold text-gray-400">{String(hour).padStart(2, '0')}:00</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Day Row (Single) */}
                                    {(() => {
                                        const d = new Date(selectedDate);
                                        const dateStr = selectedDate;
                                        const isToday = new Date().toISOString().split('T')[0] === dateStr;

                                        const dayAppointments = appointments.filter(a =>
                                            a.status === 'approved' &&
                                            (a.appointment_date.toString().split('T')[0] === dateStr)
                                        );

                                        return (
                                            <div className="flex border-b border-gray-100 transition-colors bg-white">
                                                <div className={`w-32 flex-shrink-0 p-3 border-r border-gray-200 flex flex-col justify-center ${isToday ? 'bg-pink-100/50' : ''}`}>
                                                    <span className={`text-xs font-bold uppercase ${isToday ? 'text-pink-600' : 'text-gray-500'}`}>
                                                        {d.toLocaleDateString('tr-TR', { weekday: 'long' })}
                                                    </span>
                                                    <span className={`text-sm font-black ${isToday ? 'text-pink-700' : 'text-gray-900'}`}>
                                                        {d.getDate()} {d.toLocaleDateString('tr-TR', { month: 'short' })}
                                                    </span>
                                                </div>

                                                <div className="flex-1 relative h-32" style={{ backgroundImage: 'linear-gradient(to right, #f8fafc 1px, transparent 1px)', backgroundSize: `${100 / 12}% 100%` }}>
                                                    {dayAppointments.length === 0 && (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className="text-gray-300 font-bold text-sm bg-gray-50 px-3 py-1 rounded-full">Bugün için randevu yok</span>
                                                        </div>
                                                    )}

                                                    {dayAppointments.map(app => {
                                                        const [startH, startM] = app.start_time.split(':').map(Number);
                                                        const [endH, endM] = (app.end_time || app.start_time).split(':').map(Number);
                                                        const startTotalM = (startH * 60) + startM;
                                                        const endTotalM = (endH * 60) + endM;
                                                        const dayStartM = 8 * 60;
                                                        let leftPercent = ((startTotalM - dayStartM) / 720) * 100;
                                                        let widthPercent = ((endTotalM - startTotalM) / 720) * 100;
                                                        if (leftPercent < 0) { widthPercent += leftPercent; leftPercent = 0; }
                                                        return (
                                                            <div
                                                                key={app.id}
                                                                className="absolute top-2 bottom-2 bg-pink-500 border-2 border-white shadow-md rounded-md z-10 hover:z-20 group transition-all cursor-pointer hover:bg-pink-600 flex overflow-hidden"
                                                                style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, minWidth: '4px' }}
                                                                onClick={() => setSelectedAppointment(app)}
                                                            >
                                                                <div className="px-2 py-1 text-white text-[10px] leading-tight flex flex-col overflow-hidden w-full">
                                                                    <span className="font-bold truncate">{app.customer_name || 'Misafir'}</span>
                                                                    <span className="truncate opacity-90 text-[9px]">{app.service_name}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DataGrid View (Daily List) */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                            <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Günlük Liste</h3>
                        </div>
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Saat</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Müşteri</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Hizmet</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Fiyat</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Durum</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {appointments
                                        .filter(a => a.appointment_date.toString().split('T')[0] === selectedDate && a.status === 'approved')
                                        .sort((a, b) => a.start_time.localeCompare(b.start_time))
                                        .map(app => (
                                            <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer group" onClick={() => setSelectedAppointment(app)}>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-black text-gray-900">{app.start_time} - {app.end_time}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {(() => {
                                                            const nameMatch = app.notes?.match(/Müşteri:\s*([^|]+)/);
                                                            const displayName = nameMatch ? nameMatch[1].trim() : (app.customer_name || 'Misafir Müşteri');
                                                            return (
                                                                <>
                                                                    <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-xs uppercase">
                                                                        {displayName[0]}
                                                                    </div>
                                                                    <span className="text-sm font-bold text-gray-900">{displayName}</span>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-bold text-pink-600">{app.service_name}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm font-black text-gray-900">
                                                        ₺{app.price || services.find(s => s.id === app.service_id)?.price || 0}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-block px-2 py-1 rounded-md bg-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-wider">ONAYLANDI</span>
                                                </td>
                                            </tr>
                                        ))}
                                    {appointments.filter(a => a.appointment_date.toString().split('T')[0] === selectedDate && a.status === 'approved').length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold italic">Seçili gün için kayıtlı randevu bulunamadı.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Manual Appointment Modal */}
            {showAddForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="card w-full max-w-lg shadow-2xl scale-in-center animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Manuel Randevu</h3>
                            <button onClick={() => { setShowAddForm(false); setFormError(''); setError(''); }} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {formError && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg animate-pulse">
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    <p className="text-red-700 font-bold text-sm">{formError}</p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleAddAppointment} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase ml-1 tracking-wider">Hizmet Seçimi</label>
                                <select
                                    required
                                    className="input-field py-3 bg-gray-50 appearance-none font-bold text-gray-900"
                                    value={newAppointment.service_id}
                                    onChange={(e) => {
                                        const serviceId = parseInt(e.target.value);
                                        const service = services.find(s => s.id === serviceId);
                                        let newEndTime = newAppointment.end_time;
                                        let price = newAppointment.price;

                                        if (service) {
                                            price = service.price || 0;
                                            if (newAppointment.start_time) {
                                                const [h, m] = newAppointment.start_time.split(':').map(Number);
                                                const totalMin = h * 60 + m + (service.duration_minutes || 30);
                                                const endH = Math.floor(totalMin / 60);
                                                const endM = totalMin % 60;
                                                newEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                                            }
                                        }
                                        setNewAppointment({ ...newAppointment, service_id: serviceId, end_time: newEndTime, price: price });
                                    }}
                                >
                                    <option value="">Seçiniz...</option>
                                    {services.map(s => <option key={s.id} value={s.id}>{s.name} - ₺{s.price}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase ml-1 tracking-wider">Tarih</label>
                                    <input
                                        type="date"
                                        required
                                        className="input-field py-3 font-bold text-gray-900"
                                        value={newAppointment.appointment_date}
                                        onChange={(e) => setNewAppointment({ ...newAppointment, appointment_date: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase ml-1 tracking-wider">Saat</label>
                                        <input
                                            type="time"
                                            required
                                            className="input-field py-3 font-bold text-gray-900"
                                            value={newAppointment.start_time}
                                            onChange={(e) => {
                                                const start = e.target.value;
                                                let end = newAppointment.end_time;

                                                // Auto-calc end time if service selected
                                                if (newAppointment.service_id) {
                                                    const service = services.find(s => s.id === newAppointment.service_id);
                                                    if (service) {
                                                        const [h, m] = start.split(':').map(Number);
                                                        const totalMin = h * 60 + m + (service.duration_minutes || 30);
                                                        const endH = Math.floor(totalMin / 60);
                                                        const endM = totalMin % 60;
                                                        end = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                                                    }
                                                }
                                                setNewAppointment({ ...newAppointment, start_time: start, end_time: end });
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase ml-1 tracking-wider">Bitiş Saati</label>
                                        <input
                                            type="time"
                                            required
                                            className="input-field py-3 font-bold text-gray-900"
                                            value={newAppointment.end_time}
                                            onChange={(e) => setNewAppointment({ ...newAppointment, end_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase ml-1 tracking-wider">Müşteri Adı</label>
                                <input
                                    type="text"
                                    required
                                    className="input-field py-3 font-bold text-gray-900"
                                    placeholder="Ad Soyad"
                                    value={(newAppointment as any).customer_name || ''}
                                    onChange={(e) => setNewAppointment({ ...newAppointment, customer_name: e.target.value } as any)}
                                />
                            </div>

                            <div className="hidden">
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase ml-1 tracking-wider">Fiyat</label>
                                <input
                                    type="number"
                                    className="input-field py-3 font-bold text-pink-600"
                                    value={newAppointment.price}
                                    onChange={(e) => setNewAppointment({ ...newAppointment, price: parseFloat(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase ml-1 tracking-wider">Not (Opsiyonel)</label>
                                <textarea
                                    className="input-field py-3 min-h-[80px]"
                                    placeholder="Özel notlar..."
                                    value={newAppointment.notes}
                                    onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="w-full btn-primary py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-pink-500/30">
                                Randevu Oluştur
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Appointment Details Modal */}
            {selectedAppointment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="card w-full max-w-md shadow-2xl scale-in-center animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 to-violet-500"></div>

                        <div className="flex justify-between items-start mb-6 mt-2">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Randevu Detayı</h3>
                                <span className={`
                                    inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mt-1
                                    ${selectedAppointment.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                                        selectedAppointment.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'}
                                `}>
                                    {selectedAppointment.status === 'approved' ? 'Onaylandı' :
                                        selectedAppointment.status === 'pending' ? 'Bekliyor' : selectedAppointment.status}
                                </span>
                            </div>
                            <button onClick={() => setSelectedAppointment(null)} className="text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full p-2 hover:bg-gray-100 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tarih</p>
                                    <p className="font-bold text-gray-900">{new Date(selectedAppointment.appointment_date).toLocaleDateString('tr-TR')}</p>
                                </div>
                                <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Saat</p>
                                    <p className="font-bold text-gray-900">{selectedAppointment.start_time} - {selectedAppointment.end_time}</p>
                                </div>
                            </div>

                            {(() => {
                                const nameMatch = selectedAppointment.notes?.match(/Müşteri:\s*([^|]+)/);
                                const displayName = nameMatch ? nameMatch[1].trim() : (selectedAppointment.customer_name || 'Misafir Müşteri');
                                return (
                                    <div className="bg-white border-2 border-pink-50 rounded-xl p-4 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-lg">
                                            {displayName[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-pink-400 uppercase tracking-wider mb-0.5">Müşteri</p>
                                            <h4 className="font-bold text-gray-900 text-lg leading-none">{displayName}</h4>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Hizmet</p>
                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <span className="font-bold text-gray-900">{selectedAppointment.service_name}</span>
                                        <span className="font-black text-pink-600">
                                            {selectedAppointment.price ? `₺${selectedAppointment.price}` :
                                                `₺${services.find(s => s.id === selectedAppointment.service_id)?.price || 0}`}
                                        </span>
                                    </div>
                                </div>
                                {selectedAppointment.notes && (
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Notlar</p>
                                        <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 text-sm font-medium text-yellow-800">
                                            {selectedAppointment.notes}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                                {selectedAppointment.status === 'approved' && (
                                    <button
                                        onClick={() => handleWhatsAppNotify(selectedAppointment)}
                                        className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.483 8.413-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.308 1.654zm6.757-4.051c1.535.912 3.017 1.393 4.673 1.394 5.217 0 9.458-4.244 9.461-9.462.001-2.527-.981-4.903-2.768-6.69s-4.162-2.771-6.691-2.771c-5.218 0-9.461 4.243-9.464 9.463 0 1.761.48 3.484 1.389 5.006l-1.011 3.692 3.791-.994zm11.034-7.405c-.173-.087-1.019-.504-1.177-.561s-.272-.087-.384.087-.432.561-.533.676-.198.115-.371.029c-.173-.087-.731-.269-1.392-.859-.513-.457-.86-.1.021-1.21-.087 1.088-.419 1.139-.533 1.226-.115.087-.228.132-.34.029-.115-.104-.509-.616-1.026-1.114-.403-.388-.707-.15-.815-.15s-.208.016-.316.143-.416.488-.416 1.189-.511 1.383-.615 1.52c-.104.137-1.006 1.535-2.438 2.771-1.432 1.236-2.646 1.233-3.125 1.189-.479-.044-1.541-.611-2.112-1.28-.571-.669-.533-1.604-.416-2.131z" /></svg>
                                        WhatsApp ile Bildir
                                    </button>
                                )}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            handleStatusUpdate(selectedAppointment.id!, 'cancelled');
                                            setSelectedAppointment(null);
                                        }}
                                        className="flex-1 btn-secondary border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 py-3 text-sm font-bold"
                                    >
                                        Randevuyu İptal Et
                                    </button>
                                    <button
                                        onClick={() => setSelectedAppointment(null)}
                                        className="flex-1 btn-primary py-3 text-sm font-bold"
                                    >
                                        Kapat
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Reset */}
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
                    <span className="text-[9px] text-gray-400 font-bold tracking-tighter uppercase whitespace-nowrap">Appointments v1.35</span>
                </div>
            </div>
        </div>
    );
}
