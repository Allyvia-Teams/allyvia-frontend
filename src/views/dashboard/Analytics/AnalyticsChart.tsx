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
  series: { name: string; data: number[] }[];
  xAxis: string[];
  height?: number;
}

export default function AnalyticsChart({ type, series, xAxis, height = 190 }: AnalyticsChartProps) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const money = (value: number) => `$${Math.round(value).toLocaleString()}`;
  const isMoney = !series.some((s) => /turnover|per hour/i.test(s.name));

  const options: ApexOptions = {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
      fontFamily: 'inherit',
      parentHeightOffset: 0
    },
    colors: [primary, alpha(primary, 0.28)],
    stroke: { width: type === 'line' ? 2 : 0, curve: 'smooth' },
    plotOptions: { bar: { borderRadius: 3, borderRadiusApplication: 'end', columnWidth: series.length > 1 ? '55%' : '40%' } },
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
      labels: { style: { fontSize: '12px', colors: theme.palette.text.disabled }, rotate: 0, hideOverlappingLabels: true }
    },
    yaxis: {
      labels: {
        style: { fontSize: '12px', colors: theme.palette.text.disabled },
        formatter: (value: number) =>
          isMoney ? (Math.abs(value) >= 1000 ? `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : money(value)) : value.toFixed(1)
      },
      tickAmount: 3
    },
    grid: { borderColor: theme.palette.grey[100], strokeDashArray: 0, padding: { left: 4, right: 4 }, xaxis: { lines: { show: false } } },
    tooltip: { theme: theme.palette.mode, y: { formatter: (value: number) => (isMoney ? money(value) : value.toFixed(2)) } },
    fill: { type: 'solid' }
  };

  return (
    <Box sx={{ height, '& .apexcharts-canvas': { fontFamily: 'inherit' } }}>
      <Chart height={height} options={options} type={type} series={series} key={`${type}-${series.length}`} />
    </Box>
  );
}
