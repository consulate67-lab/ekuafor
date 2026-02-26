import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Service, Package } from '../types';
import { Link } from 'react-router-dom';

export default function ServiceManagement() {
    const [activeTab, setActiveTab] = useState<'services' | 'packages'>('services');
    const [services, setServices] = useState<Service[]>([]);
    const [packages, setPackages] = useState<Package[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);

    // Service Form State
    const [formData, setFormData] = useState<Partial<Service>>({
        name: '',
        description: '',
        duration_minutes: 30,
        price: 0,
        quantity: null,
        unit: null,
        photo: null
    });

    // Package Form State
    const [packageFormData, setPackageFormData] = useState<{
        id?: number;
        name: string;
        description: string;
        duration_minutes: number;
        price: number;
        service_ids: number[];
    }>({
        name: '',
        description: '',
        duration_minutes: 0,
        price: 0,
        service_ids: []
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [servicesRes, packagesRes] = await Promise.all([
                api.get('/services'),
                api.get('/packages')
            ]);
            setServices(servicesRes.data.data);
            setPackages(packagesRes.data.data);
        } catch (err: any) {
            console.error('Veriler yüklenirken hata:', err);
            setError('Veriler yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (activeTab === 'services') {
                if (formData.id) {
                    await api.put(`/services/${formData.id}`, formData);
                } else {
                    await api.post('/services', formData);
                }
            } else {
                if (packageFormData.id) {
                    await api.put(`/packages/${packageFormData.id}`, packageFormData);
                } else {
                    await api.post('/packages', packageFormData);
                }
            }
            setShowForm(false);
            resetForms();
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'İşlem sırasında hata oluştu');
            setLoading(false);
        }
    };

    const resetForms = () => {
        setFormData({ name: '', description: '', duration_minutes: 30, price: 0, quantity: null, unit: null, photo: null });
        setPackageFormData({ name: '', description: '', duration_minutes: 0, price: 0, service_ids: [] });
    };

    const handleEditService = (service: Service) => {
        setFormData(service);
        setShowForm(true);
    };

    const handleEditPackage = (pkg: Package) => {
        setPackageFormData({
            id: pkg.id,
            name: pkg.name,
            description: pkg.description || '',
            duration_minutes: pkg.duration_minutes,
            price: pkg.price,
            service_ids: pkg.services?.map(s => s.id!) || []
        });
        setShowForm(true);
    };

    const handleDelete = async (id: number, type: 'services' | 'packages') => {
        if (!window.confirm('Bu öğeyi silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/${type}/${id}`);
            fetchData();
        } catch (err) {
            setError('Silme işlemi sırasında hata oluştu');
        }
    };

    const toggleServiceInPackage = (serviceId: number) => {
        const currentIds = [...packageFormData.service_ids];
        const index = currentIds.indexOf(serviceId);

        if (index > -1) {
            currentIds.splice(index, 1);
        } else {
            currentIds.push(serviceId);
        }

        // Calculate total duration and price from selected services
        const selectedServices = services.filter(s => currentIds.includes(s.id!));
        const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
        const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);

        setPackageFormData({
            ...packageFormData,
            service_ids: currentIds,
            duration_minutes: totalDuration,
            price: totalPrice
        });
    };

    const handleAddFromTemplate = async (template: any) => {
        setLoading(true);
        try {
            await api.post('/services', {
                name: template.name,
                description: template.description || '',
                duration_minutes: template.duration,
                price: template.price
            });
            fetchData();
        } catch (err: any) {
            alert('Hizmet eklenirken hata: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const Templates = {
        men: [
            { name: 'Saç Kesimi', duration: 30, price: 200, description: 'Yıkama dahil saç kesimi' },
            { name: 'Sakal Tıraşı', duration: 15, price: 100, description: 'Sakal düzeltme ve şekillendirme' },
            { name: 'Saç & Sakal', duration: 45, price: 280, description: 'Komple bakım paketi' },
            { name: 'Çocuk Tıraşı', duration: 20, price: 150, description: '12 yaş altı' },
            { name: 'Saç Boyama', duration: 60, price: 500, description: 'Dip boya veya komple' },
            { name: 'Fön', duration: 15, price: 80, description: 'Yıkama ve fön' }
        ],
        women: [
            { name: 'Saç Kesimi', duration: 45, price: 300, description: 'Yıkama ve şekillendirme dahil' },
            { name: 'Fön', duration: 30, price: 150, description: 'Düz veya dalgalı fön' },
            { name: 'Dip Boya', duration: 90, price: 600, description: 'Dip boyama işlemi' },
            { name: 'Komple Boya', duration: 120, price: 1000, description: 'Tüm saç boyama' },
            { name: 'Ombre / Balyaj', duration: 180, price: 2000, description: 'Açma boyama işlemleri' },
            { name: 'Manikür', duration: 30, price: 200, description: 'Klasik manikür' },
            { name: 'Pedikür', duration: 45, price: 300, description: 'Klasik pedikür' },
            { name: 'Kaş Bıyık', duration: 15, price: 100, description: 'İple veya ağda ile' }
        ]
    };

    if (loading && services.length === 0 && packages.length === 0) {
        return <div className="p-8 text-center">Yükleniyor...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50/30 pb-20">
            <div className="bg-white px-6 pt-12 pb-2 border-b border-slate-100 sticky top-0 z-40 backdrop-blur-xl bg-white/80">
                <div className="flex justify-between items-center mb-6">
                    <Link to="/dashboard" className="flex items-center gap-1 text-violet-600 font-bold text-xs uppercase tracking-widest">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                        Panel
                    </Link>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowTemplates(true)}
                            className="p-2.5 bg-slate-50 text-slate-400 hover:text-violet-600 rounded-xl transition-all"
                            title="Şablonlar"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                        </button>
                        <button
                            onClick={() => {
                                resetForms();
                                setShowForm(true);
                            }}
                            className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg hover:bg-slate-800 transition-all"
                            title={activeTab === 'services' ? 'Hizmet Ekle' : 'Paket Ekle'}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">İşlem Yönetimi</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Hizmet ve paketlerinizi yönetin</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mt-4 overflow-x-auto no-scrollbar pb-2">
                    <button
                        onClick={() => { setActiveTab('services'); setShowForm(false); }}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'services' ? 'bg-violet-600 text-white shadow-lg shadow-violet-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                    >
                        Hizmetler ({services.length})
                    </button>
                    <button
                        onClick={() => { setActiveTab('packages'); setShowForm(false); }}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'packages' ? 'bg-violet-600 text-white shadow-lg shadow-violet-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                    >
                        Paketler ({packages.length})
                    </button>
                </div>
            </div>

            {error && (
                <div className="px-6 mt-6">
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
                        <p className="text-red-700 font-bold flex items-center gap-2">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </p>
                    </div>
                </div>
            )}

            {showForm ? (
                <div className="px-6 py-8">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h3 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-tight">
                            {activeTab === 'services'
                                ? (formData.id ? 'Hizmeti Düzenle' : 'Yeni Hizmet Ekle')
                                : (packageFormData.id ? 'Paketi Düzenle' : 'Yeni Paket Ekle')
                            }
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {activeTab === 'services' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 flex justify-center">
                                        <div className="relative group">
                                            <div className="w-32 h-32 rounded-[2.5rem] bg-slate-100 overflow-hidden border-4 border-white shadow-xl">
                                                {formData.photo ? (
                                                    <img src={formData.photo} alt="Service" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002-2z" /></svg>
                                                    </div>
                                                )}
                                            </div>
                                            <label className="absolute -bottom-2 -right-2 bg-violet-600 text-white p-3 rounded-2xl shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                setFormData({ ...formData, photo: reader.result as string });
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">Hizmet Adı</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 font-bold text-slate-900 placeholder:text-slate-300"
                                            placeholder="Örn: Saç Kesimi"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">Süre (Dakika)</label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 font-bold text-slate-900"
                                            value={formData.duration_minutes}
                                            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">Ücret (₺)</label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 font-bold text-slate-900"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">Miktar</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 font-bold text-slate-900 placeholder:text-slate-300"
                                            placeholder="Opsiyonel"
                                            value={formData.quantity ?? ''}
                                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value ? parseFloat(e.target.value) : null })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">Birim</label>
                                        <select
                                            className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 font-bold text-slate-900"
                                            value={formData.unit || ''}
                                            onChange={(e) => setFormData({ ...formData, unit: e.target.value || null })}
                                        >
                                            <option value="">Seçiniz</option>
                                            <option value="adet">Adet</option>
                                            <option value="seans">Seans</option>
                                            <option value="ml">ml</option>
                                            <option value="lt">Litre</option>
                                            <option value="gr">Gram</option>
                                            <option value="kg">Kilogram</option>
                                            <option value="paket">Paket</option>
                                            <option value="kişi">Kişi</option>
                                            <option value="m²">m²</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">Açıklama</label>
                                        <textarea
                                            className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 font-bold text-slate-900 min-h-[100px]"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">Paket Adı</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 font-bold text-slate-900 placeholder:text-slate-300"
                                            placeholder="Örn: Gelin Paketi"
                                            value={packageFormData.name}
                                            onChange={(e) => setPackageFormData({ ...packageFormData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">Hizmet Seçimi</label>
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            {services.map(s => (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => toggleServiceInPackage(s.id!)}
                                                    className={`p-4 rounded-2xl border text-left transition-all ${packageFormData.service_ids.includes(s.id!) ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-slate-50 border-transparent text-slate-400'}`}
                                                >
                                                    <p className="font-bold text-xs">{s.name}</p>
                                                    <p className="text-[10px] opacity-60">{s.duration_minutes} dk | ₺{s.price}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">Toplam Süre (Dakika)</label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 font-bold text-slate-900"
                                            value={packageFormData.duration_minutes}
                                            onChange={(e) => setPackageFormData({ ...packageFormData, duration_minutes: parseInt(e.target.value) || 0 })}
                                        />
                                        <p className="text-[9px] text-slate-400 mt-1 ml-1">* Seçilen hizmetlere göre otomatik hesaplanır, düzenlenebilir.</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">Paket Ücreti (₺)</label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 font-bold text-slate-900"
                                            value={packageFormData.price}
                                            onChange={(e) => setPackageFormData({ ...packageFormData, price: parseFloat(e.target.value) || 0 })}
                                        />
                                        <p className="text-[9px] text-slate-400 mt-1 ml-1">* Toplam hizmet bedelinden indirimli bir fiyat belirleyebilirsiniz.</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">Paket Açıklaması</label>
                                        <textarea
                                            className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 font-bold text-slate-900 min-h-[100px]"
                                            value={packageFormData.description}
                                            onChange={(e) => setPackageFormData({ ...packageFormData, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-4 pt-4">
                                <button type="submit" className="flex-1 bg-violet-600 text-white py-5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-violet-100 active:scale-95 transition-all">
                                    {(activeTab === 'services' ? formData.id : packageFormData.id) ? 'Güncelle' : 'Kaydet'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); resetForms(); }}
                                    className="flex-1 bg-slate-50 text-slate-400 py-5 rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-100"
                                >
                                    İptal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="px-6 py-8">
                    {activeTab === 'services' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                            {services.map((service) => (
                                <div key={service.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative group hover:scale-[1.01] transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 overflow-hidden">
                                            {service.photo ? (
                                                <img src={service.photo} alt={service.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758L5 19m0-14l4.121 4.121" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditService(service)}
                                                className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:text-violet-600 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(service.id!, 'services')}
                                                className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:text-red-500 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">{service.name}</h3>
                                    <p className="text-xs font-bold text-slate-400 line-clamp-2 mb-6 h-8">{service.description || 'Hizmet açıklaması eklenmemiş.'}</p>
                                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{service.duration_minutes} dk</span>
                                            </div>
                                            {service.quantity && service.unit && (
                                                <span className="text-[10px] font-bold text-violet-400 bg-violet-50 px-2 py-0.5 rounded-lg">{service.quantity} {service.unit}</span>
                                            )}
                                        </div>
                                        <span className="text-xl font-black text-violet-600">₺{service.price}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                            {packages.map((pkg) => (
                                <div key={pkg.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative group hover:scale-[1.01] transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 text-2xl">
                                            🎁
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditPackage(pkg)}
                                                className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:text-violet-600 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(pkg.id!, 'packages')}
                                                className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:text-red-500 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">{pkg.name}</h3>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {pkg.services?.map(s => (
                                            <span key={s.id} className="px-2 py-1 bg-slate-50 text-[10px] font-bold text-slate-500 rounded-lg">{s.name}</span>
                                        ))}
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 line-clamp-2 mb-6 h-8">{pkg.description || 'Paket açıklaması eklenmemiş.'}</p>
                                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pkg.duration_minutes} Dakika</span>
                                        </div>
                                        <span className="text-xl font-black text-amber-600">₺{pkg.price}</span>
                                    </div>
                                </div>
                            ))}
                            {packages.length === 0 && (
                                <div className="md:col-span-2 py-20 text-center bg-white rounded-[3rem] border border-slate-100 border-dashed">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200 text-3xl">🎁</div>
                                    <p className="text-slate-400 font-bold mb-6">Henüz paket tanımlanmamış.</p>
                                    <button onClick={() => setShowForm(true)} className="bg-violet-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest">İlk Paketi Ekle</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Template Modal */}
            {showTemplates && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col relative">
                        <button onClick={() => setShowTemplates(false)} className="absolute top-6 right-6 p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors z-10">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="p-10 border-b border-slate-50 flex flex-col bg-slate-50/30">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Hizmet Şablonları</h3>
                        </div>
                        <div className="p-10 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div>
                                    <h4 className="text-indigo-600 font-black uppercase tracking-widest text-xs mb-6">Erkek Kuaförü</h4>
                                    <div className="space-y-4">
                                        {Templates.men.map((t, i) => (
                                            <div key={i} className="flex items-center justify-between p-5 rounded-3xl border border-slate-100">
                                                <span>{t.name} (₺{t.price})</span>
                                                <button onClick={() => handleAddFromTemplate(t)} className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl">+</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-pink-600 font-black uppercase tracking-widest text-xs mb-6">Kadın Kuaförü</h4>
                                    <div className="space-y-4">
                                        {Templates.women.map((t, i) => (
                                            <div key={i} className="flex items-center justify-between p-5 rounded-3xl border border-slate-100">
                                                <span>{t.name} (₺{t.price})</span>
                                                <button onClick={() => handleAddFromTemplate(t)} className="w-10 h-10 bg-pink-50 text-pink-600 rounded-xl">+</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
