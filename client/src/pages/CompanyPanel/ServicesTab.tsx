/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import type { Ctx } from './index';
import { emptyServiceForm } from './useCompanyPanel';
import { BOOKING_MODE_TEXT } from '../../lib/labels';
import { sectorsApi } from '../../api/sectors';

export function ServicesTab({ ctx }: { ctx: Ctx }) {
    const { companyServices, setShowTemplatesModal, setShowServiceModal, setServiceForm, handleDeleteService } = ctx;
    return (
        <div className="space-y-6">
            <div className="flex gap-2">
                <button
                    onClick={() => setShowTemplatesModal(true)}
                    className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    📋 Şablonlardan Ekle
                </button>
                <button
                    onClick={() => {
                        setServiceForm(emptyServiceForm);
                        setShowServiceModal(true);
                    }}
                    className="flex-[2] py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-base tracking-wide shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
                >
                    + Yeni Hizmet Ekle
                </button>
            </div>

            {companyServices.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center shadow-lg shadow-slate-200/20">
                    <span className="text-4xl mb-3 block">🧾</span>
                    <p className="text-slate-400 font-bold">Henüz hizmet tanımlanmadı</p>
                    <p className="text-slate-300 text-xs mt-1">Şablonlardan ekleyebilir veya kendiniz oluşturabilirsiniz</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {companyServices.map(svc => {
                        const mode = BOOKING_MODE_TEXT[svc.booking_mode || 'staff'];
                        return (
                            <div key={svc.id} className="bg-white rounded-3xl p-5 shadow-xl shadow-slate-200/20 flex gap-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl overflow-hidden border border-slate-100">
                                    {svc.photo ? <img src={svc.photo} alt={svc.name} className="w-full h-full object-cover" /> : mode.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="min-w-0">
                                            <h3 className="font-black text-slate-900 text-base truncate">{svc.name}</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                                ⏱️ {svc.booking_mode === 'resource' && svc.duration_options?.length ? svc.duration_options.join('/') : svc.duration_minutes} dk • 💰 {svc.price} ₺
                                            </p>
                                            <span className="inline-block mt-2 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase">{mode.label}</span>
                                        </div>
                                        <div className="flex bg-slate-50 rounded-xl p-1 gap-1 shrink-0">
                                            <button
                                                aria-label="Düzenle"
                                                onClick={() => {
                                                    setServiceForm({
                                                        ...emptyServiceForm,
                                                        id: svc.id,
                                                        name: svc.name,
                                                        description: svc.description || '',
                                                        duration_minutes: svc.duration_minutes,
                                                        price: svc.price,
                                                        department_id: svc.department_id || null,
                                                        photo: svc.photo || null,
                                                        quantity: svc.quantity || '',
                                                        unit: svc.unit || '',
                                                        booking_mode: svc.booking_mode || 'staff',
                                                        duration_options: (svc.duration_options || []).join(', '),
                                                        resource_ids: svc.resource_ids || [],
                                                    });
                                                    setShowServiceModal(true);
                                                }}
                                                className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600"
                                            >
                                                ✏️
                                            </button>
                                            <button aria-label="Sil" onClick={() => handleDeleteService(svc.id)} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-600">
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                    {svc.description && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{svc.description}</p>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const inputClass = 'w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 text-base font-bold text-slate-900 outline-none';
const labelClass = 'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2';

export function ServiceModal({ ctx }: { ctx: Ctx }) {
    const { company, setShowServiceModal, serviceForm, setServiceForm, handleSaveService, isSavingService, departments } = ctx;
    const [resources, setResources] = useState<any[]>([]);

    useEffect(() => {
        if (serviceForm.booking_mode !== 'resource' || !company?.id) return;
        api.get('/resources', { params: { company_id: company.id } })
            .then(res => setResources((res.data?.data || []).filter(r => r.is_active)))
            .catch(() => setResources([]));
    }, [serviceForm.booking_mode, company?.id]);

    const toggleResource = (id: number) => setServiceForm(p => ({
        ...p,
        resource_ids: p.resource_ids.includes(id) ? p.resource_ids.filter(x => x !== id) : [...p.resource_ids, id],
    }));

    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowServiceModal(false)}>
            <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-10 shadow-2xl h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ animation: 'slideUp 0.3s ease-out' }}>
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                <h2 className="text-2xl font-black text-slate-900 mb-6">{serviceForm.id ? 'Hizmeti Düzenle' : 'Yeni Hizmet'}</h2>

                <div className="space-y-4">
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-3xl bg-slate-50 overflow-hidden border-4 border-white shadow-xl flex items-center justify-center text-3xl">
                                {serviceForm.photo ? <img src={serviceForm.photo} alt="Hizmet" className="w-full h-full object-cover" /> : BOOKING_MODE_TEXT[serviceForm.booking_mode].icon}
                            </div>
                            <label className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg cursor-pointer" aria-label="Fotoğraf seç">
                                📷
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onloadend = () => setServiceForm(p => ({ ...p, photo: reader.result as string }));
                                        reader.readAsDataURL(file);
                                    }}
                                />
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Hizmet Adı</label>
                        <input type="text" value={serviceForm.name} onChange={e => setServiceForm(p => ({ ...p, name: e.target.value }))} placeholder="Örn: Saç Kesimi, Halı Saha Kiralama, Reformer Pilates" className={inputClass} />
                    </div>

                    <div>
                        <label className={labelClass}>Rezervasyon Tipi</label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(BOOKING_MODE_TEXT).map(([key, m]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setServiceForm(p => ({ ...p, booking_mode: key }))}
                                    className={`p-3 rounded-2xl border-2 text-center ${serviceForm.booking_mode === key ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-slate-50'}`}
                                >
                                    <span className="block text-xl">{m.icon}</span>
                                    <span className="block text-[11px] font-black text-slate-700 mt-1">{m.label}</span>
                                </button>
                            ))}
                        </div>
                        <p className="text-[11px] text-slate-400 font-bold mt-2 ml-2">{BOOKING_MODE_TEXT[serviceForm.booking_mode].hint}</p>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className={labelClass}>{serviceForm.booking_mode === 'resource' ? 'Fiyat Süresi (Dk)' : 'Süre (Dk)'}</label>
                            <input type="number" value={serviceForm.duration_minutes} onChange={e => setServiceForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 0 }))} className={inputClass} />
                        </div>
                        <div className="flex-1">
                            <label className={labelClass}>{serviceForm.booking_mode === 'class' ? 'Kişi Başı Ücret (₺)' : 'Ücret (₺)'}</label>
                            <input type="number" value={serviceForm.price} onChange={e => setServiceForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} className={inputClass} />
                        </div>
                    </div>

                    {serviceForm.booking_mode === 'resource' && (
                        <>
                            <div>
                                <label className={labelClass}>Seçilebilir Süreler (Dk)</label>
                                <input type="text" inputMode="numeric" value={serviceForm.duration_options} onChange={e => setServiceForm(p => ({ ...p, duration_options: e.target.value }))} placeholder="Örn: 60, 90, 120" className={inputClass} />
                                <p className="text-[11px] text-slate-400 font-bold mt-2 ml-2">Fiyat süreyle orantılı hesaplanır. Boş bırakılırsa yalnızca yukarıdaki süre geçerli olur.</p>
                            </div>
                            <div>
                                <label className={labelClass}>Kullanılan Alanlar</label>
                                {resources.length === 0 ? (
                                    <p className="text-xs text-amber-600 font-bold ml-2">Henüz alan tanımlı değil. "Alanlar & Seanslar" sekmesinden saha / kulvar / oda ekleyin.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {resources.map(r => (
                                            <button key={r.id} type="button" onClick={() => toggleResource(r.id)} className={`px-4 py-2 rounded-xl border-2 text-sm font-bold ${serviceForm.resource_ids.includes(r.id) ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
                                                {r.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <p className="text-[11px] text-slate-400 font-bold mt-2 ml-2">Hiçbiri seçilmezse tüm aktif alanlar kullanılabilir.</p>
                            </div>
                        </>
                    )}

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className={labelClass}>Miktar</label>
                            <input type="number" step="0.01" value={serviceForm.quantity} onChange={e => setServiceForm(p => ({ ...p, quantity: e.target.value }))} placeholder="Örn: 1" className={inputClass} />
                        </div>
                        <div className="flex-1">
                            <label className={labelClass}>Birim</label>
                            <select value={serviceForm.unit} onChange={e => setServiceForm(p => ({ ...p, unit: e.target.value }))} className={`${inputClass} appearance-none`}>
                                <option value="">Seçiniz</option>
                                <option value="adet">Adet</option>
                                <option value="seans">Seans</option>
                                <option value="saat">Saat</option>
                                <option value="kişi">Kişi</option>
                                <option value="paket">Paket</option>
                                <option value="ml">ml</option>
                                <option value="gr">Gram</option>
                                <option value="m²">m²</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Departman (Opsiyonel)</label>
                        <select value={serviceForm.department_id || ''} onChange={e => setServiceForm(p => ({ ...p, department_id: e.target.value ? parseInt(e.target.value) : null }))} className={`${inputClass} appearance-none`}>
                            <option value="">Tüm Departmanlar</option>
                            {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className={labelClass}>Açıklama</label>
                        <textarea value={serviceForm.description} onChange={e => setServiceForm(p => ({ ...p, description: e.target.value }))} rows={3} className={`${inputClass} resize-none`} />
                    </div>

                    <div className="flex gap-3 mt-6 pt-4">
                        <button onClick={() => setShowServiceModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-base active:scale-95">İptal</button>
                        <button onClick={handleSaveService} disabled={isSavingService} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-base active:scale-95 disabled:opacity-60">
                            {isSavingService ? 'Kaydediliyor...' : serviceForm.id ? 'Güncelle' : 'Kaydet'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function TemplatesModal({ ctx }: { ctx: Ctx }) {
    const { setShowTemplatesModal, handleAddFromTemplate } = ctx;
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sectorSlug, setSectorSlug] = useState<string | null>(null);
    const [added, setAdded] = useState<number[]>([]);

    useEffect(() => {
        sectorsApi.templates()
            .then(setTemplates)
            .catch(() => setTemplates([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!ctx.company?.id) return;
        sectorsApi.ofCompany(ctx.company.id)
            .then(list => {
                const primary = list.find(s => s.is_primary) || list[0];
                if (primary?.sector_slug) setSectorSlug(current => current ?? primary.sector_slug);
            })
            .catch(() => {});
    }, [ctx.company?.id]);

    const sectors = useMemo(() => {
        const map = new Map<string, { slug: string; name: string; icon: string }>();
        templates.forEach(t => map.set(t.sector_slug, { slug: t.sector_slug, name: t.sector_name, icon: t.sector_icon }));
        return [...map.values()];
    }, [templates]);
    const activeSlug = sectorSlug || sectors[0]?.slug;
    const visible = templates.filter(t => t.sector_slug === activeSlug);

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4" onClick={() => setShowTemplatesModal(false)}>
            <div className="bg-white w-full max-w-3xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 flex items-start justify-between">
                    <div>
                        <h3 className="text-xl font-black text-slate-900">Hizmet Şablonları</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sektörünüzü seçin, hizmetleri tek dokunuşla ekleyin</p>
                    </div>
                    <button onClick={() => setShowTemplatesModal(false)} aria-label="Kapat" className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full font-black">✕</button>
                </div>
                <div className="flex gap-2 overflow-x-auto px-6 py-4 border-b border-slate-50">
                    {sectors.map(s => (
                        <button key={s.slug} onClick={() => setSectorSlug(s.slug)} className={`shrink-0 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap ${s.slug === activeSlug ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {s.icon} {s.name}
                        </button>
                    ))}
                </div>
                <div className="p-6 overflow-y-auto space-y-2">
                    {loading && <p className="text-center text-slate-400 font-bold py-10">Yükleniyor…</p>}
                    {!loading && visible.length === 0 && <p className="text-center text-slate-400 font-bold py-10">Şablon bulunamadı</p>}
                    {visible.map(t => {
                        const isAdded = added.includes(t.id);
                        return (
                            <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100">
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-slate-900 truncate">{t.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                                        {t.duration_options?.length ? t.duration_options.join('/') : t.duration_minutes} dk • ₺{Number(t.price || 0)} • {BOOKING_MODE_TEXT[t.booking_mode || 'staff'].label}
                                    </p>
                                </div>
                                <button
                                    disabled={isAdded}
                                    aria-label={`${t.name} ekle`}
                                    onClick={async () => {
                                        await handleAddFromTemplate(t);
                                        setAdded(prev => [...prev, t.id]);
                                    }}
                                    className="w-10 h-10 shrink-0 bg-indigo-50 text-indigo-600 rounded-xl font-black disabled:bg-emerald-50 disabled:text-emerald-600"
                                >
                                    {isAdded ? '✓' : '+'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
