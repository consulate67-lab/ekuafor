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

export default function CompanyPanel() {
    const [company, setCompany] = useState<any>(null);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [staffBoards, setStaffBoards] = useState<StaffBoard[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [inputKey, setInputKey] = useState('');

    // Modal states
    const [showDeptModal, setShowDeptModal] = useState(false);
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [deptName, setDeptName] = useState('');
    const [staffForm, setStaffForm] = useState({
        first_name: '',
        last_name: '',
        gender: 'erkek',
        department_id: ''
    });

    // Tab state
    const [activeTab, setActiveTab] = useState<'qr' | 'dept' | 'staff'>('qr');

    // Login with admin_key
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

    // Auto-login if key exists or provided in URL
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
            alert(err.response?.data?.error || 'Personel kodu oluşturulamadı');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('company_admin_key');
        setCompany(null);
        setInputKey('');
        setDepartments([]);
        setStaffBoards([]);
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50 px-5 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-black text-slate-900 tracking-tight">{company.name}</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Firma Yönetim Paneli</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-100 transition-all"
                    >
                        Çıkış
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-white border-b border-slate-100 px-2">
                {[
                    { key: 'qr', label: '📱 QR Kod', icon: '' },
                    { key: 'dept', label: '🏢 Departmanlar', icon: '' },
                    { key: 'staff', label: '👥 Personeller', icon: '' }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`flex-1 py-4 text-xs font-black uppercase tracking-wider transition-all border-b-3 ${activeTab === tab.key
                            ? 'text-indigo-600 border-indigo-600'
                            : 'text-slate-400 border-transparent hover:text-slate-600'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="p-5 pb-24 max-w-lg mx-auto">

                {/* QR TAB */}
                {activeTab === 'qr' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 text-center">
                            <div className="inline-flex px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
                                Firma QR Kodu
                            </div>

                            {/* QR Code Placeholder */}
                            <div className="bg-white border-4 border-slate-900 rounded-3xl p-6 inline-block mb-6">
                                <div className="w-48 h-48 bg-slate-900 rounded-2xl flex items-center justify-center relative overflow-hidden">
                                    {/* Simple pattern for visual QR representation */}
                                    <div className="grid grid-cols-8 gap-0.5 p-3 absolute inset-0">
                                        {Array.from({ length: 64 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className={`rounded-sm ${(company.admin_key || '').charCodeAt(i % (company.admin_key || 'X').length) % 3 === 0
                                                    ? 'bg-white'
                                                    : 'bg-slate-900'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <div className="relative z-10 bg-white px-3 py-1 rounded-lg">
                                        <span className="text-[8px] font-black text-slate-900 tracking-wider">{company.name}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-2xl font-black text-slate-900 tracking-widest font-mono">
                                    {company.admin_key || 'Anahtar yok'}
                                </p>
                                <p className="text-xs text-slate-400">Bu kodu firmaya yönetici olarak giriş yapmak için kullanın</p>

                                <div className="flex gap-3 justify-center mt-6">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(company.admin_key || '');
                                            alert('Anahtar kopyalandı!');
                                        }}
                                        className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-slate-800 active:scale-95 transition-all"
                                    >
                                        📋 Kopyala
                                    </button>
                                    <button
                                        onClick={() => window.print()}
                                        className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-500 active:scale-95 transition-all"
                                    >
                                        🖨️ Yazdır
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Board Key */}
                        <div className="bg-white rounded-3xl p-6 shadow-lg shadow-slate-200/20">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Salon Board Anahtarı</p>
                            <p className="text-lg font-black text-slate-900 tracking-widest font-mono">{company.board_key || '—'}</p>
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

                                    {/* QR Code Area */}
                                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                                        <div className="bg-white border-2 border-slate-900 rounded-xl p-4 inline-block mb-3">
                                            <div className="w-32 h-32 bg-slate-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                                                <div className="grid grid-cols-6 gap-0.5 p-2 absolute inset-0">
                                                    {Array.from({ length: 36 }).map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className={`rounded-sm ${(staff.board_code || '').charCodeAt(i % (staff.board_code || 'X').length) % 3 === 0
                                                                ? 'bg-white'
                                                                : 'bg-slate-900'
                                                                }`}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="relative z-10 bg-white px-2 py-0.5 rounded">
                                                    <span className="text-[7px] font-black text-slate-900">{staff.first_name}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xl font-black text-slate-900 tracking-[0.3em] font-mono">{staff.board_code}</p>
                                        <div className="flex gap-2 justify-center mt-3">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(staff.board_code);
                                                    alert('Kod kopyalandı!');
                                                }}
                                                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[11px] font-black active:scale-95 transition-all"
                                            >
                                                📋 Kopyala
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

            {/* Department Modal */}
            {showDeptModal && (
                <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowDeptModal(false)}>
                    <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-10 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                        <h2 className="text-2xl font-black text-slate-900 mb-6">Yeni Departman</h2>
                        <input
                            type="text"
                            value={deptName}
                            onChange={e => setDeptName(e.target.value)}
                            placeholder="Departman adı..."
                            className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 text-lg font-bold text-slate-900 outline-none mb-6"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeptModal(false)}
                                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-base"
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
                    <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-10 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
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
                                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-base"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleCreateStaffBoard}
                                className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-base active:scale-95 transition-all"
                            >
                                Oluştur
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
