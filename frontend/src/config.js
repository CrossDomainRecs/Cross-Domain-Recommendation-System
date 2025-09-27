// src/config.js for frontend
// Usage: import config from './config';

const config = {
  CLIENT_URL: process.env.REACT_APP_CLIENT_URL || 'http://localhost:3000',
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
};

export default config;
