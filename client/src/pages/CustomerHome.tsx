import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Company } from '../types';

export default function CustomerHome() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [favorites, setFavorites] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [distanceLimit, setDistanceLimit] = useState(50);
    const [showSlider, setShowSlider] = useState(false);

    useEffect(() => {
        const savedFavs = localStorage.getItem('saloon_favorites');
        if (savedFavs) {
            setFavorites(JSON.parse(savedFavs));
        }

        const fetchCompanies = async () => {
            try {
                const res = await api.get('/companies');
                setCompanies(res.data.data);
                setFilteredCompanies([]); // Don't show by default to keep clean
            } catch (err) {
                console.error('Failed to fetch companies', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCompanies();
    }, []);

    const toggleFavorite = (e: React.MouseEvent, id: number) => {
        e.preventDefault();
        e.stopPropagation();

        let newFavs;
        if (favorites.includes(id)) {
            newFavs = favorites.filter(fid => fid !== id);
        } else {
            newFavs = [...favorites, id];
        }
        setFavorites(newFavs);
        localStorage.setItem('saloon_favorites', JSON.stringify(newFavs));
    };

    const applyFilters = (query: string, loc: { lat: number, lng: number } | null, dist: number) => {
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

        const lowerQuery = query.toLowerCase();

        const result = companies.map(c => {
            let distance = undefined;
            if (loc) {
                distance = calculateDistance(loc.lat, loc.lng, c.latitude || 41.0082, c.longitude || 28.9784);
            }
            return { ...c, distance };
        }).filter(c => {
            const matchesSearch = !lowerQuery ||
                c.name.toLowerCase().includes(lowerQuery) ||
                (c.province_name && c.province_name.toLowerCase().includes(lowerQuery)) ||
                (c.district_name && c.district_name.toLowerCase().includes(lowerQuery));

            const matchesDistance = !loc || (c.distance !== undefined && c.distance <= dist);

            return matchesSearch && matchesDistance;
        });

        // Sort by distance if location exists
        if (loc) {
            result.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }

        setFilteredCompanies(result);
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert('Tarayıcınız konum özelliğini desteklemiyor.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const newLoc = { lat: latitude, lng: longitude };
                setLocation(newLoc);
                setShowSlider(true);
                applyFilters(searchQuery, newLoc, distanceLimit);
            },
            () => {
                alert('Konum izni verilmedi.');
            }
        );
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        applyFilters(query, location, distanceLimit);
    };

    const handleDistanceChange = (val: number) => {
        setDistanceLimit(val);
        applyFilters(searchQuery, location, val);
    };

    const openMaps = (e: React.MouseEvent, c: Company) => {
        e.preventDefault();
        e.stopPropagation();
        const addressParts = [c.name, c.address_line, c.district_name, c.province_name].filter(Boolean);
        const query = encodeURIComponent(addressParts.join(' '));
        const url = (c.latitude && c.longitude)
            ? `https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`
            : `https://www.google.com/maps/search/?api=1&query=${query}`;
        window.open(url, '_blank');
    };

    const favoriteCompanies = companies.filter(c => favorites.includes(c.id!));

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white sticky top-0 z-30 shadow-sm">
                <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-900 heading-serif">Saloon</h1>
                </div>
            </header>

            {/* Hero & Search */}
            <div className="bg-gradient-to-br from-pink-600 to-violet-600 text-white pt-12 pb-16 px-4 rounded-b-[2.5rem] shadow-xl shadow-pink-200 relative mb-8">
                <div className="max-w-md mx-auto text-center">
                    <h2 className="text-2xl font-black mb-2 leading-tight">Keşfet, Rezerv Et,<br />Keyfini Çıkar</h2>
                    <p className="text-white/80 text-sm font-medium mb-8">Hayallerindeki bakıma bir adım uzaktasın.</p>

                    <div className="relative group max-w-sm mx-auto">
                        <div className="absolute inset-y-0 left-0 pl-1 index-30 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400 ml-4 group-focus-within:text-pink-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Salon veya şehir ara..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full bg-white text-gray-900 pl-12 pr-4 py-4 rounded-2xl shadow-2xl shadow-black/10 focus:ring-4 focus:ring-white/20 outline-none font-bold text-sm transition-all"
                        />
                    </div>
                </div>

                {/* Floating Location Button */}
                <button
                    onClick={handleGetLocation}
                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white text-pink-600 px-6 py-3 rounded-full font-bold shadow-xl active:scale-95 transition-transform flex items-center gap-2 border border-pink-50 whitespace-nowrap"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <span className="text-xs uppercase tracking-tighter">{location ? 'Bana Yakınlar' : 'Çevremdekiler'}</span>
                </button>
            </div>

            {/* Distance Slider (Visible after location enabled) */}
            {showSlider && location && (
                <div className="max-w-md mx-auto px-6 mt-12 animate-in slide-in-from-top-4 duration-300">
                    <div className="bg-white p-5 rounded-3xl shadow-lg border border-pink-50">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Mesafe Filtresi</span>
                            <span className="text-sm font-black text-pink-600 bg-pink-50 px-3 py-1 rounded-full">{distanceLimit === 50 ? 'Tümü (50 km)' : `${distanceLimit} km`}</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="50"
                            step="1"
                            value={distanceLimit}
                            onChange={(e) => handleDistanceChange(parseInt(e.target.value))}
                            className="w-full h-2 bg-pink-100 rounded-lg appearance-none cursor-pointer accent-pink-600"
                        />
                        <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                            <span>1 km</span>
                            <span>25 km</span>
                            <span>50 km</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Favorites List */}
            {favorites.length > 0 && (
                <div className="max-w-md mx-auto px-4 py-8 pb-0 space-y-4">
                    <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs mb-4">Favorilerim ({favorites.length})</h3>
                    <div className="grid grid-cols-1 gap-4">
                        {favoriteCompanies.map((c: any) => (
                            <Link
                                to={`/book/${c.id}`}
                                key={c.id}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-pink-100 flex items-center gap-4 hover:shadow-md transition-shadow active:scale-[0.98]"
                            >
                                <div className="w-16 h-16 bg-pink-50 text-pink-600 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl relative">
                                    ❤️
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 truncate">{c.name}</h4>
                                    <p className="text-xs text-gray-500 truncate">{c.district_name || 'Merkez'}, {c.province_name || 'İstanbul'}</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Main List */}
            <div className="max-w-md mx-auto px-4 py-8 space-y-4">
                <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs mb-4">
                    {searchQuery || location ? (location ? 'Yakındaki Salonlar' : 'Arama Sonuçları') : ''}
                </h3>

                {loading ? (
                    <div className="text-center py-10 text-gray-400 font-bold animate-pulse">Yükleniyor...</div>
                ) : (
                    filteredCompanies.map((c: any) => (
                        <Link
                            to={`/book/${c.id}`}
                            key={c.id}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow active:scale-[0.98] relative group"
                        >
                            <button
                                onClick={(e) => toggleFavorite(e, c.id)}
                                className="absolute top-2 right-2 p-2 z-10 text-gray-300 hover:text-red-500 transition-colors"
                            >
                                <svg className={`w-6 h-6 ${favorites.includes(c.id) ? 'text-red-500 fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </button>

                            <div className="w-16 h-16 bg-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl">
                                🏢
                            </div>
                            <div className="flex-1 min-w-0 pr-8">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <h4 className="font-bold text-gray-900 truncate">{c.name}</h4>
                                    <button
                                        onClick={(e) => openMaps(e, c)}
                                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Haritada Gör"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 truncate">{c.district_name || 'Merkez'}, {c.province_name || 'İstanbul'}</p>
                                {c.distance !== undefined && (
                                    <p className="text-[10px] font-black text-pink-500 mt-1 uppercase tracking-tighter shadow-sm bg-pink-50/50 inline-block px-1.5 py-0.5 rounded">{(c.distance).toFixed(1)} km mesafede</p>
                                )}
                            </div>
                        </Link>
                    ))
                )}

                {!loading && filteredCompanies.length === 0 && (searchQuery || location) && (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 p-8">
                        <div className="text-4xl mb-4 opacity-20">🔍</div>
                        <p className="text-gray-400 font-bold mb-1">Eşleşen salon bulunamadı.</p>
                        <p className="text-gray-300 text-xs text-medium">Farklı bir kelime deneyebilir veya mesafeyi artırabilirsiniz.</p>
                    </div>
                )}

                {!loading && filteredCompanies.length === 0 && !searchQuery && !location && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-pink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 mb-2">Başlamaya Ne Dersin?</h4>
                        <p className="text-gray-400 text-sm font-medium px-10">Dilediğin salonu yukarıdan ara veya çevrendekileri keşfetmek için butona bas.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
