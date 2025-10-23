import { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      
      // ✅ FIXED: Handle backend response structure
      if (response.data.success && response.data.data) {
        setUser(response.data.data.user);
        return response;
      } else {
        throw new Error(response.data.error?.message || 'Login failed');
      }
    } catch (error) {
      // ✅ FIXED: Better error handling
      console.error('Login error:', error);
      
      // Extract error message from different possible structures
      const errorMessage = 
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'Login failed. Please try again.';
      
      throw { error: { message: errorMessage } };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await authService.register(username, email, password);
      
      // ✅ FIXED: Handle backend response structure
      if (response.data.success && response.data.data) {
        setUser(response.data.data.user);
        return response;
      } else {
        throw new Error(response.data.error?.message || 'Registration failed');
      }
    } catch (error) {
      // ✅ FIXED: Better error handling
      console.error('Registration error:', error);
      
      const errorMessage = 
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'Registration failed. Please try again.';
      
      throw { error: { message: errorMessage } };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};