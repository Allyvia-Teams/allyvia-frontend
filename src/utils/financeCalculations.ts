// src/utils/financeCalculations.ts
// Comprehensive financial calculations derived from list data
// Ensures data consistency across all time periods

import type {
  InvoiceRow,
  Expense,
  PaymentDetail,
  ProfitAndLossSummary,
  COGSDetail,
  GrossProfitDetail,
  BalanceSheetRow,
  CashFlowRow,
  AgingBucket,
  LedgerRow,
  KPI,
  TimeseriesPoint
} from 'types/finance';

// ============================================================================
// Date Range Filtering Utilities
// ============================================================================

export function isDateInRange(date: string, startDate?: string, endDate?: string): boolean {
  if (!startDate || !endDate) return true;

  const itemDate = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);

  const result = itemDate >= start && itemDate <= end;

  return result;
}

export function filterByDateRange<T extends { date?: string; issue_date?: string; due_date?: string; payment_date?: string }>(
  items: T[],
  startDate?: string,
  endDate?: string
): T[] {
  if (!startDate && !endDate) {
    return items;
  }

  return items.filter((item) => {
    // Check for different date properties
    const itemDate = item.date || item.issue_date || item.due_date || item.payment_date;

    if (!itemDate) {
      return false;
    }

    const date = new Date(itemDate);

    if (startDate && date < new Date(startDate)) {
      return false;
    }
    if (endDate && date > new Date(endDate)) {
      return false;
    }
    return true;
  });
}

// ============================================================================
// Invoice Calculations
// ============================================================================

export function calculateInvoiceSummary(
  invoices: InvoiceRow[],
  startDate?: string,
  endDate?: string
): {
  total_invoices: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  overdue_amount: number;
  average_invoice_value: number;
  invoices_by_status: { paid: number; pending: number; overdue: number };
} {
  const filteredInvoices = filterByDateRange(invoices, startDate, endDate);

  const summary = {
    total_invoices: filteredInvoices.length,
    total_amount: 0,
    paid_amount: 0,
    outstanding_amount: 0,
    overdue_amount: 0,
    average_invoice_value: 0,
    invoices_by_status: { paid: 0, pending: 0, overdue: 0 }
  };

  filteredInvoices.forEach((invoice) => {
    summary.total_amount += invoice.amount || 0;

    if (invoice.status === 'paid') {
      summary.paid_amount += invoice.amount || 0;
      summary.invoices_by_status.paid++;
    } else if (invoice.status === 'pending') {
      summary.outstanding_amount += invoice.balance || invoice.amount || 0;
      summary.invoices_by_status.pending++;
    } else if (invoice.status === 'overdue') {
      summary.overdue_amount += invoice.balance || invoice.amount || 0;
      summary.invoices_by_status.overdue++;
    }
  });

  summary.average_invoice_value = summary.total_invoices > 0 ? summary.total_amount / summary.total_invoices : 0;

  return summary;
}

export function calculateInvoiceTrends(invoices: InvoiceRow[], startDate?: string, endDate?: string): TimeseriesPoint[] {
  const filteredInvoices = filterByDateRange(invoices, startDate, endDate);

  const trendsByDate = new Map<
    string,
    {
      invoices_issued: number;
      total_amount: number;
      paid_amount: number;
      outstanding_amount: number;
    }
  >();

  filteredInvoices.forEach((invoice) => {
    const date = invoice.issue_date || 'unknown';
    const current = trendsByDate.get(date) || {
      invoices_issued: 0,
      total_amount: 0,
      paid_amount: 0,
      outstanding_amount: 0
    };

    current.invoices_issued++;
    current.total_amount += invoice.amount || 0;

    if (invoice.status === 'paid') {
      current.paid_amount += invoice.amount || 0;
    } else {
      current.outstanding_amount += invoice.balance || 0;
    }

    trendsByDate.set(date, current);
  });

  return Array.from(trendsByDate.entries()).map(([date, data]) => ({
    t: date,
    revenue: data.total_amount,
    expense: 0,
    profit: data.total_amount,
    cash_in: data.paid_amount,
    cash_out: 0,
    company_id: 'default',
    company_name: 'Default Company',
    period: 'monthly'
  }));
}

export function calculateTopCustomers(
  invoices: InvoiceRow[],
  startDate?: string,
  endDate?: string,
  limit: number = 10
): Array<{
  customer: string;
  total_amount: number;
  invoice_count: number;
  percentage_of_total: number;
}> {
  const filteredInvoices = filterByDateRange(invoices, startDate, endDate);

  const customerTotals = new Map<string, { total_amount: number; invoice_count: number }>();
  let grandTotal = 0;

  filteredInvoices.forEach((invoice) => {
    const customer = invoice.customer;
    const amount = invoice.amount || 0;

    const current = customerTotals.get(customer) || { total_amount: 0, invoice_count: 0 };
    current.total_amount += amount;
    current.invoice_count++;
    customerTotals.set(customer, current);

    grandTotal += amount;
  });

  return Array.from(customerTotals.entries())
    .map(([customer, data]) => ({
      customer,
      total_amount: data.total_amount,
      invoice_count: data.invoice_count,
      percentage_of_total: grandTotal > 0 ? (data.total_amount / grandTotal) * 100 : 0
    }))
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, limit);
}

// ============================================================================
// Expense Calculations
// ============================================================================

export function calculateExpenseSummary(
  expenses: Expense[],
  startDate?: string,
  endDate?: string
): {
  total_expenses: number;
  total_transactions: number;
  average_expense: number;
  expenses_by_category: Array<{
    category: string;
    amount: number;
    percentage: number;
    count: number;
    company_id: string;
    company_name: string;
  }>;
  expenses_by_type: Array<{
    type: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
} {
  const filteredExpenses = filterByDateRange(expenses, startDate, endDate);

  const summary = {
    total_expenses: 0,
    total_transactions: filteredExpenses.length,
    average_expense: 0,
    expenses_by_category: new Map<string, { amount: number; count: number; company_id: string; company_name: string }>(),
    expenses_by_type: new Map<string, { amount: number; count: number }>()
  };

  filteredExpenses.forEach((expense) => {
    const amount = expense.amount || 0;
    summary.total_expenses += amount;

    // Category breakdown
    const category = expense.category || 'Other';
    const currentCategory = summary.expenses_by_category.get(category) || {
      amount: 0,
      count: 0,
      company_id: expense.company_id || 'comp-001',
      company_name: expense.company_name || 'ABC Corp'
    };
    currentCategory.amount += amount;
    currentCategory.count++;
    summary.expenses_by_category.set(category, currentCategory);

    // Type breakdown (derived from category)
    let type = 'Operating';
    if (category.toLowerCase().includes('cogs') || category.toLowerCase().includes('cost')) {
      type = 'COGS';
    } else if (category.toLowerCase().includes('admin') || category.toLowerCase().includes('office')) {
      type = 'Administrative';
    }

    const currentType = summary.expenses_by_type.get(type) || { amount: 0, count: 0 };
    currentType.amount += amount;
    currentType.count++;
    summary.expenses_by_type.set(type, currentType);
  });

  summary.average_expense = summary.total_transactions > 0 ? summary.total_expenses / summary.total_transactions : 0;

  // Convert maps to arrays with percentages
  const expensesByCategory = Array.from(summary.expenses_by_category.entries()).map(([category, data]) => ({
    category,
    amount: data.amount,
    percentage: summary.total_expenses > 0 ? (data.amount / summary.total_expenses) * 100 : 0,
    count: data.count,
    company_id: data.company_id,
    company_name: data.company_name
  }));

  const expensesByType = Array.from(summary.expenses_by_type.entries()).map(([type, data]) => ({
    type,
    amount: data.amount,
    percentage: summary.total_expenses > 0 ? (data.amount / summary.total_expenses) * 100 : 0,
    count: data.count
  }));

  return {
    ...summary,
    expenses_by_category: expensesByCategory,
    expenses_by_type: expensesByType
  };
}

export function calculateExpenseTrends(expenses: Expense[], startDate?: string, endDate?: string): TimeseriesPoint[] {
  const filteredExpenses = filterByDateRange(expenses, startDate, endDate);

  const trendsByDate = new Map<
    string,
    {
      amount: number;
      category: string;
      transaction_count: number;
      average_amount: number;
    }
  >();

  filteredExpenses.forEach((expense) => {
    const date = expense.date || 'unknown';
    const current = trendsByDate.get(date) || {
      amount: 0,
      category: expense.category,
      transaction_count: 0,
      average_amount: 0
    };

    current.amount += expense.amount || 0;
    current.transaction_count++;
    current.average_amount = current.amount / current.transaction_count;

    trendsByDate.set(date, current);
  });

  return Array.from(trendsByDate.entries()).map(([date, data]) => ({
    t: date,
    revenue: 0,
    expense: data.amount,
    profit: -data.amount,
    cash_in: 0,
    cash_out: data.amount,
    company_id: 'default',
    company_name: 'Default Company',
    period: 'monthly'
  }));
}

// ============================================================================
// Payment Calculations
// ============================================================================

export function calculatePaymentSummary(
  payments: PaymentDetail[],
  startDate?: string,
  endDate?: string
): {
  total_payments: string;
  payment_count: number;
  period: string;
  average_payment: number;
  payments_by_method: Array<{
    method: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  payments_by_status: Array<{
    status: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
} {
  const filteredPayments = filterByDateRange(payments, startDate, endDate);

  const summary = {
    total_payments: 0,
    payment_count: filteredPayments.length,
    average_payment: 0,
    payments_by_method: new Map<string, { amount: number; percentage: number; count: number }>(),
    payments_by_status: new Map<string, { amount: number; percentage: number; count: number }>(),
    period: 'monthly'
  };

  filteredPayments.forEach((payment) => {
    const amount = parseFloat(payment.amount) || 0;
    summary.total_payments += amount;

    const method = payment.payment_method || 'Unknown';
    const currentMethod = summary.payments_by_method.get(method) || { amount: 0, percentage: 0, count: 0 };
    currentMethod.amount += amount;
    currentMethod.count++;
    summary.payments_by_method.set(method, currentMethod);

    const status = payment.status || 'Unknown';
    const currentStatus = summary.payments_by_status.get(status) || { amount: 0, percentage: 0, count: 0 };
    currentStatus.amount += amount;
    currentStatus.count++;
    summary.payments_by_status.set(status, currentStatus);
  });

  // Calculate percentages
  summary.average_payment = summary.payment_count > 0 ? summary.total_payments / summary.payment_count : 0;

  summary.payments_by_method.forEach((method: any) => {
    method.percentage = summary.total_payments > 0 ? (method.amount / summary.total_payments) * 100 : 0;
  });
  summary.payments_by_status.forEach((status: any) => {
    status.percentage = summary.total_payments > 0 ? (status.amount / summary.total_payments) * 100 : 0;
  });

  // Convert maps to arrays
  const paymentsByMethod = Array.from(summary.payments_by_method.entries()).map(([method, data]) => ({
    method,
    amount: data.amount,
    percentage: data.percentage,
    count: data.count
  }));

  const paymentsByStatus = Array.from(summary.payments_by_status.entries()).map(([status, data]) => ({
    status,
    amount: data.amount,
    percentage: data.percentage,
    count: data.count
  }));

  return {
    total_payments: summary.total_payments.toString(),
    payment_count: summary.payment_count,
    period: startDate && endDate ? `${startDate} to ${endDate}` : 'Current Period',
    average_payment: summary.average_payment,
    payments_by_method: paymentsByMethod,
    payments_by_status: paymentsByStatus
  };
}

export function calculatePaymentTrends(payments: PaymentDetail[], startDate?: string, endDate?: string): TimeseriesPoint[] {
  const filteredPayments = filterByDateRange(payments, startDate, endDate);

  const trendsByDate = new Map<
    string,
    {
      total_amount: number;
      payment_count: number;
      primary_method: string;
    }
  >();

  filteredPayments.forEach((payment) => {
    const date = payment.payment_date || 'unknown';
    const current = trendsByDate.get(date) || {
      total_amount: 0,
      payment_count: 0,
      primary_method: 'Unknown'
    };

    const amount = parseFloat(payment.amount) || 0;
    current.total_amount += amount;
    current.payment_count++;

    // Track primary payment method
    const method = payment.payment_method || 'Unknown';
    current.primary_method = method;

    trendsByDate.set(date, current);
  });

  return Array.from(trendsByDate.entries()).map(([date, data]) => ({
    t: date,
    revenue: data.total_amount,
    expense: 0,
    profit: data.total_amount,
    cash_in: data.total_amount,
    cash_out: 0,
    company_id: 'default',
    company_name: 'Default Company',
    period: 'monthly'
  }));
}

// ============================================================================
// Account Calculations
// ============================================================================

export function calculateAccountSummary(
  accounts: any[],
  startDate?: string,
  endDate?: string
): {
  total_accounts: number;
  total_balance: number;
  average_balance: number;
  accounts_by_type: Array<{
    type: string;
    count: number;
    total_balance: number;
    percentage: number;
  }>;
} {
  const summary = {
    total_accounts: accounts.length,
    total_balance: 0,
    average_balance: 0,
    accounts_by_type: new Map<string, { count: number; total_balance: number }>()
  };

  accounts.forEach((account) => {
    const balance = Math.abs(account.balance || 0);
    summary.total_balance += balance;

    const type = account.account_type || 'Other';
    const current = summary.accounts_by_type.get(type) || { count: 0, total_balance: 0 };
    current.count++;
    current.total_balance += balance;
    summary.accounts_by_type.set(type, current);
  });

  summary.average_balance = summary.total_accounts > 0 ? summary.total_balance / summary.total_accounts : 0;

  // Convert map to array with percentages
  const accountsByType = Array.from(summary.accounts_by_type.entries()).map(([type, data]) => ({
    type,
    count: data.count,
    total_balance: data.total_balance,
    percentage: summary.total_balance > 0 ? (data.total_balance / summary.total_balance) * 100 : 0
  }));

  return {
    ...summary,
    accounts_by_type: accountsByType
  };
}

export function calculateAccountTrends(accounts: any[], startDate?: string, endDate?: string): TimeseriesPoint[] {
  const filteredAccounts = filterByDateRange(accounts, startDate, endDate);

  const trendsByType = new Map<
    string,
    {
      account_count: number;
      total_balance: number;
      average_balance: number;
    }
  >();

  filteredAccounts.forEach((account) => {
    const type = account.account_type || 'unknown';
    const current = trendsByType.get(type) || {
      account_count: 0,
      total_balance: 0,
      average_balance: 0
    };

    current.account_count++;
    current.total_balance += account.balance || 0;
    current.average_balance = current.total_balance / current.account_count;

    trendsByType.set(type, current);
  });

  return Array.from(trendsByType.entries()).map(([type, data]) => ({
    t: type,
    revenue: data.total_balance,
    expense: 0,
    profit: data.total_balance,
    cash_in: data.total_balance,
    cash_out: 0,
    company_id: 'default',
    company_name: 'Default Company',
    period: 'monthly'
  }));
}

// ============================================================================
// Derived Financial Statements
// ============================================================================

export function calculateProfitAndLossSummary(
  invoices: InvoiceRow[],
  expenses: Expense[],
  startDate?: string,
  endDate?: string
): ProfitAndLossSummary {
  const filteredInvoices = filterByDateRange(invoices, startDate, endDate);
  const filteredExpenses = filterByDateRange(expenses, startDate, endDate);

  const totalIncome = filteredInvoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

  // Separate COGS from operating expenses
  const cogsExpenses = filteredExpenses.filter(
    (expense) => expense.category?.toLowerCase().includes('cogs') || expense.category?.toLowerCase().includes('cost')
  );
  const cogsAmount = cogsExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

  const grossProfit = totalIncome - cogsAmount;
  const operatingExpenses = totalExpenses - cogsAmount;
  const netOperatingIncome = grossProfit - operatingExpenses;
  const netIncome = netOperatingIncome;

  return {
    period: startDate && endDate ? `${startDate} to ${endDate}` : 'Current Period',
    total_income: totalIncome,
    net_revenue: totalIncome * 0.95, // Assuming 5% discounts/returns
    total_expenses: totalExpenses,
    cost_of_goods_sold: cogsAmount,
    operating_expenses: operatingExpenses,
    administrative_expenses: operatingExpenses * 0.33, // Rough estimate
    gross_profit: grossProfit,
    gross_margin_percentage: totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0,
    net_operating_income: netOperatingIncome,
    net_income: netIncome,
    net_margin_percentage: totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0,
    cash_balance: netIncome * 0.8, // Rough estimate
    accounts_receivable: totalIncome * 0.15, // Rough estimate
    accounts_payable: totalExpenses * 0.2, // Rough estimate
    working_capital: totalIncome * 0.8 + totalIncome * 0.15 - totalExpenses * 0.2,
    cash_flow_operating: netIncome * 1.2, // Rough estimate
    cash_flow_investing: -totalExpenses * 0.1, // Rough estimate
    cash_flow_financing: -totalExpenses * 0.05, // Rough estimate
    net_cash_flow: netIncome * 1.2 - totalExpenses * 0.1 - totalExpenses * 0.05
  };
}

export function calculateBalanceSheet(accounts: any[], startDate?: string, endDate?: string): BalanceSheetRow[] {
  const filteredAccounts = filterByDateRange(accounts, startDate, endDate);

  const balanceSheet: BalanceSheetRow[] = [];
  const accountTypes = new Map<string, { total: number; count: number }>();

  filteredAccounts.forEach((account: any) => {
    const type = account.account_type || 'Other';
    const balance = account.balance || 0;

    const current = accountTypes.get(type) || { total: 0, count: 0 };
    current.total += balance;
    current.count++;
    accountTypes.set(type, current);
  });

  // Convert to array format
  accountTypes.forEach((data, type) => {
    balanceSheet.push({
      id: `account-${type}`,
      account: type,
      account_code: type.toUpperCase().replace(/\s+/g, '_'),
      category: 'asset' as const,
      subcategory: 'current',
      amount: data.total,
      previous_amount: 0,
      change: 0,
      department: 'Finance',
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      period: startDate && endDate ? `${startDate} to ${endDate}` : 'Current Period',
      account_type: type,
      account_count: data.count,
      total_balance: data.total,
      percentage: 0 // Will be calculated below
    });
  });

  // Calculate percentages
  const totalBalance = balanceSheet.reduce((sum, row) => sum + row.total_balance, 0);
  balanceSheet.forEach((row) => {
    row.percentage = totalBalance > 0 ? (row.total_balance / totalBalance) * 100 : 0;
  });

  return balanceSheet.sort((a, b) => b.total_balance - a.total_balance);
}

export function calculateCashFlow(payments: PaymentDetail[], expenses: Expense[], startDate?: string, endDate?: string): CashFlowRow[] {
  const filteredPayments = filterByDateRange(payments, startDate, endDate);
  const filteredExpenses = filterByDateRange(expenses, startDate, endDate);

  const cashFlowRows: CashFlowRow[] = [];

  // Operating activities from payments
  if (filteredPayments.length > 0) {
    const totalPayments = filteredPayments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    cashFlowRows.push({
      id: 'operating',
      date: startDate || new Date().toISOString().split('T')[0],
      cash_in: totalPayments,
      cash_out: 0,
      net_cash_flow: totalPayments,
      type: 'operating',
      description: `Operating Activities (${filteredPayments.length} payments)`,
      department: 'Finance',
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      category: 'operations',
      subcategory: 'payments',
      period: startDate && endDate ? `${startDate} to ${endDate}` : 'Current Period'
    });
  }

  // Investing activities from expenses
  if (filteredExpenses.length > 0) {
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    cashFlowRows.push({
      id: 'investing',
      date: startDate || new Date().toISOString().split('T')[0],
      cash_in: 0,
      cash_out: totalExpenses,
      net_cash_flow: -totalExpenses,
      type: 'investing',
      description: `Investing Activities (${filteredExpenses.length} expenses)`,
      department: 'Finance',
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      category: 'operations',
      subcategory: 'expenses',
      period: startDate && endDate ? `${startDate} to ${endDate}` : 'Current Period'
    });
  }

  return cashFlowRows;
}

export function calculateAging(invoices: InvoiceRow[], startDate?: string, endDate?: string): AgingBucket[] {
  const filteredInvoices = filterByDateRange(invoices, startDate, endDate);

  const agingBuckets: AgingBucket[] = [
    { bucket: '0-30', count: 0, amount: 0 },
    { bucket: '31-60', count: 0, amount: 0 },
    { bucket: '61-90', count: 0, amount: 0 },
    { bucket: '90+', count: 0, amount: 0 }
  ];

  filteredInvoices.forEach((invoice) => {
    const days_past_due = invoice.days_past_due || 0;
    const amount = invoice.balance || 0;

    if (days_past_due <= 30) {
      agingBuckets[0].count++;
      agingBuckets[0].amount += amount;
    } else if (days_past_due <= 60) {
      agingBuckets[1].count++;
      agingBuckets[1].amount += amount;
    } else if (days_past_due <= 90) {
      agingBuckets[2].count++;
      agingBuckets[2].amount += amount;
    } else {
      agingBuckets[3].count++;
      agingBuckets[3].amount += amount;
    }
  });

  return agingBuckets;
}

export function calculateLedger(
  accounts: any[],
  startDate?: string,
  endDate?: string
): {
  rows: LedgerRow[];
  total: number;
  page: number;
  pageSize: number;
} {
  // Generate realistic ledger entries based on account types
  const ledgerRows: LedgerRow[] = [];

  accounts.forEach((account) => {
    const accountType = account.account_type || account.accountType || 'bank';
    const balance = Number(account.balance) || 0;

    // Create ledger entries based on account type
    if (accountType === 'bank' || accountType === 'accounts_receivable') {
      // For bank and receivables, show credits (money coming in)
      if (balance > 0) {
        ledgerRows.push({
          id: `${account.id}-credit`,
          date: startDate || new Date().toISOString().split('T')[0],
          account_name: account.name || account.account_name || 'Unknown',
          account_code: account.account_code || account.accountCode || 'UNKNOWN',
          account_type: accountType,
          category: accountType === 'bank' ? 'assets' : 'assets',
          debit: 0,
          credit: balance,
          memo: `Account balance for ${account.name}`,
          company_id: account.company_id || 'comp-001',
          company_name: account.company_name || 'ABC Corp',
          reference: account.id,
          reference_type: 'account',
          balance: balance
        });
      }
    } else if (accountType === 'accounts_payable') {
      // For payables, show debits (money going out)
      if (balance > 0) {
        ledgerRows.push({
          id: `${account.id}-debit`,
          date: startDate || new Date().toISOString().split('T')[0],
          account_name: account.name || account.account_name || 'Unknown',
          account_code: account.account_code || account.accountCode || 'UNKNOWN',
          account_type: accountType,
          category: 'liabilities',
          debit: balance,
          credit: 0,
          memo: `Account balance for ${account.name}`,
          company_id: account.company_id || 'comp-001',
          company_name: account.company_name || 'ABC Corp',
          reference: account.id,
          reference_type: 'account',
          balance: balance
        });
      }
    } else if (accountType === 'equity') {
      // For equity, show credits (owner's investment)
      if (balance > 0) {
        ledgerRows.push({
          id: `${account.id}-credit`,
          date: startDate || new Date().toISOString().split('T')[0],
          account_name: account.name || account.account_name || 'Unknown',
          account_code: account.account_code || account.accountCode || 'UNKNOWN',
          account_type: accountType,
          category: 'equity',
          debit: 0,
          credit: balance,
          memo: `Account balance for ${account.name}`,
          company_id: account.company_id || 'comp-001',
          company_name: account.company_name || 'ABC Corp',
          reference: account.id,
          reference_type: 'account',
          balance: balance
        });
      }
    }
  });

  return {
    rows: ledgerRows,
    total: ledgerRows.length,
    page: 1,
    pageSize: ledgerRows.length
  };
}

// ============================================================================
// KPI Calculations
// ============================================================================

export function calculateKPIs(
  invoices: InvoiceRow[],
  expenses: Expense[],
  payments: PaymentDetail[],
  startDate?: string,
  endDate?: string
): KPI[] {
  const filteredInvoices = filterByDateRange(invoices, startDate, endDate);
  const filteredExpenses = filterByDateRange(expenses, startDate, endDate);
  const filteredPayments = filterByDateRange(payments, startDate, endDate);

  const totalRevenue = filteredInvoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const totalPayments = filteredPayments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);

  return [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: totalRevenue,
      change: 0,
      change_percentage: 0,
      trend: 'up',
      period: startDate && endDate ? `${startDate} to ${endDate}` : 'Current Period',
      totalRevenue: totalRevenue,
      netIncome: totalRevenue - totalExpenses,
      grossProfit: totalRevenue - totalExpenses,
      grossMarginPct: totalRevenue > 0 ? (totalRevenue - totalExpenses) / totalRevenue : 0,
      cashBalance: totalRevenue * 0.8,
      arOutstanding: totalRevenue * 0.15
    },
    {
      id: 'expenses',
      title: 'Total Expenses',
      value: totalExpenses,
      change: 0,
      change_percentage: 0,
      trend: 'down',
      period: startDate && endDate ? `${startDate} to ${endDate}` : 'Current Period',
      totalRevenue: totalRevenue,
      netIncome: totalRevenue - totalExpenses,
      grossProfit: totalRevenue - totalExpenses,
      grossMarginPct: totalRevenue > 0 ? (totalRevenue - totalExpenses) / totalRevenue : 0,
      cashBalance: totalRevenue * 0.8,
      arOutstanding: totalRevenue * 0.15
    },
    {
      id: 'profit',
      title: 'Net Profit',
      value: totalRevenue - totalExpenses,
      change: 0,
      change_percentage: 0,
      trend: totalRevenue - totalExpenses >= 0 ? 'up' : 'down',
      period: startDate && endDate ? `${startDate} to ${endDate}` : 'Current Period',
      totalRevenue: totalRevenue,
      netIncome: totalRevenue - totalExpenses,
      grossProfit: totalRevenue - totalExpenses,
      grossMarginPct: totalRevenue > 0 ? (totalRevenue - totalExpenses) / totalRevenue : 0,
      cashBalance: totalRevenue * 0.8,
      arOutstanding: totalRevenue * 0.15
    },
    {
      id: 'payments',
      title: 'Total Payments',
      value: totalPayments,
      change: 0,
      change_percentage: 0,
      trend: 'up',
      period: startDate && endDate ? `${startDate} to ${endDate}` : 'Current Period',
      totalRevenue: totalRevenue,
      netIncome: totalRevenue - totalExpenses,
      grossProfit: totalRevenue - totalExpenses,
      grossMarginPct: totalRevenue > 0 ? (totalRevenue - totalExpenses) / totalRevenue : 0,
      cashBalance: totalRevenue * 0.8,
      arOutstanding: totalRevenue * 0.15
    }
  ];
}

// ============================================================================
// Series Data Calculations
// ============================================================================

export function calculateSeries(
  invoices: InvoiceRow[],
  expenses: Expense[],
  payments: PaymentDetail[],
  startDate?: string,
  endDate?: string
): TimeseriesPoint[] {
  const filteredInvoices = filterByDateRange(invoices, startDate, endDate);
  const filteredExpenses = filterByDateRange(expenses, startDate, endDate);
  const filteredPayments = filterByDateRange(payments, startDate, endDate);

  const seriesByDate = new Map<
    string,
    {
      revenue: number;
      expense: number;
      profit: number;
      payments: number;
    }
  >();

  // Process invoices (revenue)
  filteredInvoices.forEach((invoice) => {
    const date = invoice.issue_date || 'unknown';
    const current = seriesByDate.get(date) || {
      revenue: 0,
      expense: 0,
      profit: 0,
      payments: 0
    };

    current.revenue += invoice.amount || 0;
    current.profit += invoice.amount || 0;

    seriesByDate.set(date, current);
  });

  // Process expenses
  filteredExpenses.forEach((expense) => {
    const date = expense.date || 'unknown';
    const current = seriesByDate.get(date) || {
      revenue: 0,
      expense: 0,
      profit: 0,
      payments: 0
    };

    current.expense += expense.amount || 0;
    current.profit -= expense.amount || 0;

    seriesByDate.set(date, current);
  });

  // Process payments
  filteredPayments.forEach((payment) => {
    const date = payment.payment_date || 'unknown';
    const current = seriesByDate.get(date) || {
      revenue: 0,
      expense: 0,
      profit: 0,
      payments: 0
    };

    const amount = parseFloat(payment.amount) || 0;
    current.payments += amount;

    seriesByDate.set(date, current);
  });

  return Array.from(seriesByDate.entries()).map(([date, data]) => ({
    t: date,
    revenue: data.revenue,
    expense: data.expense,
    profit: data.profit,
    cash_in: data.payments,
    cash_out: data.expense,
    company_id: 'default',
    company_name: 'Default Company',
    period: 'monthly'
  }));
}
