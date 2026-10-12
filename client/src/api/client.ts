import axios from 'axios';
import { storage, StorageKey } from '../lib/storage';

const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.PROD
    ? 'https://web-production-db847.up.railway.app/api'
    : 'http://localhost:3000/api');

/**
 * Tüm sunucu çağrıları bu istemciden geçer. Sayfalar doğrudan değil `api/` modülleri üzerinden çağırır;
 * offline aşamasında yalnızca bu katman değişecek.
 */
const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
});

client.interceptors.request.use(config => {
    const token = storage.get(StorageKey.token);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    const boardKey = storage.get(StorageKey.boardKey);
    if (boardKey) config.headers['X-Board-Key'] = boardKey;
    return config;
});

client.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) storage.remove(StorageKey.token, StorageKey.user);
        return Promise.reject(error);
    }
);

/** Sunucunun `{ error }` mesajını, yoksa verilen yedek metni döner. */
export const apiError = (err: unknown, fallback: string): string => {
    const data = (err as any)?.response?.data;
    return data?.error || data?.message || fallback;
};

/** `{ success, data }` zarfını açar. */
export const unwrap = <T>(response: { data: any }): T => response.data?.data ?? response.data;

export default client;
