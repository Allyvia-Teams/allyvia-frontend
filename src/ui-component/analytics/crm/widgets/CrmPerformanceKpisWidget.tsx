import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store/index';
import { CRMAnalyticsKPIs } from 'ui-component/analytics/crm';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';

const CrmPerformanceKpisWidget: React.FC<AnalyticsWidgetProps> = ({ isLoading }) => {
  const { crmOverview, loading } = useSelector((state: RootState) => state.analytics);

  return <CRMAnalyticsKPIs kpis={crmOverview?.kpis} isLoading={loading || isLoading} section="performance" />;
};

export default CrmPerformanceKpisWidget;
