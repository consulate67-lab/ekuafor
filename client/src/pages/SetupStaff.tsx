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

    const handleStaffSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation check
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
            <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4">
                <div className="bg-[#0b1120] border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 text-center">
                    <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white text-3xl shadow-[0_0_30px_rgba(16,185,129,0.5)]">✓</div>
                    </div>
                    <h2 className="text-3xl font-black text-white mb-4">Harika!</h2>
                    <p className="text-slate-400 font-medium leading-relaxed mb-8">
                        Personelleriniz başarıyla sisteme kaydedildi ve kendilerine SMS yoluyla giriş bilgileri iletildi.
                    </p>
                    <button
                        onClick={() => navigate(`/company-panel?key=${adminKey}`)}
                        className="px-8 py-4 bg-white text-slate-900 rounded-full font-black text-lg shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] hover:scale-105 transition-all w-full"
                    >
                        Firma Yönetim Paneline Git
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-pink-600/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

            <div className="relative bg-[#0b1120] border border-white/10 w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 sm:p-10 z-10">
                <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                </div>

                {step === 1 ? (
                    <form onSubmit={handleCountSubmit} className="text-center animate-in fade-in zoom-in-95 duration-300">
                        <h2 className="text-3xl font-black text-white tracking-tight mb-3">Personel Kurulumu</h2>
                        <p className="text-slate-400 font-medium mb-8">
                            Sistem kullanımı için ekibinizi şimdi tanımlayabilirsiniz. Her birine giriş bilgileri otomatik iletilecektir.
                        </p>

                        <div className="mb-8">
                            <label className="block text-sm font-black uppercase tracking-widest text-slate-300 mb-4">Kaç personel tanımlamak istersiniz?</label>
                            <input
                                type="number"
                                min="1"
                                max="50"
                                required
                                value={staffCount}
                                onChange={e => setStaffCount(parseInt(e.target.value) || 1)}
                                className="w-40 text-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-4 text-white text-3xl font-black focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                            />
                        </div>

                        <button
                            type="submit"
                            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-black text-lg transition-all w-full sm:w-auto shadow-xl shadow-indigo-500/20"
                        >
                            Devam Et
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleStaffSubmit} className="animate-in fade-in slide-in-from-right-8 duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">Personel Bilgileri</h2>
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-1">Toplam {staffCount} Personel</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white"
                            >
                                ← Geri Dön
                            </button>
                        </div>

                        <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                            {staffList.map((staff, index) => (
                                <div key={index} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative">
                                    <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-slate-800 border-2 border-[#0b1120] flex items-center justify-center text-xs font-black text-white">
                                        {index + 1}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 gap-y-5">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Adı</label>
                                            <input
                                                type="text"
                                                required
                                                value={staff.first_name}
                                                onChange={e => handleStaffChange(index, 'first_name', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none transition-all"
                                                placeholder="Örn: Ahmet"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Soyadı</label>
                                            <input
                                                type="text"
                                                required
                                                value={staff.last_name}
                                                onChange={e => handleStaffChange(index, 'last_name', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none transition-all"
                                                placeholder="Örn: Yılmaz"
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Telefon Numarası</label>
                                            <input
                                                type="tel"
                                                required
                                                value={staff.phone}
                                                onChange={e => handleStaffChange(index, 'phone', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none transition-all"
                                                placeholder="053X XXX XX XX"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-black text-lg transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Kaydediliyor...' : 'Kaydet ve Kurulumu Tamamla'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
