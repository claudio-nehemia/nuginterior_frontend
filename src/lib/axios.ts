import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Dynamically resolve API_BASE_URL for images and uploads.
// If local dev: http://localhost:8080/api -> http://localhost:8080
// If production: /api -> "" (relative paths)
export const API_BASE_URL = apiUrl.endsWith('/api') 
  ? apiUrl.slice(0, -4) 
  : (apiUrl.startsWith('http') ? apiUrl : '');

export const api = axios.create({
  baseURL: apiUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const companyFilter = localStorage.getItem('company_filter');
  if (companyFilter) {
    config.headers['X-Company-Filter'] = companyFilter;
  }
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, logout user
      localStorage.removeItem('token');
      // Using window.location to force a full reload and state reset
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
