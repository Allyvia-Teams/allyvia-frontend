import { useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLocalTimeZone, parseDate, today } from '@internationalized/date';

// material-ui
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

// project imports
import { useSelector } from 'store';
import { selectEffectiveRole } from 'store/selectors/effectiveRole';
import financeSnapshotApi, { type FinanceRange } from 'api/financeSnapshot';
import { listLocations } from 'api/inventoryStock.api';
import { AllyviaDateRangePicker, type RangeValue } from 'ui-component/third-party/DateRangePicker';
import { toISO } from 'views/analytics/analyticsDateRange';
import { rangeFromParams, type Range } from './snapshotView';

// The range and store every Finance page shares, read from and written to the URL
// (?start=&end=&location_id=), so a refresh keeps them and a link carries them.

export interface FinanceRangeState {
  range: Range;
  locationId: string | null;
  query: FinanceRange;
  /** Who is asking: part of every query key so a role switch never shows another company's figures. */
  scope: (string | undefined)[];
  enabled: boolean;
  params: URLSearchParams;
  /** Set or clear URL params (null clears), keeping the rest. */
  update: (next: Record<string, string | null>) => void;
  /** Store picker (when there is more than one store) and the date range, then `extra`. */
  controls: (extra?: ReactNode) => ReactNode;
}

export function useFinanceRange(): FinanceRangeState {
  const role = useSelector(selectEffectiveRole);
  const [params, setParams] = useSearchParams();
  const range = useMemo(() => rangeFromParams(params, today(getLocalTimeZone())), [params]);
  const locationId = params.get('location_id') || null;
  const enabled = !!role?.company_id;
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

  const controls = (extra?: ReactNode) => (
    <>
      {stores.length > 1 ? (
        <TextField
          select
          size="small"
          label="Store"
          value={locationId ?? ''}
          onChange={(e) => update({ location_id: e.target.value || null, page: null })}
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
        value={{ start: parseDate(range.start), end: parseDate(range.end) } as RangeValue}
        onChange={(value) => {
          const start = toISO(value?.start);
          const end = toISO(value?.end);
          if (start && end) update({ start, end, page: null });
        }}
      />
      {extra}
    </>
  );

  return {
    range,
    locationId,
    query: { ...range, locationId },
    scope: [role?.company_id, role?.id],
    enabled,
    params,
    update,
    controls
  };
}

/** The snapshot for the shared range; every page reads it for the expense source. */
export function useSnapshotQuery(f: FinanceRangeState) {
  const { range, locationId, scope, enabled } = f;
  return useQuery({
    queryKey: ['finance', 'snapshot', ...scope, range, locationId],
    queryFn: () => financeSnapshotApi.snapshot({ ...range, locationId }),
    enabled,
    retry: false
  });
}

/** react-query's result as the props-only pages take it. */
export const loadable = <T,>(q: { data?: T; isLoading: boolean; isError: boolean; refetch: () => unknown }) => ({
  data: q.data,
  isLoading: q.isLoading,
  isError: q.isError,
  refetch: () => void q.refetch()
});
