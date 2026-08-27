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

type TabKey = 'home' | 'booking' | 'qr' | 'dept' | 'staff' | 'services' | 'finance' | 'ai' | 'reports' | 'profile' | 'integration' | 'voice-assistant' | 
    'finance-sales-dashboard' | 'finance-sales-reports' | 'finance-sales-list' |
    'finance-purchases-dashboard' | 'finance-purchases-reports' | 'finance-purchases-list' |
    'finance-cash-dashboard' | 'finance-cash-reports' | 'finance-cash-list' |
    'finance-contacts' | 'finance-contacts-balance' |
    'header-invoices' | 'header-cash' | 'header-contacts' |
    'customers-list' | 'customers-marketing' | 'customers-automations' | 'crm' | 'inventory';

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
    { key: 'inventory', icon: '📦', label: 'Envanter & Stok' },
    {
        key: 'crm',
        icon: '👥',
        label: 'Müşteriler (CRM)',
        children: [
            { key: 'customers-list', label: 'Müşteri Rehberi', icon: '📇' },
            { key: 'customers-marketing', label: 'Pazarlama & SMS', icon: '📱' },
            { key: 'customers-automations', label: 'Akıllı Otomasyonlar', icon: '🤖' },
        ]
    },
    { key: 'reports', icon: '📊', label: 'Genel Raporlar' },
    { key: 'services', icon: '✂️', label: 'Hizmetler' },
    { key: 'profile', icon: '⚙️', label: 'Firma Ayarları' },
    { key: 'integration', icon: '🔌', label: 'Entegrasyon' },
    { key: 'booking', icon: '📅', label: 'Müşteri QR' },
    { key: 'qr', icon: '🔑', label: 'Yönetim Kodu' },
    { key: 'dept', icon: '🏢', label: 'Departmanlar' },
    { key: 'staff', icon: '👥', label: 'Personeller' },
];
export { menuItems };

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
export { templates };
