import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import api from '../lib/api';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
const branchIcon = (revenue: number) => {
    // Dynamic color based on revenue?
    const color = revenue > 10000 ? '#10b981' : revenue > 5000 ? '#f59e0b' : '#3b82f6';
    return L.divIcon({
        className: 'custom-div-icon',
        html: `
            <div style="background-color: ${color}; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>
        `,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
    });
};

export default function MainCompanyReports() {
    const { code } = useParams();
    const [mainCompany, setMainCompany] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, [code]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // 1. Get company by code
            const mcRes = await api.get(`/main-companies/code/${code}`);
            const mc = mcRes.data.data;
            setMainCompany(mc);

            // 2. Get reports
            const reportRes = await api.get(`/main-companies/${mc.id}/reports`);
            setStats(reportRes.data.data.stats);
            setBranches(reportRes.data.data.branches);

        } catch (err: any) {
            setError(err.response?.data?.error || 'Veriler yüklenemedi. Kod geçerli mi?');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse">VERİLER ANALİZ EDİLİYOR...</div>;
    if (error) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-4xl font-black text-white uppercase italic mb-4">Hata Oluştu</h1>
            <p className="text-slate-400 font-bold mb-8">{error}</p>
            <Link to="/" className="bg-white text-slate-950 px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest">Ana Sayfaya Dön</Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
            {/* Glossy Header */}
            <header className="p-8 lg:p-12 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="z-10">
                    <div className="inline-flex items-center gap-2 mb-4 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">CANLI VERİ AKIŞI AKTİF</span>
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-black uppercase italic tracking-tighter leading-none">{mainCompany.name}</h1>
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.3em] mt-4 ml-1">GRUP PERFORMANS VE ANALİZ DASHBOARD</p>
                </div>

                <div className="flex gap-4 z-10">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[2.5rem] min-w-[180px]">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">TOPLAM GELİR</p>
                        <p className="text-3xl font-black text-emerald-400 italic">₺{Number(stats.total_revenue || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[2.5rem] min-w-[180px]">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">TOPLAM RANDEVU</p>
                        <p className="text-3xl font-black text-indigo-400 italic">{stats.total_appointments}</p>
                    </div>
                </div>
            </header>

            <main className="px-8 lg:px-12 pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Map Column */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="h-[600px] bg-slate-900 rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden relative group">
                            <div className="absolute top-8 left-8 z-[500] bg-slate-900/80 backdrop-blur-md border border-white/10 px-6 py-4 rounded-3xl">
                                <h3 className="text-sm font-black uppercase tracking-widest text-white">Şube Dağılım Haritası</h3>
                                <p className="text-[10px] font-bold text-slate-400 mt-1">{branches.length} Aktif Lokasyon</p>
                            </div>

                            <MapContainer
                                center={[39.1, 35.1]} // Center of Turkey
                                zoom={6}
                                style={{ height: '100%', width: '100%' }}
                                className="z-0"
                            >
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                />
                                {branches.map((br: any) => (
                                    br.latitude && br.longitude && (
                                        <Marker
                                            key={br.branch_id}
                                            position={[br.latitude, br.longitude]}
                                            icon={branchIcon(Number(br.revenue))}
                                        >
                                            <Popup className="custom-popup">
                                                <div className="p-3">
                                                    <h4 className="font-black text-slate-900 uppercase text-xs mb-2 border-b border-slate-100 pb-2">{br.branch_name}</h4>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between gap-4">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase">Ciro</span>
                                                            <span className="text-xs font-black text-emerald-600">₺{Number(br.revenue).toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex justify-between gap-4">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase">Randevu</span>
                                                            <span className="text-xs font-black text-indigo-600">{br.appointment_count}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    )
                                ))}
                            </MapContainer>
                        </div>
                    </div>

                    {/* Rankings Column */}
                    <div className="space-y-8">
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-10 rounded-[3rem] h-full flex flex-col">
                            <h3 className="text-xl font-black uppercase tracking-tighter italic mb-8 border-b border-white/5 pb-6">Şube Performans Listesi</h3>
                            <div className="space-y-4 overflow-y-auto max-h-[500px] flex-1 pr-2 no-scrollbar">
                                {branches.map((br: any, index: number) => (
                                    <div key={br.branch_id} className="bg-white/5 border border-white/5 p-5 rounded-[2rem] hover:bg-white/10 transition-all flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${index === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                                                {index + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{br.branch_name}</h4>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{br.province_name || 'Lokasyon Bilgisi Yok'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black italic">₺{Number(br.revenue).toLocaleString()}</p>
                                            <p className="text-[8px] font-black text-slate-500 uppercase">{br.appointment_count} İşlem</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 pt-8 border-t border-white/5">
                                <Link
                                    to="/main-management"
                                    className="block w-full text-center py-4 bg-white text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] transition-all"
                                >
                                    Firma Yönetimine Dön
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Charts Placeholder */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="bg-emerald-500 p-8 rounded-[2.5rem] flex flex-col justify-between min-h-[160px] text-slate-950 shadow-xl shadow-emerald-500/20">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">ŞUBE SAYISI</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-6xl font-black italic tracking-tighter">{stats.branch_count}</p>
                            <span className="text-xs font-black uppercase">Aktif</span>
                        </div>
                    </div>
                    <div className="bg-indigo-500 p-8 rounded-[2.5rem] flex flex-col justify-between min-h-[160px] text-white shadow-xl shadow-indigo-500/20">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">TEKİL MÜŞTERİ</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-6xl font-black italic tracking-tighter">{stats.unique_customers}</p>
                            <span className="text-xs font-black uppercase">Kişi</span>
                        </div>
                    </div>
                    <div className="bg-pink-500 p-8 rounded-[2.5rem] flex flex-col justify-between min-h-[160px] text-white shadow-xl shadow-pink-500/20">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">ORTALAMA CİRO</p>
                        <p className="text-4xl font-black italic italic tracking-tighter">₺{Math.round(Number(stats.total_revenue || 0) / (stats.branch_count || 1)).toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-800 p-8 rounded-[2.5rem] flex flex-col justify-between min-h-[160px] text-white border border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">GRUP VERİMLİLİĞİ</p>
                        <div className="flex items-center gap-4">
                            <p className="text-5xl font-black italic tracking-tighter">%84</p>
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-[84%]"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <style>{`
                .custom-popup .leaflet-popup-content-wrapper {
                    background: white;
                    color: #0f172a;
                    border-radius: 1.5rem;
                    padding: 0;
                    overflow: hidden;
                    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
                }
                .custom-popup .leaflet-popup-content {
                    margin: 0;
                }
                .custom-popup .leaflet-popup-tip {
                    background: white;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
