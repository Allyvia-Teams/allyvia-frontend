import React, { useState, useEffect, useMemo } from 'react';
import { Box, Tabs, Tab, Typography, useTheme } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import { AllyviaDateRangePicker, type RangeValue } from 'ui-component/third-party/DateRangePicker';
import { parseDate } from '@internationalized/date';
import type { DateValue } from 'react-aria';
import { IconChartBar, IconReportMoney, IconReceipt, IconFileInvoice, IconCreditCard, IconCoin } from '@tabler/icons-react';

// Redux
import { useDispatch, useSelector } from 'store';
import type { RootState } from 'store';
import { setFilters } from 'store/slices/finance';

// Thunks - Only finance-specific
import {
  fetchFinanceKPIs,
  fetchAnalyticsSummary,
  fetchProfitAndLoss,
  fetchCOGSDetail,
  fetchGrossProfitDetail,
  fetchBalanceSheet,
  fetchCashFlow,
  fetchPaymentSummary,
  fetchPaymentSplit,
  fetchPaymentTrend,
  fetchPaymentStatistics,
  fetchPaymentList,
  fetchPaymentSuggestions,
  fetchExpenseSummary,
  fetchExpenseBreakdown,
  fetchTopExpenses,
  fetchExpenseTrend,
  fetchBillsStatus,
  fetchExpenseStats,
  fetchExpensesList,
  fetchPurchasesList,
  fetchInvoiceStatistics,
  fetchInvoiceList,
  fetchInvoiceAging,
  fetchRevenueSeries,
  fetchInvoiceSuggestions,
  fetchAccountSummary
} from 'store/slices/finance';

// Components
import { FinanceReportButton } from 'ui-component/finance';
import OverviewTab from './tabs/Overview';
import FinancialStatementsTab from './tabs/FinancialStatements';
import InvoicesTab from './tabs/Invoices';
import ExpensesTab from './tabs/Expenses';
import PaymentsTab from './tabs/Payments';

// Types
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`finance-tabpanel-${index}`} aria-labelledby={`finance-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `finance-tab-${index}`,
    'aria-controls': `finance-tabpanel-${index}`
  };
}

const Finance: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch();

  // Local state
  const [tab, setTab] = useState(0);

  // Date range from Redux
  const { filters } = useSelector((state: RootState) => state.finance);
  const startDate = filters.startDate || '';
  const endDate = filters.endDate || '';

  // Convert dates to ISO format
  const startISO = useMemo(() => {
    return startDate ? new Date(startDate).toISOString().split('T')[0] : '';
  }, [startDate]);

  const endISO = useMemo(() => {
    return endDate ? new Date(endDate).toISOString().split('T')[0] : '';
  }, [endDate]);

  // Initialize filters with defaults on first load so thunks can run (current month)
  const defaultStartISO = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }, []);
  const defaultEndISO = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    if (!startISO || !endISO) {
      dispatch(setFilters({ startDate: startISO || defaultStartISO, endDate: endISO || defaultEndISO }));
    }
  }, [dispatch, startISO, endISO, defaultStartISO, defaultEndISO]);

  // Build RangeValue for header date picker (defaults to current month if empty)
  const dateRangeValue: RangeValue = useMemo(() => {
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];
    const startOfMonthISO = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const start = parseDate((startISO || startOfMonthISO) as any);
    const end = parseDate((endISO || todayISO) as any);
    return { start, end } as any;
  }, [startISO, endISO]);

  // Helper to convert DateValue → ISO (YYYY-MM-DD)
  const toISO = (dv?: DateValue) => {
    if (!dv) return undefined as any;
    const y = String((dv as any).year).padStart(4, '0');
    const m = String((dv as any).month).padStart(2, '0');
    const d = String((dv as any).day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Lazy load data based on active tab
  useEffect(() => {
    if (startISO && endISO) {
      // Always load core data for all tabs
      dispatch(fetchFinanceKPIs({ startDate: startISO, endDate: endISO }));
      dispatch(fetchAnalyticsSummary({ startDate: startISO, endDate: endISO }));
      dispatch(fetchExpenseSummary({ startDate: startISO, endDate: endISO }));
      dispatch(fetchExpenseStats({ startDate: startISO, endDate: endISO }));
      dispatch(fetchExpensesList({ startDate: startISO, endDate: endISO }));
      dispatch(fetchInvoiceStatistics({ startDate: startISO, endDate: endISO }));
      dispatch(fetchInvoiceList({ startDate: startISO, endDate: endISO }));
      dispatch(fetchInvoiceAging());
    }
  }, [startISO, endISO, dispatch]);

  // Load Overview tab specific data - Disabled since Overview tab is hidden
  // useEffect(() => {
  //   if (tab === 0 && startISO && endISO) {
  //     dispatch(fetchExpenseBreakdown({ startDate: startISO, endDate: endISO }));
  //     dispatch(fetchTopExpenses({ startDate: startISO, endDate: endISO }));
  //     dispatch(fetchExpenseTrend({ startDate: startISO, endDate: endISO }));
  //     dispatch(fetchPaymentSummary({ startDate: startISO, endDate: endISO }));
  //     dispatch(fetchPaymentSplit({ startDate: startISO, endDate: endISO }));
  //     dispatch(fetchRevenueSeries({ startDate: startISO, endDate: endISO }));
  //     dispatch(fetchAccountSummary({ startDate: startISO, endDate: endISO }));
  //   }
  // }, [tab, startISO, endISO, dispatch]);

  // Load Financial Statements tab specific data
  useEffect(() => {
    if (tab === 0 && startISO && endISO) {
      dispatch(fetchProfitAndLoss({ startDate: startISO, endDate: endISO }));
      dispatch(fetchCOGSDetail({ startDate: startISO, endDate: endISO }));
      dispatch(fetchGrossProfitDetail({ startDate: startISO, endDate: endISO }));
      dispatch(fetchBalanceSheet({ asOfDate: endISO }));
      dispatch(fetchCashFlow({ startDate: startISO, endDate: endISO }));
      dispatch(fetchAccountSummary({ startDate: startISO, endDate: endISO }));
    }
  }, [tab, startISO, endISO, dispatch]);

  // Load Invoices tab specific data
  useEffect(() => {
    if (tab === 1 && startISO && endISO) {
      dispatch(fetchInvoiceStatistics({ startDate: startISO, endDate: endISO }));
      dispatch(fetchInvoiceList({ startDate: startISO, endDate: endISO }));
      dispatch(fetchInvoiceSuggestions());
    }
  }, [tab, startISO, endISO, dispatch]);

  // Load Expenses tab specific data
  useEffect(() => {
    if (tab === 2 && startISO && endISO) {
      dispatch(fetchExpenseSummary({ startDate: startISO, endDate: endISO }));
      dispatch(fetchExpensesList({ startDate: startISO, endDate: endISO }));
    }
  }, [tab, startISO, endISO, dispatch]);

  // Load Payments tab specific data
  useEffect(() => {
    if (tab === 3 && startISO && endISO) {
      dispatch(fetchPaymentSummary({ startDate: startISO, endDate: endISO }));
      dispatch(fetchPaymentStatistics({ startDate: startISO, endDate: endISO }));
      dispatch(fetchPaymentList({ startDate: startISO, endDate: endISO }));
    }
  }, [tab, startISO, endISO, dispatch]);

  // Event handlers
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  return (
    <MainCard
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h3">Finance</Typography>
        </Box>
      }
      secondary={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <AllyviaDateRangePicker
            value={dateRangeValue}
            onChange={(value: RangeValue | null) => {
              const nextStart = toISO(value?.start as any) as any;
              const nextEnd = toISO(value?.end as any) as any;
              dispatch(setFilters({ startDate: nextStart, endDate: nextEnd }));
            }}
          />
          <FinanceReportButton startISO={startISO || ''} endISO={endISO || ''} theme={theme} />
        </Box>
      }
    >
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tab}
            onChange={handleChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="finance tabs"
            sx={{
              '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 500, fontSize: '0.875rem' },
              '& .Mui-selected': { color: theme.palette.primary.main }
            }}
          >
            {/* Overview tab - Hidden but not deleted */}
            {/* <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconChartBar size="20" />
                  <Typography variant="body2">Overview</Typography>
                </Box>
              }
              {...a11yProps(0)}
            /> */}
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconReportMoney size="20" />
                  <Typography variant="body2">Financial Statements</Typography>
                </Box>
              }
              {...a11yProps(0)}
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconFileInvoice size="20" />
                  <Typography variant="body2">Invoices</Typography>
                </Box>
              }
              {...a11yProps(1)}
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconReceipt size="20" />
                  <Typography variant="body2">Expenses</Typography>
                </Box>
              }
              {...a11yProps(2)}
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconCreditCard size="20" />
                  <Typography variant="body2">Payments</Typography>
                </Box>
              }
              {...a11yProps(3)}
            />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        {/* Overview tab panel - Hidden but not deleted */}
        {/* <TabPanel value={tab} index={0}>
          <OverviewTab />
        </TabPanel> */}

        <TabPanel value={tab} index={0}>
          <FinancialStatementsTab />
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <InvoicesTab />
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <ExpensesTab />
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <PaymentsTab />
        </TabPanel>
      </Box>
    </MainCard>
  );
};

export default Finance;
