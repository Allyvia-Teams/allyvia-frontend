import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useSelector } from 'store';
import { PageHeader } from 'ui-component/frame';
import { hasPermission, RoleType } from 'utils/role';
import Loader from 'ui-component/Loader';
import {
  AccountSettings,
  Notifications,
  UIPreferences,
  Security,
  BusinessInfo,
  Branding,
  MarketplaceListing,
  TeamPermissions,
  AuditLog,
  Registers,
  ReturnsPolicy,
  SettingsSectionCard
} from 'ui-component/settings';
import SubscriptionBillingContent from 'ui-component/settings/SubscriptionBillingContent';
import { IconCreditCard } from '@tabler/icons-react';
import { useSearchParams } from 'react-router-dom';
import OnboardingWizard from 'views/onboarding';
import IntegrationsHub from 'views/integrations';

import { settingsTabsFor, shouldStripTabParam, type TabValue } from './tabs';

export default function SettingsPage() {
  const { isInitialized, isLoggedIn, currentRole } = useSelector((state) => state.auth);
  const [searchParams, setSearchParams] = useSearchParams();

  const isAdmin = !!currentRole && hasPermission(currentRole.role_type, RoleType.ADMIN);
  const companyId = currentRole?.company_id || '';

  const requestedTab = searchParams.get('tab') as TabValue | null;
  const validTabs: TabValue[] = settingsTabsFor(isAdmin);
  const tab: TabValue = requestedTab && validTabs.includes(requestedTab) ? requestedTab : 'general';

  // If a non-admin lands on an admin-only tab via URL, strip the param — but
  // not before auth has settled, or a reload on ?tab=onboarding erases its own
  // tab while currentRole is still null.
  const authReady = isInitialized && !!currentRole;
  useEffect(() => {
    if (shouldStripTabParam(requestedTab, authReady, validTabs)) {
      setSearchParams({});
    }
  }, [requestedTab, authReady, isAdmin]);

  if (!isInitialized) {
    return <Loader />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (isLoggedIn && !currentRole) {
    return <Navigate to="/dashboard" replace />;
  }

  const tabs = (
    <Tabs value={tab} onChange={(_, value) => setSearchParams(value === 'general' ? {} : { tab: value })} aria-label="Settings sections">
      <Tab label="General" value="general" />
      {isAdmin && <Tab label="Brand" value="brand" />}
      {isAdmin && <Tab label="Integrations" value="integrations" />}
      {isAdmin && <Tab label="Audit" value="audit" />}
      {isAdmin && <Tab label="Billing" value="billing" />}
      {isAdmin && <Tab label="Registers" value="registers" />}
      {isAdmin && <Tab label="Returns" value="returns" />}
      {isAdmin && <Tab label="Data onboarding" value="onboarding" />}
    </Tabs>
  );

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle={
          isAdmin
            ? 'Account, brand, integrations, billing, registers, returns and data onboarding'
            : 'Account, notifications and appearance'
        }
        tabs={tabs}
      />

      {tab === 'general' && (
        <Stack spacing={{ xs: 2, sm: 3 }}>
          <AccountSettings />
          <Notifications />
          <UIPreferences />
          <Security />
          {isAdmin && <BusinessInfo companyId={companyId} />}
          {isAdmin && <MarketplaceListing companyId={companyId} />}
          {isAdmin && <TeamPermissions companyId={companyId} />}
        </Stack>
      )}

      {/* The brand studio has its own tab (owner, 2026-09-14): it is the largest section in Settings
          and was buried mid-way down General. */}
      {tab === 'brand' && isAdmin && <Branding />}

      {/* One catalog owns connection status and discovery so integrations are not split
          between a settings list and a second provider grid. */}
      {tab === 'integrations' && isAdmin && <IntegrationsHub embedded />}

      {tab === 'registers' && isAdmin && <Registers companyId={companyId} />}

      {tab === 'returns' && isAdmin && <ReturnsPolicy companyId={companyId} />}

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

      {tab === 'onboarding' && isAdmin && <OnboardingWizard />}
    </>
  );
}
