import { parseDate } from '@internationalized/date';
import type { CurrencyBlock, Figure, FinanceSales, FinanceSnapshot, Period } from 'api/financeSnapshot';
import { formatAmount, formatSyncedAt } from './snapshotFormat';

// Pure view functions for the Finance & accounting snapshot (docs/finance-tab-plan.md, Task 7).
// Every figure is shown exactly as the API sent it. Nothing here adds, subtracts, sums or
// divides money: amounts stay 2dp strings until snapshotFormat turns them into display text.

/** The old tabbed page (QuickBooks) and bank page, kept reachable until session 9 moves them. */
export const CLASSIC_HREF = '/finance/classic';

export type TileKey = 'net_sales' | 'gross_profit' | 'expenses' | 'net_profit' | 'cash';

/**
 * Where each link goes once the detail pages exist (Task 8). Until then every one of them
 * opens CLASSIC_HREF; the next session swaps `detailHref` to read this map.
 */
export const NEXT_SESSION_HREFS = {
  net_sales: '/finance/sales',
  gross_profit: '/finance/profit',
  expenses: '/finance/expenses',
  net_profit: '/finance/profit',
  cash: '/finance/cash',
  sales_card: '/finance/sales',
  expenses_card: '/finance/expenses',
  cash_card: '/finance/cash',
  position: '/finance/position',
  unreviewed: '/finance/expenses?bucket=unreviewed',
  invoices: '/finance/quickbooks',
  balance_sheet: '/finance/quickbooks'
} as const;
export type LinkKey = keyof typeof NEXT_SESSION_HREFS;

export interface Range {
  start: string;
  end: string;
}

/** The link for `key` this session: the classic page, carrying the range so a later swap keeps it. */
export const detailHref = (_key: LinkKey, range?: Range): string =>
  range ? `${CLASSIC_HREF}?start=${range.start}&end=${range.end}` : CLASSIC_HREF;

// ------------------------------- Figures ------------------------------- //

export const NOT_AVAILABLE = 'Not available';

export function figureText(f: Figure, currency: string): string {
  return f.status === 'unavailable' || f.value === null ? NOT_AVAILABLE : formatAmount(f.value, currency);
}

export function figureBadge(f: Figure): { label: 'Estimated' | 'Partial' | null; tooltip: string } {
  if (f.value !== null && f.status === 'estimated') return { label: 'Estimated', tooltip: f.reason };
  if (f.value !== null && f.status === 'partial') return { label: 'Partial', tooltip: f.reason };
  return { label: null, tooltip: '' };
}

/** The reason under an unavailable figure; null otherwise (a badge carries the others). */
export const unavailableReason = (f: Figure): string | null => (f.status === 'unavailable' || f.value === null ? f.reason || null : null);

/** One displayed figure: its text, badge and the reason to show beneath when there is no value. */
export interface FigureView {
  label: string;
  figure: Figure;
  text: string;
  badge: ReturnType<typeof figureBadge>;
  secondary: string | null;
}

const view = (label: string, f: Figure, currency: string): FigureView => ({
  label,
  figure: f,
  text: figureText(f, currency),
  badge: figureBadge(f),
  secondary: unavailableReason(f)
});

// -------------------------------- Tiles -------------------------------- //

export interface Tile extends FigureView {
  key: TileKey;
  title: string;
  href: string;
}

const marginText = (block: CurrencyBlock): string | null => {
  const m = block.gross_margin_pct;
  if (m.status === 'unavailable') return null;
  return m.value === null ? 'No margin without sales' : `${m.value}% margin`;
};

/** The five tiles in their fixed order. */
export function tiles(block: CurrencyBlock, range?: Range): Tile[] {
  const c = block.currency;
  const tile = (key: TileKey, title: string, f: Figure, secondary?: string | null): Tile => {
    const v = view(title, f, c);
    return { ...v, key, title, href: detailHref(key, range), secondary: v.secondary ?? secondary ?? null };
  };
  return [
    tile('net_sales', 'Net sales', block.net_sales),
    tile('gross_profit', 'Gross profit', block.gross_profit, block.gross_profit.value !== null ? marginText(block) : null),
    tile('expenses', 'Expenses', block.operating_expenses),
    tile('net_profit', 'Net profit', block.net_profit),
    tile('cash', 'Cash', block.cash.balance)
  ];
}

/** True when the API reports spending not yet categorised. Read from the string, never computed. */
export function hasUnreviewed(block: CurrencyBlock): boolean {
  const v = block.unreviewed_outflow.value;
  return v !== null && block.unreviewed_outflow.status !== 'unavailable' && !v.startsWith('-') && /[1-9]/.test(v);
}

export function unreviewedLine(block: CurrencyBlock, range: Range): { text: string; href: string; nextHref: string } | null {
  if (!hasUnreviewed(block)) return null;
  return {
    text: `${formatAmount(block.unreviewed_outflow.value as string, block.currency)} not yet categorized`,
    href: detailHref('unreviewed', range),
    nextHref: NEXT_SESSION_HREFS.unreviewed
  };
}

// ------------------------------- Header -------------------------------- //

const SOURCE_NAMES: Record<string, string> = { quickbooks: 'from QuickBooks', xero: 'from Xero', bank: 'from your bank' };

/** "Expenses: billed, from QuickBooks" / "Expenses: paid, from your bank"; null when there is no basis. */
export function basisLine(s: FinanceSnapshot): string | null {
  const from = SOURCE_NAMES[s.expense_source];
  return s.expense_basis && from ? `Expenses: ${s.expense_basis}, ${from}` : null;
}

export const lastSyncedText = (s: FinanceSnapshot): string =>
  s.last_synced_at ? `Last synced ${formatSyncedAt(s.last_synced_at)}` : 'Not synced yet';

export const isConflict = (s: FinanceSnapshot): boolean => s.expense_source === 'accounting_conflict';
export const isBankOwner = (s: FinanceSnapshot): boolean => s.expense_source === 'bank';

/** One block per currency, labelled only when there is more than one. */
export function snapshotBlocks(s: FinanceSnapshot): { heading: string | null; block: CurrencyBlock }[] {
  return s.currencies.map((block) => ({ heading: s.currencies.length > 1 ? block.currency : null, block }));
}

// -------------------------------- Cards -------------------------------- //

export interface AmountLine {
  label: string;
  amount: string;
}

export const channelRows = (block: CurrencyBlock): AmountLine[] =>
  block.sales_by_channel.map((r) => ({ label: r.label, amount: formatAmount(r.amount, block.currency) }));

/** Operating buckets as the API lists them, or why there are none. */
export function expenseCard(block: CurrencyBlock): { unavailable: string | null; rows: AmountLine[] } {
  const f = block.operating_expenses;
  if (f.status === 'unavailable' || f.value === null) return { unavailable: f.reason || NOT_AVAILABLE, rows: [] };
  return {
    unavailable: null,
    rows: block.expenses_by_bucket.map((r) => ({ label: r.label, amount: formatAmount(r.amount, block.currency) }))
  };
}

export const cashRows = (block: CurrencyBlock): FigureView[] => [
  view('Money in', block.cash.money_in, block.currency),
  view('Money out', block.cash.money_out, block.currency),
  view('Balance', block.cash.balance, block.currency)
];

export const extrasRow = (block: CurrencyBlock): FigureView[] => [
  view('Inventory bought', block.inventory_bought, block.currency),
  view('Equipment', block.equipment, block.currency),
  view('Sales tax collected', block.sales_tax, block.currency)
];

export interface PositionLine extends FigureView {
  note: string | null;
}

/** "What you have and owe". Never a balance sheet. */
export function positionRows(block: CurrencyBlock): PositionLine[] {
  const p = block.position;
  const missing = p.items_missing_cost;
  return [
    { ...view('Cash', p.cash, block.currency), note: null },
    {
      ...view('Inventory at cost', p.inventory_at_cost, block.currency),
      note: missing ? `${missing} ${missing === 1 ? 'item has' : 'items have'} no cost` : null
    },
    { ...view('Unpaid bills', p.unpaid_bills, block.currency), note: null }
  ];
}

export function quickBooksLinks(s: FinanceSnapshot, range?: Range): { label: string; href: string }[] {
  if (s.expense_source !== 'quickbooks') return [];
  return [
    { label: 'Invoices', href: detailHref('invoices', range) },
    { label: 'Balance sheet', href: detailHref('balance_sheet', range) }
  ];
}

// -------------------------------- Chart -------------------------------- //

/**
 * Every day of the range with that day's net sales as the API sent it. `by_day` is sparse
 * (a day without a sale is absent), so an absent day is null here; the chart draws it at zero.
 */
export function chartPoints(block: FinanceSales['currencies'][number], period: Period): { date: string; amount: string | null }[] {
  const byDate = new Map(block.by_day.map((d) => [d.date, d.net_sales]));
  const out: { date: string; amount: string | null }[] = [];
  let day = parseDate(period.start);
  const last = parseDate(period.end);
  while (day.compare(last) <= 0) {
    const iso = day.toString();
    out.push({ date: iso, amount: byDate.get(iso) ?? null });
    day = day.add({ days: 1 });
  }
  return out;
}

/**
 * X-axis labels for a narrow chart: "Oct 1" on the first day and every `every`th day after,
 * blank otherwise, so a phone-width axis never overlaps. Dates only; no money here.
 */
export function sparseDayLabels(dates: string[], every = 7): string[] {
  return dates.map((iso, i) =>
    i % every === 0 ? parseDate(iso).toDate('UTC').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : ''
  );
}

// -------------------------------- Range -------------------------------- //

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const validDay = (s: string | null): s is string => {
  if (!s || !ISO.test(s)) return false;
  try {
    return parseDate(s).toString() === s;
  } catch {
    return false;
  }
};

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** `?start=YYYY-MM-DD&end=YYYY-MM-DD`, else this month to today in the viewer's calendar. */
export function rangeFromParams(params: URLSearchParams, today: { year: number; month: number; day: number }): Range {
  const start = params.get('start');
  const end = params.get('end');
  if (validDay(start) && validDay(end) && start <= end) return { start, end };
  const y = pad(today.year, 4);
  const m = pad(today.month);
  return { start: `${y}-${m}-01`, end: `${y}-${m}-${pad(today.day)}` };
}
