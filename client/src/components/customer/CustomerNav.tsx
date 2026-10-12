import { useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from '../ui';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';

type Tab = 'explore' | 'appointments' | 'notifications';

const PATHS: Record<Tab, string> = { explore: '/app', appointments: '/my-appointments', notifications: '/my-notifications' };

/** Müşteri ekranlarının alt menüsü: Keşfet · Randevularım · Bildirimler. */
export default function CustomerNav() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const unread = useUnreadNotifications();
    const active: Tab = pathname.startsWith('/my-appointments') ? 'appointments' : pathname.startsWith('/my-notifications') ? 'notifications' : 'explore';

    return (
        <BottomNav<Tab>
            active={active}
            onChange={tab => navigate(PATHS[tab])}
            items={[
                { key: 'explore', label: 'Keşfet', icon: '🔍' },
                { key: 'appointments', label: 'Randevularım', icon: '📅' },
                { key: 'notifications', label: 'Bildirimler', icon: '🔔', badge: unread },
            ]}
        />
    );
}
