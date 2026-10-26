import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

// Create the authentication context
const AuthContext = createContext(null);

/**
 * AuthProvider wraps the app and provides authentication state and actions.
 * - On mount it checks localStorage for a saved token and validates it via getMe().
 * - Exposes login, register, logout, and current user info to all children.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // On mount (or when token changes), validate the stored token
  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await authAPI.getMe();
        // Backend returns { success, data: { _id, name, email } }
        // Axios unwraps once → res.data = { success, data: {...} }
        const userData = res.data.data || res.data;
        setUser(userData);
        setToken(storedToken);
      } catch (err) {
        // Token is invalid or expired — clear everything
        console.error('Token validation failed:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Log in with email and password.
   * Stores the token and user in state + localStorage.
   */
  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    // Backend: { success, data: { _id, name, email, token } }
    const payload = res.data.data || res.data;
    const newToken = payload.token;
    const newUser = { _id: payload._id, name: payload.name, email: payload.email };

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);

    navigate('/');
  }, [navigate]);

  /**
   * Register a new account.
   * Stores the token and user in state + localStorage.
   */
  const register = useCallback(async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });
    // Backend: { success, data: { _id, name, email, token } }
    const payload = res.data.data || res.data;
    const newToken = payload.token;
    const newUser = { _id: payload._id, name: payload.name, email: payload.email };

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);

    navigate('/');
  }, [navigate]);

  /**
   * Log out: clear everything and redirect to login.
   */
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/login');
  }, [navigate]);

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook for consuming the auth context.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
