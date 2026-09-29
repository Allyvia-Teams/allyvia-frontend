import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import { getDeals, getLeads } from 'api/crm';
import { useSelector } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import { ActionQueue, ContactsTab, Leaderboard, PipelineTab } from 'ui-component/inner-circle';
import CustomerDrawer, { type DrawerTab } from './CustomerDrawer';
import { customersToggleOptions, resolveCustomersView, resolveProspectsCanShow, type ProspectsCounts } from './customersProspects';
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

  const {
    data: prospectsCounts,
    isSuccess: prospectsCountsSucceeded,
    isError: prospectsCountsErrored
  } = useQuery({
    queryKey: ['ic-prospects-count', companyId],
    queryFn: async (): Promise<ProspectsCounts> => {
      const [leads, deals] = await Promise.all([getLeads({ page_size: 1 }), getDeals({ page_size: 1 })]);
      return { leads: leads.count, deals: deals.count };
    },
    enabled: !!companyId
  });

  // A failed count is unknown, not zero — treat it as available and let
  // PipelineTab report its own failure rather than hiding the tab outright.
  const prospectsCanShow = resolveProspectsCanShow(prospectsCounts, { isError: prospectsCountsErrored });
  // While the count is still pending, honour the requested view as-is (the
  // toggle already hides Prospects until availability is known, so there's
  // no control to flash) — the gate only applies once the query has settled.
  const countsSettled = prospectsCountsSucceeded || prospectsCountsErrored;
  const view = resolveCustomersView(requestedView, { settled: countsSettled, available: prospectsCanShow });

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
  // Guarded on the REQUESTED view (the URL), not the gated `view` — a
  // `?view=prospects&recordId=...` link must never open the customer drawer
  // or strip recordId before PipelineTab mounts, even if Prospects later
  // falls back to the leaderboard for this company.
  useEffect(() => {
    if (requestedView === 'prospects') return;
    const recordId = searchParams.get('recordId');
    if (!recordId) return;
    setSelectedCustomerId(recordId);
    const next = new URLSearchParams(searchParams);
    next.delete('recordId');
    setSearchParams(next, { replace: true });
  }, [requestedView, searchParams, setSearchParams]);

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

      <Stack spacing={2}>
        {view === 'leaderboard' && <Leaderboard onOpenCustomer={(id) => openCustomer(id, 'overview')} />}
        {view === 'all' && <ContactsTab />}
        {view === 'prospects' && (
          <PipelineTab initialView={pipelineView} deepLinkRecordId={searchParams.get('recordId')} onDeepLinkHandled={clearDeepLinkRecord} />
        )}
        <ActionQueue companyId={companyId} onOpenCustomer={(id) => openCustomer(id, 'activity')} />
      </Stack>

      <CustomerDrawer customerId={selectedCustomerId} initialTab={drawerTab} onClose={() => setSelectedCustomerId(null)} />
    </>
  );
}
