import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { companiesApi, type PublicCompany } from '../../api/companies';
import CompanyCard from '../../components/customer/CompanyCard';
import CustomerNav from '../../components/customer/CustomerNav';
import { QrScanSheet } from '../../components/customer/QrScanSheet';
import { Button, EmptyState, Spinner } from '../../components/ui';
import { useFavorites } from '../../hooks/useFavorites';
import { useAuthStore } from '../../store/authStore';
import {
    addScannedCompanyId,
    getLastOpenedCompanyId,
    getScannedCompanyIds,
    removeScannedCompanyId,
    setLastOpenedCompanyId,
} from '../../lib/scannedCompanies';

/**
 * QR ile eklenen işletmeler — açılışta firma seçimi.
 * Yeni firma: uygulama içi QR veya dış kameradan gelen deep link.
 */
export default function CustomerHome() {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuthStore();
    const favorites = useFavorites();

    const [ids, setIds] = useState<number[]>(() => getScannedCompanyIds());
    const [companies, setCompanies] = useState<PublicCompany[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [scanOpen, setScanOpen] = useState(false);
    const [lastOpened, setLastOpened] = useState<number | null>(() => getLastOpenedCompanyId());
    const [toast, setToast] = useState('');

    useEffect(() => {
        if (isAuthenticated && user && user.role !== 'customer') {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, user, navigate]);

    const reloadIds = useCallback(() => {
        setIds(getScannedCompanyIds());
        setLastOpened(getLastOpenedCompanyId());
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
                const foundIds = new Set(found.map(c => c.id));
                ids.filter(id => !foundIds.has(id)).forEach(id => removeScannedCompanyId(id));
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
        (c: PublicCompany) => {
            setLastOpenedCompanyId(c.id);
            setLastOpened(c.id);
            navigate(`/firma/${c.id}`);
        },
        [navigate],
    );

    const removeCompany = useCallback((id: number) => {
        setIds(removeScannedCompanyId(id));
    }, []);

    const onScanned = useCallback(
        (id: number) => {
            const before = getScannedCompanyIds();
            const wasNew = !before.includes(id);
            addScannedCompanyId(id);
            setLastOpenedCompanyId(id);
            setIds(getScannedCompanyIds());
            setLastOpened(id);
            setToast(wasNew ? 'İşletme listenize eklendi' : 'İşletme zaten listenizde');
            window.setTimeout(() => setToast(''), 2500);
            navigate(`/firma/${id}`);
        },
        [navigate],
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-28">
            <header className="bg-white border-b border-slate-100 safe-top">
                <div className="max-w-lg mx-auto px-4 pt-4 pb-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <img src="./app-icon.png" alt="" className="w-9 h-9 rounded-xl shrink-0" />
                            <span className="text-lg font-black text-slate-900 tracking-tight">Saloon</span>
                        </div>
                        <Button size="sm" onClick={() => setScanOpen(true)} className="!rounded-xl shrink-0">
                            QR okut
                        </Button>
                    </div>
                    <h1 className="mt-4 text-xl font-black text-slate-900">
                        {companies.length > 1 ? 'Hangi işletmeye gideceksiniz?' : 'İşletmelerim'}
                    </h1>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                        {companies.length > 1
                            ? 'Masaj, kuaför, güzellik… hepsi aynı uygulamada. Birini seçin.'
                            : 'QR ile eklediğiniz işletmeler burada. Yenisini eklemek için QR okutun.'}
                    </p>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
                {toast && (
                    <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">
                        {toast}
                    </div>
                )}

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
                        description="Uygulama içinden QR okutun veya telefon kamerasıyla barkodu açın — işletme buraya eklenir."
                        action={
                            <Button onClick={() => setScanOpen(true)} className="!min-h-12">
                                QR okutarak ekle
                            </Button>
                        }
                    />
                ) : (
                    companies.map(c => (
                        <div key={c.id} className="relative">
                            {lastOpened === c.id && companies.length > 1 && (
                                <span className="absolute top-3 left-3 z-10 rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                                    Son açılan
                                </span>
                            )}
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

                {companies.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setScanOpen(true)}
                        className="w-full rounded-3xl border-2 border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-black text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    >
                        + Başka işletme ekle (QR)
                    </button>
                )}
            </main>

            <QrScanSheet open={scanOpen} onClose={() => setScanOpen(false)} onCompanyId={onScanned} />
            <CustomerNav />
        </div>
    );
}
