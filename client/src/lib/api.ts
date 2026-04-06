import axios from 'axios';

const isProduction = import.meta.env.PROD;
const baseUrl = isProduction 
  ? 'https://ekuafor-production-344a.up.railway.app/api'
  : 'http://localhost:3000/api';

const api = axios.create({
    baseURL: baseUrl,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 30000 // 30 seconds timeout for stability
});

// Request interceptor to add the auth token
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

// Response interceptor to handle token expiry
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user_data');
            // Allow redirecting to login if necessary
            // window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default api;
