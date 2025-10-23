// src/types/finance.ts

// ============================================================================
// NEW API RESPONSE TYPES
// ============================================================================

// Analytics App
export interface FinanceKPIsData {
  period: {
    from: string;
    to: string;
  };
  summary: {
    totalRevenue: number;
    paymentsCount: number;
    avgTicket: number;
    expenses: number;
    net: number;
    inventoryValue: number | null;
    currency: string;
  };
  kpis: {
    revenue: number;
    expenses: number;
    net_income: number;
    gross_profit: number;
    cost_of_goods_sold: number;
    cash_balance: number;
    accounts_receivable_outstanding: number;
    accounts_payable_outstanding: number;
    working_capital: number;
  };
  ratios: {
    gross_profit_margin: number;
    net_profit_margin: number;
    current_ratio: number;
  };
  currency: string;
}

// Profit App
export interface ProfitAndLossData {
  net_income: number;
  net_operating_income: number;
  gross_profit: number;
  total_income: number;
  total_expenses: number;
  cost_of_goods_sold: number;
  period: {
    start_date: string;
    end_date: string;
  };
}

export interface COGSData {
  period: string;
  total_cogs: string;
  breakdown: Array<{
    category: string;
    amount: string;
  }>;
}

export interface COGSDataLegacy {
  cost_of_goods_sold: number;
  cost_of_services: number;
  total_cost: number;
  cost_breakdown: Array<{
    name: string;
    amount: number;
    type: string;
  }>;
  period: {
    start_date: string;
    end_date: string;
  };
}

export interface GrossProfitData {
  period: string;
  revenue: string;
  cost_of_goods_sold: string;
  gross_profit: string;
  gross_profit_margin: number;
  breakdown: {
    revenue_sources: Array<{
      source: string;
      amount: string;
    }>;
    cost_breakdown: Array<{
      category: string;
      amount: string;
    }>;
  };
}

export interface GrossProfitDataLegacy {
  period: {
    start_date: string;
    end_date: string;
  };
  total_income: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  gross_margin_percentage: number;
  monthly_breakdown: Array<{
    period: string;
    total_income: number;
    cost_of_goods_sold: number;
    gross_profit: number;
    gross_margin_percentage: number;
  }>;
}

export interface BalanceSheetData {
  as_of_date: string;
  balance_sheet: {
    assets: {
      current_assets: {
        total: number;
        accounts: {
          [accountName: string]: {
            type: string;
            balance: number;
            classification: string;
          };
        };
      };
      fixed_assets: {
        total: number;
        accounts: {
          [accountName: string]: {
            type: string;
            balance: number;
            classification: string;
          };
        };
      };
      total_assets: number;
    };
    liabilities: {
      current_liabilities: {
        total: number;
        accounts: {
          [accountName: string]: {
            type: string;
            balance: number;
            classification: string;
          };
        };
      };
      long_term_liabilities: {
        total: number;
        accounts: {
          [accountName: string]: {
            type: string;
            balance: number;
            classification: string;
          };
        };
      };
      total_liabilities: number;
    };
    equity: {
      total: number;
      accounts: {
        [accountName: string]: {
          type: string;
          balance: number;
          classification: string;
        };
      };
    };
    total_liabilities_equity: number;
    equation_balanced: boolean;
  };
  currency: string;
}

export interface BalanceSheetDataLegacy {
  assets: {
    current_assets: {
      cash: number;
      accounts_receivable: number;
      inventory: number;
      other_current: number;
      total: number;
    };
    fixed_assets: {
      equipment: number;
      buildings: number;
      depreciation: number;
      total: number;
    };
    total_assets: number;
  };
  liabilities: {
    current_liabilities: {
      accounts_payable: number;
      short_term_debt: number;
      other_current: number;
      total: number;
    };
    long_term_liabilities: {
      long_term_debt: number;
      other_long_term: number;
      total: number;
    };
    total_liabilities: number;
  };
  equity: {
    owner_equity: number;
    retained_earnings: number;
    current_earnings: number;
  };
  as_of_date: string;
}

export interface CashFlowData {
  period: {
    from: string;
    to: string;
  };
  cash_flow: {
    operating_activities: {
      cash_in: {
        customer_payments: number;
        total_operating_in: number;
      };
      cash_out: {
        vendor_payments: number;
        operating_expenses: number;
        total_operating_out: number;
      };
      net_operating: number;
    };
    investing_activities: {
      cash_in: number;
      cash_out: number;
      net_investing: number;
    };
    financing_activities: {
      cash_in: number;
      cash_out: number;
      net_financing: number;
    };
    summary: {
      net_cash_flow: number;
      cash_in_total: number;
      cash_out_total: number;
    };
  };
  currency: string;
}

export interface CashFlowDataLegacy {
  operating_activities: {
    cash_in: {
      customer_payments: number;
      other_operating: number;
      total: number;
    };
    cash_out: {
      supplier_payments: number;
      operating_expenses: number;
      other_operating: number;
      total: number;
    };
    net_operating: number;
  };
  investing_activities: {
    cash_in: {
      asset_sales: number;
      other_investing: number;
      total: number;
    };
    cash_out: {
      asset_purchases: number;
      other_investing: number;
      total: number;
    };
    net_investing: number;
  };
  financing_activities: {
    cash_in: {
      loans_received: number;
      other_financing: number;
      total: number;
    };
    cash_out: {
      loan_payments: number;
      other_financing: number;
      total: number;
    };
    net_financing: number;
  };
  net_cash_flow: number;
  beginning_cash: number;
  ending_cash: number;
}

// Payment App
export interface PaymentSummaryData {
  total_payments: number;
  payment_count: number;
  period: {
    start_date: string;
    end_date: string;
  };
}

export interface PaymentSplitData {
  payment_methods: Array<{
    provider: string;
    amount: string;
    count: number;
  }>;
}

// Expense App
export interface ExpenseStatsData {
  total_expenses: string;
  expense_count: number;
  average_expense: string;
  top_category: string;
  period: string;
}

export interface ExpenseBreakdownData {
  by_type: Array<{
    type: string;
    count: number;
    total: string;
    percentage: number;
  }>;
  by_payee: Array<{
    payee_name: string;
    count: number;
    total: string;
    percentage: number;
  }>;
  by_category: Array<{
    category_name: string;
    count: number;
    total: string;
    percentage: number;
  }>;
}

// Invoice App
export interface InvoiceAgingData {
  aging_summary: {
    current: number;
    days_31_60: number;
    days_61_90: number;
    over_90: number;
    total: number;
  };
  aging_details: Array<{
    invoice_id: string;
    doc_number: string;
    customer_name: string;
    date: string;
    due_date: string;
    total_amount: number;
    balance: number;
    days_overdue: number;
    age_bucket: string;
  }>;
}

// Revenue Series - API may return either nested or flat array of points
export interface RevenueSeriesPoint {
  date: string; // YYYY-MM-DD
  amount: string | number; // decimal string or number
}

export type RevenueSeriesData = RevenueSeriesPoint[];

// Expense Trend - daily points with date field (YYYY-MM-DD)
export interface ExpenseTrendPoint {
  date: string;
  amount: string | number;
}

export type ExpenseTrendData = ExpenseTrendPoint[];

// Account App
export interface AccountSummaryData {
  total_accounts: number;
  total_balance: number;
  period: string;
}

// Analytics Main App
export interface AnalyticsSummaryData {
  total_revenue: number;
  payments_count: number;
  avg_ticket: number;
  expenses: number;
  net: number;
  inventory_value: number;
  currency: string;
}

export interface CRMAnalyticsOverviewData {
  total_contacts: number;
  active_leads: number;
  open_deals: number;
  deals_value: number;
  conversion_rate: number;
  pipeline_health: string;
}

export interface CRMPipelineData {
  pipeline_value: number;
  stages: Array<{
    stage: string;
    count: number;
    value: number;
    percentage: number;
  }>;
}

export interface InventoryOverviewData {
  total_items: number;
  total_value: number;
  low_stock_items: number;
  out_of_stock_items: number;
  categories: Array<{
    category: string;
    count: number;
    value: number;
  }>;
}

export interface EmployeeOverviewData {
  total_employees: number;
  total_hours_logged: number;
  average_hours_per_employee: number;
  productivity_score: number;
  top_performers: Array<{
    employee_name: string;
    hours_logged: number;
    productivity_score: number;
  }>;
}

// ============================================================================
// LEGACY TYPES (for backward compatibility)
// ============================================================================

// Legacy KPI interface (for backward compatibility)
// New Finance KPIs API Response
export interface FinanceKPIsResponse {
  period: {
    from: string;
    to: string;
  };
  summary: {
    totalRevenue: number;
    paymentsCount: number;
    avgTicket: number;
    expenses: number;
    net: number;
    inventoryValue: number | null;
    currency: string;
  };
  kpis: {
    revenue: number;
    expenses: number;
    net_income: number;
    gross_profit: number;
    cost_of_goods_sold: number;
    cash_balance: number;
    accounts_receivable_outstanding: number;
    accounts_payable_outstanding: number;
    working_capital: number;
  };
  ratios: {
    gross_profit_margin: number;
    net_profit_margin: number;
    current_ratio: number;
  };
  currency: string;
}

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface RangeParams {
  startDate?: string;
  endDate?: string;
}

export interface PageParams {
  page?: number;
  pageSize?: number;
}

export interface InvoicesParams extends RangeParams, PageParams {
  status?: string;
  search?: string;
  amountRange?: string;
  customerRefId?: string;
  isVoided?: boolean;
  ordering?: string;
}

export interface ExpensesParams extends RangeParams, PageParams {
  category?: string;
  vendor?: string;
  status?: string;
}

// ============================================================================
// INVOICE TYPES
// ============================================================================

export interface InvoiceRow {
  id: string;
  doc_number: string;
  customer_name: string;
  date: string;
  due_date: string;
  total_amount: string;
  balance: string;
  status: string;
  currency: string;
}

export interface InvoiceListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: InvoiceRow[];
}

export interface InvoiceStatistics {
  total_invoices: number;
  unpaid_count: number;
  overdue_count: number;
  paid_count: number;
  total_amount: number;
  outstanding_balance: number;
}

// ============================================================================
// EXPENSE TYPES
// ============================================================================

// Legacy Expense interface for backward compatibility
export interface LegacyExpense {
  id: string;
  entity_name: string;
  amount: string;
  date: string;
  category: string;
  vendor?: string;
}

export interface ExpenseSummary {
  total_expenses: string;
  period: string;
  expense_categories: Array<{
    name: string;
    amount: string;
    count: number;
  }>;
}

export interface ExpenseCategory {
  category_name: string;
  amount: string;
  percentage: string;
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export interface PaymentDetail {
  id: string;
  customer_name: string;
  amount: string;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
}

export interface PaymentTrend {
  date: string;
  total_amount: string;
  count: number;
}

// ============================================================================
// LEDGER TYPES
// ============================================================================

export interface LedgerRow {
  id: string;
  account_name: string;
  debit: string;
  credit: string;
  balance: string;
  date: string;
  description: string;
}

export interface AgingBucket {
  period: string;
  amount: number;
  count: number;
}

export interface TimeseriesPoint {
  x: string;
  y: number;
}

export interface CategoryAmount {
  category: string;
  amount: number;
}

// ============================================================================
// P&L TYPES
// ============================================================================

export interface PnLRow {
  category: string;
  amount: number;
  percentage?: number;
}

export interface BalanceSheetRow {
  category: string;
  amount: number;
  subcategory?: string;
}

export interface CashFlowRow {
  category: string;
  amount: number;
  type: 'in' | 'out';
}

// ============================================================================
// LEGACY COMPATIBILITY TYPES
// ============================================================================

export interface ProfitAndLossSummary {
  total_income: number;
  total_expenses: number;
  gross_profit: number;
  net_income: number;
  period: {
    start_date: string;
    end_date: string;
  };
}

export interface COGSDetail {
  cost_of_goods_sold: number;
  materials: number;
  labor: number;
  overhead: number;
}

export interface GrossProfitDetail {
  gross_profit: number;
  gross_margin: number;
  revenue: number;
  cost_of_goods_sold: number;
}

export interface PaymentSummary {
  total_payments: number;
  payment_count: number;
  average_payment: number;
}

export interface KPI {
  totalRevenue: number;
  netIncome: number;
  grossProfit: number;
  cashBalance: number;
}

// ============================================================================
// ADDITIONAL DETAILED RESPONSE TYPES
// ============================================================================

export interface PaymentSplitPoint {
  provider: string;
  amount: number;
}

export interface PaymentStatistics {
  total_payments: number;
  total_received: number;
  payments_by_cash: number;
  payments_by_check: number;
  payments_by_card: number;
  average_payment: number;
  total_unapplied: number;
  todays_payments: number;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  period: 'monthly' | 'quarterly' | 'annual';
  start_date: string;
  end_date: string;
}

export interface BudgetByCategory {
  category: string;
  amount: number;
  budget_count: number;
}

export interface Payable {
  label: string;
  due_date: string; // e.g., 'this_week', 'next_week', 'this_month', 'overdue'
  amount: number;
  count: number; // Number of bills in this bucket
}

export interface UpcomingPayment {
  id: string;
  doc_number: string;
  vendor_name: string;
  amount: number;
  due_date: string; // ISO date string (YYYY-MM-DD)
  days_until_due: number;
}

export interface InvoiceSummary {
  total_invoiced: number;
  total_outstanding: number;
  total_paid: number;
  total_invoices: number;
  paid_invoices: number;
  unpaid_invoices: number;
  days_sales_outstanding: number; // DSO metric
  collection_rate: number; // Percentage (0-100)
}

export interface OutstandingInvoice {
  id: string;
  doc_number: string;
  customer_name: string;
  amount: number; // Original invoice amount
  balance: number; // Remaining balance
  invoice_date: string; // ISO date string (YYYY-MM-DD)
  due_date: string; // ISO date string (YYYY-MM-DD)
  days_overdue: number; // 0 if not yet due, positive if overdue
}
export interface PaymentTrendPoint {
  date: string;
  total_amount: number;
  count: number;
}

export interface PaymentRow {
  id: string;
  qb_id: string;
  customer_name: string;
  amount: string;
  payment_method: string;
  payment_date: string;
  reference_number: string;
  unapplied_amount: string;
  status?: string;
}

export interface ExpenseSummaryDetailed {
  total_expenses: string;
  total_bills: string;
  total_purchases: string;
  bills_count: number;
  purchases_count: number;
  total_count: number;
  average_expense: string;
  unpaid_amount: string;
  unpaid_bills_count: number;
}

export interface InvoiceSuggestion {
  id: string;
  customer_name: string;
  doc_number: string;
  display: string;
  count: number;
}

// Expense/Expenses Types (renamed from Bill for better understanding)
export interface ExpenseLineItem {
  id: string;
  description: string;
  amount: string;
  account_ref_id: string | null;
  account_name: string | null;
}

export interface Expense {
  id: string;
  qb_id: string;
  vendor_ref_id: string;
  vendor_name: string;
  amount: string;
  balance: string;
  bill_date: string;
  due_date: string;
  doc_number: string | null;
  sales_term_ref_name: string | null;
  currency_ref: string;
  ap_account_ref_name: string | null;
  vendor_addr_city: string | null;
  vendor_addr_state: string | null;
  private_note: string | null;
  memo: string | null;
  sync_status: string;
  qb_last_updated_time: string | null;
  last_synced_at: string;
  line_items: ExpenseLineItem[];
  status: 'paid' | 'unpaid' | 'overdue';
}

export interface ExpensesListResponse {
  items: Expense[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    page_size: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

// Legacy Bill types for backward compatibility
export type Bill = Expense;
export type BillLineItem = ExpenseLineItem;
export type BillsListResponse = ExpensesListResponse;
