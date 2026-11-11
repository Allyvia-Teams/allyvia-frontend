// Pure view-model for the Analytics page (the 2026-11 redesign).
//
// One page, most important first: four money figures, the money chart, where
// money went and what sold, then stock, team and customers. Each panel picks
// its view from one dropdown; there is no layout to drag or save. Everything
// that decides a number or a sentence lives here so it can be tested without
// rendering (vitest runs in node).

import { isModuleGranted } from 'routes/guards/moduleAccess';
import { employeePermissions } from 'utils/employeePermissions';
import type { ModulePermissions } from 'types/settings';

export type ExpenseBasis = 'accounting' | 'bank' | 'own_records';
export type Grouping = 'day' | 'week' | 'month';
export type DeltaDirection = 'up' | 'down' | 'neutral';

const DAY_MS = 86_400_000;

/** Parse a number the API sends as a number or a decimal string. Unknown stays null. */
export function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string' ? Number.parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : null;
}

// --------------------------------------------------------------------------
// Date windows (ISO YYYY-MM-DD, computed in UTC so no timezone can shift a day)
// --------------------------------------------------------------------------

function isoToUtc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcToIso(ms: number): string {
  const dt = new Date(ms);
  const y = String(dt.getUTCFullYear()).padStart(4, '0');
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  return utcToIso(isoToUtc(iso) + days * DAY_MS);
}

/** The window of the same length that ends the day before ``start``. */
export function previousWindow(start: string, end: string): { start: string; end: string } {
  const length = Math.round((isoToUtc(end) - isoToUtc(start)) / DAY_MS) + 1;
  return { start: addDays(start, -length), end: addDays(start, -1) };
}

/** The same weekdays a year earlier (364 days back, so Saturdays line up). */
export function lastYearWindow(start: string, end: string): { start: string; end: string } {
  return { start: addDays(start, -364), end: addDays(end, -364) };
}

// --------------------------------------------------------------------------
// Money and change
// --------------------------------------------------------------------------

export function formatMoney(value: number | null, currency = 'USD'): string {
  if (value === null) return '—';
  let code = /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(value);
  } catch {
    code = 'USD';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(value);
  }
}

/**
 * "+8%" against the previous window, or null when there is nothing honest to
 * compare: an unknown side, or a previous figure of zero (no percentage of
 * nothing). Rounded to whole percent; a change under 0.5% reads "0%".
 */
export function percentChange(current: number | null, previous: number | null): string | null {
  if (current === null || previous === null || previous === 0) return null;
  const pct = Math.round(((current - previous) / Math.abs(previous)) * 100);
  if (pct === 0) return '0%';
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

/**
 * Whether a change is good news. More sales and more left over are good; more
 * money out is not bad by itself (a shop buying stock for a season), so it is
 * never coloured.
 */
export function changeDirection(change: string | null, goodWhenUp: boolean | null): DeltaDirection {
  if (!change || change === '0%' || goodWhenUp === null) return 'neutral';
  const up = change.startsWith('+');
  return up === goodWhenUp ? 'up' : 'down';
}

// --------------------------------------------------------------------------
// The four money figures
// --------------------------------------------------------------------------

export interface KpiSource {
  kpis?: {
    revenue?: unknown;
    expenses?: unknown;
    net_income?: unknown;
    cash_balance?: unknown;
    cash_balance_estimated?: boolean;
  };
  summary?: { payments_count?: unknown; avg_ticket?: unknown; currency?: string };
  expense_basis?: ExpenseBasis;
  bank_activity?: { accounts?: Array<{ name?: string; mask?: string; type?: string }> };
  currency?: string;
}

export interface KpiCard {
  key: 'sales' | 'out' | 'left' | 'cash';
  label: string;
  value: string;
  change: string | null;
  direction: DeltaDirection;
  basis: string;
}

/** Where the Money out figure came from, in one short clause. */
export function moneyOutBasis(source: KpiSource | null | undefined): string {
  switch (source?.expense_basis) {
    case 'bank': {
      const account = source.bank_activity?.accounts?.find((a) => a.type === 'depository') ?? source.bank_activity?.accounts?.[0];
      return account?.mask ? `From your bank · ${account.name ?? 'account'} ${account.mask}` : 'From your bank';
    }
    case 'accounting':
      return 'From QuickBooks';
    case 'own_records':
      return 'Recorded expenses';
    default:
      return 'Expenses for the period';
  }
}

/** The page's closing line: which source each half of the money picture uses. */
export function sourceSentence(basis: ExpenseBasis | undefined): string {
  switch (basis) {
    case 'bank':
      return 'Money out comes from your bank, because QuickBooks is not connected. Sales never include bank deposits.';
    case 'accounting':
      return 'Money out comes from QuickBooks.';
    case 'own_records':
      return 'Money out is the expenses recorded in Allyvia. Connect QuickBooks or your bank to see all of it.';
    default:
      return '';
  }
}

export function kpiCards(current: KpiSource | null | undefined, previous: KpiSource | null | undefined): KpiCard[] {
  const currency = current?.summary?.currency || current?.currency || 'USD';
  const sales = toNumber(current?.kpis?.revenue);
  const out = toNumber(current?.kpis?.expenses);
  const left = toNumber(current?.kpis?.net_income);
  const cash = toNumber(current?.kpis?.cash_balance);
  const count = toNumber(current?.summary?.payments_count);
  const avg = toNumber(current?.summary?.avg_ticket);

  const salesChange = percentChange(sales, toNumber(previous?.kpis?.revenue));
  const outChange = percentChange(out, toNumber(previous?.kpis?.expenses));
  // Left over can cross zero, where a percentage stops meaning anything.
  const prevLeft = toNumber(previous?.kpis?.net_income);
  const leftChange = left !== null && prevLeft !== null && left > 0 && prevLeft > 0 ? percentChange(left, prevLeft) : null;

  const salesBasis =
    count !== null && count > 0
      ? `${count.toLocaleString('en-US')} ${count === 1 ? 'sale' : 'sales'}${avg !== null ? ` · average ${formatMoney(avg, currency)}` : ''}`
      : sales !== null && sales > 0
        ? 'Sales for the period'
        : 'No sales in this period';

  return [
    {
      key: 'sales',
      label: 'Sales',
      value: formatMoney(sales, currency),
      change: salesChange,
      direction: changeDirection(salesChange, true),
      basis: salesBasis
    },
    {
      key: 'out',
      label: 'Money out',
      value: formatMoney(out, currency),
      change: outChange,
      direction: changeDirection(outChange, null),
      basis: moneyOutBasis(current)
    },
    {
      key: 'left',
      label: 'Left over',
      value: formatMoney(left, currency),
      change: leftChange,
      direction: changeDirection(leftChange, true),
      basis: left === null ? 'Needs both sales and money out' : 'Sales minus money out'
    },
    {
      key: 'cash',
      label: 'Cash on hand',
      value: formatMoney(cash, currency),
      change: null,
      direction: 'neutral',
      basis: cash === null ? 'Not available' : current?.kpis?.cash_balance_estimated ? 'Estimated from POS takings' : 'Bank balance today'
    }
  ];
}

// --------------------------------------------------------------------------
// Series
// --------------------------------------------------------------------------

export interface Point {
  date: string;
  amount: number;
}

/** Normalise any `{date, amount|total_amount}` list into numeric points. */
export function toPoints(raw: unknown): Point[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p: any) => ({ date: String(p?.date ?? '').slice(0, 10), amount: toNumber(p?.amount ?? p?.total_amount) ?? 0 }))
    .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date));
}

function weekStart(iso: string): string {
  const dow = new Date(isoToUtc(iso)).getUTCDay(); // 0 = Sunday
  return addDays(iso, -((dow + 6) % 7)); // Monday
}

/** Sum points into day, week (Monday) or month buckets, oldest first. */
export function groupPoints(points: Point[], by: Grouping): Point[] {
  const buckets = new Map<string, number>();
  for (const p of points) {
    const key = by === 'day' ? p.date : by === 'week' ? weekStart(p.date) : `${p.date.slice(0, 7)}-01`;
    buckets.set(key, (buckets.get(key) ?? 0) + p.amount);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, amount]) => ({ date, amount }));
}

/** Every day in [start, end] with its amount, missing days as 0, so two series line up. */
export function fillDays(points: Point[], start: string, end: string): Point[] {
  const byDay = new Map<string, number>();
  for (const p of points) byDay.set(p.date, (byDay.get(p.date) ?? 0) + p.amount);
  const out: Point[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push({ date: d, amount: byDay.get(d) ?? 0 });
  return out;
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Average sales per weekday over the window (each weekday divided by how often it occurred). */
export function weekdayAverages(points: Point[], start: string, end: string): Array<{ day: string; amount: number }> {
  const totals = Array(7).fill(0);
  const counts = Array(7).fill(0);
  for (const p of fillDays(points, start, end)) {
    const i = (new Date(isoToUtc(p.date)).getUTCDay() + 6) % 7;
    totals[i] += p.amount;
    counts[i] += 1;
  }
  return WEEKDAYS.map((day, i) => ({ day, amount: counts[i] ? totals[i] / counts[i] : 0 }));
}

/** Shift a last-year series forward 364 days so it sits on this year's dates. */
export function shiftForward(points: Point[], days = 364): Point[] {
  return points.map((p) => ({ date: addDays(p.date, days), amount: p.amount }));
}

// --------------------------------------------------------------------------
// Ranked rows (category bars)
// --------------------------------------------------------------------------

export interface RankedRow {
  label: string;
  detail?: string;
  amount: number;
  /** Bar width 0-100 relative to the largest row. */
  share: number;
}

export function rankRows(rows: Array<{ label: string; detail?: string; amount: number }>, limit = 8): RankedRow[] {
  const kept = rows.filter((r) => r.amount > 0).sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));
  const top = kept.slice(0, limit);
  const rest = kept.slice(limit).reduce((s, r) => s + r.amount, 0);
  if (rest > 0) top.push({ label: 'Everything else', amount: rest });
  const max = top.reduce((m, r) => Math.max(m, r.amount), 0);
  return top.map((r) => ({ ...r, share: max ? Math.round((r.amount / max) * 100) : 0 }));
}

/** `/expense/breakdown/` is `[{category, amount}]` (older code read `.by_category`; accept both). */
export function expenseCategoryRows(raw: unknown): RankedRow[] {
  const list: any[] = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.by_category) ? (raw as any).by_category : [];
  return rankRows(
    list.map((r) => ({ label: String(r?.category ?? r?.category_name ?? 'Uncategorized'), amount: toNumber(r?.amount ?? r?.total) ?? 0 }))
  );
}

/** Money out per month, newest last, for the "By month" view. */
export function expenseMonthRows(points: Point[]): RankedRow[] {
  const months = groupPoints(points, 'month').filter((p) => p.amount > 0);
  const max = months.reduce((m, p) => Math.max(m, p.amount), 0);
  return months.map((p) => ({
    label: new Date(isoToUtc(p.date)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    amount: p.amount,
    share: max ? Math.round((p.amount / max) * 100) : 0
  }));
}

export function bestSellerRows(raw: unknown): RankedRow[] {
  const list: any[] = Array.isArray(raw) ? raw : [];
  return rankRows(
    list.map((r) => {
      const qty = toNumber(r?.qty) ?? 0;
      return {
        label: String(r?.name ?? r?.sku ?? 'Item'),
        detail: `${qty.toLocaleString('en-US')} sold`,
        amount: toNumber(r?.amount) ?? 0
      };
    }),
    8
  ).filter((r) => r.label !== 'Everything else');
}

const TENDER_LABELS: Record<string, string> = {
  pos_card: 'Card',
  pos_cash: 'Cash',
  pos_split: 'Split payment',
  card: 'Card',
  cash: 'Cash'
};

export function tenderRows(raw: unknown): RankedRow[] {
  const list: any[] = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.payment_methods) ? (raw as any).payment_methods : [];
  const merged = new Map<string, { amount: number; count: number }>();
  for (const r of list) {
    const key = String(r?.provider ?? 'Other');
    const label =
      TENDER_LABELS[key.toLowerCase()] ??
      key
        .replace(/^pos_/i, '')
        .replace(/_/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase());
    const cur = merged.get(label) ?? { amount: 0, count: 0 };
    cur.amount += toNumber(r?.amount) ?? 0;
    cur.count += toNumber(r?.count) ?? 0;
    merged.set(label, cur);
  }
  return rankRows(
    Array.from(merged.entries()).map(([label, v]) => ({
      label,
      detail: `${v.count.toLocaleString('en-US')} ${v.count === 1 ? 'payment' : 'payments'}`,
      amount: v.amount
    }))
  );
}

// --------------------------------------------------------------------------
// Which sections a role sees (the old widget picker's rule, per section)
// --------------------------------------------------------------------------

export type SectionModule = 'finance' | 'inventory' | 'employees' | 'crm';

export function canSeeSection(module: SectionModule, roleType: string | undefined, permissions: ModulePermissions | undefined): boolean {
  if ((roleType || '').toLowerCase() !== 'member') return true;
  if (module === 'employees') return employeePermissions(roleType, permissions).roster;
  return isModuleGranted(module, permissions);
}

// --------------------------------------------------------------------------
// Download: exactly what the page shows, as CSV
// --------------------------------------------------------------------------

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function analyticsCsv(input: {
  start: string;
  end: string;
  cards: KpiCard[];
  sales: Point[];
  moneyOut: Point[];
  spend: RankedRow[];
  sold: RankedRow[];
}): string {
  const lines: string[] = [];
  const row = (...cells: Array<string | number>) => lines.push(cells.map(csvCell).join(','));
  row('Analytics', `${input.start} to ${input.end}`);
  lines.push('');
  row('Figure', 'Value', 'Change vs previous period', 'Basis');
  for (const c of input.cards) row(c.label, c.value, c.change ?? '', c.basis);
  lines.push('');
  row('Date', 'Sales', 'Money out');
  const out = new Map(input.moneyOut.map((p) => [p.date, p.amount]));
  for (const p of input.sales) row(p.date, p.amount.toFixed(2), (out.get(p.date) ?? 0).toFixed(2));
  lines.push('');
  row('Where money went', 'Amount');
  for (const r of input.spend) row(r.label, r.amount.toFixed(2));
  lines.push('');
  row('What sold', 'Detail', 'Amount');
  for (const r of input.sold) row(r.label, r.detail ?? '', r.amount.toFixed(2));
  return lines.join('\n');
}
