import { Device } from '@capacitor/device';
import { storage, StorageKey } from './storage';

const createWebId = (): string => {
    const existing = storage.get(StorageKey.webDeviceId);
    if (existing) return existing;
    const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
        : Math.random().toString(36).slice(2, 12);
    const id = `WEB-${random.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    storage.set(StorageKey.webDeviceId, id);
    return id;
};

/**
 * Misafir müşterinin randevularını bu cihazla eşleştiren kimlik.
 * Rezervasyon, "Randevularım" ve puanlama aynı değeri göndermeli; bu yüzden ilk üretilen değer saklanır.
 */
export const getDeviceId = async (): Promise<string> => {
    const stored = storage.get(StorageKey.deviceId);
    if (stored && stored !== 'unknown' && stored !== 'web-browser') return stored;
    let id: string;
    try {
        id = (window as any).Capacitor?.isNativePlatform() ? (await Device.getId()).identifier : createWebId();
    } catch {
        id = createWebId();
    }
    storage.set(StorageKey.deviceId, id);
    return id;
};
