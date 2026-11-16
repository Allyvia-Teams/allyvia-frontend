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
import type { CashFlowData } from 'types/finance';
import { bucketLabel, BUCKET_LABELS } from '../bucketLabels';
import { formatAmount, formatOrderAmount } from './snapshotFormat';
import {
  bankFixHref,
  bankView,
  cashCard,
  figureBadge,
  NOT_AVAILABLE,
  shortDay,
  view,
  type AmountLine,
  type FigureView,
  type Range,
  type ViewContext,
  withRange
} from './snapshotView';

// Pure view functions for the Finance detail pages (docs/finance-tab-plan.md, Task 8). Same rule
// as the snapshot: every amount is the API's own string, formatted for display and never
// combined with another.

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

const FROM_EXPENSES = new Set<ProfitLineKey>(['operating_expenses', 'net_profit', 'inventory_bought', 'equipment']);

export function profitView(block: FinanceProfit['currencies'][number], ctx?: ViewContext) {
  const c = block.currency;
  const line = (key: ProfitLineKey): ProfitLine | null => {
    const l = block.lines.find((x) => x.key === key);
    if (!l) return null;
    const f: Figure = { value: l.value, status: l.status, reason: l.reason };
    const v = FROM_EXPENSES.has(key) ? bankView(l.label, f, c, ctx) : view(l.label, f, c);
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
    buckets: block.operating_expenses_by_bucket.map((b) => ({
      bucket: b.bucket,
      label: bucketLabel(b.bucket, b.label),
      amount: formatAmount(b.amount, c)
    })),
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

/**
 * A category's or row's name: bank categories are buckets, so they read by the Finance bucket
 * map; QuickBooks and Allyvia categories are account or catalogue names and keep their own.
 */
const categoryName = (source: string, bucket: string, label: string): string => (source === 'bank' ? bucketLabel(bucket, label) : label);

export function expensesView(e: FinanceExpenses, ctx?: Omit<ViewContext, 'source'>) {
  const c = e.currency;
  const unavailable = e.status === 'unavailable' ? e.reason || NOT_AVAILABLE : null;
  return {
    basis: e.basis && FROM[e.expense_source] ? `${BASIS[e.basis]}, ${FROM[e.expense_source]}` : null,
    unavailable,
    fixHref: bankFixHref({ value: null, status: e.status, reason: e.reason }, { source: e.expense_source, locationId: ctx?.locationId }),
    badge:
      e.status === 'estimated' || e.status === 'partial'
        ? figureBadge({ value: '', status: e.status, reason: e.reason })
        : { label: null, tooltip: '' },
    categories: e.categories.map((r) => ({
      bucket: r.bucket,
      /** What the category filter sends: the API's own label. */
      value: r.label,
      label: categoryName(e.expense_source, r.bucket, r.label),
      amount: formatAmount(r.amount, c)
    })),
    rows: e.results.map((r) => ({
      id: r.id,
      date: shortDay(r.date),
      payee: r.payee,
      category: categoryName(r.source, r.bucket, r.category),
      amount: formatAmount(r.amount, c)
    }))
  };
}

// --------------------------- Cash and position -------------------------- //

type CashCurrency = FinanceCash['currencies'][number];

const accountRows = (block: CashCurrency): AmountLine[] =>
  block.cash.accounts.map((a) => ({ label: a.mask ? `${a.name} ••${a.mask}` : a.name, amount: formatAmount(a.balance, block.currency) }));

export function cashView(block: CashCurrency, ctx?: ViewContext) {
  const card = cashCard(block.cash, block.currency, ctx);
  return { figures: card.rows, note: card.note, accounts: accountRows(block) };
}

export function positionView(block: CashCurrency, ctx?: ViewContext) {
  const c = block.currency;
  const p = block.position;
  const missing = p.items_missing_cost;
  return {
    figures: [bankView('Cash', p.cash, c, ctx), view('Inventory at cost', p.inventory_at_cost, c), view('Unpaid bills', p.unpaid_bills, c)],
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
  ...(['labour', 'opex', 'technology', 'marketing', 'inventory', 'capex', 'unreviewed'] as const).map((bucket) => ({
    bucket,
    label: BUCKET_LABELS[bucket]
  }))
];

const BUCKETS = new Set(EXPENSE_FILTERS.map((f) => f.bucket).filter(Boolean));
/** `?bucket=` when it names a bucket the endpoint accepts (`needs_review` is a synonym), else none. */
export function bucketFromParams(params: URLSearchParams): ExpenseBucket | null {
  const raw = params.get('bucket');
  if (raw === 'needs_review') return 'unreviewed';
  return raw && BUCKETS.has(raw as ExpenseBucket) ? (raw as ExpenseBucket) : null;
}

// ------------------------ QuickBooks payments recorded ------------------------ //

export const QUICKBOOKS_PAYMENTS_TITLE = 'QuickBooks payments recorded';
export const QUICKBOOKS_PAYMENTS_LINE =
  'Invoice payments received and bills paid, as recorded in QuickBooks. Register sales are not included.';

/**
 * The old cash flow statement's figures as plain rows. Its investing and financing lines are
 * left out: the endpoint always sends 0 for them, which would read as a figure. Each amount is
 * the endpoint's own number, formatted; a missing one reads "Not available", never $0.00.
 */
export function quickBooksPaymentsRows(cf: CashFlowData | null): AmountLine[] | null {
  const flow = cf?.cash_flow;
  if (!flow) return null;
  const currency = cf.currency || 'USD';
  const amount = (n: number | null | undefined) => (typeof n === 'number' ? formatOrderAmount(n, currency) : NOT_AVAILABLE);
  return [
    { label: 'Invoice payments received', amount: amount(flow.operating_activities?.cash_in?.customer_payments) },
    { label: 'Bills paid', amount: amount(flow.operating_activities?.cash_out?.vendor_payments) },
    { label: 'Other purchases paid', amount: amount(flow.operating_activities?.cash_out?.operating_expenses) },
    { label: 'Received less paid', amount: amount(flow.summary?.net_cash_flow) }
  ];
}

/** The Cash page's link to the bank rows, for bank owners on the whole business. */
export const reviewBankHref = (source: string | undefined, range: Range, locationId?: string | null): string | null =>
  source === 'bank' && !locationId ? withRange('/finance/expenses', range) : null;
