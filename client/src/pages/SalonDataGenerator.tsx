import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

interface Salon {
    osm_id: number;
    name: string;
    type: string;
    phone: string;
    website: string;
    address: string;
    city: string;
    district: string;
    lat: number;
    lon: number;
}

export default function SalonDataGenerator() {
    const [city, setCity] = useState('');
    const [district, setDistrict] = useState('');
    const [salons, setSalons] = useState<Salon[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchSalons = async () => {
        if (!city.trim()) {
            setError('Lütfen bir şehir giriniz (Örn: İstanbul)');
            return;
        }
        setError('');
        setLoading(true);
        setSalons([]);
        setSelectedIds([]);

        try {
            const response = await api.get('/generator/overpass', {
                params: { city, district }
            });
            if (response.data.success) {
                setSalons(response.data.data);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Veri çekilirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (selectedIds.length === 0) return;

        setImporting(true);
        setError('');
        setSuccess('');

        try {
            const selectedSalons = salons.filter(s => selectedIds.includes(s.osm_id));
            const response = await api.post('/generator/import-salons', {
                salons: selectedSalons
            });

            if (response.data.success) {
                setSuccess(response.data.message);
                // Listenin güncellenmesi veya temizlenmesi
                setSalons(prev => prev.filter(s => !selectedIds.includes(s.osm_id)));
                setSelectedIds([]);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'İçe aktarma sırasında hata oluştu');
        } finally {
            setImporting(false);
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedIds.length === salons.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(salons.map(s => s.osm_id));
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div>
                        <Link to="/companies" className="text-emerald-600 hover:text-emerald-700 text-xs font-bold uppercase tracking-widest mb-1 inline-block">
                            ← Firmalar
                        </Link>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">
                            Salon Veri Oluşturucu <span className="text-emerald-500 font-normal not-italic text-sm lowercase">OpenStreetMap + Overpass</span>
                        </h1>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search Panel */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Şehir (Zorunlu)</label>
                            <input
                                type="text"
                                value={city}
                                onChange={e => setCity(e.target.value)}
                                placeholder="Örn: İstanbul"
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">İlçe (Opsiyonel)</label>
                            <input
                                type="text"
                                value={district}
                                onChange={e => setDistrict(e.target.value)}
                                placeholder="Örn: Beşiktaş"
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            />
                        </div>
                        <button
                            onClick={fetchSalons}
                            disabled={loading}
                            className={`w-full bg-slate-900 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-sm shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    Aranıyor...
                                </>
                            ) : 'Verileri Yakala'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-2xl mb-6 font-bold text-sm flex items-center gap-2">
                        <span className="text-xl">⚠️</span> {error}
                    </div>
                )}

                {success && (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-6 py-4 rounded-2xl mb-6 font-bold text-sm flex items-center gap-2">
                        <span className="text-xl">✅</span> {success}
                    </div>
                )}

                {/* Results */}
                {salons.length > 0 && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={selectAll}
                                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedIds.length === salons.length ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        {selectedIds.length === salons.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                                    </button>
                                </div>
                                <div className="h-8 w-px bg-slate-100 hidden md:block"></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seçilen Salon</span>
                                    <span className="text-sm font-black text-slate-900 uppercase tracking-tighter mt-0.5">
                                        {selectedIds.length} <span className="text-slate-300 font-normal">/</span> {salons.length}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleImport}
                                disabled={selectedIds.length === 0 || importing}
                                className={`w-full md:w-auto bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-3 ${importing || selectedIds.length === 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                            >
                                {importing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        Aktarılıyor...
                                    </>
                                ) : (
                                    <>
                                        <span>📥</span>
                                        Sisteme Aktar
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {salons.map(salon => (
                                <div
                                    key={salon.osm_id}
                                    onClick={() => toggleSelect(salon.osm_id)}
                                    className={`group relative bg-white rounded-[2rem] p-6 border-2 transition-all cursor-pointer hover:shadow-xl hover:shadow-slate-200/50 ${selectedIds.includes(salon.osm_id) ? 'border-emerald-500 bg-emerald-50/10' : 'border-white'}`}
                                >
                                    {/* Selection Checkbox */}
                                    <div className={`absolute top-6 right-6 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedIds.includes(salon.osm_id) ? 'bg-emerald-500 border-emerald-500 scale-110' : 'bg-slate-50 border-slate-100'}`}>
                                        {selectedIds.includes(salon.osm_id) && (
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>

                                    <div className="flex flex-col h-full">
                                        <div className="mb-4">
                                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md tracking-tighter mb-2 inline-block ${salon.type === 'Güzellik Salonu' ? 'bg-indigo-100 text-indigo-700' : 'bg-pink-100 text-pink-700'}`}>
                                                {salon.type}
                                            </span>
                                            <h3 className="text-lg font-black text-slate-900 leading-tight group-hover:text-emerald-600 transition-colors uppercase tracking-tighter">
                                                {salon.name}
                                            </h3>
                                        </div>

                                        <div className="space-y-3 mt-auto">
                                            <div className="flex items-start gap-3">
                                                <span className="text-sm opacity-40">📍</span>
                                                <p className="text-xs font-bold text-slate-500 leading-relaxed italic line-clamp-2">
                                                    {salon.address || 'Adres bilgisi bulunamadı'}
                                                </p>
                                            </div>
                                            {salon.phone && (
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm opacity-40">📞</span>
                                                    <p className="text-xs font-black text-slate-700 tracking-widest">{salon.phone}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-300 uppercase italic">OSM ID: {salon.osm_id}</span>
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">{salon.city}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {salons.length === 0 && !loading && !error && (
                    <div className="py-32 text-center">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
                            <span className="text-5xl">🛰️</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic mb-4">Uydudan Veri Bekleniyor</h2>
                        <p className="text-slate-400 font-bold max-w-sm mx-auto leading-relaxed">
                            Şehir ve ilçe girerek Türkiye genelindeki tüm salonları anlık olarak tarayabilir ve sisteme entegre edebilirsiniz.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
