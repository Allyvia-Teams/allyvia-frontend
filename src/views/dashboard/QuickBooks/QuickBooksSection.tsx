import { useEffect, useState } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import { Grid, Box, Typography } from '@mui/material';
import { gridSpacing } from 'store/constant';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from 'utils/axios';
import { Company } from 'types/entities';
import QBWidget from './QBWidget';
import { setCompanyId } from 'utils/authStorage';
import { useSelector, useDispatch } from 'store';
import { fetchQBConnectionStatus, fetchSquareConnectionStatus } from 'store/slices/integrations';
import { AnalyticsAPI } from 'api/analytics.api';
import { DashboardRange } from 'ui-component/common/DashboardRangeSelector';
import { formatDeltaLabel, toNum } from 'utils/financeFormat';

interface QuickBooksSectionProps {
  range: DashboardRange;
}

export function QuickBooksSection({ range }: QuickBooksSectionProps) {
  const dispatch = useDispatch();
  const { currentRole } = useSelector((state) => state.auth);
  const companyId = currentRole?.company_id || null;

  // Fetch connection statuses on mount if we have a company ID
  useEffect(() => {
    if (companyId) {
      dispatch(fetchQBConnectionStatus(companyId));
      dispatch(fetchSquareConnectionStatus(companyId));
    }
  }, [dispatch, companyId]);

  const connectedCompany = (data: Company[]) => {
    const connected = data.filter((d: Company) => d.is_connected_to_quickbooks)[0];
    if (connected) {
      setCompanyId(connected.id);
    }
    return connected;
  };

  const { isError, error } = useQuery({
    queryKey: ['company'],
    queryFn: () => fetcher('/company/'),
    select: connectedCompany,
    retry: false // Don't retry on 404
  });

  // Handle 404 errors gracefully - they just mean QuickBooks isn't connected yet
  // Only log non-404 errors
  useEffect(() => {
    if (isError && error && (error as any)?.response?.status !== 404) {
      console.error('Error fetching company:', error);
    }
  }, [isError, error]);

  // Fetch dashboard summary data when connected
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  useEffect(() => {
    setIsLoadingSummary(true);

    AnalyticsAPI.Dashboard.getSummary(range)
      .then((summaryData) => {
        setDashboardSummary(summaryData);
        setIsLoadingSummary(false);
      })
      .catch((summaryErr) => {
        if (summaryErr?.response?.status === 404) {
          console.log('Dashboard summary endpoint not available yet');
        } else {
          console.error('Failed to fetch dashboard summary:', summaryErr);
        }
        setIsLoadingSummary(false);
      });
  }, [range]);

  // Format currency values
  const formatCurrency = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return '$0';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);
  };

  // Format delta percentage — the shared convention (utils/financeFormat):
  // em dash for new periods, neutral "No activity this period" when the value
  // is zero with a -100% delta.
  const formatDelta = (metricData?: { value?: number | string | null; deltaPct?: number | null; newPeriod?: boolean }): string =>
    formatDeltaLabel(metricData?.deltaPct, metricData?.newPeriod, toNum(metricData?.value));

  const metricTitle = (label: string) => {
    switch (range) {
      case 'today':
        return `Daily ${label}`;
      case '7d':
        return `7-Day ${label}`;
      case '30d':
        return `30-Day ${label}`;
      case 'mtd':
        return `MTD ${label}`;
      default:
        return label;
    }
  };

  // Format period information for header
  const formatPeriodInfo = () => {
    if (!dashboardSummary) return null;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{
            fontSize: '0.75rem',
            fontWeight: 400,
            lineHeight: 1.2
          }}
        >
          {dashboardSummary.windowLabel}
        </Typography>
        {dashboardSummary.asOf && (
          <Typography
            variant="caption"
            color="textSecondary"
            sx={{
              fontSize: '0.7rem',
              fontWeight: 400,
              lineHeight: 1.2,
              opacity: 0.7
            }}
          >
            as of {new Date(dashboardSummary.asOf).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <MainCard
      title={currentRole?.company_name || 'QuickBooks Pro'}
      secondary={dashboardSummary ? formatPeriodInfo() : undefined}
      sx={{ width: '100%' }}
    >
      <Grid container spacing={gridSpacing}>
        <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
          <QBWidget
            title={metricTitle('Profit')}
            widgetTheme="gold"
            isLoading={isLoadingSummary}
            value={formatCurrency(dashboardSummary?.dailyProfit?.value)}
            sub={formatDelta(dashboardSummary?.dailyProfit)}
          />
        </Grid>
        <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
          <QBWidget
            title={metricTitle('Revenue')}
            isLoading={isLoadingSummary}
            value={formatCurrency(dashboardSummary?.dailyRevenue?.value)}
            sub={formatDelta(dashboardSummary?.dailyRevenue)}
          />
        </Grid>
        <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
          <QBWidget
            title={metricTitle('Pending Invoices')}
            isLoading={isLoadingSummary}
            value={formatCurrency(dashboardSummary?.pendingInvoices?.value)}
            sub={formatDelta(dashboardSummary?.pendingInvoices)}
          />
        </Grid>
        <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
          <QBWidget
            title={metricTitle('Sales Volume')}
            isLoading={isLoadingSummary}
            value={formatCurrency(dashboardSummary?.salesVolume?.value)}
            sub={formatDelta(dashboardSummary?.salesVolume)}
          />
        </Grid>
      </Grid>
    </MainCard>
  );
}
