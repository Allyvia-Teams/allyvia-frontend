import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'store';

type Props = { children: React.ReactElement };

// Allowed kiosk paths (prefix match)
const ALLOWED_PREFIXES = ['/kiosk', '/kiosk/clock', '/kiosk/inventory'];

export default function MemberGuard({ children }: Props) {
  const location = useLocation();
  const kiosk = useSelector((s) => s.kiosk);
  const roleType = useSelector((s) => s.auth.currentRole?.role_type);

  // If not kiosk-authenticated, force to kiosk login for any kiosk route
  if (location.pathname.startsWith('/kiosk') && !kiosk.isAuthenticated) {
    return <Navigate to="/kiosk/login" replace />;
  }

  // If kiosk-authenticated, confine ALL navigation to allowed kiosk routes only
  if (kiosk.isAuthenticated) {
    const allowed = ALLOWED_PREFIXES.some((p) => location.pathname === p || location.pathname.startsWith(p));
    if (!allowed) {
      return <Navigate to="/kiosk" replace />;
    }
  }

  // If user role is member (regular login), confine to employees/clock and inventory
  if ((roleType || '').toLowerCase() === 'member') {
    const MEMBER_ALLOWED = ['/employees/clock', '/inventory'];
    const allowed = MEMBER_ALLOWED.some((p) => location.pathname === p || location.pathname.startsWith(p));
    if (!allowed && !location.pathname.startsWith('/kiosk')) {
      // Default landing for members
      return <Navigate to="/employees/clock" replace />;
    }
  }

  return children;
}
