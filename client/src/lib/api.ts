import axios from 'axios';

let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// URL sonundaki /api kontrolü ve düzeltmesi
if (!baseUrl.endsWith('/api') && !baseUrl.endsWith('/api/')) {
    baseUrl = baseUrl.endsWith('/') ? `${baseUrl}api` : `${baseUrl}/api`;
}

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
