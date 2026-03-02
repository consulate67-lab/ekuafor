import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';

export default function SetupStaff() {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const adminKey = searchParams.get('key');
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [staffCount, setStaffCount] = useState<number>(1);
    const [staffList, setStaffList] = useState<{ first_name: string; last_name: string; phone: string }[]>([]);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!adminKey) {
            alert('Geçersiz bağlantı. Admin şifresi bulunamadı.');
            navigate('/');
        }
    }, [adminKey, navigate]);

    const handleCountSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (staffCount < 1) {
            alert('Lütfen en az 1 personel seçin.');
            return;
        }
        setStaffList(Array(staffCount).fill({ first_name: '', last_name: '', phone: '' }));
        setStep(2);
    };

    const handleStaffChange = (index: number, field: string, value: string) => {
        setStaffList(prev => {
            const newList = [...prev];
            newList[index] = { ...newList[index], [field]: value };
            return newList;
        });
    };

    const handleNextStep = () => {
        const index = step - 2;
        const current = staffList[index];
        if (!current.first_name.trim() || !current.last_name.trim() || !current.phone.trim()) {
            alert('Lütfen bu personelin bilgilerini eksiksiz doldurun.');
            return;
        }
        setStep(step + 1);
    };

    const handleStaffSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Final Validation check
        const isValid = staffList.every(s => s.first_name.trim() && s.last_name.trim() && s.phone.trim());
        if (!isValid) {
            alert('Lütfen tüm personellerin bilgilerini eksiksiz doldurun.');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post(`/companies/${id}/setup-staff`, {
                admin_key: adminKey,
                staffList
            });

            if (res.data.success) {
                setSuccess(true);
            }
        } catch (err: any) {
            alert(err.response?.data?.error || 'Personeller eklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px] animate-pulse" />
                <div className="bg-[#0b1120]/80 backdrop-blur-2xl border border-white/10 w-full max-w-lg rounded-[3rem] shadow-2xl p-10 text-center relative z-10 scale-in-center">
                    <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                        <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20" />
                        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white text-3xl shadow-[0_0_40px_rgba(16,185,129,0.4)] relative z-10">✓</div>
                    </div>
                    <h2 className="text-4xl font-black text-white mb-4 tracking-tighter">Mükemmel!</h2>
                    <p className="text-slate-400 font-medium leading-relaxed mb-10 text-lg">
                        Personelleriniz başarıyla sisteme kaydedildi. Giriş bilgileri telefonlarına <span className="text-white font-bold">SMS</span> olarak gönderildi.
                    </p>
                    <button
                        onClick={() => navigate(`/company-panel?key=${adminKey}`)}
                        className="group relative px-10 py-5 bg-white text-slate-900 rounded-2xl font-black text-lg shadow-[0_20px_40px_-15px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-95 transition-all w-full overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity" />
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            Yönetim Paneline Geç
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </span>
                    </button>
                </div>
            </div>
        );
    }

    const currentStaffIndex = step - 2;

    return (
        <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-pink-600/10 blur-[120px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none animate-pulse" />

            <div className="relative bg-[#0b1120]/80 backdrop-blur-2xl border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 sm:p-12 z-10">
                {/* Step Progress */}
                <div className="flex items-center gap-1.5 mb-10 overflow-hidden">
                    <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-white/10'}`} />
                    {Array.from({ length: staffCount }).map((_, i) => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= (i + 2) ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-white/10'}`} />
                    ))}
                </div>

                <div className="flex justify-center mb-8">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                </div>

                {step === 1 ? (
                    <form onSubmit={handleCountSubmit} className="text-center animate-in fade-in zoom-in-95 duration-500">
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-4">Personel Kurulumu</h2>
                        <p className="text-slate-400 font-medium text-lg leading-relaxed mb-10">
                            Dijital dönüşümün ilk adımı! Salonunuzda kaç uzman personel görev yapıyor? Her birine özel giriş kodu otomatik iletilecek.
                        </p>

                        <div className="mb-12 inline-block relative border-b-2 border-white/5 pb-4 px-8">
                            <label className="block text-xs font-black uppercase tracking-[0.2em] text-indigo-400 mb-6">Personel Sayısı</label>
                            <div className="flex items-center justify-center gap-8">
                                <button type="button" onClick={() => setStaffCount(Math.max(1, staffCount - 1))} className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-2xl hover:bg-white/5 transition-colors">−</button>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    required
                                    value={staffCount}
                                    onChange={e => setStaffCount(parseInt(e.target.value) || 1)}
                                    className="w-24 text-center bg-transparent text-white text-6xl font-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button type="button" onClick={() => setStaffCount(Math.min(50, staffCount + 1))} className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-2xl hover:bg-white/5 transition-colors">+</button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="group relative px-12 py-5 bg-white text-slate-900 rounded-2xl font-black text-xl shadow-[0_20px_40px_-15px_rgba(30,20,50,0.5)] hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto"
                        >
                            Bilgileri Doldurmaya Başla
                        </button>
                    </form>
                ) : (
                    <div className="animate-in fade-in slide-in-from-right-10 duration-500">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tight">Uzman Kadronuz</h2>
                                <p className="text-xs text-indigo-400 font-black uppercase tracking-widest mt-2 bg-indigo-500/10 px-3 py-1.5 rounded-full inline-block">
                                    PERSONEL #{currentStaffIndex + 1} / {staffCount}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setStep(step - 1)}
                                className="h-10 px-4 flex items-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
                                Geri
                            </button>
                        </div>

                        <div className="space-y-6 mb-10">
                            <div className="group bg-white/[0.03] border border-white/5 rounded-3xl p-8 relative overflow-hidden transition-all duration-500">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-pink-500 to-indigo-500" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Adı</label>
                                        <input
                                            type="text"
                                            required
                                            value={staffList[currentStaffIndex]?.first_name || ''}
                                            onChange={e => handleStaffChange(currentStaffIndex, 'first_name', e.target.value)}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-5 py-4 text-white text-sm focus:border-indigo-500/50 outline-none transition-all"
                                            placeholder="Örn: Sibel"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Soyadı</label>
                                        <input
                                            type="text"
                                            required
                                            value={staffList[currentStaffIndex]?.last_name || ''}
                                            onChange={e => handleStaffChange(currentStaffIndex, 'last_name', e.target.value)}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-5 py-4 text-white text-sm focus:border-indigo-500/50 outline-none transition-all"
                                            placeholder="Örn: Kaya"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 space-y-2">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Telefon Numarası</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-xs font-bold border-r border-white/10 pr-3">+90</div>
                                            <input
                                                type="tel"
                                                required
                                                value={staffList[currentStaffIndex]?.phone || ''}
                                                onChange={e => handleStaffChange(currentStaffIndex, 'phone', e.target.value)}
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-4 pl-16 text-white text-sm focus:border-indigo-500/50 outline-none transition-all"
                                                placeholder="5XX XXX XX XX"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            {currentStaffIndex < staffCount - 1 ? (
                                <button
                                    type="button"
                                    onClick={handleNextStep}
                                    className="flex-1 px-10 py-5 bg-white text-slate-900 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                                >
                                    İleri
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                    </svg>
                                </button>
                            ) : (
                                <button
                                    onClick={handleStaffSubmit}
                                    disabled={loading}
                                    className="flex-1 px-10 py-5 bg-gradient-to-r from-pink-600 to-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? 'Kaydediliyor...' : 'Tüm Personelleri Kaydet ve Tamamla'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes scale-in-center {
                    0% { transform: scale(0); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .scale-in-center { animation: scale-in-center 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both; }
            `}</style>
        </div>
    );
}
