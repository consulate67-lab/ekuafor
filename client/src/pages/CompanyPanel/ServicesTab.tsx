/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import type { Ctx } from './index';

export function ServicesTab({ ctx }: { ctx: Ctx }) {
    const { company, companyServices, setShowTemplatesModal, setShowServiceModal, setServiceForm, handleDeleteService, templates, handleAddFromTemplate } = ctx;
    return (
                        <div className="space-y-6">
                                <>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowTemplatesModal(true)}
                                            className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            📋 Şablonlardan Ekle
                                        </button>
                                        <button
                                            onClick={() => {
                                                setServiceForm({ id: null, name: '', description: '', duration_minutes: 30, price: 0, department_id: null, photo: null, quantity: '', unit: '' });
                                                setShowServiceModal(true);
                                            }}
                                            className="flex-[2] py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-base tracking-wide shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
                                        >
                                            + Yeni Hizmet Ekle
                                        </button>
                                    </div>

                                    {companyServices.length === 0 ? (
                                        <div className="bg-white rounded-3xl p-10 text-center shadow-lg shadow-slate-200/20">
                                            <span className="text-4xl mb-3 block">✂️</span>
                                            <p className="text-slate-400 font-bold">Henüz hizmet tanımlanmadı</p>
                                            <p className="text-slate-300 text-xs mt-1">Firmanız için hizmet listesi oluşturun</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {companyServices.map(svc => (
                                                <div key={svc.id} className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/20 relative group flex gap-4">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex-shrink-0 flex items-center justify-center text-slate-300 overflow-hidden border border-slate-100">
                                                        {svc.photo ? (
                                                            <img src={svc.photo} alt={svc.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758L5 19m0-14l4.121 4.121" /></svg>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="min-w-0">
                                                                <h3 className="font-black text-slate-900 text-base truncate">{svc.name}</h3>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap">
                                                                        ⏱️ {svc.duration_minutes} dk • 💰 {svc.price} ₺
                                                                    </p>
                                                                    {svc.quantity && svc.unit && (
                                                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded-lg text-[8px] font-black uppercase whitespace-nowrap">{svc.quantity} {svc.unit}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex bg-slate-50 rounded-xl p-1 gap-1">
                                                                <button
                                                                    onClick={() => {
                                                                        setServiceForm({
                                                                            id: svc.id,
                                                                            name: svc.name,
                                                                            description: svc.description || '',
                                                                            duration_minutes: svc.duration_minutes,
                                                                            price: svc.price,
                                                                            department_id: svc.department_id || null,
                                                                            photo: svc.photo || null,
                                                                            quantity: svc.quantity || '',
                                                                            unit: svc.unit || ''
                                                                        });
                                                                        setShowServiceModal(true);
                                                                    }}
                                                                    className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-indigo-600 transition-all font-bold"
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteService(svc.id)}
                                                                    className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-red-600 transition-all font-bold"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {svc.description && (
                                                            <p className="text-sm text-slate-500 mt-2 line-clamp-2">{svc.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                        </div>
    );
}

export function ServiceModal({ ctx }: { ctx: Ctx }) {
    const { showServiceModal, setShowServiceModal, serviceForm, setServiceForm, handleSaveService, isSavingService, departments } = ctx;
    return (
                    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowServiceModal(false)}>
                        <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-10 shadow-2xl h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}
                            style={{ animation: 'slideUp 0.3s ease-out' }}>
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                            <h2 className="text-2xl font-black text-slate-900 mb-6">{serviceForm.id ? 'Hizmeti Düzenle' : 'Yeni Hizmet'}</h2>

                            <div className="space-y-4">
                                <div className="flex justify-center mb-6">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-3xl bg-slate-50 overflow-hidden border-4 border-white shadow-xl flex items-center justify-center text-slate-300">
                                            {serviceForm.photo ? (
                                                <img src={serviceForm.photo} alt="Hizmet" className="w-full h-full object-cover" />
                                            ) : (
                                                <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002-2z" /></svg>
                                            )}
                                        </div>
                                        <label className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setServiceForm(p => ({ ...p, photo: reader.result as string }));
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Hizmet Adı</label>
                                    <input
                                        type="text"
                                        value={serviceForm.name}
                                        onChange={e => setServiceForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Örn: Saç Kesimi"
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-pink-500 text-base font-bold text-slate-900 outline-none"
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Miktar ({company?.service_label || 'Hizmet'})</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={serviceForm.quantity}
                                            onChange={e => setServiceForm(p => ({ ...p, quantity: e.target.value }))}
                                            placeholder="Örn: 100"
                                            className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-pink-500 text-base font-bold text-slate-900 outline-none"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Birim</label>
                                        <select
                                            value={serviceForm.unit}
                                            onChange={e => setServiceForm(p => ({ ...p, unit: e.target.value }))}
                                            className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-pink-500 text-base font-bold text-slate-900 outline-none appearance-none"
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
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Süre (Dk)</label>
                                        <input
                                            type="number"
                                            value={serviceForm.duration_minutes}
                                            onChange={e => setServiceForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 0 }))}
                                            className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-pink-500 text-base font-bold text-slate-900 outline-none"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Ücret (₺)</label>
                                        <input
                                            type="number"
                                            value={serviceForm.price}
                                            onChange={e => setServiceForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                                            className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-pink-500 text-base font-bold text-slate-900 outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Departman (Opsiyonel)</label>
                                    <select
                                        value={serviceForm.department_id || ''}
                                        onChange={e => setServiceForm(p => ({ ...p, department_id: e.target.value ? parseInt(e.target.value) : null }))}
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-pink-500 text-base font-bold text-slate-900 outline-none appearance-none"
                                    >
                                        <option value="">Tüm Departmanlar</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Açıklama</label>
                                    <textarea
                                        value={serviceForm.description}
                                        onChange={e => setServiceForm(p => ({ ...p, description: e.target.value }))}
                                        rows={3}
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-pink-500 text-base font-bold text-slate-900 outline-none resize-none"
                                    />
                                </div>

                                <div className="flex gap-3 mt-6 pt-4">
                                    <button
                                        onClick={() => setShowServiceModal(false)}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-base active:scale-95 transition-all"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        onClick={handleSaveService}
                                        disabled={isSavingService}
                                        className="flex-1 py-4 bg-pink-600 text-white rounded-2xl font-black text-base active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                    >
                                        {isSavingService ? 'Kaydediliyor...' : (serviceForm.id ? 'Güncelle' : 'Kaydet')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
    );
}

export function TemplatesModal({ ctx }: { ctx: Ctx }) {
    const { showTemplatesModal, setShowTemplatesModal, templates, handleAddFromTemplate } = ctx;
    return (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowTemplatesModal(false)}>
                        <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setShowTemplatesModal(false)} className="absolute top-6 right-6 p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors z-10">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <div className="p-10 border-b border-slate-50 flex flex-col bg-slate-50/30">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Hizmet Şablonları</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sık kullanılan hizmetleri hızlıca ekleyin</p>
                            </div>
                            <div className="p-10 overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div>
                                        <h4 className="text-indigo-600 font-black uppercase tracking-widest text-[10px] mb-6 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                                            Berber & Erkek
                                        </h4>
                                        <div className="space-y-3">
                                            {templates.men.map((t, i) => (
                                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group">
                                                    <div>
                                                        <p className="font-bold text-[11px] text-slate-900">{t.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{t.duration} dk • ₺{t.price}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            handleAddFromTemplate(t);
                                                            setShowTemplatesModal(false);
                                                        }}
                                                        className="w-8 h-8 bg-white shadow-sm border border-slate-100 text-indigo-600 rounded-lg font-black flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-pink-600 font-black uppercase tracking-widest text-[10px] mb-6 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-pink-600 rounded-full"></span>
                                            Kuaför & Kadın
                                        </h4>
                                        <div className="space-y-3">
                                            {templates.women.map((t, i) => (
                                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-pink-100 hover:bg-pink-50/30 transition-all group">
                                                    <div>
                                                        <p className="font-bold text-[11px] text-slate-900">{t.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{t.duration} dk • ₺{t.price}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            handleAddFromTemplate(t);
                                                            setShowTemplatesModal(false);
                                                        }}
                                                        className="w-8 h-8 bg-white shadow-sm border border-slate-100 text-pink-600 rounded-lg font-black flex items-center justify-center group-hover:bg-pink-600 group-hover:text-white transition-all"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-rose-600 font-black uppercase tracking-widest text-[10px] mb-6 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-rose-600 rounded-full"></span>
                                            Güzellik Merkezi
                                        </h4>
                                        <div className="space-y-3">
                                            {templates.beauty.map((t, i) => (
                                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-rose-100 hover:bg-rose-50/30 transition-all group">
                                                    <div>
                                                        <p className="font-bold text-[11px] text-slate-900">{t.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{t.duration} dk • ₺{t.price}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            handleAddFromTemplate(t);
                                                            setShowTemplatesModal(false);
                                                        }}
                                                        className="w-8 h-8 bg-white shadow-sm border border-slate-100 text-rose-600 rounded-lg font-black flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
    );
}
