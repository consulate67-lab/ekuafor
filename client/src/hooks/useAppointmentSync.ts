import { useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Device } from '@capacitor/device';

// Unique device fingerprint generator for web browsers (persistent across sessions)
const getOrCreateWebFingerprint = (): string => {
    const KEY = 'ekuafor_device_fingerprint';
    let fp = localStorage.getItem(KEY);
    if (fp) return fp;

    const nav = window.navigator;
    const screen = window.screen;
    const raw = [
        nav.userAgent,
        nav.language,
        screen.width,
        screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        Math.random().toString(36).substring(2, 10),
        Date.now().toString(36)
    ].join('|');

    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        const char = raw.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    fp = 'WEB-' + Math.abs(hash).toString(36).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    localStorage.setItem(KEY, fp);
    return fp;
};

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
                body: `${app.service_name || 'Randevunuz'} ${statusLabel}. Saati: ${app.start_time?.substring(0, 5)}`,
                icon: '/ekuafor/favicon.ico'
            });
        }
    }, []);

    const syncAppointments = useCallback(async () => {
        const localIds = JSON.parse(localStorage.getItem('my_appointment_ids') || '[]');
        const phone = localStorage.getItem('customer_phone');
        const deviceId = localStorage.getItem('device_id');

        if (localIds.length === 0 && !phone && !deviceId) return;

        try {
            let myApps = [];

            if (deviceId) {
                const res = await api.get('/appointments', { params: { device_id: deviceId } });
                myApps = res.data?.data || [];
            } else if (localIds.length > 0) {
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
                window.dispatchEvent(new CustomEvent('appointment-status-changed'));
            } else {
                localStorage.setItem('appointment_statuses', JSON.stringify(savedStatuses));
            }
        } catch (err) {
            console.error('[Sync] Failed to sync appointments:', err);
        }
    }, [notifyStatusChange]);

    useEffect(() => {
        const initDevice = async () => {
            let id = localStorage.getItem('device_id');
            if (!id) {
                try {
                    const isNative = (window as any).Capacitor?.isNativePlatform();
                    if (isNative) {
                        const info = await Device.getId();
                        id = info.identifier;
                    } else {
                        id = getOrCreateWebFingerprint();
                    }
                } catch (e) {
                    id = getOrCreateWebFingerprint();
                }
                localStorage.setItem('device_id', id || 'unknown');
            }
        };

        initDevice().then(() => {
            syncAppointments();
        });

        const interval = setInterval(syncAppointments, 30000);

        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        return () => clearInterval(interval);
    }, [syncAppointments]);
}
