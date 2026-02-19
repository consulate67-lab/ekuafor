import { useState, useEffect } from 'react';
import api from '../lib/api';

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
}

type TabKey = 'home' | 'booking' | 'qr' | 'dept' | 'staff';

const menuItems: { key: TabKey; icon: string; label: string }[] = [
    { key: 'home', icon: '🏠', label: 'Ana Sayfa' },
    { key: 'booking', icon: '📅', label: 'Müşteri QR' },
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
        department_id: ''
    });
    const [copiedField, setCopiedField] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleLogin = async (keyToUse?: string) => {
        const key = keyToUse || inputKey.trim();
        if (!key) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/companies/admin-login', { admin_key: key });
            if (res.data?.success && res.data.data) {
                setCompany(res.data.data);
                localStorage.setItem('company_admin_key', key);
                setInputKey(key);
                fetchData(res.data.data.id);
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

    const fetchData = async (companyId: number) => {
        try {
            const [deptRes, staffRes] = await Promise.all([
                api.get('/departments', { params: { company_id: companyId } }),
                api.get(`/companies/${companyId}/staff-boards`)
            ]);
            setDepartments(deptRes.data?.data || []);
            setStaffBoards(staffRes.data?.data || []);
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
                department_id: staffForm.department_id || null
            });
            setStaffForm({ first_name: '', last_name: '', gender: 'erkek', department_id: '' });
            setShowStaffModal(false);
            fetchData(company.id);
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || 'Personel kodu oluşturulamadı';
            alert(msg);
        } finally {
            setIsCreating(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('company_admin_key');
        setCompany(null);
        setInputKey('');
        setDepartments([]);
        setStaffBoards([]);
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

    // MAIN PANEL
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex">

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
                {/* Mobile Top Bar */}
                <div className="lg:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-3 flex items-center justify-between">
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
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Board Anahtarı</p>
                                    <p className="text-sm font-black text-slate-900 font-mono tracking-wider truncate">{company.board_key || '—'}</p>
                                </div>
                                <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/20 border border-slate-50">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Departman</p>
                                    <p className="text-sm font-black text-slate-900">{departments.length} birim</p>
                                </div>
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
                                                </div>
                                            </div>
                                        </div>

                                        {/* QR Code */}
                                        <div className="bg-slate-50 rounded-2xl p-5 text-center">
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
                </div>
            </main>

            {/* Department Modal */}
            {showDeptModal && (
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
            )}

            {/* Staff Board Modal */}
            {showStaffModal && (
                <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowStaffModal(false)}>
                    <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-10 shadow-2xl" onClick={e => e.stopPropagation()}
                        style={{ animation: 'slideUp 0.3s ease-out' }}>
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                        <h2 className="text-2xl font-black text-slate-900 mb-6">Personel Board Kodu Oluştur</h2>

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
