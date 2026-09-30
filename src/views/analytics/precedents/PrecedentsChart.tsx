// The green revenue line for one month (context-graph P3).
//
// Tokens from the design mock (Allyvia-Precedence-Charts.html): a 2px smooth
// green line, no points, 250px tall, day-of-month ticks. Unlike the mock, an
// unobserved day is a GAP — `daySeries` gives ApexCharts a null, and nothing
// here may turn it into a zero. A lone observed day between two gaps would
// draw nothing at all, so it gets a discrete marker.

import { useMemo } from 'react';

import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ApexOptions } from 'apexcharts';
import Chart from 'react-apexcharts';

import { ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import ChartErrorBoundary from 'ui-component/analytics/crm/ChartErrorBoundary';
import { chartAxisColor, chartGridColor } from 'themes/chartPalette';

import { REVENUE_LINE, isolatedPoints } from './precedentsSeries';

export const CHART_HEIGHT = 250;

interface PrecedentsChartProps {
  series: (number | null)[];
  formatMoney: (value: number) => string;
}

export default function PrecedentsChart({ series, formatMoney }: PrecedentsChartProps) {
  const theme = useTheme();
  const { mode } = useConfig();
  const dark = mode === ThemeMode.DARK;
  const color = dark ? REVENUE_LINE.dark : REVENUE_LINE.light;

  const options: ApexOptions = useMemo(() => {
    const axis = chartAxisColor(theme);
    const grid = chartGridColor(theme);
    return {
      chart: {
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: theme.typography.fontFamily,
        background: 'transparent',
        animations: { enabled: false }
      },
      colors: [color],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      markers: {
        size: 0,
        hover: { size: 4 },
        discrete: isolatedPoints(series).map((dataPointIndex) => ({
          seriesIndex: 0,
          dataPointIndex,
          fillColor: color,
          strokeColor: color,
          size: 3
        }))
      },
      xaxis: {
        type: 'category',
        categories: series.map((_, i) => String(i + 1)),
        tickAmount: 8,
        labels: { rotate: 0, style: { colors: axis } },
        axisBorder: { color: grid },
        axisTicks: { color: grid },
        tooltip: { enabled: false }
      },
      yaxis: { labels: { style: { colors: axis }, formatter: (v: number) => formatMoney(v) } },
      grid: { borderColor: grid, xaxis: { lines: { show: false } } },
      legend: { show: false },
      tooltip: {
        theme: dark ? 'dark' : 'light',
        x: { formatter: (v: number | string) => `Day ${v}` },
        y: { formatter: (v: number | null) => (v === null || v === undefined ? 'No data' : formatMoney(v)) }
      }
    };
  }, [theme, dark, color, series, formatMoney]);

  return (
    <ChartErrorBoundary>
      <Box sx={{ height: CHART_HEIGHT }}>
        <Chart options={options} series={[{ name: 'Revenue', data: series }]} type="line" height={CHART_HEIGHT} />
      </Box>
    </ChartErrorBoundary>
  );
}
