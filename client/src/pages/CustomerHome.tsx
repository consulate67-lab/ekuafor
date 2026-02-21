import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Company } from '../types';
import { Geolocation } from '@capacitor/geolocation';

export default function CustomerHome() {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [favorites, setFavorites] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [distanceLimit, setDistanceLimit] = useState(50);
    const [showSlider, setShowSlider] = useState(false);
    const [locating, setLocating] = useState(false);

    // Code Scanner States
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [codeInput, setCodeInput] = useState('');
    const [codeChecking, setCodeChecking] = useState(false);
    const [codeError, setCodeError] = useState('');
    const [codeResult, setCodeResult] = useState<any>(null);
    const [isScanning, setIsScanning] = useState(false);

    const fetchData = async (query?: string, loc?: { lat: number, lng: number } | null, dist?: number) => {
        try {
            const params: any = { is_active: true }; // Onay şartını şimdilik kaldırdık
            if (query) params.search = query;
            if (loc && (showSlider || dist)) {
                params.lat = loc.lat;
                params.lng = loc.lng;
                params.radius = dist || distanceLimit;
            }

            const res = await api.get('/companies', { params });
            const allCompanies = res.data?.data || [];
            setCompanies(allCompanies);

            // Client-side distance calculation for DISPLAY only
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

            let finalResult = resultWithDistance;
            // Eğer konum varsa ve mesafe filtresi aktifse eliyoruz
            if (loc) {
                const threshold = dist || distanceLimit;
                finalResult = resultWithDistance.filter((c: any) =>
                    c.distance === undefined || c.distance <= threshold
                );

                // Yakından uzağa sıralıyoruz
                finalResult.sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));
            }

            setFilteredCompanies(finalResult);
        } catch (err) {
            console.error('Failed to fetch companies', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const savedFavs = localStorage.getItem('saloon_favorites');
        if (savedFavs) {
            setFavorites(JSON.parse(savedFavs));
        }

        const initialFetch = async () => {
            // Request notification permission early
            if ("Notification" in window && Notification.permission === "default") {
                Notification.requestPermission();
            }

            // First display all
            await fetchData();

            // Then try location using Capacitor for better mobile support
            try {
                const position = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 5000
                });
                const { latitude, longitude } = position.coords;
                const newLoc = { lat: latitude, lng: longitude };
                setLocation(newLoc);
                fetchData(searchQuery, newLoc, distanceLimit);
            } catch (err) {
                console.log('Initial geolocation fail', err);
            }
        };
        initialFetch();
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

    const handleGetLocation = async () => {
        if (locating) return;
        setLocating(true);
        try {
            // Mobile devices need explicit permission check/request
            const permission = await Geolocation.checkPermissions();
            if (permission.location !== 'granted') {
                const request = await Geolocation.requestPermissions();
                if (request.location !== 'granted') {
                    setLocating(false);
                    alert('Konum izni verilmedi. Yakınınızdaki salonları görmek için lütfen izin verin.');
                    return;
                }
            }

            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000
            });
            const { latitude, longitude } = position.coords;
            const newLoc = { lat: latitude, lng: longitude };
            setLocation(newLoc);
            setShowSlider(true);
            await fetchData(searchQuery, newLoc, distanceLimit);
        } catch (err) {
            console.error('Position error', err);
            alert('Konum bilgisi şu an alınamadı. Lütfen GPS\'inizin açık olduğundan emin olup tekrar deneyin.');
        } finally {
            setLocating(false);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        fetchData(query, location, distanceLimit);
    };

    const handleDistanceChange = (val: number) => {
        setDistanceLimit(val);
        fetchData(searchQuery, location, val);
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

    const handleCheckCode = async () => {
        if (!codeInput.trim()) return;
        setCodeChecking(true);
        setCodeError('');
        setCodeResult(null);
        try {
            const res = await api.post('/companies/check-code', { code: codeInput.trim().toUpperCase() });
            if (res.data?.success) {
                setCodeResult(res.data.data);
                // Yönlendirme için kısa gecikme (kullanıcı sonucu görsün)
                setTimeout(() => {
                    const data = res.data.data;
                    if (data.type === 'admin') {
                        navigate(data.redirect);
                    } else if (data.type === 'staff') {
                        // JWT token'ı kaydet - Dashboard'a erişim için
                        if (data.token) {
                            localStorage.setItem('token', data.token);
                        }
                        localStorage.setItem('staff_board_code', data.board_code);
                        // Sayfa yenilenmeli ki auth store güncellensin
                        window.location.href = `${import.meta.env.BASE_URL}dashboard`;
                    } else if (data.type === 'board') {
                        localStorage.setItem('salon_board_key', data.board_key);
                        navigate(data.redirect);
                    }
                }, 1200);
            }
        } catch (err: any) {
            setCodeError(err.response?.data?.error || 'Geçersiz kod');
        } finally {
            setCodeChecking(false);
        }
    };

    const openCodeModal = () => {
        setShowCodeModal(true);
        setCodeInput('');
        setCodeError('');
        setCodeResult(null);
        setIsScanning(false);
    };

    const toggleScanner = async () => {
        if (isScanning) {
            setIsScanning(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setIsScanning(true);

            // In a real app, we'd use a library like html5-qrcode here.
            // For now, we'll simulate a scan or just show the video feed.
            // When a code is detected (mocked for demo if no library):
            // setCodeInput(detectedCode);
            // handleCheckCode();

            // Cleanup stream on close
            return () => stream.getTracks().forEach(t => t.stop());
        } catch (err) {
            alert('Kameraya erişilemedi. Lütfen izinleri kontrol edin.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header - Modern & Minimal */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100">
                <div className="max-w-md mx-auto px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-900 to-[#b45309] flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <span className="text-white font-serif text-lg">S</span>
                        </div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">Saloon</h1>
                    </div>
                    <button
                        onClick={openCodeModal}
                        className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center active:scale-95 transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* Hero Section - Streamlined */}
            <div className="bg-gradient-to-br from-[#1e1b4b] to-[#111827] text-white pt-8 pb-12 px-4 rounded-b-[2.5rem] shadow-xl shadow-indigo-200 relative mb-6">
                <div className="max-w-md mx-auto text-center px-2">
                    <h2 className="text-2xl font-black mb-3 leading-tight tracking-tight">Kusursuz Görünüm<br />Burada Başlar.</h2>
                    <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mb-8">En iyi uzmanlar tek bir tıkla yanınızda.</p>

                    <div className="flex items-center gap-3">
                        <div className="relative group flex-1">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 text-white/30 group-focus-within:text-[#b45309] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Salon veya şehir ara..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="w-full bg-white/10 backdrop-blur-xl text-white pl-11 pr-4 py-4 rounded-2xl border border-white/10 focus:ring-2 focus:ring-[#b45309]/50 focus:bg-white/20 outline-none font-bold text-sm transition-all placeholder:text-white/30"
                            />
                        </div>
                        <button
                            onClick={() => setShowSlider(!showSlider)}
                            className={`p-4 rounded-2xl shadow-xl transition-all ${showSlider ? 'bg-[#b45309] text-white' : 'bg-white/10 text-white/40 border border-white/10'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Modern Distance Filter (Integrated) */}
                {showSlider && location && (
                    <div className="max-w-md mx-auto mt-10 animate-in slide-in-from-top-4 duration-500">
                        <div className="bg-white/10 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/10 shadow-2xl">
                            <div className="flex justify-between items-center mb-5">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-5 bg-[#b45309] rounded-full"></div>
                                    <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Mesafe Filtresi</span>
                                </div>
                                <span className="text-xs font-black text-white bg-[#b45309] px-3 py-1 rounded-full shadow-lg shadow-orange-950/20">
                                    {distanceLimit === 50 ? 'Tümü (50 km)' : `${distanceLimit} km`}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="50"
                                step="1"
                                value={distanceLimit}
                                onChange={(e) => handleDistanceChange(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#b45309]"
                            />
                            <div className="flex justify-between mt-3 text-[9px] font-bold text-white/20 uppercase tracking-widest">
                                <span>1 km</span>
                                <span>25 km</span>
                                <span>50 km</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Compact Location Card */}
            <div className="max-w-md mx-auto px-4 -mt-8 relative z-10 mb-6">
                <button
                    onClick={handleGetLocation}
                    disabled={locating}
                    className="w-full bg-white rounded-3xl p-4 shadow-xl shadow-slate-200/50 flex items-center justify-between group active:scale-[0.98] transition-all border border-slate-50"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-[#1e1b4b] rounded-xl flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                            {locating ? <div className="w-4 h-4 border-2 border-[#1e1b4b] border-t-transparent rounded-full animate-spin" /> : '📍'}
                        </div>
                        <div className="text-left">
                            <p className="text-slate-900 text-[13px] font-black">{locating ? 'Aranıyor...' : (location ? 'Konum Algılandı' : 'Yakınındakileri Bul')}</p>
                            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest leading-none mt-1">{locating ? 'Salonlar yükleniyor' : (location ? 'En yakın sonuçlar' : 'Uzmanları keşfet')}</p>
                        </div>
                    </div>
                    {!locating && (
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                            <svg className="w-4 h-4 text-slate-300 group-hover:text-[#b45309] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    )}
                </button>
            </div>

            {/* Horizontal Favorites - Modern Way */}
            {favorites.length > 0 && (
                <div className="max-w-md mx-auto py-2">
                    <div className="flex items-center justify-between px-6 mb-3">
                        <h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Favorilerim</h3>
                        <span className="bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full text-[9px] font-black">❤️ {favorites.length}</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto px-6 pb-4 hide-scrollbar">
                        {favoriteCompanies.map((c: any) => (
                            <Link
                                to={`/book/${c.id}`}
                                key={c.id}
                                className="flex-shrink-0 w-28 bg-white rounded-3xl p-3 shadow-lg shadow-slate-200/30 border border-slate-50 text-center group active:scale-95 transition-all"
                            >
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl mx-auto mb-2 group-hover:bg-orange-50 transition-colors">
                                    💈
                                </div>
                                <h4 className="font-black text-slate-900 text-[10px] truncate">{c.name}</h4>
                                <p className="text-slate-400 text-[8px] font-bold mt-0.5">{c.district_name || 'Merkez'}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Main List */}
            <div className="max-w-md mx-auto px-4 py-8 space-y-4">
                <h3 className="font-black text-gray-900 uppercase tracking-widest text-[10px] mb-4">
                    {location ? `${distanceLimit} km İçindeki Salonlar` : 'Tüm Salonlar'}
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
                                    <p className="text-[10px] font-black text-[#1e1b4b] mt-1 uppercase tracking-tighter shadow-sm bg-indigo-50 inline-block px-1.5 py-0.5 rounded">{(c.distance).toFixed(1)} km mesafede</p>
                                )}
                            </div>
                        </Link>
                    ))
                )}

                {!loading && filteredCompanies.length === 0 && (
                    <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 p-10">
                        <div className="text-5xl mb-6 opacity-30">🔍</div>
                        <p className="text-slate-400 font-bold mb-2">Eşleşen salon bulunamadı.</p>
                        <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">Arama kelimesini veya mesafeyi değiştirin</p>
                    </div>
                )}
            </div>

            {/* Persistent Bottom Navigation - Premium Design */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[360px] z-[50]">
                <nav className="bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] px-2 py-3 flex items-center justify-around shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/10">
                    <button
                        onClick={() => {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            setSearchQuery('');
                            fetchData();
                        }}
                        className="flex flex-col items-center justify-center w-14 h-14 group"
                    >
                        <div className="w-11 h-11 bg-white/5 rounded-2xl flex items-center justify-center text-xl active:scale-90 transition-all group-hover:bg-white/10 border border-white/5">
                            🏠
                        </div>
                    </button>

                    {/* Floating Center Favorites Button */}
                    <div className="relative -mt-12 flex flex-col items-center">
                        <button
                            onClick={() => {
                                if (favorites.length > 0) {
                                    window.scrollTo({ top: 150, behavior: 'smooth' });
                                }
                            }}
                            className="bg-gradient-to-br from-[#b45309] to-orange-500 rounded-full flex items-center justify-center text-3xl shadow-[0_10px_25px_rgba(180,83,9,0.5)] border-4 border-[#111827] active:scale-95 transition-all text-white relative z-10"
                            style={{ width: '68px', height: '68px' }}
                        >
                            ❤️
                        </button>
                    </div>

                    <Link
                        to="/my-appointments"
                        className="flex flex-col items-center justify-center w-14 h-14 group"
                    >
                        <div className="w-11 h-11 bg-white/5 rounded-2xl flex items-center justify-center text-xl active:scale-90 transition-all group-hover:bg-white/10 border border-white/5">
                            📅
                        </div>
                    </Link>
                </nav>
            </div>

            {/* Content Bottom Spacer to avoid overlap */}
            <div className="h-32"></div>

            {/* Code Entry Modal */}
            {showCodeModal && (
                <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCodeModal(false)}>
                    <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-10 shadow-2xl" onClick={e => e.stopPropagation()}
                        style={{ animation: 'slideUp 0.3s ease-out' }}>
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-200">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900">Kod ile Giriş</h2>
                            <p className="text-slate-400 text-sm mt-1">Yönetici veya çalışan kodunuzu girin</p>
                        </div>

                        <div className="relative mb-4">
                            <input
                                type="text"
                                value={codeInput}
                                onChange={e => setCodeInput(e.target.value.toUpperCase())}
                                onKeyDown={e => e.key === 'Enter' && handleCheckCode()}
                                placeholder="ADM-XXX-XXXX veya XXX-XXXX"
                                className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 text-center text-xl font-black text-slate-900 tracking-[0.1em] outline-none transition-all focus:border-amber-500"
                                autoFocus
                                autoComplete="off"
                                spellCheck="false"
                            />
                            <button
                                onClick={toggleScanner}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isScanning ? 'bg-red-500 text-white' : 'bg-white text-slate-400 shadow-sm'}`}
                            >
                                {isScanning ? '✕' : '📷'}
                            </button>
                        </div>

                        {isScanning && (
                            <div className="mb-4 bg-black rounded-2xl overflow-hidden aspect-square flex items-center justify-center relative">
                                <video
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover"
                                    ref={el => {
                                        if (el && isScanning) {
                                            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                                                .then(s => el.srcObject = s);
                                        }
                                    }}
                                />
                                <div className="absolute inset-0 border-2 border-amber-500/50 m-12 rounded-2xl animate-pulse flex items-center justify-center">
                                    <div className="w-full h-0.5 bg-amber-500 absolute top-1/2 animate-bounce"></div>
                                </div>
                                <p className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-white/70 font-bold uppercase tracking-widest">QR Kodu Ortaya Getirin</p>
                            </div>
                        )}

                        {codeError && (
                            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-bold text-center mb-4 animate-pulse">
                                ❌ {codeError}
                            </div>
                        )}

                        {codeResult && (
                            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-4 rounded-2xl text-center mb-4">
                                <div className="text-3xl mb-2">✅</div>
                                <p className="font-black text-base">
                                    {codeResult.type === 'admin' && `${codeResult.company_name} - Yönetici Paneli`}
                                    {codeResult.type === 'staff' && `${codeResult.staff_name} - ${codeResult.company_name}`}
                                    {codeResult.type === 'board' && `${codeResult.company_name} - Salon Board`}
                                </p>
                                <p className="text-emerald-500 text-xs font-bold mt-1 animate-pulse">Yönlendiriliyor...</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCodeModal(false)}
                                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-base active:scale-95 transition-all"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleCheckCode}
                                disabled={codeChecking || !codeInput.trim()}
                                className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-black text-base active:scale-95 transition-all shadow-lg shadow-amber-200 disabled:opacity-50"
                            >
                                {codeChecking ? 'Kontrol Ediliyor...' : 'Giriş Yap'}
                            </button>
                        </div>

                        <p className="text-center text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-widest">
                            QR kodu okutun veya kodu elle yazın
                        </p>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
