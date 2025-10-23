import api from './api';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';

export const authService = {
  // Register with email/password
  register: async (username, email, password) => {
    const response = await api.post('/api/auth/register', {
      username,
      email,
      password,
    });
    
    // ✅ FIXED: Correct path to token and user
    if (response.data.success && response.data.data) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    
    return response;
  },

  // Login with email/password
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', {
      email,
      password,
    });
    
    // ✅ FIXED: Correct path to token and user
    if (response.data.success && response.data.data) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    
    return response;
  },

  // Google OAuth login
  loginWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Send Google user data to backend
      const response = await api.post('/api/auth/google', {
        email: user.email,
        username: user.displayName,
        googleId: user.uid,
        photoURL: user.photoURL
      });
      
      // ✅ FIXED: Correct path to token and user
      if (response.data.success && response.data.data) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Logout
  logout: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Firebase signout error:', error);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  },

  // Get current user
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Check if authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Get profile
  getProfile: async () => {
    const response = await api.get('/api/auth/profile');
    // ✅ FIXED: Return the actual user data
    return response.data.success ? response.data.data : null;
  },

  // Update profile
  updateProfile: async (data) => {
    const response = await api.put('/api/auth/profile', data);
    
    // ✅ FIXED: Correct path to user data
    if (response.data.success && response.data.data) {
      localStorage.setItem('user', JSON.stringify(response.data.data));
    }
    
    return response;
  },
};