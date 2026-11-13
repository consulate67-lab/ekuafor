import { useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from '../ui';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { getPinnedCompanyId } from '../../lib/pinnedCompany';

type Tab = 'explore' | 'appointments' | 'notifications';

/** Müşteri ekranlarının alt menüsü: Keşfet · Randevularım · Bildirimler. */
export default function CustomerNav() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const unread = useUnreadNotifications();
    const pinned = getPinnedCompanyId();
    const active: Tab = pathname.startsWith('/my-appointments') ? 'appointments' : pathname.startsWith('/my-notifications') ? 'notifications' : 'explore';

    return (
        <BottomNav<Tab>
            active={active}
            onChange={tab => {
                if (tab === 'explore' && pinned) {
                    navigate(`/firma/${pinned}?ref=qr&home=1`, { replace: true });
                    return;
                }
                const paths: Record<Tab, string> = {
                    explore: '/app',
                    appointments: '/my-appointments',
                    notifications: '/my-notifications',
                };
                navigate(paths[tab]);
            }}
            items={[
                { key: 'explore', label: pinned ? 'İşletme' : 'Keşfet', icon: pinned ? '🏪' : '🔍' },
                { key: 'appointments', label: 'Randevularım', icon: '📅' },
                { key: 'notifications', label: 'Bildirimler', icon: '🔔', badge: unread },
            ]}
        />
    );
}
