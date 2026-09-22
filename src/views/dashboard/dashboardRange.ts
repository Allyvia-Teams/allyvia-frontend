import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date';

// project imports
import { toISO } from 'views/analytics/analyticsDateRange';

// The Dashboard's date window. Same rules as the Analytics tab: calendar dates
// in the viewer's own zone, never round-tripped through Date/UTC (ALL-140 H3).

export type DashboardWindow = { start: CalendarDate; end: CalendarDate };

/** Last 30 days inclusive of today. `now` is injectable for tests. */
export function defaultDashboardWindow(now: CalendarDate = today(getLocalTimeZone())): DashboardWindow {
  return { start: now.subtract({ days: 29 }), end: now };
}

export interface IsoWindow {
  startDate: string;
  endDate: string;
}

/** YYYY-MM-DD pair every ranged endpoint takes; falls back to the default window when a half is missing. */
export function isoWindow(
  range:
    | { start?: { year: number; month: number; day: number } | null; end?: { year: number; month: number; day: number } | null }
    | null
    | undefined
): IsoWindow {
  const fallback = defaultDashboardWindow();
  return {
    startDate: toISO(range?.start) ?? toISO(fallback.start)!,
    endDate: toISO(range?.end) ?? toISO(fallback.end)!
  };
}
