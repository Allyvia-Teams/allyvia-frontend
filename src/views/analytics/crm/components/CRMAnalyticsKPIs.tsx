import React from 'react';
import { Grid, Skeleton } from '@mui/material';
import { CRMAnalyticsKPIs as CRMAnalyticsKPIsType } from 'types/analytics';
import AllyviaStats from 'ui-component/common/AllyviaStats';

interface CRMAnalyticsKPIsProps {
  kpis?: CRMAnalyticsKPIsType;
  isLoading: boolean;
}

const CRMAnalyticsKPIs: React.FC<CRMAnalyticsKPIsProps> = ({ kpis, isLoading }) => {
  if (isLoading) {
    return (
      <Grid container spacing={3}>
        {Array.from({ length: 12 }).map((_, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Skeleton variant="rectangular" height={120} />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!kpis) {
    return null;
  }

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    return `${value.toFixed(1)}%`;
  };

  const formatNumber = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    return value.toLocaleString();
  };

  const getTrend = (delta?: number): 'up' | 'down' | 'neutral' => {
    if (delta === undefined) return 'neutral';
    if (delta > 0) return 'up';
    if (delta < 0) return 'down';
    return 'neutral';
  };

  const getTheme = (delta?: number): 'success' | 'alert' | 'default' => {
    if (delta === undefined) return 'default';
    if (delta > 0) return 'success';
    if (delta < 0) return 'alert';
    return 'default';
  };

  const formatDelta = (delta?: number) => {
    if (delta === undefined) return undefined;
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)}%`;
  };

  return (
    <Grid container spacing={3}>
      {/* Pipeline Metrics */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AllyviaStats
          title="Open Pipeline Value"
          value={formatCurrency(kpis.open_pipeline_value)}
          theme={getTheme(kpis.open_pipeline_value_delta)}
          trend={getTrend(kpis.open_pipeline_value_delta)}
          size="medium"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AllyviaStats
          title="Weighted Pipeline"
          value={formatCurrency(kpis.weighted_pipeline)}
          theme={getTheme(kpis.weighted_pipeline_delta)}
          trend={getTrend(kpis.weighted_pipeline_delta)}
          size="medium"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AllyviaStats
          title="New Leads"
          value={formatNumber(kpis.new_leads)}
          theme={getTheme(kpis.new_leads_delta)}
          trend={getTrend(kpis.new_leads_delta)}
          size="medium"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AllyviaStats
          title="SQLs (Qualified Leads)"
          value={formatNumber(kpis.sqls)}
          theme={getTheme(kpis.sqls_delta)}
          trend={getTrend(kpis.sqls_delta)}
          size="medium"
        />
      </Grid>

      {/* Performance Metrics */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AllyviaStats
          title="Deals Won"
          value={formatNumber(kpis.deals_won)}
          theme={getTheme(kpis.deals_won_delta)}
          trend={getTrend(kpis.deals_won_delta)}
          size="medium"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AllyviaStats
          title="Win Rate"
          value={formatPercentage(kpis.win_rate_pct)}
          theme={getTheme(kpis.win_rate_pct_delta)}
          trend={getTrend(kpis.win_rate_pct_delta)}
          size="medium"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AllyviaStats
          title="Revenue Won"
          value={formatCurrency(kpis.revenue_won)}
          theme={getTheme(kpis.revenue_won_delta)}
          trend={getTrend(kpis.revenue_won_delta)}
          size="medium"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AllyviaStats
          title="Avg Deal Size"
          value={formatCurrency(kpis.avg_deal_size)}
          theme={getTheme(kpis.avg_deal_size_delta)}
          trend={getTrend(kpis.avg_deal_size_delta)}
          size="medium"
        />
      </Grid>

      {/* Velocity & Conversion Metrics */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AllyviaStats
          title="Sales Velocity"
          value={kpis.velocity_days !== undefined ? `${kpis.velocity_days.toFixed(0)} days` : 'N/A'}
          theme={getTheme(kpis.velocity_days_delta)}
          trend={getTrend(kpis.velocity_days_delta)}
          size="medium"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AllyviaStats
          title="Lead → SQL %"
          value={formatPercentage(kpis.lead_to_sql_pct)}
          theme={getTheme(kpis.lead_to_sql_pct_delta)}
          trend={getTrend(kpis.lead_to_sql_pct_delta)}
          size="medium"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AllyviaStats
          title="SQL → Win %"
          value={formatPercentage(kpis.sql_to_win_pct)}
          theme={getTheme(kpis.sql_to_win_pct_delta)}
          trend={getTrend(kpis.sql_to_win_pct_delta)}
          size="medium"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AllyviaStats
          title="Activities Completed"
          value={formatNumber(kpis.activities_completed)}
          theme={getTheme(kpis.activities_completed_delta)}
          trend={getTrend(kpis.activities_completed_delta)}
          size="medium"
        />
      </Grid>

      {/* Task Metrics */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AllyviaStats
          title="Overdue Tasks"
          value={formatNumber(kpis.overdue_tasks)}
          theme={getTheme(kpis.overdue_tasks_delta)}
          trend={getTrend(kpis.overdue_tasks_delta)}
          size="medium"
        />
      </Grid>
    </Grid>
  );
};

export default CRMAnalyticsKPIs;
