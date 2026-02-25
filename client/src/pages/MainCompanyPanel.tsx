import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function MainCompanyPanel() {
    const navigate = useNavigate();
    const [mainCompanies, setMainCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        address_line: '',
        admin_code: '',
    });

    const [authCode, setAuthCode] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        // Simple security check for this special screen
        const savedAuth = localStorage.getItem('main_company_auth');
        if (savedAuth === '996633') { // Example code
            setIsAuthorized(true);
            fetchMainCompanies();
        } else {
            setLoading(false);
        }
    }, []);

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault();
        if (authCode === '996633') {
            localStorage.setItem('main_company_auth', '996633');
            setIsAuthorized(true);
            fetchMainCompanies();
        } else {
            alert('Geçersiz yetki kodu!');
        }
    };

    const fetchMainCompanies = async () => {
        try {
            setLoading(true);
            const response = await api.get('/main-companies');
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
            await api.post('/main-companies', formData);
            setShowForm(false);
            setFormData({ name: '', description: '', address_line: '', admin_code: '' });
            fetchMainCompanies();
        } catch (err: any) {
            setError('Firma oluşturulurken hata oluştu');
        }
    };

    if (loading) return <div className="p-20 text-center font-black">YÜKLENİYOR...</div>;

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <div className="bg-white/10 backdrop-blur-xl p-12 rounded-[3rem] border border-white/10 w-full max-w-md shadow-2xl text-center">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-8 italic">Üst Yönetim Paneli</h1>
                    <form onSubmit={handleAuth} className="space-y-6">
                        <input
                            type="password"
                            placeholder="Giriş Kodu"
                            className="w-full bg-white/5 border-none rounded-2xl py-6 px-8 text-center text-2xl font-black text-white placeholder-white/20 focus:ring-2 focus:ring-emerald-500/50"
                            value={authCode}
                            onChange={(e) => setAuthCode(e.target.value)}
                        />
                        <button type="submit" className="w-full bg-emerald-500 text-slate-950 py-5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all">Giriş Yap</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <header className="max-w-6xl mx-auto flex justify-between items-center mb-12">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Üst Firmalar</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Grup Şubeleri ve Raporlama Yönetimi</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                    <span>+</span> YENİ ÜST FİRMA
                </button>
            </header>

            <main className="max-w-6xl mx-auto">
                {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 font-bold text-sm">{error}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mainCompanies.map(mc => (
                        <div key={mc.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">{mc.name}</h3>
                            <p className="text-xs text-slate-400 font-bold mb-6 line-clamp-2">{mc.description || 'Açıklama yok'}</p>

                            <div className="flex gap-3 mt-auto">
                                <button
                                    onClick={() => navigate(`/main-reports/${mc.admin_code}`)}
                                    className="flex-1 bg-emerald-50 text-emerald-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                >
                                    Raporlar
                                </button>
                                <button
                                    className="flex-1 bg-slate-50 text-slate-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    Şubeler
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {mainCompanies.length === 0 && (
                    <div className="py-40 text-center bg-white rounded-[4rem] border border-slate-100 border-dashed">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">🏢</div>
                        <p className="text-slate-400 font-bold text-lg">Henüz tanımlı bir üst firma bulunmuyor.</p>
                    </div>
                )}
            </main>

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
                    <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-12 shadow-2xl animate-scale-up">
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8 italic">Yeni Üst Firma</h2>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Firma Adı</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Açıklama</label>
                                <textarea
                                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold"
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Dashboard Erişim Kodu (Örn: ARDEM-MAP)</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold text-emerald-600 uppercase"
                                    value={formData.admin_code}
                                    onChange={(e) => setFormData({ ...formData, admin_code: e.target.value.toUpperCase() })}
                                    required
                                />
                            </div>
                            <div className="flex gap-4 pt-6">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 text-slate-400 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">İptal</button>
                                <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
