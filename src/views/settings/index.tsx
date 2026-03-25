import React from 'react';
import { Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { useSelector } from 'store';
import { hasPermission, RoleType, getRoleDisplayName } from 'utils/role';
import Loader from 'ui-component/Loader';
import {
  AccountSettings,
  SubscriptionBilling,
  Notifications,
  Security,
  TeamPermissions,
  SettingsPermissionDenied
} from 'ui-component/settings';

export default function SettingsPage() {
  const { isInitialized, isLoggedIn, currentRole } = useSelector((state) => state.auth);

  // Loading: auth still initializing or permissions being resolved
  if (!isInitialized) {
    return <Loader />;
  }

  // Not logged in — AuthGuard should handle this; fallback redirect
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // No role selected — redirect to dashboard so user can select context
  if (isLoggedIn && !currentRole) {
    return <Navigate to="/dashboard" replace />;
  }

  // Logged in with a role but not Admin — show friendly permission error
  if (currentRole && !hasPermission(currentRole.role_type, RoleType.ADMIN)) {
    const roleDisplay = currentRole.role_display || getRoleDisplayName(currentRole.role_type);
    return <SettingsPermissionDenied currentRoleDisplay={roleDisplay} />;
  }

  // Admin: show Settings content
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Manage your account, billing, notifications, and team preferences.
        </Typography>
      </Box>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        <Grid item xs={12} md={6}>
          <AccountSettings />
        </Grid>
        <Grid item xs={12} md={6}>
          <SubscriptionBilling />
        </Grid>
        <Grid item xs={12} md={6}>
          <Notifications />
        </Grid>
        <Grid item xs={12} md={6}>
          <Security />
        </Grid>
        <Grid item xs={12} md={6}>
          <TeamPermissions />
        </Grid>
      </Grid>
    </Container>
  );
}
