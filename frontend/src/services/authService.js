const API_URL = 'http://localhost:5000/api';

export const authService = {
  login: async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Login failed');
      }
      
      return data.data;
    } catch (error) {
      throw error;
    }
  },

  register: async (username, email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
          preferences: {
            genres: [],
            domains: ['movies']
          }
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Registration failed');
      }
      
      return data.data;
    } catch (error) {
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
  },

  getToken: () => {
    return localStorage.getItem('token');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};

export default authService;