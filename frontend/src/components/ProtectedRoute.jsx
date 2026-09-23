import { Navigate, Outlet } from 'react-router-dom';
import api from '../lib/api';

/** Equivalent of requireAuth() — bounces unauthenticated visitors to /login. */
export default function ProtectedRoute() {
  if (!api.isAuthenticated()) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Equivalent of the admin.html guard — non-admins go back to the dashboard. */
export function AdminRoute() {
  const user = api.getUser();
  if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
