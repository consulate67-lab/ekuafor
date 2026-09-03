/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import type { Ctx } from './index';

export function ServicesTab({ ctx }: { ctx: Ctx }) {
    const { company, companyServices, packages, activeServiceTab, setActiveServiceTab, setShowTemplatesModal, setShowServiceModal, setServiceForm, setShowPackageModal, setPackageForm, handleDeleteService, handleDeletePackage, templates, handleAddFromTemplate } = ctx;
    return (
                        <div className="space-y-6">
                            {/* Nested Tabs for Services/Packages */}
                            <div className="flex bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-100 shadow-sm gap-1 self-start">
                                <button
                                    onClick={() => setActiveServiceTab('services')}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeServiceTab === 'services' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    Hizmetler
                                </button>
                                <button
                                    onClick={() => setActiveServiceTab('packages')}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeServiceTab === 'packages' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    Paketler
                                </button>
                            </div>

                            {activeServiceTab === 'services' ? (
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
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            setPackageForm({ id: null, name: '', description: '', duration_minutes: 0, price: 0, items: [], department_id: null, staff_id: null });
                                            setShowPackageModal(true);
                                        }}
                                        className="w-full py-5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-2xl font-black text-base tracking-wide shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
                                    >
                                        + Yeni Paket Ekle
                                    </button>

                                    {packages.length === 0 ? (
                                        <div className="bg-white rounded-3xl p-10 text-center shadow-lg shadow-slate-200/20">
                                            <span className="text-4xl mb-3 block">🎁</span>
                                            <p className="text-slate-400 font-bold">Henüz paket tanımlanmadı</p>
                                            <p className="text-slate-300 text-xs mt-1">Firmanız için özel paketler oluşturun</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {packages.map(pkg => (
                                                <div key={pkg.id} className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/20 relative group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h3 className="font-black text-slate-900 text-lg">{pkg.name}</h3>
                                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                                                                ⏱️ {pkg.duration_minutes} dk • 💰 {pkg.price} ₺
                                                            </p>
                                                        </div>
                                                        <div className="flex bg-slate-50 rounded-xl p-1 gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    setPackageForm({
                                                                        id: pkg.id,
                                                                        name: pkg.name,
                                                                        description: pkg.description || '',
                                                                        duration_minutes: pkg.duration_minutes,
                                                                        price: pkg.price,
                                                                        items: pkg.services?.filter((s: any) => s.id !== null).map((s: any) => ({
                                                                            service_id: s.id,
                                                                            staff_id: s.staff_id || null,
                                                                            department_id: s.department_id || null,
                                                                            price: s.price || 0,
                                                                            duration_minutes: s.duration_minutes || 0
                                                                        })) || [],
                                                                        department_id: pkg.department_id || null,
                                                                        staff_id: pkg.staff_id || null
                                                                    });
                                                                    setShowPackageModal(true);
                                                                }}
                                                                className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-indigo-600 transition-all font-bold"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeletePackage(pkg.id)}
                                                                className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-red-600 transition-all font-bold"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {pkg.services?.map((s: any) => (
                                                            <span key={s.id} className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md text-[9px] font-black uppercase">{s.name}</span>
                                                        ))}
                                                    </div>
                                                    {pkg.description && (
                                                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">{pkg.description}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
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

export function PackageModal({ ctx }: { ctx: Ctx }) {
    const { showPackageModal, setShowPackageModal, packageForm, setPackageForm, companyServices, toggleServiceInPackage, handleUpdateServiceDuration, handleUpdateServicePrice, handleUpdateServiceDept, handleUpdateServiceStaff, staffBoards, departments, handleSavePackage, isSavingPackage } = ctx;
    return (
                    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowPackageModal(false)}>
                        <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-10 shadow-2xl h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}
                            style={{ animation: 'slideUp 0.3s ease-out' }}>
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                            <h2 className="text-2xl font-black text-slate-900 mb-6">{packageForm.id ? 'Paketi Düzenle' : 'Yeni Paket'}</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Paket Adı</label>
                                    <input
                                        type="text"
                                        value={packageForm.name}
                                        onChange={e => setPackageForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Örn: Gelin Paketi"
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-amber-500 text-base font-bold text-slate-900 outline-none"
                                    />
                                </div>



                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Hizmet Seçimi</label>
                                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-100">
                                        {companyServices.length === 0 ? (
                                            <div className="col-span-2 py-4 text-center">
                                                <p className="text-[10px] text-slate-400">Henüz hizmet tanımlanmamış. Önce hizmet ekleyin.</p>
                                            </div>
                                        ) : companyServices.map(svc => {
                                            const isSelected = packageForm.items.some(i => i.service_id === svc.id);
                                            return (
                                                <button
                                                    key={svc.id}
                                                    type="button"
                                                    onClick={() => toggleServiceInPackage(svc.id)}
                                                    className={`p-3 rounded-xl border text-left transition-all ${isSelected ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-sm' : 'bg-white border-transparent text-slate-400'}`}
                                                >
                                                    <p className="font-black text-[10px] truncate">{svc.name}</p>
                                                    <p className="text-[8px] opacity-60">{svc.duration_minutes} dk | ₺{svc.price}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-2 ml-1">* Pakete dahil edilecek hizmetleri seçin</p>
                            </div>

                            {/* Per-service Staff Selection */}
                            {packageForm.items.length > 0 && (
                                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Hizmet Bazlı Personel Atama</label>
                                    <p className="text-[8px] text-slate-400 mb-3 ml-1">* Her hizmet için farklı bir uzman seçebilirsiniz (Opsiyonel)</p>
                                    <div className="space-y-2">
                                        {packageForm.items.map(item => {
                                            const svc = companyServices.find(s => s.id === item.service_id);
                                            if (!svc) return null;
                                            return (
                                                <div key={item.service_id} className="flex flex-col gap-2 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-[11px] font-black text-slate-700 truncate">{svc.name}</p>
                                                        <span className="text-[9px] text-slate-400 font-bold px-2 py-0.5 bg-slate-50 rounded-full">{svc.duration_minutes} dk</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 ml-1">Süre (Dk)</label>
                                                            <input
                                                                type="number"
                                                                value={item.duration_minutes}
                                                                onChange={e => handleUpdateServiceDuration(item.service_id, parseInt(e.target.value) || 0)}
                                                                className="w-full p-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-900 outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 ml-1">Fiyat (₺)</label>
                                                            <input
                                                                type="number"
                                                                value={item.price}
                                                                onChange={e => handleUpdateServicePrice(item.service_id, parseFloat(e.target.value) || 0)}
                                                                className="w-full p-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-900 outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 ml-1">Departman</label>
                                                            <select
                                                                value={item.department_id || ''}
                                                                onChange={e => handleUpdateServiceDept(item.service_id, e.target.value ? parseInt(e.target.value) : null)}
                                                                className="w-full p-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-900 outline-none"
                                                            >
                                                                <option value="">Tümü</option>
                                                                {departments.map(dept => (
                                                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 ml-1">Personel</label>
                                                            <select
                                                                value={item.staff_id || ''}
                                                                onChange={e => handleUpdateServiceStaff(item.service_id, e.target.value ? parseInt(e.target.value) : null)}
                                                                className="w-full p-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-900 outline-none"
                                                            >
                                                                <option value="">Atanmamış</option>
                                                                {staffBoards
                                                                    .filter(s => !item.department_id || s.department_id === item.department_id)
                                                                    .map(s => (
                                                                        <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                                                                    ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Toplam Süre (Dk)</label>
                                    <input
                                        type="number"
                                        value={packageForm.duration_minutes}
                                        onChange={e => setPackageForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 0 }))}
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-amber-500 text-base font-bold text-slate-900 outline-none"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Paket Ücreti (₺)</label>
                                    <input
                                        type="number"
                                        value={packageForm.price}
                                        onChange={e => setPackageForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-amber-500 text-base font-bold text-slate-900 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Açıklama</label>
                                <textarea
                                    value={packageForm.description}
                                    onChange={e => setPackageForm(p => ({ ...p, description: e.target.value }))}
                                    rows={2}
                                    placeholder="Paket içeriği ve detaylar..."
                                    className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-amber-500 text-base font-bold text-slate-900 outline-none resize-none"
                                />
                            </div>

                            <div className="flex gap-3 mt-6 pt-4">
                                <button
                                    onClick={() => setShowPackageModal(false)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-base active:scale-95 transition-all"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleSavePackage}
                                    disabled={isSavingPackage}
                                    className="flex-1 py-4 bg-amber-600 text-white rounded-2xl font-black text-base active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {isSavingPackage ? 'Kaydediliyor...' : (packageForm.id ? 'Güncelle' : 'Kaydet')}
                                </button>
                            </div>
                        </div>
                    </div>
    );
}
