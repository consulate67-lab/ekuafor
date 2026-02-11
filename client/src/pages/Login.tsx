import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    const [pingStatus, setPingStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle');

    const checkServer = async () => {
        setPingStatus('checking');
        try {
            await axios.get(api.defaults.baseURL + '/health', { timeout: 5000 });
            setPingStatus('online');
        } catch (e) {
            setPingStatus('offline');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', { email, password });
            const { user, token } = response.data.data;
            login(user, token);
            navigate('/');
        } catch (err: any) {
            if (!err.response) {
                setError(`Sunucuya bağlanılamadı. Hedef Adres: ${api.defaults.baseURL}. Lütfen VITE_API_URL Secret ayarını kontrol edin.`);
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
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-200/30 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary-200/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="max-w-md w-full px-6 relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-secondary-600 shadow-xl shadow-primary-500/30 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
                        <span className="text-white text-3xl font-serif">S</span>
                    </div>
                    <h1 className="text-4xl font-bold heading-serif mb-2 tracking-tight">Saloon</h1>
                    <p className="text-gray-500 font-medium">Hoş geldiniz, devam etmek için giriş yapın</p>
                </div>

                <div className="card glass-card">
                    {/* Connectivity Badge */}
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={checkServer}
                            className={`text-[10px] font-bold px-2 py-1 rounded-full transition-all flex items-center gap-1.5 ${pingStatus === 'online' ? 'bg-green-100 text-green-700' :
                                pingStatus === 'offline' ? 'bg-red-100 text-red-700' :
                                    pingStatus === 'checking' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                                        'bg-gray-100 text-gray-500'
                                }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${pingStatus === 'online' ? 'bg-green-500' :
                                pingStatus === 'offline' ? 'bg-red-500' :
                                    'bg-gray-400'
                                }`}></span>
                            API: {
                                pingStatus === 'online' ? 'Aktif' :
                                    pingStatus === 'offline' ? 'Hata' :
                                        pingStatus === 'checking' ? 'Kontrol Ediliyor' : 'Bağlantıyı Test Et'
                            }
                        </button>
                    </div>

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
                                <a href="#" className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors">Şifremi Unuttum</a>
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
                            <input type="checkbox" id="remember" className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer" />
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
                            <Link to="/register" className="font-bold text-secondary-600 hover:text-secondary-700 transition-colors">Hemen Kaydolun</Link>
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-400">© 2026 Saloon Management System. Tüm hakları saklıdır.</p>
                </div>
            </div>
        </div>
    );
}
