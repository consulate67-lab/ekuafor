import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { companiesApi, type PublicCompany, type PublicEmployee, type Review } from '../../api/companies';
import { ratingText } from '../../components/customer/CompanyCard';
import { Button, EmptyState, FullScreenLoader, Sheet, Spinner, formatMoney } from '../../components/ui';
import { useFavorites } from '../../hooks/useFavorites';
import { directionsUrl } from '../../lib/geo';
import { labelsFor } from '../../lib/labels';
import { dialNumber } from '../../lib/phone';
import {
    canRequestDevicePhone,
    normalizeTrMobile,
    phonePickButtonLabel,
    requestDevicePhoneNumber,
} from '../../lib/devicePhone';
import { LAYOUT_THEME, sectorLayoutGroup } from '../../lib/sectorLayout';
import { sectorWebPack } from '../../lib/sectorWebContent';
import { resolveSectorSlug } from '../../lib/resolveSectorSlug';
import { assignServiceImages } from '../../lib/serviceImage';
import { loadVisitorProfile, saveVisitorProfile, type VisitorProfile } from '../../lib/visitorProfile';
import { addScannedCompanyId, getScannedCompanyIds, setLastOpenedCompanyId } from '../../lib/scannedCompanies';
import { ShortcutPrompt } from '../../components/customer/ShortcutPrompt';
import {
    bookingCtaLabel,
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

type SocialKind = 'instagram' | 'facebook' | 'tiktok';

function socialHref(kind: SocialKind, raw?: string | null): string | null {
    const v = (raw || '').trim();
    if (!v) return null;
    if (/^https?:\/\//i.test(v)) return v;
    const handle = v.replace(/^@/, '').replace(/\/+$/, '');
    if (!handle) return null;
    if (kind === 'instagram') return `https://instagram.com/${handle.replace(/^instagram\.com\//i, '')}`;
    if (kind === 'facebook') return `https://facebook.com/${handle.replace(/^facebook\.com\//i, '')}`;
    return `https://tiktok.com/@${handle.replace(/^tiktok\.com\/@?/i, '')}`;
}

function SocialIcon({ kind, className = 'h-5 w-5' }: { kind: SocialKind; className?: string }) {
    if (kind === 'instagram') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9zm9.75 1.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
            </svg>
        );
    }
    if (kind === 'facebook') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v7h3v-7h3l1-3h-4v-2c0-.6.4-1 1-1z" />
            </svg>
        );
    }
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M14.5 3.2c.3 2.3 1.6 3.7 3.8 4v2.8c-1.4 0-2.7-.4-3.8-1.1v5.4c0 3.4-2.6 6.1-6 6.1S2.5 17.7 2.5 14.3s2.6-6.1 6-6.1c.3 0 .7 0 1 .1v2.9c-.3-.1-.6-.2-1-.2-1.8 0-3.2 1.5-3.2 3.3s1.4 3.3 3.2 3.3 3.2-1.5 3.2-3.3V3.2h2.8z" />
        </svg>
    );
}

function SocialButtons({
    links,
    accent,
    onDark,
}: {
    links: { kind: SocialKind; label: string; href: string }[];
    accent?: string;
    onDark?: boolean;
}) {
    return (
        <div className="flex flex-wrap gap-2">
            {links.map(s => (
                <a
                    key={s.kind}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.label}
                    title={s.label}
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition ${
                        onDark
                            ? 'bg-white/20 text-white ring-1 ring-white/35 hover:bg-white/30'
                            : 'text-white shadow-sm hover:opacity-90'
                    }`}
                    style={!onDark && accent ? { backgroundColor: accent } : undefined}
                >
                    <SocialIcon kind={s.kind} />
                </a>
            ))}
        </div>
    );
}

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
    const [phoneHintBusy, setPhoneHintBusy] = useState(false);
    const pendingBookRef = useRef('');
    const visitorPhoneHintTried = useRef(false);

    useEffect(() => {
        const existing = loadVisitorProfile();
        if (existing) {
            setVisitor(existing);
            setVisitorGate(false);
            setVf({ firstName: existing.firstName, lastName: existing.lastName, phone: existing.phone });
        }
        // QR ile açılışta önce tanıtım; ziyaretçi formu yalnızca randevu anında
    }, []);

    useEffect(() => {
        if (Number.isFinite(id) && id > 0) setLastOpenedCompanyId(id);
    }, [id]);

    useEffect(() => {
        if (!visitorGate || visitorPhoneHintTried.current) return;
        if (vf.phone.replace(/\D/g, '').length >= 10) return;
        if (!canRequestDevicePhone()) return;
        visitorPhoneHintTried.current = true;
        setPhoneHintBusy(true);
        void requestDevicePhoneNumber()
            .then(phone => {
                if (phone) setVf(v => ({ ...v, phone }));
            })
            .finally(() => setPhoneHintBusy(false));
    }, [visitorGate, vf.phone]);

    // QR’da listeye ekleme ShortcutPrompt’ta (“Bu firmayı ekle”) — burada otomatik ekleme yok

    useEffect(() => {
        Promise.all([
            companiesApi.get(id),
            companiesApi.services(id).catch(() => []),
            companiesApi.employees(id).catch(() => []),
            companiesApi.reviews(id).catch(() => []),
        ])
            .then(([c, s, t, r]) => {
                const hide = c.hide_prices === true || s.some(x => x.price_hidden === true);
                setCompany({ ...c, hide_prices: hide });
                setServices(hide ? s.map(x => ({ ...x, price: 0, price_hidden: true })) : s);
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
    const customGallery = useMemo(() => {
        const raw = company?.web_gallery;
        let list: unknown[] = [];
        if (Array.isArray(raw)) list = raw;
        else if (typeof raw === 'string' && raw.trim()) {
            try {
                const parsed = JSON.parse(raw) as unknown;
                if (Array.isArray(parsed)) list = parsed;
            } catch {
                list = [];
            }
        }
        return list
            .map(x => (typeof x === 'string' ? x.trim() : ''))
            .filter(s => s.startsWith('data:image/') || s.startsWith('http'));
    }, [company?.web_gallery]);

    const webPack = useMemo(() => {
        const customTagline = (company?.web_tagline || '').trim();
        const base = selectedTemplate
            ? {
                  tagline: customTagline || selectedTemplate.tagline,
                  aboutFallback: selectedTemplate.about,
                  gallery: selectedTemplate.gallery,
                  news: selectedTemplate.news,
              }
            : { ...fallbackPack, tagline: customTagline || fallbackPack.tagline };
        const gallery = base.gallery.map((g, i) => ({
            ...g,
            src: customGallery[i] || g.src,
        }));
        return { ...base, gallery };
    }, [selectedTemplate, fallbackPack, customGallery, company?.web_tagline]);

    const heroImage = company?.photo || customGallery[0] || webPack.gallery[0]?.src || null;
    const serviceImages = useMemo(
        () => assignServiceImages(services, { sectorSlug }),
        [services, sectorSlug],
    );
    const hidePrices = !!(company?.hide_prices || services.some(s => s.price_hidden));

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
                <EmptyState icon="🏚️" title="İşletme bulunamadı" action={<Button onClick={() => navigate('/app')}>Firmalarıma dön</Button>} />
            </div>
        );
    }

    const sector = company.primary_sector || company.sectors?.[0] || null;
    const bookable = !!company.is_bookable && services.length > 0;
    const showPhone = company.show_phone !== false;
    const showAddress = company.show_address !== false;
    const phone = showPhone ? dialNumber(company.phone) : '';
    const rating = ratingText(company);
    const address = showAddress
        ? [company.address_line, company.neighborhood, company.district, company.city].filter(Boolean).join(', ')
        : '';
    const hours = company.work_start_time && company.work_end_time ? `${company.work_start_time.slice(0, 5)} – ${company.work_end_time.slice(0, 5)}` : null;
    const showTeam = team.length > 0 && services.some(s => (s.booking_mode || 'staff') === 'staff');
    const favorite = favorites.isFavorite(company.id);
    const aboutText =
        (company.description || '').trim() ||
        (selectedTemplate?.about || '').trim() ||
        webPack.aboutFallback ||
        'Profesyonel ekibimizle randevu ve bakım hizmetlerinde yanınızdayız.';
    const contactNote = (company.contact_note || '').trim();
    const socialLinks = (
        [
            { kind: 'instagram' as const, label: 'Instagram', href: socialHref('instagram', company.instagram_url) },
            { kind: 'facebook' as const, label: 'Facebook', href: socialHref('facebook', company.facebook_url) },
            { kind: 'tiktok' as const, label: 'TikTok', href: socialHref('tiktok', company.tiktok_url) },
        ] as const
    ).filter((s): s is { kind: SocialKind; label: string; href: string } => !!s.href);
    const socialPlacement = (() => {
        const p = String(company.web_social_placement || 'about').toLowerCase();
        return ['about', 'contact', 'both', 'hero', 'hidden'].includes(p)
            ? (p as 'about' | 'contact' | 'both' | 'hero' | 'hidden')
            : 'about';
    })();
    const showSocialAbout = socialLinks.length > 0 && (socialPlacement === 'about' || socialPlacement === 'both');
    const showSocialContact = socialLinks.length > 0 && (socialPlacement === 'contact' || socialPlacement === 'both');
    const showSocialHero = socialLinks.length > 0 && socialPlacement === 'hero';
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
        ...(showSocialContact
            ? socialLinks.map(s => ({
                  label: s.label,
                  value: s.href.replace(/^https?:\/\//, ''),
                  href: s.href,
                  kind: s.kind as SocialKind | undefined,
              }))
            : []),
    ].filter(Boolean) as { label: string; value: string; href: string; kind?: SocialKind }[];
    const introMode = fromQr || searchParams.get('home') === '1';

    const goBook = (query = '') => {
        const q = query.startsWith('?') ? `${query}&from=site` : `?from=site${query ? `&${query}` : ''}`;
        navigate(`/book/${company.id}${q}`, { state: { fromCompany: true } });
    };

    const book = (query = '') => {
        addScannedCompanyId(company.id);
        if (visitor || loadVisitorProfile()) {
            goBook(query);
            return;
        }
        pendingBookRef.current = query;
        setVisitorGate(true);
    };

    const share = async () => {
        const url = `${window.location.origin}/?c=${company.id}&ref=qr&install=1`;
        try {
            if (navigator.share) await navigator.share({ title: company.name, url });
            else await navigator.clipboard.writeText(url);
        } catch {
            /* kullanıcı paylaşımı kapattı */
        }
    };

    const layout = selectedTemplate?.layout || 'overlay';
    const ctaLabel = selectedTemplate?.ctaLabel || bookingCtaLabel(sectorSlug);
    const isDark = layout === 'dark-full';
    const heroH = introMode
        ? layout === 'editorial'
            ? 'h-[48vw] max-h-64 min-h-[13rem]'
            : 'h-[42vw] max-h-56 min-h-[11.5rem]'
        : layout === 'split'
          ? 'h-52'
          : layoutGroup === 'sport'
            ? 'h-48'
            : 'h-44';

    const hasFirmList = getScannedCompanyIds().length > 0;
    const goFirmList = () => {
      navigate('/app', { replace: true });
    };
    const topBar = (
        <div className="absolute inset-x-0 top-0 safe-top z-30 pointer-events-none">
            <div className="max-w-lg mx-auto flex justify-between items-start p-3">
                {hasFirmList ? (
                    <div className="pointer-events-auto">
                        <RoundButton label="İşletmelerim" onClick={goFirmList}>
                            ↑
                        </RoundButton>
                    </div>
                ) : (
                    <span className="w-10" aria-hidden />
                )}
                <div className="pointer-events-auto flex gap-2">
                    <RoundButton label="Paylaş" onClick={share}>
                        <span className="text-base leading-none" aria-hidden>
                          📤
                        </span>
                    </RoundButton>
                    {!introMode && (
                        <RoundButton label={favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'} pressed={favorite} onClick={() => favorites.toggle(company.id)}>
                            <span className={favorite ? 'text-rose-500' : ''}>{favorite ? '♥' : '♡'}</span>
                        </RoundButton>
                    )}
                </div>
            </div>
        </div>
    );

    const heroTitleBlock = (opts?: { onDark?: boolean; compact?: boolean }) => (
        <div
            className={
                opts?.compact
                    ? ''
                    : 'relative z-10 flex h-full max-w-lg mx-auto flex-col justify-end px-4 pb-5 pt-14 pointer-events-none'
            }
        >
            <p
                className={`text-[10px] font-black uppercase tracking-[0.22em] ${
                    opts?.onDark ? 'text-white/75' : 'text-slate-500'
                }`}
                style={!opts?.onDark ? { color: theme.accent } : undefined}
            >
                {sector?.name || selectedTemplate?.styleName || 'İşletme'}
            </p>
            <h1
                className={`mt-1 font-black leading-tight drop-shadow ${
                    opts?.onDark ? 'text-white' : 'text-slate-900'
                } ${opts?.compact ? 'text-2xl' : 'text-2xl sm:text-[1.65rem]'}`}
            >
                {company.name}
            </h1>
            <p className={`mt-1.5 max-w-sm text-xs font-semibold sm:text-sm ${opts?.onDark ? 'text-white/85' : 'text-slate-600'}`}>
                {webPack.tagline}
            </p>
            {showSocialHero && (
                <div className="pointer-events-auto mt-3">
                    <SocialButtons links={socialLinks} accent={theme.accent} onDark={opts?.onDark} />
                </div>
            )}
            {rating && (
                <button
                    type="button"
                    onClick={() => setReviewsOpen(true)}
                    className={`pointer-events-auto mt-2 w-fit text-xs font-bold ${opts?.onDark ? 'text-amber-300' : 'text-amber-600'}`}
                >
                    {rating} · yorumları gör
                </button>
            )}
        </div>
    );

    return (
        <div
            className="min-h-screen pb-36"
            style={{
                ['--sector-accent' as string]: theme.accent,
                background: selectedTemplate?.theme.surface || (isDark ? '#111827' : '#f8fafc'),
            }}
        >
            {layout === 'split' ? (
                <div className={`relative grid overflow-hidden bg-slate-900 sm:grid-cols-2 ${heroH}`}>
                    <div className="relative min-h-[11rem]" style={{ background: `linear-gradient(145deg, ${theme.heroFrom}, ${theme.heroTo})` }}>
                        {heroImage && <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                        <div className="absolute inset-0 bg-black/25" />
                        {topBar}
                    </div>
                    <div className="relative flex flex-col justify-end px-4 py-5" style={{ background: theme.accentSoft }}>
                        {heroTitleBlock({ compact: true })}
                        {bookable && (
                            <button
                                type="button"
                                onClick={() => book()}
                                className="mt-4 w-full rounded-2xl py-3.5 text-sm font-black text-white shadow-lg"
                                style={{ backgroundColor: theme.accent === '#e5e7eb' ? '#111827' : theme.accent }}
                            >
                                {ctaLabel}
                            </button>
                        )}
                    </div>
                </div>
            ) : layout === 'editorial' ? (
                <div className="relative" style={{ background: selectedTemplate?.theme.surface || '#fffaf8' }}>
                    {topBar}
                    <div className="max-w-lg mx-auto px-4 pb-2 pt-16">
                        {heroTitleBlock({ compact: true })}
                    </div>
                    <div className={`relative mx-4 mb-2 overflow-hidden rounded-3xl ${heroH}`} style={{ background: `linear-gradient(145deg, ${theme.heroFrom}, ${theme.heroTo})` }}>
                        {heroImage && <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                        {bookable && (
                            <div className="absolute inset-x-0 bottom-0 p-4">
                                <button
                                    type="button"
                                    onClick={() => book()}
                                    className="w-full rounded-2xl py-3.5 text-sm font-black text-white shadow-xl"
                                    style={{ backgroundColor: theme.accent === '#e5e7eb' ? '#111827' : theme.accent }}
                                >
                                    {ctaLabel}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : layout === 'card' ? (
                <div className="relative px-4 pb-2 pt-2" style={{ background: `linear-gradient(160deg, ${theme.heroFrom}, ${theme.heroTo})` }}>
                    {topBar}
                    <div className="mx-auto mt-14 max-w-lg overflow-hidden rounded-3xl bg-white shadow-xl">
                        <div className={`relative ${heroH}`}>
                            {heroImage && <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                        </div>
                        <div className="p-5">
                            {heroTitleBlock({ compact: true })}
                            {bookable && (
                                <button
                                    type="button"
                                    onClick={() => book()}
                                    className="mt-4 w-full rounded-2xl py-3.5 text-sm font-black text-white shadow-lg"
                                    style={{ backgroundColor: theme.accent === '#e5e7eb' ? '#111827' : theme.accent }}
                                >
                                    {ctaLabel}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    className={`relative ${heroH} overflow-hidden bg-slate-900`}
                    style={{ background: `linear-gradient(145deg, ${theme.heroFrom}, ${theme.heroTo})` }}
                >
                    {heroImage && <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                    <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-t from-black via-black/55 to-black/25' : 'bg-gradient-to-t from-black/75 via-black/35 to-black/20'}`} />
                    {topBar}
                    {heroTitleBlock({ onDark: true })}
                </div>
            )}

            <main className={`max-w-lg mx-auto px-4 relative space-y-4 ${layout === 'card' || layout === 'editorial' ? 'mt-2' : '-mt-6'}`}>
                {visitor && !introMode && (
                    <p className="rounded-2xl px-3 py-2 text-xs font-bold text-slate-600" style={{ backgroundColor: theme.accentSoft }}>
                        Merhaba {visitor.firstName} — sonraki girişlerde bilginiz hatırlanır
                    </p>
                )}
                {(address || hours || phone || showAddress) && (
                <section className={`bg-white border border-slate-100 shadow-sm p-5 ${layoutGroup === 'clinic' ? 'rounded-2xl' : 'rounded-3xl'}`}>
                    <dl className="space-y-2 text-sm">
                        {address && <InfoRow icon="📍" text={address} />}
                        {hours && <InfoRow icon="🕘" text={`Çalışma saatleri ${hours}`} />}
                    </dl>
                    <div className={`mt-4 grid gap-2 ${phone ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {phone ? (
                            <a href={`tel:${phone}`} className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-50 text-emerald-700 text-sm font-black">📞 Ara</a>
                        ) : null}
                        {showAddress ? (
                            <a href={directionsUrl(company)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-sky-50 text-sky-700 text-sm font-black">🧭 Yol tarifi</a>
                        ) : null}
                    </div>
                </section>
                )}

                <section className={`bg-white border border-slate-100 shadow-sm p-5 ${layoutGroup === 'clinic' ? 'rounded-2xl' : 'rounded-3xl'}`}>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Hakkında</h2>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{aboutText}</p>
                    {contactNote ? (
                        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">{contactNote}</p>
                    ) : null}
                    {showSocialAbout && (
                        <div className="mt-4">
                            <SocialButtons links={socialLinks} accent={theme.accent} />
                        </div>
                    )}
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
                                    <a
                                        href={c.href}
                                        {...(c.kind ? { target: '_blank', rel: 'noreferrer' } : {})}
                                        className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800"
                                    >
                                        <span className="flex items-center gap-2 text-slate-400">
                                            {c.kind ? (
                                                <span
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white"
                                                    style={{ backgroundColor: theme.accent }}
                                                >
                                                    <SocialIcon kind={c.kind} className="h-4 w-4" />
                                                </span>
                                            ) : null}
                                            {c.label}
                                        </span>
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
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{labels.servicePlural}</h2>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {services.map(s => {
                                const imgSrc = serviceImages.get(s.id ?? s.name) || '';
                                const showPrice = !hidePrices && Number(s.price) > 0;
                                const meta = `${s.booking_mode === 'class' ? 'Grup dersi · ' : ''}${durationText(s)}`;
                                const body = (
                                    <>
                                        <div className="relative aspect-[16/10] overflow-hidden bg-slate-200">
                                            <img
                                                src={imgSrc}
                                                alt={s.name}
                                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                                            {showPrice ? (
                                                <span className="absolute bottom-2 right-2 rounded-full bg-white/95 px-2.5 py-1 text-xs font-black text-slate-900 shadow">
                                                    {formatMoney(s.price)}
                                                </span>
                                            ) : hidePrices ? (
                                                <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                                                    Fiyat sorun
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="p-3.5">
                                            <p className="font-black text-slate-900 leading-snug line-clamp-2">{s.name}</p>
                                            <p className="mt-1 text-xs font-semibold text-slate-400">{meta}</p>
                                            {!introMode && bookable && (
                                                <span
                                                    className="mt-3 inline-flex rounded-xl px-3 py-2 text-xs font-black text-white"
                                                    style={{
                                                        backgroundColor:
                                                            theme.accent === '#e5e7eb' || theme.accent === '#ffffff'
                                                                ? '#111827'
                                                                : theme.accent,
                                                    }}
                                                >
                                                    {ctaLabel}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                );
                                return introMode || !bookable ? (
                                    <div
                                        key={s.id}
                                        className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
                                    >
                                        {body}
                                    </div>
                                ) : (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => book(`?service=${s.id}`)}
                                        className="group overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition active:scale-[0.99]"
                                    >
                                        {body}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {showTeam && (
                    <section>
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{labels.staffPlural}</h2>
                        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 hide-scrollbar">
                            {team.map(m => {
                                const initials = `${m.first_name?.[0] || ''}${m.last_name?.[0] || ''}`.toLocaleUpperCase('tr-TR');
                                const avatar = (
                                    <div
                                        className="mx-auto overflow-hidden rounded-full border-2 shadow-md"
                                        style={{
                                            width: introMode ? 72 : 64,
                                            height: introMode ? 72 : 64,
                                            borderColor: theme.accentSoft,
                                            background: `linear-gradient(145deg, ${theme.heroFrom}, ${theme.heroTo})`,
                                        }}
                                    >
                                        {m.photo ? (
                                            <img src={m.photo} alt={`${m.first_name} ${m.last_name}`} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-base font-black text-white">
                                                {initials}
                                            </div>
                                        )}
                                    </div>
                                );
                                return introMode ? (
                                    <div key={m.id} className="shrink-0 w-28 text-center">
                                        {avatar}
                                        <p className="mt-2 text-xs font-bold text-slate-800 truncate">{m.first_name} {m.last_name}</p>
                                        {m.title && <p className="text-[10px] font-semibold text-slate-400 truncate">{m.title}</p>}
                                    </div>
                                ) : (
                                    <button key={m.id} type="button" onClick={() => book(`?staff=${m.id}`)} className="shrink-0 w-28 text-center">
                                        {avatar}
                                        <p className="mt-2 text-xs font-bold text-slate-800 truncate">{m.first_name} {m.last_name}</p>
                                        {m.title && <p className="text-[10px] font-semibold text-slate-400 truncate">{m.title}</p>}
                                    </button>
                                );
                            })}
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

            {/* Sağ kenar — her zaman görünür randevu */}
            {bookable && (
                <button
                    type="button"
                    onClick={() => book()}
                    className="fixed right-0 top-[42%] z-[60] -translate-y-1/2 rounded-l-2xl px-3.5 py-8 text-xs font-black uppercase tracking-[0.22em] text-white shadow-2xl"
                    style={{
                        backgroundColor:
                            theme.accent === '#e5e7eb' || theme.accent === '#ffffff' ? '#111827' : theme.accent,
                        writingMode: 'vertical-rl',
                    }}
                    aria-label={ctaLabel}
                >
                    {ctaLabel}
                </button>
            )}

            {/* Alt çubuk — buton sağda */}
            <div
                className="pointer-events-none fixed inset-x-0 bottom-0 z-50"
                style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
                <div className="pointer-events-auto mx-auto flex max-w-lg justify-end gap-2 px-4">
                    {bookable ? (
                        <button
                            type="button"
                            onClick={() => book()}
                            className="rounded-2xl px-6 py-4 text-sm font-black text-white shadow-2xl shadow-black/30 transition active:scale-[0.98]"
                            style={{
                                backgroundColor:
                                    theme.accent === '#e5e7eb' || theme.accent === '#ffffff' ? '#111827' : theme.accent,
                            }}
                        >
                            {ctaLabel}
                        </button>
                    ) : phone ? (
                        <a href={`tel:${phone}`} className="rounded-2xl bg-emerald-600 px-6 py-4 text-sm font-black text-white shadow-2xl">
                            Ara
                        </a>
                    ) : (
                        <a
                            href={directionsUrl(company)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-2xl bg-slate-900 px-6 py-4 text-sm font-black text-white shadow-2xl"
                        >
                            Yol tarifi
                        </a>
                    )}
                </div>
            </div>

            <ShortcutPrompt
                companyId={company.id}
                companyName={company.name}
                themeColor={theme.accent}
                enabled={fromQr || searchParams.get('home') === '1'}
                force={searchParams.get('install') === '1'}
            />

            <Sheet open={visitorGate} onClose={() => setVisitorGate(false)} title="Bilgileriniz">
                <p className="text-sm font-semibold text-slate-600 mb-4">
                    Randevu için ad, soyad ve telefonunuz bu cihazda saklanır. Sonraki girişlerde tekrar sorulmaz.
                </p>
                <div className="space-y-3">
                    <input value={vf.firstName} onChange={e => setVf(v => ({ ...v, firstName: e.target.value }))} placeholder="Ad" className="w-full rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 font-bold" autoComplete="given-name" />
                    <input value={vf.lastName} onChange={e => setVf(v => ({ ...v, lastName: e.target.value }))} placeholder="Soyad" className="w-full rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 font-bold" autoComplete="family-name" />
                    <div className="flex gap-2">
                        <input
                            value={vf.phone}
                            onChange={e => setVf(v => ({ ...v, phone: normalizeTrMobile(e.target.value) }))}
                            placeholder="05XX XXX XX XX"
                            type="tel"
                            inputMode="tel"
                            name="tel"
                            className="w-full rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 font-bold"
                            autoComplete="tel"
                        />
                        {canRequestDevicePhone() && (
                            <button
                                type="button"
                                disabled={phoneHintBusy}
                                onClick={() => {
                                    setPhoneHintBusy(true);
                                    void requestDevicePhoneNumber()
                                        .then(phone => {
                                            if (phone) setVf(v => ({ ...v, phone }));
                                        })
                                        .finally(() => setPhoneHintBusy(false));
                                }}
                                className="shrink-0 rounded-2xl bg-emerald-600 px-3 py-3 text-xs font-black text-white disabled:opacity-40"
                            >
                                {phoneHintBusy ? '…' : phonePickButtonLabel()}
                            </button>
                        )}
                    </div>
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
