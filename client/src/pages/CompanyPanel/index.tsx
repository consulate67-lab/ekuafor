/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, lazy, Suspense } from 'react';
import api from '../../lib/api';
import {
    menuItems,
    templates,
    normalizePhone,
    formatPhoneWithSpaces,
} from './useCompanyPanel';
void templates;  // used in index.tsx via ctx, but TypeScript needs explicit ref
import type { TabKey, Department, StaffBoard, CurrentAccount } from './useCompanyPanel';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Capacitor, registerPlugin } from '@capacitor/core';
import InventoryTab from '../../components/InventoryTab';

const HomeTab = lazy(() => import('./HomeTab').then(m => ({ default: m.HomeTab })));
const BookingQRTab = lazy(() => import('./HomeTab').then(m => ({ default: m.BookingQRTab })));
const AdminQRTab = lazy(() => import('./HomeTab').then(m => ({ default: m.AdminQRTab })));
const ProfileTab = lazy(() => import('./ProfileTab').then(m => ({ default: m.ProfileTab })));
const IntegrationTab = lazy(() => import('./ProfileTab').then(m => ({ default: m.IntegrationTab })));
const DeptTab = lazy(() => import('./StaffTab').then(m => ({ default: m.DeptTab })));
const StaffTab = lazy(() => import('./StaffTab').then(m => ({ default: m.StaffTab })));
const ServicesTab = lazy(() => import('./ServicesTab').then(m => ({ default: m.ServicesTab })));
const FinanceTab = lazy(() => import('./FinanceTab').then(m => ({ default: m.FinanceTab })));
const CRMTab = lazy(() => import('./CRMTab').then(m => ({ default: m.CRMTab })));
const ReportsTab = lazy(() => import('./CRMTab').then(m => ({ default: m.ReportsTab })));

const DeptModal = lazy(() => import('./StaffTab').then(m => ({ default: m.DeptModal })));
const StaffModal = lazy(() => import('./StaffTab').then(m => ({ default: m.StaffModal })));
const ServiceModal = lazy(() => import('./ServicesTab').then(m => ({ default: m.ServiceModal })));
const TemplatesModal = lazy(() => import('./ServicesTab').then(m => ({ default: m.TemplatesModal })));
const PackageModal = lazy(() => import('./ServicesTab').then(m => ({ default: m.PackageModal })));
const InvoiceModal = lazy(() => import('./FinanceTab').then(m => ({ default: m.InvoiceModal })));
const PurchaseModal = lazy(() => import('./FinanceTab').then(m => ({ default: m.PurchaseModal })));
const PurchaseDetailModal = lazy(() => import('./FinanceTab').then(m => ({ default: m.PurchaseDetailModal })));
const CashModal = lazy(() => import('./FinanceTab').then(m => ({ default: m.CashModal })));
const CurrentAccountModal = lazy(() => import('./FinanceTab').then(m => ({ default: m.CurrentAccountModal })));
const CustomerDetailModal = lazy(() => import('./CRMTab').then(m => ({ default: m.CustomerDetailModal })));
const AutomationModal = lazy(() => import('./CRMTab').then(m => ({ default: m.AutomationModal })));
const AIResultModal = lazy(() => import('./Modals').then(m => ({ default: m.AIResultModal })));

// Ctx type for tab components
export type Ctx = {
    [key: string]: any;
};

// AIAssistant plugin registration
interface AIAssistantPlugin {
    syncStaffData(options: { token: string; baseUrl: string; isStaff: boolean }): Promise<void>;
    getLastResult(): Promise<{ result: string | null }>;
}
const AIAssistant = registerPlugin<AIAssistantPlugin>('AIAssistant');

export default function CompanyPanel() {
    void 0;

    // === STATE & HANDLERS ===
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
const [automationRules, setAutomationRules] = useState<any[]>([]);
const [showAutomationModal, setShowAutomationModal] = useState(false);
const [editingRule, setEditingRule] = useState<any>(null);
const [loadingRules, setLoadingRules] = useState(false);
const [showPurchaseModal, setShowPurchaseModal] = useState(false);
const [showCashModal, setShowCashModal] = useState(false);
const [vknCheckResult, setVknCheckResult] = useState<{ vkn: string; isEInvoice: boolean } | null>(null);
const [lastAIResult, setLastAIResult] = useState<any>(null);
const [showAIResultModal, setShowAIResultModal] = useState(false);
const [expandedMenus, setExpandedMenus] = useState<string[]>(['finance', 'crm']);
const [inventoryProducts, setInventoryProducts] = useState<any[]>([]);
const [purchaseSearch, setPurchaseSearch] = useState('');

// Native Sync
useEffect(() => {
    const syncMobileData = async () => {
        if (Capacitor.isNativePlatform()) {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const baseUrl = (api.defaults.baseURL || window.location.origin).replace(/\/$/, "");
            try {
                await (AIAssistant as any).requestPermissions();
                await AIAssistant.syncStaffData({
                    token: token || '',
                    baseUrl: baseUrl,
                    isStaff: true
                });
                console.log('Mobile AI Assistant synced and permissions requested');
            } catch (e) {
                console.warn('Mobile sync/permissions skipped or failed:', e);
            }
        }
    };
    syncMobileData();

    // Listen for Native Detections
    const handleNativeDetection = (data: any) => {
        try {
            const result = typeof data === 'string' ? JSON.parse(data) : data;
            if (result && result.success && result.data) {
                setLastAIResult(result.data);
                setShowAIResultModal(true);
                
                // Trigger a refresh of the home data to show the new appointment
                if (result.data.autoCreated && company) {
                    fetchData(company.id);
                }
            }
        } catch (e) {
            console.error('Failed to parse native AI result:', e);
        }
    };

    if (Capacitor.isNativePlatform()) {
        (window as any).addEventListener('ai_appointment_detected', (event: any) => {
            handleNativeDetection(event.detail);
        });
        
        // Check for missed result on start/resume
        const checkMissed = async () => {
            const { result } = await AIAssistant.getLastResult();
            if (result) handleNativeDetection(result);
        };
        checkMissed();
    }
}, [activeTab, company]);
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
const [renewingLicense, setRenewingLicense] = useState(false);

const handleRenewLicense = async () => {
    try {
        setRenewingLicense(true);
        const res = await api.post('/payments/license/initialize', { months: 12 });
        if (res.data.success && res.data.data.paymentPageUrl) {
            window.location.href = res.data.data.paymentPageUrl;
        }
    } catch (err: any) {
        alert(err.response?.data?.error || 'Ödeme başlatılamadı');
    } finally {
        setRenewingLicense(false);
    }
};

const handleLogin = async (keyToUse?: string) => {
    const key = keyToUse || inputKey.trim();
    if (!key) return;
    setLoading(true);
    setError('');
    try {
        const res = await api.post('/companies/admin-login', { admin_key: key });
        const { company: comp, token, is_license_expired } = res.data.data;
        setCompany(comp);
        setIsLicenseExpired(!!is_license_expired);
        localStorage.setItem('company_admin_key', key);
        if (token) {
            localStorage.setItem('token', token);
        }
        setInputKey(key);
        if (!is_license_expired) {
            fetchData(comp.id);
            fetchInventoryProducts(comp.id);
            if (comp.city) fetchDistricts(comp.city);
            // Note: Neighborhood fetching usually needs the district ID which we get after fetchDistricts
        }

        // Load AI rules - Backend'den geleni önceliklendir
        setAiRules(comp.ai_rules || localStorage.getItem(`ai_rules_${comp.id}`) || 'Varsayılan randevu kuralları aktiftir.');
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


const fetchInventoryProducts = async (cid?: number) => {
    const targetCid = cid || company?.id;
    if (!targetCid) return;
    try {
        const res = await api.get('/inventory/products');
        if (res.data.success) {
            setInventoryProducts(res.data.data || []);
        }
    } catch (err) {
        console.error('Envanter ürünleri yüklenemedi:', err);
    }
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

const fetchAutomationRules = async (cid?: number) => {
    const targetCid = cid || company?.id;
    if (!targetCid) return;
    setLoadingRules(true);
    try {
        const res = await api.get(`/appointments/company/${targetCid}/automation-rules`);
        if (res.data.success) {
            setAutomationRules(res.data.data || []);
        }
    } catch (err) {
        console.error('Otomasyon kuralları yüklenemedi:', err);
    } finally {
        setLoadingRules(false);
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
            // Fatura başarıyla kaydedildiyse stokları güncelle
            for (const item of data.items) {
                if (item.product_id) {
                    try {
                        await api.put(`/inventory/products/${item.product_id}/stock`, {
                            change: Number(item.quantity)
                        });
                    } catch (stockErr) {
                        console.error(`Ürün (${item.product_id}) stoku güncellenemedi:`, stockErr);
                    }
                }
            }
            
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
            fetchInventoryProducts();
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
        unit: serviceForm.unit || null
    };

    console.log('Hizmet kaydetme verisi:', submitData);

    try {
        if (serviceForm.id) {
            // Güncelle
            await api.put(`/services/${serviceForm.id}`, submitData);
        } else {
            // Yeni ekle
            await api.post('/services', submitData);
        }
        setServiceForm({ id: null, name: '', description: '', duration_minutes: 30, price: 0, department_id: null, photo: null, quantity: '', unit: '' });
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

const handleSavePackage = async () => {
    if (!company) {
        alert('Firma bilgileri bulunamadı.');
        return;
    }
    if (!packageForm.name.trim()) {
        alert('Lütfen paket adını giriniz.');
        return;
    }
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
        console.error('Package Save Error:', err);
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
        { name: 'Erkek Saç Kesimi', duration: 30, price: 200, description: 'Yıkama dahil saç kesimi' },
        { name: 'Sakal Tıraşı (Makine)', duration: 15, price: 100, description: 'Makine ile sakal düzeltme' },
        { name: 'Sakal Tıraşı (Ustura)', duration: 25, price: 150, description: 'Geleneksel ustura tıraşı' },
        { name: 'Yıkama & Şekillendirme', duration: 20, price: 100, description: 'Saç yıkama ve fön' },
        { name: 'Çocuk Saç Kesimi', duration: 25, price: 150, description: '12 yaş altı çocuk kesimi' },
        { name: 'Saç Boyama (Erkek)', duration: 60, price: 400, description: 'Erkek saç boyama işlemi' },
        { name: 'Beyaz Kapatma', duration: 30, price: 300, description: 'Doğal beyaz kapatma işlemi' },
        { name: 'Keratin / Bakım', duration: 45, price: 350, description: 'Erkek saç bakım uygulaması' },
        { name: 'Damat Tıraşı Paketi', duration: 90, price: 1000, description: 'Damat özel bakım paketi' },
        { name: 'Kaş Düzeltme', duration: 10, price: 50, description: 'Doğal kaş düzeltme' },
        { name: 'Saç Tasarım (Fade)', duration: 45, price: 250, description: 'Fade ve modern kesimler' }
    ],
    women: [
        { name: 'Saç Kesimi', duration: 45, price: 300, description: 'Modern saç kesimi ve şekillendirme' },
        { name: 'Fön ve Şekillendirme', duration: 30, price: 150, description: 'Fön ve günlük şekillendirme' },
        { name: 'Topuz ve Özel Tasarım', duration: 60, price: 500, description: 'Özel gün ve davet saç tasarımı' },
        { name: 'Saç Boyama (Dip)', duration: 90, price: 600, description: 'Dip boyama işlemi' },
        { name: 'Saç Boyama (Komple)', duration: 120, price: 1000, description: 'Tüm saç boyama' },
        { name: 'Röfle / Balyaj', duration: 180, price: 2000, description: 'Röfle, balyaj, ombre, sombre işlemleri' },
        { name: 'Saç Açma İşlemleri', duration: 150, price: 1500, description: 'Saç rengi açma ve temizleme' },
        { name: 'Keratin Bakım', duration: 90, price: 800, description: 'Saç düzleştirme ve bakım' },
        { name: 'Saç Botoksu', duration: 60, price: 600, description: 'Yoğun nem ve dolgunluk veren bakım' },
        { name: 'Perma', duration: 120, price: 1200, description: 'Kalıcı dalga işlemi' },
        { name: 'Saç Kaynak', duration: 180, price: 3000, description: 'Mikro veya boncuk kaynak uygulaması' },
        { name: 'Saç Bakım Kürleri', duration: 30, price: 250, description: 'Özel bakım maskeleri ve kürler' },
        { name: 'Gelin Saçı & Prova', duration: 120, price: 2500, description: 'Gelin saç tasarımı ve prova' },
        { name: 'Kaş Alma', duration: 15, price: 100, description: 'Kaş şekillendirme' }
    ],
    beauty: [
        { name: 'Cilt Bakımı (Klasik)', duration: 60, price: 500, description: 'Derinlemesine gözenek temizliği' },
        { name: 'Hydrafacial / Medikal', duration: 75, price: 1200, description: 'Cihazlı medikal cilt bakımı' },
        { name: 'Lazer Epilasyon', duration: 60, price: 1500, description: 'Kalıcı tüy yok etme işlemi' },
        { name: 'IPL Epilasyon', duration: 45, price: 1000, description: 'Işık bazlı tüy azaltma' },
        { name: 'İğneli Epilasyon', duration: 30, price: 400, description: 'Tekli tüy yok etme işlemi' },
        { name: 'Kalıcı Makyaj', duration: 120, price: 2500, description: 'Microblading, dudak renklendirme vb.' },
        { name: 'Kirpik Lifting', duration: 45, price: 400, description: 'Doğal kirpik kaldırma işlemi' },
        { name: 'Kirpik Uzatma / İpek', duration: 90, price: 800, description: 'İpek kirpik uygulaması' },
        { name: 'Kaş Laminasyon', duration: 45, price: 450, description: 'Kaş şekillendirme ve sabitleme' },
        { name: 'Bölgesel İncelme', duration: 45, price: 800, description: 'G5, kavitasyon vb. uygulamalar' },
        { name: 'Masaj Hizmetleri', duration: 50, price: 750, description: 'Profesyonel vücut masajı' },
        { name: 'Manikür', duration: 30, price: 200, description: 'Klasik el bakımı' },
        { name: 'Pedikür', duration: 45, price: 300, description: 'Klasik ayak bakımı' }
    ]
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

const bookingUrl = company ? `${window.location.origin}/#/book/${company.id}?ref=qr` : '';
const qrApiUrl = (data: string, size = 200) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&color=1e1b4b&bgcolor=ffffff`;

const switchTab = (tab: TabKey) => {
    let targetTab = tab;
    
    // Handle parent menu selection
    if (tab === 'finance') {
        targetTab = 'finance-sales-list';
    } else if (tab === 'crm') {
        targetTab = 'customers-list';
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
        else if (targetTab === 'customers-automations') {
            fetchAutomationRules(company.id);
        }
        else if (targetTab === 'crm') {
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
        // Detach AI rules from state to ensure latest are sent
        const data: any = {
            ...company,
            ai_rules: aiRules
        };

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
            // Also update localStorage for AI rules as a fallback/cache
            localStorage.setItem(`ai_rules_${company.id}`, aiRules);
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
        inputKey,
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
        packages,
        activeServiceTab,
        showServiceModal,
        showPackageModal,
        showTemplatesModal,
        serviceForm,
        packageForm,
        isSavingService,
        isSavingPackage,
        aiRules,
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
        automationRules,
        showAutomationModal,
        editingRule,
        loadingRules,
        showPurchaseModal,
        showCashModal,
        vknCheckResult,
        lastAIResult,
        showAIResultModal,
        expandedMenus,
        inventoryProducts,
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
        renewingLicense,
        handleRenewLicense,
        handleLogin,
        handleLogout,
        handleUpdateCompany,
        fetchInventoryProducts,
        fetchFinanceData,
        fetchCustomersData,
        fetchAutomationRules,
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
        handleSavePackage,
        handleDeletePackage,
        toggleServiceInPackage,
        handleUpdateServicePrice,
        handleUpdateServiceDuration,
        handleUpdateServiceStaff,
        handleUpdateServiceDept,
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
        templates,
        setCompany,
        setDepartments,
        setStaffBoards,
        setLoading,
        setError,
        setInputKey,
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
        setPackages,
        setActiveServiceTab,
        setShowServiceModal,
        setShowPackageModal,
        setShowTemplatesModal,
        setServiceForm,
        setPackageForm,
        setIsSavingService,
        setIsSavingPackage,
        setAiRules,
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
        setAutomationRules,
        setShowAutomationModal,
        setEditingRule,
        setLoadingRules,
        setShowPurchaseModal,
        setShowCashModal,
        setVknCheckResult,
        setLastAIResult,
        setShowAIResultModal,
        setExpandedMenus,
        setInventoryProducts,
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
        setRenewingLicense,
    };
    void Object.keys(ctx).length;

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

                {/* AI Status Indicator */}
                {company.ai_enabled !== false && (
                    <div className="mx-4 mt-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl animate-in fade-in slide-in-from-left duration-500">
                        <div className="flex items-center gap-3">
                            <div className="relative flex-shrink-0">
                                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping absolute inset-0" />
                                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full relative" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] leading-none">Smart Assist</p>
                                <p className="text-[13px] font-bold text-white mt-1 truncate">Aktif & Dinlemede...</p>
                            </div>
                        </div>
                    </div>
                )}

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
                                case 'reports': return <ReportsTab ctx={ctx} />;
                                case 'inventory': return <InventoryTab companyId={Number(company.id)} />;
                                default:
                                    if (activeTab === 'crm' || activeTab.startsWith('customers-')) {
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
                    <DeptModal ctx={ctx} />
                    <StaffModal ctx={ctx} />
                    <ServiceModal ctx={ctx} />
                    <TemplatesModal ctx={ctx} />
                    <PackageModal ctx={ctx} />
                    <InvoiceModal ctx={ctx} />
                    <PurchaseModal ctx={ctx} />
                    <CurrentAccountModal ctx={ctx} />
                    <PurchaseDetailModal ctx={ctx} />
                    <CashModal ctx={ctx} />
                    <CustomerDetailModal ctx={ctx} />
                    <AutomationModal ctx={ctx} />
                    <AIResultModal ctx={ctx} />
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