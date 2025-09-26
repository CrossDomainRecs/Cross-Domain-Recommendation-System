import React, { useState } from 'react';
import authService from '../services/authService';
import './Login.css'; // We'll use the same styling as Login

function SignUp() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setError('Password must contain at least one lowercase letter, one uppercase letter, and one number');
      return false;
    }
    if (formData.username.length < 3 || formData.username.length > 20) {
      setError('Username must be between 3 and 20 characters');
      return false;
    }
    if (!/^[a-zA-Z0-9]+$/.test(formData.username)) {
      setError('Username must contain only letters and numbers');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const data = await authService.register(
        formData.username,
        formData.email,
        formData.password
      );
      
  // Store the token and user info
  localStorage.setItem('token', data.token);
  localStorage.setItem('username', data.user.username);
  // Navigate to genre selection page
  window.location.href = '/genre-selection';
    } catch (error) {
      setError(error.message || 'Registration failed');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Sign Up</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              minLength="3"
              maxLength="20"
              pattern="[a-zA-Z0-9]+"
            />
          </div>
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
              minLength="8"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit">Sign Up</button>
          <p className="auth-switch">
            Already have an account? <span onClick={() => window.history.back()}>Login</span>
          </p>
        </form>
      </div>
    </div>
  );
}

export default SignUp;