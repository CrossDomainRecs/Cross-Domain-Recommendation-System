import axios from 'axios';

// Production URLs
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://reclab-backend.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true,
});

// NEW ML API with models
const mlApi = axios.create({
  baseURL: import.meta.env.VITE_ML_API_URL || 'https://reclab-api.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - Add auth token
const attachInterceptors = (instance) => {
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log('🚀 API Request:', config.method.toUpperCase(), config.url);
      return config;
    },
    (error) => {
      console.error('❌ Request error:', error);
      return Promise.reject(error);
    }
  );

  instance.interceptors.response.use(
    (response) => {
      console.log('✅ API Response:', response.config.url, response.status);
      return response;
    },
    (error) => {
      console.error('❌ API Error:', error.response?.status, error.response?.data);
      if (error.response?.status === 401) {
        const errorCode = error.response.data?.error?.code;
        if (errorCode === 'TOKEN_EXPIRED' || errorCode === 'INVALID_TOKEN') {
          console.warn('🔐 Token invalid/expired, logging out...');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }
      return Promise.reject(error);
    }
  );
};

attachInterceptors(api);
attachInterceptors(mlApi);

export { api, mlApi };
export default api;
