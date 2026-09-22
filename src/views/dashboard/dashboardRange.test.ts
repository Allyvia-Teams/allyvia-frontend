import { CalendarDate } from '@internationalized/date';
import { describe, expect, it } from 'vitest';
import { defaultDashboardWindow, isoWindow } from './dashboardRange';

describe('defaultDashboardWindow', () => {
  it('spans the last 30 days including today', () => {
    const range = defaultDashboardWindow(new CalendarDate(2026, 9, 11));
    expect(range.start.toString()).toBe('2026-08-13');
    expect(range.end.toString()).toBe('2026-09-11');
  });
  it('crosses a month boundary by the calendar, not by 30 x 24h', () => {
    const range = defaultDashboardWindow(new CalendarDate(2026, 3, 15));
    expect(range.start.toString()).toBe('2026-02-14');
  });
});

describe('isoWindow', () => {
  it('formats both halves as YYYY-MM-DD from calendar fields', () => {
    expect(isoWindow({ start: new CalendarDate(2026, 1, 5), end: new CalendarDate(2026, 1, 9) })).toEqual({
      startDate: '2026-01-05',
      endDate: '2026-01-09'
    });
  });
  it('falls back to the default window when the picker is cleared', () => {
    const result = isoWindow(null);
    expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.endDate >= result.startDate).toBe(true);
  });
});
