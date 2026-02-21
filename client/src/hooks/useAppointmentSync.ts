import { useEffect, useCallback } from 'react';
import api from '../lib/api';

export function useAppointmentSync() {
    const notifyStatusChange = useCallback((app: any) => {
        if (!("Notification" in window)) return;

        const statusLabels: Record<string, string> = {
            'approved': 'ONAYLANDI ✅',
            'cancelled': 'REDDEDİLDİ 🚫',
            'completed': 'TAMAMLANDI 🏁'
        };

        const statusLabel = statusLabels[app.status] || app.status;

        if (Notification.permission === "granted") {
            new Notification(`${app.company_name || 'Saloon'} Randevu Durumu`, {
                body: `${app.service_name} randevunuz ${statusLabel}. Saati: ${app.start_time.substring(0, 5)}`,
                icon: '/ekuafor/favicon.ico'
            });
        }
    }, []);

    const syncAppointments = useCallback(async () => {
        const localIds = JSON.parse(localStorage.getItem('my_appointment_ids') || '[]');
        const phone = localStorage.getItem('customer_phone');

        if (localIds.length === 0 && !phone) return;

        try {
            let myApps = [];

            if (localIds.length > 0) {
                const res = await api.get('/appointments', { params: { ids: localIds.join(',') } });
                myApps = res.data?.data || [];
            } else if (phone) {
                const res = await api.get('/appointments', { params: { customer_phone: phone } });
                myApps = res.data?.data || [];
            }

            if (myApps.length === 0) return;

            // Status Change Check
            const savedStatuses = JSON.parse(localStorage.getItem('appointment_statuses') || '{}');
            let hasChange = false;

            myApps.forEach((app: any) => {
                const prevStatus = savedStatuses[app.id];
                if (prevStatus && prevStatus !== app.status) {
                    notifyStatusChange(app);
                    hasChange = true;
                }
                savedStatuses[app.id] = app.status;
            });

            if (hasChange) {
                localStorage.setItem('appointment_statuses', JSON.stringify(savedStatuses));
                // Dispatch a custom event so MyAppointments.tsx can refresh if open
                window.dispatchEvent(new CustomEvent('appointment-status-changed'));
            } else {
                // Always save to stay in sync if it's the first time
                localStorage.setItem('appointment_statuses', JSON.stringify(savedStatuses));
            }
        } catch (err) {
            console.error('[Sync] Failed to sync appointments:', err);
        }
    }, [notifyStatusChange]);

    useEffect(() => {
        // Initial sync
        syncAppointments();

        // Background poll every 30 seconds for a "live" feel
        const interval = setInterval(syncAppointments, 30000);

        // Request notification permission
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        return () => clearInterval(interval);
    }, [syncAppointments]);
}
