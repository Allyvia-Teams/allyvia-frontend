import React, { useState, useEffect } from 'react';
import { parseDate } from '@internationalized/date';

// material-ui
import { Box, Tabs, Tab, Typography, Grid, useTheme } from '@mui/material';

// project imports
import { gridSpacing } from 'store/constant';
import { AllyviaDateRangePicker, type RangeValue } from 'ui-component/third-party/DateRangePicker';
import { DateValue } from 'react-aria';
import MainCard from 'ui-component/cards/MainCard';
import { AnalyticsDownloadButton } from 'ui-component/analytics/common';
import OverviewAnalytics from './tabs/OverviewAnalytics';
import FinancialAnalytics from './tabs/FinancialAnalytics';
import EmployeeAnalytics from './tabs/EmployeeAnalytics';
import InventoryAnalytics from './tabs/InventoryAnalytics';
import CRMAnalytics from './tabs/CRMAnalytics';
import { useDispatch } from 'react-redux';
import { AppDispatch } from 'store/index';
import { setFilters } from 'store/slices/analytics';
import { setFilters as setFinanceFilters } from 'store/slices/finance';
import {
  fetchAnalyticsSummary,
  fetchRevenueSeries,
  fetchPaymentsSplit,
  fetchTopItems,
  fetchLowStock,
  fetchTimeUtilization,
  fetchInventoryOverview,
  fetchInventoryAll,
  fetchInventoryItemsTreeMap,
  fetchEmployeeOverview,
  fetchEmployeeAll,
  fetchEmployeeDailyBreakdown,
  fetchCRMAnalyticsOverview,
  fetchCRMAnalyticsPipeline,
  fetchCRMAnalyticsConversion,
  fetchCRMAnalyticsSources,
  fetchCRMAnalyticsActivities,
  fetchCRMAnalyticsDealAging,
  fetchCRMAnalyticsReps,
  fetchCRMAnalyticsStalled
} from 'store/slices/analytics';

// assets
import { IconChartBar, IconUsers, IconReportMoney, IconObjectScan, IconLifebuoy } from '@tabler/icons-react';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`analytics-tabpanel-${index}`} aria-labelledby={`analytics-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `analytics-tab-${index}`,
    'aria-controls': `analytics-tabpanel-${index}`
  };
}

// ISO 8601 date format - default to current month
const NOW = new Date();
const START_OF_MONTH = parseDate(new Date(NOW.getFullYear(), NOW.getMonth(), 1).toISOString().split('T')[0]);
const TODAY = parseDate(new Date().toISOString().split('T')[0]);

// map DateValue → ISO (YYYY-MM-DD)
const toISO = (dv?: any) => {
  if (!dv) return undefined;
  const y = String(dv.year).padStart(4, '0');
  const m = String(dv.month).padStart(2, '0');
  const d = String(dv.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function AnalyticsPage() {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const [value, setValue] = useState(0);
  const [dateRange, setDateRange] = useState<RangeValue>({
    start: START_OF_MONTH,
    end: TODAY
  });
  const [isLoading, setIsLoading] = useState(true);

  // Convert date range to ISO strings
  const startISO = toISO(dateRange?.start);
  const endISO = toISO(dateRange?.end);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const updateDateRange = (start?: DateValue, end?: DateValue) => {
    setDateRange((prev) => ({
      start: start ?? prev.start,
      end: end ?? prev.end
    }));
    // also set Redux filters so thunks can pick them up
    dispatch(setFilters({ start_date: toISO(start), end_date: toISO(end) }) as any);
  };

  // Load all analytics data when component mounts and when date range changes
  useEffect(() => {
    const loadAnalyticsData = async () => {
      try {
        // Load all analytics data
        // Ensure filters are set before any thunks that may read from Redux
        dispatch(setFilters({ start_date: startISO, end_date: endISO }));
        await Promise.all([
          dispatch(fetchAnalyticsSummary({ start_date: startISO, end_date: endISO })),
          dispatch(fetchRevenueSeries({ start_date: startISO, end_date: endISO })),
          dispatch(fetchPaymentsSplit({ start_date: startISO, end_date: endISO })),
          dispatch(fetchTopItems({ start_date: startISO, end_date: endISO })),
          dispatch(fetchLowStock({ start_date: startISO, end_date: endISO })),
          dispatch(fetchTimeUtilization({ start_date: startISO, end_date: endISO })),
          // New consolidated inventory analytics
          dispatch(fetchInventoryOverview()),
          dispatch(fetchInventoryAll()),
          dispatch(fetchInventoryItemsTreeMap({ start_date: startISO, end_date: endISO })),
          // Employee analytics
          dispatch(fetchEmployeeOverview({ start_date: startISO, end_date: endISO })),
          dispatch(fetchEmployeeAll({ start_date: startISO, end_date: endISO })),
          // Daily breakdown without employee filter by default; component will re-request with employee_id
          dispatch(fetchEmployeeDailyBreakdown({ start_date: startISO, end_date: endISO })),
          // CRM Analytics
          dispatch(fetchCRMAnalyticsOverview({ start_date: startISO, end_date: endISO })),
          dispatch(fetchCRMAnalyticsPipeline({ start_date: startISO, end_date: endISO })),
          dispatch(fetchCRMAnalyticsConversion({ start_date: startISO, end_date: endISO })),
          dispatch(fetchCRMAnalyticsSources({ start_date: startISO, end_date: endISO })),
          dispatch(fetchCRMAnalyticsActivities({ start_date: startISO, end_date: endISO, bucket: 'week' })),
          dispatch(fetchCRMAnalyticsDealAging({ start_date: startISO, end_date: endISO })),
          dispatch(fetchCRMAnalyticsReps({ start_date: startISO, end_date: endISO })),
          dispatch(fetchCRMAnalyticsStalled({ start_date: startISO, end_date: endISO, days_no_activity: 14, min_value: 0 }))
        ]);
      } catch (error) {
        console.error('Failed to load analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalyticsData();
  }, [dispatch, startISO, endISO]);

  // Finance: keep effects separated to run at necessary times
  // 1) Sync finance filters on tab/date change
  useEffect(() => {
    if (value === 2) {
      console.log('[AnalyticsPage] Finance tab active: syncing filters', { startISO, endISO });
      dispatch(setFinanceFilters({ startDate: startISO as any, endDate: endISO as any }) as any);
    }
  }, [dispatch, value, startISO, endISO]);

  // Note: Finance-specific API calls are now handled by FinancialAnalytics component
  // to avoid duplicate calls and ensure they only run when the tab is active

  return (
    <Grid container spacing={gridSpacing}>
      {/* Analytics Content */}
      <Grid size={12}>
        <MainCard
          title="Analytics Dashboard"
          secondary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <AllyviaDateRangePicker
                value={dateRange}
                onChange={(value: RangeValue | null) => {
                  updateDateRange(value!.start, value!.end);
                }}
              />
              <AnalyticsDownloadButton startISO={startISO || ''} endISO={endISO || ''} />
            </Box>
          }
        >
          <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={value}
                onChange={handleChange}
                aria-label="analytics tabs"
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    minHeight: 48,
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.875rem'
                  },
                  '& .Mui-selected': {
                    color: theme.palette.primary.main
                  }
                }}
              >
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconChartBar stroke={1.5} size="20px" />
                      <Typography variant="body2">Overview</Typography>
                    </Box>
                  }
                  {...a11yProps(0)}
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconLifebuoy stroke={1.5} size="20px" />
                      <Typography variant="body2">CRM Analytics</Typography>
                    </Box>
                  }
                  {...a11yProps(1)}
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconReportMoney stroke={1.5} size="20px" />
                      <Typography variant="body2">Financial Analytics</Typography>
                    </Box>
                  }
                  {...a11yProps(2)}
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconUsers stroke={1.5} size="20px" />
                      <Typography variant="body2">Employee Analytics</Typography>
                    </Box>
                  }
                  {...a11yProps(3)}
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconObjectScan stroke={1.5} size="20px" />
                      <Typography variant="body2">Inventory Analytics</Typography>
                    </Box>
                  }
                  {...a11yProps(4)}
                />
              </Tabs>
            </Box>

            <TabPanel value={value} index={0}>
              <OverviewAnalytics dateRange={dateRange} isLoading={isLoading} />
            </TabPanel>
            <TabPanel value={value} index={1}>
              <CRMAnalytics dateRange={dateRange} isLoading={isLoading} />
            </TabPanel>
            <TabPanel value={value} index={2}>
              <FinancialAnalytics dateRange={dateRange} />
            </TabPanel>
            <TabPanel value={value} index={3}>
              <EmployeeAnalytics dateRange={dateRange} isLoading={isLoading} />
            </TabPanel>
            <TabPanel value={value} index={4}>
              <InventoryAnalytics dateRange={dateRange} isLoading={isLoading} />
            </TabPanel>
          </Box>
        </MainCard>
      </Grid>
    </Grid>
  );
}
