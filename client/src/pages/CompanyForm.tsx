import React, { useState, useEffect } from 'react';
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
        bank_name: '',
        bank_branch: '',
        iban: '',
        account_holder_name: '',
        commission_rate: 0,
        payment_enabled: false,
    });

    // Address data
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);

    const [selectedProvince, setSelectedProvince] = useState<number | null>(null);
    const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
    const [selectedNeighborhood, setSelectedNeighborhood] = useState<number | null>(null);

    // Map position
    const [mapPosition, setMapPosition] = useState<LatLng | null>(
        new LatLng(39.9334, 32.8597) // Ankara default
    );

    useEffect(() => {
        fetchProvinces();
        if (isEdit) {
            fetchCompany();
        }
    }, []);

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

    const fetchProvinces = async () => {
        try {
            const response = await api.get('/address/provinces');
            setProvinces(response.data.data);
        } catch (err) {
            console.error('İller yüklenirken hata:', err);
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
            setFormData(company);

            if (company.province_id) setSelectedProvince(company.province_id);
            if (company.district_id) setSelectedDistrict(company.district_id);
            if (company.neighborhood_id) setSelectedNeighborhood(company.neighborhood_id);

            if (company.latitude && company.longitude) {
                setMapPosition(new LatLng(company.latitude, company.longitude));
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Firma yüklenirken hata oluştu');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const province = provinces.find(p => p.id === selectedProvince);
            const district = districts.find(d => d.id === selectedDistrict);
            const neighborhood = neighborhoods.find(n => n.id === selectedNeighborhood);

            const data: Partial<Company> = {
                ...formData,
                province_id: selectedProvince || undefined,
                province_name: province?.name,
                district_id: selectedDistrict || undefined,
                district_name: district?.name,
                neighborhood_id: selectedNeighborhood || undefined,
                neighborhood_name: neighborhood?.name,
                latitude: mapPosition?.lat,
                longitude: mapPosition?.lng,
            };

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <Link to="/companies" className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block">
                        ← Firma Listesine Dön
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEdit ? 'Firma Düzenle' : 'Yeni Firma Ekle'}
                    </h1>
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
                                center={mapPosition || new LatLng(39.9334, 32.8597)}
                                zoom={13}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
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
                                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                />
                                <label className="ml-2 text-sm text-gray-700">
                                    Ödeme sistemi aktif
                                </label>
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
        </div>
    );
}
