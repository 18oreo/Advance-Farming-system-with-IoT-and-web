import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Sensors from './pages/Sensors';
import Alerts from './pages/Alerts';
import Login from './pages/Login';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

          <Route
            path="/"
            element={
              <ProtectedRoute guestAllowed={true}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={(
                <ProtectedRoute guestAllowed={true}>
                  <Dashboard />
                </ProtectedRoute>
              )}
            />
            <Route
              path="analytics"
              element={(
                <ProtectedRoute guestAllowed={false}>
                  <Analytics />
                </ProtectedRoute>
              )}
            />
            <Route
              path="sensors"
              element={(
                <ProtectedRoute guestAllowed={false}>
                  <Sensors />
                </ProtectedRoute>
              )}
            />
            <Route
              path="alerts"
              element={(
                <ProtectedRoute guestAllowed={false}>
                  <Alerts />
                </ProtectedRoute>
              )}
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
