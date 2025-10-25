import axios from 'axios';

// ✅ Node.js backend (main API)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:10000',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // ✅ Prevent ngrok browser warnings
  },
  timeout: 30000,
  withCredentials: true, // ✅ Allow cookies/sessions
});

// ✅ Flask ML backend
const mlApi = axios.create({
  baseURL: import.meta.env.VITE_ML_API_URL || 'http://localhost:5001',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // ✅ Prevent ngrok browser warnings
  },
  timeout: 30000,
});

// ✅ Request interceptor - Add auth token
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

  // ✅ Response interceptor - Handle errors and 401s
  instance.interceptors.response.use(
    (response) => {
      console.log('✅ API Response:', response.config.url, response.status);
      return response;
    },
    (error) => {
      console.error('❌ API Error:', error.response?.status, error.response?.data);

      // Handle token expiration or invalid token
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

// Attach interceptors to both instances
attachInterceptors(api);
attachInterceptors(mlApi);

// ✅ Export both APIs
export { api, mlApi };
export default api;
