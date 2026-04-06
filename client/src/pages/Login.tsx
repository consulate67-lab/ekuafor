import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

export default function Login() {
    const navigate = useNavigate();
    const { login, isAuthenticated, user } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showBoardLogin, setShowBoardLogin] = useState(false);
    const [boardKey, setBoardKey] = useState('');

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

    const handleLogin = async (e: React.FormEvent) => {
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
        if (!boardKey) {
            setError('Lütfen kurulum kodunu giriniz');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const response = await api.post('/companies/board-login', { key: boardKey.toUpperCase() });
            const { user: userData, token } = response.data.data;
            login(userData, token);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Geçersiz Kurulum Kodu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-600 px-6 py-12 relative overflow-hidden font-sans">
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-200 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
            </div>

            <div className="max-w-md w-full relative z-10">
                <div className="text-center mb-10">
                    <div className="bg-white p-5 rounded-[2.5rem] w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-900/30">
                        <img src="/app-icon.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Salon Cebinde</h1>
                    <p className="text-indigo-100 font-bold text-xs uppercase tracking-[0.3em] opacity-80 italic">Orijinal Yönetim Sistemi</p>
                </div>

                <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-red-100 flex items-center gap-3">
                            {error}
                        </div>
                    )}

                    {!showBoardLogin ? (
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-black text-slate-800">Yönetici Girişi</h2>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Lütfen bilgilerinizi doğrulayın</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">E-posta</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition-all"
                                    placeholder="admin@saloon.com"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Şifre</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all text-xs"
                            >
                                {loading ? 'BAĞLANILIYOR...' : 'SİSTEME GİRİŞ YAP'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleBoardLogin} className="space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-black text-indigo-700 uppercase tracking-tighter italic">Kurulum Girişi</h2>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 italic">Sistemi aktif etmek için Kurulum Kodunu yazın</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 italic">Kurulum Anahtarı (Board Key)</label>
                                <input
                                    type="text"
                                    value={boardKey}
                                    onChange={(e) => setBoardKey(e.target.value.toUpperCase())}
                                    className="w-full bg-slate-50 border-4 border-indigo-100 p-6 rounded-2xl font-black text-indigo-700 text-center text-4xl outline-none focus:border-indigo-600 focus:bg-white transition-all tracking-widest"
                                    placeholder="XXXX-123"
                                    required
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-700 text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all text-xs italic"
                            >
                                {loading ? 'KURULUM BAŞLATILIYOR...' : 'TAHTAYA BAĞLAN'}
                            </button>
                        </form>
                    )}
                </div>

                <div className="mt-10 text-center">
                    <button
                        onClick={() => { setShowBoardLogin(!showBoardLogin); setError(''); }}
                        className="text-[11px] font-black text-indigo-100 hover:text-white uppercase tracking-widest underline decoration-2 underline-offset-8 transition-colors"
                    >
                        {!showBoardLogin ? '✈ KURULUM KODU İLE BAĞLAN (BOARD)' : '🔙 YÖNETİCİ PANELİNE DÖN'}
                    </button>
                </div>
            </div>
        </div>
    );
}
