import { describe, expect, it } from 'vitest';

import {
  MAX_DAYS,
  PRESETS,
  clampRange,
  dayCount,
  defaultRange,
  isIsoDate,
  monthOfRange,
  monthRange,
  presetOf,
  presetRange
} from './trendsRange';

const TODAY = '2026-11-18';

describe('range presets', () => {
  it('defaults to 90 days back and 60 ahead', () => {
    expect(defaultRange(TODAY)).toEqual({ start: '2026-08-20', end: '2027-01-17' });
    expect(presetRange('around', TODAY)).toEqual(defaultRange(TODAY));
  });

  it('this month, next 60 days and the last 12 months', () => {
    expect(presetRange('month', TODAY)).toEqual({ start: '2026-11-01', end: '2026-11-30' });
    expect(presetRange('ahead', TODAY)).toEqual({ start: '2026-11-18', end: '2027-01-17' });
    expect(presetRange('year', TODAY)).toEqual({ start: '2025-11-19', end: '2026-11-18' });
  });

  it('has the four presets by their words', () => {
    expect(PRESETS.map((p) => p.label)).toEqual(['Last 90 days and next 60', 'This month', 'Next 60 days', 'Last 12 months']);
  });

  it('every preset is inside the 400-day ceiling', () => {
    for (const p of PRESETS) expect(dayCount(presetRange(p.value, TODAY))).toBeLessThanOrEqual(MAX_DAYS);
  });

  it('last 12 months on a leap day does not invent a date', () => {
    expect(presetRange('year', '2028-02-29')).toEqual({ start: '2027-03-01', end: '2028-02-29' });
  });

  it('names the preset a range is, or none', () => {
    expect(presetOf(defaultRange(TODAY), TODAY)).toBe('around');
    expect(presetOf({ start: '2026-01-01', end: '2026-01-31' }, TODAY)).toBeNull();
  });
});

describe('the month jump', () => {
  it('makes the whole month, in any year', () => {
    expect(monthRange('2024-02')).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    expect(monthRange('2023-02')).toEqual({ start: '2023-02-01', end: '2023-02-28' });
    expect(monthRange('2024-12')).toEqual({ start: '2024-12-01', end: '2024-12-31' });
  });

  it('reaches a month two years back, across a year boundary from now', () => {
    const range = monthRange('2024-12')!;
    expect(range.start < '2025-01-01').toBe(true);
    expect(monthOfRange(range)).toBe('2024-12');
  });

  it('refuses what is not a month', () => {
    expect(monthRange('2024-13')).toBeNull();
    expect(monthRange('')).toBeNull();
    expect(monthRange('2024-1')).toBeNull();
  });

  it('reads a range as a month only when it is exactly one', () => {
    expect(monthOfRange({ start: '2026-11-01', end: '2026-11-30' })).toBe('2026-11');
    expect(monthOfRange({ start: '2026-11-01', end: '2026-11-29' })).toBeNull();
  });
});

describe('never more than 400 days', () => {
  it('counts both ends', () => {
    expect(dayCount({ start: '2026-01-01', end: '2026-01-01' })).toBe(1);
    expect(dayCount({ start: '2026-01-01', end: '2027-02-04' })).toBe(400);
  });

  it('keeps a range of 400 days, and cuts 401 back to 400', () => {
    expect(clampRange({ start: '2026-01-01', end: '2027-02-04' })).toEqual({ start: '2026-01-01', end: '2027-02-04' });
    const cut = clampRange({ start: '2026-01-01', end: '2027-02-05' });
    expect(dayCount(cut)).toBe(400);
    expect(cut.start).toBe('2026-01-01');
  });

  it('puts a reversed range in order, and leaves an unreadable one alone', () => {
    expect(clampRange({ start: '2026-02-01', end: '2026-01-01' })).toEqual({ start: '2026-01-01', end: '2026-02-01' });
    expect(clampRange({ start: 'soon', end: '2026-01-01' })).toEqual({ start: 'soon', end: '2026-01-01' });
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-02-28')).toBe(true);
  });
});
