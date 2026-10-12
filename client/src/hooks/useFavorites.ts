import { useCallback, useEffect, useState } from 'react';
import { storage, StorageKey } from '../lib/storage';

const CHANGED = 'favorites_changed';

const read = () => storage.getJson<number[]>(StorageKey.favorites, []).filter(id => Number.isInteger(id));

/** Favori firma ID'leri (cihazda saklanır); açık tüm ekranlar aynı listeyi görür. */
export function useFavorites() {
    const [ids, setIds] = useState<number[]>(read);

    useEffect(() => {
        const sync = () => setIds(read());
        window.addEventListener(CHANGED, sync);
        return () => window.removeEventListener(CHANGED, sync);
    }, []);

    const toggle = useCallback((id: number) => {
        const current = read();
        const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
        storage.setJson(StorageKey.favorites, next);
        window.dispatchEvent(new Event(CHANGED));
    }, []);

    return { ids, isFavorite: (id: number) => ids.includes(id), toggle };
}
