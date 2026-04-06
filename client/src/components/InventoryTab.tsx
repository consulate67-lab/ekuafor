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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeSubTab === 'warehouse' && (
                    loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-64 bg-slate-50 rounded-[2.5rem] animate-pulse"></div>
                        ))
                    ) : filteredProducts.map((p) => (
                        <div 
                            key={p.id}
                            className="group relative bg-white border border-slate-100 rounded-[2.5rem] p-6 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 overflow-hidden"
                        >
                            {/* Stock Bar */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-slate-50">
                                <div 
                                    className={`h-full ${p.current_stock <= p.min_stock_level ? 'bg-rose-500' : 'bg-emerald-500'} transition-all`}
                                    style={{ width: `${Math.min((p.current_stock / (p.min_stock_level * 2 || 1)) * 100, 100)}%` }}
                                ></div>
                            </div>

                            <div className="flex justify-between items-start mb-6">
                                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                    <Droplets className="w-8 h-8" />
                                </div>
                                <div className="flex flex-col items-end gap-2 text-right">
                                    {p.track_stock ? (
                                        <div className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest">
                                            Stok İzleme Aktif
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 text-slate-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest">
                                            Sarfiyat Takibi
                                        </div>
                                    )}
                                    {p.track_stock && p.current_stock <= p.min_stock_level && (
                                        <div className="text-rose-500 flex items-center gap-1 text-[9px] font-black uppercase italic">
                                            <AlertTriangle className="w-3 h-3" />
                                            Kritik Seviye!
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 italic opacity-70">{p.brand}</div>
                                <h3 className="text-lg font-black text-slate-900 leading-tight mb-2 tracking-tighter">{p.name}</h3>
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="px-3 py-1 bg-slate-50 rounded-full text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        {p.category_name}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-end justify-between border-t border-slate-50 pt-6 mt-4">
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mevcut Stok</div>
                                    <div className="text-3xl font-black text-slate-900 tracking-tighter flex items-baseline gap-1">
                                        {p.current_stock}
                                        <span className="text-xs text-slate-400 uppercase font-bold">{p.unit}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { setSelectedProduct(p); setShowAssignModal(true); }}
                                    className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white p-4 rounded-2xl transition-all active:scale-90 shadow-sm"
                                    title="Zimmetle"
                                >
                                    <UserPlus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
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
