import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import { getDeals, getLeads } from 'api/crm';
import { useSelector } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import { BodyGrid } from 'ui-component/frame';
import { ActionQueue, ContactsTab, Leaderboard, PipelineTab } from 'ui-component/inner-circle';
import CustomerDrawer, { type DrawerTab } from './CustomerDrawer';
import { customersToggleOptions, effectiveCustomersView, prospectsAvailable, type ProspectsCounts } from './customersProspects';
import { parseCustomersView, parsePipelineView, type CustomersView } from './navigation';

// ==============================|| INNER CIRCLE - CUSTOMERS ||============================== //
// The former "Members" section (Task 3.2): Leaderboard · All · Prospects, with
// the Action Queue beside. Prospects (Task 3.3) is gated on the company having
// at least one lead or deal — see customersProspects.ts.

export default function Customers() {
  const companyId = useSelector((state) => state.auth.currentRole?.company_id);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = parseCustomersView(searchParams.get('view'));
  const pipelineView = parsePipelineView(searchParams.get('prospects'));

  const { data: prospectsCounts } = useQuery({
    queryKey: ['ic-prospects-count', companyId],
    queryFn: async (): Promise<ProspectsCounts> => {
      const [leads, deals] = await Promise.all([getLeads({ page_size: 1 }), getDeals({ page_size: 1 })]);
      return { leads: leads.count, deals: deals.count };
    },
    enabled: !!companyId
  });

  // `data` stays undefined while loading, and prospectsAvailable(undefined) is
  // false — so Prospects never flashes on and then vanishes once the counts land.
  const prospectsCanShow = prospectsAvailable(prospectsCounts);
  const view = effectiveCustomersView(requestedView, prospectsCanShow);

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
          {customersToggleOptions(prospectsCanShow).map((option) => (
            <ToggleButton key={option.value} value={option.value}>
              {option.label}
            </ToggleButton>
          ))}
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
