import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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
