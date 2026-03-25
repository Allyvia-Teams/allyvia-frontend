import React from 'react';
import { Navigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import { useSelector } from 'store';
import { hasPermission, RoleType, getRoleDisplayName } from 'utils/role';
import Loader from 'ui-component/Loader';
import SettingsPermissionDenied from 'ui-component/settings/SettingsPermissionDenied';
import SettingsSectionCard from 'ui-component/settings/SettingsSectionCard';
import SubscriptionBillingContent from 'ui-component/settings/SubscriptionBillingContent';
import { IconCreditCard, IconArrowLeft } from '@tabler/icons-react';

export default function BillingPage() {
  const { isInitialized, isLoggedIn, currentRole } = useSelector((state) => state.auth);

  if (!isInitialized) return <Loader />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (isLoggedIn && !currentRole) return <Navigate to="/dashboard" replace />;
  if (currentRole && !hasPermission(currentRole.role_type, RoleType.ADMIN)) {
    const roleDisplay = currentRole.role_display || getRoleDisplayName(currentRole.role_type);
    return <SettingsPermissionDenied currentRoleDisplay={roleDisplay} />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Link
          component={RouterLink}
          to="/settings"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'text.secondary',
            textDecoration: 'none',
            mb: 1.5,
            '&:hover': { color: 'primary.main' }
          }}
        >
          <IconArrowLeft size={18} />
          Back to Settings
        </Link>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Subscription & Billing
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Manage your plan, payment methods, and billing.
        </Typography>
      </Box>

      <SettingsSectionCard
        title="Current plan"
        description="View and manage your subscription"
        icon={<IconCreditCard size={24} stroke={1.5} />}
      >
        <SubscriptionBillingContent />
      </SettingsSectionCard>
    </Container>
  );
}
