import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Layout, ArrowRight, Loader2, Tablet, Briefcase } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

const Login = () => {
    const navigate = useNavigate();
    const { login, isAuthenticated, user } = useAuthStore();
    const [loginType, setLoginType] = useState<'email' | 'terminal'>('email');
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (loginType === 'email') {
                const normalizedEmail = email.toLowerCase().trim();
                localStorage.removeItem('isLocalMode');
                const fullLoginUrl = 'https://ekuafor-production-344a.up.railway.app/api/auth/login';
                const response = await api.post(fullLoginUrl, { email: normalizedEmail, password }, { headers: { 'X-No-Mock': 'true' } });
                const { user: userData, token } = response.data.data;
                login(userData, token);
            } else {
                // Dashboard Login (Terminal)
                localStorage.removeItem('isLocalMode');
                const fullTerminalLoginUrl = 'https://ekuafor-production-344a.up.railway.app/api/companies/board-login';
                const response = await api.post(fullTerminalLoginUrl, { key: boardCode }, { headers: { 'X-No-Mock': 'true' } });
                const { user: userData, token } = response.data.data;
                login(userData, token);
            }
        } catch (err: any) {
            console.error('Login Error:', err);
            if (err.response?.status === 401 || err.response?.status === 400) {
                setError('Email veya şifre hatalı');
            } else if (err.response?.data?.error) {
                setError(`Sunucu Hatası: ${err.response.data.error}`);
            } else {
                setError('Hata!\n\nSunucu şu an başlatılıyor veya ulaşılamıyor. Lütfen 10-15 saniye bekleyip tekrar deneyin.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleTerminalSetup = async () => {
        if (!boardCode) {
            setError('Lütfen kurulum kodunu giriniz');
            return;
        }
        setLoading(true);
        setError('');
        try {
            // Force LOCAL MODE on
            localStorage.setItem('isLocalMode', 'true');
            // Try to fetch data using boardCode
            const response = await api.get(`/main-companies/code/${boardCode}`, { headers: { 'X-No-Mock': 'false' } });
            if (response.data.success) {
                navigate('/salon-board-terminal', { state: { boardCode } });
            } else {
                setError('Geçersiz kurulum kodu');
            }
        } catch (err: any) {
            setError('Kurulum başlatılamadı. Lütfen kodu kontrol edin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex p-3 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
                        <Layout className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Salon Cebinde</h1>
                    <p className="text-slate-500 mt-2">Yönetim Paneline Hoş Geldiniz</p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100">
                    <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
                        <button
                            onClick={() => setLoginType('email')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${loginType === 'email' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <Mail className="w-4 h-4" />
                            Admin Girişi
                        </button>
                        <button
                            onClick={() => setLoginType('terminal')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${loginType === 'terminal' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <Tablet className="w-4 h-4" />
                            Terminal Modu
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-start gap-3 whitespace-pre-line text-center justify-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {loginType === 'email' ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">E-posta Adresi</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
                                            placeholder="admin@example.com"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">Şifre</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">Terminal / Board Kodu</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={boardCode}
                                        onChange={(e) => setBoardCode(e.target.value.toUpperCase())}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 font-mono tracking-wider"
                                        placeholder="FIRMA-KODU"
                                        required
                                    />
                                </div>
                                <p className="mt-2 text-xs text-slate-500 ml-1">Tablet moduna geçmek için kurulum kodunuzu girin.</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {loginType === 'email' ? 'Giriş Yap' : 'Kayıtlı Terminali Aç'}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {loginType === 'terminal' && (
                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <button
                                onClick={handleTerminalSetup}
                                disabled={loading}
                                className="w-full py-3 px-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-600 font-medium hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                            >
                                <Layout className="w-4 h-4" />
                                Yeni Terminal Kurulumu (İnternetsiz Mod)
                            </button>
                        </div>
                    )}
                </div>

                <p className="text-center mt-8 text-slate-500 text-sm">
                    Bir hesabınız yok mu?{' '}
                    <button className="text-indigo-600 font-semibold hover:underline shadow-none bg-transparent">Kayıt Olun</button>
                </p>
            </div>
        </div>
    );
};

export default Login;
