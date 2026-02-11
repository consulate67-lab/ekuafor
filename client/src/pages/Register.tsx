import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

export default function Register() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: 'company_admin' // Varsayılan olarak işletme sahibi
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/register', formData);
            const { user, token } = response.data.data;
            login(user, token);
            navigate('/');
        } catch (err: any) {
            if (!err.response) {
                setError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
            } else {
                setError(err.response?.data?.error || 'Kayıt sırasında bir hata oluştu');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 py-12 px-4">
            {/* Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-200/30 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary-200/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="max-w-md w-full relative z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-secondary-600 shadow-xl shadow-primary-500/30 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
                        <span className="text-white text-3xl font-serif">S</span>
                    </div>
                    <h1 className="text-3xl font-bold heading-serif mb-2 tracking-tight">Hesap Oluştur</h1>
                    <p className="text-gray-500 font-medium text-sm">Saloon ailesine katılın ve işletmenizi yönetmeye başlayın</p>
                </div>

                <div className="card glass-card">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg animate-shake text-sm">
                            <p className="font-medium">Hata!</p>
                            <p>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1 uppercase">Ad</label>
                                <input
                                    type="text"
                                    name="first_name"
                                    className="input-field py-2"
                                    placeholder="Ahmet"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1 uppercase">Soyad</label>
                                <input
                                    type="text"
                                    name="last_name"
                                    className="input-field py-2"
                                    placeholder="Yılmaz"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 ml-1 uppercase">E-posta Adresi</label>
                            <input
                                type="email"
                                name="email"
                                className="input-field py-2"
                                placeholder="ornek@mail.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 ml-1 uppercase">Telefon</label>
                            <input
                                type="tel"
                                name="phone"
                                className="input-field py-2"
                                placeholder="05xx xxx xx xx"
                                value={formData.phone}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 ml-1 uppercase">Şifre</label>
                            <input
                                type="password"
                                name="password"
                                className="input-field py-2"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 ml-1 uppercase">Hesap Türü</label>
                            <select
                                name="role"
                                className="input-field py-2 appearance-none bg-gray-50"
                                value={formData.role}
                                onChange={handleChange}
                            >
                                <option value="company_admin">İşletme Sahibi</option>
                                <option value="customer">Müşteri</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-3 mt-4 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Kaydediliyor...
                                </>
                            ) : (
                                'Hesap Oluştur'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-500">
                            Zaten hesabınız var mı?{' '}
                            <Link to="/login" className="font-bold text-primary-600 hover:text-primary-700 transition-colors">Giriş Yapın</Link>
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
