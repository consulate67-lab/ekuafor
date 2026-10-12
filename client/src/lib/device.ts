import { Device } from '@capacitor/device';

const DEVICE_KEY = 'device_id';
const FINGERPRINT_KEY = 'ekuafor_device_fingerprint';

const createWebId = (): string => {
    const existing = localStorage.getItem(FINGERPRINT_KEY);
    if (existing) return existing;
    const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
        : Math.random().toString(36).slice(2, 12);
    const id = `WEB-${random.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    localStorage.setItem(FINGERPRINT_KEY, id);
    return id;
};

/**
 * Misafir müşterinin randevularını bu cihazla eşleştiren kimlik.
 * Rezervasyon, "Randevularım" ve puanlama aynı değeri göndermeli; bu yüzden ilk üretilen değer saklanır.
 */
export const getDeviceId = async (): Promise<string> => {
    const stored = localStorage.getItem(DEVICE_KEY);
    if (stored && stored !== 'unknown' && stored !== 'web-browser') return stored;
    let id: string;
    try {
        id = (window as any).Capacitor?.isNativePlatform() ? (await Device.getId()).identifier : createWebId();
    } catch {
        id = createWebId();
    }
    localStorage.setItem(DEVICE_KEY, id);
    return id;
};
