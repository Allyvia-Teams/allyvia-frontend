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
  fetchCRMAnalyticsStalled
} from 'store/slices/analytics';
import { CRMAnalyticsParams } from 'types/analytics';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import CRMAnalyticsTables from './components/CRMAnalyticsTables';
import CRMAnalyticsKPIs from './components/CRMAnalyticsKPIs';
import CRMAnalyticsPrimaryCharts from './components/CRMAnalyticsPrimaryCharts';
import CRMAnalyticsSecondaryCharts from './components/CRMAnalyticsSecondaryCharts';

interface CRMAnalyticsProps {
  dateRange: RangeValue;
  isLoading: boolean;
}

const CRMAnalytics: React.FC<CRMAnalyticsProps> = ({ dateRange, isLoading: parentLoading }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [filters, setFilters] = useState<CRMAnalyticsParams>({});

  // Redux selectors
  const { crmOverview, crmPipeline, crmConversion, crmSources, crmActivities, crmDealAging, crmReps, crmStalled, loading, error } =
    useSelector((state: RootState) => state.analytics);

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
    }
  }, [dispatch, filters, parentLoading]);

  const isLoading = loading || parentLoading;

  // Active filters count removed (only date)

  return (
    <Grid container spacing={3}>
      {/* Error State */}
      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert severity="error">Failed to load CRM analytics data. Please try again.</Alert>
        </Grid>
      )}

      {/* No extra Filters UI; date range from parent controls data */}

      {/* KPIs */}
      <Grid size={{ xs: 12 }}>
        {isLoading ? (
          <Grid container spacing={3}>
            {Array.from({ length: 12 }).map((_, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                <Skeleton variant="rectangular" height={120} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <CRMAnalyticsKPIs kpis={crmOverview?.kpis} isLoading={isLoading} />
        )}
      </Grid>

      {/* Primary Charts */}
      <Grid size={{ xs: 12 }}>
        <CRMAnalyticsPrimaryCharts
          pipelineData={crmPipeline ?? undefined}
          forecastData={crmOverview?.series?.forecast_weighted ?? undefined}
          isLoading={isLoading}
        />
      </Grid>

      {/* Secondary Charts */}
      <Grid size={{ xs: 12 }}>
        <CRMAnalyticsSecondaryCharts
          conversionData={crmConversion ?? undefined}
          sourcesData={crmSources ?? undefined}
          activitiesData={crmActivities ?? undefined}
          dealAgingData={crmDealAging ?? undefined}
          repsData={crmReps ?? undefined}
          kpis={crmOverview?.kpis}
          isLoading={isLoading}
        />
      </Grid>

      {/* Tables */}
      <Grid size={{ xs: 12 }}>
        <CRMAnalyticsTables stalledData={crmStalled ?? undefined} isLoading={isLoading} />
      </Grid>

      {/* Export removed per request */}
    </Grid>
  );
};

export default CRMAnalytics;
