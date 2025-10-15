import { buildFinancePdfReport, loadLogoAsDataUrl, type TableCol } from './financePdfReports';

// Define types locally since they're not exported from financePdfReports
type KPI = {
  label: string;
  value: string | number;
  sublabel?: string;
};

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Helper function to format percentage
const formatPercentage = (value: number): string => {
  return `${Number(value).toFixed(2)}%`;
};

// Helper function to round numbers to 2 decimal places
const roundToTwoDecimals = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

export async function exportFinancePdf(
  title: string,
  duration: string,
  logoPath: string,
  kpis: KPI[],
  statementKpis: KPI[],
  reportData: any
): Promise<void> {
  try {
    // Load logo
    const logoDataUrl = await loadLogoAsDataUrl(logoPath);

    // Convert old KPI format to new format
    const newKpis = kpis.map((kpi) => ({
      label: kpi.label,
      value: typeof kpi.value === 'number' ? formatCurrency(kpi.value) : kpi.value,
      sublabel: kpi.sublabel
    }));

    const newStatementKpis = statementKpis.map((kpi) => ({
      label: kpi.label,
      value: typeof kpi.value === 'number' ? formatCurrency(kpi.value) : kpi.value,
      sublabel: kpi.sublabel
    }));

    // Create sections for all the tables
    const sections: any[] = [];

    // 1. Outstanding Invoices Summary
    if (reportData.overview?.invoiceStatsTable) {
      const invoiceStats = reportData.overview.invoiceStatsTable;
      sections.push({
        kind: 'table',
        title: 'Outstanding Invoices Summary',
        columns: [
          { header: 'Status', dataKey: 'status', widthPct: 20, align: 'left' },
          { header: 'Count', dataKey: 'count', widthPct: 15, align: 'center' },
          { header: 'Total Amount', dataKey: 'total_amount', widthPct: 25, align: 'right' },
          { header: 'Average Amount', dataKey: 'avg_amount', widthPct: 25, align: 'right' },
          { header: 'Percentage', dataKey: 'percentage', widthPct: 15, align: 'right' }
        ],
        rows: invoiceStats.rows.map((row: any) => ({
          status: row.status,
          count: row.count,
          total_amount: formatCurrency(row.total_amount),
          avg_amount: formatCurrency(row.avg_amount),
          percentage: formatPercentage(row.percentage)
        }))
      });
    }

    // 2. Expense Analysis by Category
    if (reportData.transactions?.expenses) {
      const expenses = reportData.transactions.expenses;
      const categoryGroups = expenses.rows.reduce((acc: any, exp: any) => {
        const category = exp.category || 'Unknown';
        if (!acc[category]) {
          acc[category] = { count: 0, total: 0 };
        }
        acc[category].count++;
        acc[category].total += Number(exp.amount) || 0;
        return acc;
      }, {});

      const totalExpenses = expenses.rows.reduce((sum: number, exp: any) => sum + (Number(exp.amount) || 0), 0);

      const expenseCategoryRows = Object.entries(categoryGroups).map(([category, data]: [string, any]) => ({
        category,
        count: data.count,
        total_amount: formatCurrency(roundToTwoDecimals(data.total)),
        avg_amount: formatCurrency(roundToTwoDecimals(data.total / data.count)),
        percentage: formatPercentage(roundToTwoDecimals((data.total / totalExpenses) * 100))
      }));

      sections.push({
        kind: 'table',
        title: 'Expense Analysis by Category',
        columns: [
          { header: 'Category', dataKey: 'category', widthPct: 25, align: 'left' },
          { header: 'Count', dataKey: 'count', widthPct: 15, align: 'center' },
          { header: 'Total Amount', dataKey: 'total_amount', widthPct: 25, align: 'right' },
          { header: 'Average Amount', dataKey: 'avg_amount', widthPct: 20, align: 'right' },
          { header: 'Percentage of Total', dataKey: 'percentage', widthPct: 15, align: 'right' }
        ],
        rows: expenseCategoryRows
      });
    }

    // 3. Profit & Loss Statement
    if (reportData.statements?.plTable) {
      const plTable = reportData.statements.plTable;
      sections.push({
        kind: 'table',
        title: 'Profit & Loss Statement',
        columns: [
          { header: 'Category', dataKey: 'category', widthPct: 50, align: 'left' },
          { header: 'Amount', dataKey: 'amount', widthPct: 50, align: 'right' }
        ],
        rows: plTable.rows.map((row: any) => ({
          category: row.category,
          amount: formatCurrency(row.amount)
        }))
      });
    }

    // 4. Balance Sheet
    if (reportData.statements?.bsTable) {
      const bsTable = reportData.statements.bsTable;
      sections.push({
        kind: 'table',
        title: 'Balance Sheet',
        columns: [
          { header: 'Account', dataKey: 'account', widthPct: 30, align: 'left' },
          { header: 'Category', dataKey: 'category', widthPct: 20, align: 'left' },
          { header: 'Amount', dataKey: 'amount', widthPct: 25, align: 'right' },
          { header: 'Subcategory', dataKey: 'subcategory', widthPct: 25, align: 'left' }
        ],
        rows: bsTable.rows.map((row: any) => ({
          account: row.account,
          category: row.category,
          amount: formatCurrency(row.amount),
          subcategory: row.subcategory
        }))
      });
    }

    // 5. Cash Flow Statement
    if (reportData.statements?.cfTable) {
      const cfTable = reportData.statements.cfTable;
      sections.push({
        kind: 'table',
        title: 'Cash Flow Statement',
        columns: [
          { header: 'Period', dataKey: 'period', widthPct: 30, align: 'left' },
          { header: 'Cash In', dataKey: 'cash_in', widthPct: 20, align: 'right' },
          { header: 'Cash Out', dataKey: 'cash_out', widthPct: 20, align: 'right' },
          { header: 'Net Cash Flow', dataKey: 'net_cash_flow', widthPct: 20, align: 'right' },
          { header: 'Type', dataKey: 'type', widthPct: 10, align: 'left' }
        ],
        rows: cfTable.rows.map((row: any) => ({
          period: row.period,
          cash_in: formatCurrency(row.cash_in),
          cash_out: formatCurrency(row.cash_out),
          net_cash_flow: formatCurrency(row.net_cash_flow),
          type: row.type
        }))
      });
    }

    // 6. Outstanding Invoice Details
    if (reportData.transactions?.invoices) {
      const invoices = reportData.transactions.invoices;
      sections.push({
        kind: 'table',
        title: 'Outstanding Invoice Details',
        columns: [
          { header: 'ID', dataKey: 'id', widthPct: 15, align: 'left' },
          { header: 'Customer', dataKey: 'customer', widthPct: 25, align: 'left' },
          { header: 'Amount', dataKey: 'amount', widthPct: 20, align: 'right' },
          { header: 'Status', dataKey: 'status', widthPct: 15, align: 'center' },
          { header: 'Issue Date', dataKey: 'issue_date', widthPct: 15, align: 'center' },
          { header: 'Due Date', dataKey: 'due_date', widthPct: 15, align: 'center' },
          { header: 'Balance', dataKey: 'balance', widthPct: 15, align: 'right' }
        ],
        rows: invoices.rows.map((row: any) => ({
          id: row.id,
          customer: row.customer,
          amount: formatCurrency(row.amount),
          status: row.status,
          issue_date: row.issue_date,
          due_date: row.due_date,
          balance: formatCurrency(row.balance)
        }))
      });
    }

    // 7. Expense Details
    if (reportData.transactions?.expenses) {
      const expenses = reportData.transactions.expenses;
      sections.push({
        kind: 'table',
        title: 'Expense Details',
        columns: [
          { header: 'ID', dataKey: 'id', widthPct: 10, align: 'left' },
          { header: 'Vendor', dataKey: 'vendor', widthPct: 20, align: 'left' },
          { header: 'Category', dataKey: 'category', widthPct: 15, align: 'left' },
          { header: 'Amount', dataKey: 'amount', widthPct: 15, align: 'right' },
          { header: 'Date', dataKey: 'date', widthPct: 15, align: 'center' },
          { header: 'Description', dataKey: 'description', widthPct: 20, align: 'left' },
          { header: 'Payment Method', dataKey: 'payment_method', widthPct: 15, align: 'left' },
          { header: 'Status', dataKey: 'status', widthPct: 10, align: 'center' }
        ],
        rows: expenses.rows.map((row: any) => ({
          id: row.id,
          vendor: row.vendor,
          category: row.category,
          amount: formatCurrency(row.amount),
          date: row.date,
          description: row.description,
          payment_method: row.payment_method,
          status: row.status
        }))
      });
    }

    // 8. Financial Insights
    const insights: string[] = [];

    // Add insights based on data
    if (reportData.overview?.kpis) {
      const kpis = reportData.overview.kpis;
      const revenue = kpis.find((k: any) => k.label === 'Total Revenue')?.value;
      const expenses = kpis.find((k: any) => k.label === 'Total Expenses')?.value;
      const netIncome = kpis.find((k: any) => k.label === 'Net Income')?.value;

      if (revenue && expenses) {
        const expenseRatio = (Number(expenses) / Number(revenue)) * 100;
        if (expenseRatio > 80) {
          insights.push('High expense ratio detected - consider cost optimization strategies');
        }
      }

      if (netIncome && Number(netIncome) < 0) {
        insights.push('Negative net income - review revenue streams and cost structure');
      }
    }

    if (insights.length > 0) {
      sections.push({
        kind: 'insights',
        title: 'Financial Insights & Recommendations',
        bullets: insights
      });
    }

    // Build the PDF report
    await buildFinancePdfReport({
      title,
      subtitle: `Generated on ${new Date().toLocaleDateString()}`,
      duration,
      logoDataUrl: logoDataUrl,
      kpis: newKpis,
      statementKpis: newStatementKpis,
      charts: [], // No charts for now, just tables
      sections,
      fileName: `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    });
  } catch (error) {
    console.error('Error generating PDF report:', error);
    throw error;
  }
}

// Quick export function for simple reports
export async function quickExportFinancePdf(title: string, duration: string, logoPath: string, kpis: KPI[]): Promise<void> {
  try {
    const logoDataUrl = await loadLogoAsDataUrl(logoPath);

    await buildFinancePdfReport({
      title,
      subtitle: `Generated on ${new Date().toLocaleDateString()}`,
      duration,
      logoDataUrl,
      kpis,
      statementKpis: [],
      charts: [],
      sections: [],
      fileName: `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    });
  } catch (error) {
    console.error('Error generating quick PDF report:', error);
    throw error;
  }
}

// Export types for use in other files
export type { KPI, TableCol };
