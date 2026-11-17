import { CalendarDate } from '@internationalized/date';
import { describe, expect, it } from 'vitest';
import {
  dayCount,
  formatRangeLabel,
  formatTypedDate,
  getPresets,
  maskDateInput,
  matchPreset,
  parseTypedDate,
  rangeError
} from './dateRangePresets';

const TODAY = new CalendarDate(2026, 11, 17);
const byId = (id: string, bounds = {}) => getPresets(TODAY, bounds).find((p) => p.id === id)?.range;
const iso = (r?: { start: { toString(): string }; end: { toString(): string } }) =>
  r ? `${r.start.toString()}..${r.end.toString()}` : null;

describe('getPresets', () => {
  it('builds every preset from today, inclusive of today', () => {
    expect(iso(byId('today'))).toBe('2026-11-17..2026-11-17');
    expect(iso(byId('yesterday'))).toBe('2026-11-16..2026-11-16');
    expect(iso(byId('last7'))).toBe('2026-11-11..2026-11-17');
    expect(iso(byId('last30'))).toBe('2026-10-19..2026-11-17');
    expect(iso(byId('thisMonth'))).toBe('2026-11-01..2026-11-17');
    expect(iso(byId('lastMonth'))).toBe('2026-10-01..2026-10-31');
    expect(iso(byId('ytd'))).toBe('2026-01-01..2026-11-17');
  });
  it('rolls last month back across a year boundary', () => {
    const jan = getPresets(new CalendarDate(2026, 1, 5)).find((p) => p.id === 'lastMonth');
    expect(iso(jan?.range)).toBe('2025-12-01..2025-12-31');
  });
  it('drops presets that do not fit inside the allowed dates', () => {
    const ids = getPresets(TODAY, { minDate: new CalendarDate(2026, 11, 10) }).map((p) => p.id);
    expect(ids).toEqual(['today', 'yesterday', 'last7']);
  });
  it('drops presets that end after maxDate', () => {
    const ids = getPresets(TODAY, { maxDate: new CalendarDate(2026, 11, 16) }).map((p) => p.id);
    expect(ids).toEqual(['yesterday', 'lastMonth']);
  });
});

describe('matchPreset', () => {
  it('names a range that equals a preset', () => {
    expect(matchPreset({ start: new CalendarDate(2026, 10, 19), end: TODAY }, TODAY)?.label).toBe('Last 30 days');
  });
  it('returns null for a custom range or no range', () => {
    expect(matchPreset({ start: new CalendarDate(2026, 11, 3), end: new CalendarDate(2026, 11, 12) }, TODAY)).toBeNull();
    expect(matchPreset(null, TODAY)).toBeNull();
  });
});

describe('formatRangeLabel', () => {
  it('shows one date for a single day', () => {
    expect(formatRangeLabel({ start: TODAY, end: TODAY })).toBe('Nov 17, 2026');
  });
  it('shows the year once inside one year', () => {
    expect(formatRangeLabel({ start: new CalendarDate(2026, 10, 19), end: TODAY })).toBe('Oct 19 – Nov 17, 2026');
  });
  it('shows both years across a year boundary', () => {
    expect(formatRangeLabel({ start: new CalendarDate(2025, 12, 20), end: new CalendarDate(2026, 1, 5) })).toBe(
      'Dec 20, 2025 – Jan 5, 2026'
    );
  });
});

describe('typed dates', () => {
  it('masks digits into mm/dd/yyyy as the user types', () => {
    expect(maskDateInput('1')).toBe('1');
    expect(maskDateInput('1103')).toBe('11/03');
    expect(maskDateInput('11032026')).toBe('11/03/2026');
    expect(maskDateInput('11/03/20269')).toBe('11/03/2026');
  });
  it('parses a complete valid date and round-trips it', () => {
    const d = parseTypedDate('11/03/2026');
    expect(d?.toString()).toBe('2026-11-03');
    expect(formatTypedDate(d!)).toBe('11/03/2026');
  });
  it('rejects incomplete and impossible dates', () => {
    expect(parseTypedDate('11/03')).toBeNull();
    expect(parseTypedDate('13/01/2026')).toBeNull();
    expect(parseTypedDate('02/31/2026')).toBeNull();
  });
});

describe('rangeError', () => {
  const a = new CalendarDate(2026, 11, 3);
  const b = new CalendarDate(2026, 11, 12);
  it('accepts an ordered range inside the bounds', () => {
    expect(rangeError(a, b, { minDate: a, maxDate: b })).toBeNull();
  });
  it('explains a reversed range', () => {
    expect(rangeError(b, a)).toMatch(/on or before/);
  });
  it('explains a range outside the bounds', () => {
    expect(rangeError(a, b, { maxDate: new CalendarDate(2026, 11, 10) })).toMatch(/Nov 10, 2026/);
    expect(rangeError(a, b, { minDate: new CalendarDate(2026, 11, 5) })).toMatch(/Nov 5, 2026/);
  });
});

describe('dayCount', () => {
  it('counts both ends', () => {
    expect(dayCount({ start: new CalendarDate(2026, 10, 19), end: TODAY })).toBe(30);
    expect(dayCount({ start: TODAY, end: TODAY })).toBe(1);
  });
});
