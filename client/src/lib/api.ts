import axios from 'axios';

let baseUrl = import.meta.env.VITE_API_URL;

// Akıllı Otomatik Bağlantı: Canlıda mıyız?
if (!baseUrl && window.location.hostname.includes('github.io')) {
    baseUrl = 'https://ekuafor-backend.onrender.com/api';
}

// Varsayılan (Yerel) Değer
baseUrl = baseUrl || 'http://localhost:3000/api';

// Debug logging
console.log('--- Saloon API Connection ---');
console.log('Hostname:', window.location.hostname);
console.log('Target API:', baseUrl);
console.log('-----------------------------');

console.log('Final API BaseUrl:', baseUrl);
console.log('-------------------------');

const api = axios.create({
    baseURL: baseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - token ekle
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - hata yönetimi
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            const basename = import.meta.env.BASE_URL || '/';
            window.location.href = `${basename}login`.replace(/\/+/g, '/');
        }
        return Promise.reject(error);
    }
);

export default api;
