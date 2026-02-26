import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';

interface Department {
    id: number;
    company_id: number;
    name: string;
}

interface StaffBoard {
    id: number;
    first_name: string;
    last_name: string;
    board_code: string;
    gender: string;
    department_id: number;
    department_name: string;
    photo: string | null;
}

type TabKey = 'home' | 'booking' | 'qr' | 'dept' | 'staff' | 'services' | 'finance' | 'ai' | 'reports' | 'profile';

const menuItems: { key: TabKey; icon: string; label: string }[] = [
    { key: 'home', icon: '🏠', label: 'Ana Sayfa' },
    { key: 'finance', icon: '💰', label: 'Finans' },
    { key: 'reports', icon: '📊', label: 'Raporlar' },
    { key: 'services', icon: '✂️', label: 'Hizmetler' },
    { key: 'profile', icon: '🏢', label: 'Firma Tanıtımı' },
    { key: 'booking', icon: '📅', label: 'Müşteri QR' },
    { key: 'ai', icon: '🤖', label: 'Yapay Zeka' },
    { key: 'qr', icon: '🔑', label: 'Yönetim Kodu' },
    { key: 'dept', icon: '🏢', label: 'Departmanlar' },
    { key: 'staff', icon: '👥', label: 'Personeller' },
];

export default function CompanyPanel() {
    const [company, setCompany] = useState<any>(null);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [staffBoards, setStaffBoards] = useState<StaffBoard[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [inputKey, setInputKey] = useState('');

    // UI states
    const [activeTab, setActiveTab] = useState<TabKey>('home');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showDeptModal, setShowDeptModal] = useState(false);
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [deptName, setDeptName] = useState('');
    const [staffForm, setStaffForm] = useState({
        first_name: '',
        last_name: '',
        gender: 'erkek',
        department_id: '',
        photo: '' as string | null,
        quantity: '' as string | number,
        unit: ''
    });
    const [copiedField, setCopiedField] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Services states
    const [companyServices, setCompanyServices] = useState<any[]>([]);
    const [packages, setPackages] = useState<any[]>([]);
    const [activeServiceTab, setActiveServiceTab] = useState<'services' | 'packages'>('services');
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showPackageModal, setShowPackageModal] = useState(false);
    const [showTemplatesModal, setShowTemplatesModal] = useState(false);
    const [serviceForm, setServiceForm] = useState({
        id: null as number | null,
        name: '',
        description: '',
        duration_minutes: 30,
        price: 0,
        department_id: null as number | null,
        photo: '' as string | null,
        quantity: '' as string | number,
        unit: ''
    });
    const [packageForm, setPackageForm] = useState({
        id: null as number | null,
        name: '',
        description: '',
        duration_minutes: 0,
        price: 0,
        items: [] as { service_id: number, staff_id: number | null, department_id: number | null, price: number, duration_minutes: number }[],
        department_id: null as number | null,
        staff_id: null as number | null
    });
    const [isSavingService, setIsSavingService] = useState(false);
    const [isSavingPackage, setIsSavingPackage] = useState(false);

    // AI states
    const [aiRules, setAiRules] = useState('');
    const [isSavingAI, setIsSavingAI] = useState(false);

    // Reports states
    const [reportData, setReportData] = useState<any>(null);
    const [reportPeriod, setReportPeriod] = useState<'today' | 'week' | 'month' | 'year'>('today');
    const [loadingReport, setLoadingReport] = useState(false);

    // Finance states
    const [activeFinanceTab, setActiveFinanceTab] = useState<'sales' | 'purchases' | 'cash'>('sales');
    const [financeDateRange, setFinanceDateRange] = useState({ start: '', end: '' });
    const [financeSearch, setFinanceSearch] = useState('');
    const [completedAppointments, setCompletedAppointments] = useState<any[]>([]);
    const [loadingFinance, setLoadingFinance] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
    const [cashTransactions, setCashTransactions] = useState<any[]>([]);
    const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [salesSubTab, setSalesSubTab] = useState<'pending' | 'invoiced'>('pending');
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [showCashModal, setShowCashModal] = useState(false);
    const [vknCheckResult, setVknCheckResult] = useState<{ vkn: string; isEInvoice: boolean } | null>(null);
    const [checkingVkn, setCheckingVkn] = useState(false);
    const [invoiceForm, setInvoiceForm] = useState({ vkn: '', type: 'e-arsiv' });
    const [reportError, setReportError] = useState('');

    const handleLogin = async (keyToUse?: string) => {
        const key = keyToUse || inputKey.trim();
        if (!key) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/companies/admin-login', { admin_key: key });
            if (res.data?.success && res.data.data) {
                const { company: comp, token } = res.data.data;
                setCompany(comp);
                localStorage.setItem('company_admin_key', key);
                if (token) {
                    localStorage.setItem('token', token);
                }
                setInputKey(key);
                fetchData(comp.id);

                // Load AI rules from localStorage for specific company
                const savedRules = localStorage.getItem(`ai_rules_${comp.id}`);
                setAiRules(savedRules || 'Varsayılan randevu kuralları aktiftir.');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Geçersiz anahtar');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlKey = urlParams.get('key');
        const saved = localStorage.getItem('company_admin_key');
        const keyToUse = urlKey || saved;
        if (keyToUse) {
            setInputKey(keyToUse);
            handleLogin(keyToUse);
        }
    }, []);

    const fetchAIContent = async (cid: number) => {
        try {
            const res = await api.get(`/companies/${cid}/ai-config`);
            if (res.data.success) {
                setAiRules(res.data.data.rules || '');
            }
        } catch (err) { }
    };

    const fetchFinanceData = async (cid?: number) => {
        const targetCid = cid || company?.id;
        if (!targetCid) return;

        setLoadingFinance(true);
        try {
            if (activeFinanceTab === 'sales') {
                const params = new URLSearchParams();
                if (financeDateRange.start) params.append('startDate', financeDateRange.start);
                if (financeDateRange.end) params.append('endDate', financeDateRange.end);
                if (financeSearch) params.append('search', financeSearch);

                // Fetch both pending completed appointments and issued invoices
                const [aptRes, invRes] = await Promise.all([
                    api.get(`/appointments/company/${targetCid}/completed?${params.toString()}`),
                    api.get(`/finance/invoices/company/${targetCid}`, {
                        params: { startDate: financeDateRange.start, endDate: financeDateRange.end }
                    })
                ]);
                if (aptRes.data.success) {
                    // Filter out appointments that are already invoiced
                    const invoicedAptIds = new Set(invRes.data.data?.map((inv: any) => inv.appointment_id) || []);
                    const pending = (aptRes.data.data || []).filter((apt: any) => !invoicedAptIds.has(apt.id) && apt.status !== 'invoiced');
                    setCompletedAppointments(pending);
                }
                if (invRes.data.success) {
                    setInvoices(invRes.data.data || []);
                }
            } else if (activeFinanceTab === 'cash') {
                const res = await api.get(`/finance/company/${targetCid}/transactions`, {
                    params: { startDate: financeDateRange.start, endDate: financeDateRange.end }
                });
                if (res.data.success) {
                    setCashTransactions(res.data.data);
                }
            } else if (activeFinanceTab === 'purchases') {
                const res = await api.get(`/finance/purchase-invoices/company/${targetCid}`);
                if (res.data.success) {
                    setPurchaseInvoices(res.data.data);
                }
            }
        } catch (err) {
            console.error('Finans verisi yüklenemedi:', err);
        } finally {
            setLoadingFinance(false);
        }
    };

    const handleCreateInvoice = async (data: any) => {
        try {
            const res = await api.post('/finance/invoices', data);
            if (res.data.success) {
                setShowInvoiceModal(false);
                fetchFinanceData();
            }
        } catch (err) {
            console.error('Fatura oluşturulamadı:', err);
        }
    };

    const handleCreatePurchase = async (data: any) => {
        try {
            const res = await api.post('/finance/purchase-invoices', data);
            if (res.data.success) {
                setShowPurchaseModal(false);
                fetchFinanceData();
            }
        } catch (err) {
            console.error('Alış faturası oluşturulamadı:', err);
        }
    };

    const handleCreateCashTransaction = async (data: any) => {
        try {
            const res = await api.post('/finance/transactions', data);
            if (res.data.success) {
                setShowCashModal(false);
                fetchFinanceData();
            }
        } catch (err) {
            console.error('Kasa işlemi oluşturulamadı:', err);
        }
    };

    const fetchReports = async (period: string) => {
        if (!company) return;
        setLoadingReport(true);
        setReportError('');
        try {
            const res = await api.get('/reports/company-detailed', { params: { period } });
            if (res.data?.success) {
                setReportData(res.data?.data);
            } else {
                setReportError('Veri alınamadı.');
            }
        } catch (err: any) {
            console.error('Report fetch error', err);
            setReportError(err.response?.data?.error || 'Raporlar yüklenirken bir bağlantı hatası oluştu.');
        } finally {
            setLoadingReport(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'reports' && company) {
            fetchReports(reportPeriod);
            // Debug: Check if token exists
            if (!localStorage.getItem('token')) {
                console.warn('Reports tab active but NO token found in localStorage!');
            }
        }
        if (activeTab === 'ai' && company) fetchAIContent(company.id);
        if (activeTab === 'finance' && company) fetchFinanceData(company.id);
    }, [activeTab, reportPeriod, company, activeFinanceTab, financeDateRange, financeSearch]);

    const fetchData = async (companyId: number) => {
        try {
            const [deptRes, staffRes, svcRes, pkgRes] = await Promise.all([
                api.get('/departments', { params: { company_id: companyId } }),
                api.get(`/companies/${companyId}/staff-boards`),
                api.get('/services', { params: { company_id: companyId } }),
                api.get('/packages', { params: { company_id: companyId } })
            ]);
            setDepartments(deptRes.data?.data || deptRes.data || []);
            setStaffBoards(staffRes.data?.data || staffRes.data || []);
            setCompanyServices(svcRes.data?.data || svcRes.data || []);
            setPackages(pkgRes.data?.data || pkgRes.data || []);
        } catch (e) {
            console.error('Data fetch error', e);
        }
    };

    const handleAddDepartment = async () => {
        if (!deptName.trim() || !company) return;
        try {
            await api.post('/departments', { company_id: company.id, name: deptName.trim() });
            setDeptName('');
            setShowDeptModal(false);
            fetchData(company.id);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Departman eklenemedi');
        }
    };

    const handleDeleteDepartment = async (id: number) => {
        if (!confirm('Bu departmanı silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/departments/${id}`);
            fetchData(company.id);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Departman silinemedi');
        }
    };

    const handleCreateStaffBoard = async () => {
        if (!staffForm.first_name.trim() || !staffForm.last_name.trim() || !company) return;
        setIsCreating(true);
        try {
            await api.post(`/companies/${company.id}/create-staff-board`, {
                first_name: staffForm.first_name.trim(),
                last_name: staffForm.last_name.trim(),
                gender: staffForm.gender,
                department_id: staffForm.department_id || null,
                photo: staffForm.photo,
                quantity: staffForm.quantity ? Number(staffForm.quantity) : null,
                unit: staffForm.unit || null
            });
            setStaffForm({ first_name: '', last_name: '', gender: 'erkek', department_id: '', photo: null, quantity: '', unit: '' });
            setShowStaffModal(false);
            fetchData(company.id);
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || 'Personel kodu oluşturulamadı';
            alert(msg);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteStaff = async (id: number) => {
        if (!confirm('Bu personeli (board kodunu) silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/companies/${company.id}/staff-boards/${id}`);
            fetchData(company.id);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Personel silinemedi');
        }
    };

    const handleUpdateStaffPhoto = async (staffId: number, photoBase64: string) => {
        try {
            await api.patch(`/companies/${company.id}/staff/${staffId}/photo`, { photo: photoBase64 });
            fetchData(company.id);
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || 'Fotoğraf güncellenemedi';
            alert('Hata: ' + msg);
        }
    };

    const handlePhotoSelection = async (isForNewStaff: boolean, staffId?: number) => {
        try {
            // Check if we are running in a native context or if Camera is available
            const isNative = (window as any).Capacitor?.isNativePlatform();

            if (isNative) {
                const image = await Camera.getPhoto({
                    quality: 80,
                    allowEditing: true,
                    resultType: CameraResultType.Base64,
                    source: CameraSource.Prompt,
                    direction: CameraDirection.Rear,
                    width: 400,
                    height: 400
                });

                if (image.base64String) {
                    const base64String = `data:image/jpeg;base64,${image.base64String}`;
                    if (isForNewStaff) {
                        setStaffForm(p => ({ ...p, photo: base64String }));
                    } else if (staffId) {
                        handleUpdateStaffPhoto(staffId, base64String);
                    }
                }
            } else {
                // FALLBACK FOR WEB BROWSERS
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const MAX_WIDTH = 400;
                            const MAX_HEIGHT = 400;
                            let width = img.width;
                            let height = img.height;

                            if (width > height) {
                                if (width > MAX_WIDTH) {
                                    height *= MAX_WIDTH / width;
                                    width = MAX_WIDTH;
                                }
                            } else {
                                if (height > MAX_HEIGHT) {
                                    width *= MAX_HEIGHT / height;
                                    height = MAX_HEIGHT;
                                }
                            }

                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx?.drawImage(img, 0, 0, width, height);
                            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);

                            if (isForNewStaff) {
                                setStaffForm(p => ({ ...p, photo: compressedBase64 }));
                            } else if (staffId) {
                                handleUpdateStaffPhoto(staffId, compressedBase64);
                            }
                        };
                        img.src = event.target?.result as string;
                    };
                    reader.readAsDataURL(file);
                };
                input.click();
            }
        } catch (err: any) {
            console.error('Camera/Selection error:', err);
            if (err.message !== 'User cancelled photos app') {
                alert('Fotoğraf seçiminde hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
            }
        }
    };

    const handleSaveService = async () => {
        if (!serviceForm.name.trim() || !company) return;
        setIsSavingService(true);
        try {
            if (serviceForm.id) {
                // Güncelle
                await api.put(`/services/${serviceForm.id}`, {
                    company_id: company.id,
                    name: serviceForm.name.trim(),
                    description: serviceForm.description.trim(),
                    duration_minutes: serviceForm.duration_minutes,
                    price: serviceForm.price,
                    department_id: serviceForm.department_id,
                    photo: serviceForm.photo,
                    quantity: serviceForm.quantity ? Number(serviceForm.quantity) : null,
                    unit: serviceForm.unit || null
                });
            } else {
                // Yeni ekle
                await api.post('/services', {
                    company_id: company.id,
                    name: serviceForm.name.trim(),
                    description: serviceForm.description.trim(),
                    duration_minutes: serviceForm.duration_minutes,
                    price: serviceForm.price,
                    department_id: serviceForm.department_id,
                    photo: serviceForm.photo,
                    quantity: serviceForm.quantity ? Number(serviceForm.quantity) : null,
                    unit: serviceForm.unit || null
                });
            }
            setServiceForm({ id: null, name: '', description: '', duration_minutes: 30, price: 0, department_id: null, photo: null, quantity: '', unit: '' });
            setShowServiceModal(false);
            fetchData(company.id);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Hizmet kaydedilemedi');
        } finally {
            setIsSavingService(false);
        }
    };

    const handleDeleteService = async (id: number) => {
        if (!confirm('Bu hizmeti silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/services/${id}`);
            fetchData(company.id);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Hizmet silinemedi');
        }
    };

    const handleSavePackage = async () => {
        if (!packageForm.name.trim() || !company) return;
        if (packageForm.items.length === 0) {
            alert('Lütfen en az bir hizmet seçin');
            return;
        }
        if (companyServices.length === 0) {
            alert('Paket oluşturmak için önce hizmet eklemelisiniz.');
            return;
        }
        setIsSavingPackage(true);
        try {
            if (packageForm.id) {
                await api.put(`/packages/${packageForm.id}`, {
                    ...packageForm,
                    company_id: company.id
                });
            } else {
                await api.post('/packages', {
                    name: packageForm.name.trim(),
                    description: packageForm.description.trim(),
                    duration_minutes: packageForm.duration_minutes,
                    price: packageForm.price,
                    items: packageForm.items,
                    staff_id: packageForm.staff_id,
                    department_id: packageForm.department_id,
                    company_id: company.id
                });
            }
            setPackageForm({ id: null, name: '', description: '', duration_minutes: 0, price: 0, items: [], department_id: null, staff_id: null });
            setShowPackageModal(false);
            fetchData(company.id);
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Paket kaydedilemedi';
            const details = err.response?.data?.details;
            if (details && Array.isArray(details)) {
                const detailStr = details.map((d: any) => `${d.path.join('.')}: ${d.message}`).join('\n');
                alert(`${errorMsg}\n\nDetaylar:\n${detailStr}`);
            } else {
                alert(errorMsg);
            }
        } finally {
            setIsSavingPackage(false);
        }
    };

    const handleDeletePackage = async (id: number) => {
        if (!confirm('Bu paketi silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/packages/${id}`);
            fetchData(company.id);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Paket silinemedi');
        }
    };

    const toggleServiceInPackage = (serviceId: number) => {
        const currentItems = [...packageForm.items];
        const index = currentItems.findIndex(i => i.service_id === serviceId);

        if (index > -1) {
            currentItems.splice(index, 1);
        } else {
            const svc = companyServices.find(s => s.id === serviceId);
            currentItems.push({
                service_id: serviceId,
                staff_id: null,
                department_id: svc?.department_id || null,
                price: svc?.price || 0,
                duration_minutes: svc?.duration_minutes || 0
            });
        }

        // Calculate total duration and price from selected services (using overrides)
        const totalDuration = currentItems.reduce((sum, i) => sum + (i.duration_minutes || 0), 0);
        const totalPrice = currentItems.reduce((sum, i) => sum + Number(i.price || 0), 0);

        setPackageForm({
            ...packageForm,
            items: currentItems,
            duration_minutes: totalDuration,
            price: totalPrice
        });
    };

    const handleUpdateServicePrice = (serviceId: number, price: number) => {
        const currentItems = packageForm.items.map(item =>
            item.service_id === serviceId ? { ...item, price } : item
        );
        const totalPrice = currentItems.reduce((sum, i) => sum + Number(i.price || 0), 0);
        setPackageForm({ ...packageForm, items: currentItems, price: totalPrice });
    };

    const handleUpdateServiceDuration = (serviceId: number, duration: number) => {
        const currentItems = packageForm.items.map(item =>
            item.service_id === serviceId ? { ...item, duration_minutes: duration } : item
        );
        const totalDuration = currentItems.reduce((sum, i) => sum + (i.duration_minutes || 0), 0);
        setPackageForm({ ...packageForm, items: currentItems, duration_minutes: totalDuration });
    };

    const handleUpdateServiceStaff = (serviceId: number, staffId: number | null) => {
        const currentItems = packageForm.items.map(item =>
            item.service_id === serviceId ? { ...item, staff_id: staffId } : item
        );
        setPackageForm({ ...packageForm, items: currentItems });
    };

    const handleUpdateServiceDept = (serviceId: number, deptId: number | null) => {
        const currentItems = packageForm.items.map(item =>
            item.service_id === serviceId ? { ...item, department_id: deptId, staff_id: null } : item
        );
        setPackageForm({ ...packageForm, items: currentItems });
    };

    const handleAddFromTemplate = async (template: any) => {
        if (!company) return;
        setIsSavingService(true);
        try {
            await api.post('/services', {
                name: template.name,
                description: template.description || '',
                duration_minutes: template.duration,
                price: template.price
            });
            fetchData(company.id);
        } catch (err: any) {
            alert('Hizmet eklenirken hata: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsSavingService(false);
        }
    };

    const templates = {
        men: [
            { name: 'Saç Kesimi', duration: 30, price: 200, description: 'Yıkama dahil saç kesimi' },
            { name: 'Sakal Tıraşı', duration: 15, price: 100, description: 'Sakal düzeltme ve şekillendirme' },
            { name: 'Saç & Sakal', duration: 45, price: 280, description: 'Komple bakım paketi' },
            { name: 'Çocuk Tıraşı', duration: 20, price: 150, description: '12 yaş altı' },
            { name: 'Saç Boyama', duration: 60, price: 500, description: 'Dip boya veya komple' },
            { name: 'Fön', duration: 15, price: 80, description: 'Yıkama ve fön' }
        ],
        women: [
            { name: 'Saç Kesimi', duration: 45, price: 300, description: 'Yıkama ve şekillendirme dahil' },
            { name: 'Fön', duration: 30, price: 150, description: 'Düz veya dalgalı fön' },
            { name: 'Dip Boya', duration: 90, price: 600, description: 'Dip boyama işlemi' },
            { name: 'Komple Boya', duration: 120, price: 1000, description: 'Tüm saç boyama' },
            { name: 'Ombre / Balyaj', duration: 180, price: 2000, description: 'Açma boyama işlemleri' },
            { name: 'Manikür', duration: 30, price: 200, description: 'Klasik manikür' },
            { name: 'Pedikür', duration: 45, price: 300, description: 'Klasik pedikür' },
            { name: 'Kaş Bıyık', duration: 15, price: 100, description: 'İple veya ağda ile' }
        ]
    };

    const handleSaveAIRules = () => {
        if (!company) return;
        setIsSavingAI(true);
        try {
            localStorage.setItem(`ai_rules_${company.id}`, aiRules);
            setTimeout(() => {
                alert('Yapay zeka kuralları başarıyla kaydedildi.');
                setIsSavingAI(false);
            }, 500);
        } catch (e) {
            alert('Kurallar kaydedilemedi');
            setIsSavingAI(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('company_admin_key');
        localStorage.removeItem('token');
        setCompany(null);
        setInputKey('');
        setDepartments([]);
        setStaffBoards([]);
        setCompanyServices([]);
        setPackages([]);
    };

    const copyText = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(''), 2000);
    };

    const bookingUrl = company ? `${window.location.origin}${import.meta.env.BASE_URL}book/${company.id}?ref=qr` : '';
    const qrApiUrl = (data: string, size = 200) =>
        `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&color=1e1b4b&bgcolor=ffffff`;

    const switchTab = (tab: TabKey) => {
        setActiveTab(tab);
        setSidebarOpen(false);
    };

    // LOGIN SCREEN
    if (!company) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-6">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-indigo-500/30">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Firma Paneli</h1>
                        <p className="text-indigo-300 text-sm mt-2">Yönetim anahtarınızı girin</p>
                    </div>

                    <div className="space-y-4">
                        <input
                            type="text"
                            value={inputKey}
                            onChange={e => setInputKey(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                            placeholder="ADM-XXX-XXXX"
                            className="w-full p-5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white text-center text-xl font-bold tracking-widest placeholder:text-white/30 outline-none focus:border-indigo-400 transition-all"
                        />
                        <button
                            onClick={() => handleLogin()}
                            disabled={loading}
                            className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-lg tracking-wide shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                        </button>
                        {error && (
                            <p className="text-red-400 text-center text-sm font-bold animate-pulse">{error}</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const handleUpdateCompany = async () => {
        if (!company) return;
        setLoading(true);
        try {
            await api.put(`/companies/${company.id}`, company);
            alert('Firma bilgileri başarıyla güncellendi.');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Güncelleme sırasında hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    // MAIN PANEL
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex" >

            {/* Sidebar Overlay (Mobile) */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`fixed lg:sticky top-0 left-0 z-[100] h-screen w-72 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                {/* Logo Area */}
                <div className="p-6 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
                            <span className="text-xl">🏢</span>
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-base font-black truncate leading-tight">{company.name}</h1>
                            <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-[0.2em]">Yönetim Paneli</p>
                        </div>
                    </div>
                </div>

                {/* Menu Items */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {menuItems.map(item => (
                        <button
                            key={item.key}
                            onClick={() => switchTab(item.key)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left font-bold text-sm transition-all ${activeTab === item.key
                                ? 'bg-white/15 text-white shadow-lg shadow-white/5'
                                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                                }`}
                        >
                            <span className="text-lg">{item.icon}</span>
                            <span>{item.label}</span>
                            {item.key === 'staff' && staffBoards.length > 0 && (
                                <span className="ml-auto bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full">{staffBoards.length}</span>
                            )}
                            {item.key === 'dept' && departments.length > 0 && (
                                <span className="ml-auto bg-indigo-500/20 text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full">{departments.length}</span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-red-300 hover:bg-red-500/10 transition-all font-bold text-sm"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Çıkış Yap</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-h-screen lg:pl-0">
                {/* Mobile Top Bar - Optimized for Notches */}
                <div className="lg:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 flex items-center justify-between"
                    style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)', paddingBottom: '0.75rem' }}>
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                    >
                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="text-center">
                        <p className="text-sm font-black text-slate-900 truncate max-w-[200px]">{company.name}</p>
                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{menuItems.find(m => m.key === activeTab)?.label}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-5 lg:p-8 max-w-2xl mx-auto">

                    {/* HOME TAB */}
                    {activeTab === 'home' && (
                        <div className="space-y-6">
                            {/* Welcome Card */}
                            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-7 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-2">Hoş Geldiniz</p>
                                <h2 className="text-2xl font-black tracking-tight">{company.name}</h2>
                                <p className="text-white/60 text-sm mt-1">{company.address_line || company.district_name || ''} {company.province_name || ''}</p>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white rounded-2xl p-4 text-center shadow-lg shadow-slate-200/30 border border-slate-50">
                                    <p className="text-3xl font-black text-indigo-600">{staffBoards.length}</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Personel</p>
                                </div>
                                <div className="bg-white rounded-2xl p-4 text-center shadow-lg shadow-slate-200/30 border border-slate-50">
                                    <p className="text-3xl font-black text-emerald-600">
                                        {company.work_start_time?.substring(0, 5) || '09:00'}
                                    </p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Açılış</p>
                                </div>
                                <div className="bg-white rounded-2xl p-4 text-center shadow-lg shadow-slate-200/30 border border-slate-50">
                                    <p className="text-3xl font-black text-purple-600">
                                        {company.work_end_time?.substring(0, 5) || '20:00'}
                                    </p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Kapanış</p>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hızlı İşlemler</p>
                                {[
                                    { icon: '📅', label: 'Müşteri Randevu QR Kodu', desc: 'Müşterilerin randevu alması için', tab: 'booking' as TabKey },
                                    { icon: '👤', label: 'Yeni Personel Ekle', desc: 'Board kodu ile giriş yapacak', tab: 'staff' as TabKey },
                                    { icon: '🏢', label: 'Departman Yönet', desc: 'Birimlerinizi düzenleyin', tab: 'dept' as TabKey },
                                ].map((action, i) => (
                                    <button
                                        key={i}
                                        onClick={() => switchTab(action.tab)}
                                        className="w-full bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/20 border border-slate-50 flex items-center gap-4 hover:shadow-xl active:scale-[0.98] transition-all text-left"
                                    >
                                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">{action.icon}</div>
                                        <div>
                                            <p className="font-black text-slate-900 text-sm">{action.label}</p>
                                            <p className="text-xs text-slate-400">{action.desc}</p>
                                        </div>
                                        <svg className="w-5 h-5 text-slate-300 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                ))}
                            </div>

                            {/* Info Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/20 border border-slate-50">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Departman</p>
                                    <p className="text-sm font-black text-slate-900">{departments.length} birim</p>
                                </div>
                                <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/20 border border-slate-50 col-span-2">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Hizmet Verilenler</p>
                                    <div className="flex gap-2 mt-1">
                                        {(company?.genders || []).map((g: string) => (
                                            <span key={g} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-black">{g}</span>
                                        ))}
                                        {(!company?.genders || company.genders.length === 0) && (
                                            <span className="text-[10px] text-slate-400 italic">Belirtilmemiş</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PROFILE TAB - Firma Tanıtımı */}
                    {activeTab === 'profile' && company && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40">
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6">Firma Tanıtım Bilgileri</h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">İşletme Adı</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                            value={company.name || ''}
                                            onChange={e => setCompany({ ...company, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tanıtım Yazısı (Hakkımızda)</label>
                                        <textarea
                                            rows={4}
                                            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                            value={company.description || ''}
                                            onChange={e => setCompany({ ...company, description: e.target.value })}
                                            placeholder="İşletmenizi müşterilerinize tanıtın..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Telefon</label>
                                            <input
                                                type="tel"
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                                value={company.phone || ''}
                                                onChange={e => setCompany({ ...company, phone: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-Posta</label>
                                            <input
                                                type="email"
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                                value={company.email || ''}
                                                onChange={e => setCompany({ ...company, email: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Açık Adres</label>
                                        <textarea
                                            rows={2}
                                            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                            value={company.address_line || ''}
                                            onChange={e => setCompany({ ...company, address_line: e.target.value })}
                                        />
                                    </div>

                                    {/* Terminoloji Ayarları */}
                                    <div className="pt-4 border-t border-slate-100">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Terminoloji</label>
                                        <p className="text-xs text-slate-400 mb-4 ml-1">İşletmenize uygun adlandırma yapın. Bu isimler müşterilerinize gösterilecektir.</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Personel Adı</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 text-sm"
                                                    placeholder="Personel"
                                                    value={company.staff_label || ''}
                                                    onChange={e => setCompany({ ...company, staff_label: e.target.value })}
                                                />
                                                <p className="text-[8px] text-slate-300 mt-1 ml-1">Örn: Kuaför, Doktor, Teknisyen, Usta</p>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Hizmet Adı</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 text-sm"
                                                    placeholder="Hizmet"
                                                    value={company.service_label || ''}
                                                    onChange={e => setCompany({ ...company, service_label: e.target.value })}
                                                />
                                                <p className="text-[8px] text-slate-300 mt-1 ml-1">Örn: Tedavi, Yıkama, İşlem, Kurs</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Randevu Akış Sırası Ayarı */}
                                    <div className="pt-4 border-t border-slate-100">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Randevu Akış Sırası</label>
                                        <p className="text-xs text-slate-400 mb-4 ml-1">Adımları yukarı/aşağı taşıyarak müşteri randevu akışını belirleyin.</p>

                                        {(() => {
                                            // Decode 4-char flow code to step array
                                            const flow = company.booking_flow || 'SPDT';
                                            const codeToKey: Record<string, string> = { 'S': 'service', 'P': 'staff', 'D': 'date', 'T': 'time' };
                                            const keyToCode: Record<string, string> = { 'service': 'S', 'staff': 'P', 'date': 'D', 'time': 'T' };

                                            // Parse flow code (fallback to SPDT for old 3-char codes)
                                            let steps: string[];
                                            if (flow.length === 4) {
                                                steps = flow.split('').map((c: string) => codeToKey[c] || 'service');
                                            } else {
                                                // Legacy 3-char codes
                                                const legacy: Record<string, string[]> = {
                                                    'SHP': ['service', 'staff', 'date', 'time'],
                                                    'SDP': ['service', 'date', 'staff', 'time'],
                                                    'SDT': ['service', 'date', 'time', 'staff'],
                                                };
                                                steps = legacy[flow] || ['service', 'staff', 'date', 'time'];
                                            }

                                            const stepLabels: Record<string, { icon: string; label: string; color: string }> = {
                                                service: { icon: '✂️', label: (company.service_label || 'Hizmet') + ' Seçimi', color: 'border-rose-200 bg-rose-50' },
                                                staff: { icon: '👤', label: (company.staff_label || 'Personel') + ' Seçimi', color: 'border-violet-200 bg-violet-50' },
                                                date: { icon: '📅', label: 'Tarih Seçimi', color: 'border-emerald-200 bg-emerald-50' },
                                                time: { icon: '🕐', label: 'Saat Seçimi', color: 'border-amber-200 bg-amber-50' },
                                            };

                                            const stepsToCode = (s: string[]) => s.map(k => keyToCode[k]).join('');

                                            // Constraint: Time must come after both Service and Date
                                            const isValidOrder = (s: string[]) => {
                                                const ti = s.indexOf('time');
                                                const si = s.indexOf('service');
                                                const di = s.indexOf('date');
                                                return si < ti && di < ti;
                                            };

                                            const moveStep = (index: number, direction: 'up' | 'down') => {
                                                const newSteps = [...steps];
                                                const targetIndex = direction === 'up' ? index - 1 : index + 1;
                                                if (targetIndex < 0 || targetIndex >= newSteps.length) return;
                                                [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
                                                if (!isValidOrder(newSteps)) return;
                                                setCompany({ ...company, booking_flow: stepsToCode(newSteps) });
                                            };

                                            const canMove = (index: number, direction: 'up' | 'down') => {
                                                const targetIndex = direction === 'up' ? index - 1 : index + 1;
                                                if (targetIndex < 0 || targetIndex >= steps.length) return false;
                                                const newSteps = [...steps];
                                                [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
                                                return isValidOrder(newSteps);
                                            };

                                            return (
                                                <div className="space-y-2">
                                                    {steps.map((stepKey, index) => {
                                                        const info = stepLabels[stepKey];
                                                        const stepNumber = index + 1;
                                                        return (
                                                            <div key={stepKey} className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${info.color}`}>
                                                                <div className="w-7 h-7 rounded-lg bg-white/80 flex items-center justify-center text-[10px] font-black text-slate-600 shadow-sm">{stepNumber}</div>
                                                                <span className="text-base">{info.icon}</span>
                                                                <span className="font-bold text-sm text-slate-700">{info.label}</span>
                                                                <div className="ml-auto flex gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => moveStep(index, 'up')}
                                                                        disabled={!canMove(index, 'up')}
                                                                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${canMove(index, 'up') ? 'bg-white shadow-sm text-slate-600 hover:bg-slate-100 active:scale-90' : 'bg-transparent text-slate-200 cursor-not-allowed'}`}
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => moveStep(index, 'down')}
                                                                        disabled={!canMove(index, 'down')}
                                                                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${canMove(index, 'down') ? 'bg-white shadow-sm text-slate-600 hover:bg-slate-100 active:scale-90' : 'bg-transparent text-slate-200 cursor-not-allowed'}`}
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Fixed Last Step */}
                                                    <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50">
                                                        <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">5</div>
                                                        <span className="text-base">📝</span>
                                                        <span className="font-bold text-sm text-slate-400">Müşteri Bilgileri</span>
                                                        <span className="ml-auto text-[8px] font-black text-slate-300 bg-slate-100 px-2 py-0.5 rounded-full">SABİT</span>
                                                    </div>

                                                    <p className="text-[9px] text-slate-300 font-bold ml-1 mt-1">ℹ️ Saat seçimi her zaman Hizmet ve Tarihten sonra olmalıdır.</p>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div className="pt-6">
                                        <button
                                            onClick={handleUpdateCompany}
                                            disabled={loading}
                                            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-300 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                        >
                                            {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                                <h3 className="text-lg font-black mb-2 italic">Önizleme</h3>
                                <p className="text-indigo-200 text-xs font-bold leading-relaxed mb-6">Müşterileriniz haritada veya listede sizi bu bilgilerle görecekler.</p>
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl">🏢</div>
                                        <div>
                                            <p className="font-black text-sm">{company.name}</p>
                                            <p className="text-[10px] text-indigo-300 font-bold uppercase">{company.district_name || 'Şehir Belirtilmemiş'}</p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => window.open(`${window.location.origin}${import.meta.env.BASE_URL}book/${company.id}`, '_blank')}
                                    className="mt-6 w-full py-4 bg-white text-indigo-900 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all"
                                >
                                    Müşteri Sayfasını Görüntüle
                                </button>
                            </div>
                        </div>
                    )}

                    {/* BOOKING QR TAB - Müşteri Randevu QR */}
                    {activeTab === 'booking' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 text-center">
                                <div className="inline-flex px-4 py-1.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-amber-100">
                                    Müşteri Randevu QR Kodu
                                </div>

                                <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
                                    Bu QR kodu müşterilerinize gösterin veya yazdırıp dükkanınıza asın. Taratarak doğrudan randevu alabilirler.
                                </p>

                                {/* Real QR Code */}
                                <div className="bg-white border-4 border-slate-900 rounded-3xl p-5 inline-block mb-6">
                                    <img
                                        src={qrApiUrl(bookingUrl, 250)}
                                        alt="Müşteri Randevu QR"
                                        className="w-52 h-52"
                                    />
                                </div>

                                <p className="text-xs text-slate-400 mb-2">Müşterileriniz bu QR'ı taratarak randevu alabilir</p>
                                <p className="text-[10px] text-slate-300 font-mono break-all px-4">{bookingUrl}</p>

                                <div className="flex gap-3 justify-center mt-6">
                                    <button
                                        onClick={() => copyText(bookingUrl, 'booking-url')}
                                        className={`px-5 py-3 rounded-2xl text-sm font-black active:scale-95 transition-all ${copiedField === 'booking-url'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-900 text-white hover:bg-slate-800'
                                            }`}
                                    >
                                        {copiedField === 'booking-url' ? '✅ Kopyalandı!' : '📋 Linki Kopyala'}
                                    </button>
                                    <button
                                        onClick={() => window.print()}
                                        className="px-5 py-3 bg-amber-600 text-white rounded-2xl text-sm font-black hover:bg-amber-500 active:scale-95 transition-all"
                                    >
                                        🖨️ Yazdır
                                    </button>
                                </div>
                            </div>

                            {/* Print Stand Preview */}
                            <div className="bg-white rounded-3xl p-6 shadow-lg shadow-slate-200/20 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">QR Standı Önizleme</p>
                                <div className="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-2xl p-6 max-w-xs mx-auto text-white">
                                    <p className="text-lg font-black mb-1">{company.name}</p>
                                    <p className="text-[10px] text-white/50 uppercase tracking-widest mb-4">Online Randevu</p>
                                    <div className="bg-white rounded-xl p-3 inline-block mb-3">
                                        <img
                                            src={qrApiUrl(bookingUrl, 150)}
                                            alt="Stand QR"
                                            className="w-28 h-28"
                                        />
                                    </div>
                                    <p className="text-[9px] text-white/40">QR kodu taratarak randevu alabilirsiniz</p>
                                </div>
                                <a
                                    href={qrApiUrl(bookingUrl, 1000)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mt-4 text-xs text-indigo-500 font-bold hover:underline"
                                >
                                    Yüksek Çözünürlüklü QR İndir ↗
                                </a>
                            </div>
                        </div>
                    )}

                    {/* ADMIN QR TAB */}
                    {activeTab === 'qr' && (
                        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
                            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 w-full max-w-md">

                                {/* Üst Badge */}
                                <div className="flex justify-center mb-8">
                                    <div className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        Firma Yönetim Kodu
                                    </div>
                                </div>

                                {/* QR Code - Centered */}
                                <div className="flex justify-center mb-6">
                                    <div className="bg-white border-4 border-slate-900 rounded-3xl p-5">
                                        <img
                                            src={qrApiUrl(`${window.location.origin}${import.meta.env.BASE_URL}company-panel?key=${company.admin_key}`, 250)}
                                            alt="Admin Panel QR"
                                            className="w-44 h-44 mx-auto block"
                                        />
                                    </div>
                                </div>

                                {/* Barcode */}
                                <div className="flex justify-center mb-6">
                                    <img
                                        src={`https://barcodeapi.org/api/128/${encodeURIComponent(company.admin_key || 'N/A')}`}
                                        alt="Barcode"
                                        className="h-14 max-w-full"
                                        style={{ imageRendering: 'pixelated' }}
                                    />
                                </div>

                                {/* Admin Key Code */}
                                <div className="text-center mb-2">
                                    <p className="text-2xl font-black text-slate-900 tracking-[0.25em] font-mono">
                                        {company.admin_key || 'Anahtar yok'}
                                    </p>
                                </div>

                                <p className="text-center text-xs text-slate-400 mb-6">
                                    Bu kodu firmaya yönetici olarak giriş yapmak için kullanın
                                </p>

                                {/* Action Buttons */}
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => copyText(company.admin_key || '', 'admin-key')}
                                        className={`flex-1 max-w-[160px] py-3.5 rounded-2xl text-sm font-black active:scale-95 transition-all ${copiedField === 'admin-key'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-900 text-white hover:bg-slate-800'
                                            }`}
                                    >
                                        {copiedField === 'admin-key' ? '✅ Kopyalandı!' : '📋 Kopyala'}
                                    </button>
                                    <button
                                        onClick={() => window.print()}
                                        className="flex-1 max-w-[160px] py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-500 active:scale-95 transition-all"
                                    >
                                        🖨️ Yazdır
                                    </button>
                                </div>
                            </div>

                            {/* Board Key Card */}
                            <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/20 w-full max-w-md mt-5 flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Salon Board Anahtarı</p>
                                    <p className="text-base font-black text-slate-900 tracking-widest font-mono">{company.board_key || '—'}</p>
                                </div>
                                {company.board_key && (
                                    <button
                                        onClick={() => copyText(company.board_key, 'board-key')}
                                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all ${copiedField === 'board-key'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        {copiedField === 'board-key' ? '✅ Kopyalandı!' : '📋 Kopyala'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* DEPARTMENTS TAB */}
                    {activeTab === 'dept' && (
                        <div className="space-y-4">
                            <button
                                onClick={() => setShowDeptModal(true)}
                                className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-base tracking-wide shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
                            >
                                + Yeni Departman Ekle
                            </button>

                            {departments.length === 0 ? (
                                <div className="bg-white rounded-3xl p-10 text-center shadow-lg shadow-slate-200/20">
                                    <span className="text-4xl mb-3 block">🏢</span>
                                    <p className="text-slate-400 font-bold">Henüz departman tanımlanmadı</p>
                                    <p className="text-slate-300 text-xs mt-1">İlk departmanınızı oluşturun</p>
                                </div>
                            ) : (
                                departments.map(dept => (
                                    <div key={dept.id} className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/20 flex items-center justify-between">
                                        <div>
                                            <p className="font-black text-slate-900 text-lg">{dept.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                {staffBoards.filter(s => s.department_id === dept.id).length} personel
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteDepartment(dept.id)}
                                            className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-all"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* STAFF TAB */}
                    {activeTab === 'staff' && (
                        <div className="space-y-4">
                            <button
                                onClick={() => setShowStaffModal(true)}
                                className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-black text-base tracking-wide shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                            >
                                + Personel Board Kodu Oluştur
                            </button>

                            {staffBoards.length === 0 ? (
                                <div className="bg-white rounded-3xl p-10 text-center shadow-lg shadow-slate-200/20">
                                    <span className="text-4xl mb-3 block">👥</span>
                                    <p className="text-slate-400 font-bold">Henüz personel board kodu yok</p>
                                    <p className="text-slate-300 text-xs mt-1">Çalışanlarınız için kod oluşturun</p>
                                </div>
                            ) : (
                                staffBoards.map(staff => (
                                    <div key={staff.id} className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/20">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="relative group/photo flex-shrink-0">
                                                    <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-white shadow-md overflow-hidden flex items-center justify-center">
                                                        {staff.photo ? (
                                                            <img src={staff.photo} alt={staff.first_name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-2xl">👤</span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handlePhotoSelection(false, staff.id)}
                                                        className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-indigo-700 transition-all border-2 border-white"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-xl">{staff.first_name} {staff.last_name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${staff.gender === 'erkek'
                                                            ? 'bg-blue-50 text-blue-600'
                                                            : 'bg-pink-50 text-pink-600'
                                                            }`}>
                                                            {staff.gender === 'erkek' ? '♂ Erkek' : '♀ Kadın'}
                                                        </span>
                                                        {staff.department_name && (
                                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                                {staff.department_name}
                                                            </span>
                                                        )}
                                                        {(staff as any).quantity && (staff as any).unit && (
                                                            <span className="px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                                {(staff as any).quantity} {(staff as any).unit}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* QR Code */}
                                        <div className="bg-slate-50 rounded-2xl p-5 text-center relative">
                                            <button
                                                onClick={() => handleDeleteStaff(staff.id)}
                                                className="absolute top-4 right-4 w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-all shadow-sm"
                                                title="Personeli Sil"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                            <div className="bg-white border-2 border-slate-900 rounded-xl p-3 inline-block mb-3">
                                                <img
                                                    src={qrApiUrl(staff.board_code, 150)}
                                                    alt={`${staff.first_name} QR`}
                                                    className="w-28 h-28"
                                                />
                                            </div>
                                            <p className="text-xl font-black text-slate-900 tracking-[0.3em] font-mono">{staff.board_code}</p>
                                            <div className="flex gap-2 justify-center mt-3">
                                                <button
                                                    onClick={() => copyText(staff.board_code, `staff-${staff.id}`)}
                                                    className={`px-4 py-2 rounded-xl text-[11px] font-black active:scale-95 transition-all ${copiedField === `staff-${staff.id}`
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-slate-900 text-white'
                                                        }`}
                                                >
                                                    {copiedField === `staff-${staff.id}` ? '✅ Kopyalandı!' : '📋 Kopyala'}
                                                </button>
                                                <button
                                                    onClick={() => window.print()}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-black active:scale-95 transition-all"
                                                >
                                                    🖨️ Yazdır
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                    {/* AI TAB - Yapay Zeka Ayarları */}
                    {activeTab === 'ai' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>

                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center text-3xl shadow-lg shadow-indigo-200">
                                        🤖
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 leading-tight">Yapay Zeka Asistanı</h2>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Randevu Akıllı Çıkarım Kuralları</p>
                                    </div>
                                </div>

                                <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 mb-8 text-amber-700">
                                    <p className="font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <span>💡</span> AI Nasıl Çalışır?
                                    </p>
                                    <p className="text-sm leading-relaxed">
                                        Müşterileriniz veya çalışanlarınız sesli komut verdiğinde, sistem bu metni analiz eder.
                                        Aşağıdaki alana AI'nın nasıl davranması gerektiğine dair kurallar yazabilirsiniz.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Yapay Zeka Yönergesi (Prompts)</label>
                                        <textarea
                                            value={aiRules}
                                            onChange={e => setAiRules(e.target.value)}
                                            rows={12}
                                            placeholder="Örn: Eğer müşteri saat belirtmezse bugün için en yakın 15 dakikalık boşluğa randevu oluştur. Eğer hizmet belirtmezse 'Saç Kesimi' seçeneğini varsayılan yap..."
                                            className="w-full p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100 focus:border-indigo-500 text-sm font-medium text-slate-800 outline-none resize-none leading-relaxed transition-all"
                                        />
                                    </div>

                                    <button
                                        onClick={handleSaveAIRules}
                                        disabled={isSavingAI}
                                        className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-base tracking-wide shadow-xl shadow-indigo-500/30 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                    >
                                        {isSavingAI ? 'Kaydediliyor...' : 'Kuralları Uygula & Kaydet'}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-200">
                                <h3 className="font-black text-lg mb-4">Örnek Kurallar</h3>
                                <ul className="space-y-3 text-sm text-indigo-100">
                                    <li className="flex gap-3">
                                        <span className="text-indigo-400">🔹</span>
                                        <span>Saat 7 denirse akşam 19:00 olarak algıla.</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-indigo-400">🔹</span>
                                        <span>Hizmet belirtilmezse süreyi 30 dakika varsay.</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-indigo-400">🔹</span>
                                        <span>Her zaman bugün tarihini baz al.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* SERVICES TAB */}
                    {activeTab === 'services' && (
                        <div className="space-y-6">
                            {/* Nested Tabs for Services/Packages */}
                            <div className="flex bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-100 shadow-sm gap-1 self-start">
                                <button
                                    onClick={() => setActiveServiceTab('services')}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeServiceTab === 'services' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    Hizmetler
                                </button>
                                <button
                                    onClick={() => setActiveServiceTab('packages')}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeServiceTab === 'packages' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    Paketler
                                </button>
                            </div>

                            {activeServiceTab === 'services' ? (
                                <>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowTemplatesModal(true)}
                                            className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            📋 Şablonlardan Ekle
                                        </button>
                                        <button
                                            onClick={() => {
                                                setServiceForm({ id: null, name: '', description: '', duration_minutes: 30, price: 0, department_id: null, photo: null, quantity: '', unit: '' });
                                                setShowServiceModal(true);
                                            }}
                                            className="flex-[2] py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-base tracking-wide shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
                                        >
                                            + Yeni Hizmet Ekle
                                        </button>
                                    </div>

                                    {companyServices.length === 0 ? (
                                        <div className="bg-white rounded-3xl p-10 text-center shadow-lg shadow-slate-200/20">
                                            <span className="text-4xl mb-3 block">✂️</span>
                                            <p className="text-slate-400 font-bold">Henüz hizmet tanımlanmadı</p>
                                            <p className="text-slate-300 text-xs mt-1">Firmanız için hizmet listesi oluşturun</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {companyServices.map(svc => (
                                                <div key={svc.id} className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/20 relative group flex gap-4">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex-shrink-0 flex items-center justify-center text-slate-300 overflow-hidden border border-slate-100">
                                                        {svc.photo ? (
                                                            <img src={svc.photo} alt={svc.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758L5 19m0-14l4.121 4.121" /></svg>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="min-w-0">
                                                                <h3 className="font-black text-slate-900 text-base truncate">{svc.name}</h3>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap">
                                                                        ⏱️ {svc.duration_minutes} dk • 💰 {svc.price} ₺
                                                                    </p>
                                                                    {svc.quantity && svc.unit && (
                                                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded-lg text-[8px] font-black uppercase whitespace-nowrap">{svc.quantity} {svc.unit}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex bg-slate-50 rounded-xl p-1 gap-1">
                                                                <button
                                                                    onClick={() => {
                                                                        setServiceForm({
                                                                            id: svc.id,
                                                                            name: svc.name,
                                                                            description: svc.description || '',
                                                                            duration_minutes: svc.duration_minutes,
                                                                            price: svc.price,
                                                                            department_id: svc.department_id || null,
                                                                            photo: svc.photo || null,
                                                                            quantity: svc.quantity || '',
                                                                            unit: svc.unit || ''
                                                                        });
                                                                        setShowServiceModal(true);
                                                                    }}
                                                                    className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-indigo-600 transition-all font-bold"
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteService(svc.id)}
                                                                    className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-red-600 transition-all font-bold"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {svc.description && (
                                                            <p className="text-sm text-slate-500 mt-2 line-clamp-2">{svc.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            setPackageForm({ id: null, name: '', description: '', duration_minutes: 0, price: 0, items: [], department_id: null, staff_id: null });
                                            setShowPackageModal(true);
                                        }}
                                        className="w-full py-5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-2xl font-black text-base tracking-wide shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
                                    >
                                        + Yeni Paket Ekle
                                    </button>

                                    {packages.length === 0 ? (
                                        <div className="bg-white rounded-3xl p-10 text-center shadow-lg shadow-slate-200/20">
                                            <span className="text-4xl mb-3 block">🎁</span>
                                            <p className="text-slate-400 font-bold">Henüz paket tanımlanmadı</p>
                                            <p className="text-slate-300 text-xs mt-1">Firmanız için özel paketler oluşturun</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {packages.map(pkg => (
                                                <div key={pkg.id} className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/20 relative group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h3 className="font-black text-slate-900 text-lg">{pkg.name}</h3>
                                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                                                                ⏱️ {pkg.duration_minutes} dk • 💰 {pkg.price} ₺
                                                            </p>
                                                        </div>
                                                        <div className="flex bg-slate-50 rounded-xl p-1 gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    setPackageForm({
                                                                        id: pkg.id,
                                                                        name: pkg.name,
                                                                        description: pkg.description || '',
                                                                        duration_minutes: pkg.duration_minutes,
                                                                        price: pkg.price,
                                                                        items: pkg.services?.filter((s: any) => s.id !== null).map((s: any) => ({
                                                                            service_id: s.id,
                                                                            staff_id: s.staff_id || null,
                                                                            department_id: s.department_id || null,
                                                                            price: s.price || 0,
                                                                            duration_minutes: s.duration_minutes || 0
                                                                        })) || [],
                                                                        department_id: pkg.department_id || null,
                                                                        staff_id: pkg.staff_id || null
                                                                    });
                                                                    setShowPackageModal(true);
                                                                }}
                                                                className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-indigo-600 transition-all font-bold"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeletePackage(pkg.id)}
                                                                className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-red-600 transition-all font-bold"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {pkg.services?.map((s: any) => (
                                                            <span key={s.id} className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md text-[9px] font-black uppercase">{s.name}</span>
                                                        ))}
                                                    </div>
                                                    {pkg.description && (
                                                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">{pkg.description}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* FINANCE TAB */}
                    {activeTab === 'finance' && (
                        <div className="space-y-6">
                            {/* Sub Tabs */}
                            <div className="flex bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-100 shadow-sm gap-1 self-start">
                                {[
                                    { key: 'sales', label: 'Satışlar (Randevular)', icon: '📈' },
                                    { key: 'purchases', label: 'Alış Faturaları', icon: '🛒' },
                                    { key: 'cash', label: 'Kasa İşlemleri', icon: '🏦' }
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveFinanceTab(tab.key as any)}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeFinanceTab === tab.key ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-400 hover:bg-slate-50'}`}
                                    >
                                        <span>{tab.icon}</span> {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Sales Content */}
                            {activeFinanceTab === 'sales' && (
                                <div className="space-y-6">
                                    {/* Filters */}
                                    <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/20 grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-50">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tarih Aralığı</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="date"
                                                    value={financeDateRange.start}
                                                    onChange={e => setFinanceDateRange(p => ({ ...p, start: e.target.value }))}
                                                    className="flex-1 p-3 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold text-xs"
                                                />
                                                <input
                                                    type="date"
                                                    value={financeDateRange.end}
                                                    onChange={e => setFinanceDateRange(p => ({ ...p, end: e.target.value }))}
                                                    className="flex-1 p-3 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold text-xs"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Müşteri Arama (İsim / Tel)</label>
                                            <input
                                                type="text"
                                                value={financeSearch}
                                                onChange={e => setFinanceSearch(e.target.value)}
                                                placeholder="Müşteri ara..."
                                                className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold text-xs"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                onClick={() => fetchFinanceData(company?.id)}
                                                className="w-full p-[18px] bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all"
                                            >
                                                Filtrele
                                            </button>
                                        </div>
                                    </div>

                                    {/* Sub Tabs: Bekleyen / Faturalar */}
                                    <div className="flex bg-slate-100/80 p-1 rounded-2xl gap-1 self-start">
                                        <button
                                            onClick={() => setSalesSubTab('pending')}
                                            className={`flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${salesSubTab === 'pending' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'}`}
                                        >
                                            <span>⏳</span> Bekleyen ({completedAppointments.length})
                                        </button>
                                        <button
                                            onClick={() => setSalesSubTab('invoiced')}
                                            className={`flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${salesSubTab === 'invoiced' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                                        >
                                            <span>✅</span> Faturalar ({invoices.length})
                                        </button>
                                    </div>

                                    {/* Pending Appointments */}
                                    {salesSubTab === 'pending' && (
                                        <div className="grid grid-cols-1 gap-4">
                                            {loadingFinance ? (
                                                <div className="py-20 text-center animate-pulse text-slate-400 font-black">Yükleniyor...</div>
                                            ) : completedAppointments.length === 0 ? (
                                                <div className="bg-white rounded-3xl p-10 text-center shadow-lg border border-slate-50">
                                                    <span className="text-4xl block mb-2">🎉</span>
                                                    <p className="text-slate-400 font-bold uppercase text-xs">Tüm randevular faturalandırıldı!</p>
                                                </div>
                                            ) : (
                                                completedAppointments.map(apt => (
                                                    <div key={apt.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center font-black">
                                                                {apt.customer_name?.charAt(0).toUpperCase() || 'M'}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-black text-slate-900">{apt.customer_name}</h4>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(apt.date).toLocaleDateString('tr-TR')} {apt.time}</p>
                                                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter mt-1">{apt.service_name}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-8">
                                                            <div className="text-right">
                                                                <p className="text-lg font-black text-slate-900">{apt.price} ₺</p>
                                                                <p className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg inline-block bg-amber-100 text-amber-600">
                                                                    Bekliyor
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedAppointment(apt);
                                                                    setShowInvoiceModal(true);
                                                                }}
                                                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all"
                                                            >
                                                                Faturaya Dönüştür
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {/* Issued Invoices - E-Fatura / E-Arşiv View */}
                                    {salesSubTab === 'invoiced' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {loadingFinance ? (
                                                <div className="col-span-2 py-20 text-center animate-pulse text-slate-400 font-black">Yükleniyor...</div>
                                            ) : invoices.length === 0 ? (
                                                <div className="col-span-2 bg-white rounded-3xl p-10 text-center shadow-lg border border-slate-50">
                                                    <span className="text-4xl block mb-2">📄</span>
                                                    <p className="text-slate-400 font-bold uppercase text-xs">Henüz fatura kesilmedi</p>
                                                </div>
                                            ) : (
                                                invoices.map(inv => (
                                                    <div key={inv.id} className="bg-white rounded-[2rem] shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl transition-shadow">
                                                        {/* Invoice Header - Document Style */}
                                                        <div className={`p-6 ${inv.type === 'e-fatura' ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-gradient-to-r from-indigo-600 to-purple-600'} text-white relative overflow-hidden`}>
                                                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10" />
                                                            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full -ml-8 -mb-8" />
                                                            <div className="relative z-10">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-70 mb-1">
                                                                            {inv.type === 'e-fatura' ? 'E-FATURA' : inv.type === 'e-arsiv' ? 'E-ARŞİV FATURA' : 'FİŞ'}
                                                                        </p>
                                                                        <h3 className="text-xl font-black">{company?.name || 'Firma'}</h3>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-[8px] font-bold uppercase tracking-widest opacity-60">Fatura No</p>
                                                                        <p className="text-sm font-black mt-0.5">{inv.invoice_no || `INV-${String(inv.id).padStart(6, '0')}`}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Invoice Body */}
                                                        <div className="p-6 space-y-4">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Müşteri</p>
                                                                    <p className="text-base font-black text-slate-900 mt-0.5">{inv.customer_name}</p>
                                                                    {inv.customer_tax_number && (
                                                                        <p className="text-[9px] text-slate-400 font-bold mt-0.5">VKN: {inv.customer_tax_number}</p>
                                                                    )}
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tarih</p>
                                                                    <p className="text-sm font-bold text-slate-700 mt-0.5">
                                                                        {new Date(inv.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Divider */}
                                                            <div className="border-t-2 border-dashed border-slate-100" />

                                                            <div className="flex justify-between items-end">
                                                                <div className="flex gap-2">
                                                                    <span className={`text-[8px] font-black uppercase px-3 py-1.5 rounded-lg ${inv.payment_method === 'nakit' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                                        {inv.payment_method === 'nakit' ? '💰 Nakit' : '💳 Kredi Kartı'}
                                                                    </span>
                                                                    <span className="text-[8px] font-black uppercase px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                                                                        ✓ Tahsil Edildi
                                                                    </span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Toplam</p>
                                                                    <p className="text-2xl font-black text-slate-900">{Number(inv.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Invoice Footer - GIB Actions */}
                                                        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100">
                                                            <div className="flex justify-between items-center">
                                                                <p className="text-[8px] font-bold text-slate-400">
                                                                    {inv.type === 'e-fatura' ? '📋 E-Fatura' : inv.type === 'e-arsiv' ? '📋 E-Arşiv Fatura' : '🖨️ Yazar Kasa Fişi'}
                                                                </p>
                                                                {/* GIB Status Badge */}
                                                                {inv.gib_status === 'sent' ? (
                                                                    <div className="flex flex-col items-end gap-0.5">
                                                                        <span className="text-[8px] font-black uppercase px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center gap-1.5">
                                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                                            GİB'e İletildi
                                                                        </span>
                                                                        {inv.gib_uuid && (
                                                                            <p className="text-[7px] text-slate-400 font-mono truncate max-w-[160px]" title={inv.gib_uuid}>{inv.gib_uuid}</p>
                                                                        )}
                                                                    </div>
                                                                ) : inv.gib_status === 'pending' ? (
                                                                    <span className="text-[8px] font-black uppercase px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 flex items-center gap-1.5 animate-pulse">
                                                                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                                        GİB'e Gönderiliyor...
                                                                    </span>
                                                                ) : inv.gib_status === 'failed' ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[8px] font-black uppercase px-3 py-1.5 rounded-lg bg-red-50 text-red-500">
                                                                            ✗ Gönderim Başarısız
                                                                        </span>
                                                                        <button
                                                                            onClick={async () => {
                                                                                try {
                                                                                    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, gib_status: 'pending' } : i));
                                                                                    const res = await api.post(`/finance/invoices/${inv.id}/gib-send`);
                                                                                    if (res.data.success) {
                                                                                        setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, ...res.data.data.invoice } : i));
                                                                                    }
                                                                                } catch (err: any) {
                                                                                    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, gib_status: 'failed' } : i));
                                                                                    alert(err.response?.data?.error || 'GİB gönderim hatası');
                                                                                }
                                                                            }}
                                                                            className="text-[8px] font-black uppercase px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all"
                                                                        >
                                                                            Tekrar Dene
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    /* not_sent — main CTA */
                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                // Optimistic: show pending
                                                                                setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, gib_status: 'pending' } : i));
                                                                                const res = await api.post(`/finance/invoices/${inv.id}/gib-send`);
                                                                                if (res.data.success) {
                                                                                    // Update invoice in local state with server response
                                                                                    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, ...res.data.data.invoice } : i));
                                                                                }
                                                                            } catch (err: any) {
                                                                                setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, gib_status: 'failed' } : i));
                                                                                alert(err.response?.data?.error || 'GİB gönderim hatası');
                                                                            }
                                                                        }}
                                                                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-red-100 hover:shadow-red-200 hover:scale-105 active:scale-95 transition-all"
                                                                    >
                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                                                        GİB'e Gönder
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Purchases Content */}
                            {activeFinanceTab === 'purchases' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-50 shadow-sm">
                                        <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Alış Faturaları</h3>
                                        <button
                                            onClick={() => setShowPurchaseModal(true)}
                                            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">+ Yeni Alış Girişi</button>
                                    </div>
                                    <div className="space-y-3">
                                        {purchaseInvoices.length === 0 ? (
                                            <div className="bg-white rounded-3xl p-20 text-center shadow-lg border border-slate-50">
                                                <span className="text-4xl block mb-2">🛒</span>
                                                <p className="text-slate-300 font-bold uppercase text-[10px]">Henüz alış faturası bulunmuyor</p>
                                            </div>
                                        ) : (
                                            purchaseInvoices.map(p => (
                                                <div key={p.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-black text-slate-900">{p.supplier_name}</h4>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Fatura No: {p.invoice_no || '---'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-base font-black text-red-600">-{p.amount} ₺</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(p.created_at).toLocaleDateString('tr-TR')}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Cash Content */}
                            {activeFinanceTab === 'cash' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-emerald-600 p-8 rounded-[2rem] text-white shadow-xl flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] font-black uppercase opacity-60">Kasa Nakit Bakiye</p>
                                                <h2 className="text-4xl font-black italic mt-2">
                                                    {(cashTransactions.filter(t => t.payment_method === 'nakit').reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                </h2>
                                            </div>
                                            <span className="text-4xl opacity-50">💰</span>
                                        </div>
                                        <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-xl flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] font-black uppercase opacity-60">Kart / Bekleyen İşlemler</p>
                                                <h2 className="text-4xl font-black italic mt-2">
                                                    {(cashTransactions.filter(t => t.payment_method === 'kart').reduce((sum, t) => sum + Number(t.amount), 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                </h2>
                                            </div>
                                            <span className="text-4xl opacity-50">💳</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowCashModal(true)}
                                            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-200">- Yeni Gider İşlemi</button>
                                        <button
                                            onClick={() => setShowCashModal(true)}
                                            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-emerald-50 hover:text-emerald-500">💸 Nakit Ödeme</button>
                                    </div>
                                    <div className="space-y-3">
                                        {cashTransactions.length === 0 ? (
                                            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                                                <p className="text-slate-400 font-bold uppercase text-[10px]">Henüz kasa hareketi yok</p>
                                            </div>
                                        ) : (
                                            cashTransactions.map(t => (
                                                <div key={t.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                            {t.type === 'income' ? '+' : '-'}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-slate-900 leading-tight">{t.description || (t.type === 'income' ? 'Gelir' : 'Gider')}</h4>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{t.category} • {t.payment_method}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-base font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                            {t.type === 'income' ? '+' : '-'}{t.amount} ₺
                                                        </p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(t.created_at).toLocaleDateString('tr-TR')}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* REPORTS TAB - Şirket Raporları */}
                    {activeTab === 'reports' && (
                        <div className="space-y-6">
                            {/* Period Selector */}
                            <div className="bg-white p-2 rounded-2xl shadow-sm inline-flex gap-1 border border-slate-100">
                                {(['today', 'week', 'month', 'year'] as const).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setReportPeriod(p)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportPeriod === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}
                                    >
                                        {p === 'today' ? 'Bugün' : p === 'week' ? 'Bu Hafta' : p === 'month' ? 'Bu Ay' : 'Bu Yıl'}
                                    </button>
                                ))}
                            </div>

                            {loadingReport ? (
                                <div className="text-center py-20">
                                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Veriler Analiz Ediliyor...</p>
                                </div>
                            ) : reportError ? (
                                <div className="text-center py-10 bg-red-50 rounded-3xl border border-red-100 p-6">
                                    <p className="text-red-600 font-black text-sm mb-2">Rapor Hatası</p>
                                    <p className="text-red-400 text-xs mb-4">{reportError}</p>
                                    <button onClick={() => fetchReports(reportPeriod)} className="px-6 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase">Tekrar Dene</button>
                                </div>
                            ) : reportData ? (
                                <>
                                    {/* Stats Cards - Stacked vertically for consistency */}
                                    <div className="space-y-4">
                                        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-50">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Randevu</p>
                                            <p className="text-3xl font-black text-slate-900">{reportData.staffStats.reduce((sum: number, s: any) => sum + s.count, 0)}</p>
                                        </div>
                                        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-50">
                                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Toplam Ciro</p>
                                            <p className="text-3xl font-black text-slate-900">{reportData.staffStats.reduce((sum: number, s: any) => sum + s.revenue, 0).toLocaleString('tr-TR')} ₺</p>
                                        </div>
                                    </div>

                                    {/* Report Stack - All cards vertical for better readability */}
                                    <div className="space-y-6">
                                        {/* Staff Performance */}
                                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 border border-slate-50">
                                            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                                                <span>👤</span> Personel Performansı
                                            </h3>
                                            <div className="space-y-4">
                                                {reportData.staffStats.map((s: any, i: number) => (
                                                    <div key={s.staff_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-indigo-50 transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-xs font-black text-slate-400 border border-slate-100 group-hover:border-indigo-200 group-hover:text-indigo-600">
                                                                #{i + 1}
                                                            </span>
                                                            <div>
                                                                <p className="font-black text-slate-900">{s.staff_name}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.count} Randevu</p>
                                                            </div>
                                                        </div>
                                                        <p className="font-black text-indigo-600">{s.revenue.toLocaleString('tr-TR')} ₺</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Department Performance */}
                                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 border border-indigo-50">
                                            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                                                <span>🏢</span> Departman Performansı
                                            </h3>
                                            <div className="space-y-4">
                                                {reportData.departmentStats?.length > 0 ? reportData.departmentStats.map((d: any, i: number) => (
                                                    <div key={d.department_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[10px] font-black text-slate-400 shadow-sm">
                                                                {i + 1}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-900">{d.department_name}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d.count} Randevu</span>
                                                                    <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                                                    <span className="text-[10px] font-black text-emerald-500">{((d.revenue / (reportData.staffStats.reduce((sum: number, s: any) => sum + s.revenue, 0) || 1)) * 100).toFixed(0)}% Pay</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-black text-slate-900">{d.revenue.toLocaleString('tr-TR')} ₺</p>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="text-center py-10">
                                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">Henüz departman verisi yok</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Weekly Performance */}
                                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 border border-slate-50">
                                            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                                                <span>📅</span> Haftanın Günleri (Ciro)
                                            </h3>
                                            <div className="space-y-4">
                                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                                                    const dayNames: any = { 'Monday': 'Pazartesi', 'Tuesday': 'Salı', 'Wednesday': 'Çarşamba', 'Thursday': 'Perşembe', 'Friday': 'Cuma', 'Saturday': 'Cumartesi', 'Sunday': 'Pazar' };
                                                    const stat = reportData.weeklyStats.find((s: any) => s.day === day);
                                                    const maxRevenue = Math.max(...reportData.weeklyStats.map((s: any) => s.revenue), 1);
                                                    const widthScale = stat ? (stat.revenue / maxRevenue) * 100 : 2;
                                                    return (
                                                        <div key={day} className="space-y-1.5">
                                                            <div className="flex justify-between items-center px-1">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase">{dayNames[day]}</span>
                                                                <span className="text-[10px] font-black text-slate-900">
                                                                    {stat ? stat.revenue.toLocaleString('tr-TR') : 0} ₺
                                                                </span>
                                                            </div>
                                                            <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                                                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${widthScale}%` }}></div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                        {/* Hourly Chart - Redesigned for Mobile (Vertical List) */}
                                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 border border-slate-50">
                                            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span>⏰</span> Yoğun Saatler
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Randevu Sayısı</span>
                                            </h3>
                                            <div className="space-y-3">
                                                {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map(h => {
                                                    const stat = reportData.hourlyStats.find((s: any) => s.hour === h);
                                                    const maxCount = Math.max(...reportData.hourlyStats.map((s: any) => s.count), 1);
                                                    const percentage = stat ? (stat.count / maxCount) * 100 : 0;

                                                    // Only show hours that have at least one appointment for a cleaner look
                                                    if (!stat || stat.count === 0) return null;

                                                    return (
                                                        <div key={h} className="group transition-all">
                                                            <div className="flex items-center justify-between mb-1.5 px-1">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase">{h}:00</span>
                                                                <span className="text-[10px] font-black text-indigo-600">{stat.count} Randevu</span>
                                                            </div>
                                                            <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-700 ease-out"
                                                                    style={{ width: `${percentage}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                                {/* Fallback if no hourly data */}
                                                {!reportData.hourlyStats.some((s: any) => s.count > 0) && (
                                                    <div className="text-center py-4">
                                                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Henüz saatlik veri yok</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>


                                        {/* Monthly Distribution - Vertical for Mobile */}
                                        {reportPeriod === 'year' && (
                                            <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-200">
                                                <h3 className="text-lg font-black mb-6">🗓️ Ay Bazında Ciro Dağılımı</h3>
                                                <div className="space-y-4">
                                                    {reportData.monthlyStats.map((m: any) => {
                                                        const maxMonthlyRevenue = Math.max(...reportData.monthlyStats.map((ms: any) => ms.revenue), 1);
                                                        const monthWidth = (m.revenue / maxMonthlyRevenue) * 100;
                                                        return (
                                                            <div key={m.month} className="bg-white/10 p-5 rounded-[2rem] backdrop-blur-sm border border-white/10">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">{m.month}</p>
                                                                    <p className="text-lg font-black">{m.revenue.toLocaleString('tr-TR')} ₺</p>
                                                                </div>
                                                                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${monthWidth}%` }}></div>
                                                                </div>
                                                                <p className="text-[9px] font-bold text-white/40 mt-1.5 uppercase tracking-widest">{m.count} Randevu</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-center py-4">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Raporlar her gece 23:00'da e-posta adresinize gönderilir.</p>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    )}
                </div>
            </main>

            {/* Department Modal */}
            {
                showDeptModal && (
                    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowDeptModal(false)}>
                        <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-10 shadow-2xl" onClick={e => e.stopPropagation()}
                            style={{ animation: 'slideUp 0.3s ease-out' }}>
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                            <h2 className="text-2xl font-black text-slate-900 mb-6">Yeni Departman</h2>
                            <input
                                type="text"
                                value={deptName}
                                onChange={e => setDeptName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddDepartment()}
                                placeholder="Departman adı..."
                                className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 text-lg font-bold text-slate-900 outline-none mb-6"
                                autoFocus
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeptModal(false)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-base active:scale-95 transition-all"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleAddDepartment}
                                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-base active:scale-95 transition-all"
                                >
                                    Ekle
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Staff Board Modal */}
            {
                showStaffModal && (
                    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowStaffModal(false)}>
                        <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-10 shadow-2xl" onClick={e => e.stopPropagation()}
                            style={{ animation: 'slideUp 0.3s ease-out' }}>
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                            <h2 className="text-2xl font-black text-slate-900 mb-6">Personel Board Kodu Oluştur</h2>

                            <div className="flex flex-col items-center mb-8">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                                        {staffForm.photo ? (
                                            <img src={staffForm.photo || undefined} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center">
                                                <span className="text-4xl block mb-1">📷</span>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Resim Seç</span>
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        onClick={() => handlePhotoSelection(true)}
                                        className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/5 transition-all rounded-full"
                                    >
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">İsim</label>
                                    <input
                                        type="text"
                                        value={staffForm.first_name}
                                        onChange={e => setStaffForm(p => ({ ...p, first_name: e.target.value }))}
                                        placeholder="İsim"
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 text-base font-bold text-slate-900 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Soyisim</label>
                                    <input
                                        type="text"
                                        value={staffForm.last_name}
                                        onChange={e => setStaffForm(p => ({ ...p, last_name: e.target.value }))}
                                        placeholder="Soyisim"
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 text-base font-bold text-slate-900 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Cinsiyet</label>
                                    <div className="flex gap-3">
                                        {['erkek', 'kadın'].map(g => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => setStaffForm(p => ({ ...p, gender: g }))}
                                                className={`flex-1 py-4 rounded-2xl text-base font-black transition-all ${staffForm.gender === g
                                                    ? g === 'erkek'
                                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                        : 'bg-pink-600 text-white shadow-lg shadow-pink-500/30'
                                                    : 'bg-slate-100 text-slate-400'
                                                    }`}
                                            >
                                                {g === 'erkek' ? '♂ Erkek' : '♀ Kadın'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Departman</label>
                                    <select
                                        value={staffForm.department_id}
                                        onChange={e => setStaffForm(p => ({ ...p, department_id: e.target.value }))}
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 text-base font-bold text-slate-900 outline-none appearance-none"
                                    >
                                        <option value="">Departman seçin...</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Miktar</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={staffForm.quantity}
                                            onChange={e => setStaffForm(p => ({ ...p, quantity: e.target.value }))}
                                            placeholder="Opsiyonel"
                                            className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 text-base font-bold text-slate-900 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Birim</label>
                                        <select
                                            value={staffForm.unit}
                                            onChange={e => setStaffForm(p => ({ ...p, unit: e.target.value }))}
                                            className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 text-base font-bold text-slate-900 outline-none appearance-none"
                                        >
                                            <option value="">Seçiniz</option>
                                            <option value="kişi">Kişi</option>
                                            <option value="seans">Seans</option>
                                            <option value="saat">Saat</option>
                                            <option value="adet">Adet</option>
                                            <option value="müşteri">Müşteri</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowStaffModal(false)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-base active:scale-95 transition-all"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleCreateStaffBoard}
                                    disabled={isCreating}
                                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-base active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isCreating ? (
                                        <>
                                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Oluşturuluyor...
                                        </>
                                    ) : 'Oluştur'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Service Modal */}
            {
                showServiceModal && (
                    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowServiceModal(false)}>
                        <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-10 shadow-2xl h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}
                            style={{ animation: 'slideUp 0.3s ease-out' }}>
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                            <h2 className="text-2xl font-black text-slate-900 mb-6">{serviceForm.id ? 'Hizmeti Düzenle' : 'Yeni Hizmet'}</h2>

                            <div className="space-y-4">
                                <div className="flex justify-center mb-6">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-3xl bg-slate-50 overflow-hidden border-4 border-white shadow-xl flex items-center justify-center text-slate-300">
                                            {serviceForm.photo ? (
                                                <img src={serviceForm.photo} alt="Hizmet" className="w-full h-full object-cover" />
                                            ) : (
                                                <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002-2z" /></svg>
                                            )}
                                        </div>
                                        <label className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setServiceForm(p => ({ ...p, photo: reader.result as string }));
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Hizmet Adı</label>
                                    <input
                                        type="text"
                                        value={serviceForm.name}
                                        onChange={e => setServiceForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Örn: Saç Kesimi"
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-pink-500 text-base font-bold text-slate-900 outline-none"
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Miktar ({company?.service_label || 'Hizmet'})</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={serviceForm.quantity}
                                            onChange={e => setServiceForm(p => ({ ...p, quantity: e.target.value }))}
                                            placeholder="Örn: 100"
                                            className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-pink-500 text-base font-bold text-slate-900 outline-none"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Birim</label>
                                        <select
                                            value={serviceForm.unit}
                                            onChange={e => setServiceForm(p => ({ ...p, unit: e.target.value }))}
                                            className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-pink-500 text-base font-bold text-slate-900 outline-none appearance-none"
                                        >
                                            <option value="">Seçiniz</option>
                                            <option value="adet">Adet</option>
                                            <option value="seans">Seans</option>
                                            <option value="ml">ml</option>
                                            <option value="lt">Litre</option>
                                            <option value="gr">Gram</option>
                                            <option value="kg">Kilogram</option>
                                            <option value="paket">Paket</option>
                                            <option value="kişi">Kişi</option>
                                            <option value="m²">m²</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Süre (Dk)</label>
                                        <input
                                            type="number"
                                            value={serviceForm.duration_minutes}
                                            onChange={e => setServiceForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 0 }))}
                                            className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-pink-500 text-base font-bold text-slate-900 outline-none"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Ücret (₺)</label>
                                        <input
                                            type="number"
                                            value={serviceForm.price}
                                            onChange={e => setServiceForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                                            className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-pink-500 text-base font-bold text-slate-900 outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Departman (Opsiyonel)</label>
                                    <select
                                        value={serviceForm.department_id || ''}
                                        onChange={e => setServiceForm(p => ({ ...p, department_id: e.target.value ? parseInt(e.target.value) : null }))}
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-pink-500 text-base font-bold text-slate-900 outline-none appearance-none"
                                    >
                                        <option value="">Tüm Departmanlar</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Açıklama</label>
                                    <textarea
                                        value={serviceForm.description}
                                        onChange={e => setServiceForm(p => ({ ...p, description: e.target.value }))}
                                        rows={3}
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-pink-500 text-base font-bold text-slate-900 outline-none resize-none"
                                    />
                                </div>

                                <div className="flex gap-3 mt-6 pt-4">
                                    <button
                                        onClick={() => setShowServiceModal(false)}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-base active:scale-95 transition-all"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        onClick={handleSaveService}
                                        disabled={isSavingService}
                                        className="flex-1 py-4 bg-pink-600 text-white rounded-2xl font-black text-base active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                    >
                                        {isSavingService ? 'Kaydediliyor...' : (serviceForm.id ? 'Güncelle' : 'Kaydet')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Templates Modal */}
            {
                showTemplatesModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowTemplatesModal(false)}>
                        <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setShowTemplatesModal(false)} className="absolute top-6 right-6 p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors z-10">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <div className="p-10 border-b border-slate-50 flex flex-col bg-slate-50/30">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Hizmet Şablonları</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sık kullanılan hizmetleri hızlıca ekleyin</p>
                            </div>
                            <div className="p-10 overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div>
                                        <h4 className="text-indigo-600 font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                                            Erkek Kuaförü
                                        </h4>
                                        <div className="space-y-3">
                                            {templates.men.map((t, i) => (
                                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group">
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-900">{t.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{t.duration} dk • ₺{t.price}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            handleAddFromTemplate(t);
                                                            setShowTemplatesModal(false);
                                                        }}
                                                        className="w-10 h-10 bg-white shadow-sm border border-slate-100 text-indigo-600 rounded-xl font-black flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-pink-600 font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-pink-600 rounded-full"></span>
                                            Kadın Kuaförü
                                        </h4>
                                        <div className="space-y-3">
                                            {templates.women.map((t, i) => (
                                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-pink-100 hover:bg-pink-50/30 transition-all group">
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-900">{t.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{t.duration} dk • ₺{t.price}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            handleAddFromTemplate(t);
                                                            setShowTemplatesModal(false);
                                                        }}
                                                        className="w-10 h-10 bg-white shadow-sm border border-slate-100 text-pink-600 rounded-xl font-black flex items-center justify-center group-hover:bg-pink-600 group-hover:text-white transition-all"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Package Modal */}
            {
                showPackageModal && (
                    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowPackageModal(false)}>
                        <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-10 shadow-2xl h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}
                            style={{ animation: 'slideUp 0.3s ease-out' }}>
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                            <h2 className="text-2xl font-black text-slate-900 mb-6">{packageForm.id ? 'Paketi Düzenle' : 'Yeni Paket'}</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Paket Adı</label>
                                    <input
                                        type="text"
                                        value={packageForm.name}
                                        onChange={e => setPackageForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Örn: Gelin Paketi"
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-amber-500 text-base font-bold text-slate-900 outline-none"
                                    />
                                </div>



                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Hizmet Seçimi</label>
                                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-100">
                                        {companyServices.length === 0 ? (
                                            <div className="col-span-2 py-4 text-center">
                                                <p className="text-[10px] text-slate-400">Henüz hizmet tanımlanmamış. Önce hizmet ekleyin.</p>
                                            </div>
                                        ) : companyServices.map(svc => {
                                            const isSelected = packageForm.items.some(i => i.service_id === svc.id);
                                            return (
                                                <button
                                                    key={svc.id}
                                                    type="button"
                                                    onClick={() => toggleServiceInPackage(svc.id)}
                                                    className={`p-3 rounded-xl border text-left transition-all ${isSelected ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-sm' : 'bg-white border-transparent text-slate-400'}`}
                                                >
                                                    <p className="font-black text-[10px] truncate">{svc.name}</p>
                                                    <p className="text-[8px] opacity-60">{svc.duration_minutes} dk | ₺{svc.price}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-2 ml-1">* Pakete dahil edilecek hizmetleri seçin</p>
                            </div>

                            {/* Per-service Staff Selection */}
                            {packageForm.items.length > 0 && (
                                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Hizmet Bazlı Personel Atama</label>
                                    <p className="text-[8px] text-slate-400 mb-3 ml-1">* Her hizmet için farklı bir uzman seçebilirsiniz (Opsiyonel)</p>
                                    <div className="space-y-2">
                                        {packageForm.items.map(item => {
                                            const svc = companyServices.find(s => s.id === item.service_id);
                                            if (!svc) return null;
                                            return (
                                                <div key={item.service_id} className="flex flex-col gap-2 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-[11px] font-black text-slate-700 truncate">{svc.name}</p>
                                                        <span className="text-[9px] text-slate-400 font-bold px-2 py-0.5 bg-slate-50 rounded-full">{svc.duration_minutes} dk</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 ml-1">Süre (Dk)</label>
                                                            <input
                                                                type="number"
                                                                value={item.duration_minutes}
                                                                onChange={e => handleUpdateServiceDuration(item.service_id, parseInt(e.target.value) || 0)}
                                                                className="w-full p-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-900 outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 ml-1">Fiyat (₺)</label>
                                                            <input
                                                                type="number"
                                                                value={item.price}
                                                                onChange={e => handleUpdateServicePrice(item.service_id, parseFloat(e.target.value) || 0)}
                                                                className="w-full p-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-900 outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 ml-1">Departman</label>
                                                            <select
                                                                value={item.department_id || ''}
                                                                onChange={e => handleUpdateServiceDept(item.service_id, e.target.value ? parseInt(e.target.value) : null)}
                                                                className="w-full p-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-900 outline-none"
                                                            >
                                                                <option value="">Tümü</option>
                                                                {departments.map(dept => (
                                                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 ml-1">Personel</label>
                                                            <select
                                                                value={item.staff_id || ''}
                                                                onChange={e => handleUpdateServiceStaff(item.service_id, e.target.value ? parseInt(e.target.value) : null)}
                                                                className="w-full p-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-900 outline-none"
                                                            >
                                                                <option value="">Atanmamış</option>
                                                                {staffBoards
                                                                    .filter(s => !item.department_id || s.department_id === item.department_id)
                                                                    .map(s => (
                                                                        <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                                                                    ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Toplam Süre (Dk)</label>
                                    <input
                                        type="number"
                                        value={packageForm.duration_minutes}
                                        onChange={e => setPackageForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 0 }))}
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-amber-500 text-base font-bold text-slate-900 outline-none"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Paket Ücreti (₺)</label>
                                    <input
                                        type="number"
                                        value={packageForm.price}
                                        onChange={e => setPackageForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-amber-500 text-base font-bold text-slate-900 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Açıklama</label>
                                <textarea
                                    value={packageForm.description}
                                    onChange={e => setPackageForm(p => ({ ...p, description: e.target.value }))}
                                    rows={2}
                                    placeholder="Paket içeriği ve detaylar..."
                                    className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-amber-500 text-base font-bold text-slate-900 outline-none resize-none"
                                />
                            </div>

                            <div className="flex gap-3 mt-6 pt-4">
                                <button
                                    onClick={() => setShowPackageModal(false)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-base active:scale-95 transition-all"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleSavePackage}
                                    disabled={isSavingPackage}
                                    className="flex-1 py-4 bg-amber-600 text-white rounded-2xl font-black text-base active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {isSavingPackage ? 'Kaydediliyor...' : (packageForm.id ? 'Güncelle' : 'Kaydet')}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Finance Modals */}
            {/* Invoice Modal */}
            {showInvoiceModal && selectedAppointment && (
                <div className="fixed inset-0 z-[300] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowInvoiceModal(false)}>
                    <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-10 shadow-2xl" onClick={e => e.stopPropagation()}
                        style={{ animation: 'slideUp 0.3s ease-out' }}>
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                        <h2 className="text-2xl font-black text-slate-900 mb-2">Faturaya Dönüştür</h2>
                        <p className="text-sm text-slate-400 mb-8 font-bold uppercase tracking-widest">{selectedAppointment.customer_name} • {selectedAppointment.price} ₺</p>

                        <div className="space-y-6">
                            {/* VKN / TCKN Check */}
                            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Müşteri VKN / TCKN</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        maxLength={11}
                                        value={invoiceForm.vkn}
                                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, vkn: e.target.value }))}
                                        className="flex-1 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                                        placeholder="11122233344"
                                    />
                                    <button
                                        onClick={async () => {
                                            if (invoiceForm.vkn.length < 10) return alert('Geçerli bir VKN/TCKN girin');
                                            setCheckingVkn(true);
                                            try {
                                                const res = await api.get(`/finance/check-einvoice-user?vkn=${invoiceForm.vkn}`);
                                                setVknCheckResult({ vkn: invoiceForm.vkn, isEInvoice: res.data.data.isEInvoice });
                                                setInvoiceForm(prev => ({ ...prev, type: res.data.data.isEInvoice ? 'e-fatura' : 'e-arsiv' }));
                                            } catch (err) {
                                                alert('Sorgulama başarısız');
                                            } finally {
                                                setCheckingVkn(false);
                                            }
                                        }}
                                        disabled={checkingVkn}
                                        className="px-6 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {checkingVkn ? '...' : 'Sorgula'}
                                    </button>
                                </div>
                                {vknCheckResult && (
                                    <p className={`mt-3 text-[10px] font-black uppercase tracking-tighter px-3 py-1.5 rounded-lg inline-block ${vknCheckResult.isEInvoice ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {vknCheckResult.isEInvoice ? '✨ E-Fatura Mükellefi' : '📄 E-Arşiv Kullanıcısı'}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Fatura Tipi</label>
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <button
                                        onClick={() => setInvoiceForm(prev => ({ ...prev, type: 'e-arsiv' }))}
                                        className={`p-4 rounded-2xl border-2 font-bold text-xs transition-all ${invoiceForm.type === 'e-arsiv' ? 'bg-slate-50 border-indigo-500 text-indigo-600' : 'bg-transparent border-slate-100 text-slate-400'}`}
                                    >
                                        E-Arşiv / Fiş
                                    </button>
                                    <button
                                        onClick={() => setInvoiceForm(prev => ({ ...prev, type: 'e-fatura' }))}
                                        disabled={vknCheckResult && !vknCheckResult.isEInvoice}
                                        className={`p-4 rounded-2xl border-2 font-bold text-xs transition-all ${invoiceForm.type === 'e-fatura' ? 'bg-slate-50 border-indigo-500 text-indigo-600' : 'bg-transparent border-slate-100 text-slate-400'} ${vknCheckResult && !vknCheckResult.isEInvoice ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    >
                                        E-Fatura
                                    </button>
                                </div>

                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Ödeme Şekli Seçin</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleCreateInvoice({
                                            appointment_id: selectedAppointment.id,
                                            customer_name: selectedAppointment.customer_name,
                                            customer_tax_number: invoiceForm.vkn,
                                            amount: selectedAppointment.price,
                                            payment_method: 'nakit',
                                            type: invoiceForm.type
                                        })}
                                        className="p-8 bg-emerald-50 rounded-[2.5rem] border-2 border-emerald-100 flex flex-col items-center gap-3 hover:bg-emerald-100 transition-all font-black text-emerald-600"
                                    >
                                        <span className="text-4xl italic">Nakit</span>
                                        <span className="text-[10px] uppercase tracking-widest">💰 Kasaya Giriş</span>
                                    </button>
                                    <button
                                        onClick={() => handleCreateInvoice({
                                            appointment_id: selectedAppointment.id,
                                            customer_name: selectedAppointment.customer_name,
                                            customer_tax_number: invoiceForm.vkn,
                                            amount: selectedAppointment.price,
                                            payment_method: 'kart',
                                            type: invoiceForm.type
                                        })}
                                        className="p-8 bg-indigo-50 rounded-[2.5rem] border-2 border-indigo-100 flex flex-col items-center gap-3 hover:bg-indigo-100 transition-all font-black text-indigo-600"
                                    >
                                        <span className="text-4xl italic">Kart</span>
                                        <span className="text-[10px] uppercase tracking-widest">💳 POS Tahsilat</span>
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setShowInvoiceModal(false);
                                    setVknCheckResult(null);
                                    setInvoiceForm({ vkn: '', type: 'e-arsiv' });
                                }}
                                className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black text-base uppercase tracking-widest"
                            >
                                Vazgeç
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Purchase Modal */}
            {showPurchaseModal && (
                <div className="fixed inset-0 z-[300] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowPurchaseModal(false)}>
                    <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-10 shadow-2xl" onClick={e => e.stopPropagation()}
                        style={{ animation: 'slideUp 0.3s ease-out' }}>
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                        <h2 className="text-2xl font-black text-slate-900 mb-6">Yeni Alış Girişi</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tedarikçi Adı</label>
                                <input type="text" id="p_supplier" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" placeholder="Örn: X Kozmetik Ltd." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Fatura No</label>
                                    <input type="text" id="p_no" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" placeholder="ALI20240001" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tutar (₺)</label>
                                    <input type="number" id="p_amount" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" placeholder="0.00" />
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    const supplier = (document.getElementById('p_supplier') as HTMLInputElement).value;
                                    const amount = (document.getElementById('p_amount') as HTMLInputElement).value;
                                    const no = (document.getElementById('p_no') as HTMLInputElement).value;
                                    if (supplier && amount) {
                                        handleCreatePurchase({ supplier_name: supplier, amount: Number(amount), invoice_no: no });
                                    }
                                }}
                                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-base uppercase tracking-widest shadow-xl shadow-slate-200 mt-4"
                            >
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cash Modal */}
            {showCashModal && (
                <div className="fixed inset-0 z-[300] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowCashModal(false)}>
                    <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-10 shadow-2xl" onClick={e => e.stopPropagation()}
                        style={{ animation: 'slideUp 0.3s ease-out' }}>
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                        <h2 className="text-2xl font-black text-slate-900 mb-6">Kasa İşlemi</h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Kategori</label>
                                    <select id="c_cat" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold">
                                        <option value="general_expense">Genel Gider</option>
                                        <option value="payment">Ödeme</option>
                                        <option value="salary">Maaş/Prim</option>
                                        <option value="other">Diğer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tutar (₺)</label>
                                    <input type="number" id="c_amount" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Açıklama</label>
                                <textarea id="c_desc" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" rows={2} placeholder="İşlem detayı..." />
                            </div>
                            <button
                                onClick={() => {
                                    const cat = (document.getElementById('c_cat') as HTMLSelectElement).value;
                                    const amount = (document.getElementById('c_amount') as HTMLInputElement).value;
                                    const desc = (document.getElementById('c_desc') as HTMLTextAreaElement).value;
                                    if (amount) {
                                        handleCreateCashTransaction({ type: 'expense', category: cat, amount: Number(amount), description: desc, payment_method: 'nakit' });
                                    }
                                }}
                                className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-black text-base uppercase tracking-widest shadow-xl shadow-red-100 mt-4"
                            >
                                Gider Olarak İşle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
