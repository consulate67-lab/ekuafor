import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Company } from '../types';
import { Geolocation } from '@capacitor/geolocation';
import { useAuthStore } from '../store/authStore';

export default function CustomerHome() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [favorites, setFavorites] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [distanceLimit, setDistanceLimit] = useState(50);
    const [locating, setLocating] = useState(false);

    // Filter Categories
    const categories = [
        { id: 'all', name: 'Tümü', icon: '✨' },
        { id: 'barber', name: 'Berber', icon: '✂️' },
        { id: 'hair', name: 'Kuaför', icon: '💇‍♀️' },
        { id: 'beauty', name: 'Güzellik', icon: '💅' },
        { id: 'massage', name: 'Masaj', icon: '💆‍♂️' },
        { id: 'kids', name: 'Çocuk', icon: '👶' },
    ];
    const [activeCategory, setActiveCategory] = useState('all');

    const fetchData = async (query?: string, loc?: { lat: number, lng: number } | null) => {
        try {
            const params: any = { is_active: true };
            if (query) params.search = query;
            if (loc) {
                params.lat = loc.lat;
                params.lng = loc.lng;
                params.radius = distanceLimit;
            }

            const res = await api.get('/companies', { params });
            const allCompanies = res.data?.data || [];

            // Client-side distance calculation
            const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
                const R = 6371;
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
            };

            const resultWithDistance = allCompanies.map((c: Company) => {
                let distance = undefined;
                if (loc) {
                    const lat2 = typeof c.latitude === 'string' ? parseFloat(c.latitude) : c.latitude;
                    const lng2 = typeof c.longitude === 'string' ? parseFloat(c.longitude) : c.longitude;
                    distance = calculateDistance(loc.lat, loc.lng, lat2 || 41.0082, lng2 || 28.9784);
                }
                return { ...c, distance };
            });

            setCompanies(resultWithDistance);
            setFilteredCompanies(resultWithDistance.sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0)));
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const savedFavs = localStorage.getItem('saloon_favorites');
        if (savedFavs) setFavorites(JSON.parse(savedFavs));

        const init = async () => {
            await fetchData();
            try {
                const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 3000 });
                const newLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
                setLocation(newLoc);
                fetchData(searchQuery, newLoc);
            } catch (e) {
                console.log('Location fail', e);
            }
        };
        init();
    }, []);

    const toggleFavorite = (e: React.MouseEvent, id: number) => {
        e.preventDefault(); e.stopPropagation();
        const newFavs = favorites.includes(id) ? favorites.filter(fid => fid !== id) : [...favorites, id];
        setFavorites(newFavs);
        localStorage.setItem('saloon_favorites', JSON.stringify(newFavs));
    };

    const favoriteCompanies = companies.filter(c => favorites.includes(c.id!));

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24">
            {/* 1. Header Area (Aesthetic & Personal) */}
            <div className="bg-[#1E1B4B] text-white pt-10 pb-20 px-6 rounded-b-[2.5rem] shadow-2xl relative">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-xl font-bold border-2 border-white/20">
                            {user?.first_name?.charAt(0) || '👤'}
                        </div>
                        <div>
                            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Hoş Geldin,</p>
                            <h2 className="text-lg font-black tracking-tight">{user?.first_name || 'Misafir'} {user?.last_name || ''}</h2>
                        </div>
                    </div>
                </div>

                {/* Search Bar - Integrated with Header */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Salon, hizmet veya stil ara..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); fetchData(e.target.value, location); }}
                        className="w-full bg-white text-gray-900 pl-12 pr-4 py-4 rounded-2xl shadow-xl outline-none font-bold text-sm focus:ring-4 focus:ring-indigo-500/20 transition-all"
                    />
                </div>
            </div>

            {/* 2. Quick Action Icons (Stories Style) */}
            <div className="px-6 -mt-10 mb-8 overflow-x-auto hide-scrollbar flex gap-4">
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`flex-shrink-0 flex flex-col items-center gap-2 group transition-all`}
                    >
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-lg transition-transform active:scale-90 ${activeCategory === cat.id ? 'bg-orange-500 text-white translate-y-[-4px]' : 'bg-white text-gray-400 hover:text-orange-500'}`}>
                            {cat.icon}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${activeCategory === cat.id ? 'text-indigo-950' : 'text-gray-400'}`}>
                            {cat.name}
                        </span>
                    </button>
                ))}
            </div>

            {/* 3. Campaign / Highlights Slider (Compact) */}
            <div className="px-6 mb-8">
                <div className="w-full h-32 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-[1.5rem] relative overflow-hidden shadow-xl border border-white/10">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="relative z-10 p-6 flex flex-col justify-center h-full">
                        <h3 className="text-white font-black text-lg leading-tight">%20 İndirim!<br /><span className="text-orange-400">İlk Randevunda</span></h3>
                        <p className="text-white/60 text-[10px] font-bold mt-1 uppercase tracking-tighter">Kampanya Kodu: SALOON20</p>
                    </div>
                    <div className="absolute right-[-10px] bottom-[-10px] w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                </div>
            </div>

            {/* 4. Horizontal Favorites Section */}
            {favorites.length > 0 && (
                <div className="mb-8">
                    <div className="px-6 flex justify-between items-center mb-4">
                        <h3 className="font-black text-indigo-950 uppercase tracking-[0.2em] text-[10px]">Favori Salonların</h3>
                    </div>
                    <div className="px-6 overflow-x-auto hide-scrollbar flex gap-4">
                        {favoriteCompanies.map(c => (
                            <Link key={c.id} to={`/book/${c.id}`} className="flex-shrink-0 w-40 bg-white p-3 rounded-2xl shadow-md border border-gray-100 group active:scale-95 transition-all">
                                <div className="w-full aspect-square bg-slate-50 rounded-xl mb-3 flex items-center justify-center text-3xl group-hover:bg-indigo-50 transition-colors">🏢</div>
                                <h4 className="font-black text-indigo-950 text-xs truncate">{c.name}</h4>
                                <p className="text-[10px] text-gray-400 font-bold mt-0.5">{c.district_name || 'Merkez'}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* 5. Main Content (List) */}
            <div className="px-6 space-y-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-indigo-950 uppercase tracking-[0.2em] text-[10px]">
                        {location ? 'Yakınındaki Salonlar' : 'Tüm Salonlar'}
                    </h3>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-white/50 animate-pulse rounded-2xl"></div>
                        ))}
                    </div>
                ) : (
                    filteredCompanies.map((c: any) => (
                        <Link
                            key={c.id}
                            to={`/book/${c.id}`}
                            className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100 flex items-center gap-4 group active:scale-[0.98] transition-all relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500 text-white text-[8px] font-black rounded-bl-xl tracking-widest uppercase">PRO</div>

                            <div className="w-20 h-20 bg-indigo-50 text-indigo-900 rounded-2xl flex-shrink-0 flex items-center justify-center text-3xl group-hover:bg-indigo-100 transition-colors">
                                🏙️
                            </div>
                            <div className="flex-1 min-w-0 py-1">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <h4 className="font-black text-indigo-950 text-sm truncate">{c.name}</h4>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold mb-2">
                                    <span>{c.district_name || 'Merkez'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {c.distance !== undefined && (
                                        <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full text-[9px] font-black tracking-tighter">
                                            {(c.distance).toFixed(1)} KM
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            {/* 6. Premium Bottom Navigation (Fixed) */}
            <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-8 py-4 flex justify-between items-center z-50 rounded-t-[2rem] shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
                <button onClick={() => navigate('/')} className="flex flex-col items-center gap-1 text-orange-500">
                    <div className="p-1 px-4 bg-orange-50 rounded-full transition-all">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Keşfet</span>
                </button>
                <button onClick={() => navigate('/appointments')} className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-900 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Randevu</span>
                </button>
                <button onClick={() => navigate('/login')} className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-900 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Hesabım</span>
                </button>
            </div>

            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
