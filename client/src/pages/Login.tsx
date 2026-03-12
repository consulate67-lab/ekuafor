import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const normalizedEmail = email.toLowerCase().trim();
            const response = await api.post('/auth/login', { email: normalizedEmail, password });
            const { user, token, redirectKey } = response.data.data;
            login(user, token);
            
            // Save keys for panels
            if (user.role === 'company_admin' && redirectKey) {
                localStorage.setItem('company_admin_key', redirectKey);
            } else if (user.role === 'staff' && redirectKey) {
                localStorage.setItem('staff_board_code', redirectKey);
            }

            // Role based redirect
            if (user.role === 'company_admin') {
                navigate('/company-panel');
            } else if (user.role === 'staff') {
                navigate('/dashboard');
            } else if (user.role === 'super_admin') {
                navigate('/dashboard');
            } else {
                navigate('/app');
            }
        } catch (err: any) {
            if (!err.response) {
                setError(`Sunucu şu an başlatılıyor veya ulaşılamıyor. Lütfen 10-15 saniye bekleyip tekrar deneyin. (${api.defaults.baseURL})`);
            } else {
                const apiError = err.response?.data?.error;
                const details = err.response?.data?.details;

                if (details && Array.isArray(details)) {
                    setError(`${apiError}: ${details.map((d: any) => d.message).join(', ')}`);
                } else {
                    setError(apiError || 'Giriş yapılırken bir hata oluştu');
                }
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50">
            {/* Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-200/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="max-w-md w-full px-6 relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-500/20 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
                        <img src="/app-icon.png" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-4xl font-bold heading-serif mb-2 tracking-tight">SaloonTR</h1>
                    <p className="text-gray-500 font-medium">Hoş geldiniz, devam etmek için giriş yapın</p>
                </div>

                <div className="card glass-card">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg animate-shake text-sm">
                            <p className="font-medium">Hata!</p>
                            <p>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">E-posta Adresi</label>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="ornek@mail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5 ml-1">
                                <label className="block text-sm font-semibold text-gray-700">Şifre</label>
                                <a href="#" className="text-xs font-semibold text-[#b45309] hover:text-[#92400e] transition-colors">Şifremi Unuttum</a>
                            </div>
                            <input
                                type="password"
                                className="input-field"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="flex items-center mb-2 ml-1">
                            <input type="checkbox" id="remember" className="w-4 h-4 text-[#1e1b4b] border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" />
                            <label htmlFor="remember" className="ml-2 text-sm text-gray-600 cursor-pointer select-none">Beni hatırla</label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-3.5 mt-2 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Giriş Yapılıyor...
                                </>
                            ) : (
                                'Giriş Yap'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-500">
                            Hesabınız yok mu?{' '}
                            <Link to="/register" className="font-bold text-[#b45309] hover:text-[#92400e] transition-colors">Hemen Kaydolun</Link>
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-400">© 2026 SaloonTR Management System. Tüm hakları saklıdır.</p>
                </div>
            </div>
        </div>
    );
}
