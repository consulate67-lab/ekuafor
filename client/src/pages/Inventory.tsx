import React, { useState, useEffect } from 'react';
import { 
    Package, 
    UserPlus, 
    History, 
    Plus, 
    Search, 
    ArrowRightLeft, 
    AlertTriangle, 
    Layers,
    Droplets
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

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


export default function Inventory() {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'warehouse' | 'staff' | 'history'>('warehouse');
    const [products, setProducts] = useState<Product[]>([]);
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal states
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [assignStaffId, setAssignStaffId] = useState('');
    const [assignQty, setAssignQty] = useState(1);
    const [assignNote, setAssignNote] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [prodRes, staffRes] = await Promise.all([
                api.get('/inventory/products'),
                api.get(`/companies/${user?.company_id}/staff-boards`)
            ]);
            setProducts(prodRes.data.data);
            setStaffList(staffRes.data.data);
        } catch (err) {
            console.error('Data fetch failed:', err);
        } finally {
            setLoading(false);
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
        } catch (err: any) {
            alert(err.response?.data?.error || 'Zimmetleme hatası.');
        }
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-6 pb-24 font-sans">
            {/* Header Area */}
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/40">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-3xl font-black tracking-tighter uppercase italic">Envanter & Stok</h1>
                        </div>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest pl-1">Akıllı Malzeme ve Zimmet Yönetimi</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input 
                                type="text"
                                placeholder="Ürün veya marka ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all w-64 text-sm font-bold"
                            />
                        </div>
                        <button className="bg-indigo-600 hover:bg-indigo-500 p-4 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Yeni Ürün
                        </button>
                    </div>
                </div>

                {/* Tabs Area */}
                <div className="flex gap-2 p-1 bg-white/5 rounded-3xl w-fit mb-8 border border-white/5 backdrop-blur-md">
                    <button 
                        onClick={() => setActiveTab('warehouse')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'warehouse' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Layers className="w-4 h-4" />
                        Depo Stokları
                    </button>
                    <button 
                        onClick={() => setActiveTab('staff')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'staff' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'}`}
                    >
                        <UserPlus className="w-4 h-4" />
                        Personel Zimmet
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'}`}
                    >
                        <History className="w-4 h-4" />
                        Hareket Geçmişi
                    </button>
                </div>

                {/* Content Area */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {activeTab === 'warehouse' && (
                        loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-64 bg-white/5 rounded-[2.5rem] animate-pulse border border-white/5"></div>
                            ))
                        ) : filteredProducts.map((p) => (
                            <div 
                                key={p.id}
                                className="group relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 hover:bg-white/10 transition-all duration-500 overflow-hidden"
                            >
                                {/* Stock Bar */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                                    <div 
                                        className={`h-full ${p.current_stock <= p.min_stock_level ? 'bg-rose-500' : 'bg-emerald-500'} transition-all`}
                                        style={{ width: `${Math.min((p.current_stock / (p.min_stock_level * 2 || 1)) * 100, 100)}%` }}
                                    ></div>
                                </div>

                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                        <Droplets className="w-8 h-8" />
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {p.track_stock ? (
                                            <div className="bg-emerald-500/20 text-emerald-500 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-500/10">
                                                Stok İzleniyor
                                            </div>
                                        ) : (
                                            <div className="bg-slate-500/20 text-slate-400 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-500/10">
                                                Genel Sarfiyat
                                            </div>
                                        )}
                                        {p.track_stock && p.current_stock <= p.min_stock_level && (
                                            <div className="bg-rose-500/20 text-rose-500 p-2 rounded-xl flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter">
                                                <AlertTriangle className="w-3 h-3" />
                                                Düşük Stok
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 italic opacity-70">{p.brand}</div>
                                    <h3 className="text-xl font-black text-white leading-tight mb-2 tracking-tighter">{p.name}</h3>
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-white/5">
                                            {p.category_name}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-end justify-between border-t border-white/10 pt-6 mt-4">
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Mevcut Stok</div>
                                        <div className="text-3xl font-black text-white tracking-tighter flex items-baseline gap-1">
                                            {p.current_stock}
                                            <span className="text-xs text-slate-500 uppercase font-bold">{p.unit}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => { setSelectedProduct(p); setShowAssignModal(true); }}
                                        className="bg-white/10 hover:bg-white/20 p-4 rounded-3xl transition-all active:scale-90 group/btn shadow-xl"
                                    >
                                        <UserPlus className="w-5 h-5 text-indigo-400 group-hover/btn:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Zimmetleme Modalı */}
            {showAssignModal && selectedProduct && (
                <div className="fixed inset-0 z-[1000] bg-[#0f172a]/80 backdrop-blur-2xl flex items-center justify-center p-6">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl shadow-indigo-900/50 animate-in zoom-in-95 duration-300">
                        <div className="bg-indigo-600 p-8 text-white">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-white/20 p-3 rounded-2xl">
                                    <ArrowRightLeft className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-black tracking-tighter uppercase italic">Personele Zimmetle</h3>
                            </div>
                            <div className="bg-white/10 p-5 rounded-3xl border border-white/10">
                                <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-100 mb-1">{selectedProduct.brand}</div>
                                <div className="text-xl font-black">{selectedProduct.name}</div>
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-[10px] font-black bg-white text-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                        Stok: {selectedProduct.current_stock} {selectedProduct.unit}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleAssign} className="p-10 space-y-8">
                            <div className="space-y-2">
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4 italic">Malzemeyi Alacak Personel</label>
                                <select 
                                    className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-slate-800 outline-none focus:border-indigo-600 transition-all"
                                    value={assignStaffId}
                                    onChange={(e) => setAssignStaffId(e.target.value)}
                                    required
                                >
                                    <option value="">Personel Seçiniz...</option>
                                    {staffList.map(s => (
                                        <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4 italic">Verilen Miktar ({selectedProduct.unit})</label>
                                <input 
                                    type="number"
                                    min="1"
                                    max={selectedProduct.current_stock}
                                    value={assignQty}
                                    onChange={(e) => setAssignQty(parseInt(e.target.value))}
                                    className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-slate-800 outline-none focus:border-indigo-600 transition-all"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4 italic">Açıklama / Not (Opsiyonel)</label>
                                <textarea 
                                    value={assignNote}
                                    onChange={(e) => setAssignNote(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-600 transition-all h-24 resize-none"
                                    placeholder="Örn: Renk açıcı hazırlığı için verildi..."
                                ></textarea>
                            </div>

                            <div className="flex gap-4">
                                <button 
                                    type="button" 
                                    onClick={() => setShowAssignModal(false)}
                                    className="flex-1 p-5 rounded-2xl font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                                >
                                    Vazgeç
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-[2] bg-indigo-600 text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all text-xs"
                                >
                                    ZİMMETİ ONAYLA
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
