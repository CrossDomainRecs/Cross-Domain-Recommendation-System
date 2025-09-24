import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

function ProtectedRoute({ children, adminOnly = false }) {
  const isAuthenticated = authService.isAuthenticated();
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  if (!isAuthenticated) {
    // Redirect to appropriate login page
    return <Navigate to={adminOnly ? "/admin/login" : "/login"} replace />;
  }

  // Redirect admin to admin dashboard
  if (isAdmin && !adminOnly && window.location.pathname !== '/admin/dashboard') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Redirect non-admin users to regular dashboard
  if (!isAdmin && adminOnly) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;