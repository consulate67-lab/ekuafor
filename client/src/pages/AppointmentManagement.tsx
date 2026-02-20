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
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAppointment, setNewAppointment] = useState({
        service_id: 0,
        staff_id: 0,
        appointment_date: '',
        start_time: '09:00',
        end_time: '10:00',
        notes: '',
        price: 0
    });
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const [company, setCompany] = useState<Company | null>(null);
    const [isListening, setIsListening] = useState(false);

    const formatDateKey = (dateStr: any) => {
        if (!dateStr) return '';
        const str = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
        return str.split('T')[0];
    };

    const getLocalDateString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [selectedDate, setSelectedDate] = useState(getLocalDateString());

    const fetchData = async () => {
        try {
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

            try {
                const now = new Date();
                const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

                const appResponse = await api.get('/appointments', {
                    params: {
                        company_id: companyId,
                        start_date: firstDayOfMonth
                    }
                });
                const fetchedApps = appResponse.data?.data || [];
                setAppointments(fetchedApps);
            } catch (err) {
                console.warn('Appointments fetch failed', err);
                setAppointments([]);
            }

            try {
                const svcResponse = await api.get('/services', {
                    params: { company_id: companyId }
                });
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
            setVoiceTranscript(transcript);
            await processVoiceTranscript(transcript);
        };

        recognition.start();
    };

    const processVoiceTranscript = async (transcript: string) => {
        try {
            let date = new Date().toISOString().split('T')[0];
            if (transcript.includes('yarın')) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                date = tomorrow.toISOString().split('T')[0];
            }

            let time = '09:00';
            const timeMatch = transcript.match(/(\d{1,2})[:\s](\d{2})/);
            const hourOnlyMatch = transcript.match(/saat\s?(\d{1,2})/);

            if (timeMatch) {
                time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
            } else if (hourOnlyMatch) {
                let h = parseInt(hourOnlyMatch[1]);
                if (transcript.includes('akşam') && h < 12) h += 12;
                time = `${String(h).padStart(2, '0')}:00`;
            }

            const matchedService = services.find(s => transcript.includes(s.name.toLowerCase()));
            if (!matchedService) {
                alert(`Hizmet anlaşılamadı. Şu hizmetlerden birini söyleyin: ${services.map(s => s.name).join(', ')}`);
                return;
            }

            let customerPart = transcript.split('randevu')[0].split('için').pop()?.trim() || 'Sesli Müşteri';
            customerPart = customerPart.replace(matchedService.name.toLowerCase(), '').trim();

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
                setVoiceTranscript('');
            }
        } catch (err) {
            console.error('Voice parse error', err);
            alert('Komut anlaşılamadı. Lütfen örneğe uygun söyleyin: "Bugün akşam 5 için Saç Kesim Ahmet Yılmaza randevu oluştur"');
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
        const message = `Merhaba ${customerName}, ${company?.name || 'Saloon'} bünyesindeki randevunuz ${date} günü saat ${app.start_time} - ${app.end_time} için onaylanmıştır. İyi günler dileriz.`;

        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    };

    const handleStatusUpdate = async (id: number, status: string) => {
        try {
            await api.patch(`/appointments/${id}/status`, { status });
            fetchData();
        } catch (err: any) {
            const serverError = err.response?.data?.error;
            const message = serverError ? `Sunucu Hatası: ${serverError}` : (err.message || 'Bilinmeyen hata');
            setError(message);
            alert(message);
        }
    };

    const handleAddAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        try {
            const customerName = (newAppointment as any).customer_name;
            const finalNotes = customerName ? `Müşteri: ${customerName} | ${newAppointment.notes}` : newAppointment.notes;

            await api.post('/appointments', {
                ...newAppointment,
                staff_id: newAppointment.staff_id === 0 ? undefined : newAppointment.staff_id,
                company_id: company?.id,
                notes: finalNotes,
                status: 'approved'
            });

            setNewAppointment({
                service_id: 0,
                staff_id: 0,
                appointment_date: getLocalDateString(),
                start_time: '09:00',
                end_time: '10:00',
                notes: '',
                price: 0
            });
            (newAppointment as any).customer_name = '';
            setShowAddForm(false);
            alert('Randevu başarıyla ONAYLI olarak oluşturuldu.');
            fetchData();
        } catch (err: any) {
            setFormError(err.response?.data?.error || 'Randevu kaydedilirken hata oluştu');
        }
    };

    const pendingAppointments = appointments.filter(a => a.status === 'pending');

    if (loading && appointments.length === 0) return <div className="p-8 text-center font-bold text-gray-400 animate-pulse">Veriler Hazırlanıyor...</div>;

    return (
        <div className="min-h-screen bg-slate-50/30">
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
                            const ds = d.toISOString().split('T')[0];
                            const isSel = selectedDate === ds;
                            const isToday = new Date().toISOString().split('T')[0] === ds;
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
                    </div>

                    <div className="space-y-3">
                        {appointments
                            .filter(a => formatDateKey(a.appointment_date) === selectedDate && a.status === 'approved')
                            .sort((a, b) => a.start_time.localeCompare(b.start_time))
                            .length === 0 ? (
                            <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 border-dashed">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200 text-2xl">📅</div>
                                <p className="text-slate-400 font-bold text-sm">Randevu bulunmuyor.</p>
                            </div>
                        ) : (
                            appointments
                                .filter(a => formatDateKey(a.appointment_date) === selectedDate && a.status === 'approved')
                                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                                .map(app => (
                                    <div
                                        key={app.id}
                                        onClick={() => setSelectedAppointment(app)}
                                        className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all"
                                    >
                                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border border-slate-100">
                                            <span className="text-xs font-black text-slate-900 leading-none">{app.start_time.split(':')[0]}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">:{app.start_time.split(':')[1]}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">
                                                {(() => {
                                                    const nameMatch = app.notes?.match(/Müşteri:\s*([^|]+)/);
                                                    return nameMatch ? nameMatch[1].trim() : (app.customer_name || 'Misafir');
                                                })()}
                                            </h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{app.service_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-black text-pink-600 block">₺{app.price || '0'}</span>
                                            <span className="text-[9px] font-bold text-emerald-500 uppercase">Onaylı</span>
                                        </div>
                                    </div>
                                ))
                        )}
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
                        <span className="text-[9px] text-gray-400 font-bold tracking-tighter uppercase whitespace-nowrap">Appointments v1.38</span>
                    </div>
                </div>
            </div>

            {/* Manual Appointment Modal */}
            {showAddForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white p-8 rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Manuel Randevu</h3>
                            <button onClick={() => { setShowAddForm(false); setFormError(''); setError(''); }} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleAddAppointment} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase ml-1 tracking-wider">Hizmet Seçimi</label>
                                <select
                                    required
                                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 font-bold text-slate-900"
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
                                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase ml-1 tracking-wider">Tarih</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 font-bold text-slate-900"
                                        value={newAppointment.appointment_date}
                                        onChange={(e) => setNewAppointment({ ...newAppointment, appointment_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase ml-1 tracking-wider">Saat</label>
                                    <input
                                        type="time"
                                        required
                                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 font-bold text-slate-900"
                                        value={newAppointment.start_time}
                                        onChange={(e) => {
                                            const start = e.target.value;
                                            let end = newAppointment.end_time;
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
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase ml-1 tracking-wider">Müşteri Adı</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 font-bold text-slate-900"
                                    placeholder="Ad Soyad"
                                    value={(newAppointment as any).customer_name || ''}
                                    onChange={(e) => setNewAppointment({ ...newAppointment, customer_name: e.target.value } as any)}
                                />
                            </div>
                            <button type="submit" className="w-full bg-pink-600 text-white py-5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-pink-200 hover:bg-pink-700 active:scale-95 transition-all">
                                Randevu Oluştur
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Appointment Details Modal */}
            {selectedAppointment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white p-8 rounded-[3rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 relative">
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
                                        const name = nameMatch ? nameMatch[1].trim() : (selectedAppointment.customer_name || 'M');
                                        return name[0].toUpperCase();
                                    })()}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-black text-slate-900 text-lg leading-none truncate">
                                        {(() => {
                                            const nameMatch = selectedAppointment.notes?.match(/Müşteri:\s*([^|]+)/);
                                            return nameMatch ? nameMatch[1].trim() : (selectedAppointment.customer_name || 'Misafir');
                                        })()}
                                    </h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Müşteri</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Zaman</p>
                                    <p className="font-black text-slate-900 text-sm">{selectedAppointment.start_time}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tarih</p>
                                    <p className="font-black text-slate-900 text-sm">{new Date(selectedAppointment.appointment_date).toLocaleDateString('tr-TR')}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-2xl">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hizmet</p>
                                <div className="flex justify-between items-center">
                                    <span className="font-black text-slate-900">{selectedAppointment.service_name}</span>
                                    <span className="font-black text-pink-600">₺{selectedAppointment.price || 0}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => handleWhatsAppNotify(selectedAppointment)}
                                    className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all"
                                >
                                    WhatsApp ile Bildir
                                </button>
                                <button
                                    onClick={() => {
                                        handleStatusUpdate(selectedAppointment.id!, 'cancelled');
                                        setSelectedAppointment(null);
                                    }}
                                    className="w-full bg-slate-50 text-red-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all"
                                >
                                    Randevuyu İptal Et
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
