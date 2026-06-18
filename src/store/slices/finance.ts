import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchBudgets,
  fetchBudgetByCategory,
  fetchPayablesByDueDate,
  fetchUpcomingPayments,
  fetchInvoiceSummary,
  fetchOutstandingInvoices,
  FinanceAPI,
  downloadExpenseCsvTemplate as downloadExpenseCsvTemplateApi,
  uploadExpenseCsv,
  downloadInvoiceCsvTemplate as downloadInvoiceCsvTemplateApi,
  uploadInvoiceCsv,
  downloadPaymentCsvTemplate as downloadPaymentCsvTemplateApi,
  uploadPaymentCsv
} from 'api/finance.api';
import type {
  KPI,
  TimeseriesPoint,
  CategoryAmount,
  LedgerRow,
  PaymentTrend,
  Budget,
  BudgetByCategory,
  Payable,
  UpcomingPayment,
  InvoiceSummary,
  OutstandingInvoice,
  PaymentDetail,
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
// NEW API ASYNC THUNKS
// ============================================================================

// Analytics App
export const fetchFinanceKPIs = createAsyncThunk(
  'finance/fetchFinanceKPIs',
  async (params: { startDate: string; endDate: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Analytics.getFinanceKPIs({ companyId, ...params });
    return response;
  }
);

export const fetchAnalyticsSummary = createAsyncThunk(
  'finance/fetchAnalyticsSummary',
  async (params: { startDate: string; endDate: string; provider?: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Analytics.getSummary({ companyId, ...params });
    return response;
  }
);

export const fetchCRMAnalyticsOverview = createAsyncThunk(
  'finance/fetchCRMAnalyticsOverview',
  async (params: { startDate: string; endDate: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Analytics.getCRMAnalyticsOverview({ companyId, ...params });
    return response;
  }
);

export const fetchCRMPipeline = createAsyncThunk(
  'finance/fetchCRMPipeline',
  async (params: { startDate: string; endDate: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Analytics.getCRMPipeline({ companyId, ...params });
    return response;
  }
);

export const fetchInventoryOverview = createAsyncThunk('finance/fetchInventoryOverview', async (_, { getState }) => {
  const state = getState() as any;
  const currentRole = state.auth?.currentRole;
  const companyId = currentRole?.company_id;

  if (!companyId) {
    throw new Error('No company selected');
  }

  const response = await FinanceAPI.Analytics.getInventoryOverview({ companyId });
  return response;
});

export const fetchEmployeeOverview = createAsyncThunk('finance/fetchEmployeeOverview', async (_, { getState }) => {
  const state = getState() as any;
  const currentRole = state.auth?.currentRole;
  const companyId = currentRole?.company_id;

  if (!companyId) {
    throw new Error('No company selected');
  }

  const response = await FinanceAPI.Analytics.getEmployeeOverview({ companyId });
  return response;
});

// Profit App
export const fetchProfitAndLoss = createAsyncThunk(
  'finance/fetchProfitAndLoss',
  async (params: { startDate: string; endDate: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Profit.getProfitAndLoss({ companyId, ...params });
    return response;
  }
);

export const fetchCOGSDetail = createAsyncThunk(
  'finance/fetchCOGSDetail',
  async (params: { startDate: string; endDate: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Profit.getCOGSDetail({ companyId, ...params });
    return response;
  }
);

export const fetchGrossProfitDetail = createAsyncThunk(
  'finance/fetchGrossProfitDetail',
  async (params: { startDate: string; endDate: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Profit.getGrossProfitDetail({ companyId, ...params });
    return response;
  }
);

export const fetchBalanceSheet = createAsyncThunk('finance/fetchBalanceSheet', async (params: { asOfDate: string }, { getState }) => {
  const state = getState() as any;
  const currentRole = state.auth?.currentRole;
  const companyId = currentRole?.company_id;

  if (!companyId) {
    throw new Error('No company selected');
  }

  const response = await FinanceAPI.Profit.getBalanceSheet({ companyId, ...params });
  return response;
});

export const fetchCashFlow = createAsyncThunk(
  'finance/fetchCashFlow',
  async (params: { startDate: string; endDate: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Profit.getCashFlow({ companyId, ...params });
    return response;
  }
);

// Payment App
export const fetchPaymentSummary = createAsyncThunk(
  'finance/fetchPaymentSummary',
  async (params: { startDate: string; endDate: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Payment.getSummary({ companyId, ...params });
    return response;
  }
);

export const fetchPaymentSplit = createAsyncThunk(
  'finance/fetchPaymentSplit',
  async (params: { startDate: string; endDate: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Payment.getSplit({ companyId, ...params });
    return response;
  }
);

export const fetchPaymentTrend = createAsyncThunk(
  'finance/fetchPaymentTrend',
  async (params: { startDate: string; endDate: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Payment.getTrend({ companyId, ...params });
    return response;
  }
);

export const fetchPaymentStatistics = createAsyncThunk(
  'finance/fetchPaymentStatistics',
  async (params: { startDate: string; endDate: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Payment.getStatistics({ companyId, ...params });
    return response;
  }
);

export const fetchPaymentList = createAsyncThunk(
  'finance/fetchPaymentList',
  async (
    params: {
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
      amount_range?: string;
      customerRefId?: string;
      isVoided?: boolean;
      ordering?: string;
    },
    { getState }
  ) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Payment.getList({ companyId, ...params });
    return response;
  }
);

export const fetchPaymentSuggestions = createAsyncThunk('finance/fetchPaymentSuggestions', async (_, { getState }) => {
  const state = getState() as any;
  const currentRole = state.auth?.currentRole;
  const companyId = currentRole?.company_id;

  if (!companyId) {
    throw new Error('No company selected');
  }

  const response = await FinanceAPI.Payment.getSuggestions({ companyId });
  return response;
});

// Expense App
export const fetchExpenseSummary = createAsyncThunk(
  'finance/fetchExpenseSummary',
  async (params: { startDate: string; endDate: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Expense.getSummary({ companyId, ...params });
    return response;
  }
);

export const fetchExpenseStats = createAsyncThunk(
  'finance/fetchExpenseStats',
  async (params: { startDate: string; endDate: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Expense.getStats({ companyId, ...params });
    return response;
  }
);

export const fetchExpenseBreakdown = createAsyncThunk(
  'finance/fetchExpenseBreakdown',
  async (params: { startDate: string; endDate: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Expense.getBreakdown({ companyId, ...params });
    return response;
  }
);

// Removed - now part of fetchExpenseBreakdown

export const fetchTopExpenses = createAsyncThunk(
  'finance/fetchTopExpenses',
  async (params: { startDate: string; endDate: string; limit?: number }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Expense.getTopExpenses({ companyId, ...params });
    return response;
  }
);

export const fetchExpenseTrend = createAsyncThunk(
  'finance/fetchExpenseTrend',
  async (params: { startDate: string; endDate: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Expense.getTrend({ companyId, ...params });
    return response;
  }
);

// Removed - now part of fetchExpenseBreakdown

export const fetchBillsStatus = createAsyncThunk(
  'finance/fetchBillsStatus',
  async (params: { startDate: string; endDate: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Expense.getBillsStatus({ companyId, ...params });
    return response;
  }
);

export const fetchExpensesList = createAsyncThunk(
  'finance/fetchExpensesList',
  async (
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      ordering?: string;
      vendorRefId?: string;
      sync_status?: string;
      min_amount?: number;
      max_amount?: number;
    },
    { getState }
  ) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    // Ensure we always have dates - use provided dates or get from state, or default to last 30 days
    const startDate =
      params.startDate ||
      state.finance?.dateRange?.startDate ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = params.endDate || state.finance?.dateRange?.endDate || new Date().toISOString().split('T')[0];

    const response = await FinanceAPI.Expense.getBills({
      companyId,
      startDate,
      endDate,
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      status: params.status,
      ordering: params.ordering,
      vendorRefId: params.vendorRefId,
      sync_status: params.sync_status,
      min_amount: params.min_amount,
      max_amount: params.max_amount
    } as any);
    return response;
  }
);

export const fetchPurchasesList = createAsyncThunk('finance/fetchPurchasesList', async (params: { page?: number }, { getState }) => {
  const state = getState() as any;
  const currentRole = state.auth?.currentRole;
  const companyId = currentRole?.company_id;

  if (!companyId) {
    throw new Error('No company selected');
  }

  const response = await FinanceAPI.Expense.getPurchases({ companyId, ...params });
  return response;
});

export const uploadExpenseCsvFile = createAsyncThunk(
  'finance/uploadExpenseCsv',
  async (file: File, { dispatch, getState, rejectWithValue }) => {
    try {
      const response = await uploadExpenseCsv(file, undefined, (progress: number) => {
        dispatch(setExpenseUploadProgress(progress));
      });

      const state = getState() as any;
      const filters = state.finance?.filters;
      const startDate =
        filters?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = filters?.endDate || new Date().toISOString().split('T')[0];

      await Promise.all([
        dispatch(fetchExpensesList({ startDate, endDate, pageSize: 50 }) as any),
        dispatch(fetchExpenseStats({ startDate, endDate }) as any)
      ]);

      return response;
    } catch (error: any) {
      const errorData = error.response?.data || { error: error.message || 'Failed to upload CSV file' };
      return rejectWithValue(errorData);
    }
  }
);

export const downloadExpenseCsvTemplate = createAsyncThunk('finance/downloadExpenseCsvTemplate', async () => {
  const blob = await downloadExpenseCsvTemplateApi();
  return blob;
});

export const uploadInvoiceCsvFile = createAsyncThunk(
  'finance/uploadInvoiceCsv',
  async (file: File, { dispatch, getState, rejectWithValue }) => {
    try {
      const response = await uploadInvoiceCsv(file, undefined, (progress: number) => {
        dispatch(setInvoiceUploadProgress(progress));
      });
      const state = getState() as any;
      const filters = state.finance?.filters;
      const startDate =
        filters?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = filters?.endDate || new Date().toISOString().split('T')[0];
      await Promise.all([
        dispatch(fetchInvoiceList({ startDate, endDate }) as any),
        dispatch(fetchInvoiceStatistics({ startDate, endDate }) as any)
      ]);
      return response;
    } catch (error: any) {
      const errorData = error.response?.data || { error: error.message || 'Failed to upload CSV file' };
      return rejectWithValue(errorData);
    }
  }
);

export const downloadInvoiceCsvTemplate = createAsyncThunk('finance/downloadInvoiceCsvTemplate', async () => {
  return downloadInvoiceCsvTemplateApi();
});

export const uploadPaymentCsvFile = createAsyncThunk(
  'finance/uploadPaymentCsv',
  async (file: File, { dispatch, getState, rejectWithValue }) => {
    try {
      const response = await uploadPaymentCsv(file, undefined, (progress: number) => {
        dispatch(setPaymentUploadProgress(progress));
      });
      const state = getState() as any;
      const filters = state.finance?.filters;
      const startDate =
        filters?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = filters?.endDate || new Date().toISOString().split('T')[0];
      await Promise.all([
        dispatch(fetchPaymentList({ startDate, endDate }) as any),
        dispatch(fetchPaymentStatistics({ startDate, endDate }) as any),
        dispatch(fetchPaymentSummary({ startDate, endDate }) as any)
      ]);
      return response;
    } catch (error: any) {
      const errorData = error.response?.data || { error: error.message || 'Failed to upload CSV file' };
      return rejectWithValue(errorData);
    }
  }
);

export const downloadPaymentCsvTemplate = createAsyncThunk('finance/downloadPaymentCsvTemplate', async () => {
  return downloadPaymentCsvTemplateApi();
});

// Invoice App
export const fetchInvoiceStatistics = createAsyncThunk(
  'finance/fetchInvoiceStatistics',
  async (params: { startDate?: string; endDate?: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Invoice.getStatistics({ companyId, ...params });
    return response;
  }
);

export const fetchInvoiceList = createAsyncThunk(
  'finance/fetchInvoiceList',
  async (
    params: {
      startDate?: string;
      endDate?: string;
      search?: string;
      status?: string;
      amount_range?: string;
      customer_ref_id?: string;
      is_voided?: boolean;
      ordering?: string;
      page?: number;
      page_size?: number;
    },
    { getState }
  ) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Invoice.getList({
      companyId,
      startDate: params.startDate || '',
      endDate: params.endDate || '',
      search: params.search,
      status: params.status,
      amount_range: params.amount_range,
      customerRefId: params.customer_ref_id,
      isVoided: params.is_voided,
      ordering: params.ordering,
      page: params.page,
      pageSize: params.page_size
    });
    return response;
  }
);

export const fetchInvoiceAgingAsync = createAsyncThunk('finance/fetchInvoiceAging', async (_, { getState }) => {
  const state = getState() as any;
  const currentRole = state.auth?.currentRole;
  const companyId = currentRole?.company_id;

  if (!companyId) {
    throw new Error('No company selected');
  }

  const response = await FinanceAPI.Invoice.getAging({ companyId });
  return response;
});

export const fetchRevenueSeries = createAsyncThunk(
  'finance/fetchRevenueSeries',
  async (params: { startDate: string; endDate: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Analytics.getRevenueSeries({ companyId, ...params });
    return response;
  }
);

export const fetchInvoiceSuggestions = createAsyncThunk('finance/fetchInvoiceSuggestions', async (_, { getState }) => {
  const state = getState() as any;
  const currentRole = state.auth?.currentRole;
  const companyId = currentRole?.company_id;

  if (!companyId) {
    throw new Error('No company selected');
  }

  const response = await FinanceAPI.Invoice.getSuggestions({ companyId });
  return response;
});

export const fetchInvoiceDetail = createAsyncThunk('finance/fetchInvoiceDetail', async (invoiceId: string, { getState }) => {
  const state = getState() as any;
  const currentRole = state.auth?.currentRole;
  const companyId = currentRole?.company_id;
  const response = await FinanceAPI.Invoice.getById(invoiceId, { companyId });
  return response;
});

// Account App
export const fetchAccountSummary = createAsyncThunk(
  'finance/fetchAccountSummary',
  async (params: { startDate: string; endDate: string }, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const companyId = currentRole?.company_id;

    if (!companyId) {
      throw new Error('No company selected');
    }

    const response = await FinanceAPI.Account.getSummary({ companyId, ...params });
    return response;
  }
);

export const fetchBudgetsAsync = createAsyncThunk(
  'finance/fetchBudgets',
  async (params?: { startDate?: string; endDate?: string; category?: string }) => {
    return await fetchBudgets(params);
  }
);

export const fetchBudgetByCategoryAsync = createAsyncThunk(
  'finance/fetchBudgetByCategory',
  async (params?: { startDate?: string; endDate?: string }) => {
    return await fetchBudgetByCategory(params);
  }
);

export const fetchPayablesByDueDateAsync = createAsyncThunk(
  'finance/fetchPayablesByDueDate',
  async (params?: { startDate?: string; endDate?: string }) => {
    return await fetchPayablesByDueDate(params);
  }
);

export const fetchUpcomingPaymentsAsync = createAsyncThunk('finance/fetchUpcomingPayments', async (params?: { daysAhead?: number }) => {
  return await fetchUpcomingPayments(params);
});

export const fetchInvoiceSummaryAsync = createAsyncThunk(
  'finance/fetchInvoiceSummary',
  async (params?: { startDate?: string; endDate?: string }) => {
    return await fetchInvoiceSummary(params);
  }
);

export const fetchOutstandingInvoicesAsync = createAsyncThunk(
  'finance/fetchOutstandingInvoices',
  async (params?: { startDate?: string; endDate?: string; limit?: number }) => {
    return await fetchOutstandingInvoices(params);
  }
);

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface FinanceState {
  // Loading states
  loading: {
    // Analytics App
    financeKPIs: boolean;
    analyticsSummary: boolean;
    crmAnalyticsOverview: boolean;
    crmPipeline: boolean;
    inventoryOverview: boolean;
    employeeOverview: boolean;

    // Profit App
    profitAndLoss: boolean;

    expenses: boolean;
    invoices: boolean;
    payments: boolean;
    accounts: boolean;
    ledger: boolean;
    kpis: boolean;
    series: boolean;
    budgets: boolean;
    payables: boolean;
    cogsDetail: boolean;
    grossProfitDetail: boolean;
    balanceSheet: boolean;
    cashFlow: boolean;

    // Payment App
    paymentSummary: boolean;
    paymentSplit: boolean;
    paymentTrend: boolean;
    paymentStatistics: boolean;
    paymentList: boolean;
    paymentSuggestions: boolean;

    // Expense App
    expenseSummary: boolean;
    expenseStats: boolean;
    expenseBreakdown: boolean;
    topExpenses: boolean;
    expenseTrend: boolean;
    billsStatus: boolean;
    expensesList: boolean;
    purchasesList: boolean;

    // Invoice App
    invoiceStatistics: boolean;
    invoiceList: boolean;
    invoiceAging: boolean;
    revenueSeries: boolean;
    invoiceSuggestions: boolean;
    invoiceDetail: boolean;

    // Account App
    accountSummary: boolean;
  };

  // Error states
  errors: {
    // Analytics App
    financeKPIs: string | null;
    analyticsSummary: string | null;
    crmAnalyticsOverview: string | null;
    crmPipeline: string | null;
    inventoryOverview: string | null;
    employeeOverview: string | null;

    // Profit App
    profitAndLoss: string | null;
    cogsDetail: string | null;
    grossProfitDetail: string | null;
    balanceSheet: string | null;
    cashFlow: string | null;
    expenses: string | null;
    invoices: string | null;
    payments: string | null;
    accounts: string | null;
    ledger: string | null;
    kpis: string | null;
    series: string | null;
    budgets: string | null;
    payables: string | null;

    // Payment App
    paymentSummary: string | null;
    paymentSplit: string | null;
    paymentTrend: string | null;
    paymentStatistics: string | null;
    paymentList: string | null;
    paymentSuggestions: string | null;

    // Expense App
    expenseSummary: string | null;
    expenseStats: string | null;
    expenseBreakdown: string | null;
    topExpenses: string | null;
    expenseTrend: string | null;
    billsStatus: string | null;
    expensesList: string | null;
    purchasesList: string | null;

    // Invoice App
    invoiceStatistics: string | null;
    invoiceList: string | null;
    invoiceAging: string | null;
    revenueSeries: string | null;
    invoiceSuggestions: string | null;
    invoiceDetail: string | null;

    // Account App
    accountSummary: string | null;
  };

  // Analytics App
  financeKPIs: FinanceKPIsData | null;
  analyticsSummary: any | null;
  crmAnalyticsOverview: any | null;
  crmPipeline: any | null;
  inventoryOverview: any | null;
  employeeOverview: any | null;

  // Profit App
  profitAndLoss: ProfitAndLossData | null;
  cogsDetail: COGSData | null;
  grossProfitDetail: GrossProfitData | null;
  balanceSheet: BalanceSheetData | null;
  cashFlow: CashFlowData | null;

  // Payment App
  paymentSummary: PaymentSummaryData | null;
  paymentSplit: PaymentSplitData | null;
  paymentTrend: any[] | null;
  paymentStatistics: any | null;
  paymentList: any | null;
  paymentSuggestions: any[] | null;

  // Expense App
  expenseSummary: any | null;
  expenseStats: ExpenseStatsData | null;
  expenseBreakdown: ExpenseBreakdownData | null;
  topExpenses: any[] | null;
  expenseTrend: any[] | null;
  billsStatus: any[] | null;
  expensesList: any | null;
  purchasesList: any | null;

  // Invoice App
  invoiceStatistics: any | null;
  invoiceList: any[] | null;
  invoiceAging: InvoiceAgingData | null;
  revenueSeries: RevenueSeriesData | null;
  invoiceSuggestions: any[] | null;
  invoiceDetail: any | null;

  // Account App
  accountSummary: AccountSummaryData | null;

  // Expense CSV import
  expenseUploadProgress: number;
  expenseUploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  expenseUploadResult: any | null;

  // Invoice CSV import
  invoiceUploadProgress: number;
  invoiceUploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  invoiceUploadResult: any | null;

  // Payment CSV import
  paymentUploadProgress: number;
  paymentUploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  paymentUploadResult: any | null;

  // Legacy data (keeping for backward compatibility)
  expensesByCategory: CategoryAmount[];
  expenseTrends: any[];
  expensesByType: any[];
  expensesByPayee: any[];
  billsByStatus: any[];
  paymentTrends: PaymentTrend[];
  paymentDetails: PaymentDetail[];
  accountDetails: any[];
  accountTrends: any[];
  ledger: LedgerRow[];
  kpis: KPI | null;
  series: TimeseriesPoint[];
  enhancedSeries: any;

  // Budget data
  budgets: Budget[];
  budgetsByCategory: BudgetByCategory[];
  payablesByDueDate: Payable[];
  upcomingPayments: UpcomingPayment[];
  invoiceSummary: InvoiceSummary | null;
  outstandingInvoices: OutstandingInvoice[];

  // Filters
  filters: {
    startDate: string | null;
    endDate: string | null;
    companyId: string | null;
    asOfDate: string | null;
    status: string | null;
    category: string | null;
    accountType: string | null;
  };
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: FinanceState = {
  loading: {
    // Analytics App
    financeKPIs: false,
    analyticsSummary: false,
    crmAnalyticsOverview: false,
    crmPipeline: false,
    inventoryOverview: false,
    employeeOverview: false,

    // Profit App
    profitAndLoss: false,
    expenses: false,
    invoices: false,
    payments: false,
    accounts: false,
    ledger: false,
    kpis: false,
    series: false,
    budgets: false,
    payables: false,
    cogsDetail: false,
    grossProfitDetail: false,
    balanceSheet: false,
    cashFlow: false,

    // Payment App
    paymentSummary: false,
    paymentSplit: false,
    paymentTrend: false,
    paymentStatistics: false,
    paymentList: false,
    paymentSuggestions: false,

    // Expense App
    expenseSummary: false,
    expenseStats: false,
    expenseBreakdown: false,
    topExpenses: false,
    expenseTrend: false,
    billsStatus: false,
    expensesList: false,
    purchasesList: false,

    // Invoice App
    invoiceStatistics: false,
    invoiceList: false,
    invoiceAging: false,
    revenueSeries: false,
    invoiceSuggestions: false,
    invoiceDetail: false,

    // Account App
    accountSummary: false
  },
  errors: {
    // Analytics App
    financeKPIs: null,
    analyticsSummary: null,
    crmAnalyticsOverview: null,
    crmPipeline: null,
    inventoryOverview: null,
    employeeOverview: null,

    // Profit App
    profitAndLoss: null,
    expenses: null,
    invoices: null,
    payments: null,
    accounts: null,
    ledger: null,
    kpis: null,
    series: null,
    budgets: null,
    payables: null,
    cogsDetail: null,
    grossProfitDetail: null,
    balanceSheet: null,
    cashFlow: null,

    // Payment App
    paymentSummary: null,
    paymentSplit: null,
    paymentTrend: null,
    paymentStatistics: null,
    paymentList: null,
    paymentSuggestions: null,

    // Expense App
    expenseSummary: null,
    expenseStats: null,
    expenseBreakdown: null,
    topExpenses: null,
    expenseTrend: null,
    billsStatus: null,
    expensesList: null,
    purchasesList: null,

    // Invoice App
    invoiceStatistics: null,
    invoiceList: null,
    invoiceAging: null,
    revenueSeries: null,
    invoiceSuggestions: null,
    invoiceDetail: null,

    // Account App
    accountSummary: null
  },
  // Analytics App
  financeKPIs: null,
  analyticsSummary: null,
  crmAnalyticsOverview: null,
  crmPipeline: null,
  inventoryOverview: null,
  employeeOverview: null,

  // Profit App
  profitAndLoss: null,
  cogsDetail: null,
  grossProfitDetail: null,
  balanceSheet: null,
  cashFlow: null,

  // Payment App
  paymentSummary: null,
  paymentSplit: null,
  paymentTrend: null,
  paymentStatistics: null,
  paymentList: null,
  paymentSuggestions: null,

  // Expense App
  expenseSummary: null,
  expenseStats: null,
  expenseBreakdown: null,
  topExpenses: null,
  expenseTrend: null,
  billsStatus: null,
  expensesList: null,
  purchasesList: null,

  // Invoice App
  invoiceStatistics: null,
  invoiceList: null,
  invoiceAging: null,
  revenueSeries: null,
  invoiceSuggestions: null,
  invoiceDetail: null,

  // Account App
  accountSummary: null,

  // Expense CSV import
  expenseUploadProgress: 0,
  expenseUploadStatus: 'idle',
  expenseUploadResult: null,

  invoiceUploadProgress: 0,
  invoiceUploadStatus: 'idle',
  invoiceUploadResult: null,

  paymentUploadProgress: 0,
  paymentUploadStatus: 'idle',
  paymentUploadResult: null,

  filters: {
    startDate: null,
    endDate: null,
    companyId: null,
    asOfDate: null,
    status: null,
    category: null,
    accountType: null
  },

  // Legacy data
  expensesByCategory: [],
  expenseTrends: [],
  expensesByType: [],
  expensesByPayee: [],
  billsByStatus: [],
  paymentTrends: [],
  paymentDetails: [],
  accountDetails: [],
  accountTrends: [],
  ledger: [],
  kpis: null,
  series: [],
  enhancedSeries: null,

  // Budget data
  budgets: [],
  budgetsByCategory: [],
  payablesByDueDate: [],
  upcomingPayments: [],
  invoiceSummary: null,
  outstandingInvoices: []
};

// ============================================================================
// SLICE
// ============================================================================

const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<FinanceState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearErrors: (state) => {
      state.errors = initialState.errors;
    },
    setExpenseUploadProgress: (state, action: PayloadAction<number>) => {
      state.expenseUploadProgress = action.payload;
    },
    resetExpenseUpload: (state) => {
      state.expenseUploadProgress = 0;
      state.expenseUploadStatus = 'idle';
      state.expenseUploadResult = null;
    },
    setInvoiceUploadProgress: (state, action: PayloadAction<number>) => {
      state.invoiceUploadProgress = action.payload;
    },
    resetInvoiceUpload: (state) => {
      state.invoiceUploadProgress = 0;
      state.invoiceUploadStatus = 'idle';
      state.invoiceUploadResult = null;
    },
    setPaymentUploadProgress: (state, action: PayloadAction<number>) => {
      state.paymentUploadProgress = action.payload;
    },
    resetPaymentUpload: (state) => {
      state.paymentUploadProgress = 0;
      state.paymentUploadStatus = 'idle';
      state.paymentUploadResult = null;
    },
    clearData: (state) => {
      // New API data
      state.financeKPIs = null;
      state.profitAndLoss = null;
      state.cogsDetail = null;
      state.grossProfitDetail = null;
      state.balanceSheet = null;
      state.cashFlow = null;
      state.paymentSummary = null;
      state.paymentSplit = null;
      state.expenseBreakdown = null;
      state.invoiceAging = null;
      state.revenueSeries = null;
      state.accountSummary = null;
    }
  },
  extraReducers: (builder) => {
    // Analytics App
    // Finance KPIs
    builder
      .addCase(fetchFinanceKPIs.pending, (state) => {
        state.loading.financeKPIs = true;
        state.errors.financeKPIs = null;
      })
      .addCase(fetchFinanceKPIs.fulfilled, (state, action) => {
        state.loading.financeKPIs = false;
        state.financeKPIs = action.payload;
      })
      .addCase(fetchFinanceKPIs.rejected, (state, action) => {
        state.loading.financeKPIs = false;
        state.errors.financeKPIs = action.error.message || 'Failed to fetch finance KPIs';
      });

    // Analytics Summary
    builder
      .addCase(fetchAnalyticsSummary.pending, (state) => {
        state.loading.analyticsSummary = true;
        state.errors.analyticsSummary = null;
      })
      .addCase(fetchAnalyticsSummary.fulfilled, (state, action) => {
        state.loading.analyticsSummary = false;
        state.analyticsSummary = action.payload;
      })
      .addCase(fetchAnalyticsSummary.rejected, (state, action) => {
        state.loading.analyticsSummary = false;
        state.errors.analyticsSummary = action.error.message || 'Failed to fetch analytics summary';
      });

    // CRM Analytics Overview
    builder
      .addCase(fetchCRMAnalyticsOverview.pending, (state) => {
        state.loading.crmAnalyticsOverview = true;
        state.errors.crmAnalyticsOverview = null;
      })
      .addCase(fetchCRMAnalyticsOverview.fulfilled, (state, action) => {
        state.loading.crmAnalyticsOverview = false;
        state.crmAnalyticsOverview = action.payload;
      })
      .addCase(fetchCRMAnalyticsOverview.rejected, (state, action) => {
        state.loading.crmAnalyticsOverview = false;
        state.errors.crmAnalyticsOverview = action.error.message || 'Failed to fetch CRM analytics overview';
      });

    // CRM Pipeline
    builder
      .addCase(fetchCRMPipeline.pending, (state) => {
        state.loading.crmPipeline = true;
        state.errors.crmPipeline = null;
      })
      .addCase(fetchCRMPipeline.fulfilled, (state, action) => {
        state.loading.crmPipeline = false;
        state.crmPipeline = action.payload;
      })
      .addCase(fetchCRMPipeline.rejected, (state, action) => {
        state.loading.crmPipeline = false;
        state.errors.crmPipeline = action.error.message || 'Failed to fetch CRM pipeline';
      });

    // Inventory Overview
    builder
      .addCase(fetchInventoryOverview.pending, (state) => {
        state.loading.inventoryOverview = true;
        state.errors.inventoryOverview = null;
      })
      .addCase(fetchInventoryOverview.fulfilled, (state, action) => {
        state.loading.inventoryOverview = false;
        state.inventoryOverview = action.payload;
      })
      .addCase(fetchInventoryOverview.rejected, (state, action) => {
        state.loading.inventoryOverview = false;
        state.errors.inventoryOverview = action.error.message || 'Failed to fetch inventory overview';
      });

    // Employee Overview
    builder
      .addCase(fetchEmployeeOverview.pending, (state) => {
        state.loading.employeeOverview = true;
        state.errors.employeeOverview = null;
      })
      .addCase(fetchEmployeeOverview.fulfilled, (state, action) => {
        state.loading.employeeOverview = false;
        state.employeeOverview = action.payload;
      })
      .addCase(fetchEmployeeOverview.rejected, (state, action) => {
        state.loading.employeeOverview = false;
        state.errors.employeeOverview = action.error.message || 'Failed to fetch employee overview';
      });

    // Profit App
    // Profit & Loss
    builder
      .addCase(fetchProfitAndLoss.pending, (state) => {
        state.loading.profitAndLoss = true;
        state.errors.profitAndLoss = null;
      })
      .addCase(fetchProfitAndLoss.fulfilled, (state, action) => {
        state.loading.profitAndLoss = false;
        state.profitAndLoss = action.payload;
      })
      .addCase(fetchProfitAndLoss.rejected, (state, action) => {
        state.loading.profitAndLoss = false;
        state.errors.profitAndLoss = action.error.message || 'Failed to fetch profit and loss';
      });

    // COGS Detail
    builder
      .addCase(fetchCOGSDetail.pending, (state) => {
        state.loading.cogsDetail = true;
        state.errors.cogsDetail = null;
      })
      .addCase(fetchCOGSDetail.fulfilled, (state, action) => {
        state.loading.cogsDetail = false;
        state.cogsDetail = action.payload;
      })
      .addCase(fetchCOGSDetail.rejected, (state, action) => {
        state.loading.cogsDetail = false;
        state.errors.cogsDetail = action.error.message || 'Failed to fetch COGS detail';
      });

    // Gross Profit Detail
    builder
      .addCase(fetchGrossProfitDetail.pending, (state) => {
        state.loading.grossProfitDetail = true;
        state.errors.grossProfitDetail = null;
      })
      .addCase(fetchGrossProfitDetail.fulfilled, (state, action) => {
        state.loading.grossProfitDetail = false;
        state.grossProfitDetail = action.payload;
      })
      .addCase(fetchGrossProfitDetail.rejected, (state, action) => {
        state.loading.grossProfitDetail = false;
        state.errors.grossProfitDetail = action.error.message || 'Failed to fetch gross profit detail';
      });

    // Balance Sheet
    builder
      .addCase(fetchBalanceSheet.pending, (state) => {
        state.loading.balanceSheet = true;
        state.errors.balanceSheet = null;
      })
      .addCase(fetchBalanceSheet.fulfilled, (state, action) => {
        state.loading.balanceSheet = false;
        state.balanceSheet = action.payload;
      })
      .addCase(fetchBalanceSheet.rejected, (state, action) => {
        state.loading.balanceSheet = false;
        state.errors.balanceSheet = action.error.message || 'Failed to fetch balance sheet';
      });

    // Cash Flow
    builder
      .addCase(fetchCashFlow.pending, (state) => {
        state.loading.cashFlow = true;
        state.errors.cashFlow = null;
      })
      .addCase(fetchCashFlow.fulfilled, (state, action) => {
        state.loading.cashFlow = false;
        state.cashFlow = action.payload;
      })
      .addCase(fetchCashFlow.rejected, (state, action) => {
        state.loading.cashFlow = false;
        state.errors.cashFlow = action.error.message || 'Failed to fetch cash flow';
      });

    // Payment Split
    builder
      .addCase(fetchPaymentSplit.pending, (state) => {
        state.loading.paymentSplit = true;
        state.errors.paymentSplit = null;
      })
      .addCase(fetchPaymentSplit.fulfilled, (state, action) => {
        state.loading.paymentSplit = false;
        state.paymentSplit = action.payload;
      })
      .addCase(fetchPaymentSplit.rejected, (state, action) => {
        state.loading.paymentSplit = false;
        state.errors.paymentSplit = action.error.message || 'Failed to fetch payment split';
      });

    // Expense Breakdown
    builder
      .addCase(fetchExpenseBreakdown.pending, (state) => {
        state.loading.expenseBreakdown = true;
        state.errors.expenseBreakdown = null;
      })
      .addCase(fetchExpenseBreakdown.fulfilled, (state, action) => {
        state.loading.expenseBreakdown = false;
        state.expenseBreakdown = action.payload;
      })
      .addCase(fetchExpenseBreakdown.rejected, (state, action) => {
        state.loading.expenseBreakdown = false;
        state.errors.expenseBreakdown = action.error.message || 'Failed to fetch expense breakdown';
      });

    // Invoice Aging (New)
    builder
      .addCase(fetchInvoiceAgingAsync.pending, (state) => {
        state.loading.invoiceAging = true;
        state.errors.invoiceAging = null;
      })
      .addCase(fetchInvoiceAgingAsync.fulfilled, (state, action) => {
        state.loading.invoiceAging = false;
        state.invoiceAging = action.payload || null;
      })
      .addCase(fetchInvoiceAgingAsync.rejected, (state, action) => {
        state.loading.invoiceAging = false;
        state.errors.invoiceAging = action.error.message || 'Failed to fetch invoice aging';
      });

    // Revenue Series
    builder
      .addCase(fetchRevenueSeries.pending, (state) => {
        state.loading.revenueSeries = true;
        state.errors.revenueSeries = null;
      })
      .addCase(fetchRevenueSeries.fulfilled, (state, action) => {
        state.loading.revenueSeries = false;
        state.revenueSeries = action.payload;
      })
      .addCase(fetchRevenueSeries.rejected, (state, action) => {
        state.loading.revenueSeries = false;
        state.errors.revenueSeries = action.error.message || 'Failed to fetch revenue series';
      });

    // Account Summary (New)
    builder
      .addCase(fetchAccountSummary.pending, (state) => {
        state.loading.accountSummary = true;
        state.errors.accountSummary = null;
      })
      .addCase(fetchAccountSummary.fulfilled, (state, action) => {
        state.loading.accountSummary = false;
        state.accountSummary = action.payload;
      })
      .addCase(fetchAccountSummary.rejected, (state, action) => {
        state.loading.accountSummary = false;
        state.errors.accountSummary = action.error.message || 'Failed to fetch account summary';
      });

    // Missing Payment App reducers
    builder
      .addCase(fetchPaymentSummary.pending, (state) => {
        state.loading.paymentSummary = true;
        state.errors.paymentSummary = null;
      })
      .addCase(fetchPaymentSummary.fulfilled, (state, action) => {
        state.loading.paymentSummary = false;
        state.paymentSummary = action.payload;
      })
      .addCase(fetchPaymentSummary.rejected, (state, action) => {
        state.loading.paymentSummary = false;
        state.errors.paymentSummary = action.error.message || 'Failed to fetch payment summary';
      });

    builder
      .addCase(fetchPaymentTrend.pending, (state) => {
        state.loading.paymentTrend = true;
        state.errors.paymentTrend = null;
      })
      .addCase(fetchPaymentTrend.fulfilled, (state, action) => {
        state.loading.paymentTrend = false;
        state.paymentTrend = action.payload;
      })
      .addCase(fetchPaymentTrend.rejected, (state, action) => {
        state.loading.paymentTrend = false;
        state.errors.paymentTrend = action.error.message || 'Failed to fetch payment trend';
      });

    builder
      .addCase(fetchPaymentStatistics.pending, (state) => {
        state.loading.paymentStatistics = true;
        state.errors.paymentStatistics = null;
      })
      .addCase(fetchPaymentStatistics.fulfilled, (state, action) => {
        state.loading.paymentStatistics = false;
        state.paymentStatistics = action.payload;
      })
      .addCase(fetchPaymentStatistics.rejected, (state, action) => {
        state.loading.paymentStatistics = false;
        state.errors.paymentStatistics = action.error.message || 'Failed to fetch payment statistics';
      });

    builder
      .addCase(fetchPaymentList.pending, (state) => {
        state.loading.paymentList = true;
        state.errors.paymentList = null;
      })
      .addCase(fetchPaymentList.fulfilled, (state, action) => {
        state.loading.paymentList = false;
        state.paymentList = action.payload;
      })
      .addCase(fetchPaymentList.rejected, (state, action) => {
        state.loading.paymentList = false;
        state.errors.paymentList = action.error.message || 'Failed to fetch payment list';
      });

    builder
      .addCase(fetchPaymentSuggestions.pending, (state) => {
        state.loading.paymentSuggestions = true;
        state.errors.paymentSuggestions = null;
      })
      .addCase(fetchPaymentSuggestions.fulfilled, (state, action) => {
        state.loading.paymentSuggestions = false;
        state.paymentSuggestions = action.payload;
      })
      .addCase(fetchPaymentSuggestions.rejected, (state, action) => {
        state.loading.paymentSuggestions = false;
        state.errors.paymentSuggestions = action.error.message || 'Failed to fetch payment suggestions';
      });

    // Missing Expense App reducers
    builder
      .addCase(fetchExpenseSummary.pending, (state) => {
        state.loading.expenseSummary = true;
        state.errors.expenseSummary = null;
      })
      .addCase(fetchExpenseSummary.fulfilled, (state, action) => {
        state.loading.expenseSummary = false;
        state.expenseSummary = action.payload;
      })
      .addCase(fetchExpenseSummary.rejected, (state, action) => {
        state.loading.expenseSummary = false;
        state.errors.expenseSummary = action.error.message || 'Failed to fetch expense summary';
      });

    builder
      .addCase(fetchExpenseStats.pending, (state) => {
        state.loading.expenseStats = true;
        state.errors.expenseStats = null;
      })
      .addCase(fetchExpenseStats.fulfilled, (state, action) => {
        state.loading.expenseStats = false;
        state.expenseStats = action.payload;
      })
      .addCase(fetchExpenseStats.rejected, (state, action) => {
        state.loading.expenseStats = false;
        state.errors.expenseStats = action.error.message || 'Failed to fetch expense stats';
      });

    builder
      .addCase(fetchTopExpenses.pending, (state) => {
        state.loading.topExpenses = true;
        state.errors.topExpenses = null;
      })
      .addCase(fetchTopExpenses.fulfilled, (state, action) => {
        state.loading.topExpenses = false;
        state.topExpenses = action.payload || null;
      })
      .addCase(fetchTopExpenses.rejected, (state, action) => {
        state.loading.topExpenses = false;
        state.errors.topExpenses = action.error.message || 'Failed to fetch top expenses';
      });

    builder
      .addCase(fetchExpenseTrend.pending, (state) => {
        state.loading.expenseTrend = true;
        state.errors.expenseTrend = null;
      })
      .addCase(fetchExpenseTrend.fulfilled, (state, action) => {
        state.loading.expenseTrend = false;
        state.expenseTrend = action.payload;
      })
      .addCase(fetchExpenseTrend.rejected, (state, action) => {
        state.loading.expenseTrend = false;
        state.errors.expenseTrend = action.error.message || 'Failed to fetch expense trend';
      });

    builder
      .addCase(fetchBillsStatus.pending, (state) => {
        state.loading.billsStatus = true;
        state.errors.billsStatus = null;
      })
      .addCase(fetchBillsStatus.fulfilled, (state, action) => {
        state.loading.billsStatus = false;
        state.billsStatus = action.payload;
      })
      .addCase(fetchBillsStatus.rejected, (state, action) => {
        state.loading.billsStatus = false;
        state.errors.billsStatus = action.error.message || 'Failed to fetch bills status';
      });

    builder
      .addCase(fetchExpensesList.pending, (state) => {
        state.loading.expensesList = true;
        state.errors.expensesList = null;
      })
      .addCase(fetchExpensesList.fulfilled, (state, action) => {
        state.loading.expensesList = false;
        state.expensesList = action.payload;
      })
      .addCase(fetchExpensesList.rejected, (state, action) => {
        state.loading.expensesList = false;
        state.errors.expensesList = action.error.message || 'Failed to fetch expenses list';
      });

    builder
      .addCase(fetchPurchasesList.pending, (state) => {
        state.loading.purchasesList = true;
        state.errors.purchasesList = null;
      })
      .addCase(fetchPurchasesList.fulfilled, (state, action) => {
        state.loading.purchasesList = false;
        state.purchasesList = action.payload;
      })
      .addCase(fetchPurchasesList.rejected, (state, action) => {
        state.loading.purchasesList = false;
        state.errors.purchasesList = action.error.message || 'Failed to fetch purchases list';
      });

    // Missing Invoice App reducers
    builder
      .addCase(fetchInvoiceStatistics.pending, (state) => {
        state.loading.invoiceStatistics = true;
        state.errors.invoiceStatistics = null;
      })
      .addCase(fetchInvoiceStatistics.fulfilled, (state, action) => {
        state.loading.invoiceStatistics = false;
        state.invoiceStatistics = action.payload;
      })
      .addCase(fetchInvoiceStatistics.rejected, (state, action) => {
        state.loading.invoiceStatistics = false;
        state.errors.invoiceStatistics = action.error.message || 'Failed to fetch invoice statistics';
      });

    builder
      .addCase(fetchInvoiceList.pending, (state) => {
        state.loading.invoiceList = true;
        state.errors.invoiceList = null;
      })
      .addCase(fetchInvoiceList.fulfilled, (state, action) => {
        state.loading.invoiceList = false;
        state.invoiceList = action.payload || null;
      })
      .addCase(fetchInvoiceList.rejected, (state, action) => {
        state.loading.invoiceList = false;
        state.errors.invoiceList = action.error.message || 'Failed to fetch invoice list';
      });

    builder
      .addCase(fetchInvoiceSuggestions.pending, (state) => {
        state.loading.invoiceSuggestions = true;
        state.errors.invoiceSuggestions = null;
      })
      .addCase(fetchInvoiceSuggestions.fulfilled, (state, action) => {
        state.loading.invoiceSuggestions = false;
        state.invoiceSuggestions = action.payload;
      })
      .addCase(fetchInvoiceSuggestions.rejected, (state, action) => {
        state.loading.invoiceSuggestions = false;
        state.errors.invoiceSuggestions = action.error.message || 'Failed to fetch invoice suggestions';
      });

    builder
      .addCase(fetchInvoiceDetail.pending, (state) => {
        state.loading.invoiceDetail = true;
        state.errors.invoiceDetail = null;
      })
      .addCase(fetchInvoiceDetail.fulfilled, (state, action) => {
        state.loading.invoiceDetail = false;
        state.invoiceDetail = action.payload;
      })
      .addCase(fetchInvoiceDetail.rejected, (state, action) => {
        state.loading.invoiceDetail = false;
        state.errors.invoiceDetail = action.error.message || 'Failed to fetch invoice detail';
      });

    // Budget
    builder
      .addCase(fetchBudgetsAsync.pending, (state) => {
        state.loading.budgets = true;
        state.errors.budgets = null;
      })
      .addCase(fetchBudgetsAsync.fulfilled, (state, action) => {
        state.loading.budgets = false;
        state.budgets = action.payload || [];
      })
      .addCase(fetchBudgetsAsync.rejected, (state, action) => {
        state.loading.budgets = false;
        state.errors.budgets = action.error.message || 'Failed to fetch budgets';
      });

    builder
      .addCase(fetchBudgetByCategoryAsync.pending, (state) => {
        state.loading.budgets = true;
        state.errors.budgets = null;
      })
      .addCase(fetchBudgetByCategoryAsync.fulfilled, (state, action) => {
        state.loading.budgets = false;
        state.budgetsByCategory = action.payload || [];
      })
      .addCase(fetchBudgetByCategoryAsync.rejected, (state, action) => {
        state.loading.budgets = false;
        state.errors.budgets = action.error.message || 'Failed to fetch budgets by category';
      });

    // Payables
    builder
      .addCase(fetchPayablesByDueDateAsync.pending, (state) => {
        state.loading.payables = true;
        state.errors.payables = null;
      })
      .addCase(fetchPayablesByDueDateAsync.fulfilled, (state, action) => {
        state.loading.payables = false;
        state.payablesByDueDate = action.payload || [];
      })
      .addCase(fetchPayablesByDueDateAsync.rejected, (state, action) => {
        state.loading.payables = false;
        state.errors.payables = action.error.message || 'Failed to fetch payables by due date';
      });

    builder
      .addCase(fetchUpcomingPaymentsAsync.pending, (state) => {
        state.loading.payables = true;
        state.errors.payables = null;
      })
      .addCase(fetchUpcomingPaymentsAsync.fulfilled, (state, action) => {
        state.loading.payables = false;
        state.upcomingPayments = action.payload || [];
      })
      .addCase(fetchUpcomingPaymentsAsync.rejected, (state, action) => {
        state.loading.payables = false;
        state.errors.payables = action.error.message || 'Failed to fetch upcoming payments';
      });

    // Invoices
    builder
      .addCase(fetchInvoiceSummaryAsync.pending, (state) => {
        state.loading.invoices = true;
        state.errors.invoices = null;
      })
      .addCase(fetchInvoiceSummaryAsync.fulfilled, (state, action) => {
        state.loading.invoices = false;
        state.invoiceSummary = action.payload || null;
      })
      .addCase(fetchInvoiceSummaryAsync.rejected, (state, action) => {
        state.loading.invoices = false;
        state.errors.invoices = action.error.message || 'Failed to fetch invoice summary';
      });

    builder
      .addCase(fetchOutstandingInvoicesAsync.pending, (state) => {
        state.loading.invoices = true;
        state.errors.invoices = null;
      })
      .addCase(fetchOutstandingInvoicesAsync.fulfilled, (state, action) => {
        state.loading.invoices = false;
        state.outstandingInvoices = action.payload || [];
      })
      .addCase(fetchOutstandingInvoicesAsync.rejected, (state, action) => {
        state.loading.invoices = false;
        state.errors.invoices = action.error.message || 'Failed to fetch outstanding invoices';
      });

    // Expense CSV upload
    builder
      .addCase(uploadExpenseCsvFile.pending, (state) => {
        state.expenseUploadStatus = 'uploading';
        state.expenseUploadProgress = 0;
      })
      .addCase(uploadExpenseCsvFile.fulfilled, (state, action) => {
        state.expenseUploadStatus = 'success';
        state.expenseUploadResult = action.payload;
      })
      .addCase(uploadExpenseCsvFile.rejected, (state, action) => {
        state.expenseUploadStatus = 'error';
        const errorPayload = action.payload as any;
        state.expenseUploadResult = errorPayload || {
          error: action.error.message || 'Failed to upload CSV file',
          errors: [],
          csvData: []
        };
      });

    builder
      .addCase(downloadExpenseCsvTemplate.pending, () => {})
      .addCase(downloadExpenseCsvTemplate.fulfilled, () => {})
      .addCase(downloadExpenseCsvTemplate.rejected, () => {});

    builder
      .addCase(uploadInvoiceCsvFile.pending, (state) => {
        state.invoiceUploadStatus = 'uploading';
        state.invoiceUploadProgress = 0;
      })
      .addCase(uploadInvoiceCsvFile.fulfilled, (state, action) => {
        state.invoiceUploadStatus = 'success';
        state.invoiceUploadResult = action.payload;
      })
      .addCase(uploadInvoiceCsvFile.rejected, (state, action) => {
        state.invoiceUploadStatus = 'error';
        const errorPayload = action.payload as any;
        state.invoiceUploadResult = errorPayload || {
          error: action.error.message || 'Failed to upload CSV file',
          errors: [],
          csvData: []
        };
      });

    builder
      .addCase(downloadInvoiceCsvTemplate.pending, () => {})
      .addCase(downloadInvoiceCsvTemplate.fulfilled, () => {})
      .addCase(downloadInvoiceCsvTemplate.rejected, () => {});

    builder
      .addCase(uploadPaymentCsvFile.pending, (state) => {
        state.paymentUploadStatus = 'uploading';
        state.paymentUploadProgress = 0;
      })
      .addCase(uploadPaymentCsvFile.fulfilled, (state, action) => {
        state.paymentUploadStatus = 'success';
        state.paymentUploadResult = action.payload;
      })
      .addCase(uploadPaymentCsvFile.rejected, (state, action) => {
        state.paymentUploadStatus = 'error';
        const errorPayload = action.payload as any;
        state.paymentUploadResult = errorPayload || {
          error: action.error.message || 'Failed to upload CSV file',
          errors: [],
          csvData: []
        };
      });

    builder
      .addCase(downloadPaymentCsvTemplate.pending, () => {})
      .addCase(downloadPaymentCsvTemplate.fulfilled, () => {})
      .addCase(downloadPaymentCsvTemplate.rejected, () => {});
  }
});

// ============================================================================
// EXPORTS
// ============================================================================

export const {
  setFilters,
  clearFilters,
  clearErrors,
  clearData,
  setExpenseUploadProgress,
  resetExpenseUpload,
  setInvoiceUploadProgress,
  resetInvoiceUpload,
  setPaymentUploadProgress,
  resetPaymentUpload
} = financeSlice.actions;
export default financeSlice.reducer;
