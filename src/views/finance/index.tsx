import { useState, useEffect, useMemo } from 'react';
import { parseDate } from '@internationalized/date';
import { Box, Tabs, Tab, Typography, Grid, useTheme, Menu, MenuItem, IconButton, Tooltip, Theme } from '@mui/material';
import { AllyviaDateRangePicker, type RangeValue } from 'ui-component/third-party/DateRangePicker';
import type { DateValue } from 'react-aria';
import { IconDownload, IconFileText, IconFileSpreadsheet } from '@tabler/icons-react';
import { exportFinancePdf } from '../../utils/reports';

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

// Download Report Button Component
interface DownloadReportButtonProps {
  startISO: string;
  endISO: string;
  invoices: InvoiceRow[];
  expenses: Expense[];
  ledger: LedgerRow[];
  pnlSummary: ProfitAndLossSummary | null;
  balanceSheet: BalanceSheetRow[];
  cashFlow: CashFlowRow[];
  theme: Theme;
}

function DownloadReportButton({
  startISO,
  endISO,
  invoices,
  expenses,
  ledger,
  pnlSummary,
  balanceSheet,
  cashFlow,
  theme
}: DownloadReportButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const downloadCSV = () => {
    // Generate comprehensive CSV content for all finance data
    let csvContent = 'data:text/csv;charset=utf-8,';

    // ===== REPORT HEADER =====
    csvContent += 'ALLYVIA FINANCE COMPREHENSIVE REPORT\n';
    csvContent += `Report Period,${startISO} to ${endISO}\n`;
    csvContent += `Generated On,${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\n`;
    csvContent += '\n';

    // ===== EXECUTIVE SUMMARY =====
    csvContent += 'EXECUTIVE SUMMARY\n';
    csvContent += 'Metric,Value,Status\n';

    if (pnlSummary) {
      csvContent += `Total Revenue,${pnlSummary.total_income || 0},${(pnlSummary.total_income || 0) > 0 ? 'Positive' : 'Zero'}\n`;
      csvContent += `Total Expenses,${pnlSummary.total_expenses || 0},${(pnlSummary.total_expenses || 0) > 0 ? 'Active' : 'None'}\n`;
      csvContent += `Gross Profit,${pnlSummary.gross_profit || 0},${(pnlSummary.gross_profit || 0) > 0 ? 'Profitable' : 'Loss'}\n`;
      csvContent += `Net Income,${pnlSummary.net_income || 0},${(pnlSummary.net_income || 0) > 0 ? 'Profitable' : 'Loss'}\n`;
    }

    csvContent += `Total Invoices,${invoices.length},${invoices.length > 0 ? 'Active' : 'None'}\n`;
    csvContent += `Total Expenses,${expenses.length},${expenses.length > 0 ? 'Active' : 'None'}\n`;
    csvContent += '\n';

    // ===== DETAILED INVOICE DATA =====
    csvContent += 'DETAILED INVOICE DATA\n';
    csvContent += 'Invoice ID,Customer,Amount,Status,Issue Date,Due Date,Balance,Invoice Type,Company\n';

    invoices.forEach((invoice) => {
      csvContent += `${invoice.id || 'N/A'},${invoice.customer || 'N/A'},${invoice.amount || 0},${invoice.status || 'N/A'},${invoice.issue_date || 'N/A'},${invoice.due_date || 'N/A'},${invoice.balance || 0},${invoice.daysPastDue || 'N/A'},${invoice.company_name || 'N/A'}\n`;
    });

    csvContent += '\n';

    // ===== INVOICE SUMMARY BY STATUS =====
    csvContent += 'INVOICE SUMMARY BY STATUS\n';
    csvContent += 'Status,Count,Total Amount,Average Amount\n';

    const statusGroups = invoices.reduce(
      (acc, inv) => {
        const status = inv.status || 'unknown';
        if (!acc[status]) {
          acc[status] = { count: 0, total: 0 };
        }
        acc[status].count++;
        acc[status].total += inv.amount || 0;
        return acc;
      },
      {} as Record<string, { count: number; total: number }>
    );

    Object.entries(statusGroups).forEach(([status, data]) => {
      const avg = data.count > 0 ? data.total / data.count : 0;
      csvContent += `${status},${data.count},${data.total},${avg.toFixed(2)}\n`;
    });

    csvContent += '\n';

    // ===== DETAILED EXPENSE DATA =====
    csvContent += 'DETAILED EXPENSE DATA\n';
    csvContent += 'Expense ID,Vendor,Category,Amount,Date,Description,Payment Method,Status,Company\n';

    expenses.forEach((expense) => {
      csvContent += `${expense.id || 'N/A'},${expense.vendor || 'N/A'},${expense.category || 'N/A'},${expense.amount || 0},${expense.date || 'N/A'},${expense.description || 'N/A'},${expense.payment_method || 'N/A'},${expense.status || 'N/A'},${expense.company_name || 'N/A'}\n`;
    });

    csvContent += '\n';

    // ===== EXPENSE SUMMARY BY CATEGORY =====
    csvContent += 'EXPENSE SUMMARY BY CATEGORY\n';
    csvContent += 'Category,Count,Total Amount,Percentage of Total\n';

    const categoryGroups = expenses.reduce(
      (acc, exp) => {
        const category = exp.category || 'unknown';
        if (!acc[category]) {
          acc[category] = { count: 0, total: 0 };
        }
        acc[category].count++;
        acc[category].total += exp.amount || 0;
        return acc;
      },
      {} as Record<string, { count: number; total: number }>
    );

    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    Object.entries(categoryGroups).forEach(([category, data]) => {
      const percentage = totalExpenses > 0 ? ((data.total / totalExpenses) * 100).toFixed(2) : '0.00';
      csvContent += `${category},${data.count},${data.total},${percentage}%\n`;
    });

    csvContent += '\n';

    // ===== BALANCE SHEET DETAILED DATA =====
    if (balanceSheet.length > 0) {
      csvContent += 'BALANCE SHEET DETAILED DATA\n';
      csvContent += 'Account,Category,Amount,Description\n';

      balanceSheet.forEach((item) => {
        csvContent += `${item.account || 'N/A'},${item.category || 'N/A'},${item.amount || 0},${item.subcategory || 'N/A'}\n`;
      });

      csvContent += '\n';

      // Balance Sheet Summary
      csvContent += 'BALANCE SHEET SUMMARY\n';
      csvContent += 'Category,Total Amount,Count\n';

      const categoryTotals = balanceSheet.reduce(
        (acc, item) => {
          const category = item.category || 'unknown';
          if (!acc[category]) {
            acc[category] = { total: 0, count: 0 };
          }
          acc[category].total += item.amount || 0;
          acc[category].count++;
          return acc;
        },
        {} as Record<string, { total: number; count: 0 }>
      );

      Object.entries(categoryTotals).forEach(([category, data]) => {
        csvContent += `${category},${data.total},${data.count}\n`;
      });

      csvContent += '\n';
    }

    // ===== CASH FLOW DETAILED DATA =====
    if (cashFlow.length > 0) {
      csvContent += 'CASH FLOW DETAILED DATA\n';
      csvContent += 'Period,Cash In,Cash Out,Net Cash Flow,Type\n';

      cashFlow.forEach((item) => {
        csvContent += `${item.period || 'N/A'},${item.cash_in || 0},${item.cash_out || 0},${item.net_cash_flow || 0},${item.type || 'N/A'}\n`;
      });

      csvContent += '\n';

      // Cash Flow Summary
      csvContent += 'CASH FLOW SUMMARY\n';
      csvContent += 'Type,Total Amount\n';
      csvContent += `Cash In,${cashFlow.reduce((sum, item) => sum + (item.cash_in || 0), 0)}\n`;
      csvContent += `Cash Out,${cashFlow.reduce((sum, item) => sum + (item.cash_out || 0), 0)}\n`;
      csvContent += `Net Cash Flow,${cashFlow.reduce((sum, item) => sum + (item.net_cash_flow || 0), 0)}\n`;

      csvContent += '\n';
    }

    // ===== TRENDS AND ANALYTICS =====
    csvContent += 'TRENDS AND ANALYTICS\n';
    csvContent += 'Metric,Value,Insight\n';

    // Invoice trends
    const paidInvoices = invoices.filter((inv) => inv.status === 'paid').length;
    const pendingInvoices = invoices.filter((inv) => inv.status === 'pending').length;
    const overdueInvoices = invoices.filter((inv) => inv.status === 'overdue').length;

    csvContent += `Paid Invoices,${paidInvoices},${paidInvoices > 0 ? 'Good collection rate' : 'No collections'}\n`;
    csvContent += `Pending Invoices,${pendingInvoices},${pendingInvoices > 0 ? 'Outstanding receivables' : 'All collected'}\n`;
    csvContent += `Overdue Invoices,${overdueInvoices},${overdueInvoices > 0 ? 'Collection issues' : 'No overdue'}\n`;

    // Expense trends
    const avgExpense = expenses.length > 0 ? expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0) / expenses.length : 0;
    csvContent += `Average Expense,${avgExpense.toFixed(2)},${avgExpense > 0 ? 'Expense management active' : 'No expenses'}\n`;

    // Financial ratios
    if (pnlSummary && pnlSummary.total_income > 0) {
      const expenseRatio = (((pnlSummary.total_expenses || 0) / pnlSummary.total_income) * 100).toFixed(2);
      const profitMargin = (((pnlSummary.net_income || 0) / pnlSummary.total_income) * 100).toFixed(2);

      csvContent += `Expense Ratio,${expenseRatio}%,${parseFloat(expenseRatio) < 80 ? 'Good cost control' : 'High cost structure'}\n`;
      csvContent += `Profit Margin,${profitMargin}%,${parseFloat(profitMargin) > 0 ? 'Profitable operations' : 'Loss making'}\n`;
    }

    csvContent += '\n';

    // ===== RECOMMENDATIONS =====
    csvContent += 'RECOMMENDATIONS AND INSIGHTS\n';
    csvContent += 'Area,Recommendation,Priority\n';

    if (pendingInvoices > 0) {
      csvContent += 'Collections,Focus on collecting pending invoices,High\n';
    }
    if (overdueInvoices > 0) {
      csvContent += 'Collections,Implement stricter payment terms,High\n';
    }
    if (pnlSummary && (pnlSummary.total_expenses || 0) > (pnlSummary.total_income || 0) * 0.8) {
      csvContent += 'Cost Control,Review and optimize expense structure,Medium\n';
    }
    if (expenses.length > invoices.length * 2) {
      csvContent += 'Expense Management,Monitor expense growth vs revenue,Medium\n';
    }

    csvContent += 'Overall,Maintain current financial discipline,Low\n';

    // Create and download file
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `allyvia_comprehensive_finance_report_${startISO}_to_${endISO}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    handleClose();
  };

  const downloadPDF = async () => {
    try {
      // Create date range text
      const dateRangeText = `${startISO} to ${endISO}`;

      // Create comprehensive overview KPIs
      const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
      const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const netIncome = pnlSummary?.net_income || 0;
      const paidInvoices = invoices.filter((inv) => inv.status === 'paid').length;
      const pendingInvoices = invoices.filter((inv) => inv.status === 'pending').length;
      const overdueInvoices = invoices.filter((inv) => inv.status === 'overdue').length;
      const averageInvoice = invoices.length > 0 ? totalRevenue / invoices.length : 0;
      const averageExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;
      const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
      const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;

      // Create KPI objects for PDF
      const overviewKpis = [
        { label: 'Total Revenue', value: totalRevenue, sublabel: 'Total income from all sources' },
        { label: 'Total Expenses', value: totalExpenses, sublabel: 'Total operational costs' },
        { label: 'Net Income', value: netIncome, sublabel: netIncome > 0 ? 'Profitable operations' : 'Loss making' },
        { label: 'Invoice Count', value: invoices.length, sublabel: 'Total invoices issued' },
        {
          label: 'Collection Rate',
          value: `${(invoices.length > 0 ? (paidInvoices / invoices.length) * 100 : 0).toFixed(1)}%`,
          sublabel: 'Percentage of invoices collected'
        },
        { label: 'Paid Invoices', value: paidInvoices, sublabel: 'Successfully collected' },
        { label: 'Pending Invoices', value: pendingInvoices, sublabel: 'Outstanding receivables' },
        { label: 'Overdue Invoices', value: overdueInvoices, sublabel: 'Past due payments' },
        { label: 'Average Invoice', value: averageInvoice, sublabel: 'Mean invoice value' },
        { label: 'Average Expense', value: averageExpense, sublabel: 'Mean expense value' },
        {
          label: 'Profit Margin',
          value: `${profitMargin.toFixed(1)}%`,
          sublabel: 'Net income as % of revenue'
        },
        { label: 'Expense Ratio', value: `${expenseRatio.toFixed(1)}%`, sublabel: 'Expenses as % of revenue' }
      ];

      // Create table data for different sections
      const invoiceStatsTable = {
        columns: ['Status', 'Count', 'Total Amount', 'Average Amount', 'Percentage'],
        rows: [
          {
            status: 'Paid',
            count: invoices.filter((inv) => inv.status === 'paid').length,
            total_amount: invoices.filter((inv) => inv.status === 'paid').reduce((sum, inv) => sum + (inv.amount || 0), 0),
            avg_amount:
              invoices.filter((inv) => inv.status === 'paid').length > 0
                ? invoices.filter((inv) => inv.status === 'paid').reduce((sum, inv) => sum + (inv.amount || 0), 0) /
                  invoices.filter((inv) => inv.status === 'paid').length
                : 0,
            percentage: invoices.length > 0 ? (invoices.filter((inv) => inv.status === 'paid').length / invoices.length) * 100 : 0
          },
          {
            status: 'Pending',
            count: invoices.filter((inv) => inv.status === 'pending').length,
            total_amount: invoices.filter((inv) => inv.status === 'pending').reduce((sum, inv) => sum + (inv.amount || 0), 0),
            avg_amount:
              invoices.filter((inv) => inv.status === 'pending').length > 0
                ? invoices.filter((inv) => inv.status === 'pending').reduce((sum, inv) => sum + (inv.amount || 0), 0) /
                  invoices.filter((inv) => inv.status === 'pending').length
                : 0,
            percentage: invoices.length > 0 ? (invoices.filter((inv) => inv.status === 'pending').length / invoices.length) * 100 : 0
          },
          {
            status: 'Overdue',
            count: invoices.filter((inv) => inv.status === 'overdue').length,
            total_amount: invoices.filter((inv) => inv.status === 'overdue').reduce((sum, inv) => sum + (inv.amount || 0), 0),
            avg_amount:
              invoices.filter((inv) => inv.status === 'overdue').length > 0
                ? invoices.filter((inv) => inv.status === 'overdue').reduce((sum, inv) => sum + (inv.amount || 0), 0) /
                  invoices.filter((inv) => inv.status === 'overdue').length
                : 0,
            percentage: invoices.length > 0 ? (invoices.filter((inv) => inv.status === 'overdue').length / invoices.length) * 100 : 0
          }
        ]
      };

      // Create P&L table and KPIs
      const plTable = pnlSummary
        ? {
            columns: ['Category', 'Amount'],
            rows: [
              { category: 'Total Income', amount: pnlSummary.total_income || 0 },
              { category: 'Cost of Goods Sold', amount: pnlSummary.cost_of_goods_sold || 0 },
              { category: 'Gross Profit', amount: pnlSummary.gross_profit || 0 },
              { category: 'Total Expenses', amount: pnlSummary.total_expenses || 0 },
              { category: 'Net Income', amount: pnlSummary.net_income || 0 }
            ]
          }
        : undefined;

      // Create financial statement KPIs (new format)
      const statementKpis = pnlSummary
        ? [
            { label: 'Total Income', value: pnlSummary.total_income || 0, sublabel: 'Revenue from all sources' },
            { label: 'Cost of Goods Sold', value: pnlSummary.cost_of_goods_sold || 0, sublabel: 'Direct production costs' },
            { label: 'Gross Profit', value: pnlSummary.gross_profit || 0, sublabel: 'Income minus COGS' },
            {
              label: 'Net Income',
              value: pnlSummary.net_income || 0,
              sublabel: pnlSummary.net_income > 0 ? 'Final profit' : 'Net loss'
            },
            {
              label: 'Gross Margin',
              value: `${(pnlSummary.total_income > 0 ? ((pnlSummary.gross_profit || 0) / pnlSummary.total_income) * 100 : 0).toFixed(1)}%`,
              sublabel: 'Gross profit as % of revenue'
            },
            { label: 'Operating Expenses', value: pnlSummary.total_expenses || 0, sublabel: 'Business operation costs' },
            {
              label: 'Operating Income',
              value: (pnlSummary.gross_profit || 0) - (pnlSummary.total_expenses || 0),
              sublabel: 'Profit before other items'
            }
          ]
        : [];

      // Create Balance Sheet table
      const bsTable =
        balanceSheet.length > 0
          ? {
              columns: ['Account', 'Category', 'Amount', 'Subcategory'],
              rows: balanceSheet
            }
          : undefined;

      // Create Cash Flow table
      const cfTable =
        cashFlow.length > 0
          ? {
              columns: ['Period', 'Cash In', 'Cash Out', 'Net Cash Flow', 'Type'],
              rows: cashFlow
            }
          : undefined;

      // Create Invoices table
      const invoicesTable =
        invoices.length > 0
          ? {
              columns: ['ID', 'Customer', 'Amount', 'Status', 'Issue Date', 'Due Date', 'Balance'],
              rows: invoices
            }
          : undefined;

      // Create Expenses table
      const expensesTable =
        expenses.length > 0
          ? {
              columns: ['ID', 'Vendor', 'Category', 'Amount', 'Date', 'Description', 'Payment Method', 'Status'],
              rows: expenses
            }
          : undefined;

      // Create Ledger table
      const ledgerTable =
        ledger.length > 0
          ? {
              columns: ['ID', 'Account', 'Description', 'Amount', 'Type', 'Date'],
              rows: ledger
            }
          : undefined;

      // Prepare the report input
      const reportInput = {
        dateRangeText,
        overview: {
          kpis: overviewKpis,
          invoiceStatsTable
        },
        statements: {
          plKpis: statementKpis,
          plTable,
          bsTable,
          cfTable
        },
        transactions: {
          invoices: invoicesTable,
          expenses: expensesTable,
          ledger: ledgerTable
        },
        trends: {
          charts: [] // Will be populated with chart data URLs if available
        }
      };

      // Export the PDF using the new export function
      await exportFinancePdf(
        'Allyvia Finance Report',
        dateRangeText,
        '/src/assets/images/allyvia_logo.png',
        overviewKpis,
        statementKpis,
        reportInput
      );
    } catch (error) {
      console.error('Error preparing PDF report:', error);
      alert('Error preparing PDF report. Please try again.');
    }

    handleClose();
  };

  return (
    <>
      <Tooltip title="Download Report">
        <IconButton
          onClick={handleClick}
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              bgcolor: 'primary.dark'
            }
          }}
        >
          <IconDownload size={20} />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
      >
        <MenuItem onClick={downloadCSV}>
          <IconFileSpreadsheet size={18} style={{ marginRight: 8 }} />
          Download CSV Report
        </MenuItem>
        <MenuItem onClick={downloadPDF}>
          <IconFileText size={18} style={{ marginRight: 8 }} />
          Download PDF Report
        </MenuItem>
      </Menu>
    </>
  );
}

export default function FinanceTabsPage() {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [dateRange, setDateRange] = useState<RangeValue>({ start: LAST_WEEK, end: TODAY });
  const [isLoading, setIsLoading] = useState(true);

  // ---------- shared (for summaries) ----------
  const startISO = useMemo(() => toISO(dateRange?.start), [dateRange?.start]);
  const endISO = useMemo(() => toISO(dateRange?.end), [dateRange?.end]);

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

              {/* Download Report Button */}
              <DownloadReportButton
                startISO={startISO || ''}
                endISO={endISO || ''}
                invoices={invoicePageRows}
                expenses={expensePageRows}
                ledger={ledgerPageRows}
                pnlSummary={pnlSummary}
                balanceSheet={balanceRows}
                cashFlow={cashFlowRows}
                theme={theme}
              />
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
                  {/* <Tab
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconChartBar size="20" />
                        <Typography variant="body2">Trends</Typography>
                      </Box>
                    }
                    {...a11yProps(3)}
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
              {/* Analytics
              <TabPanel value={tab} index={3}>
                <TrendsTab startISO={startISO || ''} endISO={endISO || ''} />
              </TabPanel> */}
            </Box>
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
}
