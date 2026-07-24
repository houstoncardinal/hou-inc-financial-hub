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
 *   - Not logged in           → /auth
 *   - Logged in, role=client  → /portal/dashboard  (clients never see internal tools)
 *   - Logged in, role=pending → /auth              (awaiting admin approval — see below)
 *   - Logged in, wrong role   → /finance/dashboard  (finance/viewer blocked from admin)
 *
 * 'pending' MUST redirect somewhere outside the finance/admin route tree,
 * same as 'client'. Every other role is included in FINANCE_ROLES, so
 * falling through to /finance/dashboard always lands somewhere that role is
 * allowed to be. 'pending' isn't in FINANCE_ROLES (correctly — no access
 * until approved), so sending it to /finance/dashboard would just bounce
 * right back here and redirect again, forever. /auth is safe: it shows the
 * "pending approval" screen for that role instead of the sign-in form.
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
    if (user.role === 'pending') {
      return <Navigate to="/auth" replace />;
    }
    return <Navigate to="/finance/dashboard" replace />;
  }

  return <>{children}</>;
}
