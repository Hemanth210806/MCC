import axios from 'axios';

// Determine API base:
// When running locally on port 5000, 5173, localhost, or 127.0.0.1, always target local backend.
const getApiBase = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000/api';
  const { hostname, port, origin } = window.location;
  
  // If served directly by backend on port 5000 (whether localhost or 127.0.0.1)
  if (port === '5000') {
    return `${origin}/api`;
  }
  
  // If on local Vite dev server (e.g. port 5173, 3000)
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname.startsWith('192.168.') || hostname.startsWith('10.');
  if (isLocalHost) {
    return 'http://localhost:5000/api';
  }
  
  // Production fallback
  return '/api';
};

export const API_BASE = getApiBase();

const api = axios.create({
  baseURL: API_BASE,
  timeout: 180000,
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
