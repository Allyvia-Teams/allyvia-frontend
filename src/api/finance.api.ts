// src/api/finance.api.ts
// Complete Finance API client for Django backend integration with class-based structure

import axiosInstance from 'utils/axios';
import { getRoleId } from 'utils/authStorage';
import { store } from 'store';

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
// Base Finance API Class
// ============================================================================

class BaseFinanceAPI {
  protected static readonly BASE_URL = '';

  protected static async safeGet<T>(path: string, params: Record<string, any> | undefined): Promise<T | null> {
    try {
      // normalize query keys to backend expected snake_case
      const q = params
        ? {
            ...params,
            company_id: params.companyId ?? params.company_id,
            start_date: params.startDate ?? params.start_date,
            end_date: params.endDate ?? params.end_date,
            as_of_date: params.asOfDate ?? params.as_of_date,
            amount_range: params.amountRange ?? params.amount_range,
            customer_ref_id: params.customerRefId ?? params.customer_ref_id,
            is_voided: params.isVoided ?? params.is_voided,
            page_size: params.pageSize ?? params.page_size
          }
        : undefined;
      if (q) {
        delete (q as any).companyId;
        delete (q as any).startDate;
        delete (q as any).endDate;
        delete (q as any).asOfDate;
        delete (q as any).amountRange;
        delete (q as any).customerRefId;
        delete (q as any).isVoided;
        delete (q as any).pageSize;
      }

      const response = await axiosInstance.get(path, { params: q });
      return response.data;
    } catch (error: any) {
      console.warn(`[finance.api] ❌ API call failed for ${path}:`, error.response?.data || error.message);
      // Surface the failure so the owning Redux thunk goes to `rejected` and the
      // finance slice populates `errors.*` (instead of silently returning null,
      // which fulfilled the thunk with null and rendered a misleading $0/empty).
      const data = error.response?.data;
      const message =
        (typeof data === 'string' ? data : data?.detail || data?.error || data?.message) || error.message || `Request to ${path} failed`;
      throw new Error(message);
    }
  }
}

// ============================================================================
// Analytics API
// ============================================================================

class AnalyticsAPI extends BaseFinanceAPI {
  private static readonly ENDPOINT = `/analytics`;

  /**
   * Fetch Finance KPIs
   */
  public static async getFinanceKPIs(params: { companyId: string; startDate: string; endDate: string }): Promise<FinanceKPIsData | null> {
    return this.safeGet<FinanceKPIsData>(`${this.ENDPOINT}/finance/kpis/`, params);
  }

  /**
   * Fetch Analytics Summary
   */
  public static async getSummary(params: {
    companyId: string;
    startDate: string;
    endDate: string;
    provider?: string;
  }): Promise<any | null> {
    return this.safeGet<any>(`${this.ENDPOINT}/summary/`, params);
  }

  /**
   * Fetch CRM Analytics Overview
   */
  public static async getCRMAnalyticsOverview(params: { companyId: string; startDate: string; endDate: string }): Promise<any | null> {
    return this.safeGet<any>(`${this.ENDPOINT}/crm/overview/`, params);
  }

  /**
   * Fetch CRM Pipeline
   */
  public static async getCRMPipeline(params: { companyId: string; startDate: string; endDate: string }): Promise<any | null> {
    return this.safeGet<any>(`${this.ENDPOINT}/crm/pipeline/`, params);
  }

  /**
   * Fetch Inventory Overview
   */
  public static async getInventoryOverview(params: { companyId: string }): Promise<any | null> {
    return this.safeGet<any>(`${this.ENDPOINT}/inventory/overview/`, params);
  }

  /**
   * Fetch Employee Overview
   */
  public static async getEmployeeOverview(params: { companyId: string }): Promise<any | null> {
    return this.safeGet<any>(`${this.ENDPOINT}/employee/overview/`, params);
  }

  /**
   * Fetch Revenue Series (moved from Invoice API)
   */
  public static async getRevenueSeries(params: {
    companyId: string;
    startDate: string;
    endDate: string;
  }): Promise<RevenueSeriesData | null> {
    return this.safeGet<RevenueSeriesData>(`${this.ENDPOINT}/revenue-series/`, params);
  }
}

// ============================================================================
// Profit API
// ============================================================================

class ProfitAPI extends BaseFinanceAPI {
  private static readonly ENDPOINT = `/profit`;

  /**
   * Fetch Profit and Loss Statement
   */
  public static async getProfitAndLoss(params: {
    companyId: string;
    startDate: string;
    endDate: string;
  }): Promise<ProfitAndLossData | null> {
    return this.safeGet<ProfitAndLossData>(`${this.ENDPOINT}/profit_and_loss/`, params);
  }

  /**
   * Fetch COGS Detail
   */
  public static async getCOGSDetail(params: { companyId: string; startDate: string; endDate: string }): Promise<COGSData | null> {
    return this.safeGet<COGSData>(`${this.ENDPOINT}/cost_of_goods_and_services/`, params);
  }

  /**
   * Fetch Gross Profit Detail
   */
  public static async getGrossProfitDetail(params: {
    companyId: string;
    startDate: string;
    endDate: string;
  }): Promise<GrossProfitData | null> {
    return this.safeGet<GrossProfitData>(`${this.ENDPOINT}/gross_profit/`, params);
  }

  /**
   * Fetch Balance Sheet
   */
  public static async getBalanceSheet(params: { companyId: string; asOfDate: string }): Promise<BalanceSheetData | null> {
    return this.safeGet<BalanceSheetData>(`${this.ENDPOINT}/balance-sheet/`, params);
  }

  /**
   * Fetch Cash Flow Statement
   */
  public static async getCashFlow(params: { companyId: string; startDate: string; endDate: string }): Promise<CashFlowData | null> {
    return this.safeGet<CashFlowData>(`${this.ENDPOINT}/cash-flow/`, params);
  }
}

export async function fetchBudgets(params?: { startDate?: string; endDate?: string; category?: string }): Promise<any[]> {
  const q = params
    ? {
        start_date: params.startDate,
        end_date: params.endDate,
        category: params.category
      }
    : undefined;

  try {
    console.log(`[finance.api] Calling: /budget/list/ with params:`, q);
    const res = await axiosInstance.get('/budget/list/', { params: q });
    let data = res.data;

    if (Array.isArray(data) && data.length > 0) {
      return data;
    }

    return [];
  } catch (err: any) {
    console.warn('[finance.api] Failed to fetch budgets:', err.message || err);
    return [];
  }
}

export async function fetchBudgetByCategory(params?: { startDate?: string; endDate?: string }): Promise<any[]> {
  const q = params ? { start_date: params.startDate, end_date: params.endDate } : undefined;

  try {
    console.log(`[finance.api] Calling: /budget/by_category/ with params:`, q);
    const res = await axiosInstance.get('/budget/by_category/', { params: q });
    let data = res.data;

    return Array.isArray(data) ? data : [];
  } catch (err: any) {
    console.warn('[finance.api] Failed to fetch budgets by category:', err.message || err);
    // Surface the failure so fetchBudgetByCategoryAsync rejects and errors.budgets is set —
    // lets the dashboard distinguish a backend failure from genuinely-empty budgets.
    throw new Error(err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to fetch budgets by category');
  }
}

export async function fetchPayablesByDueDate(params?: { startDate?: string; endDate?: string }): Promise<any[]> {
  const q = params ? { start_date: params.startDate, end_date: params.endDate } : undefined;

  try {
    console.log(`[finance.api] Calling: /analytics/bill/by_due_date/ with params:`, q);
    const res = await axiosInstance.get('/analytics/bill/by_due_date/', { params: q });
    let data = res.data;

    return Array.isArray(data) ? data : [];
  } catch (err: any) {
    console.warn('[finance.api] Failed to fetch payables by due date:', err.message || err);
    // Surface the failure so fetchPayablesByDueDateAsync rejects and errors.payables is set.
    throw new Error(err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to fetch payables by due date');
  }
}

export async function fetchUpcomingPayments(params?: { daysAhead?: number }): Promise<any[]> {
  const q = params ? { days_ahead: params.daysAhead || 30 } : { days_ahead: 30 };

  try {
    console.log(`[finance.api] Calling: /analytics/bill/upcoming_payments/ with params:`, q);
    const res = await axiosInstance.get('/analytics/bill/upcoming_payments/', { params: q });
    let data = res.data;

    return Array.isArray(data) ? data : [];
  } catch (err: any) {
    console.warn('[finance.api] Failed to fetch upcoming payments:', err.message || err);
    return [];
  }
}

export async function fetchInvoiceSummary(params?: { startDate?: string; endDate?: string }): Promise<any> {
  const q = params ? { start_date: params.startDate, end_date: params.endDate } : undefined;

  try {
    console.log(`[finance.api] Calling: /analytics/invoice/summary/ with params:`, q);
    const res = await axiosInstance.get('/analytics/invoice/summary/', { params: q });
    return res.data;
  } catch (err: any) {
    console.warn('[finance.api] Failed to fetch invoice summary:', err.message || err);
    return null;
  }
}

export async function fetchOutstandingInvoices(params?: { startDate?: string; endDate?: string; limit?: number }): Promise<any[]> {
  const q = params
    ? {
        start_date: params.startDate,
        end_date: params.endDate,
        limit: params.limit || 100
      }
    : { limit: 100 };

  try {
    console.log(`[finance.api] Calling: /analytics/invoice/outstanding/ with params:`, q);
    const res = await axiosInstance.get('/analytics/invoice/outstanding/', { params: q });
    let data = res.data;

    return Array.isArray(data) ? data : [];
  } catch (err: any) {
    console.warn('[finance.api] Failed to fetch outstanding invoices:', err.message || err);
    return [];
  }
}

// ============================================================================
// Payment API
// ============================================================================

class PaymentAPI extends BaseFinanceAPI {
  private static readonly ENDPOINT = `/payment`;

  /**
   * Fetch Payment Summary
   */
  public static async getSummary(params: { companyId: string; startDate: string; endDate: string }): Promise<PaymentSummaryData | null> {
    return this.safeGet<PaymentSummaryData>(`${this.ENDPOINT}/summary/`, params);
  }

  /**
   * Fetch Payment Split
   */
  public static async getSplit(params: { companyId: string; startDate: string; endDate: string }): Promise<PaymentSplitData | null> {
    return this.safeGet<PaymentSplitData>(`${this.ENDPOINT}/split/`, params);
  }

  /**
   * Fetch Payment Trend
   */
  public static async getTrend(params: { companyId: string; startDate: string; endDate: string }): Promise<any[] | null> {
    return this.safeGet<any[]>(`${this.ENDPOINT}/trend/`, params);
  }

  /**
   * Fetch Payment Statistics
   */
  public static async getStatistics(params: { companyId: string; startDate: string; endDate: string }): Promise<any | null> {
    return this.safeGet<any>(`${this.ENDPOINT}/stats/`, params);
  }

  /**
   * Fetch Payment List
   */
  public static async getList(params: {
    companyId: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    status?: string;
    amount_range?: string;
    customerRefId?: string;
    isVoided?: boolean;
    ordering?: string;
    page?: number;
    pageSize?: number;
  }): Promise<any | null> {
    return this.safeGet<any>(`${this.ENDPOINT}/`, params);
  }

  /**
   * Fetch Payment Details
   */
  public static async getDetails(params: { companyId: string; page?: number; search?: string }): Promise<any | null> {
    return this.safeGet<any>(`${this.ENDPOINT}/details/`, params);
  }

  /**
   * Fetch Payment by ID
   */
  public static async getById(paymentId: string, params: { companyId: string }): Promise<any | null> {
    return this.safeGet<any>(`${this.ENDPOINT}/${paymentId}/`, params);
  }

  /**
   * Fetch Payment Suggestions
   */
  public static async getSuggestions(params: { companyId: string; q?: string }): Promise<any[] | null> {
    return this.safeGet<any[]>(`${this.ENDPOINT}/suggestions/`, params);
  }
}

// ============================================================================
// Expense API
// ============================================================================

class ExpenseAPI extends BaseFinanceAPI {
  private static readonly ENDPOINT = `/expense`;

  /**
   * Fetch Expense Summary
   */
  public static async getSummary(params: { companyId: string; startDate: string; endDate: string }): Promise<any | null> {
    return this.safeGet<any>(`${this.ENDPOINT}/summary/`, params);
  }

  /**
   * Fetch Expense Stats
   */
  public static async getStats(params: { companyId: string; startDate: string; endDate: string }): Promise<ExpenseStatsData | null> {
    return this.safeGet<ExpenseStatsData>(`${this.ENDPOINT}/stats/`, params);
  }

  /**
   * Fetch Expense Breakdown
   */
  public static async getBreakdown(params: {
    companyId: string;
    startDate: string;
    endDate: string;
  }): Promise<ExpenseBreakdownData | null> {
    return this.safeGet<ExpenseBreakdownData>(`${this.ENDPOINT}/breakdown/`, params);
  }

  /**
   * Fetch Top Expenses
   */
  public static async getTopExpenses(params: { companyId: string; startDate: string; endDate: string }): Promise<any[] | null> {
    return this.safeGet<any[]>(`${this.ENDPOINT}/top/`, params);
  }

  /**
   * Fetch Expense Trend
   */
  public static async getTrend(params: { companyId: string; startDate: string; endDate: string }): Promise<any[] | null> {
    return this.safeGet<any[]>(`${this.ENDPOINT}/trend/`, params);
  }

  /**
   * Fetch Bills Status
   */
  public static async getBillsStatus(params: { companyId: string; startDate: string; endDate: string }): Promise<any[] | null> {
    return this.safeGet<any[]>(`${this.ENDPOINT}/bills/status/`, params);
  }

  /**
   * Fetch Bills List
   */
  public static async getBills(params: {
    companyId: string;
    startDate: string;
    endDate: string;
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    ordering?: string;
    vendorRefId?: string;
    sync_status?: string;
    min_amount?: number;
    max_amount?: number;
  }): Promise<any | null> {
    return this.safeGet<any>(`${this.ENDPOINT}/bills/`, params);
  }

  /**
   * Fetch Purchases List
   */
  public static async getPurchases(params: { companyId: string; page?: number }): Promise<any | null> {
    return this.safeGet<any>(`${this.ENDPOINT}/purchases/`, params);
  }
}

// ============================================================================
// Expense CSV Import (standalone functions — mirrors inventory.api.ts)
// ============================================================================

export const downloadExpenseCsvTemplate = async (): Promise<Blob> => {
  const response = await axiosInstance.get('/expense/expenses/csv_template/', { responseType: 'blob' });
  return response.data;
};

export const uploadExpenseCsv = async (
  file: File,
  roleId?: string,
  onProgress?: (progress: number) => void
): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);

  const state = store.getState() as { auth?: { currentRole?: { id?: string } } };
  const resolvedRoleId = roleId || state.auth?.currentRole?.id || getRoleId();
  if (!resolvedRoleId) {
    throw Object.assign(new Error('No company selected'), {
      response: {
        data: {
          error: 'No company selected',
          details: 'Select a company from the header before importing expenses.'
        }
      }
    });
  }

  const response = await axiosInstance.post('/expense/expenses/bulk_upload/', formData, {
    headers: {
      'X-Role-ID': resolvedRoleId
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    }
  });

  return response.data;
};

export const downloadInvoiceCsvTemplate = async (): Promise<Blob> => {
  const response = await axiosInstance.get('/invoice/invoices/csv_template/', { responseType: 'blob' });
  return response.data;
};

export const uploadInvoiceCsv = async (
  file: File,
  roleId?: string,
  onProgress?: (progress: number) => void
): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);

  const state = store.getState() as { auth?: { currentRole?: { id?: string } } };
  const resolvedRoleId = roleId || state.auth?.currentRole?.id || getRoleId();
  if (!resolvedRoleId) {
    throw Object.assign(new Error('No company selected'), {
      response: {
        data: {
          error: 'No company selected',
          details: 'Select a company from the header before importing invoices.'
        }
      }
    });
  }

  const response = await axiosInstance.post('/invoice/invoices/bulk_upload/', formData, {
    headers: { 'X-Role-ID': resolvedRoleId },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
      }
    }
  });

  return response.data;
};

export const downloadPaymentCsvTemplate = async (): Promise<Blob> => {
  const response = await axiosInstance.get('/payment/payments/csv_template/', { responseType: 'blob' });
  return response.data;
};

export const uploadPaymentCsv = async (
  file: File,
  roleId?: string,
  onProgress?: (progress: number) => void
): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);

  const state = store.getState() as { auth?: { currentRole?: { id?: string } } };
  const resolvedRoleId = roleId || state.auth?.currentRole?.id || getRoleId();
  if (!resolvedRoleId) {
    throw Object.assign(new Error('No company selected'), {
      response: {
        data: {
          error: 'No company selected',
          details: 'Select a company from the header before importing payments.'
        }
      }
    });
  }

  const response = await axiosInstance.post('/payment/payments/bulk_upload/', formData, {
    headers: { 'X-Role-ID': resolvedRoleId },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
      }
    }
  });

  return response.data;
};

// ============================================================================
// Invoice API
// ============================================================================

class InvoiceAPI extends BaseFinanceAPI {
  private static readonly ENDPOINT = `/invoice`;

  /**
   * Fetch Invoice Statistics
   */
  public static async getStatistics(params: { companyId: string; startDate?: string; endDate?: string }): Promise<any | null> {
    return this.safeGet<any>(`${this.ENDPOINT}/stats/`, params);
  }

  /**
   * Fetch Invoice List
   */
  public static async getList(params: {
    companyId: string;
    startDate: string;
    endDate: string;
    search?: string;
    status?: string;
    amount_range?: string;
    customerRefId?: string;
    isVoided?: boolean;
    ordering?: string;
    page?: number;
    pageSize?: number;
  }): Promise<any | null> {
    return this.safeGet<any>(`${this.ENDPOINT}/`, params);
  }

  /**
   * Fetch Invoice Aging
   */
  public static async getAging(params: { companyId: string }): Promise<InvoiceAgingData | null> {
    return this.safeGet<InvoiceAgingData>(`${this.ENDPOINT}/aging/`, params);
  }

  /**
   * Fetch Invoice Suggestions
   */
  public static async getSuggestions(params: { companyId: string; q?: string }): Promise<any[] | null> {
    return this.safeGet<any[]>(`${this.ENDPOINT}/suggestions/`, params);
  }

  /**
   * Fetch Invoice by ID
   */
  public static async getById(invoiceId: string, params: { companyId: string }): Promise<any | null> {
    return this.safeGet<any>(`${this.ENDPOINT}/${invoiceId}/`, params);
  }
}

// ============================================================================
// Account API
// ============================================================================

class AccountAPI extends BaseFinanceAPI {
  private static readonly ENDPOINT = `/account`;

  /**
   * Fetch Account Summary
   */
  public static async getSummary(params: { companyId: string; startDate: string; endDate: string }): Promise<AccountSummaryData | null> {
    return this.safeGet<AccountSummaryData>(`${this.ENDPOINT}/summary/`, params);
  }
}

// ============================================================================
// Finance API Export
// ============================================================================

export const FinanceAPI = {
  Analytics: AnalyticsAPI,
  Profit: ProfitAPI,
  Payment: PaymentAPI,
  Expense: ExpenseAPI,
  Invoice: InvoiceAPI,
  Account: AccountAPI
};

export default FinanceAPI;
