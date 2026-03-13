import { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function SetPassword() {
    const navigate = useNavigate();
    const location = useLocation();
    const { code: paramCode, email: paramEmail } = useParams<{ code: string; email: string }>();
    const login = useAuthStore(state => state.login);
    const query = new URLSearchParams(location.search);
    
    const code = paramCode || query.get('code');
    const emailFromUrl = paramEmail || query.get('email');

    const [email, setEmail] = useState(emailFromUrl || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Şifreler eşleşmiyor');
            return;
        }

        if (password.length < 6) {
            setError('Şifre en az 6 karakter olmalıdır');
            return;
        }

        setLoading(true);
        try {
            const normalizedEmail = email.toLowerCase().trim();
            const res = await api.post('/auth/set-password', {
                email: normalizedEmail,
                code,
                password
            });

            if (res.data.success) {
                const { token, user } = res.data;
                login(user, token);
                setSuccess(true);
                
                // Redirect to dashboard for all roles as requested
                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Bir hata oluştu. Lütfen kodunuzu ve emailinizi kontrol edin.');
        } finally {
            setLoading(false);
        }
    };

    if (!code || !emailFromUrl) {
        return (
            <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-8 rounded-[2rem] text-center max-w-sm">
                    <h2 className="text-xl font-black mb-2 italic">GEÇERSİZ BAĞLANTI</h2>
                    <p className="text-sm font-medium opacity-70">SMS ile gelen bağlantı hatalı veya eksik. Lütfen tekrar deneyin.</p>
                    <button onClick={() => navigate('/login')} className="mt-6 px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all font-bold">Giriş Ekranına Dön</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
            {/* Dynamic Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[150px] animate-pulse pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-pink-600/20 blur-[150px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

            <div className="relative w-full max-w-md z-10">
                <div className="text-center mb-10 animate-fade-in-up">
                    <div className="w-24 h-24 rounded-[2rem] overflow-hidden flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/40 rotate-3 hover:rotate-0 transition-all duration-500">
                        <img src="/app-icon.png" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Salon Cebinde<span className="text-indigo-500">.</span></h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Personel Aktivasyon</p>
                </div>

                <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl p-8 sm:p-12 overflow-hidden relative">
                    {/* Glassmorphism shine */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    {success ? (
                        <div className="text-center py-8 animate-success-in">
                            <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                                <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20" />
                                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white text-3xl shadow-[0_0_40px_rgba(16,185,129,0.5)]">✓</div>
                            </div>
                            <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Hoş Geldiniz!</h2>
                            <p className="text-slate-400 font-medium leading-relaxed mb-6">
                                Şifreniz başarıyla oluşturuldu. Salon yönetimine hazırsınız.
                            </p>
                            <div className="flex items-center justify-center gap-2 text-indigo-400 font-bold text-sm">
                                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                Giriş ekranına gidiliyor...
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-10 block">
                                <h2 className="text-xl font-black text-white mb-2">Şifre Belirleyin</h2>
                                <p className="text-sm text-slate-400 font-medium">Lütfen hesabınız için güvenli bir şifre oluşturun.</p>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider mb-8 text-center animate-shake">
                                    <span className="mr-2">⚠️</span> {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">E-posta Adresi</label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            required
                                            disabled={!!emailFromUrl}
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-indigo-500 outline-none transition-all disabled:opacity-50 font-medium"
                                            placeholder="ornek@mail.com"
                                        />
                                        {!!emailFromUrl && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Yeni Şifre</label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-indigo-500 outline-none transition-all font-medium"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Şifre Tekrar</label>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-indigo-500 outline-none transition-all font-medium"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/20 hover:scale-[1.02] hover:shadow-indigo-500/30 active:scale-95 transition-all mt-4 disabled:opacity-50 overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {loading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Kaydediliyor...
                                            </>
                                        ) : 'Şifreyi Belirle'}
                                    </span>
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <div className="mt-8 text-center animate-fade-in-up delay-300">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">© 2026 Salon Cebinde MANAGEMENT SYSTEMS</p>
                </div>
            </div>

            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
                
                @keyframes success-in {
                    0% { transform: scale(0.9); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-success-in { animation: success-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake { animation: shake 0.2s ease-in-out infinite; }
            `}</style>
        </div>
    );
}
