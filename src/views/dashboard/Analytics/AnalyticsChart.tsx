// material-ui
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';

// third party
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

// ==============================|| DASHBOARD - ANALYTICS CHART ||============================== //
// Design handoff 1.3 "Chart": 170px tall, bars with a 3px top radius, the
// primary series in primary.main and the comparison series at 28%.

export interface AnalyticsChartProps {
  type: 'bar' | 'line';
  series: { name: string; data: number[]; dashed?: boolean }[];
  xAxis: string[];
  height?: number;
  /** Horizontal bars (ranked lists such as best sellers). */
  horizontal?: boolean;
  /** Explicit value format; when omitted it is inferred from the series names (legacy callers). */
  format?: 'money' | 'moneyPerHour' | 'number';
}

export default function AnalyticsChart({ type, series, xAxis, height = 190, horizontal = false, format }: AnalyticsChartProps) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const money = (value: number) => `$${Math.round(value).toLocaleString()}`;
  const resolved = format ?? (series.some((s) => /turnover|per hour/i.test(s.name)) ? 'number' : 'money');
  const isMoney = resolved !== 'number';
  const suffix = resolved === 'moneyPerHour' ? '/hr' : '';
  const shortMoney = (value: number) =>
    (Math.abs(value) >= 1000 ? `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : money(value)) + suffix;
  const axisFormat = (value: number) => (isMoney ? shortMoney(value) : value.toFixed(1));
  const dashArray = series.map((s) => (s.dashed ? 5 : 0));
  const labelStyle = { fontSize: '12px', colors: theme.palette.text.disabled };

  const options: ApexOptions = {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
      fontFamily: 'inherit',
      parentHeightOffset: 0
    },
    colors: [primary, alpha(primary, 0.28)],
    stroke: { width: type === 'line' ? 2 : 0, curve: 'smooth', dashArray: type === 'line' ? dashArray : 0 },
    plotOptions: {
      bar: {
        horizontal,
        borderRadius: 3,
        borderRadiusApplication: 'end',
        columnWidth: series.length > 1 ? '55%' : '40%',
        barHeight: '62%'
      }
    },
    dataLabels: { enabled: false },
    legend: {
      show: series.length > 1,
      position: 'top',
      horizontalAlign: 'left',
      fontSize: '12px',
      markers: { size: 5 },
      itemMargin: { horizontal: 8 }
    },
    xaxis: {
      categories: xAxis,
      axisBorder: { show: false },
      axisTicks: { show: false },
      tickAmount: horizontal ? 3 : undefined,
      labels: horizontal
        ? { style: labelStyle, formatter: (value: string) => axisFormat(Number(value)) }
        : { style: labelStyle, rotate: 0, hideOverlappingLabels: true }
    },
    yaxis: {
      labels: horizontal ? { style: labelStyle, maxWidth: 180 } : { style: labelStyle, formatter: (value: number) => axisFormat(value) },
      tickAmount: horizontal ? undefined : 3
    },
    grid: {
      borderColor: theme.palette.grey[100],
      strokeDashArray: 0,
      padding: { left: 4, right: 4 },
      xaxis: { lines: { show: horizontal } },
      yaxis: { lines: { show: !horizontal } }
    },
    tooltip: {
      theme: theme.palette.mode,
      shared: type === 'line' && series.length > 1,
      intersect: false,
      y: { formatter: (value: number) => (isMoney ? money(value) + suffix : value.toFixed(2)) }
    },
    fill: { type: 'solid' }
  };

  return (
    <Box sx={{ height, '& .apexcharts-canvas': { fontFamily: 'inherit' } }}>
      <Chart height={height} options={options} type={type} series={series} key={`${type}-${horizontal ? 'h' : 'v'}-${series.length}`} />
    </Box>
  );
}
