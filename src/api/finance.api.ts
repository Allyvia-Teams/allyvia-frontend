// src/api/finance.api.ts
// Complete Finance API client for Django backend integration

import axiosInstance from 'utils/axios';
import {
  mockKPIs as mockGetKPIs,
  getSeries as mockGetSeries,
  getExpenseCategories as mockGetExpenseCategories,
  getInvoiceList as mockGetInvoices,
  getExpenseList as mockGetExpenses,
  getProfitAndLossSummary as mockGetProfitAndLossSummary,
  getPaymentSummary as mockGetPaymentSummary,
  getPaymentTrends as mockGetPaymentTrends,
  getPaymentDetails as mockGetPaymentDetails,
  getExpenseTrends as mockGetExpenseTrends,
  getAccountTrends as mockGetAccountTrends,
  getEnhancedSeries as mockGetEnhancedSeries,
  getInvoiceStatistics as mockGetInvoiceStatistics,
  getAccountSummary as mockGetAccountSummary,
  getExpenseSummary as mockGetExpenseSummary,
  getCOGSDetail as mockGetCOGSDetail,
  getGrossProfitDetail as mockGetGrossProfitDetail,
  getTopExpenses as mockGetTopExpenses,
  getAccountDetails as mockGetAccountDetails,
  getLedger as mockGetLedger
} from './financeMockApi';

import type {
  KPI,
  TimeseriesPoint,
  CategoryAmount,
  InvoiceRow,
  Expense,
  AgingBucket,
  LedgerRow,
  Page,
  RangeParams,
  PageParams,
  InvoicesParams,
  ExpensesParams,
  PnLRow,
  BalanceSheetRow,
  CashFlowRow,
  ProfitAndLossSummary,
  COGSDetail,
  GrossProfitDetail,
  PaymentSummary,
  PaymentTrend,
  PaymentDetail
} from 'types/finance';

// ============================================================================
// Enhanced safeGet with detailed error logging and fallback
// ============================================================================

async function safeGet<T>(path: string, params: Record<string, any> | undefined, fallback: () => Promise<T>): Promise<T> {
  try {
    // normalize query keys to backend expected snake_case
    const q = params
      ? {
          ...params,
          start_date: params.startDate ?? params.start_date,
          end_date: params.endDate ?? params.end_date
        }
      : undefined;
    if (q) {
      delete (q as any).startDate;
      delete (q as any).endDate;
    }
    const res = await axiosInstance.get(path, { params: q });
    let data = res.data;

    // Handle Page<T> wrapper if present
    if (data && typeof data === 'object' && 'rows' in data) {
      data = data.rows;
    }

    if (data !== undefined && data !== null) {
      return data;
    }

    console.warn(`[finance.api] API ${path} returned empty data, using fallback`);
    return await fallback();
  } catch (err: any) {
    if (err.response?.status === 404) {
      console.warn(`[finance.api] Endpoint ${path} not found (404), using fallback`);
    } else if (err.response?.status === 400) {
      console.warn(`[finance.api] Bad request to ${path} (400), using fallback`);
    } else if (err.code === 'NETWORK_ERROR') {
      console.warn(`[finance.api] Network error calling ${path}, using fallback`);
    } else {
      console.warn(`[finance.api] Error calling ${path}:`, err.message || err);
    }
    return await fallback();
  }
}

// ============================================================================
// Profit & Loss APIs
// ============================================================================

export async function fetchProfitAndLossSummary(params?: { startDate?: string; endDate?: string }): Promise<ProfitAndLossSummary> {
  return safeGet('/profit/profit_and_loss/', params, () =>
    Promise.resolve(mockGetProfitAndLossSummary(params?.startDate, params?.endDate))
  );
}

export async function fetchCOGSDetail(params?: { startDate?: string; endDate?: string }): Promise<any> {
  return safeGet('/profit/cost_of_goods_and_services/', params, () =>
    Promise.resolve(mockGetCOGSDetail(params?.startDate, params?.endDate))
  );
}

export async function fetchGrossProfitDetail(params?: { startDate?: string; endDate?: string }): Promise<any> {
  return safeGet('/profit/gross_profit/', params, () => Promise.resolve(mockGetGrossProfitDetail(params?.startDate, params?.endDate)));
}

// ============================================================================
// Expense APIs
// ============================================================================

export async function fetchExpenseSummary(params?: { startDate?: string; endDate?: string }): Promise<any> {
  return safeGet('/expense/summary/', params, () => Promise.resolve(mockGetExpenseSummary(params?.startDate, params?.endDate)));
}

export async function fetchExpensesByCategory(params?: { startDate?: string; endDate?: string }): Promise<CategoryAmount[]> {
  return safeGet('/expense/by_category/', params, () => Promise.resolve(mockGetExpenseCategories(params?.startDate, params?.endDate)));
}

export async function fetchTopExpenses(params?: { startDate?: string; endDate?: string; limit?: number }): Promise<any[]> {
  const q = params ? { start_date: params.startDate, end_date: params.endDate, limit: params.limit } : undefined;
  const result = await safeGet('/expense/top/', q, () =>
    Promise.resolve(mockGetTopExpenses(params?.startDate, params?.endDate, params?.limit))
  );
  // Handle both Page<T> and direct array responses
  if (result && typeof result === 'object' && 'rows' in result) {
    return result.rows || [];
  }
  return Array.isArray(result) ? result : [];
}

export async function fetchExpenseTrends(params?: { startDate?: string; endDate?: string }): Promise<any[]> {
  const q = params ? { start_date: params.startDate, end_date: params.endDate } : undefined;
  return safeGet('/expense/trends/', q, () => Promise.resolve(mockGetExpenseTrends(params?.startDate, params?.endDate)));
}

export async function fetchExpensesByType(params?: { startDate?: string; endDate?: string }): Promise<any[]> {
  const q = params ? { start_date: params.startDate, end_date: params.endDate } : undefined;
  return safeGet('/expense/by_type/', q, () => mockGetExpenseCategories(params?.startDate, params?.endDate));
}

export async function fetchExpensesByPayee(params?: { startDate?: string; endDate?: string }): Promise<any[]> {
  const q = params ? { start_date: params.startDate, end_date: params.endDate } : undefined;
  return safeGet('/expense/by_payee/', q, () => mockGetExpenseCategories(params?.startDate, params?.endDate));
}

export async function fetchBillsByStatus(params?: { startDate?: string; endDate?: string }): Promise<any[]> {
  const q = params ? { start_date: params.startDate, end_date: params.endDate } : undefined;
  const result = await safeGet('/expense/bills_by_status/', q, () =>
    mockGetExpenses({ startDate: params?.startDate, endDate: params?.endDate })
  );
  // Handle both Page<T> and direct array responses
  if (result && typeof result === 'object' && 'rows' in result) {
    return result.rows || [];
  }
  return Array.isArray(result) ? result : [];
}

// ============================================================================
// Invoice APIs
// ============================================================================

export async function fetchInvoiceStatistics(params?: { startDate?: string; endDate?: string }): Promise<any> {
  const q = params ? { start_date: params.startDate, end_date: params.endDate } : undefined;
  return safeGet('/invoice/statistics/', q, () => Promise.resolve(mockGetInvoiceStatistics(params?.startDate, params?.endDate)));
}

export async function fetchInvoiceList(params?: { startDate?: string; endDate?: string; status?: string }): Promise<InvoiceRow[]> {
  const q = params ? { start_date: params.startDate, end_date: params.endDate, status: params.status } : undefined;
  const result = await safeGet('/invoice/list/', q, () => mockGetInvoices(params?.startDate, params?.endDate));
  // Handle both Page<T> and direct array responses
  if (result && typeof result === 'object' && 'rows' in result) {
    return result.rows || [];
  }
  return Array.isArray(result) ? result : [];
}

export async function syncHistoricalInvoices(monthsBack: number = 12): Promise<any> {
  try {
    const res = await axiosInstance.post('/invoice/sync/historical/', { months_back: monthsBack });
    return res.data;
  } catch (err: any) {
    console.warn('[finance.api] Failed to sync historical invoices:', err.message || err);
    return { status: 'failed', error: err.message };
  }
}

export async function syncInvoicesCDC(): Promise<any> {
  try {
    const res = await axiosInstance.post('/invoice/sync/cdc/');
    return res.data;
  } catch (err: any) {
    console.warn('[finance.api] Failed to sync invoices CDC:', err.message || err);
    return { status: 'failed', error: err.message };
  }
}

export async function fetchInvoiceSyncStatus(): Promise<any[]> {
  try {
    const res = await axiosInstance.get('/invoice/sync/status/');
    return res.data;
  } catch (err: any) {
    console.warn('[finance.api] Failed to fetch invoice sync status:', err.message || err);
    return [];
  }
}

// ============================================================================
// Payment APIs
// ============================================================================

export async function fetchPaymentSummary(params?: { startDate?: string; endDate?: string }): Promise<PaymentSummary> {
  return safeGet('/payment/summary/', params, () => Promise.resolve(mockGetPaymentSummary(params?.startDate, params?.endDate)));
}

export async function fetchPaymentTrends(params?: { startDate?: string; endDate?: string }): Promise<PaymentTrend[]> {
  return safeGet('/payment/trend/', params, () => Promise.resolve(mockGetPaymentTrends(params?.startDate, params?.endDate)));
}

export async function fetchPaymentDetails(params?: { startDate?: string; endDate?: string }): Promise<PaymentDetail[]> {
  return safeGet('/payment/details/', params, () => mockGetPaymentDetails(params?.startDate, params?.endDate));
}

// ============================================================================
// Account APIs
// ============================================================================

export async function fetchAccountSummary(params?: { startDate?: string; endDate?: string }): Promise<any> {
  return safeGet('/account/summary/', params, () => mockGetAccountSummary(params?.startDate, params?.endDate));
}

export async function fetchAccountDetails(): Promise<any[]> {
  const result = await safeGet('/account/details/', undefined, () => Promise.resolve(mockGetAccountDetails()));
  // Handle both Page<T> and direct array responses
  if (result && typeof result === 'object' && 'rows' in result) {
    return result.rows || [];
  }
  return Array.isArray(result) ? result : [];
}

export async function fetchAccountTrends(params?: { startDate?: string; endDate?: string }): Promise<any[]> {
  return safeGet('/account/trend/', params, () => mockGetAccountTrends(params?.startDate, params?.endDate));
}

// ============================================================================
// Legacy/Compatibility APIs (derived from real endpoints)
// ============================================================================

export async function fetchKPIs(params?: { startDate?: string; endDate?: string }): Promise<KPI> {
  try {
    // Try to derive KPIs from real data first
    const [pnlSummary, accountSummary] = await Promise.all([fetchProfitAndLossSummary(params), fetchAccountSummary(params)]);

    if (pnlSummary && accountSummary) {
      return {
        totalRevenue: Number(pnlSummary.total_income) || 0,
        netIncome: Number(pnlSummary.net_income) || 0,
        grossProfit: Number(pnlSummary.gross_profit) || 0,
        grossMarginPct: pnlSummary.total_income > 0 ? Number(pnlSummary.gross_profit) / Number(pnlSummary.total_income) : 0,
        cashBalance: Number(accountSummary.total_balance) || 0,
        arOutstanding: 0 // Would need separate AR endpoint
      };
    }
  } catch (error) {
    console.warn('[finance.api] Failed to derive KPIs from real data, using fallback');
  }

  return mockGetKPIs(params?.startDate, params?.endDate);
}

export async function fetchSeries(params?: { startDate?: string; endDate?: string }): Promise<TimeseriesPoint[]> {
  try {
    // Try to get real trend data
    const [expenseTrends, paymentTrends] = await Promise.all([fetchExpenseTrends(params), fetchPaymentTrends(params)]);

    if (expenseTrends && expenseTrends.length > 0) {
      return expenseTrends.map((trend: any) => ({
        t: trend.period || trend.date || 'current',
        revenue: 0, // Would need revenue trends endpoint
        expense: Number(trend.amount) || 0,
        profit: 0,
        cash_in: 0,
        cash_out: Number(trend.amount) || 0,
        company_id: 'comp-001',
        company_name: 'ABC Corp',
        period: params?.startDate && params?.endDate ? `${params.startDate} to ${params.endDate}` : 'Current Period'
      }));
    }
  } catch (error) {
    console.warn('[finance.api] Failed to get real trend data, using fallback');
  }

  return mockGetEnhancedSeries(params?.startDate, params?.endDate);
}

export async function fetchExpenseCategories(params?: { startDate?: string; endDate?: string }): Promise<CategoryAmount[]> {
  return fetchExpensesByCategory(params);
}

export async function fetchInvoices(params?: InvoicesParams): Promise<Page<InvoiceRow>> {
  try {
    const invoices = await fetchInvoiceList(params);
    return {
      rows: invoices,
      total: invoices.length,
      page: 1,
      pageSize: invoices.length
    };
  } catch (error) {
    return mockGetInvoices(params?.startDate, params?.endDate);
  }
}

export async function fetchExpenses(params?: ExpensesParams): Promise<Page<Expense>> {
  try {
    const expenses = await fetchTopExpenses(params);
    return {
      rows: expenses,
      total: expenses.length,
      page: 1,
      pageSize: expenses.length
    };
  } catch (error) {
    return mockGetExpenses(params);
  }
}

export async function fetchAging(params?: { startDate?: string; endDate?: string }): Promise<AgingBucket[]> {
  // Aging data derived from invoice data - no dedicated endpoint in backend
  try {
    const invoices = await fetchInvoiceList(params);
    if (invoices && invoices.length > 0) {
      const agingBuckets: AgingBucket[] = [
        { bucket: '0-30 days', count: 0, amount: 0 },
        { bucket: '31-60 days', count: 0, amount: 0 },
        { bucket: '61-90 days', count: 0, amount: 0 },
        { bucket: '90+ days', count: 0, amount: 0 }
      ];

      invoices.forEach((invoice: any) => {
        const daysPastDue = invoice.days_past_due || 0;
        const amount = invoice.balance || invoice.amount || 0;

        if (daysPastDue <= 30) {
          agingBuckets[0].count++;
          agingBuckets[0].amount += amount;
        } else if (daysPastDue <= 60) {
          agingBuckets[1].count++;
          agingBuckets[1].amount += amount;
        } else if (daysPastDue <= 90) {
          agingBuckets[2].count++;
          agingBuckets[2].amount += amount;
        } else {
          agingBuckets[3].count++;
          agingBuckets[3].amount += amount;
        }
      });

      return agingBuckets;
    }
  } catch (error) {
    console.warn('[finance.api] Failed to derive aging from invoice data:', error);
  }

  // Fallback to static JSON data derived from invoices
  return Promise.resolve([
    { bucket: '0-30 days', count: 73, amount: 1314000 },
    { bucket: '31-60 days', count: 0, amount: 0 },
    { bucket: '61-90 days', count: 0, amount: 0 },
    { bucket: '90+ days', count: 36, amount: 328500 }
  ]);
}

export async function fetchLedger(params?: RangeParams & PageParams): Promise<Page<LedgerRow>> {
  try {
    // Try to get real ledger data from backend
    const response = await axiosInstance.get('/api/v1/ledger/', { params });
    if (response.data && Array.isArray(response.data)) {
      return {
        rows: response.data,
        total: response.data.length,
        page: 1,
        pageSize: response.data.length
      };
    }
  } catch (error) {
    console.warn('[finance.api] Failed to fetch ledger from backend, using mock data');
  }

  // Fallback to mock data
  const mockData = mockGetLedger(params?.startDate, params?.endDate);
  return Promise.resolve(mockData);
}

export async function fetchBalanceSheet(params?: { startDate?: string; endDate?: string }): Promise<BalanceSheetRow[]> {
  try {
    const [accountSummary, accountDetails] = await Promise.all([fetchAccountSummary(params), fetchAccountDetails()]);

    if (accountDetails && Array.isArray(accountDetails) && accountDetails.length > 0) {
      const balanceSheetRows: BalanceSheetRow[] = [];

      accountDetails.forEach((account: any) => {
        const accountType = account.account_type || account.accountType || 'Other';
        const balance = Number(account.balance) || 0;

        let category: 'asset' | 'liability' | 'equity' = 'asset';
        let subcategory = 'other';

        if (accountType.toLowerCase().includes('liability') || accountType.toLowerCase().includes('payable')) {
          category = 'liability';
          subcategory = 'current';
        } else if (accountType.toLowerCase().includes('equity') || accountType.toLowerCase().includes('capital')) {
          category = 'equity';
          subcategory = 'retained_earnings';
        } else if (
          accountType.toLowerCase().includes('asset') ||
          accountType.toLowerCase().includes('bank') ||
          accountType.toLowerCase().includes('receivable')
        ) {
          category = 'asset';
          subcategory = accountType.toLowerCase().includes('bank') || accountType.toLowerCase().includes('cash') ? 'current' : 'other';
        }

        balanceSheetRows.push({
          id: account.id || `account-${account.name}`,
          account: account.name || account.account_name || 'Unknown Account',
          account_code: account.account_code || account.accountCode || account.name?.toUpperCase().replace(/\s+/g, '_') || 'UNKNOWN',
          category,
          subcategory,
          amount: balance,
          previous_amount: 0,
          change: 0,
          department: account.department || 'Finance',
          company_id: account.company_id || 'comp-001',
          company_name: account.company_name || 'ABC Corp',
          period: params?.startDate && params?.endDate ? `${params.startDate} to ${params.endDate}` : 'Current Period'
        });
      });

      if (balanceSheetRows.length > 0) {
        return balanceSheetRows;
      }
    }

    // Fallback to static JSON data from account details
    return Promise.resolve(
      mockGetAccountDetails().map((account: any) => ({
        id: account.id,
        account: account.name,
        account_code: account.account_code,
        category: account.account_type === 'accounts_payable' ? 'liability' : 'asset',
        subcategory: account.account_type === 'accounts_payable' ? 'current' : 'current',
        amount: Math.abs(account.balance),
        previous_amount: 0,
        change: 0,
        department: 'Finance',
        company_id: account.company_id,
        company_name: account.company_name,
        period: params?.startDate && params?.endDate ? `${params.startDate} to ${params.endDate}` : 'Current Period'
      }))
    );
  } catch (error) {
    console.warn('[finance.api] Failed to construct balance sheet from account data, falling back to static JSON:', error);
    // Fallback to static JSON data
    return Promise.resolve(
      mockGetAccountDetails().map((account: any) => ({
        id: account.id,
        account: account.name,
        account_code: account.account_code,
        category: account.account_type === 'accounts_payable' ? 'liability' : 'asset',
        subcategory: account.account_type === 'accounts_payable' ? 'current' : 'current',
        amount: Math.abs(account.balance),
        previous_amount: 0,
        change: 0,
        department: 'Finance',
        company_id: account.company_id,
        company_name: account.company_name,
        period: params?.startDate && params?.endDate ? `${params.startDate} to ${params.endDate}` : 'Current Period'
      }))
    );
  }
}

export async function fetchCashFlow(params?: { startDate?: string; endDate?: string }): Promise<CashFlowRow[]> {
  try {
    const [paymentSummary, paymentTrends] = await Promise.all([fetchPaymentSummary(params), fetchPaymentTrends(params)]);

    if (paymentSummary && typeof paymentSummary === 'object') {
      const cashFlowRows: CashFlowRow[] = [];

      if (paymentSummary.total_payments !== undefined) {
        const totalPayments = Number(paymentSummary.total_payments) || 0;
        const paymentCount = paymentSummary.payment_count || 0;

        cashFlowRows.push({
          id: 'operating',
          date: params?.startDate || new Date().toISOString().split('T')[0],
          cash_in: totalPayments,
          cash_out: 0,
          net_cash_flow: totalPayments,
          type: 'operating',
          description: `Operating Activities (${paymentCount} payments)`,
          department: 'Finance',
          company_id: 'comp-001',
          company_name: 'ABC Corp',
          category: 'operations',
          subcategory: 'payments',
          period: params?.startDate && params?.endDate ? `${params.startDate} to ${params.endDate}` : 'Current Period'
        });
      }

      if (cashFlowRows.length > 0) {
        return cashFlowRows;
      }
    }

    if (paymentTrends && Array.isArray(paymentTrends) && paymentTrends.length > 0) {
      const cashFlowRows: CashFlowRow[] = [];

      const byPeriod = new Map<string, { cash_in: number; cash_out: number }>();

      paymentTrends.forEach((point: any) => {
        const period = point.period || point.date || 'current';
        const current = byPeriod.get(period) || { cash_in: 0, cash_out: 0 };
        current.cash_in += Number(point.total_amount || 0);
        current.cash_out += 0; // Payments are cash in
        byPeriod.set(period, current);
      });

      byPeriod.forEach((data, period) => {
        const netCashFlow = data.cash_in - data.cash_out;
        cashFlowRows.push({
          id: `trend-${period}`,
          date: period,
          cash_in: data.cash_in,
          cash_out: data.cash_out,
          net_cash_flow: netCashFlow,
          type: 'operating',
          description: `Cash Flow for ${period}`,
          department: 'Finance',
          company_id: 'comp-001',
          company_name: 'ABC Corp',
          category: 'operations',
          subcategory: 'trend_analysis',
          period: params?.startDate && params?.endDate ? `${params.startDate} to ${params.endDate}` : 'Current Period'
        });
      });

      if (cashFlowRows.length > 0) {
        return cashFlowRows;
      }
    }

    // Fallback to static JSON data from payment trends
    return Promise.resolve(
      mockGetPaymentTrends().map((trend: any, index: number) => ({
        id: `trend-${index}`,
        date: trend.date || 'current',
        cash_in: Number(trend.total_amount) || 0,
        cash_out: 0,
        net_cash_flow: Number(trend.total_amount) || 0,
        type: 'operating',
        description: `Cash Flow for ${trend.date || 'current'}`,
        department: 'Finance',
        company_id: 'comp-001',
        company_name: 'ABC Corp',
        category: 'operations',
        subcategory: 'trend_analysis',
        period: params?.startDate && params?.endDate ? `${params.startDate} to ${params.endDate}` : 'Current Period'
      }))
    );
  } catch (error) {
    console.warn('[finance.api] Failed to construct cash flow from payment data, falling back to static JSON:', error);
    // Fallback to static JSON data
    return Promise.resolve(
      mockGetPaymentTrends().map((trend: any, index: number) => ({
        id: `trend-${index}`,
        date: trend.date || 'current',
        cash_in: Number(trend.total_amount) || 0,
        cash_out: 0,
        net_cash_flow: Number(trend.total_amount) || 0,
        type: 'operating',
        description: `Cash Flow for ${trend.date || 'current'}`,
        department: 'Finance',
        company_id: 'comp-001',
        company_name: 'ABC Corp',
        category: 'operations',
        subcategory: 'trend_analysis',
        period: params?.startDate && params?.endDate ? `${params.startDate} to ${params.endDate}` : 'Current Period'
      }))
    );
  }
}
