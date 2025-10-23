// src/types/finance.ts

// Legacy KPI interface (for backward compatibility)
export interface KPI {
  id: string;
  title: string;
  value: number;
  change: number;
  change_percentage: number;
  trend: 'up' | 'down';
  period: string;
  totalRevenue: number;
  netIncome: number;
  grossProfit: number;
  grossMarginPct: number; // 0..1
  cashBalance: number;
  arOutstanding: number;
}

// PDF Report Types
export type RGB = [number, number, number];

export interface PDFKPI {
  label: string;
  value: string | number;
  sublabel?: string;
}

export interface TableCol {
  header: string;
  dataKey: string;
  widthPct?: number; // percentage (0–100) of usable width
  align?: 'left' | 'center' | 'right';
}

export interface TableSection {
  kind: 'table';
  title: string;
  columns: TableCol[];
  rows: Record<string, any>[];
}

export interface InsightsSection {
  kind: 'insights';
  title: string;
  bullets: string[];
}

export interface ChartSection {
  kind: 'chart';
  title?: string;
  imageDataUrl: string; // data URL image
  height?: number; // default ~72 mm
}

export type Section = TableSection | InsightsSection | ChartSection;

export interface Brand {
  headerBg: RGB;
  headerText: RGB;
  accent: RGB;
  panelBg: RGB;
  tableHeadBg: RGB;
  tableBorder: RGB;
}

export interface BuildReportParams {
  title: string;
  subtitle?: string; // shown at top-right
  duration?: string; // shown ONLY on page 1 in a left panel
  logoDataUrl?: string; // Allyvia logo as data URL
  brand?: Partial<Brand>;
  kpis?: PDFKPI[]; // Overview KPI cards
  statementKpis?: PDFKPI[]; // P&L summary KPI cards
  charts?: string[]; // overview charts as data URLs
  sections?: Section[]; // detail sections (tables/insights/charts)
  fileName?: string; // output filename
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
  days_past_due: number;
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
  count: number;
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
  account_type: string;
  account_count: number;
  total_balance: number;
  percentage: number;
}

export interface AccountDetail {
  id: string;
  name: string;
  account_code: string;
  account_type: string;
  balance: number;
  previous_balance: number;
  change: number;
  company_id: string;
  company_name: string;
  date: string;
}

export interface AccountSummary {
  total_accounts: number;
  total_balance: number;
  average_balance: number;
  accounts_by_type: {
    type: string;
    count: number;
    total_balance: number;
    percentage: number;
  }[];
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
  net_revenue: number;
  total_expenses: number;
  cost_of_goods_sold: number;
  operating_expenses: number;
  administrative_expenses: number;
  gross_profit: number;
  gross_margin_percentage: number;
  net_operating_income: number;
  net_income: number;
  net_margin_percentage: number;
  cash_balance: number;
  accounts_receivable: number;
  accounts_payable: number;
  working_capital: number;
  cash_flow_operating: number;
  cash_flow_investing: number;
  cash_flow_financing: number;
  net_cash_flow: number;
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
