import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

// material-ui
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';

// project imports
import { PanelMessage } from 'ui-component/frame';
import { chartAxisColor, chartGridColor } from 'themes/chartPalette';
import { formatMoney, type Point } from '../analyticsPage';

export interface ChartSeries {
  name: string;
  /** A null amount is unknown and draws as a gap (bank mode outside expense coverage). */
  points: Array<Omit<Point, 'amount'> & { amount: number | null }>;
  color: string;
  dashed?: boolean;
}

interface MoneyChartProps {
  kind: 'line' | 'bar';
  series: ChartSeries[];
  /** Category labels for a bar chart (weekdays); dates otherwise. */
  categories?: string[];
  loading?: boolean;
  error?: boolean;
  currency?: string;
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export default function MoneyChart({ kind, series, categories, loading, error, currency = 'USD' }: MoneyChartProps) {
  const theme = useTheme();
  const axis = chartAxisColor(theme);
  const grid = chartGridColor(theme);
  const labels = useMemo(() => categories ?? (series[0]?.points ?? []).map((p) => shortDate(p.date)), [categories, series]);

  const options: ApexOptions = useMemo(
    () => ({
      chart: {
        type: kind,
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: theme.typography.fontFamily,
        animations: { enabled: false }
      },
      colors: series.map((s) => s.color),
      stroke: kind === 'line' ? { width: 2.5, curve: 'straight', dashArray: series.map((s) => (s.dashed ? 6 : 0)) } : { width: 0 },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      dataLabels: { enabled: false },
      legend: { position: 'top', horizontalAlign: 'left', labels: { colors: axis }, fontSize: '13px', markers: { size: 6 } },
      grid: { borderColor: grid, strokeDashArray: 0, padding: { left: 8, right: 8 } },
      xaxis: {
        categories: labels,
        tickAmount: Math.min(labels.length, 8),
        labels: { style: { colors: axis, fontSize: '12px' }, rotate: 0, hideOverlappingLabels: true },
        axisBorder: { color: grid },
        axisTicks: { show: false }
      },
      yaxis: { labels: { style: { colors: axis, fontSize: '12px' }, formatter: (v: number) => formatMoney(v, currency) } },
      tooltip: { theme: theme.palette.mode, y: { formatter: (v: number) => formatMoney(v, currency) } }
    }),
    [kind, series, labels, axis, grid, theme, currency]
  );

  if (loading) {
    return (
      <Box sx={{ p: '14px' }}>
        <Skeleton variant="rounded" height={280} />
      </Box>
    );
  }
  if (error) return <PanelMessage>Couldn't load the chart. Try another period or refresh the page.</PanelMessage>;
  if (!series.some((s) => s.points.some((p) => (p.amount ?? 0) !== 0))) {
    return <PanelMessage>No sales or money out in this period.</PanelMessage>;
  }
  return (
    <Box sx={{ px: '6px', pt: 1 }}>
      <Chart
        type={kind}
        width="100%"
        height={300}
        options={options}
        series={series.map((s) => ({
          name: s.name,
          data: s.points.map((p) => (p.amount === null ? null : Math.round(p.amount * 100) / 100))
        }))}
      />
    </Box>
  );
}
