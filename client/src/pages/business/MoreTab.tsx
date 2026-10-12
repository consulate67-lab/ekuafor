import { useNavigate } from 'react-router-dom';
import type { PublicCompany } from '../../api/companies';
import { Card, SectorIcon } from '../../components/ui';
import type { Labels } from '../../lib/labels';
import type { User } from '../../types';

interface Link { label: string; icon: string; to: string; hint?: string }

const panel = (tab: string) => `/company-panel?tab=${tab}`;

export function MoreTab({ user, company, labels, isAdmin, onLogout }: {
    user: User;
    company: PublicCompany | null;
    labels: Labels;
    isAdmin: boolean;
    onLogout: () => void;
}) {
    const navigate = useNavigate();

    const groups: { title: string; links: Link[] }[] = isAdmin ? [
        {
            title: 'İşletme',
            links: [
                { label: 'Firma profili ve çalışma saatleri', icon: '🏢', to: panel('profile') },
                { label: labels.servicePlural, icon: '🧾', to: panel('services'), hint: 'Fiyat, süre, rezervasyon tipi' },
                { label: labels.staffPlural, icon: '👥', to: panel('staff') },
                { label: `${labels.resourcePlural} ve seanslar`, icon: '🗓️', to: panel('scheduling') },
                { label: 'Departmanlar', icon: '🗂️', to: panel('dept') },
            ],
        },
        {
            title: 'Müşteri ve finans',
            links: [
                { label: 'Müşteriler', icon: '🙋', to: panel('customers-list') },
                { label: 'Faturalar ve e-fatura', icon: '📄', to: panel('finance-sales-list') },
                { label: 'Kasa ve cari hesaplar', icon: '🏦', to: panel('finance-cash-list') },
                { label: 'SMS ayarları', icon: '✉️', to: '/sms-settings' },
            ],
        },
        {
            title: 'Bağlantılar',
            links: [
                { label: 'Müşteri randevu QR kodu', icon: '📱', to: panel('booking') },
                { label: 'Yönetici giriş kodu', icon: '🔑', to: panel('qr') },
                { label: 'Salon ekranı (board)', icon: '🖥️', to: '/board' },
                { label: 'Entegrasyon', icon: '🔌', to: panel('integration') },
            ],
        },
    ] : [];

    return (
        <div className="space-y-6">
            <Card className="flex items-center gap-4">
                <SectorIcon icon={company?.primary_sector?.icon} color={company?.primary_sector?.color} size="lg" />
                <div className="min-w-0">
                    <p className="font-black text-slate-900 truncate">{company?.name ?? 'İşletme'}</p>
                    <p className="text-xs font-bold text-slate-400 truncate">
                        {[company?.primary_sector?.name, company?.district, company?.city].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-xs font-bold text-brand-600 mt-1">
                        {user.first_name} {user.last_name} · {isAdmin ? 'Yönetici' : labels.staff}
                    </p>
                </div>
            </Card>

            {groups.map(group => (
                <section key={group.title} aria-label={group.title}>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 mb-2">{group.title}</h2>
                    <ul className="bg-white rounded-3xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                        {group.links.map(link => (
                            <li key={link.to}>
                                <button
                                    type="button"
                                    onClick={() => navigate(link.to)}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50"
                                >
                                    <span className="text-xl w-8 text-center" aria-hidden>{link.icon}</span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block font-bold text-slate-800 truncate">{link.label}</span>
                                        {link.hint && <span className="block text-xs font-medium text-slate-400 truncate">{link.hint}</span>}
                                    </span>
                                    <span className="text-slate-300 font-black" aria-hidden>›</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}

            {company && (
                <button
                    type="button"
                    onClick={() => navigate(`/firma/${company.id}`)}
                    className="w-full text-center text-sm font-bold text-brand-600"
                >
                    Müşterilerin gördüğü sayfayı aç
                </button>
            )}

            <button
                type="button"
                onClick={onLogout}
                className="w-full py-4 rounded-2xl bg-rose-50 text-rose-600 font-black"
            >
                Çıkış yap
            </button>
        </div>
    );
}
