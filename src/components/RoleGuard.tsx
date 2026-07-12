import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type AppRole } from '@/hooks/useAuth';

interface Props {
  allowed: AppRole[];
  children: ReactNode;
}

/**
 * Wraps a route so only users whose role is in `allowed` can enter.
 *
 * Redirect logic:
 *   - Not logged in          → /auth
 *   - Logged in, role=client → /portal/dashboard  (clients never see internal tools)
 *   - Logged in, wrong role  → /finance/dashboard (finance/viewer blocked from admin)
 */
export default function RoleGuard({ allowed, children }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (!allowed.includes(user.role)) {
    if (user.role === 'client') {
      return <Navigate to="/portal/dashboard" replace />;
    }
    return <Navigate to="/finance/dashboard" replace />;
  }

  return <>{children}</>;
}
