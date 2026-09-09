import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store/index';
import { CRMAnalyticsSecondaryCharts } from 'ui-component/analytics/crm';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';

const CrmActivityChartsWidget: React.FC<AnalyticsWidgetProps> = ({ isLoading }) => {
  const { crmOverview, crmActivities, crmDealAging, loading } = useSelector((state: RootState) => state.analytics);

  return (
    <CRMAnalyticsSecondaryCharts
      activitiesData={crmActivities ?? undefined}
      dealAgingData={crmDealAging ?? undefined}
      kpis={crmOverview?.kpis}
      isLoading={loading || isLoading}
      section="activity"
      activitiesLoading={crmActivities?.isLoading}
      dealAgingLoading={crmDealAging?.isLoading}
    />
  );
};

export default CrmActivityChartsWidget;
