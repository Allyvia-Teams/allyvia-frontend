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
import FinancialAnalytics from './tabs/FinancialAnalytics';
import EmployeeAnalytics from './tabs/EmployeeAnalytics';
import InventoryAnalytics from './tabs/InventoryAnalytics';
import CRMAnalytics from './tabs/CRMAnalytics';
import { useDispatch } from 'react-redux';
import { AppDispatch, store } from 'store/index';
import { setFilters } from 'store/slices/analytics';
import { setFilters as setFinanceFilters } from 'store/slices/finance';
import {
  fetchAnalyticsSummary,
  fetchRevenueSeries,
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
  fetchCRMRepPerformance
} from 'store/slices/analytics';
import { fetchPaymentSplit } from 'store/slices/finance';
import { AnalyticsLayoutProvider, useAnalyticsLayout } from './layout/AnalyticsLayoutContext';
import AnalyticsCustomizeButton from './layout/AnalyticsCustomizeButton';
import AnalyticsWidgetPicker from './layout/AnalyticsWidgetPicker';
import { TAB_INDEX_TO_ANALYTICS_TAB } from './layout/tabLabels';

// assets
import { IconUsers, IconReportMoney, IconObjectScan, IconLifebuoy } from '@tabler/icons-react';

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

function AnalyticsPageContent() {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { setActiveTab } = useAnalyticsLayout();
  const [value, setValue] = useState(0);
  const [dateRange, setDateRange] = useState<RangeValue>({
    start: START_OF_MONTH,
    end: TODAY
  });

  // Individual loading states for each tab
  const [financialLoading, setFinancialLoading] = useState(false);
  const [crmLoading, setCrmLoading] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // Convert date range to ISO strings
  const startISO = toISO(dateRange?.start);
  const endISO = toISO(dateRange?.end);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    setActiveTab(TAB_INDEX_TO_ANALYTICS_TAB[newValue]);
  };

  useEffect(() => {
    setActiveTab(TAB_INDEX_TO_ANALYTICS_TAB[value]);
  }, [setActiveTab, value]);

  const updateDateRange = (start?: DateValue, end?: DateValue) => {
    setDateRange((prev) => ({
      start: start ?? prev.start,
      end: end ?? prev.end
    }));
    // also set Redux filters so thunks can pick them up
    dispatch(setFilters({ start_date: toISO(start), end_date: toISO(end) }) as any);
  };

  // Load Financial Analytics data when tab 0 is active
  useEffect(() => {
    if (value === 0 && startISO && endISO) {
      const loadFinancialAnalytics = async () => {
        try {
          setFinancialLoading(true);
          dispatch(setFilters({ start_date: startISO, end_date: endISO }));
          dispatch(setFinanceFilters({ startDate: startISO, endDate: endISO }));
          await Promise.all([
            dispatch(fetchAnalyticsSummary({ start_date: startISO, end_date: endISO })),
            dispatch(fetchRevenueSeries({ start_date: startISO, end_date: endISO })),
            dispatch(fetchPaymentSplit({ startDate: startISO!, endDate: endISO! })),
            dispatch(fetchTopItems({ start_date: startISO, end_date: endISO })),
            dispatch(fetchLowStock({ start_date: startISO, end_date: endISO }))
          ]);
        } catch (error) {
          console.error('Failed to load financial analytics data:', error);
        } finally {
          setFinancialLoading(false);
        }
      };
      loadFinancialAnalytics();
    }
  }, [dispatch, value, startISO, endISO]);

  // Load CRM Analytics data when tab 1 is active
  useEffect(() => {
    if (value === 1 && startISO && endISO) {
      const loadCRMAnalytics = async () => {
        try {
          setCrmLoading(true);
          dispatch(setFilters({ start_date: startISO, end_date: endISO }));

          // Get company_id from Redux state
          const state = store.getState() as any;
          const companyId = state.auth?.currentRole?.company_id;

          const promises = [
            dispatch(fetchCRMAnalyticsOverview({ start_date: startISO, end_date: endISO })),
            dispatch(fetchCRMAnalyticsPipeline({ start_date: startISO, end_date: endISO })),
            dispatch(fetchCRMAnalyticsConversion({ start_date: startISO, end_date: endISO })),
            dispatch(fetchCRMAnalyticsSources({ start_date: startISO, end_date: endISO })),
            dispatch(fetchCRMAnalyticsActivities({ start_date: startISO, end_date: endISO, bucket: 'week' })),
            dispatch(fetchCRMAnalyticsDealAging({ start_date: startISO, end_date: endISO })),
            dispatch(fetchCRMAnalyticsReps({ start_date: startISO, end_date: endISO }))
          ];

          await Promise.all(promises);

          // Add CRM Rep Performance separately due to different parameter types
          if (companyId) {
            const start = `${startISO}T00:00:00Z`;
            const end = `${endISO}T23:59:59Z`;
            await dispatch(fetchCRMRepPerformance({ company_id: companyId, start, end } as any));
          }
        } catch (error) {
          console.error('Failed to load CRM analytics data:', error);
        } finally {
          setCrmLoading(false);
        }
      };
      loadCRMAnalytics();
    }
  }, [dispatch, value, startISO, endISO]);

  // Load Employee Analytics data when tab 2 is active
  useEffect(() => {
    if (value === 2 && startISO && endISO) {
      const loadEmployeeAnalytics = async () => {
        try {
          setEmployeeLoading(true);
          dispatch(setFilters({ start_date: startISO, end_date: endISO }));
          await Promise.all([
            dispatch(fetchTimeUtilization({ start_date: startISO, end_date: endISO })),
            dispatch(fetchEmployeeOverview({ start_date: startISO, end_date: endISO })),
            dispatch(fetchEmployeeAll({ start_date: startISO, end_date: endISO })),
            dispatch(fetchEmployeeDailyBreakdown({ start_date: startISO, end_date: endISO }))
          ]);
        } catch (error) {
          console.error('Failed to load employee analytics data:', error);
        } finally {
          setEmployeeLoading(false);
        }
      };
      loadEmployeeAnalytics();
    }
  }, [dispatch, value, startISO, endISO]);

  // Load Inventory Analytics data when tab 3 is active
  useEffect(() => {
    if (value === 3 && startISO && endISO) {
      const loadInventoryAnalytics = async () => {
        try {
          setInventoryLoading(true);
          dispatch(setFilters({ start_date: startISO, end_date: endISO }));
          await Promise.all([
            dispatch(fetchInventoryOverview()),
            dispatch(fetchInventoryAll()),
            dispatch(fetchInventoryItemsTreeMap({ start_date: startISO, end_date: endISO }))
          ]);
        } catch (error) {
          console.error('Failed to load inventory analytics data:', error);
        } finally {
          setInventoryLoading(false);
        }
      };
      loadInventoryAnalytics();
    }
  }, [dispatch, value, startISO, endISO]);

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
                onChange={(rangeValue: RangeValue | null) => {
                  updateDateRange(rangeValue!.start, rangeValue!.end);
                }}
              />
              <AnalyticsCustomizeButton />
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
                      <IconReportMoney stroke={1.5} size="20px" />
                      <Typography variant="body2">Financial Analytics</Typography>
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
                      <IconUsers stroke={1.5} size="20px" />
                      <Typography variant="body2">Employee Analytics</Typography>
                    </Box>
                  }
                  {...a11yProps(2)}
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconObjectScan stroke={1.5} size="20px" />
                      <Typography variant="body2">Inventory Analytics</Typography>
                    </Box>
                  }
                  {...a11yProps(3)}
                />
              </Tabs>
            </Box>

            <TabPanel value={value} index={0}>
              <FinancialAnalytics dateRange={dateRange} isLoading={financialLoading} />
            </TabPanel>
            <TabPanel value={value} index={1}>
              <CRMAnalytics dateRange={dateRange} isLoading={crmLoading} />
            </TabPanel>
            <TabPanel value={value} index={2}>
              <EmployeeAnalytics dateRange={dateRange} isLoading={employeeLoading} />
            </TabPanel>
            <TabPanel value={value} index={3}>
              <InventoryAnalytics dateRange={dateRange} isLoading={inventoryLoading} />
            </TabPanel>
          </Box>
        </MainCard>
        <AnalyticsWidgetPicker />
      </Grid>
    </Grid>
  );
}

export default function AnalyticsPage() {
  return (
    <AnalyticsLayoutProvider initialTab={TAB_INDEX_TO_ANALYTICS_TAB[0]}>
      <AnalyticsPageContent />
    </AnalyticsLayoutProvider>
  );
}
