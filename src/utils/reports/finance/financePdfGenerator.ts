// Pure PDF generation logic for finance reports
import { exportFinancePdf } from './exportFinanceReport';
import { FinanceCsvData } from './financeCsvGenerator';
import logoUrl from 'assets/images/allyvia_logo.svg';

export interface FinancePdfData extends FinanceCsvData {}

const toNum = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const getInvoices = (data: FinancePdfData): any[] => {
  if (Array.isArray(data.invoiceList)) return data.invoiceList;
  if (Array.isArray((data as any).invoiceList?.items)) return (data as any).invoiceList.items;
  if (Array.isArray((data as any).invoiceList?.results)) return (data as any).invoiceList.results;
  return [];
};

const getExpenses = (data: FinancePdfData): any[] => {
  if (Array.isArray((data as any).expensesList)) return (data as any).expensesList;
  if (Array.isArray((data as any).expensesList?.items)) return (data as any).expensesList.items;
  if (Array.isArray((data as any).expensesList?.results)) return (data as any).expensesList.results;
  if (Array.isArray(data.topExpenses)) return data.topExpenses;
  return [];
};

const buildReportData = (data: FinancePdfData, overviewKpis: Array<{ label: string; value: any; sublabel: string }>) => {
  const invoices = getInvoices(data);
  const expenses = getExpenses(data);

  const statusBuckets = invoices.reduce((acc: Record<string, { count: number; total: number }>, inv: any) => {
    const status = String(inv.status || 'unknown');
    if (!acc[status]) acc[status] = { count: 0, total: 0 };
    acc[status].count += 1;
    acc[status].total += toNum(inv.total_amount ?? inv.amount);
    return acc;
  }, {});

  const invoiceStatsRows = Object.entries(statusBuckets).map(([status, bucket]) => ({
    status,
    count: bucket.count,
    total_amount: bucket.total,
    avg_amount: bucket.count > 0 ? bucket.total / bucket.count : 0,
    percentage: invoices.length > 0 ? (bucket.count / invoices.length) * 100 : 0
  }));

  const plRows = data.profitAndLoss
    ? [
        { category: 'Total Income', amount: toNum(data.profitAndLoss.total_income) },
        { category: 'Cost of Goods Sold', amount: toNum(data.profitAndLoss.cost_of_goods_sold) },
        { category: 'Total Expenses', amount: toNum(data.profitAndLoss.total_expenses) },
        { category: 'Gross Profit', amount: toNum(data.profitAndLoss.gross_profit) },
        { category: 'Net Income', amount: toNum(data.profitAndLoss.net_income) }
      ]
    : [];

  const bs = (data as any).balanceSheet?.balance_sheet ?? (data as any).balanceSheet ?? {};
  const bsRows: Array<{ account: string; category: string; amount: number; subcategory: string }> = [];

  const pushBalanceSection = (section: any, category: string) => {
    if (!section || typeof section !== 'object') return;
    Object.entries(section).forEach(([key, value]) => {
      if (key === 'total' || key.startsWith('total_')) return;
      if (value && typeof value === 'object') {
        const amount = toNum((value as any).amount ?? (value as any).total ?? (value as any).balance);
        bsRows.push({
          account: String((value as any).name || key).replace(/_/g, ' '),
          category,
          amount,
          subcategory: key.replace(/_/g, ' ')
        });
      }
    });
  };

  pushBalanceSection(bs.assets, 'Assets');
  pushBalanceSection(bs.liabilities, 'Liabilities');
  pushBalanceSection(bs.equity, 'Equity');

  const cashFlow = (data as any).cashFlow?.cash_flow ?? (data as any).cashFlow ?? {};
  const cfRows = Array.isArray(cashFlow.monthly_breakdown)
    ? cashFlow.monthly_breakdown.map((row: any) => ({
        period: row.month || row.period || row.date || 'N/A',
        cash_in: toNum(row.cash_in),
        cash_out: toNum(row.cash_out),
        net_cash_flow: toNum(row.net_cash_flow),
        type: 'Monthly'
      }))
    : [];

  const invoiceRows = invoices.map((inv: any) => ({
    id: inv.id ?? inv.qb_invoice_id ?? 'N/A',
    customer: inv.customer_name || inv.customer || 'N/A',
    amount: toNum(inv.total_amount ?? inv.amount),
    status: inv.status || 'N/A',
    issue_date: inv.date || inv.issue_date || 'N/A',
    due_date: inv.due_date || 'N/A',
    balance: toNum(inv.balance ?? inv.balance_due ?? inv.total_amount ?? inv.amount)
  }));

  const expenseRows = expenses.map((exp: any) => ({
    id: exp.id ?? exp.qb_expense_id ?? 'N/A',
    vendor: exp.vendor_name || exp.vendor || 'N/A',
    category: exp.category_name || exp.category || 'N/A',
    amount: toNum(exp.amount),
    date: exp.date || exp.transaction_date || 'N/A',
    description: exp.description || 'N/A',
    payment_method: exp.payment_method || exp.payment_type || 'N/A',
    status: exp.status || 'N/A'
  }));

  return {
    overview: {
      kpis: overviewKpis,
      invoiceStatsTable: {
        rows: invoiceStatsRows
      }
    },
    statements: {
      plTable: { rows: plRows },
      bsTable: { rows: bsRows },
      cfTable: { rows: cfRows }
    },
    transactions: {
      invoices: { rows: invoiceRows },
      expenses: { rows: expenseRows }
    },
    trends: { charts: [] }
  };
};

export function generateFinancePdfKpis(data: FinancePdfData): {
  overviewKpis: Array<{ label: string; value: any; sublabel: string }>;
  statementKpis: Array<{ label: string; value: any; sublabel: string }>;
} {
  const invoices = getInvoices(data);
  const expenses = getExpenses(data);

  // Create comprehensive overview KPIs
  const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.total_amount || '0'), 0);
  const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount || '0'), 0);
  const netIncome = data.profitAndLoss?.net_income || 0;
  const paidInvoices = invoices.filter((inv: any) => inv.status === 'paid').length;
  const pendingInvoices = invoices.filter((inv: any) => inv.status === 'pending').length;
  const overdueInvoices = invoices.filter((inv: any) => inv.status === 'overdue').length;

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
    { label: 'Overdue Invoices', value: overdueInvoices, sublabel: 'Past due payments' }
  ];

  // Create financial statement KPIs
  const statementKpis = data.profitAndLoss
    ? [
        { label: 'Total Income', value: data.profitAndLoss.total_income || 0, sublabel: 'Revenue from all sources' },
        { label: 'Cost of Goods Sold', value: data.profitAndLoss.cost_of_goods_sold || 0, sublabel: 'Direct production costs' },
        { label: 'Gross Profit', value: data.profitAndLoss.gross_profit || 0, sublabel: 'Income minus COGS' },
        {
          label: 'Net Income',
          value: data.profitAndLoss.net_income || 0,
          sublabel: data.profitAndLoss.net_income > 0 ? 'Final profit' : 'Net loss'
        },
        {
          label: 'Gross Margin',
          value: `${(data.profitAndLoss.total_income > 0 ? ((data.profitAndLoss.gross_profit || 0) / data.profitAndLoss.total_income) * 100 : 0).toFixed(1)}%`,
          sublabel: 'Gross profit as % of revenue'
        },
        { label: 'Operating Expenses', value: data.profitAndLoss.total_expenses || 0, sublabel: 'Business operation costs' }
      ]
    : [];

  return { overviewKpis, statementKpis };
}

export async function downloadFinancePdf(data: FinancePdfData, startISO: string, endISO: string): Promise<void> {
  try {
    const dateRangeText = `${startISO} to ${endISO}`;
    const { overviewKpis, statementKpis } = generateFinancePdfKpis(data);
    const reportData = buildReportData(data, overviewKpis);

    // Export PDF using existing utility
    await exportFinancePdf('Allyvia Finance Report', dateRangeText, logoUrl, overviewKpis, statementKpis, reportData);
  } catch (error) {
    console.error('Error preparing PDF report:', error);
    throw new Error('Error preparing PDF report. Please try again.');
  }
}
