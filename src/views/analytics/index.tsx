import React, { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Grid, Box, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { parseDate, today, getLocalTimeZone } from '@internationalized/date';
import { RootState, useDispatch } from 'store';
import {
  fetchAnalyticsSummary,
  fetchRevenueSeries,
  fetchExpenseBreakdown,
  fetchPaymentsSplit,
  fetchTopItems,
  fetchLowStock,
  fetchTimeUtilization,
  setFilters
} from 'store/slices/analytics';
import { AllyviaDateRangePicker, RangeValue } from 'ui-component/third-party/DateRangePicker';
import AnalyticsDownloadButton from './components/AnalyticsDownloadButton';
import KpiCards from '../tabs/KpiCards';
import RevenueTrend from '../tabs/RevenueTrend';
import ExpenseBreakdown from '../tabs/ExpenseBreakdown';
import PaymentsByProvider from '../tabs/PaymentsByProvider';
import TopItems from '../tabs/TopItems';
import LowStock from '../tabs/LowStock';
import TimeUtilization from '../tabs/TimeUtilization';
import { AnalyticsParams } from 'types/analytics';

// Feature flag
const EXCLUDE_CRM_ANALYTICS = import.meta.env.VITE_EXCLUDE_CRM_ANALYTICS === 'true';

// Date defaults - Use current month range
const LAST_WEEK = today(getLocalTimeZone()).subtract({ weeks: 1 });
const TODAY = today(getLocalTimeZone());

// map DateValue → ISO (YYYY-MM-DD)
const toISO = (dv?: any) => {
  if (!dv) return undefined;
  const y = String(dv.year).padStart(4, '0');
  const m = String(dv.month).padStart(2, '0');
  const d = String(dv.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const Analytics: React.FC = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dateRange, setDateRange] = React.useState<RangeValue>({ start: LAST_WEEK, end: TODAY });

  const { loading, error, filters, summary } = useSelector((state: RootState) => state.analytics);

  // Convert date range to ISO strings
  const startISO = useMemo(() => toISO(dateRange?.start), [dateRange?.start]);
  const endISO = useMemo(() => toISO(dateRange?.end), [dateRange?.end]);

  // Initialize filters from URL params on mount
  useEffect(() => {
    const urlFilters: AnalyticsParams = {};

    if (searchParams.get('from')) {
      urlFilters.from_date = searchParams.get('from') || undefined;
    }
    if (searchParams.get('to')) {
      urlFilters.to_date = searchParams.get('to') || undefined;
    }
    if (searchParams.get('provider')) {
      urlFilters.provider = searchParams.get('provider') || undefined;
    }
    if (searchParams.get('location_id')) {
      urlFilters.location_id = searchParams.get('location_id') || undefined;
    }

    // Only update filters if URL params exist and are different from current filters
    if (Object.keys(urlFilters).length > 0) {
      dispatch(setFilters(urlFilters));

      // Also update date range if we have date filters
      if (urlFilters.from_date && urlFilters.to_date) {
        setDateRange({
          start: parseDate(urlFilters.from_date),
          end: parseDate(urlFilters.to_date)
        });
      }
    }
  }, [dispatch]);

  // Update URL when date range changes
  useEffect(() => {
    if (startISO && endISO) {
      const params = new URLSearchParams();
      params.set('from', startISO);
      params.set('to', endISO);

      if (filters.provider) {
        params.set('provider', filters.provider);
      }
      if (filters.location_id) {
        params.set('location_id', filters.location_id);
      }

      setSearchParams(params);
    }
  }, [startISO, endISO, filters.provider, filters.location_id, setSearchParams]);

  // Load data when date range or filters change
  useEffect(() => {
    if (startISO && endISO) {
      const params: AnalyticsParams = {
        from_date: startISO,
        to_date: endISO,
        provider: filters.provider,
        location_id: filters.location_id
      };

      dispatch(fetchAnalyticsSummary(params));
      dispatch(fetchRevenueSeries(params));
      dispatch(fetchExpenseBreakdown(params));
      dispatch(fetchPaymentsSplit(params));
      dispatch(fetchTopItems(params));
      dispatch(fetchLowStock(params));
      dispatch(fetchTimeUtilization(params));
    }
  }, [dispatch, startISO, endISO, filters.provider, filters.location_id]);

  const updateDateRange = (start?: any, end?: any) => {
    setDateRange((prev) => ({
      start: start ?? prev.start,
      end: end ?? prev.end
    }));
  };

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Box
            sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Typography variant="h5">Analytics Dashboard</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AllyviaDateRangePicker value={dateRange} onChange={(v: RangeValue | null) => updateDateRange(v?.start, v?.end)} />

              {/* Download Report Button */}
              <AnalyticsDownloadButton startISO={startISO || ''} endISO={endISO || ''} />
            </Box>
          </Box>

          <Box sx={{ p: 3 }}>
            {/* Error State */}
            {error && (
              <Box sx={{ mb: 3, p: 2, backgroundColor: 'error.light', borderRadius: 1 }}>
                <Typography color="error.main">Error: {error}</Typography>
              </Box>
            )}

            {/* Feature Flag Notice */}
            {EXCLUDE_CRM_ANALYTICS && (
              <Box sx={{ mb: 3, p: 2, backgroundColor: 'info.light', borderRadius: 1 }}>
                <Typography color="info.main" variant="body2">
                  Note: CRM analytics widgets are currently hidden via feature flag.
                </Typography>
              </Box>
            )}

            {/* KPI Cards */}
            <Box sx={{ mb: 4 }}>
              <KpiCards data={summary} loading={loading} />
            </Box>

            <Grid container spacing={3}>
              {/* Charts Row 1 */}
              <Grid size={{ xs: 12, md: 8 }}>
                <RevenueTrend />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <ExpenseBreakdown />
              </Grid>

              {/* Charts Row 2 */}
              <Grid size={{ xs: 12, md: 6 }}>
                <PaymentsByProvider />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TimeUtilization />
              </Grid>

              {/* Tables Row */}
              <Grid size={{ xs: 12, md: 6 }}>
                <TopItems />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <LowStock />
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
};

export default Analytics;
