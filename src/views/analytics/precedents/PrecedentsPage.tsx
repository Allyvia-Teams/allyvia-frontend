// Precedents — each store's day, one month at a time (context-graph P3).
//
// The first chart over the persisted day facts: the green revenue line per
// store, or for All stores (the company row — which includes sales no store
// can claim, so it is not the stores' sum). P4 adds the weather line and the
// calendar windows, P5 the baseline band; their keys already ride on every day.

import { useMemo, useState } from 'react';

import { Alert, Box, Button, ButtonGroup, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { IconChartLine, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';

import { getPrecedentsMonth } from 'api/precedents.api';
import { listLocations } from 'api/inventoryStock.api';
import { PageHeader, Panel, PanelMessage } from 'ui-component/frame';

import PrecedentsChart from './PrecedentsChart';
import {
  REVENUE_LINE,
  daySeries,
  defaultMonth,
  gapSentence,
  latestOccurrence,
  moneyFormatter,
  monthLabel,
  observedSummary,
  shiftMonth,
  storeOptions,
  unobservedGaps,
  type StoreLike
} from './precedentsSeries';

export const precedentsKeys = {
  month: (year: number, month: number, store: string) => ['precedents', 'month', year, month, store] as const,
  stores: ['precedents', 'stores'] as const
};

export default function PrecedentsPage() {
  const [{ year, month }, setMonth] = useState(() => defaultMonth(new Date()));
  const [store, setStore] = useState('');

  const stores = useQuery({ queryKey: precedentsKeys.stores, queryFn: listLocations });
  const data = useQuery({
    queryKey: precedentsKeys.month(year, month, store),
    queryFn: () => getPrecedentsMonth(year, month, store || null)
  });

  const options = useMemo(() => storeOptions((stores.data ?? []) as unknown as StoreLike[]), [stores.data]);
  const series = useMemo(() => (data.data ? daySeries(data.data) : []), [data.data]);
  const formatMoney = useMemo(() => moneyFormatter(data.data?.currency ?? 'USD'), [data.data?.currency]);
  const summary = data.data ? observedSummary(data.data) : null;
  const gaps = data.data ? gapSentence(unobservedGaps(data.data)) : null;
  const now = new Date();

  const controls = (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <TextField
        select
        size="small"
        label="Store"
        value={store}
        onChange={(e) => setStore(e.target.value)}
        sx={{ minWidth: 180 }}
        disabled={stores.isLoading}
        // "All stores" is the empty value (no header); without displayEmpty
        // MUI renders '' as a blank box.
        slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
      >
        {options.map((o) => (
          <MenuItem key={o.value || 'all'} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>
      <ButtonGroup size="small" variant="outlined" aria-label="Precedent months">
        <Button onClick={() => setMonth(latestOccurrence(6, now))}>June</Button>
        <Button onClick={() => setMonth(latestOccurrence(12, now))}>December</Button>
      </ButtonGroup>
      <ButtonGroup size="small" variant="outlined" aria-label="Month">
        <Button aria-label="Previous month" onClick={() => setMonth(shiftMonth(year, month, -1))}>
          <IconChevronLeft size={16} />
        </Button>
        <Button disabled sx={{ minWidth: 132, '&.Mui-disabled': { color: 'text.primary' } }}>
          {monthLabel(year, month)}
        </Button>
        <Button aria-label="Next month" onClick={() => setMonth(shiftMonth(year, month, 1))}>
          <IconChevronRight size={16} />
        </Button>
      </ButtonGroup>
    </Stack>
  );

  return (
    <Box>
      <PageHeader
        title="Precedents"
        subtitle="Each store's day, from its own sales. A break in the line is a day no source saw."
        right={controls}
      />
      {stores.isError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          The store list could not be loaded, so only All stores is available.
        </Alert>
      )}
      <Panel
        title={`${data.data?.scope.label ?? (options.find((o) => o.value === store)?.label || 'All stores')} · ${monthLabel(year, month)}`}
        icon={<IconChartLine size={17} />}
        note={summary ? `${summary.observed} of ${summary.total} days observed` : undefined}
        action={
          <Chip
            size="small"
            variant="outlined"
            label="Revenue (clean daily POS)"
            icon={<Box component="span" sx={{ width: 18, height: 3, borderRadius: 1, bgcolor: REVENUE_LINE.light, ml: 1 }} />}
          />
        }
      >
        {data.isLoading ? (
          <PanelMessage>Loading the month…</PanelMessage>
        ) : data.isError ? (
          <PanelMessage>
            This month could not be loaded.{' '}
            <Button size="small" onClick={() => data.refetch()}>
              Retry
            </Button>
          </PanelMessage>
        ) : summary && summary.observed === 0 ? (
          <PanelMessage>
            No sales source covered any day of {monthLabel(year, month)}, so there is nothing to draw — not a month of zeros.
          </PanelMessage>
        ) : (
          <Box sx={{ p: 1.5 }}>
            <PrecedentsChart series={series} formatMoney={formatMoney} />
            {gaps && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {gaps}
              </Typography>
            )}
          </Box>
        )}
      </Panel>
    </Box>
  );
}
