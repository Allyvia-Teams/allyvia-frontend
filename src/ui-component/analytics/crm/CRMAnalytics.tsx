import React, { useState, useEffect } from 'react';
import { Grid, Alert, Skeleton } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from 'store/index';
import {
  fetchCRMAnalyticsOverview,
  fetchCRMAnalyticsPipeline,
  fetchCRMAnalyticsConversion,
  fetchCRMAnalyticsSources,
  fetchCRMAnalyticsActivities,
  fetchCRMAnalyticsDealAging,
  fetchCRMAnalyticsReps,
  fetchCRMAnalyticsStalled,
  fetchCRMRepPerformance
} from 'store/slices/analytics';
import { CRMAnalyticsParams } from 'types/analytics';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import {
  CRMAnalyticsTables,
  CRMAnalyticsKPIs,
  CRMAnalyticsPrimaryCharts,
  CRMAnalyticsSecondaryCharts,
  CRMRepPerformance
} from 'ui-component/analytics/crm';
import { useSelector as useReduxSelector } from 'react-redux';

interface CRMAnalyticsProps {
  dateRange: RangeValue;
  isLoading: boolean;
}

const CRMAnalytics: React.FC<CRMAnalyticsProps> = ({ dateRange, isLoading: parentLoading }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [filters, setFilters] = useState<CRMAnalyticsParams>({});

  // Redux selectors
  const {
    crmOverview,
    crmPipeline,
    crmConversion,
    crmSources,
    crmActivities,
    crmDealAging,
    crmReps,
    crmStalled,
    crmRepPerformance,
    loading,
    error
  } = useSelector((state: RootState) => state.analytics);

  // Current company id from auth
  const currentRole = useReduxSelector((state: any) => state.auth?.currentRole);

  // Only derive filters from the provided dateRange
  useEffect(() => {
    const params: CRMAnalyticsParams = {};
    if (dateRange?.start && dateRange?.end) {
      params.start_date = dateRange.start.toString();
      params.end_date = dateRange.end.toString();
    }
    setFilters(params);
  }, [dateRange]);

  // No other filters; only date drives data

  // Dispatch CRM thunks when filters change
  useEffect(() => {
    if (!parentLoading && Object.keys(filters).length > 0) {
      dispatch(fetchCRMAnalyticsOverview(filters));
      dispatch(fetchCRMAnalyticsPipeline(filters));
      dispatch(fetchCRMAnalyticsConversion(filters));
      dispatch(fetchCRMAnalyticsSources(filters));
      dispatch(fetchCRMAnalyticsActivities({ ...filters, bucket: 'week' }));
      dispatch(fetchCRMAnalyticsDealAging(filters));
      dispatch(fetchCRMAnalyticsReps(filters));
      dispatch(fetchCRMAnalyticsStalled({ ...filters, days_no_activity: 14, min_value: 0 }));

      // Rep Performance endpoint expects datetime start/end and company_id
      const company_id: string | undefined = currentRole?.company_id;
      if (company_id && dateRange?.start && dateRange?.end) {
        const startDate = dateRange.start.toString();
        const endDate = dateRange.end.toString();
        const start = `${startDate}T00:00:00Z`;
        const end = `${endDate}T23:59:59Z`;
        dispatch(fetchCRMRepPerformance({ company_id, start, end } as any));
      }
    }
  }, [dispatch, filters, parentLoading]);

  const isLoading = loading || parentLoading;

  // Active filters count removed (only date)

  return (
    <Grid container spacing={4}>
      {/* Error State */}
      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert severity="error">Failed to load CRM analytics data. Please try again.</Alert>
        </Grid>
      )}

      {/* Section 1: Pipeline Health */}
      <Grid size={{ xs: 12 }}>
        <CRMAnalyticsKPIs kpis={crmOverview?.kpis} isLoading={isLoading} section="pipeline" />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <CRMAnalyticsPrimaryCharts
          pipelineData={crmPipeline ?? undefined}
          forecastData={crmOverview?.series?.forecast_weighted ?? undefined}
          isLoading={isLoading}
        />
      </Grid>

      {/* Section 2: Sales Performance */}
      <Grid size={{ xs: 12 }}>
        <CRMAnalyticsKPIs kpis={crmOverview?.kpis} isLoading={isLoading} section="performance" />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <CRMAnalyticsSecondaryCharts
          conversionData={crmConversion ?? undefined}
          repsData={crmReps ?? undefined}
          kpis={crmOverview?.kpis}
          isLoading={isLoading}
          section="performance"
        />
      </Grid>

      {/* Rep Performance (Leaderboard + charts) */}
      <Grid size={{ xs: 12 }}>
        <CRMRepPerformance data={crmRepPerformance ?? undefined} isLoading={isLoading} />
      </Grid>

      {/* Section 3: Lead Quality */}
      <Grid size={{ xs: 12 }}>
        <CRMAnalyticsKPIs kpis={crmOverview?.kpis} isLoading={isLoading} section="leads" />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <CRMAnalyticsSecondaryCharts sourcesData={crmSources ?? undefined} kpis={crmOverview?.kpis} isLoading={isLoading} section="leads" />
      </Grid>

      {/* Section 4: Activity & Tasks */}
      <Grid size={{ xs: 12 }}>
        <CRMAnalyticsKPIs kpis={crmOverview?.kpis} isLoading={isLoading} section="activity" />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <CRMAnalyticsSecondaryCharts
          activitiesData={crmActivities ?? undefined}
          dealAgingData={crmDealAging ?? undefined}
          kpis={crmOverview?.kpis}
          isLoading={isLoading}
          section="activity"
        />
      </Grid>

      {/* Section 5: Action Items */}
      <Grid size={{ xs: 12 }}>
        <CRMAnalyticsTables stalledData={crmStalled ?? undefined} isLoading={isLoading} />
      </Grid>
    </Grid>
  );
};

export default CRMAnalytics;
