import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { companiesApi, type PublicCompany } from '../../api/companies';
import { sectorsApi, type Sector } from '../../api/sectors';
import CompanyCard from '../../components/customer/CompanyCard';
import CustomerNav from '../../components/customer/CustomerNav';
import { Button, EmptyState, SectorIcon, Spinner } from '../../components/ui';
import { useFavorites } from '../../hooks/useFavorites';
import { getPosition, hasLocationPermission, type LatLng } from '../../lib/geo';
import { useAuthStore } from '../../store/authStore';

const PAGE_SIZE = 20;
/** Cinsiyet filtresi sadece bu sektörlerde anlamlı. */
const GENDERED_SECTORS = ['hair', 'barber', 'beauty'];
const GENDERS = ['Kadın', 'Erkek', 'Çocuk'];

const normalize = (s: string) => s.toLocaleLowerCase('tr-TR').trim();

export default function CustomerHome() {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuthStore();
    const [params, setParams] = useSearchParams();
    const sector = params.get('sektor');
    const [query, setQuery] = useState(params.get('q') || '');
    const [debouncedQuery, setDebouncedQuery] = useState(query.trim());
    const [gender, setGender] = useState<string | null>(null);

    const [sectors, setSectors] = useState<Sector[]>([]);
    const [location, setLocation] = useState<LatLng | null>(null);
    const [locating, setLocating] = useState(false);
    const [locationDenied, setLocationDenied] = useState(false);

    const [companies, setCompanies] = useState<PublicCompany[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(false);
    const requestRef = useRef(0);

    const favorites = useFavorites();
    const [favoriteCompanies, setFavoriteCompanies] = useState<PublicCompany[]>([]);

    useEffect(() => {
        if (isAuthenticated && user && user.role !== 'customer') navigate('/dashboard', { replace: true });
    }, [isAuthenticated, user, navigate]);

    useEffect(() => {
        sectorsApi.list().then(setSectors).catch(() => setSectors([]));
        hasLocationPermission().then(async granted => {
            const pos = granted ? await getPosition() : null;
            if (pos) setLocation(pos);
        });
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
        return () => clearTimeout(t);
    }, [query]);

    useEffect(() => {
        setParams(prev => {
            const next = new URLSearchParams(prev);
            if (debouncedQuery) next.set('q', debouncedQuery);
            else next.delete('q');
            return next;
        }, { replace: true });
    }, [debouncedQuery, setParams]);

    const selectSector = (slug: string | null) => {
        setGender(null);
        setParams(prev => {
            const next = new URLSearchParams(prev);
            if (slug) next.set('sektor', slug);
            else next.delete('sektor');
            return next;
        }, { replace: true });
    };

    const showGender = !!sector && GENDERED_SECTORS.includes(sector);
    const filters = useMemo(() => ({
        search: debouncedQuery || undefined,
        sector: sector || undefined,
        gender: showGender ? gender || undefined : undefined,
        ...(location ? { lat: location.lat, lng: location.lng, sort: 'distance' as const } : { sort: 'rating' as const }),
        limit: PAGE_SIZE,
    }), [debouncedQuery, sector, gender, showGender, location]);

    const load = useCallback(async (pageToLoad: number) => {
        const requestId = ++requestRef.current;
        if (pageToLoad === 1) setLoading(true);
        else setLoadingMore(true);
        setError(false);
        try {
            const result = await companiesApi.list({ ...filters, page: pageToLoad });
            if (requestId !== requestRef.current) return;
            setCompanies(prev => (pageToLoad === 1 ? result.companies : [...prev, ...result.companies]));
            setHasMore(result.hasMore);
            setPage(pageToLoad);
        } catch {
            if (requestId === requestRef.current) setError(true);
        } finally {
            if (requestId === requestRef.current) {
                setLoading(false);
                setLoadingMore(false);
            }
        }
    }, [filters]);

    useEffect(() => { load(1); }, [load]);

    const showFavorites = !debouncedQuery && !sector && favorites.ids.length > 0;
    useEffect(() => {
        if (!showFavorites) return;
        let cancelled = false;
        Promise.all(favorites.ids.slice(0, 20).map(id => companiesApi.get(id).catch(() => null)))
            .then(list => { if (!cancelled) setFavoriteCompanies(list.filter((c): c is PublicCompany => !!c)); });
        return () => { cancelled = true; };
    }, [showFavorites, favorites.ids]);

    const findNearby = async () => {
        if (location) {
            setLocation(null);
            return;
        }
        setLocating(true);
        const pos = await getPosition();
        setLocating(false);
        setLocationDenied(!pos);
        if (pos) setLocation(pos);
    };

    const openCompany = useCallback((c: PublicCompany) => navigate(`/firma/${c.id}`), [navigate]);

    const activeSector = sectors.find(s => s.slug === sector) || null;
    const suggestedSector = useMemo(() => {
        const q = normalize(debouncedQuery);
        if (q.length < 3 || sector) return null;
        return sectors.find(s => normalize(s.name_tr).includes(q)) || null;
    }, [debouncedQuery, sector, sectors]);

    const listTitle = activeSector ? activeSector.name_tr : location ? 'Yakınındaki işletmeler' : debouncedQuery ? 'Arama sonuçları' : 'İşletmeler';

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            <header className="bg-white border-b border-slate-100 safe-top">
                <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <img src="./app-icon.png" alt="" className="w-9 h-9 rounded-xl" />
                            <span className="text-lg font-black text-slate-900 tracking-tight">Saloon</span>
                        </div>
                        <button type="button" onClick={() => navigate('/login')} className="text-xs font-black text-brand-600 px-3 py-2 rounded-xl hover:bg-brand-50">
                            İşletme girişi
                        </button>
                    </div>
                    <h1 className="mt-4 text-xl font-black text-slate-900">Ne için randevu almak istersin?</h1>
                    <div className="mt-3 flex gap-2">
                        <label className="flex-1 flex items-center gap-2 bg-slate-100 rounded-2xl px-4">
                            <span aria-hidden className="text-slate-400">🔍</span>
                            <input
                                type="search"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Pilates, halı saha, kuaför, işletme adı…"
                                aria-label="İşletme veya hizmet ara"
                                className="w-full bg-transparent py-3 text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={findNearby}
                            aria-pressed={!!location}
                            className={`px-3 rounded-2xl text-xs font-black flex items-center gap-1 ${location ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                        >
                            {locating ? <Spinner size="sm" light={!!location} /> : <span aria-hidden>📍</span>}
                            Yakınımda
                        </button>
                    </div>
                    {locationDenied && <p className="mt-2 text-xs font-bold text-amber-600">Konum alınamadı. Konum iznini ayarlardan açabilirsin.</p>}
                </div>

                <div className="max-w-lg mx-auto flex gap-2 overflow-x-auto px-4 pb-3 hide-scrollbar" role="tablist" aria-label="Sektörler">
                    <SectorChip label="Tümü" icon="✨" active={!sector} onClick={() => selectSector(null)} />
                    {sectors.map(s => (
                        <SectorChip key={s.slug} label={s.name_tr} icon={s.icon} color={s.color} active={sector === s.slug} onClick={() => selectSector(s.slug)} />
                    ))}
                </div>
                {showGender && (
                    <div className="max-w-lg mx-auto flex gap-2 px-4 pb-3">
                        {[null, ...GENDERS].map(g => (
                            <button
                                key={g || 'all'}
                                type="button"
                                onClick={() => setGender(g)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${gender === g ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
                            >
                                {g || 'Hepsi'}
                            </button>
                        ))}
                    </div>
                )}
            </header>

            <main className="max-w-lg mx-auto px-4 py-4 space-y-5">
                {suggestedSector && (
                    <button
                        type="button"
                        onClick={() => { setQuery(''); selectSector(suggestedSector.slug); }}
                        className="w-full flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-3 text-left"
                    >
                        <SectorIcon icon={suggestedSector.icon} color={suggestedSector.color} size="sm" />
                        <span className="text-sm font-bold text-slate-700">Tüm <b>{suggestedSector.name_tr}</b> işletmelerini gör</span>
                    </button>
                )}

                {showFavorites && favoriteCompanies.length > 0 && (
                    <section>
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Favorilerim</h2>
                        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 hide-scrollbar">
                            {favoriteCompanies.map(c => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => openCompany(c)}
                                    className="shrink-0 w-28 bg-white rounded-2xl border border-slate-100 p-3 text-center active:scale-95 transition"
                                >
                                    <div className="flex justify-center">
                                        {c.photo
                                            ? <img src={c.photo} alt="" className="w-12 h-12 rounded-2xl object-cover" />
                                            : <SectorIcon icon={c.primary_sector?.icon} color={c.primary_sector?.color} />}
                                    </div>
                                    <p className="mt-2 text-xs font-black text-slate-800 line-clamp-2">{c.name}</p>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                <section>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{listTitle}</h2>
                    {loading ? (
                        <div className="flex justify-center py-16"><Spinner /></div>
                    ) : error ? (
                        <EmptyState icon="📡" title="Bağlantı kurulamadı" description="İnternet bağlantını kontrol edip tekrar dene." action={<Button onClick={() => load(1)}>Tekrar dene</Button>} />
                    ) : companies.length === 0 ? (
                        <EmptyState
                            icon="🔍"
                            title="Sonuç bulunamadı"
                            description={sector || debouncedQuery ? 'Aramayı veya kategoriyi değiştirmeyi dene.' : 'Henüz listelenecek işletme yok.'}
                            action={(sector || debouncedQuery) ? <Button variant="secondary" onClick={() => { setQuery(''); selectSector(null); }}>Filtreleri temizle</Button> : undefined}
                        />
                    ) : (
                        <div className="space-y-3">
                            {companies.map(c => (
                                <CompanyCard key={c.id} company={c} favorite={favorites.isFavorite(c.id)} onOpen={openCompany} onToggleFavorite={favorites.toggle} />
                            ))}
                            {hasMore && (
                                <Button variant="secondary" block loading={loadingMore} onClick={() => load(page + 1)}>
                                    Daha fazla göster
                                </Button>
                            )}
                        </div>
                    )}
                </section>
            </main>

            <CustomerNav />
        </div>
    );
}

function SectorChip({ label, icon, color, active, onClick }: { label: string; icon: string; color?: string; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={active}
            onClick={onClick}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border transition ${active ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-200'}`}
            style={active ? { backgroundColor: color || '#4f46e5' } : undefined}
        >
            <span aria-hidden>{icon}</span>
            {label}
        </button>
    );
}
