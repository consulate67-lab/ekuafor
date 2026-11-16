import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { companiesApi, type PublicCompany } from '../../api/companies';
import CompanyCard from '../../components/customer/CompanyCard';
import CustomerNav from '../../components/customer/CustomerNav';
import { Button, EmptyState, Spinner } from '../../components/ui';
import { useFavorites } from '../../hooks/useFavorites';
import { useAuthStore } from '../../store/authStore';
import {
    getScannedCompanyIds,
    removeScannedCompanyId,
} from '../../lib/scannedCompanies';

/**
 * QR ile okutulan işletmeler — giriş/keşif yok.
 * Ana ekrana eklenen / native uygulama açılışında bu liste gelir.
 */
export default function CustomerHome() {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuthStore();
    const favorites = useFavorites();

    const [ids, setIds] = useState<number[]>(() => getScannedCompanyIds());
    const [companies, setCompanies] = useState<PublicCompany[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (isAuthenticated && user && user.role !== 'customer') {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, user, navigate]);

    const reloadIds = useCallback(() => {
        setIds(getScannedCompanyIds());
    }, []);

    useEffect(() => {
        const onFocus = () => reloadIds();
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onFocus);
        return () => {
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onFocus);
        };
    }, [reloadIds]);

    useEffect(() => {
        let cancelled = false;
        if (ids.length === 0) {
            setCompanies([]);
            setLoading(false);
            setError(false);
            return;
        }
        setLoading(true);
        setError(false);
        Promise.all(ids.map(id => companiesApi.get(id).catch(() => null)))
            .then(list => {
                if (cancelled) return;
                const found = list.filter((c): c is PublicCompany => !!c);
                // Kaybolan / silinen firmaları listeden çıkar
                const foundIds = new Set(found.map(c => c.id));
                ids.filter(id => !foundIds.has(id)).forEach(id => removeScannedCompanyId(id));
                // Okutulma sırasını koru
                const byId = new Map(found.map(c => [c.id, c]));
                setCompanies(ids.map(id => byId.get(id)).filter((c): c is PublicCompany => !!c));
            })
            .catch(() => {
                if (!cancelled) setError(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [ids]);

    const openCompany = useCallback(
        (c: PublicCompany) => navigate(`/firma/${c.id}?ref=qr`),
        [navigate],
    );

    const removeCompany = useCallback((id: number) => {
        setIds(removeScannedCompanyId(id));
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            <header className="bg-white border-b border-slate-100 safe-top">
                <div className="max-w-lg mx-auto px-4 pt-4 pb-4">
                    <div className="flex items-center gap-2">
                        <img src="./app-icon.png" alt="" className="w-9 h-9 rounded-xl" />
                        <span className="text-lg font-black text-slate-900 tracking-tight">Saloon</span>
                    </div>
                    <h1 className="mt-4 text-xl font-black text-slate-900">İşletmelerim</h1>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                        QR kodunu okuttuğunuz işletmeler burada listelenir.
                    </p>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Spinner />
                    </div>
                ) : error ? (
                    <EmptyState
                        icon="📡"
                        title="Bağlantı kurulamadı"
                        description="İnternet bağlantını kontrol edip tekrar dene."
                        action={<Button onClick={reloadIds}>Tekrar dene</Button>}
                    />
                ) : companies.length === 0 ? (
                    <EmptyState
                        icon="📷"
                        title="Henüz işletme yok"
                        description="Bir işletmenin duvarındaki veya masadaki QR barkodu telefonunuzun kamerasıyla okutun. Uygulama açıldığında burada görünecek."
                    />
                ) : (
                    companies.map(c => (
                        <div key={c.id} className="relative">
                            <CompanyCard
                                company={c}
                                favorite={favorites.isFavorite(c.id)}
                                onOpen={openCompany}
                                onToggleFavorite={favorites.toggle}
                            />
                            <button
                                type="button"
                                onClick={() => removeCompany(c.id)}
                                className="absolute bottom-3 right-3 text-[11px] font-bold text-slate-400 px-2 py-1 rounded-lg hover:bg-slate-100 hover:text-slate-600"
                                aria-label={`${c.name} listeden çıkar`}
                            >
                                Kaldır
                            </button>
                        </div>
                    ))
                )}
            </main>

            <CustomerNav />
        </div>
    );
}
