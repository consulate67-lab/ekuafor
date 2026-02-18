import axios from 'axios';

let baseUrl = import.meta.env.VITE_API_URL;

// Akıllı Otomatik Bağlantı: Neredeyiz?
const isGitHubPages = window.location.hostname.includes('github.io');
const isMobile = window.location.protocol === 'capacitor:' || window.location.hostname === 'localhost' && !isGitHubPages;

if (!baseUrl) {
    if (isGitHubPages || isMobile) {
        // Canlıda veya Mobilde üretim sunucusunu kullan
        baseUrl = 'https://web-production-db847.up.railway.app/api';
    } else {
        // Sadece yerel geliştirmede localhost
        baseUrl = 'http://localhost:3000/api';
    }
}

// Debug logging
console.log('--- Saloon API Connection ---');
console.log('Hostname:', window.location.hostname);
console.log('Target API:', baseUrl);
console.log('-----------------------------');

console.log('Final API BaseUrl:', baseUrl);
console.log('-------------------------');

// MOCK SERVER ENTEGRASYONU (Tarayıcı Veritabanı)
// Sunucu hatalarından kurtulmak için tarayıcı içi veritabanı kullanımı.
import { mockAdapter } from './mock-server';

// Mock Sunucuyu Devreye Al (Her zaman veya sadece canlıda)
const USE_MOCK_SERVER = false; // GERÇEK VERİTABANI AKTİF

const api = axios.create({
    baseURL: baseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds timeout for Railway cold starts
});

// Configure retry delay
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Request interceptor - token ekle ve MOCK YÖNLENDİRME
api.interceptors.request.use(
    async (config) => {
        // Token ekle
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // MOCK SERVER KONTROLÜ
        if (USE_MOCK_SERVER) {
            console.log('⚡ Mock Server İsteği:', config.url);

            // Sadece desteklenen rotaları mockla, diğerleri (örn dış api) geçsin
            const mockedRoutes = ['/auth', '/services', '/users', '/companies', '/appointments', '/sms'];
            if (mockedRoutes.some(r => config.url?.includes(r))) {
                config.adapter = async (cfg) => {
                    try {
                        const response = await mockAdapter({
                            method: cfg.method!,
                            url: cfg.url!,
                            data: cfg.data,
                            headers: cfg.headers
                        });


                        const axiosResponse = {
                            data: response.data,
                            status: response.status || 200,
                            statusText: response.status === 200 ? 'OK' : 'Error',
                            headers: {},
                            config: cfg,
                            request: {}
                        };

                        // Manually reject if status involves error (Axios validateStatus logic simulation)
                        if (response.status >= 300) {
                            return Promise.reject({
                                message: 'Request failed with status code ' + response.status,
                                name: 'AxiosError',
                                code: 'ERR_BAD_REQUEST',
                                config: cfg,
                                request: {},
                                response: axiosResponse
                            });
                        }

                        return axiosResponse;
                    } catch (err: any) {
                        return Promise.reject({
                            response: {
                                data: err.response?.data || { error: 'Mock Server Error' },
                                status: err.response?.status || 500,
                                statusText: 'Internal Server Error',
                                headers: {},
                                config: cfg
                            }
                        });
                    }
                };
            }
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - hata yönetimi ve RETRY (Yeniden Deneme)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;

        // Retry logic for Network Errors or 503 (Service Unavailable/Starting)
        // Skip if it's already a retry or if it's a specific auth error
        if (!config || config.__isRetryRequest || error.response?.status === 401) {
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                const basename = import.meta.env.BASE_URL || '/';
                window.location.href = `${basename}login`.replace(/\/+/g, '/');
            }
            return Promise.reject(error);
        }

        // Initialize retry count
        config.__retryCount = config.__retryCount || 0;

        // Check if we should retry (Max 3 retries)
        if (config.__retryCount < 3 && (!error.response || error.response.status >= 500)) {
            config.__retryCount += 1;
            config.__isRetryRequest = true; // Mark as retry to avoid infinite loop logic if needed, though count handles it

            // Exponential backoff: 1s, 2s, 4s
            const delay = 1000 * Math.pow(2, config.__retryCount - 1);
            console.log(`Retrying request... Attempt ${config.__retryCount} after ${delay}ms`);

            await wait(delay);
            return api(config);
        }

        return Promise.reject(error);
    }
);

export default api;
