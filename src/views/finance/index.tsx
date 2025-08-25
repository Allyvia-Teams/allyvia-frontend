import { useState, useEffect, useMemo } from 'react';
import { parseDate } from '@internationalized/date';
import { Box, Tabs, Tab, Typography, Grid, useTheme } from '@mui/material';
import { AllyviaDateRangePicker, type RangeValue } from 'ui-component/third-party/DateRangePicker';
import type { DateValue } from 'react-aria';

// Tab components
import { OverviewTab, FinancialStatementsTab, TransactionsTab, TrendsTab } from './tabs';

// API (returns full arrays; falls back to mock on error)
import {
  fetchInvoices,
  fetchExpenses,
  fetchLedger,
  fetchAging,
  fetchSeries,
  fetchKPIs,
  fetchBalanceSheet,
  fetchProfitAndLossSummary,
  fetchCOGSDetail,
  fetchGrossProfitDetail,
  fetchCashFlow
} from 'api/finance.api';

// Types
import type {
  KPI,
  InvoiceRow,
  Expense,
  LedgerRow,
  AgingBucket,
  TimeseriesPoint,
  BalanceSheetRow,
  ProfitAndLossSummary,
  COGSDetail,
  GrossProfitDetail,
  CashFlowRow
} from 'types/finance';

// Types from the mock (shared by real+mock usage)

// icons
import { IconChartBar, IconReportMoney, IconFileInvoice } from '@tabler/icons-react';

// ---------------- Tab helpers ----------------
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`finance-tabpanel-${index}`} aria-labelledby={`finance-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}
function a11yProps(index: number) {
  return { id: `finance-tab-${index}`, 'aria-controls': `finance-tabpanel-${index}` };
}

// date defaults - Use dates that match our mock data (January-September 2024)
const LAST_WEEK = parseDate('2024-01-01');
const TODAY = parseDate('2024-09-30');

// map DateValue → ISO (YYYY-MM-DD)
const toISO = (dv?: any) => {
  if (!dv) return undefined;
  const y = String(dv.year).padStart(4, '0');
  const m = String(dv.month).padStart(2, '0');
  const d = String(dv.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Small reusable KPI card

export default function FinanceTabsPage() {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [dateRange, setDateRange] = useState<RangeValue>({ start: LAST_WEEK, end: TODAY });
  const [isLoading, setIsLoading] = useState(true);
  // ---------- shared (for summaries) ----------
  const startISO = useMemo(() => toISO(dateRange?.start), [dateRange?.start]);
  const endISO = useMemo(() => toISO(dateRange?.end), [dateRange?.end]);

  // Debug logging for date range
  useEffect(() => {
    console.log('🔍 Date range changed:', { startISO, endISO, dateRange });
  }, [startISO, endISO, dateRange]);

  // ---------- KPI (used by P&L/Balance Sheet summaries) ----------
  const [kpi, setKpi] = useState<KPI | null>(null);

  useEffect(() => {
    let active = true;
    fetchKPIs({ startDate: startISO, endDate: endISO })
      .then((data) => {
        if (active) setKpi(data);
      })
      .catch((err) => {
        console.warn('[finance] KPI fetch failed:', err);
        if (active) setKpi(null);
      });
    return () => {
      active = false;
    };
  }, [startISO, endISO]);

  // ---------- P&L Data (from real APIs) ----------
  const [pnlSummary, setPnlSummary] = useState<ProfitAndLossSummary | null>(null);
  const [cogsDetail, setCogsDetail] = useState<COGSDetail | null>(null);
  const [grossProfitDetail, setGrossProfitDetail] = useState<GrossProfitDetail | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchProfitAndLossSummary({ startDate: startISO, endDate: endISO }),
      fetchCOGSDetail({ startDate: startISO, endDate: endISO }),
      fetchGrossProfitDetail({ startDate: startISO, endDate: endISO })
    ])
      .then(([summary, cogs, gross]) => {
        if (active) {
          setPnlSummary(summary);
          setCogsDetail(cogs);
          setGrossProfitDetail(gross);
        }
      })
      .catch((err) => {
        console.warn('[finance] P&L data fetch failed:', err);
        if (active) {
          setPnlSummary(null);
          setCogsDetail(null);
          setGrossProfitDetail(null);
        }
      });
    return () => {
      active = false;
    };
  }, [startISO, endISO]);

  // ---------- Cash Flow ----------
  const [cashFlowRows, setCashFlowRows] = useState<CashFlowRow[]>([]);

  useEffect(() => {
    let active = true;
    fetchCashFlow({ startDate: startISO, endDate: endISO })
      .then((rows: any) => {
        const arr = Array.isArray(rows) ? rows : (rows?.rows ?? []);
        if (active) setCashFlowRows(arr);
      })
      .catch(() => {
        if (active) setCashFlowRows([]);
      });
    return () => {
      active = false;
    };
  }, [startISO, endISO]);

  // ---------- Invoices (for TransactionsTab) ----------
  const [invoicesAll, setInvoicesAll] = useState<InvoiceRow[]>([]);

  // Invoices (refetch on date range)
  useEffect(() => {
    let active = true;
    fetchInvoices({ start_date: startISO, end_date: endISO } as any)
      .then((data: any) => {
        const rows = Array.isArray(data) ? data : (data?.rows ?? []);
        if (active) setInvoicesAll(rows);
      })
      .catch(() => {
        if (active) setInvoicesAll([]);
      });
    return () => {
      active = false;
    };
  }, [startISO, endISO]);

  const invoicePageRows = invoicesAll;

  // Summary over FULL filtered set
  const invoiceSummary = useMemo(() => {
    const totalAmt = invoicePageRows.reduce((a, r) => a + r.amount, 0);
    const count = invoicePageRows.length;
    const avg = count ? totalAmt / count : 0;
    const paid = invoicePageRows.filter((r) => r.status === 'paid').reduce((a, r) => a + r.amount, 0);
    const pending = invoicePageRows.filter((r) => r.status === 'pending').reduce((a, r) => a + r.amount, 0);
    const overdue = invoicePageRows.filter((r) => r.status === 'overdue').reduce((a, r) => a + r.amount, 0);
    return { totalAmt, count, avg, paid, pending, overdue };
  }, [invoicePageRows]);

  // ---------- Expenses (for TransactionsTab) ----------
  const [expensesAll, setExpensesAll] = useState<Expense[]>([]);

  useEffect(() => {
    let active = true;
    fetchExpenses({ start_date: startISO, end_date: endISO } as any).then((data: any) => {
      const rows = Array.isArray(data) ? data : (data?.rows ?? []);
      if (active) setExpensesAll(rows);
    });
    return () => {
      active = false;
    };
  }, [startISO, endISO]);

  const expensePageRows = expensesAll;

  // ---------- Ledger (for TransactionsTab) ----------
  const [ledgerAll, setLedgerAll] = useState<LedgerRow[]>([]);

  useEffect(() => {
    let active = true;
    fetchLedger({ start_date: startISO, end_date: endISO } as any).then((data: any) => {
      const rows = Array.isArray(data) ? data : (data?.rows ?? []);
      if (active) setLedgerAll(rows);
    });
    return () => {
      active = false;
    };
  }, [startISO, endISO]);

  const ledgerPageRows = ledgerAll;

  // ---------- Aging (full array → filtered) ----------
  const [agingAll, setAgingAll] = useState<AgingBucket[]>([]);

  useEffect(() => {
    let active = true;
    fetchAging({ start_date: startISO, end_date: endISO } as any).then((data) => {
      if (active) setAgingAll(data ?? []);
    });
    return () => {
      active = false;
    };
  }, [startISO, endISO]);

  // ---------- Cash flow summary (from timeseries over selected range) ----------
  const [cfSummary, setCfSummary] = useState<{ op: number; inv: number; fin: number; net: number }>({ op: 0, inv: 0, fin: 0, net: 0 });
  const [balanceRows, setBalanceRows] = useState<BalanceSheetRow[]>([]);
  const bsGroups = useMemo(() => {
    const assets = balanceRows.filter((r) => r.category === 'asset');
    const liabilities = balanceRows.filter((r) => r.category === 'liability');
    const equity = balanceRows.filter((r) => r.category === 'equity');
    const sum = (rows: BalanceSheetRow[]) => rows.reduce((a, r) => a + (r.amount || 0), 0);
    const totals = {
      assets: sum(assets),
      liabilities: sum(liabilities),
      equity: sum(equity)
    };
    return { assets, liabilities, equity, totals };
  }, [balanceRows]);
  const bsBalanced = useMemo(
    () => Math.abs(bsGroups.totals.liabilities + bsGroups.totals.equity - bsGroups.totals.assets) < 0.5,
    [bsGroups]
  );
  useEffect(() => {
    (async () => {
      const series: TimeseriesPoint[] = await fetchSeries({ start_date: startISO, end_date: endISO } as any);
      const op = series.reduce((a, p) => a + (p.cash_in || 0) - (p.cash_out || 0), 0);
      const inv = Math.round(op * -0.35);
      const fin = Math.round(op * -0.12);
      const net = op + inv + fin;
      setCfSummary({ op, inv, fin, net });
    })();
  }, [startISO, endISO]);

  // Balance Sheet rows
  useEffect(() => {
    let active = true;
    fetchBalanceSheet({ start_date: startISO, end_date: endISO } as any)
      .then((rows: any) => {
        const arr = Array.isArray(rows) ? rows : (rows?.rows ?? []);
        if (active) setBalanceRows(arr);
      })
      .catch(() => {
        if (active) setBalanceRows([]);
      });
    return () => {
      active = false;
    };
  }, [startISO, endISO]);

  // initial shimmer like Analytics
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  const handleChange = (_: any, newValue: number) => setTab(newValue);
  const updateDateRange = (start?: DateValue, end?: DateValue) => {
    setDateRange((prev) => ({ start: start ?? prev.start, end: end ?? prev.end }));
  };

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Box
            sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Typography variant="h5">Finance & Accounting</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AllyviaDateRangePicker value={dateRange} onChange={(v: RangeValue | null) => updateDateRange(v!.start, v!.end)} />
            </Box>
          </Box>
          <Box>
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
                  <Tab
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconChartBar size="20" />
                        <Typography variant="body2">Overview</Typography>
                      </Box>
                    }
                    {...a11yProps(0)}
                  />
                  <Tab
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconReportMoney size="20" />
                        <Typography variant="body2">Financial Statements</Typography>
                      </Box>
                    }
                    {...a11yProps(1)}
                  />
                  <Tab
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconFileInvoice size="20" />
                        <Typography variant="body2">Transactions</Typography>
                      </Box>
                    }
                    {...a11yProps(2)}
                  />
                  <Tab
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconChartBar size="20" />
                        <Typography variant="body2">Trends</Typography>
                      </Box>
                    }
                    {...a11yProps(3)}
                  />
                  {/* <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconSearch size="20" />
                      <Typography variant="body2">API Demo</Typography>
                    </Box>
                  }
                  {...a11yProps(4)}
                /> */}
                </Tabs>
              </Box>

              {/* Overview */}
              <TabPanel value={tab} index={0}>
                <OverviewTab startISO={startISO || ''} endISO={endISO || ''} />
              </TabPanel>

              {/* Financial Statements */}
              <TabPanel value={tab} index={1}>
                <FinancialStatementsTab
                  pnlSummary={pnlSummary}
                  cogsDetail={cogsDetail}
                  grossProfitDetail={grossProfitDetail}
                  balanceSheet={balanceRows}
                  cashFlow={cashFlowRows}
                  startISO={startISO || ''}
                  endISO={endISO || ''}
                />
              </TabPanel>

              {/* Transactions */}
              <TabPanel value={tab} index={2}>
                <TransactionsTab
                  invoices={invoicePageRows}
                  expenses={expensePageRows}
                  ledger={ledgerPageRows}
                  invoiceSummary={invoiceSummary}
                  startISO={startISO || ''}
                  endISO={endISO || ''}
                />
              </TabPanel>

              {/* Analytics */}
              <TabPanel value={tab} index={3}>
                <TrendsTab startISO={startISO || ''} endISO={endISO || ''} />
              </TabPanel>

              {/* API Demo - Removed as component doesn't exist */}
            </Box>
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
}
