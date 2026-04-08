import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

export default function CustomerLogin() {
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const firstName = '';
    const lastName = '';
    const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: Profile Info (if needed)
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [timer, setTimer] = useState(0);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    useEffect(() => {
        let interval: any;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!phone || phone.length < 10) {
            setError('Lütfen geçerli bir telefon numarası giriniz.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/send-otp', { phone });
            setStep(2);
            setTimer(60);
        } catch (err: any) {
            setError(err.response?.data?.error || 'OTP gönderilirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!code || code.length !== 6) {
            setError('Lütfen 6 haneli kodu giriniz.');
            return;
        }

        setLoading(true);
        try {
            const deviceId = localStorage.getItem('device_id');
            const response = await api.post('/auth/verify-otp', {
                phone,
                code,
                first_name: firstName,
                last_name: lastName,
                device_id: deviceId
            });

            const { user, token } = response.data.data;

            // Eğer yeni kullanıcıysa ve isim soyisim yoksa, 3. adıma geç (veya burada dur)
            // Ama backend 'Müşteri' 'Yeni' diye oluşturuyor zaten.

            login(user, token);

            // Return URL or default to home
            const redirect = searchParams.get('redirect') || '/';
            navigate(redirect);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Kod doğrulanamadı. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 py-12 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100 rounded-full blur-[100px] opacity-50 animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-100 rounded-full blur-[100px] opacity-40 animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="max-w-sm w-full relative z-10">
                <div className="text-center mb-10">
                    <div className="w-24 h-24 rounded-[2rem] overflow-hidden flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-200 rotate-6 hover:rotate-0 transition-transform duration-500">
                        <img src="/app-icon.png" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase">Salon Cebinde</h1>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">Hızlı ve Kolay Randevu</p>
                </div>

                <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-white">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100 flex items-center gap-3">
                            <span className="text-lg">⚠️</span>
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <form onSubmit={handleSendOtp} className="space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-xl font-black text-slate-900 mb-2">Giriş Yap</h2>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest px-4">Telefon numaranız ile saniyeler içinde giriş yapın</p>
                            </div>

                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Telefon Numarası</label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400">+90</span>
                                    <input
                                        type="tel"
                                        placeholder="5XX XXX XX XX"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        className="w-full bg-slate-50 border-2 border-slate-100 p-5 pl-14 rounded-2xl font-black text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all tracking-widest"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || phone.length < 10}
                                className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 disabled:opacity-30 active:scale-95 transition-all"
                            >
                                {loading ? 'Gönderiliyor...' : 'Doğrulama Kodu Gönder'}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-xl font-black text-slate-900 mb-1">Kodu Girin</h2>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-indigo-600 font-black">+90 {phone}</span> nolu telefona gönderilen 6 haneli kodu yazın
                                </p>
                            </div>

                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Doğrulama Kodu</label>
                                <input
                                    type="text"
                                    placeholder="XXXXXX"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-slate-900 text-center text-3xl outline-none focus:border-indigo-500 focus:bg-white transition-all tracking-[0.5em]"
                                    required
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || code.length !== 6}
                                className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 disabled:opacity-30 active:scale-95 transition-all"
                            >
                                {loading ? 'Doğrulanıyor...' : 'Giriş Yap'}
                            </button>

                            <div className="text-center">
                                {timer > 0 ? (
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Yeni kod için {timer} saniye</p>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleSendOtp}
                                        className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:underline"
                                    >
                                        Tekrar Kod Gönder
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest py-2"
                            >
                                Numara Değiştir
                            </button>
                        </form>
                    )}
                </div>

                <div className="mt-8 text-center space-y-4">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] leading-relaxed">
                        Giriş yaparak <span className="text-slate-400">Kullanım Koşullarını</span> ve <span className="text-slate-400">Gizlilik Politikasını</span> kabul etmiş olursunuz.
                    </p>

                    <div className="pt-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                        >
                            Kullanıcı Girişi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
