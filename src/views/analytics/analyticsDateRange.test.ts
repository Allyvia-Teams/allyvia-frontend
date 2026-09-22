import { CalendarDate, getLocalTimeZone, startOfMonth, today } from '@internationalized/date';
import { describe, expect, it } from 'vitest';
import { defaultAnalyticsRange, toISO } from './analyticsDateRange';

describe('defaultAnalyticsRange (ALL-140 H3)', () => {
  it('starts on the first of the viewer local month and ends today', () => {
    const range = defaultAnalyticsRange(new CalendarDate(2026, 9, 3));

    expect(toISO(range.start)).toBe('2026-09-01');
    expect(toISO(range.end)).toBe('2026-09-03');
  });

  // The pre-fix code built these with `new Date(y, m, 1).toISOString()`, which
  // in UTC+ zones yields the previous month's last day. Asserting on the 1st
  // itself is the case that regressed: there is no earlier day in the month to
  // absorb the shift, so a UTC round-trip escapes into August.
  it('does not slip into the previous month on the first of the month', () => {
    const range = defaultAnalyticsRange(new CalendarDate(2026, 9, 1));

    expect(toISO(range.start)).toBe('2026-09-01');
    expect(toISO(range.end)).toBe('2026-09-01');
  });

  it('handles a January start without slipping into the previous year', () => {
    const range = defaultAnalyticsRange(new CalendarDate(2026, 1, 1));

    expect(toISO(range.start)).toBe('2026-01-01');
    expect(toISO(range.end)).toBe('2026-01-01');
  });

  it('pads single-digit months and days to ISO width', () => {
    expect(toISO(new CalendarDate(2026, 3, 7))).toBe('2026-03-07');
  });

  // Guards the default argument specifically: the regression was a
  // `new Date(...).toISOString()` default, which disagrees with the viewer's
  // calendar in every zone that is not UTC-aligned at the moment of the call.
  it('defaults to the viewer local today, not a UTC-derived date', () => {
    const localToday = today(getLocalTimeZone());
    const range = defaultAnalyticsRange();

    expect(toISO(range.end)).toBe(toISO(localToday));
    expect(toISO(range.start)).toBe(toISO(startOfMonth(localToday)));
  });

  it('returns undefined for a missing date rather than a bogus string', () => {
    expect(toISO(undefined)).toBeUndefined();
    expect(toISO(null)).toBeUndefined();
  });
});
