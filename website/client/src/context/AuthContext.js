import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext();
const SESSION_KEY = 'agritech_session';
const GUEST_KEY   = 'agritech_guest';
const TOKEN_KEY   = 'agritech_token';

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session   = localStorage.getItem(SESSION_KEY);
    const token     = localStorage.getItem(TOKEN_KEY);
    const guestFlag = localStorage.getItem(GUEST_KEY);
    
    if (token && session) {
      try { 
        setUser(JSON.parse(session)); 
      } catch { 
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    } else if (guestFlag === 'true') {
      setIsGuest(true);
    }
    setLoading(false);
  }, []);

  const register = useCallback(async ({ name, email, password, confirmPassword, role, farmName }) => {
    if (!name || !email || !password) throw new Error('All fields are required');
    if (password.length < 6) throw new Error('Password must be at least 6 characters');
    if (password !== confirmPassword) throw new Error('Passwords do not match');
    
    try {
      const response = await authAPI.register({ 
        name: name.trim(),
        email: email.toLowerCase().trim(), 
        password,
        role: role || 'farmer',
        farm: farmName ? { name: farmName } : undefined
      });
      
      if (response.data.success) {
        const { token, user: userData } = response.data;
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
        localStorage.removeItem(GUEST_KEY);
        setIsGuest(false);
        setUser(userData);
        return userData;
      }
      throw new Error(response.data.message || 'Registration failed');
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Registration failed');
    }
  }, []);

  const login = useCallback(async (email, password) => {
    if (!email || !password) throw new Error('Email and password are required');
    
    try {
      const response = await authAPI.login({ 
        email: email.toLowerCase().trim(), 
        password 
      });
      
      if (response.data.success) {
        const { token, user: userData } = response.data;
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
        localStorage.removeItem(GUEST_KEY);
        setIsGuest(false);
        setUser(userData);
        return userData;
      }
      throw new Error(response.data.message || 'Login failed');
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  }, []);

  // Reset password
  const resetPassword = useCallback(async (email, newPassword, otp) => {
    if (!email) throw new Error('Email is required');
    if (!newPassword || newPassword.length < 6) throw new Error('New password must be at least 6 characters');
    if (!otp) throw new Error('OTP is required');
    
    try {
      const response = await authAPI.resetPassword({ email, newPassword, otp });
      if (response.data.success) {
        return response.data.message;
      }
      throw new Error(response.data.message || 'Reset failed');
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Reset failed');
    }
  }, []);

  const verifyOTP = useCallback(async (email, otp) => {
    if (!email || !otp) throw new Error('Email and OTP are required');
    
    try {
      const response = await authAPI.verifyOTP({ email, otp });
      if (response.data.success) {
        return response.data.message;
      }
      throw new Error(response.data.message || 'OTP verification failed');
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'OTP verification failed');
    }
  }, []);

  const forgotPassword = useCallback(async (email) => {
    if (!email) throw new Error('Email is required');
    
    try {
      const response = await authAPI.forgotPassword({ email });
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Request failed');
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Request failed');
    }
  }, []);

  const continueAsGuest = useCallback(() => {
    localStorage.setItem(GUEST_KEY, 'true');
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null); setIsGuest(true);
  }, []);

  const logout = useCallback(() => {
    if (localStorage.getItem(TOKEN_KEY)) {
      authAPI.logout().catch(() => {});
    }
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(GUEST_KEY);
    setUser(null); setIsGuest(false);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, isGuest,
      isAuthenticated: !!user || isGuest,
      isFullUser: !!user,
      loading, login, register, resetPassword, verifyOTP, forgotPassword, continueAsGuest, logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
