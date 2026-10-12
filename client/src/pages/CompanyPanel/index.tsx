/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { Button, EmptyState, FullScreenLoader } from '../../components/ui';
import {
    menuItems,
    normalizePhone,
    formatPhoneWithSpaces,
    emptyServiceForm,
    parseDurationOptions,
} from './useCompanyPanel';
import type { TabKey, Department, StaffBoard, CurrentAccount } from './useCompanyPanel';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
const HomeTab = lazy(() => import('./HomeTab').then(m => ({ default: m.HomeTab })));
const BookingQRTab = lazy(() => import('./HomeTab').then(m => ({ default: m.BookingQRTab })));
const AdminQRTab = lazy(() => import('./HomeTab').then(m => ({ default: m.AdminQRTab })));
const ProfileTab = lazy(() => import('./ProfileTab').then(m => ({ default: m.ProfileTab })));
const IntegrationTab = lazy(() => import('./ProfileTab').then(m => ({ default: m.IntegrationTab })));
const DeptTab = lazy(() => import('./StaffTab').then(m => ({ default: m.DeptTab })));
const StaffTab = lazy(() => import('./StaffTab').then(m => ({ default: m.StaffTab })));
const ServicesTab = lazy(() => import('./ServicesTab').then(m => ({ default: m.ServicesTab })));
const SchedulingTab = lazy(() => import('./SchedulingTab').then(m => ({ default: m.SchedulingTab })));
const FinanceTab = lazy(() => import('./FinanceTab').then(m => ({ default: m.FinanceTab })));
const CRMTab = lazy(() => import('./CRMTab').then(m => ({ default: m.CRMTab })));
const ReportsTab = lazy(() => import('./CRMTab').then(m => ({ default: m.ReportsTab })));

const DeptModal = lazy(() => import('./StaffTab').then(m => ({ default: m.DeptModal })));
const StaffModal = lazy(() => import('./StaffTab').then(m => ({ default: m.StaffModal })));
const ServiceModal = lazy(() => import('./ServicesTab').then(m => ({ default: m.ServiceModal })));
const TemplatesModal = lazy(() => import('./ServicesTab').then(m => ({ default: m.TemplatesModal })));
const InvoiceModal = lazy(() => import('./FinanceTab').then(m => ({ default: m.InvoiceModal })));
const PurchaseModal = lazy(() => import('./FinanceTab').then(m => ({ default: m.PurchaseModal })));
const PurchaseDetailModal = lazy(() => import('./FinanceTab').then(m => ({ default: m.PurchaseDetailModal })));
const CashModal = lazy(() => import('./FinanceTab').then(m => ({ default: m.CashModal })));
const CurrentAccountModal = lazy(() => import('./FinanceTab').then(m => ({ default: m.CurrentAccountModal })));
const CustomerDetailModal = lazy(() => import('./CRMTab').then(m => ({ default: m.CustomerDetailModal })));

// Ctx type for tab components
export type Ctx = {
    [key: string]: any;
};

export default function CompanyPanel() {
    void 0;

    // === STATE & HANDLERS ===
const [company, setCompany] = useState<any>(null);
const [departments, setDepartments] = useState<Department[]>([]);
const [staffBoards, setStaffBoards] = useState<StaffBoard[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
// UI states
const [activeTab, setActiveTab] = useState<TabKey>('home');
const [sidebarOpen, setSidebarOpen] = useState(false);
const [showDeptModal, setShowDeptModal] = useState(false);
const [showStaffModal, setShowStaffModal] = useState(false);
const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
const [deptName, setDeptName] = useState('');
const [staffForm, setStaffForm] = useState({
    first_name: '',
    last_name: '',
    gender: 'erkek',
    department_id: '',
    photo: '' as string | null,
    quantity: '' as string | number,
    unit: '',
    email: '',
    phone: '',
    password: '',
    commission_rate: '' as string | number
});
const [copiedField, setCopiedField] = useState('');
const [isCreating, setIsCreating] = useState(false);

// Services states
const [companyServices, setCompanyServices] = useState<any[]>([]);
const [showServiceModal, setShowServiceModal] = useState(false);
const [showTemplatesModal, setShowTemplatesModal] = useState(false);
const [serviceForm, setServiceForm] = useState(emptyServiceForm);
const [isSavingService, setIsSavingService] = useState(false);

// Reports states
const [reportData, setReportData] = useState<any>(null);
const [reportPeriod, setReportPeriod] = useState<'today' | 'week' | 'month' | 'year'>('today');
const [loadingReport, setLoadingReport] = useState(false);

// Finance states
const [activeFinanceTab, setActiveFinanceTab] = useState<'sales' | 'purchases' | 'cash' | 'contacts' | 'balance'>('sales');
const [financeDateRange, setFinanceDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
});
const [financeSearch, setFinanceSearch] = useState('');
const [completedAppointments, setCompletedAppointments] = useState<any[]>([]);
const [loadingFinance, setLoadingFinance] = useState(false);
const [showInvoiceModal, setShowInvoiceModal] = useState(false);
const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
const [cashTransactions, setCashTransactions] = useState<any[]>([]);
const [openingBalance, setOpeningBalance] = useState(0);
const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([]);
const [customers, setCustomers] = useState<any[]>([]);
const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
const [loadingCustomers, setLoadingCustomers] = useState(false);
const [customerSearch, setCustomerSearch] = useState('');
const [invoices, setInvoices] = useState<any[]>([]);
const [contactsBalance, setContactsBalance] = useState<any[]>([]);
const [salesSubTab, setSalesSubTab] = useState<'pending' | 'invoiced'>('pending');
const [showPurchaseModal, setShowPurchaseModal] = useState(false);
const [showCashModal, setShowCashModal] = useState(false);
const [vknCheckResult, setVknCheckResult] = useState<{ vkn: string; isEInvoice: boolean } | null>(null);
const [expandedMenus, setExpandedMenus] = useState<string[]>(['finance']);
const [purchaseSearch, setPurchaseSearch] = useState('');

const [checkingVkn, setCheckingVkn] = useState(false);
const [purchaseForm, setPurchaseForm] = useState({
    supplier_name: '',
    current_account_id: '' as string | number,
    invoice_no: '',
    invoice_date: new Date().toISOString().split('T')[0],
    description: '',
    is_closed: true,
    items: [] as any[]
});
const [currentAccounts, setCurrentAccounts] = useState<CurrentAccount[]>([]);
const [showCurrentAccountModal, setShowCurrentAccountModal] = useState(false);
const [currentAccountForm, setCurrentAccountForm] = useState<CurrentAccount>({
    company_id: 0,
    code: '',
    name: '',
    title: '',
    tax_office: '',
    tax_number: '',
    type: 'ALL',
    phone: '',
    email: '',
    website: '',
    address_line: '',
    city: '',
    district: '',
    country: 'Türkiye'
});
const [invoiceForm, setInvoiceForm] = useState({
    vkn: '',
    tax_office: '',
    vat_rate: 20,
    discount_rate: 0,
    price: 0,
    type: 'e-arsiv',
    customer_name: '',
    customer_phone: '',
    customer_id: null as number | null,
    current_account_id: null as number | null
});
const [showPurchaseDetailModal, setShowPurchaseDetailModal] = useState(false);
const [selectedPurchaseInvoice, setSelectedPurchaseInvoice] = useState<any>(null);
const [reportError, setReportError] = useState('');

// Turkey Geo API State
const [geoProvinces, setGeoProvinces] = useState<any[]>([]);
const [geoDistricts, setGeoDistricts] = useState<any[]>([]);
const [geoNeighborhoods, setGeoNeighborhoods] = useState<any[]>([]);
const [loadingGeo, setLoadingGeo] = useState({ provinces: false, districts: false, neighborhoods: false });
const [isLicenseExpired, setIsLicenseExpired] = useState(false);
const navigate = useNavigate();
const [searchParams] = useSearchParams();
const authUser = useAuthStore(s => s.user);
const isSuperAdmin = authUser?.role === 'super_admin';
const companyId = isSuperAdmin ? Number(searchParams.get('company')) || undefined : authUser?.company_id;
const initialTabRef = useRef(searchParams.get('tab') as TabKey | null);

const loadCompany = async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
        const res = await api.get(`/companies/${companyId}`);
        const comp = res.data.data;
        setCompany(comp);
        setIsLicenseExpired(!!comp.is_license_expired);
        if (!comp.is_license_expired) {
            fetchData(comp.id);
            if (comp.city) fetchDistricts(comp.city);
        }
    } catch (err: any) {
        setError(err.response?.data?.error || 'Firma bilgileri yüklenemedi');
    } finally {
        setLoading(false);
    }
};

useEffect(() => {
    loadCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [companyId]);

useEffect(() => {
    if (!company || !initialTabRef.current) return;
    switchTab(initialTabRef.current);
    initialTabRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [company]);

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
                    params: {
                        startDate: financeDateRange.start,
                        endDate: financeDateRange.end,
                        search: financeSearch
                    }
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
                params: { startDate: financeDateRange.start, endDate: financeDateRange.end, search: financeSearch }
            });
            if (res.data.success) {
                const cashData = res.data.data;
                if (cashData && typeof cashData === 'object' && 'transactions' in cashData) {
                    setCashTransactions(cashData.transactions || []);
                    setOpeningBalance(Number(cashData.openingBalance) || 0);
                } else {
                    setCashTransactions(Array.isArray(cashData) ? cashData : []);
                    setOpeningBalance(0);
                }
            }
        } else if (activeFinanceTab === 'purchases') {
            const res = await api.get(`/finance/purchase-invoices/company/${targetCid}`, {
                params: { startDate: financeDateRange.start, endDate: financeDateRange.end, search: financeSearch }
            });
            if (res.data.success) {
                setPurchaseInvoices(res.data.data);
            }
        } else if (activeFinanceTab === 'contacts') {
            const res = await api.get('/finance/current-accounts', {
                params: { search: financeSearch }
            });
            if (res.data.success) {
                setCurrentAccounts(res.data.data);
            }
        } else if (activeFinanceTab === 'balance') {
            try {
                const res = await api.get('/finance/reports/current-accounts-balance', {
                    params: { 
                        startDate: financeDateRange.start, 
                        endDate: financeDateRange.end, 
                        search: financeSearch 
                    }
                });
                if (res.data.success) {
                    setContactsBalance(res.data.data);
                }
            } catch (reportErr) {
                // Fallback - Eğer rapor endpointi hata verirse düz listeyi dene
                try {
                    const res = await api.get('/finance/current-accounts', {
                        params: financeSearch ? { search: financeSearch } : {}
                    });
                    if (res.data.success) {
                        setContactsBalance(res.data.data.map((c: any) => ({
                            ...c,
                            carried_balance: 0,
                            period_debit: c.balance > 0 ? c.balance : 0,
                            period_credit: c.balance < 0 ? Math.abs(c.balance) : 0
                        })));
                    }
                } catch (innerErr) {
                    console.error('Cari listesi çekilemedi:', innerErr);
                }
            }
        }
    } catch (err) {
        console.error('Finans verisi yüklenemedi:', err);
    } finally {
        setLoadingFinance(false);
    }
};

const fetchCustomersData = async (cid?: number) => {
    const targetCid = cid || company?.id;
    if (!targetCid) return;
    setLoadingCustomers(true);
    try {
        const res = await api.get(`/appointments/company/${targetCid}/customers-crm`, {
            params: { search: customerSearch }
        });
        if (res.data.success) {
            setCustomers(res.data.data || []);
        }
    } catch (err) {
        console.error('Müşteri verisi yüklenemedi:', err);
    } finally {
        setLoadingCustomers(false);
    }
};

useEffect(() => {
    const fetchProvinces = async () => {
        const cached = localStorage.getItem('geo_provinces');
        if (cached) {
            setGeoProvinces(JSON.parse(cached));
            return;
        }

        setLoadingGeo(p => ({ ...p, provinces: true }));
        try {
            const res = await api.get('/address/provinces');
            if (res.data.success) {
                const sorted = res.data.data.sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr-TR'));
                setGeoProvinces(sorted);
                localStorage.setItem('geo_provinces', JSON.stringify(sorted));
            }
        } catch (err) {
            console.error('İller yüklenemedi:', err);
        } finally {
            setLoadingGeo(p => ({ ...p, provinces: false }));
        }
    };
    fetchProvinces();
}, []);

const fetchDistricts = async (provinceName: string) => {
    const province = geoProvinces.find(p => p.name === provinceName);
    if (!province) return;

    const cacheKey = `geo_districts_${province.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        setGeoDistricts(JSON.parse(cached));
        return;
    }

    setLoadingGeo(p => ({ ...p, districts: true }));
    setGeoDistricts([]);
    setGeoNeighborhoods([]);
    try {
        const res = await api.get(`/address/provinces/${province.id}/districts`);
        if (res.data.success) {
            const sorted = res.data.data.sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr-TR'));
            setGeoDistricts(sorted);
            localStorage.setItem(cacheKey, JSON.stringify(sorted));
        }
    } catch (err) {
        console.error('İlçeler yüklenemedi:', err);
    } finally {
        setLoadingGeo(p => ({ ...p, districts: false }));
    }
};

const fetchNeighborhoods = async (provinceName: string, districtId: number) => {
    const province = geoProvinces.find(p => p.name === provinceName);
    if (!province) return;

    const cacheKey = `geo_neighborhoods_${province.id}_${districtId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        setGeoNeighborhoods(JSON.parse(cached));
        return;
    }

    setLoadingGeo(p => ({ ...p, neighborhoods: true }));
    setGeoNeighborhoods([]);
    try {
        const res = await api.get(`/address/provinces/${province.id}/districts/${districtId}/neighborhoods`);
        if (res.data.success) {
            const sorted = res.data.data.sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr-TR'));
            setGeoNeighborhoods(sorted);
            localStorage.setItem(cacheKey, JSON.stringify(sorted));
        }
    } catch (err) {
        console.error('Mahalleler yüklenemedi:', err);
    } finally {
        setLoadingGeo(p => ({ ...p, neighborhoods: false }));
    }
};

const openCurrentAccountModal = (c?: any) => {
    if (c) {
        setCurrentAccountForm(c);
        if (c.city) fetchDistricts(c.city);
        // Neighborhood fetching is tricky without district ID but if we have the district name we can try to find it
        // For now, fetching districts is most important. 
    } else {
        setCurrentAccountForm({
            company_id: company.id,
            code: `CARI-${Date.now().toString().slice(-6)}`,
            name: '',
            title: '',
            tax_office: '',
            tax_number: '',
            type: 'ALL',
            phone: '',
            email: '',
            address_line: '',
            city: '',
            district: '',
            country: 'Türkiye'
        });
        setGeoDistricts([]);
        setGeoNeighborhoods([]);
    }
    setShowCurrentAccountModal(true);
};

const handleCreateInvoice = async (payment_method: 'nakit' | 'kart') => {
    if (!selectedAppointment) return;
    try {
        const data = {
            ...invoiceForm,
            payment_method,
            appointment_id: selectedAppointment.id,
            amount: invoiceForm.price || selectedAppointment.price,
            customer_name: invoiceForm.customer_name || selectedAppointment.customer_name,
            customer_tax_number: invoiceForm.vkn,
            customer_tax_office: invoiceForm.tax_office,
            customer_id: invoiceForm.customer_id || selectedAppointment.customer_id
        };
        const res = await api.post('/finance/invoices', data);
        if (res.data.success) {
            setShowInvoiceModal(false);
            setInvoiceForm({
                vkn: '',
                tax_office: '',
                vat_rate: 20,
                discount_rate: 0,
                price: 0,
                type: 'e-arsiv',
                customer_name: '',
                customer_phone: '',
                customer_id: null,
                current_account_id: null
            });
            fetchFinanceData();
        }
    } catch (err) {
        console.error('Fatura oluşturulamadı:', err);
    }
};

const handleCreatePurchase = async (data: any) => {
    try {
        // Backend'in tanımadığı alanları (product_id vb.) faturadan ayıklıyoruz
        const backendData = {
            ...data,
            items: data.items.map((item: any) => ({
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                vat_rate: item.vat_rate,
                discount_rate: item.discount_rate,
                vat_amount: item.vat_amount,
                discount_amount: item.discount_amount,
                total_amount: item.total_amount
            }))
        };

        const res = await api.post('/finance/purchase-invoices', backendData);
        if (res.data.success) {
            setShowPurchaseModal(false);
            setPurchaseForm({
                supplier_name: '',
                invoice_no: '',
                current_account_id: '',
                invoice_date: new Date().toISOString().split('T')[0],
                description: '',
                is_closed: true,
                items: [{ product_name: '', quantity: 1, unit_price: 0, vat_rate: 20, discount_rate: 0 }]
            });
            fetchFinanceData();
        }
    } catch (err: any) {
        const errorMsg = err.response?.data?.error || err.message || 'Alış faturası oluşturulamadı';
        alert('Hata: ' + errorMsg);
    }
};

const handleCreateCurrentAccount = async (data: Partial<CurrentAccount>) => {
    try {
        const res = await api.post('/finance/current-accounts', data);
        if (res.data.success) {
            setShowCurrentAccountModal(false);
            alert('🚀 Cari Kart başarıyla kaydedildi!');
            fetchFinanceData();
        } else {
            alert('Hata: ' + (res.data.error || 'Bilinmeyen bir hata oluştu'));
        }
    } catch (err: any) {
        alert(err.response?.data?.error || 'Cari oluşturulamadı. Sunucu hatası oluşmuş olabilir.');
    }
};

const handleUpdateCurrentAccount = async (id: number, data: Partial<CurrentAccount>) => {
    try {
        const res = await api.put(`/finance/current-accounts/${id}`, data);
        if (res.data.success) {
            setShowCurrentAccountModal(false);
            fetchFinanceData();
        }
    } catch (err: any) {
        alert(err.response?.data?.error || 'Cari güncellenemedi');
    }
};

const handleDeleteCurrentAccount = async (id: number) => {
    if (!confirm('Bu cari hesabı silmek istediğinize emin misiniz?')) return;
    try {
        await api.delete(`/finance/current-accounts/${id}`);
        fetchFinanceData();
    } catch (err: any) {
        alert(err.response?.data?.error || 'Silme hatası');
    }
};

const handleViewPurchaseDetail = async (id: number) => {
    try {
        setLoadingFinance(true);
        const res = await api.get(`/finance/purchase-invoices/${id}`);
        if (res.data.success) {
            setSelectedPurchaseInvoice(res.data.data);
            setShowPurchaseDetailModal(true);
        }
    } catch (err) {
        alert('Fatura detayları yüklenemedi');
    } finally {
        setLoadingFinance(false);
    }
};

const handleDeleteInvoice = async (id: number) => {
    if (!confirm('Bu faturayı silmek istediğinize emin misiniz? Randevu durumu tekrar tamamlanmış haline dönecektir.')) return;
    try {
        setLoading(true);
        await api.delete(`/finance/invoices/${id}`);
        fetchFinanceData();
    } catch (err: any) {
        alert(err.response?.data?.error || 'Silme hatası');
    } finally {
        setLoading(false);
    }
};

const handleDeletePurchaseInvoice = async (id: number) => {
    if (!confirm('Bu alış faturası girişini silmek istediğinize emin misiniz?')) return;
    try {
        setLoadingFinance(true);
        await api.delete(`/finance/purchase-invoices/${id}`);
        setShowPurchaseDetailModal(false);
        setSelectedPurchaseInvoice(null);
        fetchFinanceData();
    } catch (err: any) {
        alert(err.response?.data?.error || 'Silme hatası');
    } finally {
        setLoadingFinance(false);
    }
};

const handleDeleteCashTransaction = async (id: number) => {
    if (!confirm('Bu kasa işlemini silmek istediğinize emin misiniz?')) return;
    try {
        setLoadingFinance(true);
        await api.delete(`/finance/transactions/${id}`);
        fetchFinanceData();
    } catch (err: any) {
        alert(err.response?.data?.error || 'Silme hatası');
    } finally {
        setLoadingFinance(false);
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

const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const fetchReports = async (period: string) => {
    if (!company) return;
    setLoadingReport(true);
    setReportError('');
    try {
        const res = await api.get('/reports/company-detailed', { 
            params: { 
                period, 
                local_date: getLocalDateString() 
            } 
        });
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
    if ((activeTab === 'finance' || activeTab.startsWith('finance-')) && company) fetchFinanceData(company.id);
}, [activeTab, reportPeriod, company, activeFinanceTab, financeDateRange, financeSearch]);

const fetchData = async (companyId: number) => {
    try {
        const [deptRes, staffRes, svcRes] = await Promise.all([
            api.get('/departments', { params: { company_id: companyId } }),
            api.get(`/companies/${companyId}/staff-boards`),
            api.get('/services', { params: { company_id: companyId } })
        ]);
        setDepartments(deptRes.data?.data || deptRes.data || []);
        setStaffBoards(staffRes.data?.data || staffRes.data || []);
        setCompanyServices(svcRes.data?.data || svcRes.data || []);
    } catch (e) {
        console.error('Data fetch error', e);
    }
};

const handleAddDepartment = async () => {
    if (!company) {
        alert('Firma bilgileri bulunamadı.');
        return;
    }
    if (!deptName.trim()) {
        alert('Lütfen departman adını giriniz.');
        return;
    }
    try {
        await api.post('/departments', { company_id: company.id, name: deptName.trim() });
        setDeptName('');
        setShowDeptModal(false);
        fetchData(company.id);
    } catch (err: any) {
        console.error('Department Create Error:', err);
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
    if (!company) {
        alert('Firma bilgileri bulunamadı. Lütfen oturumu yenileyin.');
        return;
    }

    // Validation for required fields
    if (!staffForm.first_name.trim()) {
        alert('Lütfen personelin adını giriniz.');
        return;
    }
    if (!staffForm.last_name.trim()) {
        alert('Lütfen personelin soyadını giriniz.');
        return;
    }

    setIsCreating(true);
    try {
        const data = {
            first_name: staffForm.first_name.trim(),
            last_name: staffForm.last_name.trim(),
            gender: staffForm.gender,
            department_id: staffForm.department_id || null,
            photo: staffForm.photo,
            quantity: staffForm.quantity ? Number(staffForm.quantity) : null,
            unit: staffForm.unit || null,
            commission_rate: (() => {
                const rate = staffForm.commission_rate ? Number(staffForm.commission_rate) : null;
                if (rate !== null && (rate < 0 || rate > 100)) {
                    throw new Error('Prim oranı 0 ile 100 arasında olmalıdır.');
                }
                return rate;
            })(),
            email: staffForm.email.trim() || undefined,
            phone: staffForm.phone.trim() || undefined,
            password: staffForm.password || undefined
        };

        if (selectedStaffId) {
            await api.put(`/companies/${company.id}/staff/${selectedStaffId}`, data);
        } else {
            console.log('--- Client-side Staff Creation Request ---');
            console.log('Company ID:', company.id);
            console.log('Body:', data);
            await api.post(`/companies/${company.id}/create-staff-board`, data);
        }

        setStaffForm({ first_name: '', last_name: '', gender: 'erkek', department_id: '', photo: null, quantity: '', unit: '', email: '', phone: '', password: '', commission_rate: '' });
        setSelectedStaffId(null);
        setShowStaffModal(false);
        fetchData(company.id);
    } catch (err: any) {
        console.error('Staff Action Error:', err);
        const msg = err.response?.data?.error || err.message || 'Personel işlemi gerçekleştirilemedi';
        alert('Hata: ' + msg);
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

const handlePhotoSelection = async (isForNewStaff: boolean, staffId?: number, isForService: boolean = false) => {
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
                } else if (isForService) {
                    setServiceForm(p => ({ ...p, photo: base64String }));
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
                        } else if (isForService) {
                            setServiceForm(p => ({ ...p, photo: compressedBase64 }));
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
    if (!company) {
        alert('Firma bilgileri bulunamadı.');
        return;
    }
    if (!serviceForm.name.trim()) {
        alert('Lütfen hizmet adını giriniz.');
        return;
    }

    setIsSavingService(true);
    const submitData = {
        company_id: company.id,
        name: serviceForm.name.trim(),
        description: serviceForm.description.trim(),
        duration_minutes: Number(serviceForm.duration_minutes),
        price: Number(serviceForm.price),
        department_id: serviceForm.department_id,
        photo: serviceForm.photo,
        quantity: serviceForm.quantity ? Number(serviceForm.quantity) : null,
        unit: serviceForm.unit || null,
        booking_mode: serviceForm.booking_mode,
        duration_options: serviceForm.booking_mode === 'resource' ? parseDurationOptions(serviceForm.duration_options) : null,
        resource_ids: serviceForm.booking_mode === 'resource' ? serviceForm.resource_ids : [],
    };

    try {
        if (serviceForm.id) {
            // Güncelle
            await api.put(`/services/${serviceForm.id}`, submitData);
        } else {
            // Yeni ekle
            await api.post('/services', submitData);
        }
        setServiceForm(emptyServiceForm);
        setShowServiceModal(false);
        fetchData(company.id);
    } catch (err: any) {
        console.error('Hizmet kaydetme hatası:', err.response?.data || err);
        const errorMsg = err.response?.data?.error || 'Hizmet kaydedilemedi';
        const details = err.response?.data?.details ? '\n' + JSON.stringify(err.response.data.details) : '';
        alert(errorMsg + details);
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

const handleAddFromTemplate = async (template: any) => {
    if (!company) return;
    setIsSavingService(true);
    try {
        await api.post('/services', {
            name: template.name,
            duration_minutes: template.duration_minutes || 30,
            price: Number(template.price) || 0,
            booking_mode: template.booking_mode || 'staff',
            duration_options: template.duration_options || null,
        });
        fetchData(company.id);
    } catch (err: any) {
        alert('Hizmet eklenirken hata: ' + (err.response?.data?.error || err.message));
    } finally {
        setIsSavingService(false);
    }
};

const backToApp = () => navigate(isSuperAdmin ? (companyId ? `/companies/${companyId}` : '/companies') : '/isletme?tab=more');

const copyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
};

const bookingUrl = company ? `${window.location.origin}/#/book/${company.id}?ref=qr` : '';
const qrApiUrl = (data: string, size = 200) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&color=1e1b4b&bgcolor=ffffff`;

const switchTab = (tab: TabKey) => {
    let targetTab = tab;
    
    // Handle parent menu selection
    if (tab === 'finance') {
        targetTab = 'finance-sales-list';
    }
    
    setActiveTab(targetTab);
    
    // Trigger generic data fetch if company is loaded
    if (company) {
        if (targetTab === 'home') fetchData(company.id);
        else if (targetTab === 'reports') fetchReports(reportPeriod);
        else if (targetTab.startsWith('finance')) {
            let fTab: 'sales' | 'purchases' | 'cash' | 'contacts' | 'balance' = 'sales';
            if (targetTab.includes('purchases')) fTab = 'purchases';
            else if (targetTab.includes('cash')) fTab = 'cash';
            else if (targetTab.includes('balance')) fTab = 'balance';
            else if (targetTab === 'finance-contacts') fTab = 'contacts';
            
            setActiveFinanceTab(fTab);
            setExpandedMenus(prev => prev.includes('finance') ? prev : [...prev, 'finance']);
            fetchFinanceData(company.id);
        }
        else if (targetTab.startsWith('customers')) {
            fetchCustomersData(company.id);
        }
        // For other tabs (staff, dept, services), fetchData(company.id) covers all of them
        else if (['staff', 'dept', 'services'].includes(targetTab)) {
            fetchData(company.id);
        }
    }
    
    setSidebarOpen(false);
};


const handleUpdateCompany = async () => {
    if (!company) return;
    setLoading(true);
    try {
        const data: any = { ...company };

        // Remove internal/read-only or UI-only fields that might block or fail validation
        const fieldsToOmit = [
            'province_id', 'province_name', 'district_id', 'district_name',
            'neighborhood_id', 'neighborhood_name', 'created_at', 'updated_at',
            'is_license_expired', 'token', 'id'
        ];

        fieldsToOmit.forEach(f => {
            if (f in data) delete data[f];
        });

        // Ensure empty strings are sent as null for unique columns (board_key, admin_key etc)
        ['board_key', 'admin_key', 'email', 'phone', 'tax_number'].forEach(key => {
            if (data[key] === '') data[key] = null;
        });

        console.log('Updating company with data:', data);

        const response = await api.put(`/companies/${company.id}`, data);
        if (response.data.success && response.data.data) {
            setCompany(response.data.data);
            alert('Firma bilgileri başarıyla güncellendi.');
        } else {
            let errorMsg = response.data.error || 'Güncelleme başarısız oldu.';
            if (response.data.details && Array.isArray(response.data.details)) {
                const details = response.data.details.map((d: any) => d.message).join('\n- ');
                errorMsg += `\n\nDetaylar:\n- ${details}`;
            }
            alert(errorMsg);
        }
    } catch (err: any) {
        console.error('Update Company Error:', err);
        const msg = err.response?.data?.error || err.message || 'Bir hata oluştu.';
        const details = err.response?.data?.details;
        let fullMsg = msg;
        if (details && Array.isArray(details)) {
            fullMsg += '\n\n' + details.map((d: any) => d.message).join('\n');
        }
        alert(fullMsg);
    } finally {
        setLoading(false);
    }
};

const generateBoardKey = () => {
    const newKey = Math.random().toString(36).substring(2, 10).toUpperCase();
    setCompany((prev: any) => prev ? ({ ...prev, board_key: newKey }) : null);
    alert(`Yeni Salon Board Anahtarınız oluşturuldu: ${newKey}\n\nDeğişiklikleri Kaydet butonuna basarak kaydedebilirsiniz.`);
};

    const ctx: Ctx = {
        company,
        departments,
        staffBoards,
        loading,
        error,
        activeTab,
        sidebarOpen,
        showDeptModal,
        showStaffModal,
        selectedStaffId,
        deptName,
        staffForm,
        copiedField,
        isCreating,
        companyServices,
        showServiceModal,
        showTemplatesModal,
        serviceForm,
        isSavingService,
        reportData,
        reportPeriod,
        loadingReport,
        activeFinanceTab,
        financeDateRange,
        financeSearch,
        completedAppointments,
        loadingFinance,
        showInvoiceModal,
        selectedAppointment,
        cashTransactions,
        openingBalance,
        purchaseInvoices,
        customers,
        selectedCustomer,
        loadingCustomers,
        customerSearch,
        invoices,
        contactsBalance,
        salesSubTab,
        showPurchaseModal,
        showCashModal,
        vknCheckResult,
        expandedMenus,
        purchaseSearch,
        checkingVkn,
        purchaseForm,
        currentAccounts,
        showCurrentAccountModal,
        currentAccountForm,
        invoiceForm,
        showPurchaseDetailModal,
        selectedPurchaseInvoice,
        reportError,
        geoProvinces,
        geoDistricts,
        geoNeighborhoods,
        loadingGeo,
        isLicenseExpired,
        handleUpdateCompany,
        fetchFinanceData,
        fetchCustomersData,
        fetchDistricts,
        fetchNeighborhoods,
        handleCreateInvoice,
        handleCreatePurchase,
        handleCreateCurrentAccount,
        handleUpdateCurrentAccount,
        handleDeleteCurrentAccount,
        handleViewPurchaseDetail,
        handleDeleteInvoice,
        handleDeletePurchaseInvoice,
        handleDeleteCashTransaction,
        handleCreateCashTransaction,
        getLocalDateString,
        fetchReports,
        fetchData,
        handleAddDepartment,
        handleDeleteDepartment,
        handleCreateStaffBoard,
        handleDeleteStaff,
        handleUpdateStaffPhoto,
        handlePhotoSelection,
        handleSaveService,
        handleDeleteService,
        handleAddFromTemplate,
        generateBoardKey,
        openCurrentAccountModal,
        switchTab,
        copyText,
        bookingUrl,
        qrApiUrl,
        formatPhoneWithSpaces,
        normalizePhone,
        api,
        menuItems,
        setCompany,
        setDepartments,
        setStaffBoards,
        setLoading,
        setError,
        setActiveTab,
        setSidebarOpen,
        setShowDeptModal,
        setShowStaffModal,
        setSelectedStaffId,
        setDeptName,
        setStaffForm,
        setCopiedField,
        setIsCreating,
        setCompanyServices,
        setShowServiceModal,
        setShowTemplatesModal,
        setServiceForm,
        setIsSavingService,
        setReportData,
        setReportPeriod,
        setLoadingReport,
        setActiveFinanceTab,
        setFinanceDateRange,
        setFinanceSearch,
        setCompletedAppointments,
        setLoadingFinance,
        setShowInvoiceModal,
        setSelectedAppointment,
        setCashTransactions,
        setOpeningBalance,
        setPurchaseInvoices,
        setCustomers,
        setSelectedCustomer,
        setLoadingCustomers,
        setCustomerSearch,
        setInvoices,
        setContactsBalance,
        setSalesSubTab,
        setShowPurchaseModal,
        setShowCashModal,
        setVknCheckResult,
        setExpandedMenus,
        setPurchaseSearch,
        setCheckingVkn,
        setPurchaseForm,
        setCurrentAccounts,
        setShowCurrentAccountModal,
        setCurrentAccountForm,
        setInvoiceForm,
        setShowPurchaseDetailModal,
        setSelectedPurchaseInvoice,
        setReportError,
        setGeoProvinces,
        setGeoDistricts,
        setGeoNeighborhoods,
        setLoadingGeo,
        setIsLicenseExpired,
    };
    void Object.keys(ctx).length;

    if (!company) {
        if (loading || !error) return <FullScreenLoader text="Firma yükleniyor…" />;
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <EmptyState
                    icon="⚠️"
                    title="Firma bilgileri açılamadı"
                    description={error}
                    action={<Button onClick={backToApp}>İşletme paneline dön</Button>}
                />
            </div>
        );
    }

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
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {menuItems.map(item => {
                        const isExpanded = expandedMenus.includes(item.key);
                        const hasChildren = item.children && item.children.length > 0;
                        const isActive = activeTab === item.key || (item.children?.some(c => c.key === activeTab));

                        return (
                            <div key={item.key} className="space-y-1">
                                <button
                                    onClick={() => {
                                        if (hasChildren) {
                                            setExpandedMenus(prev => 
                                                prev.includes(item.key) 
                                                ? prev.filter(k => k !== item.key) 
                                                : [...prev, item.key]
                                            );
                                        } else {
                                            switchTab(item.key);
                                        }
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left font-bold text-sm transition-all ${isActive
                                        ? 'bg-white/15 text-white shadow-lg shadow-white/5'
                                        : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                                        }`}
                                >
                                    <span className="text-lg">{item.icon}</span>
                                    <span>{item.label}</span>
                                    {hasChildren && (
                                        <svg className={`ml-auto w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    )}
                                    {item.key === 'staff' && staffBoards.length > 0 && (
                                        <span className="ml-auto bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full">{staffBoards.length}</span>
                                    )}
                                    {item.key === 'dept' && departments.length > 0 && (
                                        <span className="ml-auto bg-indigo-500/20 text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full">{departments.length}</span>
                                    )}
                                </button>
                                
                                {hasChildren && isExpanded && (
                                    <div className="ml-9 space-y-1 border-l border-white/10 pl-3">
                                        {item.children?.map(child => {
                                            if (child.key.startsWith('header-')) {
                                                return (
                                                    <div key={child.key} className="px-4 pt-4 pb-1">
                                                        <span className="text-[10px] font-black text-indigo-400/50 uppercase tracking-[0.2em]">{child.label}</span>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <button
                                                    key={child.key}
                                                    onClick={() => switchTab(child.key)}
                                                    className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-left font-bold text-xs transition-all ${activeTab === child.key
                                                        ? 'bg-white/10 text-white shadow-sm'
                                                        : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                                                        }`}
                                                >
                                                    {child.icon ? <span className="text-sm">{child.icon}</span> : <span className="w-1.5 h-1.5 rounded-full bg-current opacity-30" />}
                                                    <span>{child.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={backToApp}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-indigo-200 hover:bg-white/5 transition-all font-bold text-sm"
                    >
                        <span className="text-lg" aria-hidden>←</span>
                        <span>İşletme paneline dön</span>
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
                        onClick={backToApp}
                        aria-label="İşletme paneline dön"
                        className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-black"
                    >
                        ←
                    </button>
                </div>


                    <div className="p-5 lg:p-8 max-w-6xl mx-auto">
                        <Suspense fallback={<div className="py-20 text-center"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>}>
                        {(() => {
                            switch (activeTab) {
                                case 'home': return <HomeTab ctx={ctx} />;
                                case 'profile': return <ProfileTab ctx={ctx} />;
                                case 'integration': return <IntegrationTab ctx={ctx} />;
                                case 'booking': return <BookingQRTab ctx={ctx} />;
                                case 'qr': return <AdminQRTab ctx={ctx} />;
                                case 'dept': return <DeptTab ctx={ctx} />;
                                case 'staff': return <StaffTab ctx={ctx} />;
                                case 'services': return <ServicesTab ctx={ctx} />;
                                case 'scheduling': return <SchedulingTab ctx={ctx} />;
                                case 'reports': return <ReportsTab ctx={ctx} />;
                                default:
                                    if (activeTab.startsWith('customers-')) {
                                        return <CRMTab ctx={ctx} />;
                                    }
                                    return <FinanceTab ctx={ctx} />;
                            }
                        })()}
                        </Suspense>
                    </div>
                </main>

                {/* ===== MODALS ===== */}
                <Suspense fallback={null}>
                    {showDeptModal && <DeptModal ctx={ctx} />}
                    {showStaffModal && <StaffModal ctx={ctx} />}
                    {showServiceModal && <ServiceModal ctx={ctx} />}
                    {showTemplatesModal && <TemplatesModal ctx={ctx} />}
                    {showInvoiceModal && selectedAppointment && <InvoiceModal ctx={ctx} />}
                    {showPurchaseModal && <PurchaseModal ctx={ctx} />}
                    {showCurrentAccountModal && <CurrentAccountModal ctx={ctx} />}
                    {showPurchaseDetailModal && selectedPurchaseInvoice && <PurchaseDetailModal ctx={ctx} />}
                    {showCashModal && <CashModal ctx={ctx} />}
                    {selectedCustomer && <CustomerDetailModal ctx={ctx} />}
                </Suspense>

                <style>{`
                    @keyframes slideUp {
                        from { transform: translateY(100%); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                `}</style>
            </div>
        );
}
