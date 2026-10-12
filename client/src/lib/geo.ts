import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export interface LatLng {
    lat: number;
    lng: number;
}

/** Kullanıcının konumu; izin verilmezse veya alınamazsa `null`. */
export const getPosition = async (timeout = 8000): Promise<LatLng | null> => {
    try {
        if (Capacitor.isNativePlatform()) {
            const perm = await Geolocation.checkPermissions();
            if (perm.location !== 'granted' && (await Geolocation.requestPermissions()).location !== 'granted') return null;
        }
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout });
        return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
        return null;
    }
};

/** Konum izni daha önce verilmiş mi? İzin penceresi açmadan kontrol eder. */
export const hasLocationPermission = async (): Promise<boolean> => {
    try {
        if (Capacitor.isNativePlatform()) return (await Geolocation.checkPermissions()).location === 'granted';
        if (!navigator.permissions) return false;
        return (await navigator.permissions.query({ name: 'geolocation' })).state === 'granted';
    } catch {
        return false;
    }
};

const coordsOf = (place: { latitude?: number | string | null; longitude?: number | string | null }) => {
    const lat = Number(place.latitude);
    const lng = Number(place.longitude);
    return lat && lng && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

/** Cihazın kendi harita uygulamasında yol tarifi açan bağlantı. */
export const directionsUrl = (place: {
    name: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
    address_line?: string | null;
    district?: string | null;
    city?: string | null;
}) => {
    const coords = coordsOf(place);
    const query = coords ? `${coords.lat},${coords.lng}` : [place.name, place.address_line, place.district, place.city].filter(Boolean).join(' ');
    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
        return coords ? `geo:${query}?q=${query}(${encodeURIComponent(place.name)})` : `geo:0,0?q=${encodeURIComponent(query)}`;
    }
    if (platform === 'ios') return `maps://?daddr=${encodeURIComponent(query)}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
};

export const formatDistance = (km?: number | null) => {
    if (km === null || km === undefined || !Number.isFinite(km)) return null;
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`;
};
