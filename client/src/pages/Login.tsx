import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

export default function Login() {
    const navigate = useNavigate();
    const { login, isAuthenticated, user } = useAuthStore();
    const [loginType, setLoginType] = useState<'admin' | 'board'>('admin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [boardCode, setBoardCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isAuthenticated && user) {
            if (user.role === 'super_admin') {
                navigate('/main-management', { replace: true });
            } else if (user.role === 'admin' || user.role === 'company_admin') {
                navigate('/company-panel', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [isAuthenticated, user, navigate]);

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await api.post('/auth/login', {
                email: email.toLowerCase().trim(),
                password
            });
            const { user: userData, token } = response.data.data;
            login(userData, token);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Giriş başarısız. Lütfen kontrol edin.');
        } finally {
            setLoading(false);
        }
    };

    const handleBoardLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!boardCode) {
            setError('Lütfen Board kodunu giriniz');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const response = await api.post('/companies/board-login', { key: boardCode.toUpperCase() });
            const { user: userData, token } = response.data.data;
            login(userData, token);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Geçersiz Board kodu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 py-12 relative overflow-hidden font-sans">
            {/* Background Effects (Aynen Orijinaldeki gibi) */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100 rounded-full blur-[100px] opacity-50 animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-100 rounded-full blur-[100px] opacity-40 animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="max-w-sm w-full relative z-10">
                <div className="text-center mb-10">
                    <div className="w-24 h-24 rounded-[2rem] overflow-hidden flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-200 rotate-6 hover:rotate-0 transition-transform duration-500 bg-white">
                        <img src="/app-icon.png" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase">Salon Cebinde</h1>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">Yönetim Paneli Girişi</p>
                </div>

                <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-white">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100 flex items-center gap-3">
                            <span className="text-lg">⚠️</span>
                            {error}
                        </div>
                    )}

                    {loginType === 'admin' ? (
                        <form onSubmit={handleAdminLogin} className="space-y-6">
                            <div className="text-center mb-4">
                                <h2 className="text-xl font-black text-slate-900 mb-1">Yönetici Girişi</h2>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed px-4">Panelinize erişmek için bilgilerinizi girin</p>
                            </div>

                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">E-posta</label>
                                <input
                                    type="email"
                                    placeholder="admin@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all tracking-wide"
                                    required
                                />
                            </div>

                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Şifre</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 disabled:opacity-30 active:scale-95 transition-all"
                            >
                                {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleBoardLogin} className="space-y-6">
                            <div className="text-center mb-4">
                                <h2 className="text-xl font-black text-slate-900 mb-1">Terminal/Board</h2>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed px-4">Firmanıza özel board kurulum kodunu girin</p>
                            </div>

                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Giriş Anahtarı</label>
                                <input
                                    type="text"
                                    placeholder="XXXX-123"
                                    value={boardCode}
                                    onChange={(e) => setBoardCode(e.target.value.toUpperCase())}
                                    className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-slate-900 text-center text-3xl outline-none focus:border-indigo-500 focus:bg-white transition-all tracking-[0.2em]"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 disabled:opacity-30 active:scale-95 transition-all"
                            >
                                {loading ? 'Bağlanıyor...' : 'Sistemi Başlat'}
                            </button>
                        </form>
                    )}
                </div>

                <div className="mt-8 text-center space-y-6">
                    <button
                        onClick={() => {
                            setLoginType(loginType === 'admin' ? 'board' : 'admin');
                            setError('');
                        }}
                        className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                    >
                        {loginType === 'admin' ? '✈ Kurulum Kodu ile Giriş (Board)' : '🔙 Yönetici Girişine Dön'}
                    </button>

                    <div className="pt-4">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] leading-relaxed">
                            © 2026 Salon Cebinde
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
