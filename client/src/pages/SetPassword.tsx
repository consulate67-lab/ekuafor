import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';

export default function SetPassword() {
    const navigate = useNavigate();
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const code = query.get('code');
    const emailFromUrl = query.get('email');

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
            const res = await api.post('/auth/set-password', {
                email,
                code,
                password
            });

            if (res.data.success) {
                setSuccess(true);
                setTimeout(() => navigate('/login'), 3000);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-pink-600/10 blur-[120px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none animate-pulse" />

            <div className="relative bg-[#0b1120]/80 backdrop-blur-2xl border border-white/10 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 sm:p-12 z-10">
                {success ? (
                    <div className="text-center py-8 animate-in fade-in duration-500">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white text-2xl shadow-[0_0_30px_rgba(16,185,129,0.5)]">✓</div>
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Harika!</h2>
                        <p className="text-slate-400 font-medium leading-relaxed">
                            Şifreniz başarıyla oluşturuldu. <br /> Giriş ekranına yönlendiriliyorsunuz...
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-10">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20">
                                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-black text-white tracking-tight mb-2">Şifrenizi Belirleyin</h2>
                            <p className="text-slate-400 font-medium">Lütfen hesabınız için yeni bir şifre oluşturun.</p>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-bold mb-6 text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-2">E-posta</label>
                                <input
                                    type="email"
                                    required
                                    disabled={!!emailFromUrl}
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-indigo-500/50 outline-none transition-all disabled:opacity-50"
                                    placeholder="ornek@mail.com"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-2">Yeni Şifre</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-indigo-500/50 outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-2">Şifre Tekrar</label>
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-indigo-500/50 outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-lg shadow-[0_20px_40px_-15px_rgba(255,255,255,0.2)] hover:scale-[1.02] hover:shadow-[0_25px_50px_-12px_rgba(255,255,255,0.3)] active:scale-95 transition-all mt-4 disabled:opacity-50"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity" />
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {loading ? 'İşleniyor...' : 'Şifreyi Kaydet'}
                                </span>
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
