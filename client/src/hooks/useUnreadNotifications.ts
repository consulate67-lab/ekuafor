import { useEffect, useState } from 'react';
import api from '../api/client';
import { storage, StorageKey } from '../lib/storage';
import { useAuthStore } from '../store/authStore';

export const NOTIFICATIONS_READ = 'notifications_read';

/** Müşterinin okunmamış bildirim sayısı (telefon numarasıyla eşleşen bildirimler). */
export function useUnreadNotifications() {
    const phone = useAuthStore(s => s.user?.phone) || storage.get(StorageKey.customerPhone);
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        if (!phone) return;
        let cancelled = false;
        api.get('/appointments/customers/notifications', { params: { phone } })
            .then(res => {
                if (cancelled) return;
                const total = res.data.data?.length || 0;
                const read = Number(storage.get(StorageKey.readNotificationsCount) || 0);
                setUnread(Math.max(0, total - read));
            })
            .catch(() => {});
        const clear = () => setUnread(0);
        window.addEventListener(NOTIFICATIONS_READ, clear);
        return () => {
            cancelled = true;
            window.removeEventListener(NOTIFICATIONS_READ, clear);
        };
    }, [phone]);

    return unread;
}
