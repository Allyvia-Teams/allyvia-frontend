export interface ExpenseCategory {
  id: string;
  name: string;
  group: string;
  default_treatment: string;
  active: boolean;
}
export interface ExpenseLine {
  category_id: string;
  treatment: string;
  amount: string;
  category?: string;
  group?: string;
}
export interface ExpenseForm {
  amount: string;
  currency: string;
  date: string;
  recognized_date: string;
  due_date?: string | null;
  payee: string;
  description?: string;
  receipt_reference: string;
  lines: ExpenseLine[];
  vendor_id?: number | null;
  location_id?: string | null;
  version?: number;
  reason?: string;
  source_id?: string;
}
export interface NativeExpense extends ExpenseForm {
  id: string;
  status: string;
  paid: string;
  outstanding: string;
  voided: boolean;
  version: number;
  settlements: { id: string; amount: string; paid_date: string; reference: string; reversed: boolean }[];
  audit: { action: string; reason: string; actor_email: string; created_at: string }[];
}
export interface ExpenseTotals {
  recognized_expenses: string;
  cash_paid: string;
  outstanding: string;
  unclassified?: string;
}
export interface ExpenseReport {
  basis: string;
  currencies: Record<string, ExpenseTotals>;
  records: {
    source_id: string;
    group?: string;
    entry_id?: string;
    category: string;
    payee: string;
    treatment: string;
    amount: string;
    currency: string;
    recognized_date: string;
    recognized_expense: string;
    cash_paid: string;
    outstanding: string;
  }[];
  groups: Record<string, (ExpenseTotals & { currency: string; label: string })[]>;
  coverage: { source: string; available: boolean; detail: string; last_updated?: string }[];
  complete: boolean;
}

export interface ExpenseRecognition {
  start_date: string;
  end_date: string;
  as_of: string;
  currencies: Record<string, ExpenseTotals>;
  coverage: ExpenseReport['coverage'];
  complete: boolean;
  confidence: 'high' | 'partial' | 'unknown';
  sources: { quickbooks: boolean; native: boolean; vendor_bills: boolean };
  basis: string;
  legacy_scalar_basis: string;
}

export type Cadence = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

/** One group of imported rows the server thinks may be one bill (POST recurring/suggest/). */
export interface SuggestedGroup {
  payee: string;
  name: string;
  amount: string;
  currency: string;
  category_id: string;
  category_name: string;
  treatment: string;
  count: number;
  dates: string[];
  entry_ids: string[];
  suggested_cadence: Cadence | null;
  start_date: string | null;
  /** The day the rows usually fell on; used for monthly and yearly. */
  day_of_month: number;
  /** The first date after the last imported row, for each cadence. */
  starts: Record<Cadence, string>;
}

/** The body of POST recurring/ (company_id is added by the API). */
export interface RecurringPayload {
  request_id: string;
  name: string;
  amount: string;
  currency: string;
  category_id: string;
  treatment: string;
  payee: string;
  source_reference: string;
  start_date: string;
  day_of_month: number;
  cadence: Cadence;
}
