import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const NAV = [
  { to: '/', icon: 'D', label: 'Dashboard', exact: true, guestOk: true },
  { to: '/analytics', icon: 'A', label: 'Analytics', guestOk: false },
  { to: '/sensors', icon: 'S', label: 'Sensors', guestOk: false },
  { to: '/alerts', icon: '!', label: 'Alerts', guestOk: false },
];

export default function Layout() {
  const { user, isGuest, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <div className="mobile-topbar">
        <div className="mobile-logo">
          <span className="mobile-logo-icon">AF</span>
          <span className="mobile-logo-text">AgriTech<em>Pro</em></span>
        </div>
        <button className="hamburger" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle menu">
          {mobileOpen ? 'X' : '='}
        </button>
      </div>

      <div className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`} onClick={() => setMobileOpen(false)} />

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">AF</span>
            {!collapsed && <span className="logo-text">AgriTech<em>Pro</em></span>}
          </div>
          <button className="collapse-btn" onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? '>' : '<'}
          </button>
        </div>

        <div className="sidebar-status">
          <span className="pulse" />
          {!collapsed && <span className="status-text">Live Monitoring</span>}
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ to, icon, label, exact, guestOk }) => {
            const locked = isGuest && !guestOk;

            return (
              <NavLink
                key={to}
                to={locked ? '/login' : to}
                end={exact}
                state={locked ? { guestBlocked: true, from: { pathname: to } } : undefined}
                className={({ isActive }) =>
                  `nav-item ${isActive && !locked ? 'active' : ''} ${locked ? 'nav-locked' : ''}`
                }
                title={collapsed ? (locked ? `${label} - Sign in required` : label) : ''}
              >
                <span className="nav-icon">{icon}</span>
                {!collapsed && (
                  <>
                    <span className="nav-label">{label}</span>
                    {locked && <span className="nav-lock-badge">Lock</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {isGuest && !collapsed && (
            <div className="guest-badge">
              <span className="guest-icon">G</span>
              <div>
                <div className="guest-name">Guest User</div>
                <div className="guest-role">Dashboard access only</div>
              </div>
            </div>
          )}

          {user && !collapsed && (
            <div className="user-info">
              <div className="user-avatar">{user.name?.[0]?.toUpperCase() || 'U'}</div>
              <div style={{ minWidth: 0 }}>
                <div className="user-name">{user.name}</div>
                <div className="user-role">{user.role}</div>
              </div>
            </div>
          )}

          {collapsed && (
            <div className="user-avatar-sm">
              {isGuest ? 'G' : (user?.name?.[0]?.toUpperCase() || 'U')}
            </div>
          )}

          {user ? (
            <button className="logout-btn" onClick={handleLogout}>{collapsed ? 'Out' : 'Log Out'}</button>
          ) : (
            <button className="login-btn" onClick={handleLogin}>{collapsed ? 'In' : 'Sign In'}</button>
          )}
        </div>
      </aside>

      <main className="main-content">
        {isGuest && (
          <div className="guest-topbar">
            <div className="guest-topbar-left">
              <span className="guest-eye">G</span>
              <span>
                <strong>Guest Mode</strong> - only the Dashboard is available.
                Sign in for Analytics, Sensors, and Alerts.
              </span>
            </div>
            <button className="btn-topbar-login" onClick={handleLogin}>Sign In / Register</button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
