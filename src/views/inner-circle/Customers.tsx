import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import { useSelector } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import { BodyGrid } from 'ui-component/frame';
import { ActionQueue, ContactsTab, Leaderboard, PipelineTab } from 'ui-component/inner-circle';
import CustomerDrawer, { type DrawerTab } from './CustomerDrawer';
import { parseCustomersView, parsePipelineView, type CustomersView } from './navigation';

// ==============================|| INNER CIRCLE - CUSTOMERS ||============================== //
// The former "Members" section (Task 3.2): Leaderboard · All · Prospects, with
// the Action Queue beside. Prospects is rendered unconditionally this session —
// Task 3.3 adds the gating seam (prospectsAvailable).

export default function Customers() {
  const companyId = useSelector((state) => state.auth.currentRole?.company_id);
  const [searchParams, setSearchParams] = useSearchParams();
  const view = parseCustomersView(searchParams.get('view'));
  const pipelineView = parsePipelineView(searchParams.get('prospects'));

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('overview');

  const openCustomer = (customerId: string, tab: DrawerTab = 'overview') => {
    setDrawerTab(tab);
    setSelectedCustomerId(customerId);
  };

  const handleViewChange = (_event: React.SyntheticEvent, value: CustomersView | null) => {
    if (!value) return;
    const next = new URLSearchParams(searchParams);
    next.set('view', value);
    if (value !== 'prospects') {
      next.delete('prospects');
      next.delete('recordId');
    }
    setSearchParams(next, { replace: true });
  };

  // Legacy /crm?tab=contacts&recordId=<contactId> → open that customer's drawer.
  useEffect(() => {
    if (view === 'prospects') return;
    const recordId = searchParams.get('recordId');
    if (!recordId) return;
    setSelectedCustomerId(recordId);
    const next = new URLSearchParams(searchParams);
    next.delete('recordId');
    setSearchParams(next, { replace: true });
  }, [view, searchParams, setSearchParams]);

  const clearDeepLinkRecord = () => {
    if (!searchParams.has('recordId')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('recordId');
    setSearchParams(next, { replace: true });
  };

  if (!companyId) {
    return (
      <MainCard title="Customers">
        <Typography color="textSecondary">Select a company to view Inner Circle.</Typography>
      </MainCard>
    );
  }

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <ToggleButtonGroup exclusive value={view} onChange={handleViewChange} aria-label="Customers view">
          <ToggleButton value="leaderboard">Leaderboard</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="prospects">Prospects</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <BodyGrid
        main={
          <>
            {view === 'leaderboard' && <Leaderboard onOpenCustomer={(id) => openCustomer(id, 'overview')} />}
            {view === 'all' && <ContactsTab />}
            {view === 'prospects' && (
              <PipelineTab
                initialView={pipelineView}
                deepLinkRecordId={searchParams.get('recordId')}
                onDeepLinkHandled={clearDeepLinkRecord}
              />
            )}
          </>
        }
        rail={<ActionQueue companyId={companyId} onOpenCustomer={(id) => openCustomer(id, 'activity')} />}
      />

      <CustomerDrawer customerId={selectedCustomerId} initialTab={drawerTab} onClose={() => setSelectedCustomerId(null)} />
    </>
  );
}
