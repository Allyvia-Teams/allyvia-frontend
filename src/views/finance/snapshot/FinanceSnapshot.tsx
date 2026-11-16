import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLocalTimeZone, parseDate, today } from '@internationalized/date';

// material-ui
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

// project imports
import { useSelector } from 'store';
import { selectEffectiveRole } from 'store/selectors/effectiveRole';
import financeSnapshotApi from 'api/financeSnapshot';
import { listLocations } from 'api/inventoryStock.api';
import { AllyviaDateRangePicker, type RangeValue } from 'ui-component/third-party/DateRangePicker';
import { toISO } from 'views/analytics/analyticsDateRange';
import SnapshotBody from './SnapshotSections';
import { isBankOwner, rangeFromParams } from './snapshotView';

// ==============================|| FINANCE & ACCOUNTING - SNAPSHOT ||============================== //
// One page for every owner (docs/finance-tab-design.md section 6). The range lives in the URL
// (?start=&end=) so a refresh keeps it and the detail pages share it; a store is ?location_id=,
// sent as X-Location-Id. Every figure is the API's own; nothing is computed here.

export default function FinanceSnapshot() {
  const role = useSelector(selectEffectiveRole);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const range = useMemo(() => rangeFromParams(params, today(getLocalTimeZone())), [params]);
  const locationId = params.get('location_id') || null;
  const enabled = !!role?.company_id;

  const snapshot = useQuery({
    queryKey: ['finance', 'snapshot', role?.company_id, role?.id, range, locationId],
    queryFn: () => financeSnapshotApi.snapshot({ ...range, locationId }),
    enabled,
    retry: false
  });
  const sales = useQuery({
    queryKey: ['finance', 'snapshot-sales', role?.company_id, role?.id, range, locationId],
    queryFn: () => financeSnapshotApi.sales({ ...range, locationId }),
    enabled,
    retry: false
  });
  const locations = useQuery({
    queryKey: ['finance', 'snapshot-locations', role?.company_id],
    queryFn: listLocations,
    enabled,
    retry: false,
    staleTime: 5 * 60_000
  });
  const stores = (locations.data ?? []).filter((l) => l.is_active);

  const update = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    setParams(p);
  };

  const pickerValue = { start: parseDate(range.start), end: parseDate(range.end) } as RangeValue;
  const controls = (
    <>
      {stores.length > 1 ? (
        <TextField
          select
          size="small"
          label="Store"
          value={locationId ?? ''}
          onChange={(e) => update({ location_id: e.target.value || null })}
          sx={{ minWidth: 160 }}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        >
          <MenuItem value="">All stores</MenuItem>
          {stores.map((l) => (
            <MenuItem key={l.id} value={l.id}>
              {l.name}
            </MenuItem>
          ))}
        </TextField>
      ) : null}
      <AllyviaDateRangePicker
        value={pickerValue}
        onChange={(value) => {
          const start = toISO(value?.start);
          const end = toISO(value?.end);
          if (start && end) update({ start, end });
        }}
      />
      {snapshot.data && isBankOwner(snapshot.data) ? <Button onClick={() => navigate('/integrations/bank')}>Manage bank</Button> : null}
    </>
  );

  return (
    <SnapshotBody
      snapshot={{ data: snapshot.data, isLoading: snapshot.isLoading, isError: snapshot.isError, refetch: () => void snapshot.refetch() }}
      sales={{ data: sales.data, isLoading: sales.isLoading, isError: sales.isError, refetch: () => void sales.refetch() }}
      range={range}
      controls={controls}
    />
  );
}
