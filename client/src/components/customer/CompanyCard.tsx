import { memo } from 'react';
import type { PublicCompany } from '../../api/companies';
import { SectorIcon } from '../ui';
import { formatDistance } from '../../lib/geo';

interface Props {
    company: PublicCompany;
    favorite: boolean;
    onOpen: (company: PublicCompany) => void;
    onToggleFavorite: (id: number) => void;
}

export const ratingText = (c: Pick<PublicCompany, 'rating_avg' | 'review_count'>) =>
    c.review_count ? `★ ${Number(c.rating_avg || 0).toFixed(1)} (${c.review_count})` : null;

function CompanyCard({ company: c, favorite, onOpen, onToggleFavorite }: Props) {
    const sector = c.primary_sector;
    const distance = formatDistance(c.distance_km);
    const rating = ratingText(c);
    const place = [c.district, c.city].filter(Boolean).join(', ');

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => onOpen(c)}
                className="w-full flex items-center gap-4 bg-white rounded-3xl border border-slate-100 shadow-sm p-3 pr-12 text-left active:scale-[0.99] transition"
            >
                {c.photo ? (
                    <img src={c.photo} alt="" loading="lazy" className="w-16 h-16 rounded-2xl object-cover shrink-0 bg-slate-100" />
                ) : (
                    <SectorIcon icon={sector?.icon} color={sector?.color} size="lg" />
                )}
                <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs font-bold text-slate-400 truncate mt-0.5">
                        {[sector?.name, place].filter(Boolean).join(' · ') || 'Adres bilgisi yok'}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[11px] font-bold">
                        {c.is_bookable && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Online randevu</span>}
                        {rating && <span className="text-amber-600">{rating}</span>}
                        {distance && <span className="text-slate-500">{distance}</span>}
                    </div>
                </div>
            </button>
            <button
                type="button"
                onClick={() => onToggleFavorite(c.id)}
                aria-label={favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                aria-pressed={favorite}
                className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-lg ${favorite ? 'text-rose-500' : 'text-slate-300'}`}
            >
                {favorite ? '♥' : '♡'}
            </button>
        </div>
    );
}

export default memo(CompanyCard);
