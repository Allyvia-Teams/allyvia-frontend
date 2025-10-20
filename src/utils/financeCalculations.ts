// src/utils/financeCalculations.ts
// Comprehensive financial calculations for new API structure

import type {
  // New API types
  FinanceKPIsData,
  ProfitAndLossData,
  COGSData,
  GrossProfitData,
  BalanceSheetData,
  CashFlowData,
  PaymentSummaryData,
  PaymentSplitData,
  ExpenseStatsData,
  ExpenseBreakdownData,
  InvoiceAgingData,
  RevenueSeriesData,
  AccountSummaryData
} from 'types/finance';

// ============================================================================
// NEW API STRUCTURE UTILITIES
// ============================================================================

/**
 * Helper function to safely parse numeric values from API responses
 */
export function safeParseNumber(value: string | number | null | undefined, defaultValue: number = 0): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

/**
 * Helper function to format currency values consistently
 */
export function formatCurrency(value: number | string, currency: string = 'USD'): string {
  const numValue = safeParseNumber(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(numValue);
}

/**
 * Helper function to calculate percentages safely
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return (part / total) * 100;
}

/**
 * Helper function to get theme color based on financial value
 */
export function getFinancialTheme(value: number, isMoneyMaking: boolean = false): 'alert' | 'success' | 'default' | 'warning' | 'gold' {
  if (value === 0) return 'default';
  if (isMoneyMaking) return value > 0 ? 'success' : 'alert';
  return 'default';
}

/**
 * Helper function to aggregate financial data by time period
 */
export function aggregateFinancialDataByPeriod<T extends { date: string; amount: number | string }>(
  data: T[],
  period: 'daily' | 'weekly' | 'monthly' = 'monthly'
): Map<string, number> {
  const aggregated = new Map<string, number>();

  data.forEach((item) => {
    const date = new Date(item.date);
    let periodKey: string;

    switch (period) {
      case 'daily':
        periodKey = date.toISOString().split('T')[0];
        break;
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        periodKey = date.toISOString().split('T')[0];
    }

    const currentAmount = aggregated.get(periodKey) || 0;
    aggregated.set(periodKey, currentAmount + safeParseNumber(item.amount));
  });

  return aggregated;
}

/**
 * Helper function to validate financial data integrity
 */
export function validateFinancialData(data: any, requiredFields: string[]): boolean {
  if (!data || typeof data !== 'object') return false;

  return requiredFields.every((field) => {
    const value = data[field];
    return value !== null && value !== undefined && value !== '';
  });
}

/**
 * Helper function to merge financial datasets
 */
export function mergeFinancialDatasets<T extends { id: string; date: string }>(datasets: T[][]): T[] {
  const merged = new Map<string, T>();

  datasets.forEach((dataset) => {
    dataset.forEach((item) => {
      if (!merged.has(item.id)) {
        merged.set(item.id, item);
      }
    });
  });

  return Array.from(merged.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// ============================================================================
// NEW API STRUCTURE CALCULATIONS
// ============================================================================

/**
 * Calculate financial metrics from new API data
 */
export function calculateFinancialMetrics(financeKPIs: FinanceKPIsData): {
  revenueGrowth: number;
  expenseRatio: number;
  profitability: number;
  efficiency: number;
} {
  const { kpis, ratios } = financeKPIs;

  return {
    revenueGrowth: kpis.revenue > 0 ? (kpis.net_income / kpis.revenue) * 100 : 0,
    expenseRatio: kpis.revenue > 0 ? (kpis.expenses / kpis.revenue) * 100 : 0,
    profitability: ratios.net_profit_margin,
    efficiency: ratios.gross_profit_margin
  };
}

/**
 * Calculate expense analysis from expense stats
 */
export function calculateExpenseAnalysis(expenseStats: ExpenseStatsData): {
  averageExpensePerTransaction: number;
  expenseEfficiency: number;
  topCategoryPercentage: number;
} {
  const totalExpenses = safeParseNumber(expenseStats.total_expenses);
  const averageExpense = safeParseNumber(expenseStats.average_expense);

  return {
    averageExpensePerTransaction: averageExpense,
    expenseEfficiency: expenseStats.expense_count > 0 ? totalExpenses / expenseStats.expense_count : 0,
    topCategoryPercentage: 0 // Would need breakdown data to calculate
  };
}

/**
 * Calculate payment analysis from payment summary
 */
export function calculatePaymentAnalysis(paymentSummary: PaymentSummaryData): {
  averagePaymentAmount: number;
  paymentVolume: number;
  transactionFrequency: number;
} {
  const totalPayments = paymentSummary.total_payments;
  const paymentCount = paymentSummary.payment_count;

  return {
    averagePaymentAmount: paymentCount > 0 ? totalPayments / paymentCount : 0,
    paymentVolume: totalPayments,
    transactionFrequency: paymentCount
  };
}

/**
 * Generate financial insights from multiple data sources
 */
export function generateFinancialInsights(params: {
  financeKPIs?: FinanceKPIsData;
  expenseStats?: ExpenseStatsData;
  paymentSummary?: PaymentSummaryData;
  profitAndLoss?: ProfitAndLossData;
}): string[] {
  const insights: string[] = [];

  if (params.financeKPIs) {
    const { kpis, ratios } = params.financeKPIs;
    insights.push(`Revenue: ${formatCurrency(kpis.revenue)}`);
    insights.push(`Net Profit Margin: ${ratios.net_profit_margin.toFixed(1)}%`);
    insights.push(`Current Ratio: ${ratios.current_ratio.toFixed(2)}`);
  }

  if (params.expenseStats) {
    insights.push(`Average Expense: ${formatCurrency(safeParseNumber(params.expenseStats.average_expense))}`);
    insights.push(`Top Category: ${params.expenseStats.top_category}`);
  }

  if (params.paymentSummary) {
    insights.push(`Payment Volume: ${formatCurrency(params.paymentSummary.total_payments)}`);
    insights.push(`Transaction Count: ${params.paymentSummary.payment_count}`);
  }

  if (params.profitAndLoss) {
    insights.push(`Gross Profit: ${formatCurrency(params.profitAndLoss.gross_profit)}`);
    insights.push(`Net Income: ${formatCurrency(params.profitAndLoss.net_income)}`);
  }

  return insights;
}

/**
 * Calculate trend analysis from time series data
 */
export function calculateTrendAnalysis(revenueSeries: RevenueSeriesData): {
  trend: 'up' | 'down' | 'stable';
  growthRate: number;
  volatility: number;
} {
  if (!Array.isArray(revenueSeries) || revenueSeries.length < 2) {
    return { trend: 'stable', growthRate: 0, volatility: 0 };
  }

  const amounts = revenueSeries.map((point) => safeParseNumber(point.amount));
  const firstAmount = amounts[0];
  const lastAmount = amounts[amounts.length - 1];

  const growthRate = firstAmount > 0 ? ((lastAmount - firstAmount) / firstAmount) * 100 : 0;

  // Calculate volatility (standard deviation)
  const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
  const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length;
  const volatility = Math.sqrt(variance);

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (growthRate > 5) trend = 'up';
  else if (growthRate < -5) trend = 'down';

  return { trend, growthRate, volatility };
}

/**
 * Calculate balance sheet metrics from balance sheet data
 */
export function calculateBalanceSheetMetrics(balanceSheet: BalanceSheetData): {
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  liquidityRatio: number;
  debtToEquityRatio: number;
} {
  const totalAssets = balanceSheet.balance_sheet.assets.total_assets;
  const totalLiabilities = balanceSheet.balance_sheet.liabilities.total_liabilities;
  const equity = balanceSheet.balance_sheet.equity.total;

  const currentAssets = balanceSheet.balance_sheet.assets.current_assets.total;
  const currentLiabilities = balanceSheet.balance_sheet.liabilities.current_liabilities.total;

  return {
    totalAssets,
    totalLiabilities,
    equity,
    liquidityRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
    debtToEquityRatio: equity > 0 ? totalLiabilities / equity : 0
  };
}

/**
 * Calculate cash flow analysis from cash flow data
 */
export function calculateCashFlowAnalysis(cashFlow: CashFlowData): {
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
  cashFlowHealth: 'healthy' | 'warning' | 'critical';
} {
  const operatingCashFlow = cashFlow.cash_flow.operating_activities.net_operating;
  const investingCashFlow = cashFlow.cash_flow.investing_activities.net_investing;
  const financingCashFlow = cashFlow.cash_flow.financing_activities.net_financing;
  const netCashFlow = cashFlow.cash_flow.summary.net_cash_flow;

  let cashFlowHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (netCashFlow < 0) cashFlowHealth = 'critical';
  else if (netCashFlow < operatingCashFlow * 0.1) cashFlowHealth = 'warning';

  return {
    operatingCashFlow,
    investingCashFlow,
    financingCashFlow,
    netCashFlow,
    cashFlowHealth
  };
}

/**
 * Calculate expense breakdown analysis from expense breakdown data
 */
export function calculateExpenseBreakdownAnalysis(expenseBreakdown: ExpenseBreakdownData): {
  totalExpenses: number;
  topCategory: string;
  topCategoryAmount: number;
  topCategoryPercentage: number;
  categoryCount: number;
} {
  const totalExpenses = expenseBreakdown.by_category.reduce((sum, item) => sum + safeParseNumber(item.total), 0);
  const topCategory = expenseBreakdown.by_category[0]?.category_name || 'Unknown';
  const topCategoryAmount = safeParseNumber(expenseBreakdown.by_category[0]?.total || '0');
  const topCategoryPercentage = expenseBreakdown.by_category[0]?.percentage || 0;

  return {
    totalExpenses,
    topCategory,
    topCategoryAmount,
    topCategoryPercentage,
    categoryCount: expenseBreakdown.by_category.length
  };
}

/**
 * Calculate invoice aging analysis from invoice aging data
 */
export function calculateInvoiceAgingAnalysis(invoiceAging: InvoiceAgingData): {
  totalOutstanding: number;
  currentPercentage: number;
  overduePercentage: number;
  averageDaysOutstanding: number;
  collectionRisk: 'low' | 'medium' | 'high';
} {
  const total = invoiceAging.aging_summary.total;
  const current = invoiceAging.aging_summary.current;
  const overdue = invoiceAging.aging_summary.days_31_60 + invoiceAging.aging_summary.days_61_90 + invoiceAging.aging_summary.over_90;

  const currentPercentage = total > 0 ? (current / total) * 100 : 0;
  const overduePercentage = total > 0 ? (overdue / total) * 100 : 0;

  // Calculate weighted average days outstanding
  const averageDaysOutstanding =
    total > 0
      ? (current * 15 +
          invoiceAging.aging_summary.days_31_60 * 45 +
          invoiceAging.aging_summary.days_61_90 * 75 +
          invoiceAging.aging_summary.over_90 * 120) /
        total
      : 0;

  let collectionRisk: 'low' | 'medium' | 'high' = 'low';
  if (overduePercentage > 30) collectionRisk = 'high';
  else if (overduePercentage > 15) collectionRisk = 'medium';

  return {
    totalOutstanding: total,
    currentPercentage,
    overduePercentage,
    averageDaysOutstanding,
    collectionRisk
  };
}

/**
 * Calculate comprehensive financial health score
 */
export function calculateFinancialHealthScore(params: {
  financeKPIs?: FinanceKPIsData;
  balanceSheet?: BalanceSheetData;
  cashFlow?: CashFlowData;
  invoiceAging?: InvoiceAgingData;
}): {
  overallScore: number;
  revenueScore: number;
  profitabilityScore: number;
  liquidityScore: number;
  efficiencyScore: number;
  riskScore: number;
  healthLevel: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
} {
  let revenueScore = 0;
  let profitabilityScore = 0;
  let liquidityScore = 0;
  let efficiencyScore = 0;
  let riskScore = 0;

  // Revenue scoring
  if (params.financeKPIs) {
    revenueScore = Math.min(100, Math.max(0, (params.financeKPIs.kpis.revenue / 100000) * 100));
    profitabilityScore = Math.min(100, Math.max(0, params.financeKPIs.ratios.net_profit_margin * 10));
    efficiencyScore = Math.min(100, Math.max(0, params.financeKPIs.ratios.gross_profit_margin * 5));
  }

  // Liquidity scoring
  if (params.balanceSheet) {
    const metrics = calculateBalanceSheetMetrics(params.balanceSheet);
    liquidityScore = Math.min(100, Math.max(0, metrics.liquidityRatio * 50));
  }

  // Risk scoring (inverse - lower risk = higher score)
  if (params.invoiceAging) {
    const aging = calculateInvoiceAgingAnalysis(params.invoiceAging);
    riskScore = Math.min(100, Math.max(0, 100 - aging.overduePercentage * 2));
  }

  const overallScore = (revenueScore + profitabilityScore + liquidityScore + efficiencyScore + riskScore) / 5;

  let healthLevel: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  if (overallScore >= 80) healthLevel = 'excellent';
  else if (overallScore >= 60) healthLevel = 'good';
  else if (overallScore >= 40) healthLevel = 'fair';
  else if (overallScore >= 20) healthLevel = 'poor';
  else healthLevel = 'critical';

  return {
    overallScore,
    revenueScore,
    profitabilityScore,
    liquidityScore,
    efficiencyScore,
    riskScore,
    healthLevel
  };
}
