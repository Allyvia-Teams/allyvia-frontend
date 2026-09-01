import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { KpiCards } from 'ui-component/analytics/overview';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';

const OverviewKpiCardsWidget: React.FC<AnalyticsWidgetProps> = ({ isLoading }) => {
  const { summary, loading } = useSelector((state: RootState) => state.analytics);

  return <KpiCards data={summary} loading={loading || isLoading} />;
};

export default OverviewKpiCardsWidget;
