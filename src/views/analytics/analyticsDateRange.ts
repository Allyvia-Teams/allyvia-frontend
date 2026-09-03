import { CalendarDate, getLocalTimeZone, startOfMonth, today } from '@internationalized/date';

// Date helpers for the Analytics tab's range picker.
//
// These deliberately never round-trip a JS Date through `toISOString()`. That
// call converts to UTC before the date is sliced off, so the answer depends on
// the viewer's timezone: in UTC+ zones a local "1st of the month" lands on the
// previous month's last day, and in US zones a local evening lands on
// tomorrow. Every metric on the tab is computed over this range, so the shift
// silently moved all of them (ALL-140 H3).

export type AnalyticsRange = { start: CalendarDate; end: CalendarDate };

// Month-to-date in the viewer's own calendar. `now` is injectable so tests can
// pin a date without touching the system clock.
export function defaultAnalyticsRange(now: CalendarDate = today(getLocalTimeZone())): AnalyticsRange {
  return { start: startOfMonth(now), end: now };
}

// CalendarDate → YYYY-MM-DD, reading the calendar fields directly rather than
// going through Date/UTC. Mirrors what the tab sends to every endpoint.
export function toISO(dv?: { year: number; month: number; day: number } | null): string | undefined {
  if (!dv) return undefined;
  const y = String(dv.year).padStart(4, '0');
  const m = String(dv.month).padStart(2, '0');
  const d = String(dv.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
