import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Company, Appointment, Expense } from '../types';

export default function SalonBoard() {
    const navigate = useNavigate();
    const [boardKey, setBoardKey] = useState<string | null>(localStorage.getItem('salon_board_key'));
    const [inputKey, setInputKey] = useState('');
    const [company, setCompany] = useState<Company | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [pendingAppointments, setPendingAppointments] = useState<Appointment[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [services, setServices] = useState<any[]>([]);
    const [packages, setPackages] = useState<any[]>([]);
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
    const [isPendingListModalOpen, setIsPendingListModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [selectedCell, setSelectedCell] = useState<{ person: any, hour: string } | null>(null);
    const [fastForm, setFastForm] = useState({
        customerName: '',
        serviceId: '',
        serviceIds: [] as number[],
        packageId: '',
        notes: '',
        staffId: '' as string | number,
        appointmentDate: '',
        startTime: '',
        serviceStaffOverrides: {} as Record<number, number>, // {serviceId: staffId}
        servicePriceOverrides: {} as Record<number, number>, // {serviceId: price}
        serviceDurationOverrides: {} as Record<number, number>, // {serviceId: duration}
        activeTab: 'services' as 'services' | 'packages'
    });

    // Payment States
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [completionModal, setCompletionModal] = useState<{ open: boolean; app: Appointment | null; amount: number }>({ open: false, app: null, amount: 0 });
    const [paymentApp, setPaymentApp] = useState<Appointment | null>(null);
    const [nfcState, setNfcState] = useState<'IDLE' | 'SCANNING' | 'SUCCESS' | 'ERROR'>('IDLE');

    // Expense States
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [expenseForm, setExpenseForm] = useState({
        description: '',
        amount: '',
        category: 'genel',
        is_local: false
    });
    const [isSyncing, setIsSyncing] = useState(false);
    const isLocalMode = localStorage.getItem('isLocalMode') === 'true';

    const pendingSyncCount = useMemo(() => {
        return appointments.filter(a => a.is_local || (a as any).is_updated_locally).length + expenses.filter((e: any) => e.is_local).length;
    }, [appointments, expenses]);

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

            const [appsRes, pendingRes, staffRes, servRes, pkgRes, deptRes] = await Promise.all([
                api.get('/appointments', { params: { company_id: compId, start_date: dateToFetch, end_date: dateToFetch } }),
                api.get('/appointments', { params: { company_id: compId, status: 'pending' } }),
                api.get(`/companies/${compId}/employees`),
                api.get('/services', { params: { company_id: compId } }),
                api.get('/packages', { params: { company_id: compId } }),
                api.get('/departments', { params: { company_id: compId } })
            ]);

            setAppointments(appsRes.data.data || []);
            setPendingAppointments(pendingRes.data.data || []);
            setStaff(staffRes.data.data || []);
            setServices(servRes.data.data || []);
            setPackages(pkgRes.data.data || []);
            setDepartments(deptRes.data.data || []);
        } catch (err) {
            console.error('Veri senkronizasyonu başarısız', err);
        }
    }, [selectedDate]);

    // Auto-Setup for Terminal Mode
    useEffect(() => {
        if (isLocalMode && boardKey === 'terminal-mode') {
            const hasData = localStorage.getItem('saloon_users');
            if (!hasData) {
                if (confirm('Terminal Modu ilk kez başlatılıyor. Şirket verileri (personel, hizmetler, saatler) şimdi sunucudan indirilsin mi?')) {
                    handleSyncDown();
                }
            }
        }
    }, [isLocalMode, boardKey]);

    const fetchExpenses = useCallback(async (date?: string) => {
        try {
            const dateToFetch = date || selectedDate;
            const res = await api.get('/expenses', { params: { date: dateToFetch } });
            setExpenses(res.data.data || []);
        } catch (err) {
            console.error('Masraf yükleme hatası', err);
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

    const handleTerminalSetup = async () => {
        if (!inputKey) {
            setError('Lütfen firmanıza ait Terminal Anahtarını girin.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            // 1. Verify Key & Get Company Data
            const res = await api.post('/companies/board-login', { board_key: inputKey });
            if (!res.data.success) throw new Error('Geçersiz anahtar.');

            const companyData = res.data.data;
            const compId = companyData.id;

            // 2. Fetch EVERYTHING for offline use
            const [staffRes, servRes, pkgRes, deptRes] = await Promise.all([
                api.get(`/companies/${compId}/employees`, { headers: { 'X-No-Mock': 'true' } }),
                api.get('/services', { params: { company_id: compId }, headers: { 'X-No-Mock': 'true' } }),
                api.get('/packages', { params: { company_id: compId }, headers: { 'X-No-Mock': 'true' } }),
                api.get('/departments', { params: { company_id: compId }, headers: { 'X-No-Mock': 'true' } })
            ]);

            // 3. Save to Local Database (localStorage)
            localStorage.setItem('saloon_companies', JSON.stringify([companyData]));
            localStorage.setItem('saloon_users', JSON.stringify(staffRes.data.data || []));
            localStorage.setItem('saloon_services', JSON.stringify(servRes.data.data || []));
            localStorage.setItem('saloon_packages', JSON.stringify(pkgRes.data.data || []));
            localStorage.setItem('saloon_departments', JSON.stringify(deptRes.data.data || []));
            
            // 4. Switch to Local Mode
            localStorage.setItem('isLocalMode', 'true');
            localStorage.setItem('salon_board_key', 'terminal-mode');
            localStorage.setItem('salon_board_company_id', compId.toString());

            alert('✅ TERMINAL KURULUMU BAŞARILI!\n\nFirmanızın tüm verileri tablete indirildi. Artık internet olmasa bile kullanabilirsiniz.');
            window.location.reload();

        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Kurulum başarısız');
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
                if (isLocalMode) fetchExpenses();
                setCurrentHour(new Date().getHours());
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [boardKey, fetchData, fetchExpenses, isLocalMode]);

    useEffect(() => {
        if (boardKey && isLocalMode) {
            fetchExpenses();
        }
    }, [boardKey, isLocalMode, fetchExpenses]);

    // In staff mode, filter staff list to only show the logged-in staff member, or filter by department
    const displayStaff = staffMode && staffInfo
        ? staff.filter(s => s.user_id === staffInfo.id || s.id === staffInfo.id)
        : selectedDepartmentId === 'all'
            ? staff
            : staff.filter(s => Number(s.department_id) === Number(selectedDepartmentId));

    // PERFORMANCE OPTIMIZATION: Pre-calculate occupied slots to avoid O(N^2) filtering in the matrix
    const slotLookup = useMemo(() => {
        const lookup = new Map<string, Appointment[]>();
        if (!company) return lookup;

        const slotInterval = company.slot_interval || 30;

        appointments.forEach(a => {
            const appDate = (a.appointment_date || '').substring(0, 10);
            if (a.status === 'cancelled' || appDate !== selectedDate) return;

            const [asH, asM] = a.start_time.split(':').map(Number);
            const [aeH, aeM] = a.end_time.split(':').map(Number);
            const aStart = asH * 60 + asM;
            const aEnd = aeH * 60 + aeM;

            // Unique staff involved in this appointment
            const staffIds = new Set<number>();
            if (a.staff_id) staffIds.add(Number(a.staff_id));
            a.services?.forEach((s: any) => { if (s.staff_id) staffIds.add(Number(s.staff_id)); });

            staffIds.forEach(pId => {
                // For each involved staff, find specific segments
                // Legacy / General involvement:
                for (let t = aStart; t < aEnd; t += slotInterval) {
                    const key = `${pId}-${t}`;
                    if (!lookup.has(key)) lookup.set(key, []);
                    const list = lookup.get(key)!;
                    if (!list.find(found => found.id === a.id)) list.push(a);
                }

                // Service-specific involvement (overrides general if timing exists)
                a.services?.forEach((s: any) => {
                    if (Number(s.staff_id) === pId && s.start_time && s.end_time) {
                        const [ssH, ssM] = s.start_time.split(':').map(Number);
                        const [seH, seM] = s.end_time.split(':').map(Number);
                        const sStart = ssH * 60 + ssM;
                        const sEnd = seH * 60 + seM;

                        for (let t = sStart; t < sEnd; t += slotInterval) {
                            const key = `${pId}-${t}`;
                            if (!lookup.has(key)) lookup.set(key, []);
                            const list = lookup.get(key)!;
                            if (!list.find(found => found.id === a.id)) list.push(a);
                        }
                    }
                });
            });
        });
        return lookup;
    }, [appointments, selectedDate, company, staff]);

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

            let totalDuration = 0;
            let totalPrice = 0;
            let sIds = [...fastForm.serviceIds];

            if (fastForm.packageId) {
                const pkg = packages.find(p => p.id === parseInt(fastForm.packageId));
                if (pkg) {
                    sIds = pkg.services?.map((s: any) => s.id) || [];
                    const hasOverrides = Object.keys(fastForm.servicePriceOverrides).length > 0 || Object.keys(fastForm.serviceDurationOverrides).length > 0;

                    if (hasOverrides) {
                        totalDuration = sIds.reduce((sum, sid) => sum + ((fastForm.serviceDurationOverrides[sid] !== undefined) ? fastForm.serviceDurationOverrides[sid] : (pkg.services.find((ps: any) => ps.id === sid)?.duration_minutes || 0)), 0);
                        totalPrice = sIds.reduce((sum, sid) => sum + Number((fastForm.servicePriceOverrides[sid] !== undefined) ? fastForm.servicePriceOverrides[sid] : (pkg.services.find((ps: any) => ps.id === sid)?.price || 0)), 0);
                    } else {
                        totalDuration = pkg.duration_minutes || 0;
                        totalPrice = Number(pkg.price || 0);
                    }
                }
            } else {
                const selectedServices = services.filter(s => sIds.includes(s.id));
                const hasOverrides = Object.keys(fastForm.servicePriceOverrides).length > 0 || Object.keys(fastForm.serviceDurationOverrides).length > 0;

                if (hasOverrides) {
                    totalDuration = selectedServices.reduce((sum, s) => sum + ((fastForm.serviceDurationOverrides[s.id] !== undefined) ? fastForm.serviceDurationOverrides[s.id] : (s.duration_minutes || 0)), 0);
                    totalPrice = selectedServices.reduce((sum, s) => sum + Number((fastForm.servicePriceOverrides[s.id] !== undefined) ? fastForm.servicePriceOverrides[s.id] : (s.price || 0)), 0);
                } else {
                    totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
                    totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
                    if (sIds.length === 0 && services[0]) {
                        sIds = [services[0].id];
                        totalDuration = services[0].duration_minutes;
                        totalPrice = Number(services[0].price);
                    }
                }
            }

            const [sh, sm] = startTime.split(':').map(Number);
            const newStart = sh * 60 + sm;
            const newEnd = newStart + totalDuration;
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
                alert(`⚠️ Çakışma tespit edildi!\n\nSeçilen saat: ${startTime} - ${endTime} (${totalDuration} dk)\nMevcut randevu: ${conflict.start_time} - ${conflict.end_time} (${conflict.customer_name || 'Misafir'})\n\nLütfen başka bir saat seçin.`);
                setLoading(false);
                return;
            }

            const selectedPackage = fastForm.packageId ? packages.find(p => p.id === parseInt(fastForm.packageId)) : null;
            const selectedServices = services.filter(s => sIds.includes(s.id));

            // Map service selection to include requested staff
            const sSelections = selectedPackage
                ? selectedPackage.services.map((s: any) => ({
                    id: s.id,
                    price: (fastForm.servicePriceOverrides[s.id] !== undefined) ? fastForm.servicePriceOverrides[s.id] : s.price,
                    duration_minutes: (fastForm.serviceDurationOverrides[s.id] !== undefined) ? fastForm.serviceDurationOverrides[s.id] : s.duration_minutes,
                    staff_id: fastForm.serviceStaffOverrides[s.id] || Number(staffId)
                }))
                : selectedServices.map(s => ({
                    id: s.id,
                    price: (fastForm.servicePriceOverrides[s.id] !== undefined) ? fastForm.servicePriceOverrides[s.id] : s.price,
                    duration_minutes: (fastForm.serviceDurationOverrides[s.id] !== undefined) ? fastForm.serviceDurationOverrides[s.id] : s.duration_minutes,
                    staff_id: fastForm.serviceStaffOverrides[s.id] || Number(staffId)
                }));

            await api.post('/appointments', {
                company_id: company.id,
                staff_id: parseInt(staffId.toString()),
                service_id: sIds[0],
                service_ids: sIds,
                services: sSelections, // Pass the detailed selections with staff_id
                package_id: fastForm.packageId ? parseInt(fastForm.packageId) : null,
                appointment_date: date,
                start_time: startTime,
                end_time: endTime,
                customer_name: fastForm.customerName || 'Misafir Müşteri',
                notes: fastForm.notes,
                price: totalPrice,
                status: 'approved'
            });

            setIsModalOpen(false);
            setFastForm({
                customerName: '',
                serviceId: '',
                serviceIds: [],
                packageId: '',
                notes: '',
                staffId: '',
                appointmentDate: '',
                startTime: '',
                serviceStaffOverrides: {},
                servicePriceOverrides: {},
                serviceDurationOverrides: {},
                activeTab: 'services'
            });
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

    const handleExpenseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await api.post('/expenses', {
                description: expenseForm.description,
                amount: Number(expenseForm.amount),
                category: expenseForm.category,
                date: selectedDate
            });
            setExpenseForm({ description: '', amount: '', category: 'genel', is_local: false });
            fetchExpenses();
        } catch (err) {
            alert('Masraf eklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteExpense = async (id: number) => {
        if (!confirm('Bu masrafı silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/expenses/${id}`);
            fetchExpenses();
        } catch (err) {
            alert('Masraf silinemedi');
        }
    };

    const handleUpdateStatus = async (id: number, newStatus: string, currentPrice?: number) => {
        let msg = '';
        let finalPrice = currentPrice;

        if (newStatus === 'cancelled') msg = 'Bu randevuyu iptal etmek istediğinize emin misiniz?';
        if (newStatus === 'approved') msg = 'Bu randevuyu onaylamak istiyor musunuz?';
        if (newStatus === 'completed') {
            const app = appointments.find(a => a.id === id) || pendingAppointments.find(a => a.id === id);
            setCompletionModal({
                open: true,
                app: app || null,
                amount: currentPrice || 0
            });
            return;
        }

        if (msg && !confirm(msg)) return;

        try {
            setLoading(true);
            await api.patch(`/appointments/${id}/status`, {
                status: newStatus,
                price: finalPrice
            });
            setIsDetailModalOpen(false);
            setIsPendingListModalOpen(false);
            if (company?.id) await fetchData(company.id);
        } catch (err: any) {
            alert(err.response?.data?.error || 'İşlem başarısız oldu');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateServiceStatus = async (apsId: number, newStatus: string) => {
        try {
            setLoading(true);
            await api.patch(`/appointments/service/${apsId}/status`, { status: newStatus });
            if (company?.id) await fetchData(company.id);

            // Refetch current appointment to update modal state
            if (selectedAppointment?.id) {
                const res = await api.get('/appointments', { params: { ids: selectedAppointment.id.toString() } });
                if (res.data?.data?.[0]) {
                    setSelectedAppointment(res.data.data[0]);
                }
            }
        } catch (err: any) {
            console.error('Service update failed:', err);
            alert(err.response?.data?.error || 'Hizmet onaylanırken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleSyncDown = async () => {
        if (!company || isLocalMode) return;
        if (!confirm('Salon verileri çevrimdışı kullanım için bu cihaza indirilsin mi?')) return;

        try {
            setIsSyncing(true);
            const compId = company.id;

            // Fetch everything
            const [staffRes, servRes, pkgRes, deptRes] = await Promise.all([
                api.get(`/companies/${compId}/employees`, { headers: { 'X-No-Mock': 'true' } }),
                api.get('/services', { params: { company_id: compId }, headers: { 'X-No-Mock': 'true' } }),
                api.get('/packages', { params: { company_id: compId }, headers: { 'X-No-Mock': 'true' } }),
                api.get('/departments', { params: { company_id: compId }, headers: { 'X-No-Mock': 'true' } })
            ]);

            // Save to localStorage specifically for mock-server keys
            localStorage.setItem('saloon_companies', JSON.stringify([company]));
            localStorage.setItem('saloon_users', JSON.stringify(staffRes.data.data || []));
            localStorage.setItem('saloon_services', JSON.stringify(servRes.data.data || []));
            localStorage.setItem('saloon_packages', JSON.stringify(pkgRes.data.data || []));
            localStorage.setItem('saloon_departments', JSON.stringify(deptRes.data.data || []));

            alert('✅ Veriler başarıyla indirildi. İnternet kesilirse Terminal Modu\'na geçebilirsiniz.');
        } catch (err) {
            console.error('Sync down failed:', err);
            
            // Fallback for crucial services if sync fails
            const defaultServices = [
                { id: 999001, name: 'Saç Kesimi (Standart)', price: 200, duration_minutes: 30, company_id: company.id },
                { id: 999002, name: 'Yıkama & Fön', price: 100, duration_minutes: 20, company_id: company.id },
                { id: 999003, name: 'Sakal Tıraşı', price: 100, duration_minutes: 15, company_id: company.id }
            ];
            
            if (!localStorage.getItem('saloon_services')) {
                localStorage.setItem('saloon_services', JSON.stringify(defaultServices));
                alert('⚠️ Sunucuya bağlanılamadı, varsayılan hizmetler tanımlandı.');
            } else {
                alert('❌ Veri indirme başarısız oldu. Lütfen internet bağlantınızı kontrol edin.');
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSyncUp = async () => {
        if (!isLocalMode || pendingSyncCount === 0) return;
        if (!confirm(`${pendingSyncCount} adet yerel değişiklik buluta yüklensin mi?`)) return;

        try {
            setIsSyncing(true);

            // Sync NEW Appointments
            const localApps = appointments.filter(a => a.is_local);
            for (const app of localApps) {
                // Remove ID and is_local before sending to real server
                const { id, is_local, is_updated_locally, service_name, end_time, ...cleanData } = app as any;
                await api.post('/appointments', cleanData, { headers: { 'X-No-Mock': 'true' } });
            }

            // Sync UPDATED Appointments
            const updatedApps = appointments.filter(a => (a as any).is_updated_locally && !a.is_local);
            for (const app of updatedApps) {
                const { id, is_local, is_updated_locally, ...patchData } = app as any;
                await api.patch(`/appointments/${id}/status`, patchData, { headers: { 'X-No-Mock': 'true' } });
            }

            // Sync Expenses
            const localExps = expenses.filter((e: any) => e.is_local);
            for (const exp of localExps) {
                const { id, is_local, created_at, ...cleanData } = exp as any;
                await api.post('/expenses', cleanData, { headers: { 'X-No-Mock': 'true' } });
            }

            alert('✅ Tüm veriler başarıyla buluta yüklendi.');

            if (confirm('İşlem tamamlandı. Canlı moda (Live Sync) geçilsin mi?')) {
                localStorage.removeItem('isLocalMode');
                window.location.reload();
            } else {
                window.location.reload();
            }

        } catch (err) {
            console.error('Sync up failed:', err);
            alert('❌ Senkronizasyon sırasında hata oluştu. Bazı veriler yüklenememiş olabilir.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleAddLocalStaff = (name: string, deptId: string) => {
        const currentStaff = JSON.parse(localStorage.getItem('saloon_users') || '[]');
        const newId = Date.now();
        const newStaff = {
            id: newId,
            first_name: name.split(' ')[0],
            last_name: name.split(' ').slice(1).join(' ') || '',
            role: 'staff',
            department_id: deptId,
            company_id: company?.id || 1,
            photo: null
        };

        const updated = [...currentStaff, newStaff];
        localStorage.setItem('saloon_users', JSON.stringify(updated));
        setStaff(updated);
        alert('✅ Yeni personel yerel hafızaya eklendi.');
    };

    const handleUpdateLocalWorkHours = (start: string, end: string) => {
        if (!company) return;
        const updatedCompany = { ...company, work_start_time: start, work_end_time: end };
        localStorage.setItem('saloon_companies', JSON.stringify([updatedCompany]));
        setCompany(updatedCompany);
        alert('✅ Çalışma saatleri güncellendi.');
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
                            {loading ? 'Bağlanıyor...' : 'Çevrimiçi Başlat'}
                        </button>

                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#1a2333] px-4 text-slate-500 font-bold tracking-widest">VEYA</span></div>
                        </div>

                        <button
                            type="button"
                            onClick={handleTerminalSetup}
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-6 rounded-2xl font-black uppercase tracking-widest shadow-[0_20px_40px_-10px_rgba(79,70,229,0.3)] active:scale-95 transition-all disabled:opacity-50 border border-white/10 flex items-center justify-center gap-3"
                        >
                            <span className="text-xl">📟</span>
                            {loading ? 'KURULUYOR...' : 'TERMINAL KURULUMU YAP'}
                        </button>
                        <p className="text-white/30 text-[9px] font-bold uppercase tracking-[0.2em] mt-4">
                            * Kurulum için bir kerelik internet bağlantısı gerekir.
                        </p>
                    </form>
                </div>
            </div>
        );
    }

    const filteredPending = pendingAppointments.filter(a => {
        if (a.status !== 'pending') return false;
        if (!staffMode || !staffInfo) return true;
        const myId = Number(staffInfo?.id);
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

    const pendingCount = filteredPending.length;

    const getSpecialDay = (dateStr: string) => {
        const d = new Date(dateStr);
        const day = d.getDate();
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        const key = `${day}-${month}`;

        // Sabit Milli Bayramlar
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

        // Dini Bayramlar (Her yıl değiştiği için yıla göre kontrol)
        const religiousDays: Record<number, Record<string, string>> = {
            2026: {
                '19-3': 'Ramazan Bayramı Arifesi',
                '20-3': 'Ramazan Bayramı',
                '21-3': 'Ramazan Bayramı',
                '22-3': 'Ramazan Bayramı',
                '26-5': 'Kurban Bayramı Arifesi',
                '27-5': 'Kurban Bayramı',
                '28-5': 'Kurban Bayramı',
                '29-5': 'Kurban Bayramı',
                '30-5': 'Kurban Bayramı'
            },
            2027: {
                '8-3': 'Ramazan Bayramı Arifesi',
                '9-3': 'Ramazan Bayramı',
                '10-3': 'Ramazan Bayramı',
                '11-3': 'Ramazan Bayramı',
                '15-5': 'Kurban Bayramı Arifesi',
                '16-5': 'Kurban Bayramı',
                '17-5': 'Kurban Bayramı',
                '18-5': 'Kurban Bayramı',
                '19-5': 'Kurban Bayramı / Gençlik ve Spor Bayramı'
            },
            2028: {
                '25-2': 'Ramazan Bayramı Arifesi',
                '26-2': 'Ramazan Bayramı',
                '27-2': 'Ramazan Bayramı',
                '28-2': 'Ramazan Bayramı',
                '3-5': 'Kurban Bayramı Arifesi',
                '4-5': 'Kurban Bayramı',
                '5-5': 'Kurban Bayramı',
                '6-5': 'Kurban Bayramı',
                '7-5': 'Kurban Bayramı'
            }
        };

        return religiousDays[year]?.[key] || fixedDays[key] || null;
    };

    const specialDay = getSpecialDay(selectedDate);

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans overflow-hidden selection:bg-indigo-100">
            {/* Ultra Modern Header */}
            {/* Premium Streamlined Header */}
            <header className="bg-white px-6 lg:px-8 py-4 border-b border-slate-100 z-[150] shadow-sm sticky top-0">
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
                                <span className={`w-1.5 h-1.5 ${isLocalMode ? 'bg-amber-500' : 'bg-emerald-500'} rounded-full animate-ping`}></span>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    {isLocalMode ? 'Terminal Mode (Offline)' : 'Live Sync'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {pendingCount > 0 && (
                                <button
                                    onClick={() => setIsPendingListModalOpen(true)}
                                    className="relative group focus:outline-none"
                                >
                                    <div className="absolute -inset-1 bg-amber-500 rounded-xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                                    <div className="relative flex items-center bg-amber-500 text-white px-4 py-2.5 rounded-xl gap-2 font-black shadow-lg shadow-amber-200 animate-bounce active:scale-95 transition-all">
                                        <span className="text-sm">{pendingCount}</span>
                                        <span className="text-[10px] uppercase tracking-widest hidden sm:inline">Talep</span>
                                    </div>
                                </button>
                            )}

                            {/* Settings Gear Icon (Somun) */}
                            {isLocalMode && (
                                <button
                                    onClick={() => setIsSettingsModalOpen(true)}
                                    className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all active:scale-90"
                                    title="Parametre ve Personel Ayarları"
                                >
                                    <svg className="w-6 h-6 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                            )}

                            {isLocalMode && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsExpenseModalOpen(true)}
                                        className="group w-12 h-12 rounded-2xl bg-white border-2 border-slate-50 text-slate-400 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all duration-300 flex items-center justify-center shadow-lg shadow-slate-100/50 active:scale-90"
                                        title="Masraf Girişi"
                                    >
                                        <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </button>

                                    {pendingSyncCount > 0 && (
                                        <button
                                            onClick={handleSyncUp}
                                            disabled={isSyncing}
                                            className="group relative w-12 h-12 rounded-2xl bg-amber-500 text-white border-2 border-amber-300 hover:bg-amber-600 transition-all duration-300 flex items-center justify-center shadow-lg shadow-amber-200/50 active:scale-90 animate-pulse"
                                            title={`${pendingSyncCount} Kaydı Buluta Yükle`}
                                        >
                                            <svg className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            <div className="absolute -top-2 -right-2 bg-slate-900 text-white text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{pendingSyncCount}</div>
                                        </button>
                                    )}
                                </div>
                            )}

                            {!isLocalMode && (
                                <button
                                    onClick={handleSyncDown}
                                    disabled={isSyncing}
                                    className="group w-12 h-12 rounded-2xl bg-white border-2 border-indigo-50 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all duration-300 flex items-center justify-center shadow-lg shadow-indigo-100/50 active:scale-90"
                                    title="Çevrimdışı İçin Verileri İndir"
                                >
                                    <svg className={`w-5 h-5 ${isSyncing ? 'animate-bounce' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                            )}

                            {/* Options Button with Department Filter */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsOptionsOpen(!isOptionsOpen)}
                                    className="group w-12 h-12 rounded-2xl bg-white border-2 border-slate-50 text-slate-400 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all duration-300 flex items-center justify-center shadow-lg shadow-slate-100/50 active:scale-90"
                                    title="Seçenekler"
                                >
                                    <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 12h9.75M10.5 18h9.75M3 6h.008v.008H3V6zm0 12h.008v.008H3V18zm0-6h.008v.008H3V12z" />
                                    </svg>
                                </button>

                                {isOptionsOpen && (
                                    <>
                                        <div className="fixed inset-0 z-[160]" onClick={() => setIsOptionsOpen(false)}></div>
                                        <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[170] p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="flex flex-col gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Departman Filtresi</label>
                                                    <select
                                                        value={selectedDepartmentId}
                                                        onChange={(e) => {
                                                            setSelectedDepartmentId(e.target.value);
                                                            setIsOptionsOpen(false);
                                                        }}
                                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                                                    >
                                                        <option value="all">Tüm Departmanlar</option>
                                                        {departments.map(dept => (
                                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="h-px bg-slate-100 w-full"></div>
                                                {isLocalMode && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Terminal modundan çıkılsın mı?')) {
                                                                localStorage.removeItem('isLocalMode');
                                                                localStorage.removeItem('salon_board_key');
                                                                window.location.href = '/';
                                                            }
                                                        }}
                                                        className="w-full flex items-center justify-between px-3 py-2 bg-amber-50 text-amber-600 rounded-xl text-sm font-bold hover:bg-amber-100 transition-all"
                                                    >
                                                        <span>Terminali Kapat</span>
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                                        </svg>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Sistemden çıkış yapılsın mı?')) {
                                                            if (staffMode) handleStaffLogout();
                                                            else { localStorage.removeItem('salon_board_key'); window.location.reload(); }
                                                        }
                                                    }}
                                                    className="w-full flex items-center justify-between px-3 py-2 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-100 transition-all"
                                                >
                                                    <span>Güvenli Çıkış</span>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    setFastForm({
                                        customerName: '',
                                        serviceId: services[0]?.id?.toString() || '',
                                        serviceIds: [] as number[],
                                        packageId: '',
                                        notes: '',
                                        staffId: staff[0]?.user_id || staff[0]?.id || '',
                                        appointmentDate: selectedDate,
                                        startTime: hours.find(h => {
                                            const hNum = parseInt(h.split(':')[0]);
                                            return hNum >= currentHour;
                                        }) || '09:00',
                                        serviceStaffOverrides: {},
                                        servicePriceOverrides: {},
                                        serviceDurationOverrides: {},
                                        activeTab: 'services'
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
                                        <span className="text-base font-black text-white tracking-tight">{company?.staff_label ? (company.staff_label + 'lar') : 'Uzmanlar'}</span>
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
                                                    className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl text-white flex items-center justify-center font-black text-xl lg:text-2xl uppercase shadow-lg shrink-0 overflow-hidden border-2 border-white"
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

                                            // Find appointments that are active during this slot
                                            // Optimized lookup
                                            const activeAtSlot = slotLookup.get(`${pId}-${slotTotal}`) || [];

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
                                                            packageId: '',
                                                            notes: '',
                                                            staffId: pId.toString(),
                                                            appointmentDate: selectedDate,
                                                            startTime: hour,
                                                            serviceStaffOverrides: {},
                                                            servicePriceOverrides: {},
                                                            serviceDurationOverrides: {},
                                                            activeTab: 'services'
                                                        });
                                                        setIsModalOpen(true);
                                                    }}
                                                >
                                                    <div className={`space-y-1.5 min-h-[80px] transition-all ${isSlotPast && isSlotFree ? 'opacity-10' : ''}`}>
                                                        {/* Boş slot - sadece gelecekteyse Müsait göster */}
                                                        {isSlotFree && !isSlotPast && (
                                                            <div className="opacity-0 group-hover:opacity-100 flex items-center justify-center h-[72px] border-2 border-dashed border-slate-200 rounded-lg text-[8px] text-slate-400 font-black uppercase tracking-widest transition-all bg-white shadow-sm">
                                                                MÜSAİT
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
                                                                        setSelectedCell({ hour, person }); // Sync context for the modal
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
                                                                        {(app.is_local || (app as any).is_updated_locally) && (
                                                                            <span className="px-1 py-0.5 bg-amber-500 text-white text-[6px] font-black uppercase tracking-widest rounded-full shadow-sm animate-pulse">
                                                                                Lokal
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center justify-between mb-0.5">
                                                                        <p className="text-xs font-black truncate leading-none tracking-tight">{app.customer_name || 'Misafir'}</p>
                                                                        {(() => {
                                                                            const myService = app.services?.find((s: any) =>
                                                                                Number(s.staff_id) === Number(pId) &&
                                                                                s.start_time && s.end_time &&
                                                                                (() => {
                                                                                    const [sh, sm] = s.start_time.split(':').map(Number);
                                                                                    return (sh * 60 + sm) >= slotTotal && (sh * 60 + sm) < nextSlotTotal;
                                                                                })()
                                                                            );
                                                                            return myService && (
                                                                                <span className="text-[7px] font-black bg-white/40 px-1 rounded truncate ml-1">{myService.start_time}</span>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                    <p className="text-[7px] font-bold text-slate-400 truncate uppercase tracking-widest leading-none">
                                                                        {(() => {
                                                                            // Find the specific service that covers THIS slot for THIS staff
                                                                            const myService = app.services?.find((s: any) => {
                                                                                if (Number(s.staff_id) !== Number(pId)) return false;
                                                                                if (!s.start_time || !s.end_time) return false;
                                                                                const [ssH, ssM] = s.start_time.split(':').map(Number);
                                                                                const [seH, seM] = s.end_time.split(':').map(Number);
                                                                                const sStart = ssH * 60 + ssM;
                                                                                const sEnd = seH * 60 + seM;
                                                                                return slotTotal >= sStart && slotTotal < sEnd;
                                                                            });

                                                                            if (myService) return <span className="text-emerald-600 font-extrabold">✂️ {myService.name}</span>;

                                                                            if (app.package_name) return <span className="text-indigo-600 font-extrabold">📦 {app.package_name}</span>;

                                                                            return app.services && app.services.length > 0
                                                                                ? app.services.map((s: any) => s.name).join(', ')
                                                                                : (app.service_name || (company?.service_label || 'Hizmet'));
                                                                        })()}
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
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                        <div className="bg-white w-full max-w-2xl max-h-[95vh] rounded-[2.5rem] lg:rounded-[4rem] overflow-y-auto shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-100 animate-scale-up">
                            <div className="relative p-6 lg:p-12 bg-gradient-to-br from-slate-50 to-white">
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
                                            <div className="flex gap-4 mb-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setFastForm({ ...fastForm, activeTab: 'services', packageId: '' })}
                                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${fastForm.activeTab === 'services' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                                                >
                                                    {company?.service_label ? (company.service_label + 'ler') : 'Hizmetler'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFastForm({ ...fastForm, activeTab: 'packages', serviceIds: [], packageId: fastForm.packageId || (packages[0]?.id?.toString() || '') })}
                                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${fastForm.activeTab === 'packages' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                                                >
                                                    Paketler
                                                </button>
                                            </div>

                                            {fastForm.activeTab === 'services' ? (
                                                <>
                                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">{(company?.service_label || 'Hizmet')} Seçimi (Birden Fazla Seçebilirsiniz)</label>
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
                                                </>
                                            ) : (
                                                <>
                                                    <div className="space-y-3 max-h-64 overflow-y-auto p-4 bg-slate-50 rounded-[2.5rem]">
                                                        {packages.length === 0 ? (
                                                            <div className="text-center py-10">
                                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Henüz paket tanımlanmamış</p>
                                                            </div>
                                                        ) : (
                                                            packages.map(p => {
                                                                const isSelected = parseInt(fastForm.packageId) === p.id;
                                                                return (
                                                                    <div key={p.id} className="space-y-4">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setFastForm({ ...fastForm, packageId: p.id.toString(), serviceIds: [], serviceStaffOverrides: {} })}
                                                                            className={`w-full p-4 rounded-2xl border-2 transition-all flex flex-col gap-1 text-left ${isSelected ? 'bg-amber-600 border-amber-600 text-white shadow-lg' : 'bg-white border-transparent text-slate-600'}`}
                                                                        >
                                                                            <p className={`text-xs font-black uppercase leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>{p.name}</p>
                                                                            <div className="flex items-center gap-2">
                                                                                {p.services && p.services.length > 0 && (() => {
                                                                                    const originalSum = p.services.reduce((sum: number, ps: any) => sum + (ps.price || 0), 0);
                                                                                    if (originalSum > (p.price || 0)) {
                                                                                        return <span className={`text-[8px] font-bold line-through opacity-60 ${isSelected ? 'text-white' : 'text-slate-400'}`}>₺{originalSum}</span>;
                                                                                    }
                                                                                    return null;
                                                                                })()}
                                                                                <p className={`text-[8px] font-bold ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>₺{p.price} | {p.duration_minutes} dk</p>
                                                                            </div>
                                                                        </button>

                                                                        {isSelected && (
                                                                            <div className="pl-6 space-y-3 animate-in slide-in-from-left duration-300 border-l-4 border-amber-200 ml-2">
                                                                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest pl-2">🛠️ İşlem Dağılımı (Sıralı Yapılacak)</p>
                                                                                <div className="space-y-2">
                                                                                    {p.services?.map((ps: any) => (
                                                                                        <div key={ps.id} className="flex items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-amber-400">
                                                                                            <div className="flex flex-col flex-1 min-w-0 pl-2">
                                                                                                <span className="text-[10px] font-black text-slate-700 uppercase truncate">{ps.name}</span>
                                                                                                <div className="flex gap-2 mt-1">
                                                                                                    <div className="flex-1">
                                                                                                        <label className="block text-[7px] font-bold text-slate-400 uppercase mb-0.5 ml-1">Süre (Dk)</label>
                                                                                                        <div className="w-full p-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-400">
                                                                                                            {ps.duration_minutes}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="flex-1">
                                                                                                        <label className="block text-[7px] font-bold text-slate-400 uppercase mb-0.5 ml-1">Fiyat (₺)</label>
                                                                                                        <div className="w-full p-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-400">
                                                                                                            {ps.price}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="flex flex-col items-end gap-1">
                                                                                                <span className="text-[8px] font-black text-slate-400 uppercase">{company?.staff_label || 'Uzman'}</span>
                                                                                                <select
                                                                                                    value={fastForm.serviceStaffOverrides[ps.id] || fastForm.staffId || selectedCell?.person.user_id || selectedCell?.person.id}
                                                                                                    onChange={(e) => {
                                                                                                        setFastForm(prev => ({
                                                                                                            ...prev,
                                                                                                            serviceStaffOverrides: {
                                                                                                                ...prev.serviceStaffOverrides,
                                                                                                                [ps.id]: Number(e.target.value)
                                                                                                            }
                                                                                                        }));
                                                                                                    }}
                                                                                                    className="text-[10px] font-bold bg-amber-50 text-amber-900 border-none rounded-xl p-2 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
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
                                                                                <div className="flex justify-between items-center bg-amber-50 p-4 rounded-2xl border-2 border-amber-200 shadow-inner mt-2">
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">TOPLAM SÜRE</span>
                                                                                        <span className="text-sm font-black text-amber-900">
                                                                                            {p.duration_minutes || 0} DK
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="flex flex-col items-end">
                                                                                        <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">TOPLAM FİYAT</span>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-lg font-black text-amber-900">
                                                                                                ₺{p.price || 0}
                                                                                            </span>
                                                                                        </div>
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

                                        <div className="space-y-4 col-span-1 md:col-span-2">
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Başlangıç Saati</label>
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-40 overflow-y-auto p-4 bg-slate-50 rounded-[2.5rem]">
                                                {hours.map(h => {
                                                    const isSelected = (fastForm.startTime || selectedCell?.hour) === h;
                                                    const [sh, sm] = h.split(':').map(Number);
                                                    const selectedTotal = sh * 60 + sm;
                                                    const now = new Date();
                                                    const currentTotal = now.getHours() * 60 + now.getMinutes();
                                                    const isPast = (fastForm.appointmentDate || selectedDate) === currentDate && selectedTotal < currentTotal;

                                                    return (
                                                        <button
                                                            key={h}
                                                            type="button"
                                                            disabled={isPast}
                                                            onClick={() => setFastForm(prev => ({ ...prev, startTime: h }))}
                                                            className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${isSelected
                                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-105'
                                                                : isPast
                                                                    ? 'bg-slate-100 border-transparent text-slate-300 cursor-not-allowed opacity-50'
                                                                    : 'bg-white border-transparent text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50'
                                                                }`}
                                                        >
                                                            <span className={`text-[10px] font-black tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>{h}</span>
                                                            {isSelected && <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {(fastForm.startTime || selectedCell?.hour) && (
                                                <div className="flex items-center gap-2 px-6 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl animate-in slide-in-from-bottom-2">
                                                    <span className="text-xl">⏰</span>
                                                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Seçilen Saat: <strong className="text-indigo-900 ml-1">{(fastForm.startTime || selectedCell?.hour)}</strong></span>
                                                </div>
                                            )}
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
                )
            }

            {/* Appointment Detail Modal */}
            {
                isDetailModalOpen && selectedAppointment && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 lg:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                        <div className="bg-white w-full max-w-lg max-h-[95vh] rounded-[2.5rem] lg:rounded-[4rem] overflow-y-auto shadow-2xl animate-scale-up">
                            <div className="p-6 lg:p-12">
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
                                    <div className="flex items-start gap-6 p-6 bg-slate-50 rounded-[2.5rem]">
                                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-2xl shadow-sm shrink-0">✂️</div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hizmetler {selectedAppointment.package_name && <span className="text-indigo-600 ml-2">📦 {selectedAppointment.package_name}</span>}</p>
                                            <div className="space-y-2">
                                                {selectedAppointment.services && selectedAppointment.services.length > 0 ? (
                                                    (() => {
                                                        const clickedStaffId = selectedCell?.person.user_id || selectedCell?.person.id;
                                                        const clickedHour = selectedCell?.hour;

                                                        // Find the primary service for this context
                                                        let targetService = selectedAppointment.services?.find((s: any) => {
                                                            if (Number(s.staff_id) !== Number(clickedStaffId)) return false;
                                                            if (!s.start_time || !s.end_time || !clickedHour) return false;
                                                            const [ssH, ssM] = s.start_time.split(':').map(Number);
                                                            const [seH, seM] = s.end_time.split(':').map(Number);
                                                            const [chH, chM] = clickedHour.split(':').map(Number);
                                                            const sStart = ssH * 60 + ssM;
                                                            const sEnd = seH * 60 + seM;
                                                            const cTotal = chH * 60 + chM;
                                                            return cTotal >= sStart && cTotal < sEnd;
                                                        });

                                                        if (!targetService && clickedStaffId) {
                                                            targetService = selectedAppointment.services?.find((s: any) =>
                                                                Number(s.staff_id) === Number(clickedStaffId)
                                                            );
                                                        }

                                                        return selectedAppointment.services.map((item: any, idx: number) => {
                                                            const isRelevantToMe = clickedStaffId && Number(item.staff_id) === Number(clickedStaffId);
                                                            const isExactService = targetService && item.aps_id === targetService.aps_id;

                                                            return (
                                                                <div key={item.aps_id || idx} className={`flex flex-col gap-2 p-4 rounded-3xl border transition-all ${isExactService ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100 ring-4 ring-indigo-50 color-pulse' : isRelevantToMe ? 'bg-indigo-50 border-indigo-200' : 'bg-white/50 border-slate-100'}`}>
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <span className={`text-xs font-black uppercase tracking-tight truncate ${isExactService ? 'text-white' : 'text-slate-800'}`}>{item.name}</span>
                                                                                {isExactService ? (
                                                                                    <span className="px-2 py-0.5 bg-white/20 text-white text-[7px] font-black rounded-full">TIKLANAN İŞLEM</span>
                                                                                ) : isRelevantToMe && (
                                                                                    <span className="px-2 py-0.5 bg-indigo-500 text-white text-[7px] font-black rounded-full">SİZİN GÖREVİNİZ</span>
                                                                                )}
                                                                            </div>
                                                                            <div className={`flex items-center gap-3 ${isExactService ? 'text-indigo-100' : 'text-slate-500'}`}>
                                                                                <div className="flex items-center gap-1">
                                                                                    <span className="text-[9px] font-bold">👤 {item.service_staff_name || 'Uzman belirtilmedi'}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-1">
                                                                                    <span className={`text-[9px] font-bold ${isExactService ? 'text-indigo-100' : 'text-slate-500'}`}>⏰ {item.start_time || '--:--'} - {item.end_time || '--:--'} ({item.duration || item.duration_minutes || '--'} dk)</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col items-end gap-2">
                                                                            <div className="flex items-center gap-1.5">
                                                                                {item.original_price && Number(item.original_price) !== Number(item.price) && (
                                                                                    <span className={`text-[8px] font-bold line-through opacity-50 ${isExactService ? 'text-white' : 'text-slate-400'}`}>
                                                                                        ₺{item.original_price}
                                                                                    </span>
                                                                                )}
                                                                                <span className={`text-[10px] font-black ${isExactService ? 'text-white' : 'text-indigo-600'}`}>₺{item.price}</span>
                                                                            </div>

                                                                            <select
                                                                                value={item.staff_id || ''}
                                                                                onChange={async (e) => {
                                                                                    const newStaffId = e.target.value ? Number(e.target.value) : null;
                                                                                    try {
                                                                                        setLoading(true);
                                                                                        await api.patch(`/appointments/service/${item.aps_id}`, { staff_id: newStaffId });
                                                                                        if (company?.id) fetchData(company.id);
                                                                                        // Update current modal state
                                                                                        if (selectedAppointment?.id) {
                                                                                            const res = await api.get('/appointments', { params: { ids: selectedAppointment.id.toString() } });
                                                                                            if (res.data?.data?.[0]) setSelectedAppointment(res.data.data[0]);
                                                                                        }
                                                                                    } catch (err) {
                                                                                        alert('Personel güncellenemedi');
                                                                                    } finally {
                                                                                        setLoading(false);
                                                                                    }
                                                                                }}
                                                                                className={`text-[8px] font-black uppercase rounded-lg px-2 py-1 outline-none cursor-pointer ${isExactService ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}
                                                                            >
                                                                                <option value="">Uzman Seçin</option>
                                                                                {staff.map(s => <option key={s.user_id || s.id} value={s.user_id || s.id}>{s.first_name}</option>)}
                                                                            </select>

                                                                            {item.status === 'approved' ? (
                                                                                <div className={`flex items-center gap-1 ${isExactService ? 'text-white' : 'text-emerald-500'}`}>
                                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                                                    <span className={`text-[8px] font-black uppercase tracking-widest ${isExactService ? 'text-white' : 'text-emerald-600'}`}>ONAYLI</span>
                                                                                </div>
                                                                            ) : (
                                                                                staffMode && (Number(item.staff_id) === Number(staffInfo.id)) ? (
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); handleUpdateServiceStatus(item.aps_id, 'approved'); }}
                                                                                        className="px-4 py-1.5 bg-amber-500 text-white text-[8px] font-black uppercase rounded-xl shadow-md hover:bg-amber-600 transition-all animate-pulse"
                                                                                    >
                                                                                        İŞLEMİMİ ONAYLA
                                                                                    </button>
                                                                                ) : (
                                                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isExactService ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-500'}`}>BEKLİYOR</span>
                                                                                )
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                    })()
                                                ) : (
                                                    <p className="text-xl font-black text-slate-800 uppercase tracking-tight">{selectedAppointment.package_name || selectedAppointment.service_name || 'Hizmet Bilgisi Yok'}</p>
                                                )}
                                            </div>
                                            {selectedAppointment.services && selectedAppointment.services.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase">Toplam</span>
                                                    <div className="flex items-center gap-2">
                                                        {(() => {
                                                            const originalTotal = selectedAppointment.services?.reduce((sum: number, s: any) => sum + (Number(s.original_price) || 0), 0);
                                                            if (originalTotal > Number(selectedAppointment.price)) {
                                                                return <span className="text-[10px] font-bold line-through text-slate-400">₺{originalTotal}</span>;
                                                            }
                                                            return null;
                                                        })()}
                                                        <span className="text-base font-black text-indigo-600">₺{selectedAppointment.price}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {(() => {
                                            const clickedStaffId = selectedCell?.person.user_id || selectedCell?.person.id;
                                            const clickedHour = selectedCell?.hour;

                                            // 1. Try strict match (Staff + Hour)
                                            let targetService = selectedAppointment.services?.find((s: any) => {
                                                if (Number(s.staff_id) !== Number(clickedStaffId)) return false;
                                                if (!s.start_time || !s.end_time || !clickedHour) return false;
                                                const [ssH, ssM] = s.start_time.split(':').map(Number);
                                                const [seH, seM] = s.end_time.split(':').map(Number);
                                                const [chH, chM] = clickedHour.split(':').map(Number);
                                                const sStart = ssH * 60 + ssM;
                                                const sEnd = seH * 60 + seM;
                                                const cTotal = chH * 60 + chM;
                                                return cTotal >= sStart && cTotal < sEnd;
                                            });

                                            // 2. Fallback (Any service for this Staff in this appointment)
                                            if (!targetService && clickedStaffId) {
                                                targetService = selectedAppointment.services?.find((s: any) =>
                                                    Number(s.staff_id) === Number(clickedStaffId)
                                                );
                                            }

                                            const displayTime = targetService?.start_time || selectedAppointment.start_time;
                                            const displayStaffName = targetService?.service_staff_name || selectedAppointment.staff_name || 'Belirsiz';
                                            const hasContext = !!targetService;

                                            return (
                                                <>
                                                    <div className={`p-6 rounded-[2.5rem] transition-all duration-500 ${hasContext ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 ring-2 ring-white/20' : 'bg-slate-50 text-slate-800'}`}>
                                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${hasContext ? 'text-indigo-200' : 'text-slate-400'}`}>Saat</p>
                                                        <p className="text-xl font-black">{displayTime}</p>
                                                    </div>
                                                    <div className={`p-6 rounded-[2.5rem] transition-all duration-500 ${hasContext ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 ring-2 ring-white/20' : 'bg-slate-50 text-slate-800'}`}>
                                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${hasContext ? 'text-indigo-200' : 'text-slate-400'}`}>Uzman</p>
                                                        <p className="text-lg font-black truncate">{displayStaffName}</p>
                                                    </div>
                                                </>
                                            );
                                        })()}
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
                                                onClick={() => handleUpdateStatus(selectedAppointment.id!, 'approved', selectedAppointment.price)}
                                                disabled={loading}
                                                className="flex-1 bg-emerald-500 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all disabled:opacity-50"
                                            >
                                                Onayla
                                            </button>
                                        )}

                                        {selectedAppointment.status === 'approved' && (
                                            <button
                                                onClick={() => handleUpdateStatus(selectedAppointment.id!, 'completed', selectedAppointment.price)}
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
                                                onClick={() => handleUpdateStatus(selectedAppointment.id!, 'cancelled', selectedAppointment.price)}
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
                )
            }

            {/* Version Indicator */}
            {/* Pending List Modal */}
            {
                isPendingListModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 lg:p-10" onClick={() => setIsPendingListModalOpen(false)}>
                        <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-amber-50/30">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Onay Bekleyen Talepler</h2>
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-1">{pendingCount} Yeni Randevu İsteği</p>
                                </div>
                                <button onClick={() => setIsPendingListModalOpen(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all shadow-sm">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6" /></svg>
                                </button>
                            </div>

                            <div className="p-8 max-h-[70vh] overflow-y-auto space-y-4">
                                {filteredPending.sort((a, b) => (a.appointment_date || '').localeCompare(b.appointment_date || '')).length > 0 ? (
                                    filteredPending.sort((a, b) => (a.appointment_date || '').localeCompare(b.appointment_date || '')).map(app => (
                                        <div key={app.id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-amber-200 transition-all group">
                                            <div className="flex items-start justify-between gap-4 mb-4">
                                                <div className="flex-1">
                                                    <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight mb-1">{app.customer_name || 'Misafir'}</h3>
                                                    <div className="flex flex-wrap gap-2 items-center">
                                                        <span className="px-3 py-1 bg-white rounded-full text-[10px] font-black text-slate-500 border border-slate-100 uppercase tracking-wider">
                                                            📅 {app.appointment_date?.substring(0, 10)}
                                                        </span>
                                                        <span className="px-3 py-1 bg-white rounded-full text-[10px] font-black text-slate-500 border border-slate-100 uppercase tracking-wider">
                                                            ⏰ {app.start_time} - {app.end_time}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-black text-indigo-600 leading-none">₺{app.price}</p>
                                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Hizmet Bedeli</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mb-6">
                                                {app.services?.map((s: any) => (
                                                    <span key={s.id} className="px-2 py-0.5 bg-amber-100/50 text-amber-700 rounded-lg text-[9px] font-bold uppercase">
                                                        {s.name} {s.service_staff_name ? `(${s.service_staff_name})` : ''}
                                                    </span>
                                                ))}
                                                {!app.staff_id && app.services?.every((s: any) => !s.staff_id) && (
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-tighter animate-pulse">
                                                        ⚠️ PERSONEL ATANMAMIŞ
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => {
                                                        setSelectedAppointment(app);
                                                        setIsDetailModalOpen(true);
                                                    }}
                                                    className="flex-1 py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-indigo-200 hover:text-indigo-600 transition-all"
                                                >
                                                    Detaylar
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(app.id!, 'approved', app.price)}
                                                    className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all"
                                                >
                                                    Hemen Onayla
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(app.id!, 'cancelled', app.price)}
                                                    className="w-14 py-4 bg-rose-50 text-rose-500 rounded-2xl font-black flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">📭</div>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Onay bekleyen talep yok</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/80 backdrop-blur-md rounded-full border border-white/10 shadow-2xl z-[150] pointer-events-none">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Ekuafor Salon Board Edition <span className="text-white opacity-100 ml-1">v1.80.0</span></p>
            </div>
            {/* Payment Modal (NFC / SoftPOS Simulation) */}
            {showPaymentModal && paymentApp && (
                <div className="fixed inset-0 z-[300] flex items-end justify-center bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-500">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />

                        <div className="text-center mb-8">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Ödeme Al</h3>
                            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
                                {paymentApp.customer_name || 'Müşteri'} | <span className="text-indigo-600">₺{paymentApp.price}</span>
                            </p>
                        </div>

                        {nfcState === 'IDLE' && (
                            <div className="grid grid-cols-1 gap-4">
                                <button
                                    onClick={async () => {
                                        setNfcState('SCANNING');
                                        setTimeout(async () => {
                                            try {
                                                const res = await api.post('/payments/ceppos/initialize', {
                                                    appointment_id: paymentApp.id,
                                                    amount: paymentApp.price
                                                });
                                                if (res.data.success) {
                                                    setNfcState('SUCCESS');
                                                    setTimeout(() => {
                                                        // Proceed with status update after success
                                                        api.patch(`/appointments/${paymentApp.id}/status`, {
                                                            status: 'completed',
                                                            price: paymentApp.price,
                                                            payment_method: 'card_ceppos'
                                                        }).then(() => {
                                                            if (company?.id) fetchData(company.id);
                                                            setShowPaymentModal(false);
                                                            setNfcState('IDLE');
                                                            setSelectedAppointment(null);
                                                            setIsDetailModalOpen(false);
                                                            setIsPendingListModalOpen(false);
                                                        });
                                                    }, 1500);
                                                } else {
                                                    setNfcState('ERROR');
                                                }
                                            } catch (e) {
                                                setNfcState('ERROR');
                                            }
                                        }, 2000);
                                    }}
                                    className="p-6 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-between group active:scale-95 transition-all shadow-xl shadow-indigo-100"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">💳</div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-indigo-200">Kredi Kartı</p>
                                            <p className="text-lg font-black leading-tight">Terminal / SoftPOS</p>
                                        </div>
                                    </div>
                                    <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                </button>

                                <button
                                    onClick={async () => {
                                        try {
                                            setLoading(true);
                                            await api.patch(`/appointments/${paymentApp.id}/status`, {
                                                status: 'completed',
                                                price: paymentApp.price,
                                                payment_method: 'cash'
                                            });
                                            if (company?.id) fetchData(company.id);
                                            setShowPaymentModal(false);
                                            setSelectedAppointment(null);
                                            setIsDetailModalOpen(false);
                                            setIsPendingListModalOpen(false);
                                        } catch (e) {
                                            alert('Hata oluştu');
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    className="p-6 bg-slate-50 text-slate-900 rounded-[2rem] flex items-center justify-between group active:scale-95 transition-all"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">💵</div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Nakit Ödeme</p>
                                            <p className="text-lg font-black leading-tight">Elden Tahsilat</p>
                                        </div>
                                    </div>
                                    <svg className="w-6 h-6 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                </button>

                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="w-full py-4 text-slate-400 text-xs font-black uppercase tracking-widest mt-4"
                                >
                                    İptal
                                </button>
                            </div>
                        )}

                        {nfcState === 'SCANNING' && (
                            <div className="py-12 flex flex-col items-center">
                                <div className="relative mb-12">
                                    <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20 scale-150"></div>
                                    <div className="absolute inset-0 bg-indigo-400 rounded-full animate-pulse opacity-40 scale-125"></div>
                                    <div className="relative w-32 h-32 bg-slate-900 rounded-full flex items-center justify-center text-4xl shadow-2xl">⚡</div>
                                </div>
                                <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Kartı Yaklaştırın</h4>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">Temassız ödeme bekleniyor...</p>
                            </div>
                        )}

                        {nfcState === 'SUCCESS' && (
                            <div className="py-12 flex flex-col items-center animate-in zoom-in duration-500">
                                <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center text-5xl shadow-2xl mb-8">✓</div>
                                <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Ödeme Başarılı</h4>
                                <p className="text-emerald-500 font-black uppercase tracking-widest text-[10px]">İşlem onaylandı, iyzico kaydı oluşturuldu.</p>
                            </div>
                        )}

                        {nfcState === 'ERROR' && (
                            <div className="py-12 flex flex-col items-center">
                                <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center text-5xl shadow-2xl mb-8">!</div>
                                <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Ödeme Başarısız</h4>
                                <p className="text-red-500 font-black uppercase tracking-widest text-[10px] mb-8">İşlem reddedildi veya hata oluştu.</p>
                                <button onClick={() => setNfcState('IDLE')} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase">Tekrar Dene</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* Completion & Amount Confirmation Modal */}
            {completionModal.open && completionModal.app && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 text-center">
                        <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner rotate-3">
                            💰
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Hizmet Tamamla</h3>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">Toplam tutarı onaylayın</p>

                        <div className="mb-10 group">
                            <div className="relative">
                                <span className="absolute left-8 top-1/2 -translate-y-1/2 text-3xl font-black text-indigo-200 group-focus-within:text-indigo-400 transition-colors">₺</span>
                                <input
                                    type="number"
                                    value={completionModal.amount}
                                    onChange={(e) => setCompletionModal(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] py-8 text-center text-5xl font-black text-indigo-600 focus:border-indigo-500 focus:bg-white transition-all outline-none shadow-inner"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={() => {
                                    setPaymentApp({ ...completionModal.app!, price: completionModal.amount });
                                    setCompletionModal({ open: false, app: null, amount: 0 });
                                    setShowPaymentModal(true);
                                }}
                                className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                <span className="text-xl">💳</span> Ödeme Al
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        setLoading(true);
                                        await api.patch(`/appointments/${completionModal.app!.id}/status`, {
                                            status: 'completed',
                                            price: completionModal.amount,
                                            payment_method: 'cash'
                                        });
                                        setCompletionModal({ open: false, app: null, amount: 0 });
                                        setIsDetailModalOpen(false);
                                        setIsPendingListModalOpen(false);
                                        if (company?.id) await fetchData(company.id);
                                    } catch (e) {
                                        alert('İşlem başarısız');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                <span className="text-xl">💵</span> Nakit Tamamla
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        setLoading(true);
                                        await api.patch(`/appointments/${completionModal.app!.id}/status`, {
                                            status: 'completed',
                                            price: completionModal.amount
                                        });
                                        setCompletionModal({ open: false, app: null, amount: 0 });
                                        setIsDetailModalOpen(false);
                                        setIsPendingListModalOpen(false);
                                        if (company?.id) await fetchData(company.id);
                                    } catch (e) {
                                        alert('İşlem başarısız');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                className="w-full py-6 bg-emerald-500 text-white rounded-3xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-100"
                            >
                                <span className="text-xl">✅</span> Sadece Tamamla
                            </button>
                            <button
                                onClick={() => setCompletionModal({ open: false, app: null, amount: 0 })}
                                className="w-full py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
                            >
                                Vazgeç
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Terminal Settings Modal (Somun) */}
            {isSettingsModalOpen && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl rounded-[3rem] p-8 lg:p-12 shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                                    ⚙️
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Terminal Ayarları</h3>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Sektörel parametreler ve yerel tanımlamalar</p>
                                </div>
                            </div>
                            <button onClick={() => setIsSettingsModalOpen(false)} className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-12">
                            {/* Section 1: Working Hours */}
                            <section>
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span> Mesai Saatleri
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-4">Açılış Saati</label>
                                        <input
                                            type="time"
                                            defaultValue={company?.work_start_time || '08:00'}
                                            onBlur={(e) => handleUpdateLocalWorkHours(e.target.value, company?.work_end_time || '21:00')}
                                            className="w-full bg-white border-2 border-transparent rounded-2xl px-6 py-4 font-black text-2xl text-slate-700 outline-none focus:border-amber-500 transition-all shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-4">Kapanış Saati</label>
                                        <input
                                            type="time"
                                            defaultValue={company?.work_end_time || '21:00'}
                                            onBlur={(e) => handleUpdateLocalWorkHours(company?.work_start_time || '08:00', e.target.value)}
                                            className="w-full bg-white border-2 border-transparent rounded-2xl px-6 py-4 font-black text-2xl text-slate-700 outline-none focus:border-amber-500 transition-all shadow-sm"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Section 2: Local Staff Management */}
                            <section>
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Personel Yönetimi
                                    </h4>
                                    <button 
                                        onClick={() => {
                                            const name = prompt('Personel Adı Soyadı:');
                                            if (name) handleAddLocalStaff(name, departments[0]?.id || '1');
                                        }}
                                        className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest"
                                    >
                                        + Yeni Personel
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {staff.map((s) => (
                                        <div key={s.id} className="bg-white border border-slate-100 p-5 rounded-[2rem] flex items-center gap-4 hover:border-indigo-100 transition-all group">
                                            <div 
                                                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg"
                                                style={{ backgroundColor: getStaffColor(`${s.first_name} ${s.last_name}`) }}
                                            >
                                                {s.first_name[0]}{s.last_name[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-slate-900 tracking-tight truncate">{s.first_name} {s.last_name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {departments.find(d => d.id === Number(s.department_id))?.name || 'Genel'}
                                                </p>
                                            </div>
                                            {s.id > 1000000000 && ( // Local added staff check (using timestamp id)
                                                <span className="text-[8px] font-black text-amber-500 bg-amber-50 px-2 py-1 rounded-lg uppercase">Yerel</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Section 3: Services (Read-only for now) */}
                            <section>
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span> Tanımlı Hizmetler
                                </h4>
                                <div className="space-y-3">
                                    {services.map((ser) => (
                                        <div key={ser.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">✂️</div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm tracking-tight">{ser.name}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ser.duration_minutes} Dakika</p>
                                                </div>
                                            </div>
                                            <span className="font-black text-slate-900">₺{ser.price}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="mt-10 pt-8 border-t border-slate-100 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Senkronizasyon Durumu</p>
                            <button 
                                onClick={handleSyncUp}
                                className="px-10 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 shadow-xl shadow-emerald-100 active:scale-95 transition-all"
                            >
                                Tüm Yerel Verileri Buluta Yükle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Expense Management Modal */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] p-8 lg:p-12 shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Masraf Yönetimi</h3>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Cihaz üzerine kaydedilen yerel giderler</p>
                            </div>
                            <button onClick={() => setIsExpenseModalOpen(false)} className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Expense Form */}
                        <form onSubmit={handleExpenseSubmit} className="bg-slate-50 p-6 rounded-[2rem] mb-8 border border-slate-100 flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-3">Açıklama</label>
                                <input
                                    type="text"
                                    required
                                    value={expenseForm.description}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                    placeholder="Örn: Kira, Elektrik, Malzeme"
                                    className="w-full bg-white border-2 border-transparent rounded-2xl px-5 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-sm"
                                />
                            </div>
                            <div className="w-32">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-3">Tutar (₺)</label>
                                <input
                                    type="number"
                                    required
                                    value={expenseForm.amount}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                    placeholder="500"
                                    className="w-full bg-white border-2 border-transparent rounded-2xl px-5 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-sm"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="h-[52px] px-8 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black active:scale-95 transition-all"
                            >
                                {loading ? 'EKLENİYOR...' : 'EKLE'}
                            </button>
                        </form>

                        {/* Expense List */}
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="space-y-3">
                                {expenses.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Henüz Masraf Kaydı Yok</div>
                                ) : (
                                    expenses.map((exp) => (
                                        <div key={exp.id} className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center justify-between group hover:border-rose-100 hover:shadow-lg hover:shadow-rose-500/5 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center text-lg">📉</div>
                                                <div>
                                                    <p className="font-bold text-slate-900 tracking-tight">{exp.description}</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{exp.date}</p>
                                                        {exp.is_local && (
                                                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 text-[8px] font-black uppercase rounded-lg">Lokal</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <span className="text-xl font-black text-slate-900 tracking-tighter">₺{exp.amount}</span>
                                                <button
                                                    onClick={() => handleDeleteExpense(exp.id)}
                                                    className="w-10 h-10 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{selectedDate} TOPLAM GİDER</span>
                            <span className="text-2xl font-black text-rose-600 tracking-tighter">₺{expenses.reduce((sum, e) => sum + e.amount, 0)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
