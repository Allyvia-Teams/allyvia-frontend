// views/inventory/InsightsChart.tsx
//
// One chart for every inventory insights panel.
//
// It is AnalyticsChart.tsx's shape — react-apexcharts, `chartSeriesPalette`,
// heights from `store/constant`, `key={type}` so a type switch remounts rather
// than half-morphs — plus the three things that component lacks and these
// screens need:
//
//   1. AXIS AND GRID THEMING (`chartAxisColor` / `chartGridColor`) and
//      `tooltip: { theme: mode }`, lifted from TotalGrowthBarChart. Without
//      them a dark-mode reader gets black axis labels on a dark card and a
//      white tooltip box — the CRMAnalyticsPrimaryCharts anti-pattern, where a
//      hard-coded `background: white` makes the tooltip invisible.
//   2. A ChartErrorBoundary INSIDE, not around, so no caller can forget it.
//      Every series here is built from a loosely-typed analytics payload.
//   3. NEGATIVE VALUES DRAWN AS NEGATIVES. Sell-through, margins, GMROI and
//      velocity can all be below zero on these endpoints, so the y-axis is never
//      floored at 0: a bar that should hang below the axis would otherwise sit
//      flat on it and read as "no sales" instead of "sold and came back".
//
// No `width` is ever passed — charts fill their Grid parent. Only `height`.

import { useMemo } from 'react';

import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ApexOptions } from 'apexcharts';
import Chart from 'react-apexcharts';

import { ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import { largeWidgetHeight } from 'store/constant';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import ChartErrorBoundary from 'ui-component/analytics/crm/ChartErrorBoundary';
import { chartAxisColor, chartGridColor, chartSeriesPalette } from 'themes/chartPalette';

export interface InsightsChartSeries {
  name: string;
  data: number[];
}

export interface InsightsChartProps {
  type: 'bar' | 'line' | 'area';
  series: InsightsChartSeries[];
  categories: string[];
  height?: number;
  /** Bars along the x-axis — the readable form for long style and colour names. */
  horizontal?: boolean;
  stacked?: boolean;
  /** Formats the y-axis and the tooltip. Pass the same formatter the table uses. */
  valueFormatter?: (value: number) => string;
  isLoading?: boolean;
  /** Loaded, and there is genuinely nothing to draw — a different claim to loading. */
  isEmpty?: boolean;
  emptyMessage?: string;
  /** Printed under the chart: the window, or why some rows are not on it. */
  footnote?: string;
}

export default function InsightsChart({
  type,
  series,
  categories,
  height = largeWidgetHeight,
  horizontal = false,
  stacked = false,
  valueFormatter,
  isLoading = false,
  isEmpty = false,
  emptyMessage,
  footnote
}: InsightsChartProps) {
  const theme = useTheme();
  const { mode } = useConfig();

  const options: ApexOptions = useMemo(() => {
    const axis = chartAxisColor(theme);
    const grid = chartGridColor(theme);
    const format = valueFormatter ? (value: number) => valueFormatter(value) : undefined;

    return {
      chart: {
        toolbar: { show: false },
        zoom: { enabled: false },
        stacked,
        fontFamily: theme.typography.fontFamily,
        background: 'transparent'
      },
      colors: chartSeriesPalette(theme),
      dataLabels: { enabled: false },
      plotOptions: { bar: { horizontal, borderRadius: 3, columnWidth: '60%' } },
      stroke: type === 'line' ? { curve: 'smooth', width: 2 } : { show: false },
      xaxis: {
        type: 'category',
        categories,
        labels: { style: { colors: axis } },
        axisBorder: { color: grid },
        axisTicks: { color: grid }
      },
      yaxis: {
        // Deliberately no `min: 0`. A negative sell-through or gross margin is
        // real data on these endpoints, and a floored axis draws a loss as a
        // flat bar sitting on zero.
        labels: { style: { colors: axis }, formatter: format }
      },
      grid: { borderColor: grid },
      fill: { type: 'solid' },
      legend: { labels: { colors: axis }, fontFamily: theme.typography.fontFamily },
      // Follows the app's theme toggle; a fixed light tooltip is unreadable on a
      // dark card and is the exact bug shipped in CRMAnalyticsPrimaryCharts.
      tooltip: { theme: mode === ThemeMode.DARK ? 'dark' : 'light', y: format ? { formatter: format } : undefined }
    };
  }, [theme, mode, categories, horizontal, stacked, type, valueFormatter]);

  return (
    <Box>
      <AllyviaEmpty
        isLoading={isLoading}
        isEmpty={!isLoading && isEmpty}
        type="chart"
        height={height}
        title="Nothing to chart"
        description={emptyMessage ?? 'No figures for this window.'}
      >
        <ChartErrorBoundary>
          <Box sx={{ height }}>
            <Chart options={options} series={series} type={type} height={height} key={`${type}-${horizontal}`} />
          </Box>
        </ChartErrorBoundary>
      </AllyviaEmpty>
      {footnote && !isLoading && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {footnote}
        </Typography>
      )}
    </Box>
  );
}
