/** Uygulamanın localStorage anahtarları tek yerde; yeni anahtar buraya eklenir. */
export const StorageKey = {
    token: 'token',
    user: 'user_data',
    deviceId: 'device_id',
    webDeviceId: 'web_device_id',
    pushToken: 'push_token',
    customerPhone: 'customer_phone',
    myAppointmentIds: 'my_appointment_ids',
    appointmentStatuses: 'appointment_statuses',
    readNotificationsCount: 'read_notifications_count',
    favorites: 'saloon_favorites',
    boardKey: 'board_key',
    boardCompanyId: 'board_company_id',
    staffBoardCode: 'staff_board_code',
    mainReportsKey: 'main_reports_key',
    geoProvinces: 'geo_provinces',
} as const;

export type StorageKeyName = typeof StorageKey[keyof typeof StorageKey];

const RENAMED: Record<string, StorageKeyName> = {
    salon_board_key: StorageKey.boardKey,
    salon_board_company_id: StorageKey.boardCompanyId,
    ekuafor_device_fingerprint: StorageKey.webDeviceId,
};

const OBSOLETE = ['main_company_auth', 'pending_booking', 'company_admin_key'];

/** Eski sürümlerden kalan anahtarları yeni adlarına taşır; değer kaybolmaz. Açılışta bir kez çağrılır. */
export const migrateStorageKeys = () => {
    try {
        for (const [oldKey, newKey] of Object.entries(RENAMED)) {
            const value = localStorage.getItem(oldKey);
            if (value === null) continue;
            if (localStorage.getItem(newKey) === null) localStorage.setItem(newKey, value);
            localStorage.removeItem(oldKey);
        }
        OBSOLETE.forEach(key => localStorage.removeItem(key));
    } catch {
        /* localStorage kapalıysa (gizli mod vb.) uygulama yine açılmalı */
    }
};

export const storage = {
    get: (key: StorageKeyName) => localStorage.getItem(key),
    set: (key: StorageKeyName, value: string) => localStorage.setItem(key, value),
    remove: (...keys: StorageKeyName[]) => keys.forEach(key => localStorage.removeItem(key)),
    getJson<T>(key: StorageKeyName, fallback: T): T {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? fallback : (JSON.parse(raw) as T);
        } catch {
            return fallback;
        }
    },
    setJson: (key: StorageKeyName, value: unknown) => localStorage.setItem(key, JSON.stringify(value)),
};
