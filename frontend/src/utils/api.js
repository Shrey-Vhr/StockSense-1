import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Basic Auth token
api.interceptors.request.use(
  (config) => {
    const username = import.meta.env.VITE_APP_USERNAME;
    const password = import.meta.env.VITE_APP_PASSWORD;
    
    if (username && password) {
      const base64Credentials = btoa(`${username}:${password}`);
      config.headers.Authorization = `Basic ${base64Credentials}`;
    }
    
    // Also attach JWT if still used by some legacy endpoints
    const token = localStorage.getItem('token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Auto logout if 401 response returned from API
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // We can trigger a custom event that useAuth can listen to, or simply reload/redirect.
      window.dispatchEvent(new Event('auth-unauthorized'));
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
