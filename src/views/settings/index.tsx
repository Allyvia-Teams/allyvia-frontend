import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useSelector } from 'store';
import { hasPermission, RoleType } from 'utils/role';
import Loader from 'ui-component/Loader';
import {
  AccountSettings,
  Notifications,
  UIPreferences,
  Security,
  BusinessInfo,
  Branding,
  Integrations,
  TeamPermissions,
  AuditLog,
  SettingsSectionCard
} from 'ui-component/settings';
import SubscriptionBillingContent from 'ui-component/settings/SubscriptionBillingContent';
import { IconCreditCard } from '@tabler/icons-react';
import { useSearchParams } from 'react-router-dom';

type TabValue = 'general' | 'audit' | 'billing';

export default function SettingsPage() {
  const { isInitialized, isLoggedIn, currentRole } = useSelector((state) => state.auth);
  const [searchParams, setSearchParams] = useSearchParams();

  const isAdmin = !!currentRole && hasPermission(currentRole.role_type, RoleType.ADMIN);
  const companyId = currentRole?.company_id || '';

  const requestedTab = searchParams.get('tab') as TabValue | null;
  const validTabs: TabValue[] = isAdmin ? ['general', 'audit', 'billing'] : ['general'];
  const tab: TabValue = requestedTab && validTabs.includes(requestedTab) ? requestedTab : 'general';

  // If a non-admin lands on an admin-only tab via URL, strip the param.
  useEffect(() => {
    if (requestedTab && !validTabs.includes(requestedTab)) {
      setSearchParams({});
    }
  }, [requestedTab, isAdmin]);

  if (!isInitialized) {
    return <Loader />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (isLoggedIn && !currentRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {isAdmin
            ? 'Manage your account, billing, notifications, and team preferences.'
            : 'Manage your account, notifications, and appearance preferences.'}
        </Typography>
      </Box>

      <Box sx={{ borderBottom: (t) => `1px solid ${t.palette.divider}`, mb: { xs: 2, sm: 3 } }}>
        <Tabs value={tab} onChange={(_, value) => setSearchParams(value === 'general' ? {} : { tab: value })}>
          <Tab label="General" value="general" />
          {isAdmin && <Tab label="Audit" value="audit" />}
          {isAdmin && <Tab label="Billing" value="billing" />}
        </Tabs>
      </Box>

      {tab === 'general' && (
        <Stack spacing={{ xs: 2, sm: 3 }}>
          <AccountSettings />
          <Notifications />
          <UIPreferences />
          <Security />
          {isAdmin && <BusinessInfo companyId={companyId} />}
          {isAdmin && <Branding />}
          {isAdmin && <Integrations companyId={companyId} />}
          {isAdmin && <TeamPermissions companyId={companyId} />}
        </Stack>
      )}

      {tab === 'audit' && isAdmin && <AuditLog />}

      {tab === 'billing' && isAdmin && (
        <SettingsSectionCard
          title="Current Plan"
          description="View and manage your subscription"
          icon={<IconCreditCard size={24} stroke={1.5} />}
        >
          <SubscriptionBillingContent />
        </SettingsSectionCard>
      )}
    </Container>
  );
}
