import React, { useState } from 'react';
import authService from '../services/authService';
import './Login.css'; // We'll reuse the login styling

function AdminLogin() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      console.log('Attempting admin login...');
      const data = await authService.adminLogin(formData.email, formData.password);
      console.log('Login response:', data);
      
      if (data.user.role !== 'admin') {
        throw new Error('Not authorized as admin');
      }

      // Store the token and admin status
      localStorage.setItem('token', data.token);
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('username', data.user.username);
      
      console.log('Admin login successful, redirecting...');
      // Navigate to admin dashboard
      window.location.href = '/admin/dashboard';
    } catch (error) {
      console.error('Admin login error:', error);
      setError(error.message || 'Invalid admin credentials');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Admin Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit">Login as Admin</button>
          <p className="auth-switch">
            <a href="/login">Regular User Login</a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;