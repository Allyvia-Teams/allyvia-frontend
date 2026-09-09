import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store/index';
import { CRMAnalyticsSecondaryCharts } from 'ui-component/analytics/crm';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';

const CrmLeadsChartsWidget: React.FC<AnalyticsWidgetProps> = ({ isLoading }) => {
  const { crmOverview, crmSources, loading } = useSelector((state: RootState) => state.analytics);

  return (
    <CRMAnalyticsSecondaryCharts
      sourcesData={crmSources ?? undefined}
      kpis={crmOverview?.kpis}
      isLoading={loading || isLoading}
      section="leads"
      sourcesLoading={crmSources?.isLoading}
    />
  );
};

export default CrmLeadsChartsWidget;
