import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Service } from '../types';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';

export default function ServiceManagement() {
    const { user } = useAuthStore();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [formData, setFormData] = useState<Partial<Service>>({
        name: '',
        description: '',
        duration_minutes: 30,
        price: 0
    });

    const fetchServices = async () => {
        try {
            const response = await api.get('/services');
            setServices(response.data.data);
        } catch (err: any) {
            console.error('Hizmetler yüklenirken hata:', err);
            const apiError = err.response?.data?.error;
            const details = err.response?.data?.details;

            if (details) {
                setError(`Hata: ${apiError} (${JSON.stringify(details)}) - Path: ${err.response?.data?.path || 'N/A'}`);
            } else {
                setError(`${apiError || err.message || 'Hizmetler yüklenirken hata oluştu'} (Path: ${err.response?.data?.path || 'N/A'})`);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (formData.id) {
                await api.put(`/services/${formData.id}`, formData);
            } else {
                await api.post('/services', formData);
            }
            setShowForm(false);
            setFormData({ name: '', description: '', duration_minutes: 30, price: 0 });
            fetchServices();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Hizmet kaydedilirken hata oluştu');
            setLoading(false);
        }
    };

    const handleEdit = (service: Service) => {
        setFormData(service);
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Bu hizmeti silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/services/${id}`);
            fetchServices();
        } catch (err) {
            setError('Hizmet silinirken hata oluştu');
        }
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
            fetchServices();
            // Modal açık kalsın, çoklu ekleme yapılabilsin
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

    if (loading && services.length === 0) return <div className="p-8 text-center">Yükleniyor...</div>;

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-10">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Link to="/dashboard" className="text-violet-600 hover:text-violet-800 text-xs font-bold uppercase tracking-widest mb-1 inline-block">
                        ← Dashboard
                    </Link>
                    <h2 className="text-3xl font-bold text-gray-900">Hizmet Yönetimi</h2>
                    <p className="text-gray-500 font-medium">Verdiğiniz hizmetleri ve fiyatlarını buradan yönetebilirsiniz.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowTemplates(true)}
                        className="btn-secondary py-2 px-5 flex items-center gap-2 text-sm font-bold border-gray-200 hover:border-violet-200 hover:bg-violet-50 text-gray-600 hover:text-violet-700"
                    >
                        <span className="text-lg">📋</span>
                        Firma Hizmetleri
                    </button>
                    <button
                        onClick={() => {
                            setFormData({ name: '', description: '', duration_minutes: 30, price: 0 });
                            setShowForm(true);
                        }}
                        className="btn-primary py-2 px-5 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Yeni Hizmet
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl">
                    <p className="text-red-700 font-bold flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </p>
                </div>
            )}

            {!user?.company_id && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-6 mb-8 rounded-r-xl shadow-sm">
                    <h3 className="text-lg font-bold text-amber-800 mb-2">Firma Bilgisi Eksik (Firma No: #Tanımsız)</h3>
                    <p className="text-amber-700 mb-4">
                        Hesabınıza tanımlı bir firma bulunamadı. Lütfen aşağıya firma numaranızı girerek devam edin.
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            id="quick-company-id"
                            className="input-field py-2 w-32"
                            placeholder="Firma No"
                            defaultValue="1"
                        />
                        <button
                            onClick={async () => {
                                const val = (document.getElementById('quick-company-id') as HTMLInputElement).value;
                                if (!val) return;
                                try {
                                    const res = await api.post('/auth/update-company', { company_id: parseInt(val) });
                                    if (res.data.success) {
                                        const { user, token } = res.data.data;
                                        // Update local store
                                        useAuthStore.getState().login(user, token);
                                        window.location.reload();
                                    }
                                } catch (e: any) {
                                    alert('Hata: ' + e.message);
                                }
                            }}
                            className="btn-primary py-2 px-4text-sm"
                        >
                            Firma Bilgisini Güncelle
                        </button>
                    </div>
                </div>
            )}

            {showForm ? (
                <div className="card animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase ml-1">Hizmet Adı</label>
                                <input
                                    type="text"
                                    required
                                    className="input-field py-3"
                                    placeholder="Örn: Saç Kesimi"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase ml-1">Süre (Dakika)</label>
                                <input
                                    type="number"
                                    required
                                    className="input-field py-3"
                                    placeholder="30"
                                    value={formData.duration_minutes}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setFormData({ ...formData, duration_minutes: isNaN(val) ? 0 : val });
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase ml-1">Ücret (₺)</label>
                                <input
                                    type="number"
                                    required
                                    className="input-field py-3"
                                    placeholder="150"
                                    value={formData.price}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setFormData({ ...formData, price: isNaN(val) ? 0 : val });
                                    }}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase ml-1">Açıklama (Opsiyonel)</label>
                                <textarea
                                    className="input-field py-3 min-h-[100px]"
                                    placeholder="Hizmet hakkında kısa bilgi..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-4 pt-4 border-t border-gray-100">
                            <button type="submit" className="btn-primary flex-1 py-3 text-sm font-bold shadow-lg shadow-pink-500/20">
                                {formData.id ? 'Güncelle' : 'Kaydet'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); setFormData({ name: '', description: '', duration_minutes: 30, price: 0 }); }}
                                className="btn-secondary flex-1 py-3 text-sm font-bold border-gray-100"
                            >
                                İptal
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {services.map((service) => (
                        <div key={service.id} className="card group hover:scale-[1.01] transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-pink-50 p-3 rounded-xl text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758L5 19m0-14l4.121 4.121" />
                                    </svg>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(service)}
                                        className="p-2 text-gray-400 hover:text-pink-600 transition-colors"
                                        title="Düzenle"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(service.id!)}
                                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                        title="Sil"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">{service.name}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">{service.description || 'Açıklama belirtilmemiş.'}</p>
                            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase">
                                    <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {service.duration_minutes} Dakika
                                </span>
                                <span className="text-lg font-black text-pink-600">₺{service.price}</span>
                            </div>
                        </div>
                    ))}
                    {services.length === 0 && (
                        <div className="md:col-span-2 card border-dashed py-20 text-center">
                            <p className="text-gray-400 font-bold mb-4">Henüz bir hizmet tanımlanmamış.</p>
                            <button onClick={() => setShowForm(true)} className="btn-secondary py-2 px-6 text-sm">İlk Hizmeti Ekle</button>
                        </div>
                    )}
                </div>
            )}
            {/* Template Modal */}
            {showTemplates && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">Hazır Hizmet Listesi</h3>
                                <p className="text-sm text-gray-500 font-medium">Listenize eklemek istediğiniz hizmetleri seçin.</p>
                            </div>
                            <button onClick={() => setShowTemplates(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Erkek Hizmetleri */}
                                <div>
                                    <h4 className="text-indigo-600 font-black uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                                        <span className="bg-indigo-100 p-1.5 rounded-lg">👨</span> Erkek Kuaförü
                                    </h4>
                                    <div className="space-y-3">
                                        {Templates.men.map((t, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                                                <div>
                                                    <p className="font-bold text-gray-900">{t.name}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{t.duration} dk • ₺{t.price}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleAddFromTemplate(t)}
                                                    className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-colors"
                                                >
                                                    + Ekle
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Kadın Hizmetleri */}
                                <div>
                                    <h4 className="text-pink-600 font-black uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                                        <span className="bg-pink-100 p-1.5 rounded-lg">👩</span> Kadın Kuaförü
                                    </h4>
                                    <div className="space-y-3">
                                        {Templates.women.map((t, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-pink-200 hover:bg-pink-50/30 transition-all group">
                                                <div>
                                                    <p className="font-bold text-gray-900">{t.name}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{t.duration} dk • ₺{t.price}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleAddFromTemplate(t)}
                                                    className="px-3 py-1.5 bg-pink-100 text-pink-700 rounded-lg text-xs font-bold hover:bg-pink-600 hover:text-white transition-colors"
                                                >
                                                    + Ekle
                                                </button>
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
