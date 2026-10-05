import React from 'react';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';
import DashboardMetricWidget from './DashboardMetricWidget';
import { DASHBOARD_CHART_NAMES } from './useDashboardChartsData';

const ReceivablesByAgeWidget: React.FC<AnalyticsWidgetProps> = (props) => (
  <DashboardMetricWidget chartName={DASHBOARD_CHART_NAMES.receivablesByAge} {...props} />
);

export default ReceivablesByAgeWidget;
