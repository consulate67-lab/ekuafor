import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authApi } from '../api/business';
import { apiError } from '../api/client';
import { Button } from '../components/ui';
import { homePathFor } from '../lib/routes';
import { storage, StorageKey } from '../lib/storage';
import { useAuthStore } from '../store/authStore';

type Mode = 'email' | 'code';

const inputClass = 'w-full p-4 rounded-2xl border-2 border-slate-100 bg-white font-bold text-slate-900 outline-none focus:border-brand-500';

export default function Login() {
    const navigate = useNavigate();
    const { login, isAuthenticated, user } = useAuthStore();
    const [mode, setMode] = useState<Mode>('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (isAuthenticated && user) return <Navigate to={homePathFor(user.role)} replace />;

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setError('');
        setLoading(true);
        try {
            if (mode === 'email') {
                const { user: u, token } = await authApi.login(email, password);
                login(u, token);
                return;
            }
            const result = await authApi.codeLogin(code);
            if (result.type === 'board' && result.board_key) {
                storage.set(StorageKey.boardKey, result.board_key);
                navigate('/board', { replace: true });
            } else if (result.token && result.user) {
                login(result.user, result.token);
            } else {
                setError('Bu kodla giriş yapılamadı');
            }
        } catch (err) {
            setError(apiError(err, mode === 'email' ? 'E-posta veya şifre hatalı' : 'Kod geçersiz'));
        } finally {
            setLoading(false);
        }
    };

    const switchMode = (next: Mode) => {
        setMode(next);
        setError('');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-5 py-10">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <img src="/app-icon.png" alt="" className="w-16 h-16 mx-auto mb-4 rounded-2xl shadow-lg" />
                    <h1 className="text-2xl font-black text-slate-900">İşletme girişi</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Randevularınızı, masraflarınızı ve raporlarınızı yönetin</p>
                </div>

                <div role="tablist" className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl mb-5">
                    {([['email', 'E-posta ile'], ['code', 'Giriş kodu ile']] as const).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={mode === key}
                            onClick={() => switchMode(key)}
                            className={`py-2.5 rounded-xl text-sm font-black transition ${mode === key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <form onSubmit={submit} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
                    {mode === 'email' ? (
                        <>
                            <label className="block">
                                <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">E-posta</span>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} autoComplete="email" required />
                            </label>
                            <label className="block">
                                <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Şifre</span>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} autoComplete="current-password" required />
                            </label>
                        </>
                    ) : (
                        <label className="block">
                            <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Giriş kodu</span>
                            <input
                                value={code}
                                onChange={e => setCode(e.target.value.toUpperCase())}
                                className={`${inputClass} text-center text-2xl tracking-widest`}
                                placeholder="ABC-1234"
                                autoComplete="one-time-code"
                                autoCapitalize="characters"
                                required
                            />
                            <span className="block text-xs font-medium text-slate-400 mt-2">
                                Yönetici kodunuz onay SMS'inde, personel kodunuz yöneticinizde. Salon ekranı (board) kodu da burada kullanılabilir.
                            </span>
                        </label>
                    )}

                    {error && <p role="alert" className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-sm font-bold">{error}</p>}

                    <Button type="submit" block size="lg" loading={loading}>Giriş yap</Button>
                </form>

                <div className="mt-8 space-y-3 text-center text-sm font-bold">
                    <p className="text-slate-500">
                        İşletmeniz kayıtlı değil mi? <Link to="/web" className="text-brand-600">Ücretsiz başvurun</Link>
                    </p>
                    <p className="text-slate-500">
                        Randevu mu almak istiyorsunuz? <Link to="/app" className="text-brand-600">İşletmeleri keşfedin</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
