// Pure CSV generation logic for finance reports
import { formatPercent, marginOf, toNum } from 'utils/financeFormat';

export interface FinanceCsvData {
  profitAndLoss?: any;
  invoiceList?: any[];
  topExpenses?: any[];
  expensesList?: any;
  balanceSheet?: any[];
  cashFlow?: any[];
  invoiceStatistics?: any;
  expenseSummary?: any;
}

export function generateFinanceCsvContent(data: FinanceCsvData, startISO: string, endISO: string): string {
  const invoices = Array.isArray(data.invoiceList) ? data.invoiceList : [];
  const expenses = Array.isArray(data.expensesList)
    ? data.expensesList
    : Array.isArray(data.expensesList?.results)
      ? data.expensesList.results
      : Array.isArray(data.expensesList?.items)
        ? data.expensesList.items
        : Array.isArray(data.topExpenses)
          ? data.topExpenses
          : [];
  const balanceSheetData = Array.isArray(data.balanceSheet) ? data.balanceSheet : [];
  const cashFlowData = Array.isArray(data.cashFlow) ? data.cashFlow : [];

  let csvContent = 'data:text/csv;charset=utf-8,';

  // Report header
  csvContent += 'ALLYVIA FINANCE COMPREHENSIVE REPORT\n';
  csvContent += `Report Period,${startISO} to ${endISO}\n`;
  csvContent += `Generated On,${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\n\n`;

  // Executive summary
  csvContent += 'EXECUTIVE SUMMARY\n';
  csvContent += 'Metric,Value,Status\n';

  if (data.profitAndLoss) {
    // Coerce before comparing: decimal strings ("-500.00") are truthy and
    // compare unreliably against numbers.
    const totalIncome = toNum(data.profitAndLoss.total_income);
    const totalExpenses = toNum(data.profitAndLoss.total_expenses);
    const grossProfit = toNum(data.profitAndLoss.gross_profit);
    const netIncome = toNum(data.profitAndLoss.net_income);
    csvContent += `Total Revenue,${totalIncome},${totalIncome > 0 ? 'Positive' : 'Zero'}\n`;
    csvContent += `Total Expenses,${totalExpenses},${totalExpenses > 0 ? 'Active' : 'None'}\n`;
    csvContent += `Gross Profit,${grossProfit},${grossProfit > 0 ? 'Profitable' : 'Loss'}\n`;
    csvContent += `Net Income,${netIncome},${netIncome > 0 ? 'Profitable' : 'Loss'}\n`;
  }

  csvContent += `Total Invoices,${invoices.length},${invoices.length > 0 ? 'Active' : 'None'}\n`;
  csvContent += `Total Expenses,${expenses.length},${expenses.length > 0 ? 'Active' : 'None'}\n\n`;

  // Invoice data
  csvContent += 'DETAILED INVOICE DATA\n';
  csvContent += 'Invoice ID,Customer,Amount,Status,Issue Date,Due Date,Balance\n';

  invoices.forEach((invoice: any) => {
    csvContent += `${invoice.id || 'N/A'},${invoice.customer_name || 'N/A'},${invoice.total_amount || 0},${invoice.status || 'N/A'},${invoice.date || 'N/A'},${invoice.due_date || 'N/A'},${invoice.balance || 0}\n`;
  });

  csvContent += '\n';

  // Invoice summary by status
  csvContent += 'INVOICE SUMMARY BY STATUS\n';
  csvContent += 'Status,Count,Total Amount,Average Amount\n';

  const statusGroups = invoices.reduce(
    (acc: any, inv: any) => {
      const status = inv.status || 'unknown';
      if (!acc[status]) {
        acc[status] = { count: 0, total: 0 };
      }
      acc[status].count++;
      acc[status].total += parseFloat(inv.total_amount || '0');
      return acc;
    },
    {} as Record<string, { count: number; total: number }>
  );

  Object.entries(statusGroups).forEach(([status, statusData]: [string, any]) => {
    const avg = statusData.count > 0 ? statusData.total / statusData.count : 0;
    csvContent += `${status},${statusData.count},${statusData.total},${avg.toFixed(2)}\n`;
  });

  csvContent += '\n';

  // Expense data
  csvContent += 'DETAILED EXPENSE DATA\n';
  csvContent += 'Expense ID,Vendor,Category,Amount,Date,Description\n';

  expenses.forEach((expense: any) => {
    csvContent += `${expense.id || 'N/A'},${expense.vendor_name || 'N/A'},${expense.category_name || 'N/A'},${expense.amount || 0},${expense.date || 'N/A'},${expense.description || 'N/A'}\n`;
  });

  csvContent += '\n';

  // Expense summary by category
  csvContent += 'EXPENSE SUMMARY BY CATEGORY\n';
  csvContent += 'Category,Count,Total Amount,Percentage of Total\n';

  const categoryGroups = expenses.reduce(
    (acc: any, exp: any) => {
      const category = exp.category_name || 'unknown';
      if (!acc[category]) {
        acc[category] = { count: 0, total: 0 };
      }
      acc[category].count++;
      acc[category].total += parseFloat(exp.amount || '0');
      return acc;
    },
    {} as Record<string, { count: number; total: number }>
  );

  const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount || '0'), 0);

  Object.entries(categoryGroups).forEach(([category, categoryData]: [string, any]) => {
    const percentage = totalExpenses > 0 ? ((categoryData.total / totalExpenses) * 100).toFixed(2) : '0.00';
    csvContent += `${category},${categoryData.count},${categoryData.total},${percentage}%\n`;
  });

  csvContent += '\n';

  // Balance Sheet data
  if (balanceSheetData.length > 0) {
    csvContent += 'BALANCE SHEET DETAILED DATA\n';
    csvContent += 'Account,Category,Amount,Description\n';

    balanceSheetData.forEach((item: any) => {
      csvContent += `${item.account_name || 'N/A'},${item.category || 'N/A'},${item.balance || 0},${item.description || 'N/A'}\n`;
    });

    csvContent += '\n';
  }

  // Cash Flow data
  if (cashFlowData.length > 0) {
    csvContent += 'CASH FLOW DETAILED DATA\n';
    csvContent += 'Period,Cash In,Cash Out,Net Cash Flow,Type\n';

    cashFlowData.forEach((item: any) => {
      csvContent += `${item.period || 'N/A'},${item.cash_in || 0},${item.cash_out || 0},${item.net_cash_flow || 0},${item.type || 'N/A'}\n`;
    });

    csvContent += '\n';
  }

  // Trends and analytics
  csvContent += 'TRENDS AND ANALYTICS\n';
  csvContent += 'Metric,Value,Insight\n';

  // Invoice trends
  const paidInvoices = invoices.filter((inv: any) => inv.status === 'paid').length;
  const pendingInvoices = invoices.filter((inv: any) => inv.status === 'pending').length;
  const overdueInvoices = invoices.filter((inv: any) => inv.status === 'overdue').length;

  csvContent += `Paid Invoices,${paidInvoices},${paidInvoices > 0 ? 'Good collection rate' : 'No collections'}\n`;
  csvContent += `Pending Invoices,${pendingInvoices},${pendingInvoices > 0 ? 'Outstanding receivables' : 'All collected'}\n`;
  csvContent += `Overdue Invoices,${overdueInvoices},${overdueInvoices > 0 ? 'Collection issues' : 'No overdue'}\n`;

  // Expense trends
  const avgExpense =
    expenses.length > 0 ? expenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount || '0'), 0) / expenses.length : 0;
  csvContent += `Average Expense,${avgExpense.toFixed(2)},${avgExpense > 0 ? 'Expense management active' : 'No expenses'}\n`;

  // Financial ratios. Margins are undefined with no revenue — written as an
  // em dash, never 0% or -Infinity%.
  if (data.profitAndLoss) {
    const expenseRatio = marginOf(data.profitAndLoss.total_expenses, data.profitAndLoss.total_income);
    const profitMargin = marginOf(data.profitAndLoss.net_income, data.profitAndLoss.total_income);

    csvContent += `Expense Ratio,${formatPercent(expenseRatio, 2)},${
      expenseRatio === null ? 'No revenue in period' : expenseRatio < 80 ? 'Good cost control' : 'High cost structure'
    }\n`;
    csvContent += `Profit Margin,${formatPercent(profitMargin, 2)},${
      profitMargin === null ? 'No revenue in period' : profitMargin > 0 ? 'Profitable operations' : 'Loss making'
    }\n`;
  }

  csvContent += '\n';

  // Recommendations
  csvContent += 'RECOMMENDATIONS AND INSIGHTS\n';
  csvContent += 'Area,Recommendation,Priority\n';

  if (pendingInvoices > 0) {
    csvContent += 'Collections,Focus on collecting pending invoices,High\n';
  }
  if (overdueInvoices > 0) {
    csvContent += 'Collections,Implement stricter payment terms,High\n';
  }
  if (data.profitAndLoss && (data.profitAndLoss.total_expenses || 0) > (data.profitAndLoss.total_income || 0) * 0.8) {
    csvContent += 'Cost Control,Review and optimize expense structure,Medium\n';
  }
  if (expenses.length > invoices.length * 2) {
    csvContent += 'Expense Management,Monitor expense growth vs revenue,Medium\n';
  }

  csvContent += 'Overall,Maintain current financial discipline,Low\n';

  return csvContent;
}

export function downloadFinanceCsv(data: FinanceCsvData, startISO: string, endISO: string): void {
  const csvContent = generateFinanceCsvContent(data, startISO, endISO);

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `allyvia_finance_report_${startISO}_to_${endISO}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
