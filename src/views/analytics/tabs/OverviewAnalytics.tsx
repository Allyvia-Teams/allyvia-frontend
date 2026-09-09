import React from 'react';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import AnalyticsWidgetGrid from '../registry/AnalyticsWidgetGrid';

interface OverviewAnalyticsProps {
  dateRange: RangeValue;
  isLoading: boolean;
}

const OverviewAnalytics: React.FC<OverviewAnalyticsProps> = ({ dateRange, isLoading }) => {
  return <AnalyticsWidgetGrid tab="overview" dateRange={dateRange} isLoading={isLoading} />;
};

export default OverviewAnalytics;
