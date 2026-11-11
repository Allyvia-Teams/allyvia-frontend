import { useEffect, useMemo, useState } from 'react';

// material-ui
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

// icons
import { IconChartBar } from '@tabler/icons-react';

// project imports
import axiosServices from 'utils/axios';
import { AnalyticsAPI } from 'api/analytics.api';
import { Panel, PanelMessage } from 'ui-component/frame';
import AnalyticsChart from './AnalyticsChart';
import { buildOwnerCharts, lastYearWindow, type DailyPoint, type LaborDay, type TopItemRow } from './ownerCharts';
import type { IsoWindow } from '../dashboardRange';

// ==============================|| DASHBOARD - ANALYTICS ||============================== //
// One chart and a small dropdown of the four things an owner checks every week,
// all from POS sales (see ownerCharts.ts): sales against last year, best
// sellers, busiest days and sales per labor hour. Bank and QuickBooks data are
// deliberately not used here; they live under Finance & accounting.

interface OwnerData {
  current: DailyPoint[] | null;
  lastYear: DailyPoint[] | null;
  topItems: TopItemRow[] | null;
  labor: LaborDay[] | null;
}

const EMPTY: OwnerData = { current: null, lastYear: null, topItems: null, labor: null };

const asArray = <T,>(data: unknown, key?: string): T[] | null => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const inner = (key && obj[key]) ?? obj.results ?? obj.items;
    if (Array.isArray(inner)) return inner as T[];
  }
  return null;
};

export const AnalyticsSection = ({ window, windowLabel }: { window: IsoWindow; windowLabel: string }) => {
  const { startDate, endDate } = window;
  const [data, setData] = useState<OwnerData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ly = lastYearWindow(startDate, endDate);
    setLoading(true);
    setFailed(false);
    Promise.allSettled([
      AnalyticsAPI.Financial.getRevenueSeries({ start_date: startDate, end_date: endDate }),
      AnalyticsAPI.Financial.getRevenueSeries({ start_date: ly.start, end_date: ly.end }),
      // rank_by/limit are not forwarded by AnalyticsAPI.buildQueryParams, so call the endpoint directly.
      axiosServices
        .get('/analytics/top-items/', { params: { start_date: startDate, end_date: endDate, rank_by: 'revenue', limit: 500 } })
        .then((r) => r.data),
      AnalyticsAPI.Employee.getDailyBreakdown({ start_date: startDate, end_date: endDate })
    ]).then(([cur, last, top, labor]) => {
      if (cancelled) return;
      const value = <T,>(r: PromiseSettledResult<unknown>, key?: string): T[] | null =>
        r.status === 'fulfilled' ? asArray<T>(r.value, key) : null;
      setData({
        current: value<DailyPoint>(cur),
        lastYear: value<DailyPoint>(last),
        topItems: value<TopItemRow>(top),
        labor: value<LaborDay>(labor, 'daily_breakdown')
      });
      setFailed(cur.status === 'rejected');
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  const charts = useMemo(() => buildOwnerCharts({ start: startDate, end: endDate, ...data }), [startDate, endDate, data]);
  const chart = charts.find((c) => c.key === selectedKey) ?? charts[0] ?? null;

  const picker =
    charts.length > 0 ? (
      <Select
        size="small"
        value={chart?.key ?? ''}
        onChange={(event: SelectChangeEvent<string>) => setSelectedKey(event.target.value)}
        aria-label="Chart"
        sx={{
          fontSize: '0.875rem',
          fontWeight: 600,
          minWidth: 180,
          height: 30,
          '& .MuiSelect-select': { py: 0, display: 'flex', alignItems: 'center' }
        }}
      >
        {charts.map((c) => (
          <MenuItem key={c.key} value={c.key} sx={{ fontSize: '0.875rem' }}>
            {c.name}
          </MenuItem>
        ))}
      </Select>
    ) : null;

  let body: React.ReactNode;
  if (loading && !chart) {
    body = (
      <Box sx={{ p: '14px' }}>
        <Skeleton variant="text" width={140} sx={{ fontSize: '1.5rem' }} />
        <Skeleton variant="rounded" height={170} sx={{ mt: 1 }} />
      </Box>
    );
  } else if (!chart) {
    body = (
      <PanelMessage tone={failed ? 'error' : 'default'}>
        {failed ? "Couldn't load analytics right now." : `No POS sales recorded for ${windowLabel.toLowerCase()} yet.`}
      </PanelMessage>
    );
  } else {
    const height = chart.horizontal ? Math.max(190, chart.xAxis.length * 30 + 30) : 190;
    body = (
      <Box sx={{ px: '14px', pt: '12px', pb: '8px', opacity: loading ? 0.6 : 1, transition: 'opacity 120ms' }}>
        <Typography
          component="div"
          sx={{ fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'text.dark' }}
        >
          {chart.headline}
        </Typography>
        <Typography component="div" sx={{ mt: '2px', fontSize: '0.8125rem', color: 'text.disabled', lineHeight: 1.4 }}>
          {chart.description}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <AnalyticsChart
            type={chart.type}
            series={chart.series}
            xAxis={chart.xAxis}
            horizontal={chart.horizontal}
            format={chart.format}
            height={height}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Panel title="Analytics" icon={<IconChartBar size={17} stroke={1.75} />} note={windowLabel} action={picker}>
      {body}
    </Panel>
  );
};

export default AnalyticsSection;
