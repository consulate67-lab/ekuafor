import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { companiesApi, type PublicCompany, type PublicEmployee, type Review } from '../../api/companies';
import { ratingText } from '../../components/customer/CompanyCard';
import { Button, EmptyState, FullScreenLoader, Sheet, Spinner, formatMoney } from '../../components/ui';
import { useFavorites } from '../../hooks/useFavorites';
import { directionsUrl } from '../../lib/geo';
import { labelsFor } from '../../lib/labels';
import { dialNumber } from '../../lib/phone';
import { LAYOUT_THEME, sectorLayoutGroup } from '../../lib/sectorLayout';
import { sectorWebPack } from '../../lib/sectorWebContent';
import { resolveSectorSlug } from '../../lib/resolveSectorSlug';
import { loadVisitorProfile, saveVisitorProfile, type VisitorProfile } from '../../lib/visitorProfile';
import { setPinnedCompanyId } from '../../lib/pinnedCompany';
import { ShortcutPrompt } from '../../components/customer/ShortcutPrompt';
import {
    defaultWebTemplateId,
    getWebTemplate,
} from '@shared/webPageTemplates';
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
    const [searchParams] = useSearchParams();
    const fromQr = searchParams.get('ref') === 'qr';
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
    const [visitor, setVisitor] = useState<VisitorProfile | null>(() => loadVisitorProfile());
    const [visitorGate, setVisitorGate] = useState(false);
    const [vf, setVf] = useState({ firstName: '', lastName: '', phone: '' });
    const [visitorError, setVisitorError] = useState('');
    const pendingBookRef = useRef('');

    useEffect(() => {
        const existing = loadVisitorProfile();
        if (existing) {
            setVisitor(existing);
            setVisitorGate(false);
        }
        // QR ile açılışta önce tanıtım; ziyaretçi formu yalnızca randevu anında
    }, []);

    useEffect(() => {
        if ((fromQr || searchParams.get('home') === '1') && id) setPinnedCompanyId(id);
    }, [fromQr, id, searchParams]);

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

    const sectorSlug = useMemo(
        () =>
            company
                ? resolveSectorSlug({
                      primarySlug: company.primary_sector?.slug,
                      sectorSlugs: company.sectors?.map(s => s.slug),
                      webTemplateId: company.web_template_id,
                      name: company.name,
                  })
                : 'barber',
        [company],
    );
    const labels = useMemo(() => labelsFor(sectorSlug, company || undefined), [company, sectorSlug]);
    const layoutGroup = sectorLayoutGroup(sectorSlug);
    const selectedTemplate = useMemo(() => {
        const id = company?.web_template_id || defaultWebTemplateId(sectorSlug);
        return getWebTemplate(id) || getWebTemplate(defaultWebTemplateId(sectorSlug));
    }, [company?.web_template_id, sectorSlug]);
    const fallbackPack = useMemo(() => sectorWebPack(sectorSlug), [sectorSlug]);
    const theme = selectedTemplate?.theme
        ? {
              heroFrom: selectedTemplate.theme.heroFrom,
              heroTo: selectedTemplate.theme.heroTo,
              accent: selectedTemplate.theme.accent,
              accentSoft: selectedTemplate.theme.accentSoft,
              cta: selectedTemplate.theme.cta,
          }
        : LAYOUT_THEME[layoutGroup];
    const webPack = selectedTemplate
        ? {
              tagline: selectedTemplate.tagline,
              aboutFallback: selectedTemplate.about,
              gallery: selectedTemplate.gallery,
              news: selectedTemplate.news,
          }
        : fallbackPack;
    const heroImage = company?.photo || webPack.gallery[0]?.src || null;

    const saveVisitor = (): boolean => {
        const firstName = vf.firstName.trim();
        const lastName = vf.lastName.trim();
        const phone = vf.phone.replace(/\D/g, '').slice(0, 11);
        if (!firstName || !lastName || phone.length < 10) {
            setVisitorError('Ad, soyad ve geçerli telefon gerekli');
            return false;
        }
        const profile = { firstName, lastName, phone };
        saveVisitorProfile(profile);
        setVisitor(profile);
        setVisitorGate(false);
        setVisitorError('');
        return true;
    };

    if (loading) return <FullScreenLoader />;
    if (notFound || !company) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <EmptyState icon="🏚️" title="İşletme bulunamadı" action={<Button onClick={() => navigate('/app')}>Keşfet'e dön</Button>} />
            </div>
        );
    }

    const sector = company.primary_sector || company.sectors?.[0] || null;
    const bookable = !!company.is_bookable && services.length > 0;
    const phone = dialNumber(company.phone);
    const rating = ratingText(company);
    const address = [company.address_line, company.neighborhood, company.district, company.city].filter(Boolean).join(', ');
    const hours = company.work_start_time && company.work_end_time ? `${company.work_start_time.slice(0, 5)} – ${company.work_end_time.slice(0, 5)}` : null;
    const showTeam = team.length > 0 && services.some(s => (s.booking_mode || 'staff') === 'staff');
    const favorite = favorites.isFavorite(company.id);
    const aboutText = (company.description || '').trim() || webPack.aboutFallback;
    const contactBits = [
        phone ? { label: 'Telefon', value: company.phone || phone, href: `tel:${phone}` } : null,
        company.email ? { label: 'E-posta', value: company.email, href: `mailto:${company.email}` } : null,
        company.website
            ? {
                  label: 'Web',
                  value: company.website.replace(/^https?:\/\//, ''),
                  href: company.website.startsWith('http') ? company.website : `https://${company.website}`,
              }
            : null,
    ].filter(Boolean) as { label: string; value: string; href: string }[];
    const introMode = fromQr || searchParams.get('home') === '1';

    const goBook = (query = '') => {
        const q = query.startsWith('?') ? `${query}&from=site` : `?from=site${query ? `&${query}` : ''}`;
        navigate(`/book/${company.id}${q}`, { state: { fromCompany: true } });
    };

    const book = (query = '') => {
        setPinnedCompanyId(company.id);
        if (visitor || loadVisitorProfile()) {
            goBook(query);
            return;
        }
        pendingBookRef.current = query;
        setVisitorGate(true);
    };

    const share = async () => {
        const url = `${window.location.origin}${window.location.pathname}#/firma/${company.id}?ref=qr`;
        try {
            if (navigator.share) await navigator.share({ title: company.name, url });
            else await navigator.clipboard.writeText(url);
        } catch {
            /* kullanıcı paylaşımı kapattı */
        }
    };

    /** Gerçek berber siteleri gibi kompakt hero — isim alanı şişirilmez */
    const heroH = introMode ? 'h-[42vw] max-h-56 min-h-[11.5rem]' : layoutGroup === 'sport' ? 'h-48' : 'h-44';

    return (
        <div className="min-h-screen pb-32" style={{ ['--sector-accent' as string]: theme.accent, background: selectedTemplate?.theme.surface || '#f8fafc' }}>
            <div
                className={`relative ${heroH} overflow-hidden bg-slate-900`}
                style={{ background: `linear-gradient(145deg, ${theme.heroFrom}, ${theme.heroTo})` }}
            >
                {heroImage && (
                    <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/20" />
                <div className="absolute inset-x-0 top-0 safe-top z-10">
                    <div className="max-w-lg mx-auto flex justify-between p-3">
                        {introMode ? (
                            <span className="w-9" aria-hidden />
                        ) : (
                            <RoundButton label="Geri" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/app'))}>←</RoundButton>
                        )}
                        <div className="flex gap-2">
                            <RoundButton label="Paylaş" onClick={share}>⤴</RoundButton>
                            {!introMode && (
                                <RoundButton label={favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'} pressed={favorite} onClick={() => favorites.toggle(company.id)}>
                                    <span className={favorite ? 'text-rose-500' : ''}>{favorite ? '♥' : '♡'}</span>
                                </RoundButton>
                            )}
                        </div>
                    </div>
                </div>
                <div className="relative z-10 flex h-full max-w-lg mx-auto flex-col justify-end px-4 pb-5 pt-12">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/75">
                        {sector?.name || selectedTemplate?.styleName || 'Erkek kuaförü'}
                    </p>
                    <h1 className="mt-1 text-2xl font-black leading-tight text-white drop-shadow sm:text-[1.65rem]">
                        {company.name}
                    </h1>
                    <p className="mt-1.5 max-w-sm text-xs font-semibold text-white/85 sm:text-sm">{webPack.tagline}</p>
                    {rating && (
                        <button type="button" onClick={() => setReviewsOpen(true)} className="mt-2 w-fit text-xs font-bold text-amber-300">
                            {rating} · yorumları gör
                        </button>
                    )}
                </div>
            </div>

            <main className="max-w-lg mx-auto px-4 -mt-6 relative space-y-4">
                {visitor && !introMode && (
                    <p className="rounded-2xl px-3 py-2 text-xs font-bold text-slate-600" style={{ backgroundColor: theme.accentSoft }}>
                        Merhaba {visitor.firstName} — sonraki girişlerde bilginiz hatırlanır
                    </p>
                )}
                <section className={`bg-white border border-slate-100 shadow-sm p-5 ${layoutGroup === 'clinic' ? 'rounded-2xl' : 'rounded-3xl'}`}>
                    <dl className="space-y-2 text-sm">
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

                <section className={`bg-white border border-slate-100 shadow-sm p-5 ${layoutGroup === 'clinic' ? 'rounded-2xl' : 'rounded-3xl'}`}>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Hakkında</h2>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{aboutText}</p>
                </section>

                <section>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                        {layoutGroup === 'beauty' || sectorSlug === 'barber' || sectorSlug === 'hair' ? 'Salonumuz' : 'Galeri'}
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                        {webPack.gallery.map(g => (
                            <div key={g.src} className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-200">
                                <img src={g.src} alt={g.alt} className="h-full w-full object-cover" loading="lazy" />
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                        {sectorSlug === 'barber' ? 'Bakım notları' : 'Sektörden notlar'}
                    </h2>
                    <div className="space-y-2">
                        {webPack.news.map(n => (
                            <article key={n.title} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: theme.accent }}>{n.tag}</p>
                                <h3 className="mt-1 text-sm font-black text-slate-900">{n.title}</h3>
                                <p className="mt-1 text-xs font-semibold text-slate-500 leading-relaxed">{n.summary}</p>
                            </article>
                        ))}
                    </div>
                </section>

                {(contactBits.length > 0 || address) && (
                    <section className={`bg-white border border-slate-100 shadow-sm p-5 ${layoutGroup === 'clinic' ? 'rounded-2xl' : 'rounded-3xl'}`}>
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">İletişim</h2>
                        <ul className="mt-3 space-y-2">
                            {contactBits.map(c => (
                                <li key={c.label}>
                                    <a href={c.href} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800">
                                        <span className="text-slate-400">{c.label}</span>
                                        <span className="truncate">{c.value}</span>
                                    </a>
                                </li>
                            ))}
                            {address && (
                                <li className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800">
                                    <span className="text-slate-400">Adres · </span>{address}
                                </li>
                            )}
                        </ul>
                    </section>
                )}

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
                                introMode ? (
                                    <div key={s.id} className="flex items-center gap-3 p-4">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-slate-800 truncate">{s.name}</p>
                                            <p className="text-xs font-semibold text-slate-400">
                                                {s.booking_mode === 'class' ? 'Grup dersi · ' : ''}{durationText(s)}
                                            </p>
                                        </div>
                                        {Number(s.price) > 0 && <span className="font-black text-slate-900">{formatMoney(s.price)}</span>}
                                    </div>
                                ) : (
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
                                )
                            ))}
                        </div>
                    </section>
                )}

                {showTeam && (
                    <section>
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{labels.staffPlural}</h2>
                        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 hide-scrollbar">
                            {team.map(m => (
                                introMode ? (
                                    <div key={m.id} className="shrink-0 w-24 text-center">
                                        <div className="w-16 h-16 mx-auto rounded-full bg-white border border-slate-100 shadow-sm overflow-hidden flex items-center justify-center text-lg font-black text-slate-500">
                                            {m.photo ? <img src={m.photo} alt="" className="w-full h-full object-cover" /> : `${m.first_name[0] || ''}${m.last_name[0] || ''}`}
                                        </div>
                                        <p className="mt-1.5 text-xs font-bold text-slate-700 truncate">{m.first_name} {m.last_name}</p>
                                        {m.title && <p className="text-[10px] font-semibold text-slate-400 truncate">{m.title}</p>}
                                    </div>
                                ) : (
                                    <button key={m.id} type="button" onClick={() => book(`?staff=${m.id}`)} className="shrink-0 w-24 text-center">
                                        <div className="w-16 h-16 mx-auto rounded-full bg-white border border-slate-100 shadow-sm overflow-hidden flex items-center justify-center text-lg font-black text-slate-500">
                                            {m.photo ? <img src={m.photo} alt="" className="w-full h-full object-cover" /> : `${m.first_name[0] || ''}${m.last_name[0] || ''}`}
                                        </div>
                                        <p className="mt-1.5 text-xs font-bold text-slate-700 truncate">{m.first_name} {m.last_name}</p>
                                        {m.title && <p className="text-[10px] font-semibold text-slate-400 truncate">{m.title}</p>}
                                    </button>
                                )
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

            {/* Sağ kenar dikey randevu şeridi */}
            {bookable && (
                <button
                    type="button"
                    onClick={() => book()}
                    className="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-2xl px-2.5 py-5 text-[11px] font-black uppercase tracking-widest text-white shadow-lg"
                    style={{ backgroundColor: theme.accent, writingMode: 'vertical-rl' }}
                    aria-label="Randevu al"
                >
                    Randevu
                </button>
            )}

            {/* WhatsApp tarzı FAB — viewport ile birlikte altta kalır */}
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
                <div className="pointer-events-auto mx-auto flex max-w-lg justify-end px-4">
                    {bookable ? (
                        <button
                            type="button"
                            onClick={() => book()}
                            className="flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-xl shadow-black/25 transition active:scale-90"
                            style={{ backgroundColor: theme.accent }}
                            aria-label="Randevu al"
                            title="Randevu al"
                        >
                            📅
                        </button>
                    ) : phone ? (
                        <a
                            href={`tel:${phone}`}
                            className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white shadow-xl shadow-black/25"
                            aria-label="Ara"
                        >
                            📞
                        </a>
                    ) : (
                        <a
                            href={directionsUrl(company)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-2xl text-white shadow-xl"
                            aria-label="Yol tarifi"
                        >
                            🧭
                        </a>
                    )}
                </div>
            </div>

            <ShortcutPrompt
                companyId={company.id}
                companyName={company.name}
                themeColor={theme.accent}
                enabled={fromQr || searchParams.get('home') === '1'}
            />

            <Sheet open={visitorGate} onClose={() => setVisitorGate(false)} title="Bilgileriniz">
                <p className="text-sm font-semibold text-slate-600 mb-4">
                    Randevu için ad, soyad ve telefonunuz bu cihazda saklanır. Sonraki girişlerde tekrar sorulmaz.
                </p>
                <div className="space-y-3">
                    <input value={vf.firstName} onChange={e => setVf(v => ({ ...v, firstName: e.target.value }))} placeholder="Ad" className="w-full rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 font-bold" autoComplete="given-name" />
                    <input value={vf.lastName} onChange={e => setVf(v => ({ ...v, lastName: e.target.value }))} placeholder="Soyad" className="w-full rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 font-bold" autoComplete="family-name" />
                    <input value={vf.phone} onChange={e => setVf(v => ({ ...v, phone: e.target.value.replace(/\D/g, '').slice(0, 11) }))} placeholder="Telefon" inputMode="tel" className="w-full rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 font-bold" autoComplete="tel" />
                    {visitorError && <p className="text-sm font-bold text-rose-600">{visitorError}</p>}
                    <Button
                        block
                        size="lg"
                        onClick={() => {
                            if (!saveVisitor()) return;
                            goBook(pendingBookRef.current || '');
                            pendingBookRef.current = '';
                        }}
                    >
                        Kaydet ve randevuya geç
                    </Button>
                </div>
            </Sheet>

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
