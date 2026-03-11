import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function LandingPage() {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        password: '',
        address_line: '',
        city: '',
        district: '',
        latitude: null as number | null,
        longitude: null as number | null,
        target_genders: [] as string[],
    });

    const handleGetLocation = () => {
        setLocating(true);
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData(prev => ({
                        ...prev,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    }));
                    setLocating(false);
                },
                (error) => {
                    console.error('Konum alinamadi:', error);
                    alert('Konum alınamadı. Lütfen tarayıcı izinlerinizi kontrol edin.');
                    setLocating(false);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            alert('Tarayıcınız konum özelliğini desteklemiyor.');
            setLocating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const normalizedFormData = {
                ...formData,
                email: formData.email.toLowerCase().trim()
            };
            const res = await api.post('/companies/register', normalizedFormData);
            if (res.data.success) {
                const { verification_code } = res.data.data;
                const systemPhone = "+908503058349"; // Tam uluslararası format

                // Cihaz tipine göre SMS ayırıcı (iOS '?' yerine '&' veya bazen ';' bekleyebilir)
                // Ancak standart olarak '?' iOS 8+ ve Android için genellikle çalışır.
                // En garantisi platform tespiti yapmaktır:
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                const separator = isIOS ? '&' : '?';
                const smsUrl = `sms:${systemPhone}${separator}body=${verification_code}`;

                setSuccess(true);

                // Kısa bir süre sonra yönlendir
                setTimeout(() => {
                    window.location.href = smsUrl;
                }, 2000);

                setTimeout(() => {
                    setIsModalOpen(false);
                    setSuccess(false);
                    setFormData({ name: '', phone: '', email: '', password: '', address_line: '', city: '', district: '', latitude: null, longitude: null, target_genders: [] });
                }, 6000);
            }
        } catch (err: any) {
            alert(err.response?.data?.error || 'Kayıt sırasında bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-[#020817] text-white overflow-hidden selection:bg-pink-500 selection:text-white">
            {/* Background effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-pink-600/20 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />

            {/* Navbar */}
            <nav className="relative z-10 flex items-center justify-between px-6 py-8 max-w-7xl mx-auto">
                <div className="flex items-center gap-3 cursor-pointer">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-pink-500/20">
                        <img src="/app-icon.png" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-2xl font-black tracking-tight text-white">saloontr.com</span>
                </div>
                <div className="flex items-center gap-4">
                    {/* Auth actions removed per request */}
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 animate-fade-in-up">
                    <span className="flex w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Yeni Nesil Güzellik Ekosistemi</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 max-w-4xl bg-gradient-to-br from-white via-white to-slate-400 text-transparent bg-clip-text leading-tight animate-fade-in-up animation-delay-100">
                    Salonunuzu geleceğe <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">taşıyın.</span>
                </h1>

                <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed font-medium animate-fade-in-up animation-delay-200">
                    Saloontr ile randevularınızı yönetin, personellerinizi takip edin ve Iyzico pazaryeri entegrasyonuyla ödemelerinizi anında alın. Dijital dönüşümünüze bugün başlayın.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up animation-delay-300">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="group relative px-8 py-4 bg-white text-slate-900 rounded-full font-black text-lg shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] hover:scale-105 active:scale-95 transition-all w-full sm:w-auto overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                        <span className="relative z-10 flex items-center gap-2">
                            Sisteme Kayıt Ol
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </span>
                    </button>

                    <button
                        onClick={() => navigate('/app')}
                        className="px-8 py-4 bg-white/5 text-white border border-white/10 rounded-full font-bold text-lg hover:bg-white/10 active:scale-95 transition-all w-full sm:w-auto backdrop-blur-sm"
                    >
                        Uygulamaya Git
                    </button>
                </div>

                {/* Stats / Trust indicators */}
                <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl w-full border-t border-white/10 pt-12 animate-fade-in-up animation-delay-400">
                    <div className="flex flex-col items-center">
                        <span className="text-3xl font-black text-white">100+</span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Aktif Salon</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-3xl font-black text-white">50k+</span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Aylık Randevu</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-3xl font-black text-white">%100</span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Güvenli Ödeme</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-3xl font-black text-white">7/24</span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Bulut Desteği</span>
                    </div>
                </div>
            </main>

            {/* Registration Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-2 pt-4 sm:p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => !loading && setIsModalOpen(false)}></div>
                    <div className="relative bg-[#0b1120] border border-white/10 w-full max-w-lg max-h-full sm:max-h-[95vh] overflow-y-auto scrollbar-hide rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl p-4 sm:p-10 animate-in zoom-in-95 duration-300">
                        {/* Close button */}
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 sm:w-10 sm:h-10 bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {success ? (
                            <div className="text-center py-12 animate-in fade-in duration-500">
                                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white text-3xl shadow-[0_0_30px_rgba(16,185,129,0.5)]">✓</div>
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2">Başvurunuz Alındı!</h3>
                                <p className="text-slate-400 font-medium leading-relaxed">
                                    Lütfen açılan SMS ekranından <strong className="text-white">mesajı gönderin</strong>. Mesajınız ulaştığında firmanız otomatik olarak onaylanacaktır.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-2 sm:mb-8">
                                    <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-500 items-center justify-center mb-6 shadow-lg shadow-pink-500/20">
                                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight mb-0 sm:mb-2 pt-1 sm:pt-0">Firmamızı Kaydet</h2>
                                    <p className="hidden sm:block text-xs sm:text-sm text-slate-400 font-medium leading-tight mb-2 sm:mb-0">Saloontr'da yerinizi almak için formu doldurun.</p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                                        <div>
                                            <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 sm:mb-1.5 ml-1">E-posta Adresi</label>
                                            <input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-3 text-xs sm:text-base text-white placeholder:text-slate-600 focus:border-indigo-500 transition-all outline-none"
                                                placeholder="admin@salon.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 sm:mb-1.5 ml-1">Giriş Şifresi</label>
                                            <input
                                                type="password"
                                                required
                                                value={formData.password}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-3 text-xs sm:text-base text-white placeholder:text-slate-600 focus:border-indigo-500 transition-all outline-none"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 sm:mb-1.5 ml-1">Firma Adı</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-3 text-xs sm:text-base text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                                            placeholder="Örn: Saloon Güzellik Merkezi"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 sm:mb-1.5 ml-1">Telefon Numarası (SMS Gönderilecek)</label>
                                        <input
                                            type="tel"
                                            required
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-3 text-xs sm:text-base text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                                            placeholder="053X XXX XX XX"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 sm:mb-2 ml-1">Hizmet Verilen Müşteri Tipi</label>
                                        <div className="flex flex-wrap gap-1.5 sm:gap-3">
                                            {['Kadın', 'Erkek', 'Çocuk', 'Güzellik Merkezi'].map((gender) => (
                                                <label key={gender} className="relative flex items-center justify-center cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        className="peer sr-only"
                                                        checked={formData.target_genders.includes(gender)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setFormData(prev => ({ ...prev, target_genders: [...prev.target_genders, gender] }));
                                                            } else {
                                                                setFormData(prev => ({ ...prev, target_genders: prev.target_genders.filter(g => g !== gender) }));
                                                            }
                                                        }}
                                                    />
                                                    <div className="px-2 py-1 sm:px-4 sm:py-2 bg-slate-900 border border-slate-800 rounded-md sm:rounded-xl text-[9px] sm:text-xs font-bold text-slate-400 peer-checked:bg-indigo-500/20 peer-checked:border-indigo-500 peer-checked:text-indigo-400 transition-all select-none group-hover:bg-slate-800">
                                                        {gender}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                        <div>
                                            <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 sm:mb-1.5 ml-1">İl</label>
                                            <input
                                                type="text"
                                                value={formData.city}
                                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-3 text-xs sm:text-base text-white placeholder:text-slate-600 focus:border-indigo-500 transition-all outline-none"
                                                placeholder="İstanbul"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 sm:mb-1.5 ml-1">İlçe</label>
                                            <input
                                                type="text"
                                                value={formData.district}
                                                onChange={e => setFormData({ ...formData, district: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-3 text-xs sm:text-base text-white placeholder:text-slate-600 focus:border-indigo-500 transition-all outline-none"
                                                placeholder="Şişli"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 sm:mb-1.5 ml-1">Açık Adres</label>
                                        <textarea
                                            rows={2}
                                            value={formData.address_line}
                                            onChange={e => setFormData({ ...formData, address_line: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-3 text-xs sm:text-base text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none resize-none"
                                            placeholder="Cadde, Sokak, No..."
                                        />
                                    </div>

                                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-2.5 sm:p-4">
                                        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                            <label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Harita Konumu</label>
                                            {(formData.latitude && formData.longitude) ? (
                                                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-1.5 sm:px-2 py-0.5 rounded">Alındı</span>
                                            ) : (
                                                <span className="text-[8px] sm:text-[10px] stroke-amber-400 font-black uppercase tracking-widest text-amber-500">Gerekli</span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleGetLocation}
                                            disabled={locating || (formData.latitude !== null && formData.longitude !== null)}
                                            className="w-full py-1.5 sm:py-2.5 rounded-lg border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500 hover:text-white text-[9px] sm:text-xs font-black uppercase tracking-widest transition-all focus:outline-none flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-indigo-400"
                                        >
                                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            {locating ? 'Konum Aranıyor...' : ((formData.latitude && formData.longitude) ? 'Konum Tanımlandı' : 'Konumu Al (GPS)')}
                                        </button>
                                        <p className="hidden sm:block text-[8px] sm:text-[9px] text-slate-500 font-medium mt-1.5 sm:mt-2 text-center leading-tight">
                                            Haritada bulunabilmek için konum onayı zorunludur.
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || !formData.latitude}
                                        className="w-full py-2.5 sm:py-4 mt-0.5 sm:mt-2 bg-gradient-to-r from-pink-600 to-indigo-600 text-white rounded-xl font-black text-[10px] sm:text-sm uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {loading ? 'Gönderiliyor...' : 'Başvuruyu Tamamla'}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
