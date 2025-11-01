import axios from 'axios';

// ============================================
// API CONFIGURATION - LOCALHOST FOR DEVELOPMENT
// ============================================

// Determine if we're in development (localhost)
const isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';

// Node.js Backend (Auth, Users, MongoDB)
const api = axios.create({
  baseURL: isDevelopment 
    ? 'http://localhost:5000'
    : (import.meta.env.VITE_API_URL || 'https://reclab-backend-dawg.onrender.com'),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true,
});

// ML API with Models - Python Flask (GNN, DRL, Recommendations)
const mlApi = axios.create({
  baseURL: isDevelopment
    ? 'http://localhost:5001'
    : (import.meta.env.VITE_ML_API_URL || 'https://reclab-api.onrender.com'),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ============================================
// INTERCEPTORS - Request/Response Handling
// ============================================

const attachInterceptors = (instance, apiName = 'API') => {
  // Request Interceptor - Add auth token to every request
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log(`🚀 [${apiName}] ${config.method.toUpperCase()} → ${config.url}`);
      return config;
    },
    (error) => {
      console.error(`❌ [${apiName}] Request Error:`, error.message);
      return Promise.reject(error);
    }
  );

  // Response Interceptor - Handle responses and errors
  instance.interceptors.response.use(
    (response) => {
      console.log(`✅ [${apiName}] Response: ${response.status} ${response.config.url}`);
      return response;
    },
    (error) => {
      const status = error.response?.status;
      const errorCode = error.response?.data?.error?.code;
      const errorMessage = error.response?.data?.error?.message || error.message;

      console.error(`❌ [${apiName}] Error ${status}:`, errorMessage);

      // Handle 401 - Token Expired or Invalid
      if (status === 401) {
        if (errorCode === 'TOKEN_EXPIRED' || errorCode === 'INVALID_TOKEN' || errorCode === 'AUTH_REQUIRED') {
          console.warn('🔐 Authentication Failed - Logging out...');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
            window.location.href = '/login?reason=session_expired';
          }
        }
      }

      // Handle 403 - Forbidden
      if (status === 403) {
        console.warn('🚫 Access Denied - You do not have permission');
      }

      // Handle 500 - Server Error
      if (status === 500) {
        console.error('🔥 Server Error - Please try again later');
      }

      return Promise.reject(error);
    }
  );
};

// Attach interceptors to both instances
attachInterceptors(api, 'Backend');
attachInterceptors(mlApi, 'ML-API');

// ============================================
// EXPORTS
// ============================================

export { api, mlApi };
export default api;
