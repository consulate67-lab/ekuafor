import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { businessAppointmentsApi } from '../../api/business';
import { companiesApi, type PublicCompany } from '../../api/companies';
import { BottomNav, Button, EmptyState, PageHeader, type NavItem } from '../../components/ui';
import { todayKey } from '../../lib/dates';
import { labelsFor } from '../../lib/labels';
import { useAuthStore } from '../../store/authStore';
import { AppointmentsTab } from './AppointmentsTab';
import { ExpensesTab } from './ExpensesTab';
import { MoreTab } from './MoreTab';
import { ReportsTab } from './ReportsTab';

type Tab = 'appointments' | 'expenses' | 'reports' | 'more';

const TITLES: Record<Tab, string> = {
    appointments: 'Randevular',
    expenses: 'Masraf',
    reports: 'Raporlar',
    more: 'Daha fazla',
};

export const BUSINESS_ROLES = ['company_admin', 'staff'];

/** Firma yöneticisi ve personelin telefon öncelikli uygulaması: `/isletme?tab=…` */
export default function BusinessApp() {
    const { user, isAuthenticated, logout } = useAuthStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const [company, setCompany] = useState<PublicCompany | null>(null);
    const [pendingCount, setPendingCount] = useState(0);

    const isAdmin = user?.role === 'company_admin';
    const companyId = user?.company_id;

    const tabs = useMemo<NavItem<Tab>[]>(() => [
        { key: 'appointments', label: 'Randevular', icon: '📅', badge: pendingCount },
        ...(isAdmin ? [{ key: 'expenses' as Tab, label: 'Masraf', icon: '🧾' }] : []),
        { key: 'reports', label: 'Raporlar', icon: '📊' },
        { key: 'more', label: 'Daha fazla', icon: '☰' },
    ], [isAdmin, pendingCount]);

    const requested = searchParams.get('tab') as Tab | null;
    const active: Tab = tabs.some(t => t.key === requested) ? requested! : 'appointments';

    useEffect(() => {
        if (!companyId) return;
        companiesApi.get(companyId).then(setCompany).catch(() => setCompany(null));
    }, [companyId]);

    // Randevular sekmesi açıkken sayıyı kendisi bildirir; diğer sekmelerde rozet buradan güncellenir.
    useEffect(() => {
        if (!companyId || active === 'appointments') return;
        const refresh = () => businessAppointmentsApi.list({ start_date: todayKey(), status: 'pending' })
            .then(list => setPendingCount(list.length))
            .catch(() => {});
        refresh();
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') refresh();
        }, 60_000);
        return () => clearInterval(timer);
    }, [companyId, active]);

    const labels = useMemo(() => labelsFor(company?.primary_sector?.slug, company ?? undefined), [company]);
    const onPendingCount = useCallback((n: number) => setPendingCount(n), []);

    if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
    if (!BUSINESS_ROLES.includes(user.role)) return <Navigate to={user.role === 'customer' ? '/app' : '/dashboard'} replace />;

    if (!companyId) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <EmptyState
                    icon="🏢"
                    title="Hesabınız bir işletmeye bağlı değil"
                    description="İşletme yöneticinizden sizi personel olarak eklemesini isteyin."
                    action={<Button variant="secondary" onClick={logout}>Çıkış yap</Button>}
                />
            </div>
        );
    }

    const switchTab = (tab: Tab) => {
        setSearchParams(tab === 'appointments' ? {} : { tab }, { replace: true });
        window.scrollTo(0, 0);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-28">
            <PageHeader title={TITLES[active]} subtitle={company?.name} />
            {company?.is_license_expired && (
                <div className="max-w-lg mx-auto px-4 mb-3">
                    <p role="alert" className="p-3 rounded-2xl bg-amber-50 text-amber-800 text-xs font-bold">
                        Lisans süreniz dolmuş. Yeni randevu almaya devam etmek için lütfen bizimle iletişime geçin.
                    </p>
                </div>
            )}
            <main className="max-w-lg mx-auto px-4">
                {active === 'appointments' && <AppointmentsTab companyId={companyId} labels={labels} onPendingCount={onPendingCount} />}
                {active === 'expenses' && <ExpensesTab />}
                {active === 'reports' && <ReportsTab isAdmin={isAdmin} labels={labels} />}
                {active === 'more' && <MoreTab user={user} company={company} labels={labels} isAdmin={isAdmin} onLogout={logout} />}
            </main>
            <BottomNav items={tabs} active={active} onChange={switchTab} />
        </div>
    );
}
