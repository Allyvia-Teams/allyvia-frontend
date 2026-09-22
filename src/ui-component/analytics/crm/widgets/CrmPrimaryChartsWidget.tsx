import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store/index';
import { CRMAnalyticsPrimaryCharts } from 'ui-component/analytics/crm';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';

const CrmPrimaryChartsWidget: React.FC<AnalyticsWidgetProps> = ({ isLoading }) => {
  const { crmOverview, crmPipeline, crmOverviewLoading, crmPipelineLoading, loading } = useSelector((state: RootState) => state.analytics);

  return (
    <CRMAnalyticsPrimaryCharts
      pipelineData={crmPipeline ?? undefined}
      forecastData={crmOverview?.series?.forecast_weighted ?? undefined}
      isLoading={loading || isLoading}
      pipelineLoading={crmPipelineLoading}
      overviewLoading={crmOverviewLoading}
    />
  );
};

export default CrmPrimaryChartsWidget;
