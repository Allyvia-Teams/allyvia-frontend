import React from 'react';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import { CRMAnalytics as CRMAnalyticsComponent } from 'ui-component/analytics/crm';

interface CRMAnalyticsProps {
  dateRange: RangeValue;
  isLoading: boolean;
}

const CRMAnalytics: React.FC<CRMAnalyticsProps> = ({ dateRange, isLoading }) => {
  return <CRMAnalyticsComponent dateRange={dateRange} isLoading={isLoading} />;
};

export default CRMAnalytics;
