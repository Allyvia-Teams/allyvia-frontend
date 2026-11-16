import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

// material-ui
import Button from '@mui/material/Button';

// project imports
import financeSnapshotApi from 'api/financeSnapshot';
import SnapshotBody from './SnapshotSections';
import SnapshotReportButton from './SnapshotReportButton';
import { isBankOwner } from './snapshotView';
import { loadable, useFinanceRange, useSnapshotQuery } from './useFinanceRange';

// ==============================|| FINANCE & ACCOUNTING - SNAPSHOT ||============================== //
// One page for every owner (docs/finance-tab-design.md section 6). The range lives in the URL
// (?start=&end=) so a refresh keeps it and the detail pages share it; a store is ?location_id=,
// sent as X-Location-Id. Every figure is the API's own; nothing is computed here.

export default function FinanceSnapshot() {
  const navigate = useNavigate();
  const f = useFinanceRange();
  const { range, locationId, scope, enabled } = f;
  const snapshot = useSnapshotQuery(f);
  const sales = useQuery({
    queryKey: ['finance', 'snapshot-sales', ...scope, range, locationId],
    queryFn: () => financeSnapshotApi.sales({ ...range, locationId }),
    enabled,
    retry: false
  });

  const s = snapshot.data;
  const extra = (
    <>
      {s?.expense_source === 'quickbooks' ? <SnapshotReportButton range={range} /> : null}
      {s && isBankOwner(s) ? <Button onClick={() => navigate('/integrations/bank')}>Manage bank</Button> : null}
    </>
  );

  return (
    <SnapshotBody
      snapshot={loadable(snapshot)}
      sales={loadable(sales)}
      range={range}
      locationId={locationId}
      controls={f.controls(extra)}
    />
  );
}
