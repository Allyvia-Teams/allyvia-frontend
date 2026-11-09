import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'store';
import { selectEffectiveRole } from 'store/selectors/effectiveRole';
import { hasPermission, RoleType } from 'utils/role';
import { Alert, Box } from '@mui/material';

interface RequireRoleProps {
  allowedRoles: RoleType[];
  children: React.ReactElement;
  fallback?: React.ReactElement;
  redirectTo?: string;
}

export default function RequireRole({ allowedRoles, children, fallback, redirectTo = '/unauthorized' }: RequireRoleProps) {
  const location = useLocation();
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);
  // The kiosk employee's role while a kiosk session is active, else the signed-in role.
  const currentRole = useSelector(selectEffectiveRole);

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!currentRole) {
    return (
      <Box p={3}>
        <Alert severity="warning">Please select a company/role to continue.</Alert>
      </Box>
    );
  }

  const hasAccess = allowedRoles.some((role) => hasPermission(currentRole.role_type, role));

  if (!hasAccess) {
    return fallback || <Navigate to={redirectTo} replace />;
  }

  return children;
}
