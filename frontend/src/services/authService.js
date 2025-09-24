const API_URL = 'http://localhost:5000/api';

export const authService = {
  getAuthHeaders: () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }),

  getAllUsers: async () => {
    try {
      const response = await fetch(`${API_URL}/auth/users`, {
        headers: authService.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('UNAUTHORIZED');
        }
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch users');
      }

      return data.data.users;
    } catch (error) {
      throw error;
    }
  },

  updateUser: async (userId, updates) => {
    try {
      const response = await fetch(`${API_URL}/auth/users/${userId}`, {
        method: 'PUT',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('UNAUTHORIZED');
        }
        throw new Error('Failed to update user');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to update user');
      }

      return data.data.user;
    } catch (error) {
      throw error;
    }
  },

  deleteUser: async (userId) => {
    try {
      const response = await fetch(`${API_URL}/auth/users/${userId}`, {
        method: 'DELETE',
        headers: authService.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('UNAUTHORIZED');
        }
        throw new Error('Failed to delete user');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to delete user');
      }

      return true;
    } catch (error) {
      throw error;
    }
  },

  adminLogin: async (email, password) => {
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

      if (data.data.user.role !== 'admin') {
        throw new Error('Not authorized as admin');
      }
      
      return data.data;
    } catch (error) {
      throw error;
    }
  },

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