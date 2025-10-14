// Pure PDF generation logic for finance reports
import { exportFinancePdf } from './exportFinanceReport';
import { FinanceCsvData } from './financeCsvGenerator';

export interface FinancePdfData extends FinanceCsvData {}

export function generateFinancePdfKpis(data: FinancePdfData): {
  overviewKpis: Array<{ label: string; value: any; sublabel: string }>;
  statementKpis: Array<{ label: string; value: any; sublabel: string }>;
} {
  const invoices = Array.isArray(data.invoiceList) ? data.invoiceList : [];
  const expenses = Array.isArray(data.topExpenses) ? data.topExpenses : [];

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

    // Export PDF using existing utility
    await exportFinancePdf('Allyvia Finance Report', dateRangeText, '/src/assets/images/allyvia_logo.png', overviewKpis, statementKpis, {
      dateRangeText,
      overview: { kpis: overviewKpis },
      statements: { plKpis: statementKpis },
      transactions: {},
      trends: { charts: [] }
    });
  } catch (error) {
    console.error('Error preparing PDF report:', error);
    throw new Error('Error preparing PDF report. Please try again.');
  }
}
