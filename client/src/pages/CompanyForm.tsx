import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../lib/api';
import { Company, Province, District, Neighborhood } from '../types';

// Leaflet marker icon fix
// Leaflet marker icon fix
import L from 'leaflet';
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapController({ center }: { center: LatLng }) {
    const map = useMapEvents({});
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
}

function LocationMarker({ position, setPosition }: {
    position: LatLng | null;
    setPosition: (pos: LatLng) => void;
}) {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    return position === null ? null : <Marker position={position} />;
}

export default function CompanyForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form data
    const [formData, setFormData] = useState<Partial<Company>>({
        name: '',
        description: '',
        phone: '',
        email: '',
        website: '',
        address_line: '',
        postal_code: '',
        city: '',
        district: '',
        neighborhood: '',
        bank_name: '',
        bank_branch: '',
        iban: '',
        account_holder_name: '',
        commission_rate: 0,
        payment_enabled: false,
        board_key: '',
        genders: [],
        company_type: 'ASIL',
        main_company_id: null,
        sms_enabled: true,
    });

    const [mainCompanies, setMainCompanies] = useState<any[]>([]);

    // Address data
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);

    const [selectedProvince, setSelectedProvince] = useState<number | null>(null);
    const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
    const [selectedNeighborhood, setSelectedNeighborhood] = useState<number | null>(null);

    // Arama ve Konum Durumları
    const [mapSearchQuery, setMapSearchQuery] = useState('');
    const [mapResults, setMapResults] = useState<any[]>([]);
    const [isSearchingMaps, setIsSearchingMaps] = useState(false);
    const [userCoords, setUserCoords] = useState<{ lat: number, lng: number } | null>(null);

    const [mapPosition, setMapPosition] = useState<LatLng | null>(
        new LatLng(39.9334, 32.8597)
    );
    const [mapCenter, setMapCenter] = useState<LatLng>(new LatLng(39.9334, 32.8597));

    const handleMapSearch = async (queryOverride?: string) => {
        const query = queryOverride || mapSearchQuery;
        if (!query.trim() || query.length < 3) {
            setMapResults([]);
            return;
        }

        setIsSearchingMaps(true);
        try {
            // Priority: 1. User's live coords, 2. Map position, 3. None
            let url = `/maps/search?q=${encodeURIComponent(query)}`;
            const biasLat = userCoords?.lat || mapPosition?.lat;
            const biasLng = userCoords?.lng || mapPosition?.lng;

            if (biasLat && biasLng) {
                url += `&lat=${biasLat}&lng=${biasLng}`;
            }
            const response = await api.get(url);
            setMapResults(response.data.data);
        } catch (err) {
            console.error('Harita arama hatası:', err);
        } finally {
            setIsSearchingMaps(false);
        }
    };

    // Debounced search for typing
    useEffect(() => {
        const timer = setTimeout(() => {
            if (mapSearchQuery.length >= 3) {
                handleMapSearch();
            } else {
                setMapResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [mapSearchQuery]);

    const handleSelectPlace = async (place: any) => {
        try {
            setLoading(true);
            const response = await api.get(`/maps/details/${place.place_id}`);
            const details = response.data.data;

            setFormData(prev => ({
                ...prev,
                name: details.name || place.name,
                address_line: details.address || place.address,
                phone: details.phone || prev.phone,
            }));

            if (details.latitude && details.longitude) {
                const newPos = new LatLng(details.latitude, details.longitude);
                setMapPosition(newPos);
                setMapCenter(newPos);
            }

            setMapResults([]);
            setMapSearchQuery('');
        } catch (err) {
            console.error('Detay alma hatası:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            await fetchProvinces();
            await fetchMainCompanies();
            if (isEdit) {
                await fetchCompany();
            }
        };

        init();

        // Geolocation for new company
        if (!isEdit && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newPos = new LatLng(position.coords.latitude, position.coords.longitude);
                    setMapPosition(newPos);
                    setMapCenter(newPos);
                    setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
                },
                (error) => {
                    console.warn('Konum alınamadı (Varsayılan Ankara kullanılacak):', error.message);
                },
                { enableHighAccuracy: true }
            );
        }
    }, [isEdit]);

    useEffect(() => {
        if (selectedProvince) {
            fetchDistricts(selectedProvince);
        }
    }, [selectedProvince]);

    useEffect(() => {
        if (selectedProvince && selectedDistrict) {
            fetchNeighborhoods(selectedProvince, selectedDistrict);
        }
    }, [selectedDistrict]);

    const fetchMainCompanies = async () => {
        try {
            const [mainRes, companiesRes] = await Promise.all([
                api.get('/main-companies'),
                api.get('/companies', { params: { company_type: 'ÜST FİRMA' } })
            ]);

            const mainArr = mainRes.data.data || [];
            const companyArr = companiesRes.data.data || [];

            const combined = [...mainArr, ...companyArr];
            setMainCompanies(combined);
            return combined;
        } catch (err) {
            console.error('Üst firmalar yüklenirken hata:', err);
            return [];
        }
    };

    const fetchProvinces = async () => {
        try {
            const response = await api.get('/address/provinces');
            const data = response.data.data;
            setProvinces(data);
            return data;
        } catch (err) {
            console.error('İller yüklenirken hata:', err);
            return [];
        }
    };

    const fetchDistricts = async (provinceId: number) => {
        if (!provinceId || isNaN(provinceId)) return;
        try {
            const response = await api.get(`/address/provinces/${provinceId}/districts`);
            setDistricts(response.data.data || []);
            setNeighborhoods([]);
        } catch (err) {
            console.error('İlçeler yüklenirken hata:', err);
        }
    };

    const fetchNeighborhoods = async (provinceId: number, districtId: number) => {
        if (!provinceId || isNaN(provinceId) || !districtId || isNaN(districtId)) return;
        try {
            const response = await api.get(
                `/address/provinces/${provinceId}/districts/${districtId}/neighborhoods`
            );
            setNeighborhoods(response.data.data || []);
        } catch (err) {
            console.error('Mahalleler yüklenirken hata:', err);
        }
    };

    const fetchCompany = async () => {
        try {
            const response = await api.get(`/companies/${id}`);
            const company = response.data.data;
            setFormData({
                ...company,
                genders: Array.isArray(company.genders) ? company.genders : []
            });

            // Use the current provinces state or fetch if empty (though init ensures it)
            let currentProvinces = provinces;
            if (currentProvinces.length === 0) {
                currentProvinces = await fetchProvinces();
            }

            if (company.city) {
                const province = currentProvinces.find(p => p.name === company.city);
                if (province) {
                    setSelectedProvince(province.id);
                    // Force districts fetch
                    const distRes = await api.get(`/address/provinces/${province.id}/districts`);
                    const districtsArr = distRes.data.data || [];
                    setDistricts(districtsArr);

                    if (company.district) {
                        const district = districtsArr.find((d: any) => d.name === company.district);
                        if (district) {
                            setSelectedDistrict(district.id);
                            // Force neighborhoods fetch
                            const neighRes = await api.get(`/address/provinces/${province.id}/districts/${district.id}/neighborhoods`);
                            const neighborhoodsArr = neighRes.data.data || [];
                            setNeighborhoods(neighborhoodsArr);

                            if (company.neighborhood) {
                                const neighborhood = neighborhoodsArr.find((n: any) => n.name === company.neighborhood);
                                if (neighborhood) setSelectedNeighborhood(neighborhood.id);
                            }
                        }
                    }
                }
            }

            if (company.latitude && company.longitude) {
                const newPos = new LatLng(company.latitude, company.longitude);
                setMapPosition(newPos);
                setMapCenter(newPos);
            }

            // SMS Settings are now handled directly via 'sms_enabled' flag on the company record.
            // No separate fetch needed here for simple on/off toggle.
        } catch (err: any) {
            setError(err.response?.data?.error || 'Firma yüklenirken hata oluştu');
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const province = provinces.find(p => p.id === selectedProvince);
            const district = districts.find(d => d.id === selectedDistrict);
            const neighborhood = neighborhoods.find(n => n.id === selectedNeighborhood);

            const data: Partial<Company> = {
                ...formData,
                city: province?.name,
                district: district?.name,
                neighborhood: neighborhood?.name,
                latitude: mapPosition?.lat,
                longitude: mapPosition?.lng,
            };
            // Remove legacy fields if they accidentally snuck in
            delete (data as any).province_id;
            delete (data as any).province_name;
            delete (data as any).district_id;
            delete (data as any).district_name;
            delete (data as any).neighborhood_id;
            delete (data as any).neighborhood_name;

            if (isEdit) {
                await api.put(`/companies/${id}`, data);
            } else {
                await api.post('/companies', data);
            }

            navigate('/companies');
        } catch (err: any) {
            if (!err.response) {
                setError(`Sunucuya bağlanılamadı. Hedef Adres: ${api.defaults.baseURL}. Lütfen bağlantınızı kontrol edin.`);
            } else {
                const apiError = err.response?.data?.error;
                const details = err.response?.data?.details;

                if (details && Array.isArray(details)) {
                    setError(`${apiError}: ${details.map((d: any) => d.message).join(', ')}`);
                } else {
                    setError(apiError || 'Firma kaydedilirken hata oluştu');
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <Link to="/companies" className="text-pink-600 hover:text-pink-700 text-xs font-bold uppercase tracking-widest mb-1 inline-block">
                        ← Firmalar
                    </Link>
                    <h1 className="text-2xl font-bold heading-serif">{id ? 'Firmayı Düzenle' : 'Yeni Firma Ekle'}</h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Google Maps Search Section */}
                    {!isEdit && (
                        <div className="card border-l-4 border-emerald-500 bg-emerald-50/30">
                            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <span className="text-xl">📍</span> Google Maps'ten Hızlı Getir
                            </h2>
                            <p className="text-sm text-gray-600 mb-4">
                                İşletmeyi Google Maps üzerinde arayarak bilgilerini (isim, adres, telefon, konum) otomatik doldurabilirsiniz.
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={mapSearchQuery}
                                    onChange={(e) => setMapSearchQuery(e.target.value)}
                                    placeholder="Örn: Karizma Kuaför Ankara"
                                    className="input-field flex-1"
                                    onKeyDown={(e) => e.key === 'Enter' && handleMapSearch()}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleMapSearch()}
                                    disabled={isSearchingMaps}
                                    className="bg-emerald-600 text-white px-6 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                >
                                    {isSearchingMaps ? 'Aranıyor...' : 'Ara'}
                                </button>
                            </div>

                            {mapSearchQuery.length >= 3 && mapResults.length === 0 && !isSearchingMaps && (
                                <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-700 text-sm font-medium">
                                    🔍 Aradığınız kriterlere uygun işletme bulunamadı. Lütfen daha genel bir isim veya Google Maps üzerindeki tam ismini deneyin.
                                </div>
                            )}

                            {mapResults.length > 0 && (
                                <div className="mt-4 space-y-2 max-h-60 overflow-y-auto bg-white rounded-xl border border-emerald-100 shadow-inner p-2 cursor-default">
                                    {mapResults.map((place) => (
                                        <div
                                            key={place.place_id}
                                            onClick={() => handleSelectPlace(place)}
                                            className="p-3 hover:bg-emerald-50 rounded-lg border border-transparent hover:border-emerald-200 transition-all cursor-pointer group"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-gray-900 group-hover:text-emerald-700">{place.name}</h4>
                                                    <p className="text-xs text-gray-500">{place.address}</p>
                                                </div>
                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold uppercase tracking-tighter">Seç</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {/* Temel Bilgiler */}
                    <div className="card">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Temel Bilgiler</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Firma Adı *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="input-field"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Firma Türü
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, company_type: 'ÜST FİRMA', main_company_id: null })}
                                        className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all border-2 ${formData.company_type === 'ÜST FİRMA'
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                                            : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-100'
                                            }`}
                                    >
                                        ÜST FİRMA
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, company_type: 'ASIL', main_company_id: null })}
                                        className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all border-2 ${formData.company_type === 'ASIL'
                                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200'
                                            : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-100'
                                            }`}
                                    >
                                        ASIL
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, company_type: 'ŞUBE' })}
                                        className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all border-2 ${formData.company_type === 'ŞUBE'
                                            ? 'bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-200'
                                            : 'bg-white border-gray-100 text-gray-400 hover:border-amber-100'
                                            }`}
                                    >
                                        ŞUBE
                                    </button>
                                </div>
                            </div>

                            {formData.company_type === 'ŞUBE' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Bağlı Olduğu Üst Firma
                                    </label>
                                    <select
                                        name="main_company_id"
                                        value={formData.main_company_id || ''}
                                        onChange={(e) => setFormData({ ...formData, main_company_id: parseInt(e.target.value) || null })}
                                        className="input-field"
                                        required
                                    >
                                        <option value="">Üst Firma Seçiniz</option>
                                        {mainCompanies.map(mc => (
                                            <option key={mc.id} value={mc.id}>{mc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Hizmet Verilen Cinsiyetler *
                                </label>
                                <div className="flex gap-3">
                                    {['Erkek', 'Kadın', 'Çocuk'].map(g => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => {
                                                    const current = prev.genders || [];
                                                    const next = current.includes(g)
                                                        ? current.filter((item: string) => item !== g)
                                                        : [...current, g];
                                                    return { ...prev, genders: next };
                                                });
                                            }}
                                            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all border-2 ${(formData.genders || []).includes(g)
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-100'
                                                }`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Açıklama
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="input-field"
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Telefon
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="0555 123 45 67"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="firma@example.com"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Website
                                </label>
                                <input
                                    type="url"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="https://www.example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mesai Başlangıç
                                </label>
                                <input
                                    type="time"
                                    name="work_start_time"
                                    value={formData.work_start_time || '09:00'}
                                    onChange={handleChange}
                                    className="input-field"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mesai Bitiş
                                </label>
                                <input
                                    type="time"
                                    name="work_end_time"
                                    value={formData.work_end_time || '20:00'}
                                    onChange={handleChange}
                                    className="input-field"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Randevu Aralığı (dk)
                                </label>
                                <select
                                    name="slot_interval"
                                    value={formData.slot_interval || 30}
                                    onChange={(e) => setFormData(p => ({ ...p, slot_interval: Number(e.target.value) }))}
                                    className="input-field"
                                >
                                    <option value={15}>15 dk</option>
                                    <option value={20}>20 dk</option>
                                    <option value={30}>30 dk</option>
                                    <option value={40}>40 dk</option>
                                    <option value={45}>45 dk</option>
                                    <option value={60}>60 dk</option>
                                    <option value={75}>75 dk</option>
                                    <option value={90}>90 dk</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Adres Bilgileri */}
                    <div className="card">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Adres Bilgileri</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    İl
                                </label>
                                <select
                                    value={selectedProvince || ''}
                                    onChange={(e) => setSelectedProvince(parseInt(e.target.value))}
                                    className="input-field"
                                >
                                    <option value="">İl Seçiniz</option>
                                    {provinces.map(province => (
                                        <option key={province.id} value={province.id}>
                                            {province.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    İlçe
                                </label>
                                <select
                                    value={selectedDistrict || ''}
                                    onChange={(e) => setSelectedDistrict(parseInt(e.target.value))}
                                    className="input-field"
                                    disabled={!selectedProvince}
                                >
                                    <option value="">İlçe Seçiniz</option>
                                    {districts.map(district => (
                                        <option key={district.id} value={district.id}>
                                            {district.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mahalle
                                </label>
                                <select
                                    value={selectedNeighborhood || ''}
                                    onChange={(e) => setSelectedNeighborhood(parseInt(e.target.value))}
                                    className="input-field"
                                    disabled={!selectedDistrict}
                                >
                                    <option value="">Mahalle Seçiniz</option>
                                    {neighborhoods.map(neighborhood => (
                                        <option key={neighborhood.id} value={neighborhood.id}>
                                            {neighborhood.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Adres
                                </label>
                                <input
                                    type="text"
                                    name="address_line"
                                    value={formData.address_line}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="Sokak, cadde, bina no, daire no"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Posta Kodu
                                </label>
                                <input
                                    type="text"
                                    name="postal_code"
                                    value={formData.postal_code}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="06000"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Harita */}
                    <div className="card">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Konum Seçimi</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Harita üzerinde firmayı işaretlemek için tıklayın
                        </p>
                        <div className="h-96 rounded-lg overflow-hidden border border-gray-300">
                            <MapContainer
                                center={mapCenter}
                                zoom={15}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <MapController center={mapCenter} />
                                <LocationMarker position={mapPosition} setPosition={setMapPosition} />
                            </MapContainer>
                        </div>
                        {mapPosition && (
                            <p className="text-sm text-gray-600 mt-2">
                                Seçili konum: {mapPosition.lat.toFixed(6)}, {mapPosition.lng.toFixed(6)}
                            </p>
                        )}
                    </div>

                    {/* Banka Bilgileri */}
                    <div className="card">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Banka Bilgileri</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Banka Adı
                                </label>
                                <input
                                    type="text"
                                    name="bank_name"
                                    value={formData.bank_name}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="Örn: Ziraat Bankası"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Şube
                                </label>
                                <input
                                    type="text"
                                    name="bank_branch"
                                    value={formData.bank_branch}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="Şube adı"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    IBAN
                                </label>
                                <input
                                    type="text"
                                    name="iban"
                                    value={formData.iban}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                                    maxLength={34}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Hesap Sahibi
                                </label>
                                <input
                                    type="text"
                                    name="account_holder_name"
                                    value={formData.account_holder_name}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="Ad Soyad / Firma Ünvanı"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Komisyon Oranı (%)
                                </label>
                                <input
                                    type="number"
                                    name="commission_rate"
                                    value={formData.commission_rate}
                                    onChange={handleChange}
                                    className="input-field"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="payment_enabled"
                                    checked={formData.payment_enabled}
                                    onChange={(e) => setFormData(prev => ({ ...prev, payment_enabled: e.target.checked }))}
                                    className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                                />
                                <label className="ml-2 text-sm text-gray-700">
                                    Ödeme sistemi aktif
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* SMS Ayarları */}
                    <div className="card border-l-4 border-violet-500">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </span>
                            SMS Sunucu Entegrasyonu
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 flex items-center gap-3 p-4 bg-violet-50 rounded-xl">
                                <input
                                    type="checkbox"
                                    id="sms_active"
                                    checked={formData.sms_enabled !== false}
                                    onChange={(e) => setFormData(prev => ({ ...prev, sms_enabled: e.target.checked }))}
                                    className="w-5 h-5 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                                />
                                <label htmlFor="sms_active" className="text-sm font-bold text-violet-900 select-none cursor-pointer">
                                    Bu Firma İçin Otomatik SMS Bildirimlerini Aktif Et
                                </label>
                            </div>

                            {formData.sms_enabled !== false && (
                                <div className="md:col-span-2 p-4 bg-violet-100 rounded-xl border border-violet-200">
                                    <p className="text-sm text-violet-800 font-medium">Sistem merkezi NetGSM altyapısını kullanmaktadır. Bu firmaya ait randevular onaylandığında veya iptal edildiğinde, arka planda otomatik olarak müşteriye SMS gönderilecektir. Ekstra bir ayar yapmanıza gerek yoktur.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tablet Dashboard Ayarları */}
                    <div className="card border-l-4 border-amber-500">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </span>
                            Tablet Dashboard (Salon Board)
                        </h2>
                        <div className="bg-amber-50 p-4 rounded-xl mb-6">
                            <p className="text-sm text-amber-800 leading-relaxed font-medium">
                                İş yerindeki tabletin sürekli açık kalması ve tüm çalışanların randevularını matrix formatında görebilmesi için bir erişim anahtarı belirleyin. Bu anahtar cihaza özeldir ve şifre yerine geçer.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Dashboard Erişim Anahtarı (Board Key)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        name="board_key"
                                        value={formData.board_key || ''}
                                        onChange={handleChange}
                                        className="input-field font-mono text-lg"
                                        placeholder="Örn: SALON-TABLET-123"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, board_key: `BOARD-${Math.random().toString(36).substr(2, 9).toUpperCase()}` }))}
                                        className="bg-amber-100 text-amber-700 font-bold px-4 rounded-xl hover:bg-amber-200 transition-colors"
                                    >
                                        Oluştur
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 italic">* Bu anahtarı iş yerindeki tablette bir kez girmeniz yeterli olacaktır.</p>
                            </div>
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Kaydet'}
                        </button>
                        <Link to="/companies" className="btn-secondary">
                            İptal
                        </Link>
                    </div>
                </form>
            </main>
        </div >
    );
}
