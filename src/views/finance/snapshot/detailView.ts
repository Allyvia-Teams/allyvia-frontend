import type {
  FinanceCash,
  FinanceExpenses,
  FinanceProfit,
  FinanceSales,
  FinanceSnapshot,
  ExpenseBucket,
  Figure,
  ProfitLineKey
} from 'api/financeSnapshot';
import type { SalesSearchParams } from 'features/pos/api/posApi';
import { formatAmount } from './snapshotFormat';
import {
  figureBadge,
  figureText,
  NOT_AVAILABLE,
  shortDay,
  unavailableReason,
  type AmountLine,
  type FigureView,
  type Range
} from './snapshotView';

// Pure view functions for the Finance detail pages (docs/finance-tab-plan.md, Task 8). Same rule
// as the snapshot: every amount is the API's own string, formatted for display and never
// combined with another.

const view = (label: string, f: Figure, currency: string): FigureView => ({
  label,
  figure: f,
  text: figureText(f, currency),
  badge: figureBadge(f),
  secondary: unavailableReason(f)
});

/** True when a 2dp string is above zero, read from the string itself. */
const positive = (v: string | null | undefined): v is string => !!v && !v.startsWith('-') && /[1-9]/.test(v);

// -------------------------------- Sales -------------------------------- //

const METHOD_LABELS: Record<string, string> = {
  card: 'Card',
  cash: 'Cash',
  split: 'Split',
  store_credit: 'Store credit',
  unknown: 'Other',
  quickbooks_invoices: 'QuickBooks invoices'
};
export const paymentMethodLabel = (method: string): string =>
  METHOD_LABELS[method] ?? method.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export function salesView(block: FinanceSales['currencies'][number]) {
  const c = block.currency;
  return {
    netSales: view('Net sales', block.net_sales, c),
    salesTax: formatAmount(block.sales_tax, c),
    refunds: formatAmount(block.refunds, c),
    channels: block.by_channel.map((r) => ({ label: r.label, amount: formatAmount(r.amount, c) })),
    days: block.by_day.map((d) => ({
      date: shortDay(d.date),
      amount: formatAmount(d.net_sales, c),
      count: `${d.count} ${d.count === 1 ? 'sale' : 'sales'}`
    })),
    methods: block.by_payment_method.map((m) => ({ label: paymentMethodLabel(m.method), amount: formatAmount(m.collected, c) }))
  };
}

export const ORDER_PAGE_SIZE = 25;

/** `?page=` as a zero-based page index; anything else is the first page. */
export function pageFromParams(params: URLSearchParams, key = 'page'): number {
  const raw = params.get(key) ?? '';
  return /^\d{1,6}$/.test(raw) ? parseInt(raw, 10) : 0; // not money: a page index
}

/** The order list's query: the page's own range and store, a page of 25. */
export function orderSearchParams(range: Range, locationId: string | null, page: number): SalesSearchParams {
  return {
    dateFrom: range.start,
    dateTo: range.end,
    ...(locationId ? { locationId } : {}),
    limit: ORDER_PAGE_SIZE,
    offset: page * ORDER_PAGE_SIZE
  };
}

// -------------------------------- Profit ------------------------------- //

const STATEMENT: ProfitLineKey[] = ['net_sales', 'cogs', 'gross_profit', 'operating_expenses', 'net_profit'];
const BESIDE: ProfitLineKey[] = ['sales_tax', 'gross_margin_pct', 'inventory_bought', 'equipment'];

export interface ProfitLine extends FigureView {
  key: ProfitLineKey;
}

export function profitView(block: FinanceProfit['currencies'][number]) {
  const c = block.currency;
  const line = (key: ProfitLineKey): ProfitLine | null => {
    const l = block.lines.find((x) => x.key === key);
    if (!l) return null;
    const f: Figure = { value: l.value, status: l.status, reason: l.reason };
    const v = view(l.label, f, c);
    if (key === 'gross_margin_pct' && f.status !== 'unavailable') {
      return { ...v, key, text: f.value === null ? 'No margin without sales' : `${f.value}%` };
    }
    return { ...v, key };
  };
  const pick = (keys: ProfitLineKey[]) => keys.map(line).filter((l): l is ProfitLine => l !== null);
  const q = block.cogs_quality;
  const costNotes: string[] = [];
  if (positive(q.estimated))
    costNotes.push(`${formatAmount(q.estimated, c)} of cost of goods is estimated from an item's cost after the sale`);
  if (q.uncosted_lines > 0) {
    costNotes.push(
      `${q.uncosted_lines} sold ${q.uncosted_lines === 1 ? 'line' : 'lines'} (${formatAmount(q.uncosted_sales, c)} of sales) ${
        q.uncosted_lines === 1 ? 'has' : 'have'
      } no cost recorded`
    );
  }
  return {
    statement: pick(STATEMENT),
    beside: pick(BESIDE),
    buckets: block.operating_expenses_by_bucket.map((b) => ({ label: b.label, amount: formatAmount(b.amount, c) })),
    costNotes
  };
}

export type GapView =
  | { quiet: string }
  | { heading: string; gap: string; quickbooksNetIncome: string; reasons: { label: string; amount: string }[] };

/** The QuickBooks comparison: shown, one quiet line when QuickBooks failed, else nothing. */
export function gapView(p: FinanceProfit): GapView | null {
  if (p.quickbooks_gap_status === 'unavailable') return { quiet: 'QuickBooks could not be reached, so the comparison is not shown' };
  if (p.quickbooks_gap_status !== 'shown' || !p.quickbooks_gap) return null;
  const c = p.currencies[0]?.currency ?? 'USD';
  const g = p.quickbooks_gap;
  return {
    heading: 'Why this differs from QuickBooks',
    gap: formatAmount(g.gap, c),
    quickbooksNetIncome: formatAmount(g.quickbooks_net_income, c),
    reasons: g.reasons.map((r) => ({ label: r.label, amount: formatAmount(r.amount, c) }))
  };
}

// ------------------------------- Expenses ------------------------------ //

const BASIS: Record<string, string> = { billed: 'Billed', paid: 'Paid' };
const FROM: Record<string, string> = { quickbooks: 'from QuickBooks', xero: 'from Xero', bank: 'from your bank' };

export function expensesView(e: FinanceExpenses) {
  const c = e.currency;
  const unavailable = e.status === 'unavailable' ? e.reason || NOT_AVAILABLE : null;
  return {
    basis: e.basis && FROM[e.expense_source] ? `${BASIS[e.basis]}, ${FROM[e.expense_source]}` : null,
    unavailable,
    badge:
      e.status === 'estimated' || e.status === 'partial'
        ? figureBadge({ value: '', status: e.status, reason: e.reason })
        : { label: null, tooltip: '' },
    categories: e.categories.map((r) => ({ bucket: r.bucket, label: r.label, amount: formatAmount(r.amount, c) })),
    rows: e.results.map((r) => ({
      id: r.id,
      date: shortDay(r.date),
      payee: r.payee,
      category: r.category,
      amount: formatAmount(r.amount, c)
    }))
  };
}

// --------------------------- Cash and position -------------------------- //

type CashCurrency = FinanceCash['currencies'][number];

const accountRows = (block: CashCurrency): AmountLine[] =>
  block.cash.accounts.map((a) => ({ label: a.mask ? `${a.name} ••${a.mask}` : a.name, amount: formatAmount(a.balance, block.currency) }));

export function cashView(block: CashCurrency) {
  const c = block.currency;
  return {
    figures: [view('Money in', block.cash.money_in, c), view('Money out', block.cash.money_out, c), view('Balance', block.cash.balance, c)],
    accounts: accountRows(block)
  };
}

export function positionView(block: CashCurrency) {
  const c = block.currency;
  const p = block.position;
  const missing = p.items_missing_cost;
  return {
    figures: [view('Cash', p.cash, c), view('Inventory at cost', p.inventory_at_cost, c), view('Unpaid bills', p.unpaid_bills, c)],
    missingCost: missing
      ? `${missing} ${missing === 1 ? 'item in stock has' : 'items in stock have'} no cost, so they are not counted`
      : null,
    accounts: accountRows(block)
  };
}

export const quickBooksExtrasAllowed = (s: FinanceSnapshot): boolean => s.expense_source === 'quickbooks';

/** The bucket filter on the Expenses page, in the order an owner reads them. */
export const EXPENSE_FILTERS: { bucket: ExpenseBucket | null; label: string }[] = [
  { bucket: null, label: 'All' },
  { bucket: 'labour', label: 'Labour' },
  { bucket: 'opex', label: 'Operating' },
  { bucket: 'technology', label: 'Technology' },
  { bucket: 'marketing', label: 'Marketing' },
  { bucket: 'inventory', label: 'Inventory bought' },
  { bucket: 'capex', label: 'Equipment' },
  { bucket: 'unreviewed', label: 'Not yet categorized' }
];

const BUCKETS = new Set(EXPENSE_FILTERS.map((f) => f.bucket).filter(Boolean));
/** `?bucket=` when it names a bucket the endpoint accepts (`needs_review` is a synonym), else none. */
export function bucketFromParams(params: URLSearchParams): ExpenseBucket | null {
  const raw = params.get('bucket');
  if (raw === 'needs_review') return 'unreviewed';
  return raw && BUCKETS.has(raw as ExpenseBucket) ? (raw as ExpenseBucket) : null;
}
