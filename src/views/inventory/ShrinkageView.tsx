// views/inventory/ShrinkageView.tsx
//
// What went missing: units and the money they were worth.
//
// THE UNIT FIGURE IS A MAGNITUDE, NOT A DELTA. The backend sends
// `abs(SUM(delta))` over negative count and shrinkage movements, so it is always
// zero or more. Printing it as "-12" would double the minus sign the word "lost"
// already carries, and printing "+12" would be grotesque.
//
// FOUND STOCK NEVER OFFSETS A LOSS. Only negative movements are counted, so a
// positive count correction — the box that turned up behind the counter — is
// excluded entirely rather than netted off. Two errors in opposite directions
// are still two errors, and a net of zero would hide both.
//
// ZERO IS AN ANSWER, NOT A MISSING VALUE. "Nothing went missing" is the result
// this panel most hopes to show, so it gets a sentence rather than the em dash
// this module uses for "we do not know".

import { useCallback, useEffect, useState } from 'react';

import {
  Alert,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import Grid from '@mui/material/Grid';

import { LocationsResponse, ShrinkageResponse, getLocationPerformance, getShrinkage } from 'api/inventoryAnalytics.api';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { toNum } from 'utils/financeFormat';

import InsightsChart from './InsightsChart';
import { Caveats, InsightsViewProps, ToneValue, WindowCaption, statsThemeForTone } from './InsightsChrome';
import { ANALYTICS_STALENESS_NOTE, analyticsQuery, describeAnalyticsError, describeShrinkage, presenceOf } from './insights';
import { formatMoney } from './purchasing';
import { formatQuantity } from './stockFormat';

export default function ShrinkageView({ start, end, locationId, refreshKey }: InsightsViewProps) {
  const [data, setData] = useState<ShrinkageResponse | null>(null);
  const [byLocation, setByLocation] = useState<LocationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Two reads: the shrinkage endpoint genuinely honours the location filter,
      // while the per-location split exists ONLY inside the locations payload —
      // there is no per-location shrinkage endpoint.
      const [company, locations] = await Promise.all([
        getShrinkage(analyticsQuery({ start, end, locationId })),
        getLocationPerformance(analyticsQuery({ start, end }))
      ]);
      setData(company);
      setByLocation(locations);
      setError(null);
    } catch (err) {
      setError(describeAnalyticsError(err));
      setData(null);
      setByLocation(null);
    } finally {
      setLoading(false);
    }
  }, [start, end, locationId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const reading = describeShrinkage(data?.shrinkage ?? null);
  const rows = byLocation?.locations ?? [];
  const presence = presenceOf(byLocation, byLocation?.locations);
  const charted = rows.filter((row) => row.shrinkage && (row.shrinkage.units > 0 || toNum(row.shrinkage.cost) > 0));

  return (
    <MainCard
      title="Shrinkage"
      secondary={
        <Stack direction="row" spacing={1} alignItems="center">
          {loading && <CircularProgress size={18} />}
          <WindowCaption envelope={data} />
        </Stack>
      }
    >
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <AllyviaStats title="Units lost" value={reading.units} theme={statsThemeForTone(reading.tone)} size="small" loading={loading} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <AllyviaStats title="At cost" value={reading.cost} theme={statsThemeForTone(reading.tone)} size="small" loading={loading} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <AllyviaStats title="Locations affected" value={formatQuantity(charted.length)} size="small" loading={loading} />
          </Grid>
        </Grid>

        <Typography variant="body2" color="text.secondary">
          {reading.summary}
        </Typography>

        <InsightsChart
          type="bar"
          categories={charted.map((row) => row.location_name)}
          series={[{ name: 'Lost at cost', data: charted.map((row) => toNum(row.shrinkage.cost)) }]}
          valueFormatter={(value) => formatMoney(value)}
          isLoading={loading}
          isEmpty={!loading && charted.length === 0}
          emptyMessage={presence === 'absent' ? 'These figures have not loaded.' : 'No shrinkage recorded at any location in this window.'}
          footnote="Locations with nothing missing are left off the chart rather than drawn as empty bars."
        />

        <AllyviaEmpty
          isLoading={loading && !byLocation}
          isEmpty={!loading && presence !== 'present'}
          type="table"
          height={180}
          title={presence === 'absent' ? 'Not loaded' : 'No locations'}
          description={presence === 'absent' ? 'These figures have not loaded.' : 'Add a location before splitting shrinkage by store.'}
        >
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Location</TableCell>
                  <TableCell align="right">Units lost</TableCell>
                  <TableCell align="right">At cost</TableCell>
                  <TableCell>Reading</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const locationReading = describeShrinkage(row.shrinkage);
                  return (
                    <TableRow key={row.location_id} hover>
                      <TableCell>{row.location_name}</TableCell>
                      <TableCell align="right">
                        <ToneValue tone={locationReading.tone}>{locationReading.units}</ToneValue>
                      </TableCell>
                      <TableCell align="right">
                        <ToneValue tone={locationReading.tone}>{locationReading.cost}</ToneValue>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {locationReading.summary}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </AllyviaEmpty>

        <Caveats
          notes={[
            'Counted from stocktake corrections and shrinkage adjustments that reduced stock. A correction that ADDED stock is not netted off — two mistakes in opposite directions are still two mistakes.',
            'Units are a loss magnitude, so they are never shown with a minus sign.',
            'The cost figure is recorded to four decimal places on the wire and rounded to the penny here.',
            'The per-location split always covers every store — the location filter at the top of the page narrows the totals above it, not this table.',
            ANALYTICS_STALENESS_NOTE
          ]}
        />
      </Stack>
    </MainCard>
  );
}
