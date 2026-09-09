import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store/index';
import { CRMAnalyticsSecondaryCharts } from 'ui-component/analytics/crm';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';

const CrmPerformanceChartsWidget: React.FC<AnalyticsWidgetProps> = ({ isLoading }) => {
  const { crmOverview, crmConversion, crmReps, loading } = useSelector((state: RootState) => state.analytics);

  return (
    <CRMAnalyticsSecondaryCharts
      conversionData={crmConversion ?? undefined}
      repsData={crmReps ?? undefined}
      kpis={crmOverview?.kpis}
      isLoading={loading || isLoading}
      section="performance"
      conversionLoading={crmConversion?.isLoading}
      repsLoading={crmReps?.isLoading}
    />
  );
};

export default CrmPerformanceChartsWidget;
