import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { Company } from '../types';
import { Geolocation } from '@capacitor/geolocation';
import { Camera } from '@capacitor/camera';

// Saloon - V1.9.6 - QR Scanner Fix
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
    const [selectedGender, setSelectedGender] = useState<string | null>(null);
    const [sort, setSort] = useState<'rating' | 'reviews'>('rating');
    const { login: setLogin, isAuthenticated, user } = useAuthStore();
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [permissions, setPermissions] = useState<any>({
        location: 'unknown',
        camera: 'unknown'
    });

    // Code Scanner States
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [codeInput, setCodeInput] = useState('');
    const [codeChecking, setCodeChecking] = useState(false);
    const [codeError, setCodeError] = useState('');
    const [codeResult, setCodeResult] = useState<any>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const isScanningRef = useRef(false);

    const fetchData = async (query?: string, loc?: { lat: number, lng: number } | null, dist?: number) => {
        try {
            const params: any = { is_active: true, exclude_parent: true };
            if (query) params.search = query;
            if (loc && (showSlider || dist)) {
                params.lat = loc.lat;
                params.lng = loc.lng;
                params.radius = dist || distanceLimit;
            }
            if (selectedGender) {
                params.gender = selectedGender;
            }
            if (sort) {
                params.sort = sort;
            }

            const res = await api.get('/companies', { params });
            const allCompanies = res.data?.data || [];
            setCompanies(allCompanies);

            // Haversine formula for precise spherical distance
            const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
                const R = 6371.071; // Earth's radius in km - more precise for local
                const rLat1 = lat1 * Math.PI / 180;
                const rLat2 = lat2 * Math.PI / 180;
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;

                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(rLat1) * Math.cos(rLat2) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);

                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
            };

            const resultWithDistance = allCompanies.map((c: Company) => {
                let distance = undefined;
                if (loc) {
                    // Critical: Ensure coordinate values are strictly parsed as floats
                    const lat2 = c.latitude ? parseFloat(String(c.latitude)) : null;
                    const lng2 = c.longitude ? parseFloat(String(c.longitude)) : null;

                    if (lat2 !== null && lng2 !== null && !isNaN(lat2) && !isNaN(lng2) && lat2 !== 0 && lng2 !== 0) {
                        distance = calculateDistance(loc.lat, loc.lng, lat2, lng2);
                    }
                }
                return { ...c, distance };
            });

            let finalResult = resultWithDistance;

            // Apply strict distance filtering if location is available and slider is active or limit is set
            if (loc) {
                const threshold = dist || distanceLimit;
                // Only show results within threshold. If distance is unknown, we hide it to prevent "ghost" results far away.
                finalResult = resultWithDistance.filter((c: any) =>
                    c.distance !== undefined && c.distance <= threshold
                );

                // Sort primarily by distance (closest first)
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
        if (isAuthenticated && (user?.role === 'staff' || user?.role === 'company_admin' || user?.role === 'super_admin')) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, user, navigate]);

    useEffect(() => {
        checkPermissions();
        const savedFavs = localStorage.getItem('saloon_favorites');
        if (savedFavs) {
            setFavorites(JSON.parse(savedFavs));
        }

        const initialFetch = async () => {
            // Push Notification Permission Check for first load
            if ("Notification" in window && Notification.permission === "default") {
                Notification.requestPermission();
            }

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
                fetchData(searchQuery, null, distanceLimit);
            }
        };
        initialFetch();
    }, []);

    const checkPermissions = async () => {
        try {
            const locPerm = await Geolocation.checkPermissions();
            const camPerm = await Camera.checkPermissions();
            setPermissions({
                location: locPerm.location,
                camera: camPerm.camera
            });
        } catch (e) {
            console.error('Permission check failed', e);
        }
    };

    const requestPermission = async (type: 'location' | 'camera') => {
        try {
            if (type === 'location') {
                const res = await Geolocation.requestPermissions();
                setPermissions((p: any) => ({ ...p, location: res.location }));
            } else if (type === 'camera') {
                const res = await Camera.requestPermissions();
                setPermissions((p: any) => ({ ...p, camera: res.camera }));
            }
        } catch (e) {
            console.error(`Request permission ${type} failed`, e);
        }
    };

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
            const permission = await Geolocation.checkPermissions();
            if (permission.location !== 'granted') {
                const request = await Geolocation.requestPermissions();
                if (request.location !== 'granted') {
                    setLocating(false);
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
            await fetchData(searchQuery, newLoc, distanceLimit);
        } catch (err) {
            console.error('Position error', err);
        } finally {
            setLocating(false);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        fetchData(query, location, distanceLimit);
    };

    const handleDistanceChange = (dist: number) => {
        setDistanceLimit(dist);
        fetchData(searchQuery, location, dist);
    };

    useEffect(() => {
        fetchData(searchQuery, location, distanceLimit);
    }, [selectedGender, sort]);


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
                        if (data.is_license_expired) {
                            setCodeError('Lisans süreniz dolmuştur. Lütfen ödeme yapın.');
                            setCodeResult(null);
                        } else {
                            navigate(data.redirect, { replace: true });
                        }
                    } else if (data.type === 'staff') {
                        if (data.is_license_expired) {
                            setCodeError('Firmanın lisans süresi dolmuştur.');
                            setCodeResult(null);
                        } else {
                            if (data.token) {
                                setLogin({
                                    id: data.user_id,
                                    email: `${data.board_code}@staff.local`,
                                    first_name: data.staff_name.split(' ')[0],
                                    last_name: data.staff_name.split(' ').slice(1).join(' '),
                                    role: 'staff',
                                    company_id: data.company_id,
                                    photo: data.photo
                                } as any, data.token);
                            }
                            localStorage.setItem('staff_board_code', data.board_code);
                            navigate('/dashboard', { replace: true });
                        }
                    } else if (data.type === 'board') {
                        localStorage.setItem('salon_board_key', data.board_key);
                        navigate(data.redirect, { replace: true });
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
            isScanningRef.current = false;
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
            return;
        }

        setIsScanning(true);
        isScanningRef.current = true;
        setCodeChecking(false);
        setCodeError('');

        try {
            // Enhanced permissions check for both Web and Native
            try {
                const perm = await Camera.checkPermissions();
                if (perm.camera !== 'granted') {
                    const req = await Camera.requestPermissions();
                    if (req.camera !== 'granted') {
                        setIsScanning(false);
                        isScanningRef.current = false;
                        setCodeError('Kamera izni verilmedi. Lütfen ayarlardan izin verin.');
                        return;
                    }
                }
            } catch (e) {
                console.log('Native permission fail, falling back to browser prompts');
            }

            // Multi-constraint attempt for maximum compatibility
            const constraints = [
                { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
                { video: { facingMode: 'environment' } },
                { video: true }
            ];

            let stream = null;
            for (const constraint of constraints) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraint);
                    if (stream) break;
                } catch (e) {
                    console.log(`Constraint fail:`, constraint);
                }
            }

            if (!stream) {
                throw new Error('Hiçbir kamera kaynağına erişilemedi.');
            }

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.setAttribute("playsinline", "true");

                // Force play
                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {
                        // Fallback to onloadedmetadata
                        if (videoRef.current) {
                            videoRef.current.onloadedmetadata = () => {
                                videoRef.current?.play().catch(e => console.error("Video play failed", e));
                            };
                        }
                    });
                }

                requestAnimationFrame(scanLoop);
            }

        } catch (err: any) {
            console.error('Camera error:', err);
            setCodeChecking(false);
            setIsScanning(false);
            isScanningRef.current = false;

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setCodeError('Kamera izni reddedildi. Lütfen ayarlardan izin verin.');
            } else {
                setCodeError('Kameraya erişilemedi: ' + err.message);
            }
        }
    };

    const scanLoop = async () => {
        if (!isScanningRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
            requestAnimationFrame(scanLoop);
            return;
        }

        // 1. Try Native Barcode Detector API if available (Modern Chrome/Android/iOS)
        // @ts-ignore
        if (window.BarcodeDetector) {
            try {
                // @ts-ignore
                const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13', 'aztec'] });
                const barcodes = await barcodeDetector.detect(video);
                if (barcodes.length > 0) {
                    const code = barcodes[0].rawValue;
                    handleScanSuccess(code);
                    return;
                }
            } catch (e) {
                console.log('Native BarcodeDetector fail, falling back to jsQR');
            }
        }

        // 2. Fallback to jsQR
        // @ts-ignore
        if (!window.jsQR) {
            console.error('jsQR missing');
            requestAnimationFrame(scanLoop);
            return;
        }

        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // @ts-ignore
            const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "attemptBoth",
            });

            if (code) {
                handleScanSuccess(code.data);
                return;
            }
        }

        requestAnimationFrame(scanLoop);
    };

    const handleScanSuccess = (codeData: string) => {
        setIsScanning(false);
        isScanningRef.current = false;
        setCodeInput(codeData);
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }

        // Feedback
        try { window.navigator?.vibrate?.(100); } catch (e) { }

        // Short delay to show the scanned code in input before checking
        setTimeout(() => handleCheckCodeWithCode(codeData), 100);
    };

    const handleCheckCodeWithCode = async (c: string) => {
        setCodeChecking(true);
        setCodeError('');
        setCodeResult(null);
        try {
            const res = await api.post('/companies/check-code', { code: c.trim().toUpperCase() });
            if (res.data?.success) {
                setCodeResult(res.data.data);
                setTimeout(() => {
                    const data = res.data.data;
                    if (data.type === 'admin') {
                        if (data.is_license_expired) {
                            setCodeError('Lisans süreniz dolmuştur.');
                            setCodeResult(null);
                        } else {
                            navigate(data.redirect, { replace: true });
                        }
                    } else if (data.type === 'staff') {
                        if (data.is_license_expired) {
                            setCodeError('Lisans süresi dolmuştur.');
                            setCodeResult(null);
                        } else {
                            if (data.token) {
                                setLogin({
                                    id: data.user_id,
                                    email: `${data.board_code}@staff.local`,
                                    first_name: data.staff_name.split(' ')[0],
                                    last_name: data.staff_name.split(' ').slice(1).join(' '),
                                    role: 'company_admin',
                                    company_id: data.company_id,
                                    photo: data.photo
                                } as any, data.token);
                            }
                            localStorage.setItem('staff_board_code', data.board_code);
                            navigate('/dashboard', { replace: true });
                        }
                    } else if (data.type === 'board') {
                        localStorage.setItem('salon_board_key', data.board_key);
                        navigate(data.redirect, { replace: true });
                    }
                }, 1200);
            }
        } catch (err: any) {
            setCodeError(err.response?.data?.error || 'Geçersiz kod');
        } finally {
            setCodeChecking(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header - Modern & Minimal - Optimized for mobile notches */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100"
                style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
                <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-900 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <span className="text-white font-serif text-xl font-bold">S</span>
                        </div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tighter">Saloon</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setShowSettingsModal(true); checkPermissions(); }}
                            className="w-11 h-11 bg-slate-50 text-slate-500 rounded-2xl flex items-center justify-center active:scale-90 transition-all border border-slate-100 shadow-sm"
                            title="Ayarlar"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                        <button
                            onClick={openCodeModal}
                            className="w-11 h-11 bg-slate-50 text-slate-500 rounded-2xl flex items-center justify-center active:scale-90 transition-all border border-slate-100 shadow-sm"
                            title="Kod ile Giriş"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section - Streamlined for Mobile */}
            <div className="bg-gradient-to-br from-[#1e1b4b] to-[#111827] text-white pt-6 pb-10 px-4 rounded-b-[2rem] shadow-xl shadow-indigo-200 relative mb-4">
                <div className="max-w-md mx-auto text-center px-1">
                    <h2 className="text-xl font-black mb-2 leading-tight tracking-tight">Kusursuz Görünüm<br />Burada Başlar.</h2>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-6">En iyi uzmanlar tek bir tıkla yanınızda.</p>

                    <div className="flex items-center gap-2">
                        <div className="relative group flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 text-white/30 group-focus-within:text-[#b45309] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Salon veya şehir ara..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="w-full bg-white/10 backdrop-blur-xl text-white pl-10 pr-4 py-3.5 rounded-xl border border-white/10 focus:ring-2 focus:ring-[#b45309]/50 focus:bg-white/20 outline-none font-bold text-sm transition-all placeholder:text-white/30"
                            />
                        </div>
                        <button
                            onClick={() => {
                                if (!location && !showSlider) handleGetLocation();
                                setShowSlider(!showSlider);
                            }}
                            className={`p-3.5 rounded-xl shadow-xl transition-all active:scale-95 ${showSlider ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/40 border border-white/10'}`}
                        >
                            <svg className={`w-5 h-5 ${locating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Modern Distance Filter (Integrated) - Compact Mobile Version */}
                {showSlider && (
                    <div className="max-w-md mx-auto mt-4 animate-in slide-in-from-top-4 duration-500">
                        <div className="bg-white/10 backdrop-blur-2xl p-4 rounded-[1.5rem] border border-white/10 shadow-2xl">
                            <div className="flex justify-between items-center mb-3">
                                <button
                                    onClick={handleGetLocation}
                                    className="flex items-center gap-2 group"
                                >
                                    <div className={`w-1.5 h-4 rounded-full transition-colors ${location ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                                    <span className="text-[9px] font-black text-white uppercase tracking-[0.1em] group-active:scale-95 transition-all">
                                        {location ? 'Konum Açık' : (locating ? '...' : 'Konumunu Kullan')}
                                    </span>
                                </button>
                                <span className={`text-[9px] font-black text-white px-2 py-0.5 rounded-full shadow-lg ${location ? 'bg-indigo-600' : 'bg-white/10 text-white/40'}`}>
                                    {location ? (distanceLimit === 50 ? 'Tümü' : `${distanceLimit} km`) : 'GPS Kapalı'}
                                </span>
                            </div>
                            {location && (
                                <input
                                    type="range"
                                    min="1"
                                    max="50"
                                    step="1"
                                    value={distanceLimit}
                                    onChange={(e) => handleDistanceChange(parseInt(e.target.value))}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            )}
                            <div className="flex justify-between mt-2 text-[8px] font-bold text-white/20 uppercase tracking-widest">
                                <span>1 km</span>
                                <span>50 km</span>
                            </div>

                            <div className="mt-4 border-t border-white/5 pt-3">
                                <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Cinsiyet</p>
                                <div className="flex gap-1.5">
                                    {[
                                        { id: null, label: 'Tümü', icon: '✨' },
                                        { id: 'Erkek', label: 'Erkek', icon: '🧔' },
                                        { id: 'Kadın', label: 'Kadın', icon: '👩' },
                                        { id: 'Çocuk', label: 'Çocuk', icon: '🧒' }
                                    ].map(g => (
                                        <button
                                            key={g.id || 'all'}
                                            onClick={() => setSelectedGender(g.id)}
                                            className={`flex-1 py-1.5 px-1 rounded-xl flex flex-col items-center gap-0.5 transition-all text-[8px] font-black border uppercase tracking-tighter ${selectedGender === g.id
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                                }`}
                                        >
                                            <span className="text-sm">{g.icon}</span>
                                            {g.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
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
                                <p className="text-slate-400 text-[8px] font-bold mt-0.5">{c.district || 'Merkez'}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Main List Section */}
            <main className="max-w-md mx-auto px-6 py-4 space-y-4">
                <div className="flex flex-col gap-4">
                    <div className="inline-flex p-1 bg-slate-100/50 rounded-2xl self-center">
                        <button
                            onClick={() => setSort('rating')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-500 ${sort === 'rating' ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100/50 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <span className="text-xs">⭐</span>
                            En İyi
                        </button>
                        <button
                            onClick={() => setSort('reviews')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-500 ${sort === 'reviews' ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100/50 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <span className="text-xs">🔥</span>
                            En Çok Yorumlanan
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-10 text-gray-400 font-bold animate-pulse">Yükleniyor...</div>
                ) : (
                    filteredCompanies.map((c: any) => (
                        <div
                            key={c.id}
                            className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-xl transition-all active:scale-[0.98] relative group overflow-hidden"
                            onClick={() => navigate(`/book/${c.id}`)}
                        >
                            {/* Premium Shadow & Reflection Layer */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-50" />

                            {/* Vertical Action Stack - Right Side */}
                            <div className="absolute top-4 right-4 flex flex-col items-center gap-3 z-10">
                                <button
                                    onClick={(e) => toggleFavorite(e, c.id)}
                                    className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all shadow-lg active:scale-90 ${favorites.includes(c.id) ? 'bg-rose-500 text-white shadow-rose-200 ring-4 ring-rose-50' : 'bg-white text-slate-300 hover:text-rose-500 border border-slate-100'}`}
                                >
                                    <svg className={`w-5 h-5 ${favorites.includes(c.id) ? 'fill-current' : 'fill-none'}`} stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </button>

                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.name} ${c.address_line || ''} ${c.district || ''} ${c.city || ''}`)}`}
                                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.open(e.currentTarget.href, '_blank'); }}
                                    className="w-10 h-10 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-2xl transition-all hover:bg-indigo-600 hover:text-white shadow-md shadow-indigo-100 border border-indigo-100 active:scale-90"
                                    title="Yol Tarifi"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </a>

                                {c.phone && (
                                    <a
                                        href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.open(e.currentTarget.href, '_blank'); }}
                                        className="w-10 h-10 flex items-center justify-center bg-green-50 text-green-600 rounded-2xl transition-all hover:bg-green-600 hover:text-white shadow-md shadow-green-100 border border-green-100 active:scale-90"
                                        title="WhatsApp"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                        </svg>
                                    </a>
                                )}
                            </div>

                            {/* Company Branding */}
                            <div className="w-20 h-20 rounded-[1.5rem] flex-shrink-0 flex items-center justify-center shadow-inner border border-slate-200/50 group-hover:scale-105 transition-transform overflow-hidden relative bg-slate-100">
                                <img
                                    src={
                                        (c.genders && c.genders.includes('Kadın'))
                                            ? 'https://images.pexels.com/photos/3993472/pexels-photo-3993472.jpeg?auto=compress&cs=tinysrgb&w=400'
                                            : ((c.genders && c.genders.includes('Erkek'))
                                                ? 'https://images.pexels.com/photos/1813272/pexels-photo-1813272.jpeg?auto=compress&cs=tinysrgb&w=400'
                                                : 'https://images.pexels.com/photos/705255/pexels-photo-705255.jpeg?auto=compress&cs=tinysrgb&w=400')
                                    }
                                    alt={c.name}
                                    className="w-full h-full object-cover absolute inset-0 z-10"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                                {/* Fallback Emoji if image fails */}
                                <div className="absolute inset-0 flex items-center justify-center text-4xl z-0">
                                    {(c.genders && c.genders.includes('Kadın')) ? '👩‍🦰' : ((c.genders && c.genders.includes('Erkek')) ? '🧔' : '💈')}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-20 pointer-events-none"></div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pr-12">
                                <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[8px] font-black uppercase tracking-widest mb-1.5">{c.type || 'Hizmet Noktası'}</span>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <h4 className="font-black text-slate-900 truncate uppercase tracking-tighter text-base leading-tight">{c.name}</h4>
                                </div>

                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex items-center gap-1 text-[#b45309]">
                                        <span className="text-xs">★</span>
                                        <span className="text-[11px] font-black">{parseFloat(c.rating_avg || 0).toFixed(1)}</span>
                                    </div>
                                    <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.review_count || 0} Yorum</span>
                                </div>

                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-500 truncate uppercase tracking-tight opacity-70 flex items-center gap-1">
                                        <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        <span className="text-indigo-600 font-black">{c.district || 'Merkez'}</span>, {c.city || 'İSTANBUL'}
                                    </p>

                                    {c.distance !== undefined && (
                                        <div className="flex items-center gap-1.5">
                                            <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-tighter border border-emerald-100/50 flex items-center gap-1 shadow-sm">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                {(c.distance).toFixed(1)} km mesafede
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </main>

            {!loading && filteredCompanies.length === 0 && (
                <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 p-10">
                    <div className="text-5xl mb-6 opacity-30">🔍</div>
                    <p className="text-slate-400 font-bold mb-2">Eşleşen salon bulunamadı.</p>
                    <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">Arama kelimesini veya mesafeyi değiştirin</p>
                </div>
            )}

            {/* Persistent Bottom Navigation - Modern Minimal */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[280px] z-[50]">
                <nav className="bg-slate-900/90 backdrop-blur-3xl rounded-[3rem] p-2 flex items-center justify-around shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] border border-white/10 h-16">
                    <button
                        onClick={() => {
                            if (favorites.length > 0) {
                                window.scrollTo({ top: 150, behavior: 'smooth' });
                            }
                        }}
                        className="flex-1 flex flex-col items-center justify-center h-full group active:scale-95 transition-all text-white/50 hover:text-red-400"
                    >
                        <span className="text-xl">❤️</span>
                        <span className="text-[8px] font-black uppercase tracking-widest mt-0.5">Favoriler</span>
                    </button>

                    <div className="w-px h-8 bg-white/10" />

                    <Link
                        to="/my-appointments"
                        className="flex-1 flex flex-col items-center justify-center h-full group active:scale-95 transition-all font-black text-white/50 hover:text-indigo-400"
                    >
                        <span className="text-xl">📅</span>
                        <span className="text-[8px] font-black uppercase tracking-widest mt-0.5">Randevularım</span>
                    </Link>
                </nav>
            </div>

            {/* Content Bottom Spacer to avoid overlap */}
            <div className="h-32"></div>

            {/* Code Entry Modal */}
            {
                showCodeModal && (
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

                            <div className="flex flex-col gap-4 mb-6">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={codeInput}
                                        onChange={e => setCodeInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleCheckCode()}
                                        placeholder="ADM-XXX-XXXX veya XXX-XXXX"
                                        className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 text-center text-xl font-black text-slate-900 tracking-[0.1em] outline-none transition-all focus:border-amber-500 uppercase"
                                        autoFocus
                                        autoComplete="off"
                                        spellCheck="false"
                                    />
                                </div>

                                <button
                                    onClick={toggleScanner}
                                    className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-sm ${isScanning
                                        ? 'bg-red-50 text-red-600 border-2 border-red-100'
                                        : 'bg-indigo-50 text-indigo-600 border-2 border-indigo-100 hover:bg-indigo-100'
                                        }`}
                                >
                                    {isScanning ? (
                                        <><span>✕</span> Tarayıcıyı Kapat</>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                            </svg>
                                            Barkod / QR Tarat
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className={`${isScanning ? 'flex' : 'hidden'} mb-6 bg-slate-950 rounded-[2.5rem] overflow-hidden aspect-square items-center justify-center relative shadow-2xl border-4 border-white`}>
                                <video
                                    autoPlay
                                    muted
                                    playsInline
                                    ref={videoRef}
                                    className="w-full h-full object-cover opacity-80"
                                />
                                <canvas ref={canvasRef} className="hidden" />

                                {/* Scanner Overlay UI */}
                                <div className="absolute inset-x-12 inset-y-12 border-2 border-indigo-500/30 rounded-3xl">
                                    <div className="absolute inset-0 border-[6px] border-indigo-500/80 rounded-3xl clip-corners"></div>
                                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent absolute top-1/2 -translate-y-1/2 animate-scan shadow-[0_0_15px_rgba(79,70,229,0.5)]"></div>
                                </div>

                                <div className="absolute top-6 left-0 right-0 text-center">
                                    <span className="px-4 py-1.5 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg animate-pulse">
                                        Tarayıcı Aktif
                                    </span>
                                </div>

                                <p className="absolute bottom-6 left-0 right-0 text-center text-[10px] text-white/80 font-black uppercase tracking-[0.2em]">
                                    QR Kodu Karenin İçine Getirin
                                </p>

                                <style>{`
                                        .clip-corners {
                                            mask: 
                                                linear-gradient(#000 0 0) content-box,
                                                linear-gradient(#000 0 0);
                                            mask-composite: exclude;
                                            padding: 40px;
                                        }
                                        @keyframes scan {
                                            0%, 100% { transform: translateY(-80px); opacity: 0; }
                                            10%, 90% { opacity: 1; }
                                            50% { transform: translateY(80px); }
                                        }
                                        .animate-scan {
                                            animation: scan 2s linear infinite;
                                        }
                                    `}</style>
                            </div>

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
                )
            }

            {/* Settings Modal */}
            {
                showSettingsModal && (
                    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)}>
                        <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-10 shadow-2xl" onClick={e => e.stopPropagation()}
                            style={{ animation: 'slideUp 0.3s ease-out' }}>
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />

                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">⚙️</span>
                                </div>
                                <h2 className="text-2xl font-black text-slate-900">Uygulama Ayarları</h2>
                                <p className="text-slate-400 text-sm mt-1">İzinleri ve tercihleri yönetin</p>
                            </div>

                            <div className="space-y-4 mb-8">
                                {[
                                    { id: 'location', label: 'Konum İzni', desc: 'Size en yakın salonları bulmak için', icon: '📍', status: permissions.location },
                                    { id: 'camera', label: 'Kamera İzni', desc: 'Barkod ve QR okutmak için', icon: '📷', status: permissions.camera },
                                    { id: 'voice', label: 'Ses İzni', desc: 'Sesli komutlar için (YAKINDA)', icon: '🎙️', status: 'denied', disabled: true }
                                ].map(p => (
                                    <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl">{p.icon}</div>
                                            <div>
                                                <p className="font-black text-sm text-slate-900">{p.label}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.desc}</p>
                                            </div>
                                        </div>
                                        <button
                                            disabled={p.disabled || p.status === 'granted'}
                                            onClick={() => requestPermission(p.id as any)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${p.status === 'granted'
                                                ? 'bg-emerald-50 text-emerald-600'
                                                : 'bg-indigo-600 text-white shadow-lg active:scale-95'
                                                }`}
                                        >
                                            {p.status === 'granted' ? '✅ İzin Verildi' : 'İzin Ver'}
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => setShowSettingsModal(false)}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-base active:scale-95 transition-all"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                )
            }

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
