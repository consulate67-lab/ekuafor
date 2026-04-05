import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

export default function Login() {
    const [loginType, setLoginType] = useState<'email' | 'board'>('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [boardCode, setBoardCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (loginType === 'email') {
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
                if (user.role === 'company_admin' || user.role === 'admin') {
                    navigate('/company-panel', { replace: true });
                } else if (user.role === 'staff') {
                    navigate('/dashboard', { replace: true });
                } else if (user.role === 'super_admin') {
                    navigate('/main-management', { replace: true });
                } else {
                    navigate('/app', { replace: true });
                }
            } else {
                // Board Code Login
                const response = await api.post('/companies/check-code', {
                    code: boardCode.toUpperCase().trim()
                });
                const { type, token, redirect, staff_name, company_name, board_code, company_id, user_id, photo } = response.data.data;

                if (type === 'staff' || type === 'admin') {
                    // Create a mock user object for store if it's staff
                    const user = {
                        id: user_id || 0,
                        first_name: staff_name?.split(' ')[0] || company_name || 'Kullanıcı',
                        last_name: staff_name?.split(' ').slice(1).join(' ') || 'Admin',
                        role: type === 'staff' ? 'staff' : 'company_admin',
                        company_id: company_id,
                        photo: photo
                    };

                    login(user as any, token);

                    if (type === 'staff') {
                        localStorage.setItem('staff_board_code', board_code);
                    } else if (type === 'admin') {
                        localStorage.setItem('company_admin_key', boardCode.toUpperCase().trim());
                    }

                    navigate(redirect, { replace: true });
                } else if (type === 'board') {
                    // Salon Board doesn't necessarily need a full user login in the store, 
                    // but we redirect to it.
                    navigate(redirect, { replace: true });
                }
            }
        } catch (err: any) {
            console.error('Login Error:', err);
            if (!err.response) {
                setError(`Sunucu şu an başlatılıyor veya ulaşılamıyor. Lütfen 10-15 saniye bekleyip tekrar deneyin.`);
            } else {
                const apiError = err.response?.data?.error;
                const details = err.response?.data?.details;

                if (details && Array.isArray(details)) {
                    setError(`${apiError}: ${details.map((d: any) => d.message).join(', ')}`);
                } else {
                    setError(apiError || 'Giriş yapılırken bir hata oluştu. Kodun doğruluğunu kontrol edin.');
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleTerminalSetup = async () => {
        if (!boardCode) {
            setError('Lütfen kurulum için Board Anahtarınızı girin.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            // 1. Verify Key & Get Company Data
            const res = await api.post('/companies/board-login', { board_key: boardCode.toUpperCase().trim() });
            if (!res.data.success) throw new Error('Geçersiz anahtar.');

            const companyData = res.data.data;
            const compId = companyData.id;

            // 2. Fetch EVERYTHING for offline use
            const [staffRes, servRes, pkgRes, deptRes] = await Promise.all([
                api.get(`/companies/${compId}/employees`, { headers: { 'X-No-Mock': 'true' } }),
                api.get('/services', { params: { company_id: compId }, headers: { 'X-No-Mock': 'true' } }),
                api.get('/packages', { params: { company_id: compId }, headers: { 'X-No-Mock': 'true' } }),
                api.get('/departments', { params: { company_id: compId }, headers: { 'X-No-Mock': 'true' } })
            ]);

            // 3. Save to Local Database (localStorage)
            localStorage.setItem('saloon_companies', JSON.stringify([companyData]));
            localStorage.setItem('saloon_users', JSON.stringify(staffRes.data.data || []));
            localStorage.setItem('saloon_services', JSON.stringify(servRes.data.data || []));
            localStorage.setItem('saloon_packages', JSON.stringify(pkgRes.data.data || []));
            localStorage.setItem('saloon_departments', JSON.stringify(deptRes.data.data || []));
            
            // 4. Switch to Local Mode
            localStorage.setItem('isLocalMode', 'true');
            localStorage.setItem('salon_board_key', 'terminal-mode');
            localStorage.setItem('salon_board_company_id', compId.toString());

            // Add a temporary terminal token for auth store
            login({ id: 1, first_name: companyData.name || 'Terminal', last_name: 'Modu', role: 'company_admin', company_id: compId } as any, 'terminal-token');

            alert('✅ TERMINAL KURULUMU BAŞARILI!\n\nFirmanızın tüm verileri tablete indirildi. Artık internet olmasa bile kullanabilirsiniz.');
            navigate('/board');

        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Kurulum başarısız. Lütfen internetinizi kontrol edin.');
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
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-500/20 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
                        <img src="/app-icon.png" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-4xl font-bold heading-serif mb-2 tracking-tight">Salon Cebinde</h1>
                    <p className="text-gray-500 font-medium">Hoş geldiniz, devam etmek için giriş yapın</p>
                </div>

                <div className="card glass-card p-0 overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-100">
                        <button
                            onClick={() => { setLoginType('email'); setError(''); }}
                            className={`flex-1 py-4 text-sm font-bold transition-all ${loginType === 'email' ? 'text-[#1e1b4b] border-b-2 border-indigo-600 bg-white' : 'text-gray-400 hover:text-gray-600 bg-gray-50'}`}
                        >
                            📧 E-posta Girişi
                        </button>
                        <button
                            onClick={() => { setLoginType('board'); setError(''); }}
                            className={`flex-1 py-4 text-sm font-bold transition-all ${loginType === 'board' ? 'text-[#1e1b4b] border-b-2 border-indigo-600 bg-white' : 'text-gray-400 hover:text-gray-600 bg-gray-50'}`}
                        >
                            🔑 Board Kodu
                        </button>
                    </div>

                    {/* Terminal Mode Quick Access (Always visible or in tabs) */}
                    <div className="bg-amber-500/5 px-8 pt-6">
                        <button
                            onClick={() => {
                                if (confirm('Terminal (Yerel) moduna geçilsin mi? Tüm verileriniz bu cihaza kaydedilecektir.')) {
                                    localStorage.setItem('isLocalMode', 'true');
                                    localStorage.setItem('salon_board_key', 'terminal-mode');
                                    localStorage.setItem('salon_board_company_id', '1');
                                    // Mock Login
                                    login({ id: 1, first_name: 'Terminal', last_name: 'Modu', role: 'company_admin', created_at: new Date().toISOString() } as any, 'terminal-token');
                                    navigate('/board');
                                }
                            }}
                            className="w-full py-3 bg-white border-2 border-amber-500/20 rounded-2xl text-amber-600 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all shadow-sm active:scale-95"
                        >
                            📟 Terminal Modu (İnternetsiz)
                        </button>
                    </div>

                    <div className="p-8">
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg animate-shake text-sm">
                                <p className="font-medium">Hata!</p>
                                <p>{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {loginType === 'email' ? (
                                <>
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
                                </>
                            ) : (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Board / Yönetim Kodu</label>
                                    <input
                                        type="text"
                                        className="input-field text-center text-xl font-black tracking-widest uppercase"
                                        placeholder="XXX-XXXX"
                                        value={boardCode}
                                        onChange={(e) => setBoardCode(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                    <div className="mt-4 flex flex-col gap-3">
                                        <p className="text-[10px] text-gray-400 text-center uppercase font-bold tracking-widest">Kişisel board kodunuzu girin</p>
                                        
                                        <div className="pt-4 border-t border-gray-100">
                                            <button 
                                                type="button"
                                                onClick={handleTerminalSetup}
                                                className="w-full py-3 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100 hover:bg-indigo-100 transition-colors shadow-sm active:scale-95 transition-all"
                                            >
                                                📟 İnternetsiz Kullanım (Kurulum Yap)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {loginType === 'email' && (
                                <div className="flex items-center mb-2 ml-1">
                                    <input type="checkbox" id="remember" className="w-4 h-4 text-[#1e1b4b] border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" />
                                    <label htmlFor="remember" className="ml-2 text-sm text-gray-600 cursor-pointer select-none">Beni hatırla</label>
                                </div>
                            )}

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
                </div>

                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-400">© 2026 Salon Cebinde Management System. Tüm hakları saklıdır.</p>
                </div>
            </div>
        </div>
    );
}
