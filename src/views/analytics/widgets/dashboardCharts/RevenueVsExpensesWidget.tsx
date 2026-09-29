import React from 'react';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';
import DashboardMetricWidget from './DashboardMetricWidget';
import { DASHBOARD_CHART_NAMES } from './useDashboardChartsData';

const RevenueVsExpensesWidget: React.FC<AnalyticsWidgetProps> = (props) => (
  <DashboardMetricWidget chartName={DASHBOARD_CHART_NAMES.revenueVsExpenses} {...props} />
);

export default RevenueVsExpensesWidget;
