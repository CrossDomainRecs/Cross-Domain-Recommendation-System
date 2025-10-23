import api from './api';

const userService = {
  // Get current user profile
  getProfile: async () => {
    const response = await api.get('/api/users/profile');
    return response.data.data;
  },

  // Update user profile
  updateProfile: async (updates) => {
    const response = await api.put('/api/users/profile', updates);
    
    // Update localStorage to keep in sync
    if (response.data.success && response.data.data) {
      localStorage.setItem('user', JSON.stringify(response.data.data));
    }
    
    return response.data.data;
  },

  // Upload profile picture
  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('profilePicture', file);

    const response = await api.post('/api/users/profile/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.data.profilePicture;
  },

  // Delete account
  deleteAccount: async () => {
    const response = await api.delete('/api/users/profile');
    return response.data;
  },

  // Update password
  updatePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/api/users/profile', {
      currentPassword,
      password: newPassword,
    });
    return response.data;
  },
};

export default userService;