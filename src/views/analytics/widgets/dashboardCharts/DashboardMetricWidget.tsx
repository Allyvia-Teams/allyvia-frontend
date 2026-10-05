import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';
import AnalyticsChart from 'views/dashboard/Analytics/AnalyticsChart';
import type { ChartData } from 'views/dashboard/Analytics/buildDashboardCharts';
import { useDashboardChartsData } from './useDashboardChartsData';

type DashboardMetricWidgetProps = AnalyticsWidgetProps & {
  chartName: string;
};

function ChartBody({ chart }: { chart: ChartData }) {
  const series = chart.secondarySeries
    ? [
        { name: chart.seriesNames[0], data: chart.data },
        { name: chart.seriesNames[1] ?? 'Comparison', data: chart.secondarySeries }
      ]
    : [{ name: chart.seriesNames[0], data: chart.data }];

  return (
    <Box sx={{ px: '14px', pt: '12px', pb: '8px' }}>
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
        <AnalyticsChart type={chart.chartType} series={series} xAxis={chart.xAxis} />
      </Box>
    </Box>
  );
}

/**
 * One metric from buildDashboardCharts. If that chart is unsupported for the
 * current payloads, show AllyviaEmpty — never a fake zero chart (ALL-103).
 */
const DashboardMetricWidget: React.FC<DashboardMetricWidgetProps> = ({ chartName, dateRange, isLoading: parentLoading }) => {
  const { charts, isLoading: chartsLoading } = useDashboardChartsData(dateRange);
  const chart = charts.find((entry) => entry.name === chartName) ?? null;
  const loading = Boolean(parentLoading || chartsLoading);

  return (
    <AllyviaEmpty
      isLoading={loading}
      isEmpty={!chart}
      type="chart"
      height={360}
      title={chartName}
      description="No data for this metric in the selected range."
    >
      {chart ? <ChartBody chart={chart} /> : null}
    </AllyviaEmpty>
  );
};

export default DashboardMetricWidget;
