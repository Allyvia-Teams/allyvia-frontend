import React from 'react';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';
import DashboardMetricWidget from './DashboardMetricWidget';
import { DASHBOARD_CHART_NAMES } from './useDashboardChartsData';

const RevenuePerLaborHourWidget: React.FC<AnalyticsWidgetProps> = (props) => (
  <DashboardMetricWidget chartName={DASHBOARD_CHART_NAMES.revenuePerLaborHour} {...props} />
);

export default RevenuePerLaborHourWidget;
