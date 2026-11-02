import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import NotFoundPage from '../pages/NotFoundPage';
import { useAuth } from './AuthContext';

/** Admin-only pages: anonymous users are sent to sign in, other users just see "not found". */
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!user.roles.includes('Admin')) return <NotFoundPage />;
  return <>{children}</>;
}
