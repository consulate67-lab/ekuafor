import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { companiesApi, type PublicCompany, type PublicEmployee, type Review } from '../../api/companies';
import { ratingText } from '../../components/customer/CompanyCard';
import { Button, EmptyState, FullScreenLoader, Sheet, Spinner, formatMoney } from '../../components/ui';
import { useFavorites } from '../../hooks/useFavorites';
import { directionsUrl } from '../../lib/geo';
import { labelsFor } from '../../lib/labels';
import { dialNumber } from '../../lib/phone';
import type { Service } from '../../types';

type ReviewSort = 'newest' | 'rating_desc' | 'rating_asc';
const REVIEW_SORTS: { key: ReviewSort; label: string }[] = [
    { key: 'newest', label: 'En yeni' },
    { key: 'rating_desc', label: 'En yüksek' },
    { key: 'rating_asc', label: 'En düşük' },
];

const durationText = (s: Service) =>
    s.booking_mode === 'resource' && s.duration_options?.length ? `${s.duration_options.join(' / ')} dk` : `${s.duration_minutes} dk`;

export default function CompanyPageRoute() {
    const { id } = useParams<{ id: string }>();
    return <CompanyPage key={id} id={Number(id)} />;
}

function CompanyPage({ id }: { id: number }) {
    const navigate = useNavigate();
    const favorites = useFavorites();
    const [company, setCompany] = useState<PublicCompany | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [team, setTeam] = useState<PublicEmployee[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [reviewsOpen, setReviewsOpen] = useState(false);
    const [reviewSort, setReviewSort] = useState<ReviewSort>('newest');
    const [sortedReviews, setSortedReviews] = useState<Review[] | null>(null);

    useEffect(() => {
        Promise.all([
            companiesApi.get(id),
            companiesApi.services(id).catch(() => []),
            companiesApi.employees(id).catch(() => []),
            companiesApi.reviews(id).catch(() => []),
        ])
            .then(([c, s, t, r]) => {
                setCompany(c);
                setServices(s);
                setTeam(t);
                setReviews(r);
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (!reviewsOpen) return;
        setSortedReviews(null);
        companiesApi.reviews(id, reviewSort).then(setSortedReviews).catch(() => setSortedReviews([]));
    }, [id, reviewsOpen, reviewSort]);

    const labels = useMemo(() => labelsFor(company?.primary_sector?.slug, company || undefined), [company]);

    if (loading) return <FullScreenLoader />;
    if (notFound || !company) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <EmptyState icon="🏚️" title="İşletme bulunamadı" action={<Button onClick={() => navigate('/app')}>Keşfet'e dön</Button>} />
            </div>
        );
    }

    const sector = company.primary_sector;
    const bookable = !!company.is_bookable && services.length > 0;
    const phone = dialNumber(company.phone);
    const rating = ratingText(company);
    const address = [company.address_line, company.neighborhood, company.district, company.city].filter(Boolean).join(', ');
    const hours = company.work_start_time && company.work_end_time ? `${company.work_start_time.slice(0, 5)} – ${company.work_end_time.slice(0, 5)}` : null;
    const showTeam = team.length > 0 && services.some(s => (s.booking_mode || 'staff') === 'staff');
    const favorite = favorites.isFavorite(company.id);
    const book = (query = '') => navigate(`/book/${company.id}${query}`);

    const share = async () => {
        const url = `${window.location.origin}${window.location.pathname}#/firma/${company.id}`;
        try {
            if (navigator.share) await navigator.share({ title: company.name, url });
            else await navigator.clipboard.writeText(url);
        } catch {
            /* kullanıcı paylaşımı kapattı */
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-28">
            <div className="relative h-48 bg-slate-200" style={!company.photo ? { background: `linear-gradient(135deg, ${sector?.color || '#4f46e5'}, #0f172a)` } : undefined}>
                {company.photo
                    ? <img src={company.photo} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-6xl" aria-hidden>{sector?.icon || '📅'}</div>}
                <div className="absolute inset-x-0 top-0 safe-top">
                    <div className="max-w-lg mx-auto flex justify-between p-4">
                        <RoundButton label="Geri" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/app'))}>←</RoundButton>
                        <div className="flex gap-2">
                            <RoundButton label="Paylaş" onClick={share}>⤴</RoundButton>
                            <RoundButton label={favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'} pressed={favorite} onClick={() => favorites.toggle(company.id)}>
                                <span className={favorite ? 'text-rose-500' : ''}>{favorite ? '♥' : '♡'}</span>
                            </RoundButton>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-lg mx-auto px-4 -mt-6 relative space-y-4">
                <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {(company.sectors?.length ? company.sectors : sector ? [sector] : []).map(s => (
                            <span key={s.slug} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ backgroundColor: `${s.color}1a`, color: s.color }}>
                                {s.icon} {s.name}
                            </span>
                        ))}
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 leading-tight">{company.name}</h1>
                    {rating && (
                        <button type="button" onClick={() => setReviewsOpen(true)} className="mt-1 text-sm font-bold text-amber-600">
                            {rating} · yorumları gör
                        </button>
                    )}
                    {company.description && <p className="mt-3 text-sm text-slate-600 leading-relaxed">{company.description}</p>}
                    <dl className="mt-4 space-y-2 text-sm">
                        {address && <InfoRow icon="📍" text={address} />}
                        {hours && <InfoRow icon="🕘" text={`Çalışma saatleri ${hours}`} />}
                    </dl>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {phone ? (
                            <a href={`tel:${phone}`} className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-50 text-emerald-700 text-sm font-black">📞 Ara</a>
                        ) : <span />}
                        <a href={directionsUrl(company)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-sky-50 text-sky-700 text-sm font-black">🧭 Yol tarifi</a>
                    </div>
                </section>

                {!bookable && (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm font-bold text-amber-800">
                        Bu işletme henüz online randevu almıyor. Randevu için işletmeyi arayabilirsin.
                    </div>
                )}

                {services.length > 0 && (
                    <section>
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{labels.servicePlural}</h2>
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm divide-y divide-slate-100">
                            {services.map(s => (
                                <button key={s.id} type="button" onClick={() => book(`?service=${s.id}`)} className="w-full flex items-center gap-3 p-4 text-left active:bg-slate-50">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-slate-800 truncate">{s.name}</p>
                                        <p className="text-xs font-semibold text-slate-400">
                                            {s.booking_mode === 'class' ? 'Grup dersi · ' : ''}{durationText(s)}
                                        </p>
                                    </div>
                                    {Number(s.price) > 0 && <span className="font-black text-slate-900">{formatMoney(s.price)}</span>}
                                    <span className="text-slate-300" aria-hidden>›</span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {showTeam && (
                    <section>
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{labels.staffPlural}</h2>
                        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 hide-scrollbar">
                            {team.map(m => (
                                <button key={m.id} type="button" onClick={() => book(`?staff=${m.id}`)} className="shrink-0 w-24 text-center">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-white border border-slate-100 shadow-sm overflow-hidden flex items-center justify-center text-lg font-black text-slate-500">
                                        {m.photo ? <img src={m.photo} alt="" className="w-full h-full object-cover" /> : `${m.first_name[0] || ''}${m.last_name[0] || ''}`}
                                    </div>
                                    <p className="mt-1.5 text-xs font-bold text-slate-700 truncate">{m.first_name} {m.last_name}</p>
                                    {m.title && <p className="text-[10px] font-semibold text-slate-400 truncate">{m.title}</p>}
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {reviews.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Yorumlar</h2>
                            {reviews.length > 3 && <button type="button" onClick={() => setReviewsOpen(true)} className="text-xs font-black text-brand-600">Tümü</button>}
                        </div>
                        <div className="space-y-2">
                            {reviews.slice(0, 3).map(r => <ReviewItem key={r.id} review={r} />)}
                        </div>
                    </section>
                )}
            </main>

            <footer className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-100 safe-bottom">
                <div className="max-w-lg mx-auto p-4">
                    {bookable ? (
                        <Button block size="lg" onClick={() => book()}>Randevu al</Button>
                    ) : phone ? (
                        <a href={`tel:${phone}`} className="block w-full text-center py-4 rounded-2xl bg-emerald-600 text-white font-black">📞 İşletmeyi ara</a>
                    ) : (
                        <a href={directionsUrl(company)} target="_blank" rel="noreferrer" className="block w-full text-center py-4 rounded-2xl bg-slate-900 text-white font-black">🧭 Yol tarifi al</a>
                    )}
                </div>
            </footer>

            <Sheet open={reviewsOpen} onClose={() => setReviewsOpen(false)} title="Yorumlar">
                <div className="flex gap-2 mb-4">
                    {REVIEW_SORTS.map(s => (
                        <button
                            key={s.key}
                            type="button"
                            onClick={() => setReviewSort(s.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold ${reviewSort === s.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
                {sortedReviews === null ? (
                    <div className="flex justify-center py-10"><Spinner /></div>
                ) : sortedReviews.length === 0 ? (
                    <EmptyState icon="💬" title="Henüz yorum yok" />
                ) : (
                    <div className="space-y-2">{sortedReviews.map(r => <ReviewItem key={r.id} review={r} />)}</div>
                )}
            </Sheet>
        </div>
    );
}

function RoundButton({ label, pressed, onClick, children }: { label: string; pressed?: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            aria-label={label}
            aria-pressed={pressed}
            onClick={onClick}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow text-slate-700 font-black flex items-center justify-center"
        >
            {children}
        </button>
    );
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
    return (
        <div className="flex gap-2 text-slate-600">
            <dt aria-hidden>{icon}</dt>
            <dd className="font-semibold">{text}</dd>
        </div>
    );
}

function ReviewItem({ review: r }: { review: Review }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-800">{r.customer_name}</span>
                <span className="text-amber-500 text-sm" aria-label={`${r.rating} yıldız`}>{'★'.repeat(r.rating)}<span className="text-slate-200">{'★'.repeat(5 - r.rating)}</span></span>
            </div>
            {r.comment && <p className="mt-1 text-sm text-slate-600">{r.comment}</p>}
            <p className="mt-1 text-[11px] font-semibold text-slate-400">
                {[r.service_name, new Date(r.appointment_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })].filter(Boolean).join(' · ')}
            </p>
        </div>
    );
}
