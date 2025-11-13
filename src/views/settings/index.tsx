import React from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import ErrorBoundary from 'views/pages/error/ErrorBoundary';
import { useIsAdmin } from 'hooks/usePermission';
import AccountTab from './tabs/AccountTab';
import CompanyInfoTab from './tabs/CompanyInfoTab';
import BillingTab from './tabs/BillingTab';
import UserRoleManagementTab from './tabs/UserRoleManagementTab';

function a11yProps(index: number) {
  return { id: `settings-tab-${index}`, 'aria-controls': `settings-tabpanel-${index}` } as const;
}

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`settings-tabpanel-${index}`} aria-labelledby={`settings-tab-${index}`}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function SettingsPage() {
  const isAdmin = useIsAdmin();
  const [tab, setTab] = React.useState(0);

  // Define tabs array based on permissions
  // Only Account tab is visible to all users, all other tabs require admin access
  const tabs = React.useMemo(() => {
    const tabList: Array<{ label: string; component: React.ReactNode; index: number }> = [
      { label: 'Account', component: <AccountTab />, index: 0 }
    ];

    if (isAdmin) {
      tabList.push({ label: 'Company Info', component: <CompanyInfoTab />, index: 1 });
      tabList.push({ label: 'Billing & Subscription', component: <BillingTab />, index: 2 });
      tabList.push({ label: 'User & Role Management', component: <UserRoleManagementTab />, index: 3 });
    }

    return tabList;
  }, [isAdmin]);

  // Reset to first tab if current tab becomes invalid (e.g., admin logs out)
  React.useEffect(() => {
    if (tab >= tabs.length) {
      setTab(0);
    }
  }, [tab, tabs.length]);

  return (
    <ErrorBoundary>
      <MainCard title="Settings">
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
            {tabs.map((tabItem, idx) => (
              <Tab key={tabItem.index} label={tabItem.label} {...a11yProps(idx)} />
            ))}
          </Tabs>
        </Box>

        {tabs.map((tabItem, idx) => (
          <TabPanel key={tabItem.index} value={tab} index={idx}>
            {tabItem.component}
          </TabPanel>
        ))}
      </MainCard>
    </ErrorBoundary>
  );
}
