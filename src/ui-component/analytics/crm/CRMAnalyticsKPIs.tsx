import React from 'react';
import { Grid, Skeleton, Typography, Box } from '@mui/material';
import { CRMAnalyticsKPIs as CRMAnalyticsKPIsType } from 'types/analytics';
import AllyviaStats from 'ui-component/common/AllyviaStats';

interface CRMAnalyticsKPIsProps {
  kpis?: CRMAnalyticsKPIsType;
  isLoading: boolean;
  section?: 'pipeline' | 'performance' | 'leads' | 'activity';
}

const CRMAnalyticsKPIs: React.FC<CRMAnalyticsKPIsProps> = ({ kpis, isLoading, section }) => {
  if (isLoading) {
    return (
      <Grid container spacing={3}>
        {Array.from({ length: 4 }).map((_, index) => (
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

  const formatCurrency = (value?: number | string) => {
    if (value === undefined || value === null) return 'N/A';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);
  };

  const formatPercentage = (value?: number) => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return `${value.toFixed(1)}%`;
  };

  const formatNumber = (value?: number) => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return value.toLocaleString();
  };

  // Backend does not provide deltas currently; keep neutral theme
  const getTheme = (): 'success' | 'alert' | 'default' => 'default';

  const getSectionTitle = () => {
    switch (section) {
      case 'pipeline':
        return 'Pipeline Health';
      case 'performance':
        return 'Sales Performance';
      case 'leads':
        return 'Lead Quality';
      case 'activity':
        return 'Activity & Tasks';
      default:
        return 'CRM Analytics';
    }
  };

  const getSectionKPIs = () => {
    switch (section) {
      case 'pipeline':
        return [
          { title: 'Open Pipeline Value', value: formatCurrency(kpis.open_pipeline_value), theme: getTheme() },
          { title: 'Weighted Pipeline', value: formatCurrency(kpis.weighted_pipeline), theme: getTheme() },
          { title: 'New Leads', value: formatNumber(kpis.new_leads), theme: getTheme() },
          { title: 'SQLs (Qualified Leads)', value: formatNumber(kpis.sqls), theme: getTheme() }
        ];
      case 'performance':
        return [
          { title: 'Deals Won', value: formatNumber(kpis.deals_won), theme: getTheme() },
          { title: 'Win Rate', value: formatPercentage(kpis.win_rate_pct), theme: getTheme() },
          { title: 'Revenue Won', value: formatCurrency(kpis.revenue_won), theme: getTheme() },
          { title: 'Avg Deal Size', value: formatCurrency(kpis.avg_deal_size), theme: getTheme() }
        ];
      case 'leads':
        return [
          { title: 'Total Leads', value: formatNumber(kpis.new_leads), theme: getTheme() },
          { title: 'Qualified Leads', value: formatNumber(kpis.sqls), theme: getTheme() },
          { title: 'Lead to SQL Rate', value: formatPercentage(kpis.lead_to_sql_pct), theme: getTheme() },
          { title: 'SQL to Win Rate', value: formatPercentage(kpis.sql_to_win_pct), theme: getTheme() }
        ];
      case 'activity':
        return [
          { title: 'Activities Completed', value: formatNumber(kpis.activities_completed), theme: getTheme() },
          { title: 'Overdue Tasks', value: formatNumber(kpis.overdue_tasks), theme: getTheme() },
          { title: 'Velocity (Days)', value: `${kpis.velocity_days} days`, theme: getTheme() },
          { title: 'Revenue Won', value: formatCurrency(kpis.revenue_won), theme: getTheme() }
        ];
      default:
        return [];
    }
  };

  const sectionKPIs = getSectionKPIs();

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: 'primary.main' }}>
        {getSectionTitle()}
      </Typography>
      <Grid container spacing={3}>
        {sectionKPIs.map((kpi, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default CRMAnalyticsKPIs;
