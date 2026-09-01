import React, { useState, useEffect } from 'react';
import { Grid, Alert } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from 'store/index';
import { CRMAnalyticsParams } from 'types/analytics';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import AnalyticsWidgetGrid from 'views/analytics/registry/AnalyticsWidgetGrid';

interface CRMAnalyticsProps {
  dateRange: RangeValue;
  isLoading: boolean;
}

const CRMAnalytics: React.FC<CRMAnalyticsProps> = ({ dateRange, isLoading: parentLoading }) => {
  const [filters, setFilters] = useState<CRMAnalyticsParams>({});
  const { error, loading } = useSelector((state: RootState) => state.analytics);
  const { crmPipeline, crmOverview } = useSelector((state: RootState) => state.analytics);

  useEffect(() => {
    if (crmPipeline) {
      console.log('📊 [CRM] Pipeline by Stage response:', crmPipeline);
    } else {
      console.log('📊 [CRM] Pipeline by Stage response: MISSING');
    }

    const forecast = crmOverview?.series?.forecast_weighted;
    if (forecast) {
      console.log('📈 [CRM] Forecast Curve response (forecast_weighted):', forecast);
    } else {
      console.log('📈 [CRM] Forecast Curve response: MISSING');
    }
  }, [crmPipeline, crmOverview?.series?.forecast_weighted]);

  useEffect(() => {
    const params: CRMAnalyticsParams = {};
    if (dateRange?.start && dateRange?.end) {
      params.start_date = dateRange.start.toString();
      params.end_date = dateRange.end.toString();
    }
    setFilters(params);
  }, [dateRange]);

  useEffect(() => {
    if (!parentLoading && Object.keys(filters).length > 0) {
      console.log('CRM Analytics: Filters updated, but thunks are handled by parent');
    }
  }, [filters, parentLoading]);

  const isLoading = loading || parentLoading;

  return (
    <Grid container spacing={4}>
      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert severity="error">Failed to load CRM analytics data. Please try again.</Alert>
        </Grid>
      )}
      <AnalyticsWidgetGrid tab="crm" dateRange={dateRange} isLoading={isLoading} spacing={4} container={false} />
    </Grid>
  );
};

export default CRMAnalytics;
