import axios from 'axios';

// Determine API base:
// 1. If running on same origin as backend (e.g. Render unified app), use relative '/api'
// 2. Otherwise (e.g. Vercel deployment), use environment variable VITE_API_BASE_URL
const isSameOriginBackend = typeof window !== 'undefined' && 
  (window.location.hostname.includes('onrender.com') || window.location.hostname === 'localhost' && window.location.port === '5000');

export const API_BASE = isSameOriginBackend 
  ? '/api' 
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Inject JWT token into requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mcc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle auth expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (localStorage.getItem('mcc_token') && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('mcc_token');
        localStorage.removeItem('mcc_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
