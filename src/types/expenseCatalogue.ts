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
