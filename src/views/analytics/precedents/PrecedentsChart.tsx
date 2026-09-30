// The precedents month chart (context-graph P3 + P4).
//
// Tokens from the design mock (Allyvia-Precedence-Charts.html): a 2px smooth
// green revenue line on the left axis; the blue season-relative weather score
// on a right-hand 0–10 axis, its forecast dashed; spend windows as a light
// purple band with a 4px bar; holidays as thin purple marks. Unlike the mock,
// an unobserved day and an unscored day are GAPS — both series arrive with
// nulls, and nothing here may turn one into a zero. A lone point between two
// gaps would draw nothing, so it gets a discrete marker.

import { useMemo } from 'react';

import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ApexOptions } from 'apexcharts';
import Chart from 'react-apexcharts';

import { ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import ChartErrorBoundary from 'ui-component/analytics/crm/ChartErrorBoundary';
import { chartAxisColor, chartGridColor } from 'themes/chartPalette';

import { HOLIDAY, WEATHER_LINE, type DayRange, type WeatherSeries } from './precedentsOverlays';
import { REVENUE_LINE, isolatedPoints } from './precedentsSeries';

export const CHART_HEIGHT = 250;

interface PrecedentsChartProps {
  series: (number | null)[];
  formatMoney: (value: number) => string;
  weather?: WeatherSeries | null;
  windows?: DayRange[];
  holidays?: { day: number; name: string }[];
}

export default function PrecedentsChart({ series, formatMoney, weather = null, windows = [], holidays = [] }: PrecedentsChartProps) {
  const theme = useTheme();
  const { mode } = useConfig();
  const dark = mode === ThemeMode.DARK;
  const revenue = dark ? REVENUE_LINE.dark : REVENUE_LINE.light;
  const sky = dark ? WEATHER_LINE.dark : WEATHER_LINE.light;
  const purple = dark ? HOLIDAY.dark : HOLIDAY.light;
  const showWeather = !!weather?.hasAny;

  // A month with no observed revenue draws no revenue axis — "$0 … $6" over
  // an empty series would be a scale for nothing.
  const showRevenue = series.some((v) => v !== null);
  const chartSeries = useMemo(() => {
    const out: { name: string; data: (number | null)[] }[] = showRevenue ? [{ name: 'Revenue', data: series }] : [];
    if (showWeather && weather) {
      out.push({ name: 'Weather score', data: weather.actual });
      if (weather.hasForecast) out.push({ name: 'Forecast weather', data: weather.forecast });
    }
    return out;
  }, [series, weather, showWeather, showRevenue]);

  const options: ApexOptions = useMemo(() => {
    const axis = chartAxisColor(theme);
    const grid = chartGridColor(theme);
    const categories = series.map((_, i) => String(i + 1));
    const weatherNames = chartSeries.filter((s) => s.name !== 'Revenue').map((s) => s.name);
    return {
      chart: {
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: theme.typography.fontFamily,
        background: 'transparent',
        animations: { enabled: false }
      },
      colors: showRevenue ? [revenue, sky, sky] : [sky, sky],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: [2, 2, 2], dashArray: showRevenue ? [0, 0, 5] : [0, 5] },
      markers: {
        size: 0,
        hover: { size: 4 },
        discrete: (showRevenue ? isolatedPoints(series) : []).map((dataPointIndex) => ({
          seriesIndex: 0,
          dataPointIndex,
          fillColor: revenue,
          strokeColor: revenue,
          size: 3
        }))
      },
      xaxis: {
        type: 'category',
        categories,
        tickAmount: 8,
        labels: { rotate: 0, style: { colors: axis } },
        axisBorder: { color: grid },
        axisTicks: { color: grid },
        tooltip: { enabled: false }
      },
      yaxis: [
        ...(showRevenue ? [{ seriesName: 'Revenue', labels: { style: { colors: axis }, formatter: (v: number) => formatMoney(v) } }] : []),
        ...(weatherNames.length
          ? [
              {
                seriesName: weatherNames,
                opposite: showRevenue,
                min: 0,
                max: 10,
                tickAmount: 5,
                labels: { style: { colors: axis }, formatter: (v: number) => (Number.isFinite(v) ? v.toFixed(0) : '') }
              }
            ]
          : [])
      ],
      grid: { borderColor: grid, xaxis: { lines: { show: false } } },
      legend: { show: false },
      annotations: {
        xaxis: [
          ...windows.map((w) => ({
            x: String(w.from),
            x2: String(w.to),
            fillColor: purple,
            opacity: 0.08,
            borderColor: purple,
            label: {
              text: w.name,
              orientation: 'horizontal',
              position: 'top',
              // Anchored INSIDE the band: centred on its left edge, a window
              // starting on day 1 collided with the top y-axis label.
              textAnchor: 'start',
              offsetX: 6,
              borderColor: 'transparent',
              style: { background: 'transparent', color: purple, fontSize: '11px' }
            }
          })),
          ...holidays.map((h) => ({
            x: String(h.day),
            borderColor: purple,
            strokeDashArray: 3,
            opacity: 0.5,
            label: {
              text: h.name,
              orientation: 'vertical',
              borderColor: 'transparent',
              style: { background: 'transparent', color: purple, fontSize: '10px' }
            }
          }))
        ]
      },
      tooltip: {
        shared: true,
        theme: dark ? 'dark' : 'light',
        x: { formatter: (v: number | string) => `Day ${v}` },
        y: {
          formatter: (v: number | null, opts?: { seriesIndex?: number }) => {
            if (v === null || v === undefined) return 'No data';
            return opts?.seriesIndex || !showRevenue ? `${v.toFixed(1)} / 10` : formatMoney(v);
          }
        }
      }
    };
  }, [theme, dark, revenue, sky, purple, series, chartSeries, windows, holidays, formatMoney, showRevenue]);

  return (
    <ChartErrorBoundary>
      <Box sx={{ height: CHART_HEIGHT }}>
        <Chart options={options} series={chartSeries} type="line" height={CHART_HEIGHT} />
      </Box>
    </ChartErrorBoundary>
  );
}
