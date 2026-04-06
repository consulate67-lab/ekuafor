import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

export default function MainCompanyPanel() {
    const navigate = useNavigate();
    const [mainCompanies, setMainCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        address_line: '',
        admin_code: '',
        board_key: '',
    });

    const [authCode, setAuthCode] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);

    const { user } = useAuthStore();
    
    useEffect(() => {
        const savedAuth = localStorage.getItem('main_company_auth');
        if (savedAuth || user?.role === 'super_admin') {
            setIsAuthorized(true);
            fetchMainCompanies();
        } else {
            setLoading(false);
        }
    }, [user]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        // 1. Super admin sabit kodu
        if (authCode === '996633') {
            localStorage.setItem('main_company_auth', '996633');
            setIsAuthorized(true);
            fetchMainCompanies();
            return;
        }
        // 2. Admin Key veya Board Key kontrolü (her iki endpoint'i dene)
        try {
            // Önce admin_key dene
            const res = await api.get(`/main-companies/code/${authCode.toUpperCase()}`, { headers: { 'X-No-Mock': 'true' } });
            if (res.data.success && res.data.data) {
                localStorage.setItem('main_company_auth', authCode.toUpperCase());
                setIsAuthorized(true);
                fetchMainCompanies();
                return;
            }
        } catch { /* admin_key başarısız, board_key dene */ }

        try {
            // Board key dene (rapor girişiyle aynı endpoint)
            const res2 = await api.post('/main-companies/reports-login', { key: authCode.toUpperCase() }, { headers: { 'X-No-Mock': 'true' } });
            if (res2.data.success && res2.data.data) {
                localStorage.setItem('main_company_auth', authCode.toUpperCase());
                setIsAuthorized(true);
                fetchMainCompanies();
                return;
            }
        } catch { /* board_key de başarısız */ }

        alert('Geçersiz yetki kodu!');
    };

    const fetchMainCompanies = async () => {
        try {
            setLoading(true);
            const response = await api.get('/main-companies', { headers: { 'X-No-Mock': 'true' } });
            setMainCompanies(response.data.data || []);
        } catch (err: any) {
            setError('Veriler yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/main-companies', {
                ...formData,
                admin_key: formData.admin_code
            }, { headers: { 'X-No-Mock': 'true' } });
            setShowForm(false);
            setFormData({ name: '', description: '', address_line: '', admin_code: '', board_key: '' });
            fetchMainCompanies();
        } catch (err: any) {
            setError('Firma oluşturulurken hata oluştu');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Bu üst firmayı silmek istediğinize emin misiniz? Şubeler bağımsız hale gelecektir.')) return;
        try {
            await api.delete(`/main-companies/${id}`, { headers: { 'X-No-Mock': 'true' } });
            fetchMainCompanies();
        } catch (err: any) {
            alert('Silme işlemi başarısız oldu');
        }
    };

    const filtered = mainCompanies.filter(mc =>
        mc.name?.toLowerCase().includes(search.toLowerCase()) ||
        mc.admin_code?.toLowerCase().includes(search.toLowerCase()) ||
        mc.description?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">YÜKLENİYOR...</div>;

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <div className="bg-white/10 backdrop-blur-xl p-12 rounded-[3rem] border border-white/10 w-full max-w-md shadow-2xl text-center">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-3 italic">Üst Yönetim Paneli</h1>
                    <p className="text-slate-400 text-sm font-bold mb-8">
                        <span className="text-emerald-400">Admin Key</span> veya <span className="text-indigo-400">Board Key</span> ile giriş yapın
                    </p>
                    <form onSubmit={handleAuth} className="space-y-6">
                        <input
                            type="text"
                            placeholder="ADM-XXX-XXXX"
                            className="w-full bg-white/5 border-none rounded-2xl py-6 px-8 text-center text-2xl font-black text-white placeholder-white/20 focus:ring-2 focus:ring-emerald-500/50 uppercase tracking-widest font-mono"
                            value={authCode}
                            onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
                        />
                        <button type="submit" className="w-full bg-emerald-500 text-slate-950 py-5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all">Giriş Yap</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <Link to="/dashboard" className="text-emerald-600 hover:text-emerald-700 text-xs font-bold uppercase tracking-widest mb-1 inline-block">
                                ← Dashboard
                            </Link>
                            <h1 className="text-2xl font-bold text-gray-900">Üst Yönetim</h1>
                        </div>
                        <button
                            onClick={() => setShowForm(true)}
                            className="btn-primary py-2 px-5 text-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Yeni Üst Firma
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-2xl mb-6 font-bold text-sm">{error}</div>
                )}

                {/* Arama */}
                <div className="mb-6 relative">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Firma adı veya kod ile ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl font-medium text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all"
                    />
                </div>

                {/* Liste Tablosu */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Başlık Satırı */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-gray-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <div className="col-span-4">Firma Adı</div>
                        <div className="col-span-2">Admin Key</div>
                        <div className="col-span-2">Board Key</div>
                        <div className="col-span-2 text-center">Açıklama</div>
                        <div className="col-span-2 text-right">İşlemler</div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🏢</div>
                            <p className="text-slate-400 font-bold text-sm">
                                {search ? `"${search}" için sonuç bulunamadı.` : 'Henüz tanımlı bir üst firma bulunmuyor.'}
                            </p>
                        </div>
                    ) : (
                        filtered.map((mc, idx) => (
                            <div
                                key={mc.id}
                                className={`grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-emerald-50/30 transition-colors ${idx !== filtered.length - 1 ? 'border-b border-gray-50' : ''}`}
                            >
                                {/* Firma Adı */}
                                <div className="col-span-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 font-black text-sm flex-shrink-0">
                                            {mc.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm leading-tight">{mc.name}</p>
                                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">ID: {mc.id}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Admin Key */}
                                <div className="col-span-2">
                                    <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2.5 py-1 rounded-lg font-mono tracking-wider">
                                        {mc.admin_code || '—'}
                                    </span>
                                </div>

                                {/* Board Key */}
                                <div className="col-span-2">
                                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-lg font-mono tracking-wider">
                                        {mc.board_key || '—'}
                                    </span>
                                </div>

                                {/* Açıklama */}
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-400 font-medium line-clamp-1 text-center">{mc.description || '—'}</p>
                                </div>

                                {/* İşlemler */}
                                <div className="col-span-2 flex items-center justify-end gap-1.5">
                                    <button
                                        onClick={() => navigate(`/main-reports/${mc.admin_code}`)}
                                        title="Raporlar"
                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all duration-200"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => navigate(`/companies?main_id=${mc.id}`)}
                                        title="Şubeler"
                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all duration-200"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(mc.id)}
                                        title="Sil"
                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {filtered.length > 0 && (
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4 text-right">
                        {filtered.length} kayıt
                    </p>
                )}
            </main>

            {/* Yeni Firma Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Yeni Üst Firma</h2>
                            <button onClick={() => setShowForm(false)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-all">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Firma Adı *</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 px-5 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Açıklama</label>
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 px-5 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    rows={2}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Yönetim Anahtarı (Admin Key) *</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 px-5 font-bold text-sm uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={formData.admin_code}
                                    placeholder="ADM-GRUP"
                                    onChange={(e) => setFormData({ ...formData, admin_code: e.target.value.toUpperCase() })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Rapor Erişim Şifresi (Board Key) *</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 px-5 font-bold text-sm text-emerald-600 uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={formData.board_key}
                                    placeholder="SECRET-KEY"
                                    onChange={(e) => setFormData({ ...formData, board_key: e.target.value.toUpperCase() })}
                                    required
                                />
                                <p className="text-[10px] font-bold text-slate-400 mt-1.5 ml-1 italic">* Rapor ekranına girişte bu şifre sorulacak.</p>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 text-slate-500 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">İptal</button>
                                <button type="submit" className="flex-1 bg-slate-900 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
