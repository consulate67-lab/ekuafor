import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

const Login = () => {
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
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Salon Cebinde</h1>
                    <p className="text-gray-600">{loginType === 'admin' ? 'Yönetici Girişi' : 'Board Girişi'}</p>
                </div>

                <div className="space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    {loginType === 'admin' ? (
                        <form onSubmit={handleAdminLogin} className="space-y-4">
                            <input
                                type="email"
                                placeholder="E-posta"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                            <input
                                type="password"
                                placeholder="Şifre"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Giriş Yap'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleBoardLogin} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Board Kodu (Örn: ABC-123)"
                                value={boardCode}
                                onChange={(e) => setBoardCode(e.target.value.toUpperCase())}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-mono tracking-widest"
                                required
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-900 transition-colors flex items-center justify-center"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Boardu Aç'}
                            </button>
                        </form>
                    )}

                    <div className="pt-4 border-t border-gray-100">
                        <button
                            onClick={() => {
                                setLoginType(loginType === 'admin' ? 'board' : 'admin');
                                setError('');
                            }}
                            className="w-full text-indigo-600 font-medium text-sm hover:underline"
                        >
                            {loginType === 'admin' ? 'Board Kodu ile Giriş Yap' : 'Yönetici Girişine Dön'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
