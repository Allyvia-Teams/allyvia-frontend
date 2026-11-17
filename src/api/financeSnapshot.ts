import axios from 'utils/axios';

// The finance snapshot and its detail endpoints (docs/finance-tab-plan.md, Tasks 5 to 7).
// Base path /analytics/finance/<name>/ under the API root; query start_date and end_date
// (YYYY-MM-DD); a store is sent as the X-Location-Id header, the only store signal these
// views read. Money is always a 2dp string or null, never a number: the browser formats
// it and never adds, subtracts or divides it.
//
// Types are checked against real responses in docs/finance-tab-fixtures (copied to
// src/views/finance/snapshot/fixtures). Where the plan and the JSON disagreed, the JSON won.

export type FigureStatus = 'exact' | 'estimated' | 'partial' | 'unavailable';
export interface Figure {
  value: string | null;
  status: FigureStatus;
  reason: string;
}

export interface Period {
  start: string;
  end: string;
}

/** The query every endpoint takes. `locationId` scopes to one store. */
export interface FinanceRange {
  start: string;
  end: string;
  locationId?: string | null;
}

export type ExpenseSource = 'quickbooks' | 'xero' | 'bank' | 'accounting_conflict';
export type ExpenseBasis = 'billed' | 'paid';
export type ExpenseBucket = 'inventory' | 'labour' | 'opex' | 'capex' | 'technology' | 'marketing' | 'unreviewed';

export interface AmountRow {
  label: string;
  amount: string;
}
export interface ChannelRow extends AmountRow {
  channel: string;
}
export interface BucketRow extends AmountRow {
  bucket: string;
}

export interface CogsQuality {
  at_sale: string;
  estimated: string;
  uncosted_lines: number;
  uncosted_sales: string;
}

export interface CashBlock {
  balance: Figure;
  money_in: Figure;
  money_out: Figure;
  accounts: { name: string; mask: string; balance: string }[];
}

export interface PositionBlock {
  cash: Figure;
  inventory_at_cost: Figure;
  /** null outside the USD block and on a store view (the plan said int). */
  items_missing_cost: number | null;
  unpaid_bills: Figure;
}

export interface CurrencyBlock {
  currency: string;
  net_sales: Figure;
  sales_tax: Figure;
  cogs: Figure;
  gross_profit: Figure;
  gross_margin_pct: Figure;
  sales_by_channel: ChannelRow[];
  cogs_quality: CogsQuality;
  operating_expenses: Figure;
  net_profit: Figure;
  inventory_bought: Figure;
  equipment: Figure;
  unreviewed_outflow: Figure;
  /** Operating buckets only (labour, opex, technology, marketing); empty when expenses are unavailable. */
  expenses_by_bucket: BucketRow[];
  cash: CashBlock;
  position: PositionBlock;
}

export interface FinanceSnapshot {
  period: Period;
  expense_source: ExpenseSource;
  expense_basis: ExpenseBasis | null;
  last_synced_at: string | null;
  currencies: CurrencyBlock[];
}

export interface FinanceSales {
  period: Period;
  currencies: {
    currency: string;
    net_sales: Figure;
    sales_tax: string;
    /** Net of tax. */
    refunds: string;
    by_channel: ChannelRow[];
    /** Sparse: days without a sale are absent. */
    by_day: { date: string; net_sales: string; count: number }[];
    by_payment_method: { method: string; collected: string }[];
  }[];
}

export interface FinanceExpenses {
  period: Period;
  expense_source: ExpenseSource;
  basis: ExpenseBasis | null;
  currency: string;
  currencies: string[];
  bucket: ExpenseBucket | null;
  category: string | null;
  status: FigureStatus;
  reason: string;
  /** For QuickBooks owners the label is the account name ("Wages"), for bank owners the bucket label. */
  categories: { bucket: ExpenseBucket; label: string; amount: string }[];
  results: {
    id: string;
    date: string;
    payee: string;
    category: string;
    bucket: ExpenseBucket;
    amount: string;
    source: 'quickbooks' | 'allyvia' | 'vendor_bills' | 'bank';
  }[];
  count: number;
  page: number;
  page_size: number;
}

export type ProfitLineKey =
  | 'net_sales'
  | 'sales_tax'
  | 'cogs'
  | 'gross_profit'
  | 'gross_margin_pct'
  | 'operating_expenses'
  | 'net_profit'
  | 'inventory_bought'
  | 'equipment';

export interface QuickBooksGap {
  gap: string;
  quickbooks_net_income: string;
  reasons: { label: 'POS sales not in QuickBooks' | 'Cost of goods sold instead of purchases' | 'Other'; amount: string }[];
}

export interface FinanceProfit {
  period: Period;
  expense_source: ExpenseSource;
  expense_basis: ExpenseBasis | null;
  quickbooks_gap: QuickBooksGap | null;
  quickbooks_gap_status: 'shown' | 'below_threshold' | 'unavailable' | 'not_applicable';
  currencies: {
    currency: string;
    lines: ({ key: ProfitLineKey; label: string } & Figure)[];
    operating_expenses_by_bucket: BucketRow[];
    cogs_quality: CogsQuality;
  }[];
}

export interface FinanceCash {
  period: Period;
  expense_source: ExpenseSource;
  last_synced_at: string | null;
  currencies: { currency: string; cash: CashBlock; position: PositionBlock }[];
}

export interface ExpensesQuery {
  bucket?: ExpenseBucket;
  category?: string;
  currency?: string;
  page: number;
}

const ROOT = '/analytics/finance';

async function get<T>(name: string, range: FinanceRange, extra: Record<string, string | number | undefined> = {}): Promise<T> {
  const response = await axios.get<T>(`${ROOT}/${name}/`, {
    params: { start_date: range.start, end_date: range.end, ...extra },
    ...(range.locationId ? { headers: { 'X-Location-Id': range.locationId } } : {})
  });
  return response.data;
}

export const financeSnapshotApi = {
  snapshot: (range: FinanceRange) => get<FinanceSnapshot>('snapshot', range),
  sales: (range: FinanceRange) => get<FinanceSales>('sales', range),
  expenses: (range: FinanceRange, query: ExpensesQuery) =>
    get<FinanceExpenses>('expenses', range, {
      bucket: query.bucket,
      category: query.category,
      currency: query.currency,
      page: query.page
    }),
  profit: (range: FinanceRange) => get<FinanceProfit>('profit', range),
  cash: (range: FinanceRange) => get<FinanceCash>('cash', range)
};

export default financeSnapshotApi;
