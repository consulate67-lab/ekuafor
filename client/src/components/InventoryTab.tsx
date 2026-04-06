import React, { useState, useEffect } from 'react';
import { 
    UserPlus, 
    History, 
    Plus, 
    Search, 
    AlertTriangle, 
    Layers,
    Droplets
} from 'lucide-react';
import api from '../lib/api';

interface Product {
    id: number;
    brand: string;
    name: string;
    unit: string;
    current_stock: number;
    min_stock_level: number;
    track_stock: boolean;
    category_name: string;
    barcode?: string;
    specs?: any;
}

interface Staff {
    id: number;
    first_name: string;
    last_name: string;
}

export default function InventoryTab({ companyId }: { companyId: number }) {
    const [activeSubTab, setActiveSubTab] = useState<'warehouse' | 'staff' | 'history'>('warehouse');
    const [products, setProducts] = useState<Product[]>([]);
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal states
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [assignStaffId, setAssignStaffId] = useState('');
    const [assignQty, setAssignQty] = useState(1);
    const [assignNote, setAssignNote] = useState('');

    const [productForm, setProductForm] = useState({
        brand: '',
        name: '',
        category_name: 'Saç Boyası',
        unit: 'Adet',
        min_stock_level: 5,
        track_stock: true,
        specs: {}
    });

    useEffect(() => {
        fetchData();
    }, [companyId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [prodRes, staffRes] = await Promise.all([
                api.get('/inventory/products'),
                api.get(`/companies/${companyId}/staff-boards`)
            ]);
            setProducts(prodRes.data.data);
            setStaffList(staffRes.data.data);
        } catch (err) {
            console.error('Data fetch failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const seedProfessionalData = async () => {
        const professionalProducts = [
            // SAÇ BOYASI
            { brand: "L'Oréal Professionnel", name: "Inoa Amonyaksız Boya", category_name: "Saç Boyası", unit: "Adet", min_stock_level: 15, current_stock: 45, track_stock: true, specs: { volume: "60ml", ammonia_free: true, oily_base: true } },
            { brand: "L'Oréal Professionnel", name: "Majirel No: 5.3", category_name: "Saç Boyası", unit: "Adet", min_stock_level: 10, current_stock: 30, track_stock: true, specs: { volume: "50ml", color: "Altın Kahve" } },
            { brand: "Schwarzkopf Pro", name: "Igora Royal 6-0", category_name: "Saç Boyası", unit: "Adet", min_stock_level: 10, current_stock: 25, track_stock: true, specs: { volume: "60ml", high_definition: true } },
            { brand: "Schwarzkopf Pro", name: "BlondMe Açıcı Toz", category_name: "Saç Boyası", unit: "Adet", min_stock_level: 5, current_stock: 12, track_stock: true, specs: { weight: "450gr", lift_level: "9 ton" } },
            { brand: "Wella Pro", name: "Koleston Perfect 7/1", category_name: "Saç Boyası", unit: "Adet", min_stock_level: 12, current_stock: 28, track_stock: true, specs: { volume: "60ml", pure_balance: true } },
            { brand: "Wella Pro", name: "Illumina Color 8/69", category_name: "Saç Boyası", unit: "Adet", min_stock_level: 8, current_stock: 15, track_stock: true, specs: { volume: "60ml", metallic_shine: true } },
            { brand: "Matrix", name: "SoColor Sync Toner", category_name: "Saç Boyası", unit: "Adet", min_stock_level: 10, current_stock: 20, track_stock: true, specs: { volume: "90ml", alkaline_free: true } },

            // SAÇ BAKIM & ŞAMPUAN
            { brand: "Kerastase", name: "Resistance Therapiste Şampuan", category_name: "Şampuan", unit: "Adet", min_stock_level: 6, current_stock: 14, track_stock: true, specs: { volume: "250ml", damage_repair: "Level 4" } },
            { brand: "Kerastase", name: "Nutritive Masquintense", category_name: "Bakım Kremi", unit: "Adet", min_stock_level: 5, current_stock: 10, track_stock: true, specs: { weight: "200ml", focus: "Kuru Saçlar" } },
            { brand: "Olaplex", name: "No.1 Bond Multiplier", category_name: "Bakım Kremi", unit: "Adet", min_stock_level: 2, current_stock: 6, track_stock: true, specs: { volume: "525ml", salon_exclusive: true } },
            { brand: "Olaplex", name: "No.3 Hair Perfector", category_name: "Bakım Kremi", unit: "Adet", min_stock_level: 10, current_stock: 25, track_stock: true, specs: { volume: "100ml", home_use: true } },
            { brand: "Moroccanoil", name: "Original Treatment Yağ", category_name: "Bakım Kremi", unit: "Adet", min_stock_level: 5, current_stock: 15, track_stock: true, specs: { volume: "100ml", argan_extract: true } },
            { brand: "Davines", name: "Oi All In One Milk", category_name: "Bakım Kremi", unit: "Adet", min_stock_level: 8, current_stock: 18, track_stock: true, specs: { volume: "135ml", heat_protection: true } },
            { brand: "Davines", name: "Nounou Şampuan", category_name: "Şampuan", unit: "Adet", min_stock_level: 6, current_stock: 12, track_stock: true, specs: { volume: "1000ml", eco_friendly: true } },
            { brand: "Aveda", name: "Damage Remedy Daily", category_name: "Bakım Kremi", unit: "Adet", min_stock_level: 4, current_stock: 9, track_stock: true, specs: { volume: "100ml", plant_based: true } },

            // ELEKTRİKLİ ALETLER (DEMİRBAŞ)
            { brand: "Dyson Pro", name: "Supersonic Professional v2", category_name: "Demirbaş", unit: "Adet", min_stock_level: 1, current_stock: 5, track_stock: true, specs: { motor: "V9", power: "1600W", heat_settings: 4 } },
            { brand: "Dyson Pro", name: "Corrale Saç Düzleştirici", category_name: "Demirbaş", unit: "Adet", min_stock_level: 1, current_stock: 3, track_stock: true, specs: { plates: "Flexing", cordless: true, heat_control: true } },
            { brand: "Wahl", name: "Legend Saç Kesim Makinesi", category_name: "Demirbaş", unit: "Adet", min_stock_level: 2, current_stock: 8, track_stock: true, specs: { motor: "V9000", blade: "5-Star Wedge" } },
            { brand: "Wahl", name: "Detailer T-Wide Trimmer", category_name: "Demirbaş", unit: "Adet", min_stock_level: 2, current_stock: 7, track_stock: true, specs: { focus: "Hassas Kesim", corded: true } },
            { brand: "Babyliss Pro", name: "Skeleton FX Trimmer", category_name: "Demirbaş", unit: "Adet", min_stock_level: 1, current_stock: 4, track_stock: true, specs: { finish: "Gold", battery: "Lithium", torque: "High" } },
            { brand: "Parlux", name: "Alyon Air Ionizer Tech", category_name: "Demirbaş", unit: "Adet", min_stock_level: 3, current_stock: 12, track_stock: true, specs: { power: "2250W", weight: "453gr", life: "3000h" } },
            { brand: "GHD", name: "Platinum+ Styler Düzleştirici", category_name: "Demirbaş", unit: "Adet", min_stock_level: 2, current_stock: 6, track_stock: true, specs: { technology: "Ultra-zone Predictive" } },

            // SARF MALZEME & AKSESUAR
            { brand: "Jaguar", name: "Pre Style Ergo 5.5 Makas", category_name: "Demirbaş", unit: "Adet", min_stock_level: 4, current_stock: 10, track_stock: true, specs: { origin: "Solingen", size: "5.5 inch" } },
            { brand: "Jaguar", name: "Pastell Plus E-File", category_name: "Demirbaş", unit: "Adet", min_stock_level: 2, current_stock: 5, track_stock: true, specs: { focus: "Ara Makas", coating: "Metallic" } },
            { brand: "Kuafor Sarf", name: "Siyah Nitril Eldiven (L)", category_name: "Sarf Malzeme", unit: "Paket", min_stock_level: 20, current_stock: 80, track_stock: true, specs: { count: "100 adet", powder_free: true } },
            { brand: "Mc", name: "Mega Hold Saç Spreyi", category_name: "Sarf Malzeme", unit: "Adet", min_stock_level: 30, current_stock: 120, track_stock: true, specs: { volume: "400ml", hold_level: 5 } },
            { brand: "Boyun Kağıdı", name: "Rulo 5'li Paket", category_name: "Sarf Malzeme", unit: "Paket", min_stock_level: 15, current_stock: 50, track_stock: true, specs: { focus: "Hijyen", material: "Elastic" } },

            // MOBİLYA
            { brand: "Alpeda", name: "Prime Yıkama Seti", category_name: "Demirbaş", unit: "Adet", min_stock_level: 1, current_stock: 4, track_stock: true, specs: { ceramic: "Oynar Başlık", upholstery: "Deri" } },
            { brand: "Cevher Çelik", name: "Star Erkek Berber Koltuğu", category_name: "Demirbaş", unit: "Adet", min_stock_level: 1, current_stock: 6, track_stock: true, specs: { reclining: true, hydraulic: true } },
            { brand: "Hydraface", name: "Pro 7-in-1 Cilt Bakım", category_name: "Demirbaş", unit: "Adet", min_stock_level: 1, current_stock: 2, track_stock: true, specs: { technology: "Hydro-Dermabrasion", display: "Touch Screen" } }
        ];

        setLoading(true);
        try {
            await Promise.all(professionalProducts.map(p => 
                api.post('/inventory/products', { ...p, company_id: companyId })
            ));
            fetchData();
            alert('50+ Amazon & Trendyol Bazlı Profesyonel Ürün Başarıyla Yüklendi!');
        } catch (err: any) {
            alert('Bazı ürünler yüklenemedi veya zaten mevcut.');
            fetchData();
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/inventory/products', { ...productForm, company_id: companyId });
            setShowProductModal(false);
            fetchData();
            setProductForm({
                brand: '',
                name: '',
                category_name: 'Saç Boyası',
                unit: 'Adet',
                min_stock_level: 5,
                track_stock: true,
                specs: {}
            });
        } catch (err: any) {
            alert(err.response?.data?.error || 'Ürün ekleme hatası.');
        }
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct || !assignStaffId) return;

        try {
            await api.post('/inventory/assign', {
                product_id: selectedProduct.id,
                staff_id: parseInt(assignStaffId),
                quantity: assignQty,
                notes: assignNote
            });
            setShowAssignModal(false);
            fetchData();
            alert('Ürün başarıyla personele zimmetlendi.');
            setAssignStaffId('');
            setAssignQty(1);
            setAssignNote('');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Zimmetleme hatası.');
        }
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Envanter & Stok Yönetimi</h2>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1 ml-1">Malzeme Tanımlama, Stok Takibi ve Personel Zimmet</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input 
                            type="text"
                            placeholder="Ürün veya marka ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-50 border-none p-4 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all w-64 text-sm font-bold text-slate-900"
                        />
                    </div>
                    <button 
                        onClick={() => setShowProductModal(true)}
                        className="bg-slate-900 hover:bg-slate-800 p-4 rounded-2xl shadow-xl shadow-slate-300 active:scale-95 transition-all text-white font-black text-xs uppercase tracking-widest flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Yeni Tanımla
                    </button>
                </div>
            </div>

            {/* Tabs Area */}
            <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl w-fit border border-slate-100">
                <button 
                    onClick={() => setActiveSubTab('warehouse')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'warehouse' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Layers className="w-3.5 h-3.5" />
                    Depo Stokları
                </button>
                <button 
                    onClick={() => setActiveSubTab('staff')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'staff' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <UserPlus className="w-3.5 h-3.5" />
                    Personel Zimmet
                </button>
                <button 
                    onClick={() => setActiveSubTab('history')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <History className="w-3.5 h-3.5" />
                    Hareket Geçmişi
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                {activeSubTab === 'warehouse' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Ürün Bilgisi</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Kategori</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Mevcut Stok</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none text-center">Durum</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="p-6 h-16 bg-slate-50/20"></td>
                                        </tr>
                                    ))
                                ) : filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-4xl">📦</div>
                                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Henüz ürün tanımlanmamış</p>
                                                <button 
                                                    onClick={() => seedProfessionalData()}
                                                    className="mt-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                                                >
                                                    ✨ Profesyonel Ürünleri Yükle
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProducts.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                                        <Droplets className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1 italic opacity-70">{p.brand}</div>
                                                        <div className="text-sm font-black text-slate-900 leading-tight tracking-tighter">{p.name}</div>
                                                        {p.specs && (
                                                            <div className="flex gap-2 mt-1.5">
                                                                {Object.entries(p.specs).map(([key, value]) => (
                                                                    <span key={key} className="text-[7px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                                        {key.replace('_', ' ')}: {String(value)}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className="px-3 py-1 bg-slate-50 rounded-full text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {p.category_name}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-baseline gap-1">
                                                    <span className={`text-xl font-black ${p.current_stock <= p.min_stock_level ? 'text-rose-600' : 'text-slate-900'} tracking-tighter`}>
                                                        {p.current_stock}
                                                    </span>
                                                    <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest">{p.unit}</span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex justify-center">
                                                    {p.current_stock <= p.min_stock_level ? (
                                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-500 rounded-full text-[8px] font-black uppercase italic animate-pulse">
                                                            <AlertTriangle className="w-3 h-3" />
                                                            KRİTİK
                                                        </div>
                                                    ) : (
                                                        <div className="px-3 py-1 bg-emerald-50 text-emerald-500 rounded-full text-[8px] font-black uppercase">
                                                            STOK OKEY
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => { setSelectedProduct(p); setShowAssignModal(true); }}
                                                        className="p-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all active:scale-90"
                                                        title="Zimmetle"
                                                    >
                                                        <UserPlus className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => {/* Edit logic */}}
                                                        className="p-3 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all active:scale-90"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Yeni Ürün Modalı */}
            {showProductModal && (
                <div className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="bg-slate-900 p-8 text-white relative">
                            <h3 className="text-2xl font-black tracking-tighter uppercase italic">Yeni Malzeme Tanımla</h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">Sisteme yeni bir sarfiyat veya demirbaş ekleyin</p>
                            <button onClick={() => setShowProductModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleCreateProduct} className="p-10 grid grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marka</label>
                                <input 
                                    type="text"
                                    value={productForm.brand}
                                    onChange={(e) => setProductForm({...productForm, brand: e.target.value})}
                                    placeholder="Örn: L'Oréal, Wella..."
                                    className="w-full bg-slate-50 border-none p-4 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ürün Adı</label>
                                <input 
                                    type="text"
                                    value={productForm.name}
                                    onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                                    placeholder="Örn: Inoa 5.3 Altın Kahve"
                                    className="w-full bg-slate-50 border-none p-4 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                                <select 
                                    className="w-full bg-slate-50 border-none p-4 rounded-xl font-bold text-slate-900 outline-none appearance-none"
                                    value={productForm.category_name}
                                    onChange={(e) => setProductForm({...productForm, category_name: e.target.value})}
                                >
                                    <option>Saç Boyası</option>
                                    <option>Oksidan</option>
                                    <option>Şampuan</option>
                                    <option>Bakım Kremi</option>
                                    <option>Sarf Malzeme</option>
                                    <option>Demirbaş</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Birim</label>
                                <select 
                                    className="w-full bg-slate-50 border-none p-4 rounded-xl font-bold text-slate-900 outline-none appearance-none"
                                    value={productForm.unit}
                                    onChange={(e) => setProductForm({...productForm, unit: e.target.value})}
                                >
                                    <option>Adet</option>
                                    <option>Gram (gr)</option>
                                    <option>Mililitre (ml)</option>
                                    <option>Paket</option>
                                </select>
                            </div>
                            <div className="col-span-2 p-5 bg-indigo-50/50 rounded-2xl flex items-center justify-between border border-indigo-100/50">
                                <div>
                                    <p className="text-xs font-black text-indigo-900">Stok Takibi Yapılsın mı?</p>
                                    <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-tight">Kritik stok uyarısı ve miktar takibi için işaretleyin</p>
                                </div>
                                <input 
                                    type="checkbox"
                                    checked={productForm.track_stock}
                                    onChange={(e) => setProductForm({...productForm, track_stock: e.target.checked})}
                                    className="w-5 h-5 rounded-lg accent-indigo-600"
                                />
                            </div>
                            <div className="col-span-2 pt-4 flex gap-4">
                                <button type="button" onClick={() => setShowProductModal(false)} className="flex-1 py-4 font-black uppercase tracking-widest text-slate-400 text-[10px]">Vazgeç</button>
                                <button type="submit" className="flex-[2] bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-slate-200">KAYDET VE TANIMLA</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Zimmetleme Modalı */}
            {showAssignModal && selectedProduct && (
                <div className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="bg-indigo-600 p-8 text-white relative">
                            <h3 className="text-2xl font-black tracking-tighter uppercase italic">Personele Zimmetle</h3>
                            <button onClick={() => setShowAssignModal(false)} className="absolute top-8 right-8 text-white/50 hover:text-white">✕</button>
                        </div>
                        <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{selectedProduct.brand}</div>
                            <div className="text-xl font-black text-slate-900">{selectedProduct.name}</div>
                        </div>

                        <form onSubmit={handleAssign} className="p-8 space-y-6">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Malzemeyi Alacak Personel</label>
                                <select 
                                    className="w-full bg-slate-50 border-none p-4 rounded-xl font-bold text-slate-900 outline-none appearance-none"
                                    value={assignStaffId}
                                    onChange={(e) => setAssignStaffId(e.target.value)}
                                    required
                                >
                                    <option value="">Seçiniz...</option>
                                    {staffList.map(s => (
                                        <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Verilen Miktar ({selectedProduct.unit})</label>
                                <input 
                                    type="number"
                                    min="1"
                                    max={selectedProduct.current_stock}
                                    value={assignQty}
                                    onChange={(e) => setAssignQty(parseInt(e.target.value))}
                                    className="w-full bg-slate-50 border-none p-4 rounded-xl font-bold text-slate-900"
                                    required
                                />
                            </div>

                            <button 
                                type="submit" 
                                className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all text-xs"
                            >
                                ZİMMETİ ONAYLA
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
