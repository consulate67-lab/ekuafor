/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { sectorsApi, type Sector, type CompanySector } from '../api/sectors';

interface Props {
    companyId: number;
}

const sectorCardClass = (_color: string, isSelected: boolean, isPrimary: boolean) =>
    [
        'relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer select-none',
        isSelected
            ? `shadow-lg scale-[1.02] ${isPrimary ? 'shadow-2xl' : ''}`
            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md',
    ].filter(Boolean).join(' ');

const sectorCardStyle = (color: string, isSelected: boolean): React.CSSProperties => ({
    borderColor: isSelected ? color : undefined,
    backgroundColor: isSelected ? `${color}10` : undefined,
});

/**
 * Firma sektör seçici — firma profili ve admin firma tanımlama ekranında kullanılır.
 *
 * Özellikler:
 * - Aktif sektörler (sunucudaki katalog) icon + renk ile grid layout
 * - Multi-select (bir firma hem kuaför hem güzellik salonu olabilir)
 * - Primary sector: tek sektör birincil olabilir (müşteri landing page'de bu görünür)
 * - Sub-specialty: sektöre özel uzmanlık (örn. dental için "implant")
 * - Backend API: /api/companies/:id/sectors (POST/DELETE/GET)
 */
export function SectorSelector({ companyId }: Props) {
    const [allSectors, setAllSectors] = useState<Sector[]>([]);
    const [companySectors, setCompanySectors] = useState<CompanySector[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [subSpecialtyInputs, setSubSpecialtyInputs] = useState<Record<number, string>>({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const [sectors, company] = await Promise.all([
                    sectorsApi.list(),
                    sectorsApi.ofCompany(companyId),
                ]);
                if (cancelled) return;
                setAllSectors(sectors);
                setCompanySectors(company);
                const subInputs: Record<number, string> = {};
                company.forEach(cs => {
                    if (cs.sub_specialty) subInputs[cs.sector_id] = cs.sub_specialty;
                });
                setSubSpecialtyInputs(subInputs);
            } catch (e: any) {
                if (!cancelled) setError(e.message || 'Sektörler yüklenemedi');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [companyId]);

    const isSelected = (sectorId: number) =>
        companySectors.some(cs => cs.sector_id === sectorId);

    const isPrimary = (sectorId: number) =>
        companySectors.some(cs => cs.sector_id === sectorId && cs.is_primary);

    const handleToggle = async (sector: Sector) => {
        try {
            setError(null);
            setSaving(sector.id);
            if (isSelected(sector.id)) {
                await sectorsApi.remove(companyId, sector.id);
                setCompanySectors(prev => prev.filter(cs => cs.sector_id !== sector.id));
            } else {
                const wasEmpty = companySectors.length === 0;
                await sectorsApi.assign(companyId, sector.id, {
                    sub_specialty: subSpecialtyInputs[sector.id] || undefined,
                    is_primary: wasEmpty,
                });
                const updated = await sectorsApi.ofCompany(companyId);
                setCompanySectors(updated);
            }
        } catch (e: any) {
            setError(e.message || 'Sektör güncellenemedi');
        } finally {
            setSaving(null);
        }
    };

    const handleSetPrimary = async (sector: Sector) => {
        if (!isSelected(sector.id)) return;
        try {
            setError(null);
            setSaving(sector.id);
            await sectorsApi.assign(companyId, sector.id, {
                sub_specialty: subSpecialtyInputs[sector.id] || undefined,
                is_primary: true,
            });
            const updated = await sectorsApi.ofCompany(companyId);
            setCompanySectors(updated);
        } catch (e: any) {
            setError(e.message || 'Birincil sektör güncellenemedi');
        } finally {
            setSaving(null);
        }
    };

    const handleSubSpecialtyChange = async (sector: Sector, value: string) => {
        setSubSpecialtyInputs(prev => ({ ...prev, [sector.id]: value }));
        if (!isSelected(sector.id)) return;
        try {
            setSaving(sector.id);
            await sectorsApi.assign(companyId, sector.id, {
                sub_specialty: value || undefined,
                is_primary: isPrimary(sector.id),
            });
            const updated = await sectorsApi.ofCompany(companyId);
            setCompanySectors(updated);
        } catch (e: any) {
            setError(e.message || 'Uzmanlık güncellenemedi');
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-slate-400 text-sm font-bold">Sektörler yükleniyor...</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {allSectors.map(sector => {
                    const selected = isSelected(sector.id);
                    const primary = isPrimary(sector.id);
                    return (
                        <div
                            key={sector.id}
                            className={sectorCardClass(sector.color, selected, primary)}
                            style={sectorCardStyle(sector.color, selected)}
                            onClick={() => !saving && handleToggle(sector)}
                        >
                            {saving === sector.id && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
                                    <div className="animate-spin h-5 w-5 border-2 border-slate-300 border-t-indigo-600 rounded-full" />
                                </div>
                            )}
                            <span className="text-3xl">{sector.icon}</span>
                            <span className="text-xs font-black text-center" style={{ color: selected ? sector.color : '#475569' }}>
                                {sector.name_tr}
                            </span>
                            {selected && (
                                <div className="absolute -top-2 -right-2 flex gap-1">
                                    {primary && (
                                        <span
                                            className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-white shadow-md"
                                            style={{ backgroundColor: sector.color }}
                                            title="Birincil sektör"
                                        >
                                            ★ Birincil
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center shadow-md hover:bg-indigo-700"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSetPrimary(sector);
                                        }}
                                        title="Birincil yap"
                                    >
                                        ★
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {companySectors.length > 0 && (
                <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Uzmanlık Alanları (opsiyonel)
                    </p>
                    {companySectors.map(cs => (
                        <div key={cs.sector_id} className="flex items-center gap-3">
                            <span className="text-xl">{cs.sector_icon}</span>
                            <span className="text-sm font-bold text-slate-700 min-w-[120px]">
                                {cs.sector_name_tr}
                            </span>
                            <input
                                type="text"
                                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900"
                                placeholder="Örn: implant, saç kesimi, botoks..."
                                value={subSpecialtyInputs[cs.sector_id] || ''}
                                onChange={e => {
                                    const v = e.target.value;
                                    setSubSpecialtyInputs(prev => ({ ...prev, [cs.sector_id]: v }));
                                }}
                                onBlur={e => handleSubSpecialtyChange(
                                    allSectors.find(s => s.id === cs.sector_id)!,
                                    e.target.value
                                )}
                            />
                        </div>
                    ))}
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <p className="text-xs text-slate-400">
                💡 Birden fazla sektör seçebilirsiniz (örn. hem kuaför hem güzellik salonu).
                <br />⭐ Birincil sektör müşterilerinize gösterilir.
            </p>
        </div>
    );
}

export default SectorSelector;
