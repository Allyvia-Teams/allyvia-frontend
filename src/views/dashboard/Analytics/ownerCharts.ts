// ==============================|| DASHBOARD - OWNER CHARTS (pure) ||============================== //
// The four questions a boutique owner asks of the dashboard every week, built
// from POS data only (no bank, no QuickBooks), so they work for any store whose
// sales reach Allyvia:
//   1. Am I up or down on last year?      -> salesVsLastYear
//   2. What is actually selling?          -> bestSellers (styles, not size/colour variants)
//   3. Which days carry the week?         -> busiestDays
//   4. Am I staffed to my sales?          -> salesPerLaborHour
// Everything here is a pure function over API payloads so it can be unit
// tested without a DOM; AnalyticsSection only fetches and renders.

export interface DailyPoint {
  date: string; // YYYY-MM-DD (store-local business day)
  amount: string | number;
}

export interface TopItemRow {
  name: string;
  qty: number;
  amount: string | number;
}

export interface LaborDay {
  date: string;
  employees: { hours: string | number }[];
}

export interface OwnerChart {
  key: 'sales' | 'bestSellers' | 'busiestDays' | 'laborProductivity';
  name: string;
  headline: string;
  description: string;
  type: 'line' | 'bar';
  horizontal?: boolean;
  format: 'money' | 'moneyPerHour';
  xAxis: string[];
  series: { name: string; data: number[]; dashed?: boolean }[];
}

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** Above this many days a daily line is unreadable; bucket by week instead. */
export const WEEKLY_THRESHOLD_DAYS = 62;

const num = (v: string | number | null | undefined): number => {
  const n = typeof v === 'number' ? v : parseFloat(v ?? '');
  return Number.isFinite(n) ? n : 0;
};

const parseIso = (iso: string): number => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const toIso = (t: number): string => new Date(t).toISOString().slice(0, 10);
const shortLabel = (t: number): string => {
  const d = new Date(t);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};

export const money = (v: number): string => `$${Math.round(v).toLocaleString('en-US')}`;

/** Every day in [start, end] inclusive, as UTC-midnight timestamps. */
export function daysIn(start: string, end: string): number[] {
  const out: number[] = [];
  for (let t = parseIso(start); t <= parseIso(end); t += DAY_MS) out.push(t);
  return out;
}

/** The comparison window: same length, shifted back 364 days so weekdays line up. */
export function lastYearWindow(start: string, end: string): { start: string; end: string } {
  return { start: toIso(parseIso(start) - 364 * DAY_MS), end: toIso(parseIso(end) - 364 * DAY_MS) };
}

const byDate = (points: DailyPoint[] | null | undefined): Map<string, number> => {
  const m = new Map<string, number>();
  (points ?? []).forEach((p) => m.set(p.date, (m.get(p.date) ?? 0) + num(p.amount)));
  return m;
};

/** Daily values for the window, or weekly sums (weeks start on the window's first day). */
function bucket(days: number[], valueOf: (t: number) => number): { labels: string[]; values: number[] } {
  if (days.length <= WEEKLY_THRESHOLD_DAYS) {
    return { labels: days.map(shortLabel), values: days.map(valueOf) };
  }
  const labels: string[] = [];
  const values: number[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const week = days.slice(i, i + 7);
    labels.push(`Wk of ${shortLabel(week[0])}`);
    values.push(week.reduce((a, t) => a + valueOf(t), 0));
  }
  return { labels, values };
}

export function salesVsLastYear(
  current: DailyPoint[] | null | undefined,
  lastYear: DailyPoint[] | null | undefined,
  start: string,
  end: string
): OwnerChart | null {
  const cur = byDate(current);
  const prev = byDate(lastYear);
  const days = daysIn(start, end);
  if (!days.length) return null;
  const total = days.reduce((a, t) => a + (cur.get(toIso(t)) ?? 0), 0);
  const prevTotal = days.reduce((a, t) => a + (prev.get(toIso(t - 364 * DAY_MS)) ?? 0), 0);
  if (total === 0 && prevTotal === 0) return null;
  const now = bucket(days, (t) => cur.get(toIso(t)) ?? 0);
  const ly = bucket(days, (t) => prev.get(toIso(t - 364 * DAY_MS)) ?? 0);
  const n = days.length;
  let description: string;
  if (prevTotal > 0) {
    const pct = ((total - prevTotal) / prevTotal) * 100;
    const dir = pct >= 0 ? 'up' : 'down';
    description = `${dir} ${Math.abs(pct).toFixed(1)}% on the same ${n} days last year (${money(prevTotal)})`;
  } else {
    description = `No sales recorded for the same ${n} days last year`;
  }
  return {
    key: 'sales',
    name: 'Sales vs last year',
    headline: money(total),
    description,
    type: 'line',
    format: 'money',
    xAxis: now.labels,
    series: [
      { name: 'This period', data: now.values.map((v) => Math.round(v * 100) / 100) },
      ...(prevTotal > 0 ? [{ name: 'Last year', data: ly.values.map((v) => Math.round(v * 100) / 100), dashed: true }] : [])
    ]
  };
}

/** Variants ("Wild Jacket / Black / M") roll up to their style ("Wild Jacket"). */
export const styleOf = (name: string): string => (name || 'Unnamed item').split(' / ')[0].trim() || 'Unnamed item';

export function bestSellers(items: TopItemRow[] | null | undefined, totalSales: number, limit = 8): OwnerChart | null {
  const styles = new Map<string, { amount: number; qty: number }>();
  (items ?? []).forEach((i) => {
    const key = styleOf(i.name);
    const s = styles.get(key) ?? { amount: 0, qty: 0 };
    s.amount += num(i.amount);
    s.qty += num(i.qty);
    styles.set(key, s);
  });
  const ranked = [...styles.entries()].filter(([, s]) => s.amount > 0).sort((a, b) => b[1].amount - a[1].amount);
  if (!ranked.length) return null;
  const top = ranked.slice(0, limit);
  const topSum = top.reduce((a, [, s]) => a + s.amount, 0);
  const share = totalSales > 0 ? Math.round((topSum / totalSales) * 100) : null;
  const [leader, lead] = top[0];
  return {
    key: 'bestSellers',
    name: 'Best sellers',
    headline: leader,
    description: `${money(lead.amount)} from ${lead.qty} sold · top ${top.length} styles${share !== null ? ` are ${share}% of sales` : ''}`,
    type: 'bar',
    horizontal: true,
    format: 'money',
    xAxis: top.map(([name]) => name),
    series: [{ name: 'Revenue', data: top.map(([, s]) => Math.round(s.amount * 100) / 100) }]
  };
}

export function busiestDays(current: DailyPoint[] | null | undefined, start: string, end: string): OwnerChart | null {
  const cur = byDate(current);
  const days = daysIn(start, end);
  const sum = Array(7).fill(0);
  const count = Array(7).fill(0);
  days.forEach((t) => {
    const wd = new Date(t).getUTCDay();
    sum[wd] += cur.get(toIso(t)) ?? 0;
    count[wd] += 1;
  });
  const order = [1, 2, 3, 4, 5, 6, 0]; // Monday first, the way a shop plans its week
  const avg = order.map((wd) => (count[wd] ? sum[wd] / count[wd] : 0));
  const total = avg.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const best = avg.indexOf(Math.max(...avg));
  const open = avg.filter((v) => v > 0);
  const slowest = avg.indexOf(Math.min(...open));
  const ratio = avg[slowest] > 0 ? avg[best] / avg[slowest] : null;
  const share = Math.round((avg[best] / total) * 100);
  return {
    key: 'busiestDays',
    name: 'Busiest days',
    headline: `${WEEKDAYS[order[best]]}s`,
    description: `average ${money(avg[best])} · ${share}% of a typical week${
      ratio !== null && best !== slowest ? ` · ${ratio.toFixed(1)}× a ${WEEKDAYS[order[slowest]]}` : ''
    }`,
    type: 'bar',
    format: 'money',
    xAxis: order.map((wd) => WEEKDAYS[wd].slice(0, 3)),
    series: [{ name: 'Average sales', data: avg.map((v) => Math.round(v * 100) / 100) }]
  };
}

export function salesPerLaborHour(
  current: DailyPoint[] | null | undefined,
  labor: LaborDay[] | null | undefined,
  start: string,
  end: string
): OwnerChart | null {
  const cur = byDate(current);
  const hours = new Map<string, number>();
  (labor ?? []).forEach((d) => hours.set(d.date, (hours.get(d.date) ?? 0) + d.employees.reduce((a, e) => a + num(e.hours), 0)));
  const days = daysIn(start, end).filter((t) => (hours.get(toIso(t)) ?? 0) > 0);
  if (!days.length) return null;
  const totalHours = days.reduce((a, t) => a + (hours.get(toIso(t)) ?? 0), 0);
  const staffedSales = days.reduce((a, t) => a + (cur.get(toIso(t)) ?? 0), 0);
  if (staffedSales === 0) return null;
  const perHour = staffedSales / totalHours;
  let labels: string[];
  let values: number[];
  if (days.length <= WEEKLY_THRESHOLD_DAYS) {
    labels = days.map(shortLabel);
    values = days.map((t) => (cur.get(toIso(t)) ?? 0) / (hours.get(toIso(t)) ?? 1));
  } else {
    labels = [];
    values = [];
    for (let i = 0; i < days.length; i += 7) {
      const wk = days.slice(i, i + 7);
      const h = wk.reduce((a, t) => a + (hours.get(toIso(t)) ?? 0), 0);
      const s = wk.reduce((a, t) => a + (cur.get(toIso(t)) ?? 0), 0);
      labels.push(`Wk of ${shortLabel(wk[0])}`);
      values.push(h ? s / h : 0);
    }
  }
  const bestIdx = values.indexOf(Math.max(...values));
  return {
    key: 'laborProductivity',
    name: 'Sales per labor hour',
    headline: `${money(perHour)}/hr`,
    description: `${Math.round(totalHours).toLocaleString('en-US')} staff hours across ${days.length} staffed days · best ${labels[bestIdx]} at ${money(values[bestIdx])}/hr`,
    type: 'bar',
    format: 'moneyPerHour',
    xAxis: labels,
    series: [{ name: 'Sales per labor hour', data: values.map((v) => Math.round(v * 100) / 100) }]
  };
}

export function buildOwnerCharts(input: {
  start: string;
  end: string;
  current: DailyPoint[] | null | undefined;
  lastYear: DailyPoint[] | null | undefined;
  topItems: TopItemRow[] | null | undefined;
  labor: LaborDay[] | null | undefined;
}): OwnerChart[] {
  const total = [...byDate(input.current).values()].reduce((a, b) => a + b, 0);
  return [
    salesVsLastYear(input.current, input.lastYear, input.start, input.end),
    bestSellers(input.topItems, total),
    busiestDays(input.current, input.start, input.end),
    salesPerLaborHour(input.current, input.labor, input.start, input.end)
  ].filter((c): c is OwnerChart => c !== null);
}
