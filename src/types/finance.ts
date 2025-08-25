// src/types/finance.ts

export interface KPI {
  totalRevenue: number;
  netIncome: number;
  grossProfit: number;
  grossMarginPct: number; // 0..1
  cashBalance: number;
  arOutstanding: number;
}

export interface TimeseriesPoint {
  t: string;
  revenue: number;
  expense: number;
  profit: number;
  cash_in: number;
  cash_out: number;
  company_id: string;
  company_name: string;
  period: string;
}

export interface CategoryAmount {
  category: string;
  amount: number;
  percentage: number;
  count: number;
  department?: string;
  company_id: string;
  company_name: string;
}

// Payment Types - matching Django backend API
export interface PaymentSummary {
  total_payments: string;
  payment_count: number;
  period: string;
}

export interface PaymentTrend {
  date: string;
  total_amount: string;
  count: number;
}

export interface PaymentDetail {
  id: string;
  customer_name: string;
  payment_date: string;
  amount: string;
  payment_method: string;
  applied_to_invoices: string[];
  status: string;
}

export type InvoiceStatus = 'paid' | 'pending' | 'overdue';

export interface InvoiceRow {
  id: string;
  customer: string;
  amount: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  balance: number;
  daysPastDue: number;
  company_id: string;
  company_name: string;
}

export interface Expense {
  id: string;
  vendor: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  payment_method: 'credit_card' | 'bank_transfer';
  status: 'pending' | 'paid';
  company_id: string;
  company_name: string;
}

export interface AgingBucket {
  bucket: '0-30' | '31-60' | '61-90' | '90+';
  amount: number;
}

export interface LedgerRow {
  id: string;
  date: string;
  account_name: string;
  account_code: string;
  account_type: 'bank' | 'accounts_receivable' | 'accounts_payable' | 'income' | 'expense' | 'equity';
  category: string;
  debit: number;
  credit: number;
  memo?: string;
  company_id: string;
  company_name: string;
  department?: string;
  reference?: string;
  reference_type?: string;
  balance: number;
}

// Generic page wrapper used by list endpoints
export type Page<T> = { rows: T[]; total: number; page: number; pageSize: number };

export type RangeParams = { startDate?: string; endDate?: string };
export type PageParams = { page?: number; pageSize?: number };

export type InvoicesParams = RangeParams &
  PageParams & {
    status?: InvoiceStatus;
    customer?: string;
    minAmount?: number;
    maxAmount?: number;
  };

export type ExpensesParams = RangeParams &
  PageParams & {
    category?: string;
    vendor?: string;
    minAmount?: number;
    maxAmount?: number;
    search?: string; // description/vendor/category
  };

// Financial Statement Types
export interface PnLRow {
  id: string;
  category: string;
  subcategory?: string;
  amount: number;
  type: 'income' | 'expense' | 'summary';
  department?: string;
  company_id: string;
  company_name: string;
  period: string;
  account_code: string;
  account_name: string;
}

export interface BalanceSheetRow {
  id: string;
  account: string;
  account_code: string;
  category: 'asset' | 'liability' | 'equity';
  subcategory: string;
  amount: number;
  previous_amount: number;
  change: number;
  department?: string;
  company_id: string;
  company_name: string;
  period: string;
}

export interface CashFlowRow {
  id: string;
  date: string;
  cash_in: number;
  cash_out: number;
  net_cash_flow: number;
  type: 'operating' | 'investing' | 'financing' | 'summary';
  description: string;
  department?: string;
  company_id: string;
  company_name: string;
  category: string;
  subcategory: string;
  period: string;
}

export type FinancialStatementParams = RangeParams &
  PageParams & {
    category?: string;
    subcategory?: string;
    department?: string;
    companyId?: string;
    type?: string;
    minAmount?: number;
    maxAmount?: number;
    search?: string;
  };

// New P&L API schemas (from backend serializers)
export interface ProfitAndLossSummary {
  period: string;
  total_income: number;
  total_expenses: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  net_operating_income: number;
  net_income: number;
}

export interface CostBreakdownItem {
  name: string;
  amount: number;
  type: string;
}

export interface COGSDetail {
  period: string;
  cost_of_goods_sold: number;
  cost_of_services: number;
  total_cost: number;
  cost_breakdown: CostBreakdownItem[];
}

export interface MonthlyGrossProfit {
  period: string;
  total_income: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  gross_margin_percentage: number;
}

export interface GrossProfitDetail {
  period: string;
  total_income: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  gross_margin_percentage: number;
  monthly_breakdown: MonthlyGrossProfit[];
}
