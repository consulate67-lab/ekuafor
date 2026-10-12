/* eslint-disable @typescript-eslint/no-explicit-any */


/* Phone formatters */
// Telefon formatlama yardımcıları
const normalizePhone = (phone: string | null | undefined): string => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('90') && cleaned.length > 10) cleaned = cleaned.substring(2);
    else if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.substring(1);
    if (cleaned.length > 10 && cleaned.startsWith('90')) cleaned = cleaned.substring(2);
    if (cleaned.length > 10) cleaned = cleaned.slice(-10);
    return cleaned;
};

const formatPhoneWithSpaces = (phone: string | null | undefined): string => {
    const normalized = normalizePhone(phone);
    if (!normalized || normalized.length !== 10) return phone || '';
    return `+90 ${normalized.substring(0, 3)} ${normalized.substring(3, 6)} ${normalized.substring(6, 8)} ${normalized.substring(8, 10)}`;
};
export { normalizePhone, formatPhoneWithSpaces };

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
    department_id: number | string | null;
    department_name: string;
    photo: string | null;
    email: string;
    phone: string;
    quantity?: number | string | null;
    unit?: string | null;
    commission_rate?: number | string | null;
}

interface CurrentAccount {
    id?: number;
    company_id: number;
    code?: string;
    name: string;
    title?: string;
    tax_office?: string;
    tax_number?: string;
    type?: 'CUSTOMER' | 'SUPPLIER' | 'ALL';
    phone?: string;
    email?: string;
    website?: string;
    address_line?: string;
    city?: string;
    district?: string;
    country?: string;
    is_active?: boolean;
    balance?: number;
}

type TabKey = 'home' | 'booking' | 'qr' | 'dept' | 'staff' | 'services' | 'scheduling' | 'finance' | 'reports' | 'profile' | 'integration' |
    'finance-sales-dashboard' | 'finance-sales-reports' | 'finance-sales-list' |
    'finance-purchases-dashboard' | 'finance-purchases-reports' | 'finance-purchases-list' |
    'finance-cash-dashboard' | 'finance-cash-reports' | 'finance-cash-list' |
    'finance-contacts' | 'finance-contacts-balance' |
    'header-invoices' | 'header-cash' | 'header-contacts' |
    'customers-list';

interface MenuItem {
    key: TabKey;
    icon: string;
    label: string;
    children?: { key: TabKey; label: string; icon?: string }[];
}
export type { Department, StaffBoard, CurrentAccount, TabKey, MenuItem };

const menuItems: MenuItem[] = [
    { key: 'home', icon: '🏠', label: 'Ana Sayfa' },
    { 
        key: 'finance', 
        icon: '💰', 
        label: 'Finans',
        children: [
            // Fatura Grubu
            { key: 'header-invoices', label: '📄 FATURALAR', icon: '' },
            { key: 'finance-sales-list', label: 'Satış Faturaları', icon: '📈' },
            { key: 'finance-sales-reports', label: 'Satış Raporları', icon: '📊' },
            { key: 'finance-purchases-list', label: 'Alış Faturaları', icon: '📉' },
            { key: 'finance-purchases-reports', label: 'Alış Raporları', icon: '📊' },
            
            // Kasa Grubu
            { key: 'header-cash', label: '🏦 KASA', icon: '' },
            { key: 'finance-cash-dashboard', label: 'Kasa Dashboard', icon: '📊' },
            { key: 'finance-cash-list', label: 'Kasa İşlemleri', icon: '💸' },
            { key: 'finance-cash-reports', label: 'Kasa Raporları', icon: '📋' },

            // Cari Grubu
            { key: 'header-contacts', label: '👤 CARİLER', icon: '' },
            { key: 'finance-contacts', label: 'Cari Kartlar', icon: '📇' },
            { key: 'finance-contacts-balance', label: 'Toplu Bakiye Raporu', icon: '⚖️' },
        ]
    },
    { key: 'customers-list', icon: '👥', label: 'Müşteriler' },
    { key: 'reports', icon: '📊', label: 'Genel Raporlar' },
    { key: 'services', icon: '🧾', label: 'Hizmetler' },
    { key: 'scheduling', icon: '🗓️', label: 'Alanlar & Seanslar' },
    { key: 'profile', icon: '⚙️', label: 'Firma Ayarları' },
    { key: 'integration', icon: '🔌', label: 'Entegrasyon' },
    { key: 'booking', icon: '📅', label: 'Müşteri QR' },
    { key: 'qr', icon: '🔑', label: 'Yönetim Kodu' },
    { key: 'dept', icon: '🏢', label: 'Departmanlar' },
    { key: 'staff', icon: '👥', label: 'Personeller' },
];
export { menuItems };

export const BOOKING_MODE_LABELS: Record<'staff' | 'resource' | 'class', { label: string; hint: string; icon: string }> = {
    staff: { label: 'Personelle', hint: 'Müşteri personel ve saat seçer (kuaför, masaj, klinik)', icon: '👤' },
    resource: { label: 'Alan kiralama', hint: 'Saha, kulvar veya oda saatlik kiralanır', icon: '📍' },
    class: { label: 'Grup dersi', hint: 'Kapasiteli seanslara kayıt alınır (pilates, yoga)', icon: '👥' },
};

export const emptyServiceForm = {
    id: null as number | null,
    name: '',
    description: '',
    duration_minutes: 30,
    price: 0,
    department_id: null as number | null,
    photo: null as string | null,
    quantity: '' as string | number,
    unit: '',
    booking_mode: 'staff' as 'staff' | 'resource' | 'class',
    duration_options: '',
    resource_ids: [] as number[],
};

/** "60, 90, 120" → [60, 90, 120]; boşsa null (hizmetin kendi süresi kullanılır). */
export const parseDurationOptions = (value: string): number[] | null => {
    const list = [...new Set(value.split(/[,\s]+/).map(Number).filter(n => Number.isInteger(n) && n >= 5 && n <= 1440))];
    return list.length ? list.sort((a, b) => a - b).slice(0, 10) : null;
};
