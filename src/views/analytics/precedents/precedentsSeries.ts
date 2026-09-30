// The precedents chart's pure seam (context-graph P3).
//
// One rule above the rest: AN UNOBSERVED DAY IS A GAP IN THE LINE, NEVER A
// ZERO. The backend sends `revenue: null` for a day no source covered (or the
// spine has not built); drawing it as 0 would tell the owner the shop took
// nothing that day. So a slot is a number only when the day is `observed` AND
// its revenue parses — anything else is null, and ApexCharts leaves a gap.
//
// The mock (Allyvia-Precedence-Charts.html) bridges its one missing June day
// with `spanGaps: true`; that is deliberately NOT copied.

import type { PrecedentsMonth } from 'api/precedents.api';

/** The green revenue line (the mock's --rev token), light and dark. */
export const REVENUE_LINE = { light: '#1a9e72', dark: '#2bbf8c' } as const;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const;

export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one (UTC, so no zone can move it).
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function dayOfMonth(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? Number(match[3]) : null;
}

/** One `(number | null)` per calendar day, placed by date. */
export function daySeries(month: PrecedentsMonth): (number | null)[] {
  const slots: (number | null)[] = Array.from({ length: daysInMonth(month.year, month.month) }, () => null);
  for (const day of month.days) {
    const d = dayOfMonth(day.date);
    if (d === null || d < 1 || d > slots.length) continue;
    if (!day.observed || day.revenue === null) continue;
    const value = Number(day.revenue);
    slots[d - 1] = Number.isFinite(value) ? value : null;
  }
  return slots;
}

export interface Gap {
  /** 1-based day of the month, inclusive. */
  from: number;
  to: number;
}

/** The runs of unobserved days, for the "no data" note under the chart. */
export function unobservedGaps(month: PrecedentsMonth): Gap[] {
  const series = daySeries(month);
  const gaps: Gap[] = [];
  let start: number | null = null;
  series.forEach((value, i) => {
    if (value === null && start === null) start = i + 1;
    if (value !== null && start !== null) {
      gaps.push({ from: start, to: i });
      start = null;
    }
  });
  if (start !== null) gaps.push({ from: start, to: series.length });
  return gaps;
}

/** Indices of observed days with a gap on both sides: a line draws nothing
 * for a lone point, so these get a marker instead. */
export function isolatedPoints(series: (number | null)[]): number[] {
  const out: number[] = [];
  series.forEach((value, i) => {
    if (value === null) return;
    const before = i === 0 ? null : series[i - 1];
    const after = i === series.length - 1 ? null : series[i + 1];
    if (before === null && after === null) out.push(i);
  });
  return out;
}

export function observedSummary(month: PrecedentsMonth): { observed: number; total: number; revenue: number } {
  const series = daySeries(month);
  const observed = series.filter((v): v is number => v !== null);
  return { observed: observed.length, total: series.length, revenue: observed.reduce((a, b) => a + b, 0) };
}

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function shiftMonth(year: number, month: number, by: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** "Days 3–4 and 6–29 have no data." — or null when every day was observed. */
export function gapSentence(gaps: Gap[]): string | null {
  if (!gaps.length) return null;
  const parts = gaps.map((g) => (g.from === g.to ? `${g.from}` : `${g.from}–${g.to}`));
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  const noun = gaps.length === 1 && gaps[0].from === gaps[0].to ? 'Day' : 'Days';
  return `${noun} ${list}: no sales source covered ${gaps.length === 1 && gaps[0].from === gaps[0].to ? 'it' : 'them'}, so the line breaks rather than reading zero.`;
}

/** The last COMPLETE month before `today` — a month still in progress would
 * read as a line that drops off a cliff at today. */
export function defaultMonth(today: Date): { year: number; month: number } {
  return shiftMonth(today.getFullYear(), today.getMonth() + 1, -1);
}

/** The most recent June (6) or December (12) that has started by `today` —
 * the design's two precedent months, one a shoulder month and one peak. */
export function latestOccurrence(month: number, today: Date): { year: number; month: number } {
  const year = today.getMonth() + 1 >= month ? today.getFullYear() : today.getFullYear() - 1;
  return { year, month };
}

/** Whole-currency formatter for axis and tooltip. A currency code Intl does
 * not know throws a RangeError inside render; this falls back to the number. */
export function moneyFormatter(currency: string): (value: number) => string {
  try {
    const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 });
    return (value: number) => fmt.format(value);
  } catch {
    return (value: number) => String(Math.round(value));
  }
}

export interface StoreLike {
  id: string;
  name: string;
  is_active: boolean;
  /** S1 Location.kind; absent on older payloads, which means a store. */
  kind?: string;
}

/** "All stores" (no header) first, then active physical stores by name. An
 * online or warehouse Location has no day facts of its own. */
export function storeOptions(locations: StoreLike[]): { value: string; label: string }[] {
  const stores = locations
    .filter((l) => l.is_active && (l.kind ?? 'store') === 'store')
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((l) => ({ value: l.id, label: l.name }));
  return [{ value: '', label: 'All stores' }, ...stores];
}
