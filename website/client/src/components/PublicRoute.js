import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PublicRoute({ children }) {
  const { isAuthenticated, isGuest, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  // Fully logged-in user → send them home (or back where they came from)
  if (isAuthenticated && !isGuest) {
    const destination = location.state?.from?.pathname || '/';
    return <Navigate to={destination} replace />;
  }

  // Guest was blocked by a protected page → stay on login to prompt sign-in
  // (don't redirect them back, just show the login form)

  return children;
}
