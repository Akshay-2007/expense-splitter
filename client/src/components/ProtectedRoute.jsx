import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';

/**
 * ProtectedRoute — guards child routes behind authentication.
 * - While the auth state is loading, shows a spinner.
 * - If not authenticated, redirects to /login.
 * - Otherwise renders the nested route via <Outlet />.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loader text="Checking authentication…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
