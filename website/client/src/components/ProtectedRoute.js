import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute
 * - guestAllowed={true}  → guests CAN view this page (Dashboard only)
 * - guestAllowed={false} → guests are redirected to /login (default)
 */
export default function ProtectedRoute({ children, guestAllowed = false }) {
  const { user, isGuest, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#f5ede0', gap: 16,
      }}>
        <span style={{ fontSize: 48 }}>🌿</span>
        <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#5a4030', fontSize: 15 }}>
          Loading AgriTechPro…
        </p>
      </div>
    );
  }

  // Not logged in AND not a guest → always redirect to login
  if (!user && !isGuest) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Guest trying to access a page that doesn't allow guests
  if (!user && isGuest && !guestAllowed) {
    return <Navigate to="/login" state={{ from: location, guestBlocked: true }} replace />;
  }

  return children;
}
