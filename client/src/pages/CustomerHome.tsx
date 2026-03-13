import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { Company } from '../types';
import { Geolocation } from '@capacitor/geolocation';
import { Camera } from '@capacitor/camera';
import { App as CapApp } from '@capacitor/app';

// Optimize individual item render - Moved outside to prevent recreation on every render
const formatDialNumber = (phone?: string) => {
    if (!phone) return "";
    let cleaned = phone.replace(/[^0-9]/g, "");
    // Türkiye için 10 haneli (5xx...), 11 haneli (05xx...), 12 haneli (905xx...) durumlarını normalize et
    if (cleaned.length === 12 && cleaned.startsWith('90')) {
        cleaned = cleaned.substring(2);
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }
    // Başına '0' ekleyerek standardı sağla (10 hane ise 0 ekle)
    if (cleaned.length === 10 && cleaned.startsWith('5')) {
        return '0' + cleaned;
    }
    return cleaned;
};

const CompanyCard = React.memo(({ company: c, navigatingToId, favorites, toggleFavorite, onCompanyClick, onCallClick, onReviewClick }: any) => {
    const isNavigating = navigatingToId === c.id;

    return (
        <div
            className={`bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-xl transition-all active:scale-[0.98] relative group overflow-hidden ${isNavigating ? 'opacity-70 grayscale' : ''}`}
            onClick={() => onCompanyClick(c)}
        >
            {isNavigating && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
                    <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
            )}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-50" />

            <div className="absolute top-4 right-4 flex flex-col items-center gap-4 z-10">
                <a
                    href={c.latitude && c.longitude && parseFloat(c.latitude) !== 0 ? `https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.name} ${c.address_line || ''} ${c.district || ''} ${c.city || ''}`)}`}
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.open(e.currentTarget.href, '_blank'); }}
                    className="w-14 h-14 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-2xl transition-all hover:bg-indigo-600 hover:text-white shadow-md shadow-indigo-100 border border-indigo-100 active:scale-90"
                    title="Yol Tarifi"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </a>

                {c.phone && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onCallClick(e, c); }}
                        className="w-14 h-14 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-2xl transition-all hover:bg-emerald-600 hover:text-white shadow-md shadow-emerald-100 border border-emerald-100 active:scale-90"
                        title="Telefon"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </button>
                )}
            </div>

            <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center shadow-inner border border-slate-200/50 group-hover:scale-105 transition-transform overflow-hidden relative bg-slate-100">
                    <img
                        src={
                            c.photo ? c.photo : (
                                (c.genders && c.genders.includes('Kadın'))
                                    ? 'https://images.pexels.com/photos/3993472/pexels-photo-3993472.jpeg?auto=compress&cs=tinysrgb&w=400'
                                    : ((c.genders && c.genders.includes('Erkek'))
                                        ? 'https://images.pexels.com/photos/1813272/pexels-photo-1813272.jpeg?auto=compress&cs=tinysrgb&w=400'
                                        : 'https://images.pexels.com/photos/705255/pexels-photo-705255.jpeg?auto=compress&cs=tinysrgb&w=400')
                            )
                        }
                        alt={c.name}
                        className="w-full h-full object-cover absolute inset-0 z-10"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-4xl z-0">
                        {(c.genders && c.genders.includes('Kadın')) ? '👩‍🦰' : ((c.genders && c.genders.includes('Erkek')) ? '🧔' : '💈')}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-20 pointer-events-none"></div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => toggleFavorite(e, c.id)}
                        className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all shadow-md active:scale-90 ${favorites.includes(c.id) ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-white text-slate-300 hover:text-rose-500 border border-slate-100'}`}
                    >
                        <svg className={`w-5 h-5 ${favorites.includes(c.id) ? 'fill-current' : 'fill-none'}`} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onReviewClick(c); }}
                        className="w-11 h-11 flex items-center justify-center bg-amber-50 text-amber-600 rounded-2xl border border-amber-100 shadow-md transition-all hover:bg-amber-600 hover:text-white active:scale-90"
                    >
                        <span className="text-xl">💬</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 min-w-0 pr-12">
                <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[8px] font-black uppercase tracking-widest mb-1.5">{c.type || 'Hizmet Noktası'}</span>
                <div className="flex items-center gap-1.5 mb-1.5">
                    <h4 className="font-black text-slate-900 truncate uppercase tracking-tighter text-base leading-tight">{c.name}</h4>
                </div>

                <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-1 text-[#b45309]">
                        <span className="text-xs">★</span>
                        <span className="text-[11px] font-black">{parseFloat(c.rating_avg || 0).toFixed(1)}</span>
                        <div className="w-1 h-1 bg-slate-300 rounded-full mx-1" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest underline decoration-slate-200 underline-offset-2">{c.review_count || 0} Yorum</span>
                    </div>
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
    );
});

// Salon Cebinde - V1.9.6 - QR Scanner Fix
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
    const [notRegisteredModal, setNotRegisteredModal] = useState<{ open: boolean; company: any | null }>({ open: false, company: null });
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
    const [navigatingTo, setNavigatingTo] = useState<number | null>(null);
    const [callPicker, setCallPicker] = useState<{ open: boolean, company: any, staff: any[] }>({ open: false, company: null, staff: [] });
    const [fetchingStaff, setFetchingStaff] = useState(false);
    const [reviewsModal, setReviewsModal] = useState<{ open: boolean, company: any, reviews: any[], loading: boolean, sort: string }>({ 
        open: false, company: null, reviews: [], loading: false, sort: 'rating_desc' 
    });

    const fetchCompanyReviews = async (companyId: number, sort: string = 'rating_desc') => {
        setReviewsModal(prev => ({ ...prev, loading: true, sort }));
        try {
            const res = await api.get(`/appointments/companies/${companyId}/reviews`, { params: { sort } });
            setReviewsModal(prev => ({ ...prev, reviews: res.data.data || [], loading: false }));
        } catch (err) {
            console.error('Reviews fetch error:', err);
            setReviewsModal(prev => ({ ...prev, loading: false }));
        }
    };

    const handleReviewClick = (company: any) => {
        setReviewsModal({ open: true, company, reviews: [], loading: true, sort: 'rating_desc' });
        fetchCompanyReviews(company.id, 'rating_desc');
    };

    const handleCallClick = async (e: React.MouseEvent, company: any) => {
        e.preventDefault();
        e.stopPropagation();

        if (fetchingStaff) return;

        setFetchingStaff(true);
        try {
            const res = await api.get(`/companies/${company.id}/employees`);
            const allStaff = res.data?.data || [];
            // Filtreleme: Personel telefonu firma ana hattı ile aynı ise veya Admin ise gösterme
            const staffWithPhone = allStaff.filter((s: any) => {
                if (s.role === 'company_admin' || 
                    s.first_name?.toLowerCase().includes('admin') || 
                    s.last_name?.toLowerCase().includes('admin')) {
                    return false;
                }
                const phone = s.phone || s.user_phone;
                if (!phone || phone.trim().length <= 5) return false;
                // Normalize and compare
                return formatDialNumber(phone) !== formatDialNumber(company.phone);
            });

            if (staffWithPhone.length === 0) {
                window.location.href = `tel:${formatDialNumber(company.phone)}`;
            } else {
                setCallPicker({ open: true, company, staff: staffWithPhone });
            }
        } catch (err) {
            console.error('Staff fetch error:', err);
            window.location.href = `tel:${formatDialNumber(company.phone)}`;
        } finally {
            setFetchingStaff(false);
        }
    };

    const handleCompanyClick = useCallback((c: any) => {
        if (navigatingTo) return;
        setNavigatingTo(c.id);
        navigate(`/book/${c.id}`);
    }, [navigatingTo, navigate]);

    const fetchData = React.useCallback(async (query?: string, loc?: { lat: number, lng: number } | null, dist?: number) => {
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

            // Haversine formula for precise spherical distance
            const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
                const R = 6371.071;
                const rLat1 = lat1 * Math.PI / 180;
                const rLat2 = lat2 * Math.PI / 180;
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
            };

            const resultWithDistance = allCompanies.map((c: Company) => {
                let distance = undefined;
                if (loc) {
                    const lat2 = c.latitude ? parseFloat(String(c.latitude)) : null;
                    const lng2 = c.longitude ? parseFloat(String(c.longitude)) : null;
                    if (lat2 && lng2 && !isNaN(lat2) && !isNaN(lng2) && lat2 !== 0) {
                        distance = calculateDistance(loc.lat, loc.lng, lat2, lng2);
                    }
                }
                return { ...c, distance };
            });

            let finalResult = resultWithDistance;
            if (loc) {
                const threshold = dist || distanceLimit;
                // Filter by distance
                finalResult = resultWithDistance.filter((c: any) => c.distance === undefined || c.distance <= threshold);
                
                // Only sort by distance if user hasn't explicitly chosen a different sort (like 'rating' or 'reviews')
                // The API already returns records sorted by rating or reviews if requested.
                if (sort !== 'rating' && sort !== 'reviews') {
                    finalResult.sort((a: any, b: any) => (a.distance || 9999) - (b.distance || 9999));
                }
            }

            setCompanies(allCompanies);
            setFilteredCompanies(finalResult);
        } catch (err) {
            console.error('Failed to fetch companies', err);
        } finally {
            setLoading(false);
        }
    }, [selectedGender, sort, distanceLimit, showSlider]);

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
            // Push Notification Permission Check for first load (Native + Web)
            try {
                const isNative = (window as any).Capacitor?.isNativePlatform();
                if (isNative) {
                    const { PushNotifications } = await import('@capacitor/push-notifications');
                    let permStatus = await PushNotifications.checkPermissions();
                    if (permStatus.receive === 'prompt') {
                        await PushNotifications.requestPermissions();
                    }
                } else {
                    if ("Notification" in window && Notification.permission === "default") {
                        await Notification.requestPermission();
                    }
                }
            } catch (notifyErr) {
                console.log('Notification permission check failed:', notifyErr);
            }

            // Then try location using Capacitor for better mobile support
            let initialLoc = null;
            try {
                const position = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 5000
                });
                initialLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
                setLocation(initialLoc);
            } catch (err) {
                console.log('Initial geolocation fail', err);
            }

            // Only fetch once here, the other useEffect will handle gender/sort changes if they are NOT defaults
            // But since they ARE defaults initially, we must call it here or let the other useEffect do it.
            // Actually, the other useEffect will run on mount because fetchData's identity changes on mount.
            // So we don't NEED to call it here if location is null.
            // If location is NOT null, we want to call it with the new location.
            if (initialLoc) {
                fetchData(searchQuery, initialLoc, distanceLimit);
            }
        };
        initialFetch();

        // Cleanup: Ensure camera streams are stopped if user navigates away
        return () => {
            isScanningRef.current = false;
            setIsScanning(false);
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
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

    const toggleFavorite = useCallback((e: React.MouseEvent, id: number) => {
        e.preventDefault();
        e.stopPropagation();

        setFavorites(prev => {
            let newFavs;
            if (prev.includes(id)) {
                newFavs = prev.filter(fid => fid !== id);
            } else {
                newFavs = [...prev, id];
            }
            localStorage.setItem('saloon_favorites', JSON.stringify(newFavs));
            return newFavs;
        });
    }, []);

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

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        fetchData(query, location, distanceLimit);
    }, [fetchData, location, distanceLimit]);

    const handleDistanceChange = useCallback((dist: number) => {
        setDistanceLimit(dist);
        fetchData(searchQuery, location, dist);
    }, [fetchData, searchQuery, location]);

    const isFirstRun = useRef(true);
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            if (!location) {
                fetchData(searchQuery, null, distanceLimit);
            }
            return;
        }
        fetchData(searchQuery, location, distanceLimit);
    }, [selectedGender, sort, fetchData]);
    
    // BACK BUTTON HANDLER
    useEffect(() => {
        const backHandler = (CapApp as any).addListener('backButton', () => {
            if (reviewsModal.open) {
                setReviewsModal(prev => ({ ...prev, open: false }));
            } else if (callPicker.open) {
                setCallPicker(prev => ({ ...prev, open: false }));
            } else if (showCodeModal) {
                setShowCodeModal(false);
            } else if (showSettingsModal) {
                setShowSettingsModal(false);
            } else {
                navigate(-1);
            }
        });
        return () => { backHandler.then((h: any) => h.remove()); };
    }, [reviewsModal.open, callPicker.open, showCodeModal, showSettingsModal, navigate]);


    const [favoriteCompanies, setFavoriteCompanies] = useState<Company[]>([]);

    useEffect(() => {
        setFavoriteCompanies(prev => {
            const currentFavIds = new Set(favorites);
            // Sadece hala favori olanları tut
            const stillFavs = prev.filter(c => currentFavIds.has(c.id!));
            // Mevcut şirketler listesinde olup henüz favori state'imizde olmayanları ekle
            const alreadyInFavs = new Set(stillFavs.map(c => c.id));
            const newFavsFromList = companies.filter(c => currentFavIds.has(c.id!) && !alreadyInFavs.has(c.id!));
            
            return [...stillFavs, ...newFavsFromList];
        });
    }, [companies, favorites]);

    const handleCheckCode = async (overrideCode?: string) => {
        const code = (overrideCode || codeInput).trim().toUpperCase();
        if (!code) return;

        setCodeChecking(true);
        setCodeError('');
        setCodeResult(null);
        try {
            const res = await api.post('/companies/check-code', { code });
            if (res.data?.success) {
                const data = res.data.data;
                setCodeResult(data);

                // Success feedback
                try { window.navigator?.vibrate?.(100); } catch (e) { }

                // Delay for visual feedback
                setTimeout(() => {
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
            setCodeResult(null);
        } finally {
            setCodeChecking(false);
        }
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

    const lastScanTime = useRef(0);
    const scanLoop = async (time: number) => {
        if (!isScanningRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) return; // Break loop if unmounted

        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
            requestAnimationFrame(scanLoop);
            return;
        }

        // Throttle QR detection to 10 FPS (100ms) to save CPU/Battery
        if (time - lastScanTime.current < 100) {
            requestAnimationFrame(scanLoop);
            return;
        }
        lastScanTime.current = time;

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
        const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
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
        setTimeout(() => handleCheckCode(codeData), 100);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header - Modern & Minimal - Optimized for mobile notches */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100"
                style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
                <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20">
                            <img src="/app-icon.png" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tighter">Salon Cebinde</h1>
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
                            onClick={() => navigate('/login')}
                            className="w-11 h-11 bg-slate-50 text-slate-500 rounded-2xl flex items-center justify-center active:scale-90 transition-all border border-slate-100 shadow-sm"
                            title="Giriş Yap"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                            <h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Favorilerim</h3>
                        </div>
                        <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[9px] font-black border border-rose-100 shadow-sm">❤️ {favorites.length}</span>
                    </div>
                    <div className="flex gap-4 overflow-x-auto px-6 pb-6 hide-scrollbar">
                        {favoriteCompanies.map((c: any) => (
                            <div key={c.id} className="relative group flex-shrink-0">
                                <button
                                    onClick={() => handleCompanyClick(c)}
                                    className={`w-32 bg-white rounded-[2rem] p-4 shadow-lg shadow-slate-200/40 border border-slate-50 text-center active:scale-95 transition-all relative overflow-hidden ${navigatingTo === c.id ? 'opacity-50' : ''}`}
                                >
                                    {navigatingTo === c.id && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] z-20">
                                            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 group-hover:bg-rose-50 group-hover:scale-105 transition-all overflow-hidden relative border border-slate-100/50">
                                        {c.photo ? (
                                            <img src={c.photo} alt={c.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span>💈</span>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent"></div>
                                    </div>
                                    <h4 className="font-black text-slate-900 text-xs truncate uppercase tracking-tighter">{c.name}</h4>
                                    <p className="text-slate-400 text-[9px] font-bold mt-1 uppercase tracking-widest">{c.district || 'Merkez'}</p>
                                    
                                    <div className="flex items-center justify-center gap-1 mt-2 text-amber-500">
                                        <span className="text-[10px]">★</span>
                                        <span className="text-[10px] font-black">{parseFloat(c.rating_avg || 0).toFixed(1)}</span>
                                    </div>
                                </button>

                                {/* Removal Button - Always visible X for clarity on mobile */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(e, c.id); }}
                                    className="absolute -top-2 -right-2 w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-2xl border-2 border-white active:scale-75 transition-all z-40"
                                    title="Favorilerden Çıkar"
                                >
                                    <span className="text-xl font-black leading-none select-none">×</span>
                                </button>

                                {/* Call Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleCallClick(e, c); }}
                                    className="absolute bottom-16 -left-1 w-8 h-8 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-75 transition-all z-30 border-2 border-white"
                                    title="Ara"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                </button>
                            </div>
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
                        <CompanyCard
                            key={c.id}
                            company={c}
                            navigatingToId={navigatingTo}
                            favorites={favorites}
                            toggleFavorite={toggleFavorite}
                            onCompanyClick={handleCompanyClick}
                            onCallClick={handleCallClick}
                            onReviewClick={handleReviewClick}
                        />
                    ))
                )}

                {/* Not Registered Modal (Moved outside loop for performance) */}
                {notRegisteredModal.open && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-500 text-center">
                            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">
                                ⚠️
                            </div>
                            <h2 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">Kayıtlı Değil</h2>
                            <p className="text-slate-500 text-sm mb-8 leading-relaxed font-bold">
                                Bu firma henüz online randevu sistemine personel veya hizmet tanımlaması yapmamıştır.
                                {notRegisteredModal.company?.phone
                                    ? " Dilerseniz işletmeyi arayabilir veya konum üzerinden yol tarifi alabilirsiniz."
                                    : " Dilerseniz konum üzerinden yol tarifi alabilirsiniz."
                                }
                            </p>

                            <div className="flex flex-col gap-3">
                                {notRegisteredModal.company?.phone && (
                                    <a
                                        href={`tel:${formatDialNumber(notRegisteredModal.company.phone)}`}
                                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                        İşletmeyi Ara
                                    </a>
                                )}
                                <a
                                    href={notRegisteredModal.company?.latitude && notRegisteredModal.company?.longitude && parseFloat(notRegisteredModal.company?.latitude) !== 0
                                        ? `https://www.google.com/maps/dir/?api=1&destination=${notRegisteredModal.company.latitude},${notRegisteredModal.company.longitude}`
                                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${notRegisteredModal.company?.name} ${notRegisteredModal.company?.address_line || ''}`)}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    Yol Tarifi Al
                                </a>
                                <button
                                    onClick={() => setNotRegisteredModal({ open: false, company: null })}
                                    className="w-full py-4 bg-white text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600"
                                >
                                    Vazgeç
                                </button>
                            </div>
                        </div>
                    </div>
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
                        to="/my-notifications"
                        className="flex-1 flex flex-col items-center justify-center h-full group active:scale-95 transition-all text-white/50 hover:text-amber-400"
                    >
                        <span className="text-xl">🔔</span>
                        <span className="text-[8px] font-black uppercase tracking-widest mt-0.5">Bildirim</span>
                    </Link>

                    <div className="w-px h-8 bg-white/10" />

                    <Link
                        to="/my-appointments"
                        className="flex-1 flex flex-col items-center justify-center h-full group active:scale-95 transition-all font-black text-white/50 hover:text-indigo-400"
                    >
                        <span className="text-xl">📅</span>
                        <span className="text-[8px] font-black uppercase tracking-widest mt-0.5">Randevu</span>
                    </Link>
                </nav>
            </div>

            {/* Content Bottom Spacer to avoid overlap */}
            <div className="h-32"></div>

            {/* Call Picker Modal */}
            {callPicker.open && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setCallPicker({ ...callPicker, open: false })}>
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-6 relative overflow-hidden animate-in slide-in-from-bottom-10 duration-500" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>

                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">İletişim</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Kimle görüşmek istersiniz?</p>
                            </div>
                            <button
                                onClick={() => setCallPicker({ ...callPicker, open: false })}
                                className="w-10 h-10 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-3">
                            {/* Company Phone */}
                            <a
                                href={`tel:${formatDialNumber(callPicker.company.phone)}`}
                                className="flex items-center gap-4 p-5 bg-gradient-to-tr from-indigo-50 to-indigo-100/30 rounded-3xl border border-indigo-100 active:scale-95 transition-all group"
                            >
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    🏢
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1.5">ŞUBE / ANA HAT</p>
                                    <h4 className="font-black text-indigo-950 uppercase tracking-tighter text-lg">{callPicker.company.name}</h4>
                                </div>
                                <svg className="w-5 h-5 text-indigo-300 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                            </a>

                            <div className="flex items-center gap-3 py-2 px-2">
                                <div className="h-px bg-slate-100 flex-1"></div>
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Uzman Kadromuz</span>
                                <div className="h-px bg-slate-100 flex-1"></div>
                            </div>

                            {/* Staff Phones */}
                            {callPicker.staff.map((s: any) => (
                                <a
                                    key={s.id}
                                    href={`tel:${formatDialNumber(s.phone || s.user_phone)}`}
                                    className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 rounded-3xl border border-slate-100 active:scale-95 transition-all group"
                                >
                                    <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-lg shadow-sm group-hover:bg-emerald-500 group-hover:text-white transition-colors overflow-hidden">
                                        {s.photo || s.user_photo ? (
                                            <img src={s.photo || s.user_photo} className="w-full h-full object-cover" />
                                        ) : '👤'}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{s.title || 'Personel'}</p>
                                        <h4 className="font-bold text-slate-800 uppercase tracking-tight">{s.first_name || s.user_first_name} {s.last_name || s.user_last_name}</h4>
                                    </div>
                                    <svg className="w-5 h-5 text-slate-200 group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                </a>
                            ))}
                        </div>

                        <div className="mt-6 flex justify-center">
                            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.3em]">Hızlı & Doğru İletişim</p>
                        </div>
                    </div>
                </div>
            )}

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
                                    onClick={() => handleCheckCode()}
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
                            <p className="text-[9px] text-slate-300 text-center mt-4 font-black uppercase tracking-widest">Salon Cebinde v1.9.9</p>
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
            {/* Reviews Modal - Premium Redesign */}
            {reviewsModal.open && (
                <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 animate-in slide-in-from-bottom duration-500">
                    {/* Floating Header */}
                    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-slate-100/50 shadow-sm"
                         style={{ paddingTop: 'env(safe-area-inset-top, 1rem)' }}>
                        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setReviewsModal(prev => ({ ...prev, open: false }))}
                                    className="w-12 h-12 flex items-center justify-center bg-slate-100/80 text-slate-900 rounded-[1.25rem] active:scale-90 transition-all border border-slate-200/50"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <div className="flex flex-col">
                                    <h3 className="font-black text-slate-900 uppercase tracking-tighter text-base leading-tight truncate max-w-[180px]">{reviewsModal.company?.name}</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex text-amber-500">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i} className="text-[10px]">{i < Math.round(reviewsModal.company?.rating_avg || 0) ? '★' : '☆'}</span>
                                            ))}
                                        </div>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">({reviewsModal.company?.review_count || 0} DEĞERLENDİRME)</span>
                                    </div>
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-slate-50 shadow-sm bg-slate-100 flex items-center justify-center text-xl">
                                {reviewsModal.company?.photo ? (
                                    <img src={reviewsModal.company.photo} className="w-full h-full object-cover" />
                                ) : '💈'}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto hide-scrollbar">
                        {/* Hero Rating Section */}
                        <div className="bg-white px-6 pt-10 pb-12 rounded-b-[3.5rem] shadow-xl shadow-slate-200/50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

                            <div className="relative z-10 flex flex-col items-center gap-8">
                                <div className="flex flex-col items-center group">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full scale-150 group-hover:scale-175 transition-transform duration-700"></div>
                                        <div className="relative w-32 h-32 bg-gradient-to-br from-amber-400 to-orange-500 rounded-[2.5rem] flex flex-col items-center justify-center shadow-2xl shadow-amber-200 border-4 border-white rotate-3 group-hover:rotate-0 transition-all duration-500">
                                            <span className="text-4xl font-black text-white tracking-tighter">{parseFloat(reviewsModal.company?.rating_avg || 0).toFixed(1)}</span>
                                            <div className="flex text-white/50 text-[8px] mt-1 tracking-widest uppercase font-bold">PUAN</div>
                                        </div>
                                    </div>
                                    <div className="mt-8 flex flex-col items-center">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Sıralama Seçenekleri</h4>
                                        <div className="flex bg-slate-50 p-1.5 rounded-[1.75rem] gap-1 border border-slate-100 shadow-inner">
                                            {[
                                                { id: 'rating_desc', label: 'En Yüksek', icon: '💎' },
                                                { id: 'rating_asc', label: 'En Düşük', icon: '❄️' },
                                                { id: 'newest', label: 'En Yeni', icon: '✨' }
                                            ].map(s => (
                                                <button 
                                                    key={s.id}
                                                    onClick={() => fetchCompanyReviews(reviewsModal.company.id, s.id)}
                                                    className={`px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all duration-500 flex items-center gap-2 ${reviewsModal.sort === s.id ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100/50 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    <span className="text-sm">{s.icon}</span>
                                                    {s.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reviews List */}
                        <div className="max-w-md mx-auto px-6 py-10 space-y-6">
                            {reviewsModal.loading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="w-12 h-12 border-[5px] border-slate-100 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] animate-pulse">Yorumlar Getiriliyor...</span>
                                </div>
                            ) : reviewsModal.reviews.length === 0 ? (
                                <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 p-10">
                                    <div className="text-5xl mb-6 opacity-20">💬</div>
                                    <p className="text-slate-400 font-black mb-1 uppercase tracking-tighter">Henüz Yorum Yok</p>
                                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed">Bu işletme hakkında ilk yorumu<br />siz yapabilirsiniz!</p>
                                </div>
                            ) : (
                                reviewsModal.reviews.map((r: any, idx: number) => (
                                    <div 
                                        key={r.id} 
                                        className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-50 relative animate-in fade-in slide-in-from-bottom-4 duration-500"
                                        style={{ animationDelay: `${idx * 100}ms` }}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-black text-slate-900 text-xs shadow-inner">
                                                    {r.customer_name?.[0] || 'M'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <h4 className="font-black text-slate-900 text-xs uppercase tracking-tight leading-none mb-1">{r.customer_name}</h4>
                                                    <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">{new Date(r.appointment_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-0.5 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-100/50 shadow-sm">
                                                <span className="text-[10px] font-black text-amber-600 mr-1">{r.rating}.0</span>
                                                {[...Array(5)].map((_, i) => (
                                                    <svg key={i} className={`w-2.5 h-2.5 ${i < r.rating ? 'text-amber-500 fill-current' : 'text-slate-200'}`} viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="relative">
                                            <svg className="absolute -top-1 -left-1 w-4 h-4 text-slate-100" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 7.55228 14.017 7V5C14.017 4.44772 14.4647 4 15.017 4H21.017C21.5693 4 22.017 4.44772 22.017 5V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM3.017 21L3.017 18C3.017 16.8954 3.91243 16 5.017 16H8.017C8.56928 16 9.017 15.5523 9.017 15V9C9.017 8.44772 8.56928 8 8.017 8H4.017C3.46472 8 3.017 7.55228 3.017 7V5C3.017 4.44772 3.46472 4 4.017 4H10.017C10.5693 4 11.017 4.44772 11.017 5V15C11.017 18.3137 8.33072 21 5.017 21H3.017Z" /></svg>
                                            <p className="text-slate-600 text-[13px] leading-relaxed font-medium pl-5 italic group-hover:text-slate-900 transition-colors">"{r.comment}"</p>
                                        </div>

                                        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-50/50">
                                            <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                                            <span className="text-[10px] font-black text-indigo-900 uppercase tracking-tighter">{r.service_name || 'Hizmet Alındı'}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

