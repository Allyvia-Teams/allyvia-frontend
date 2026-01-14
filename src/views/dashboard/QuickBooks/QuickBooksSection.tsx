import { useEffect, useState } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import ConnectToQuickBooks from './ConnectToQuickBooks';
import { ErrorSkeleton } from 'ui-component/UISkeleton';
import { Grid, Box, Typography } from '@mui/material';
import { gridSpacing, mediumWidgetHeight } from 'store/constant';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from 'utils/axios';
import { Company } from 'types/entities';
import QBWidget from './QBWidget';
import { setCompanyId } from 'utils/authStorage';
import { useSelector, useDispatch } from 'store';
import { fetchQBConnectionStatus } from 'store/slices/integrations';
import { AnalyticsAPI } from 'api/analytics.api';
import { DashboardRange } from 'ui-component/common/DashboardRangeSelector';
import { useTheme } from '@mui/material/styles';

interface QuickBooksSectionProps {
  range: DashboardRange;
}

export function QuickBooksSection({ range }: QuickBooksSectionProps) {
  const dispatch = useDispatch();
  const { currentRole } = useSelector((state) => state.auth);
  const { quickbooks } = useSelector((state) => state.integrations);
  const companyId = currentRole?.company_id || null;

  // Check connection status from Redux state
  const isConnected =
    quickbooks.connection.status === 'connected' ||
    quickbooks.connection.status === 'refreshing' ||
    quickbooks.connection.status === 'expired';

  // Fetch connection status on mount if we have a company ID
  useEffect(() => {
    if (companyId) {
      dispatch(fetchQBConnectionStatus(companyId));
    }
  }, [dispatch, companyId]);

  const connectedCompany = (data: Company[]) => {
    const connected = data.filter((d: Company) => d.is_connected_to_quickbooks)[0];
    if (connected) {
      setCompanyId(connected.id);
    }
    return connected;
  };

  const { isLoading, isError, data, error } = useQuery({
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
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected) {
      setIsLoadingSummary(true);
      setSummaryError(null);
      
      AnalyticsAPI.Dashboard.getSummary(range)
        .then((data) => {
          setDashboardSummary(data);
          setIsLoadingSummary(false);
        })
        .catch((error) => {
          // Handle 404 and other errors gracefully
          if (error?.response?.status === 404) {
            console.log('Dashboard summary endpoint not available yet');
            setSummaryError(null); // Don't show error for 404
          } else {
            console.error('Failed to fetch dashboard summary:', error);
            setSummaryError(error.message || 'Failed to load dashboard data');
          }
          setIsLoadingSummary(false);
        });
    } else {
      // Clear data when disconnected
      setDashboardSummary(null);
      setSummaryError(null);
    }
  }, [isConnected, range]);

  // Format currency values
  const formatCurrency = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return '$0';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numValue);
  };

  // Format delta percentage
  const formatDelta = (deltaPct: number | null | undefined): string => {
    if (deltaPct === null || deltaPct === undefined) return '0%';
    const sign = deltaPct > 0 ? '+' : '';
    return `${sign}${deltaPct.toFixed(1)}%`;
  };

  // Determine if we should show widgets or connect prompt
  // Show widgets only if connected (regardless of query state - 404 is expected when not connected)
  // If not connected, always show the connect prompt
  const shouldShowWidgets = isConnected;

  const theme = useTheme();

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
      title={currentRole?.company_name || "QuickBooks Pro"} 
      secondary={shouldShowWidgets && dashboardSummary ? formatPeriodInfo() : undefined}
      sx={{ width: '100%' }}
    >
      {shouldShowWidgets ? (
        <Grid container spacing={gridSpacing}>
          <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
            <QBWidget 
              title="Daily Profit" 
              widgetTheme="gold" 
              isLoading={isLoadingSummary} 
              value={formatCurrency(dashboardSummary?.dailyProfit?.value)} 
              sub={formatDelta(dashboardSummary?.dailyProfit?.deltaPct)} 
            />
          </Grid>
          <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
            <QBWidget 
              title="Daily Revenue" 
              isLoading={isLoadingSummary} 
              value={formatCurrency(dashboardSummary?.dailyRevenue?.value)} 
              sub={formatDelta(dashboardSummary?.dailyRevenue?.deltaPct)} 
            />
          </Grid>
          <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
            <QBWidget 
              title="Pending Invoices" 
              isLoading={isLoadingSummary} 
              value={formatCurrency(dashboardSummary?.pendingInvoices?.value)} 
              sub={formatDelta(dashboardSummary?.pendingInvoices?.deltaPct)} 
            />
          </Grid>
          <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
            <QBWidget 
              title="Sales Volume" 
              isLoading={isLoadingSummary} 
              value={formatCurrency(dashboardSummary?.salesVolume?.value)} 
              sub={formatDelta(dashboardSummary?.salesVolume?.deltaPct)} 
            />
          </Grid>
        </Grid>
      ) : (
        // Show connect prompt if not connected (regardless of loading/error state)
        <ConnectToQuickBooks />
      )}
    </MainCard>
  );
}
