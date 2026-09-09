import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store/index';
import { CRMRepPerformance } from 'ui-component/analytics/crm';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';

const CrmRepPerformanceWidget: React.FC<AnalyticsWidgetProps> = ({ isLoading }) => {
  const { crmRepPerformance, loading } = useSelector((state: RootState) => state.analytics);

  return <CRMRepPerformance data={crmRepPerformance ?? undefined} isLoading={loading || isLoading} />;
};

export default CrmRepPerformanceWidget;
