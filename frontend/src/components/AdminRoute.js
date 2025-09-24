import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

function AdminRoute({ children }) {
  const isAuthenticated = authService.isAuthenticated();
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  if (!isAuthenticated) {
    // Redirect to admin login if not authenticated
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin) {
    // Redirect to regular dashboard if not an admin
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default AdminRoute;