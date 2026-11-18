// The Trends page's date range: presets, the month jump and the 400-day ceiling. Pure; "today" is passed in
// (the browser's calendar day) so a test pins it. The shared date range picker is not used: it stops at today,
// and this page looks ahead.

import { addDays } from '../analyticsPage';

export const MAX_DAYS = 400;
export const DEFAULT_BACK = 90;
export const DEFAULT_AHEAD = 60;

export interface TrendsRange {
  start: string;
  end: string;
}

export type RangePreset = 'around' | 'month' | 'ahead' | 'year';

export const PRESETS: ReadonlyArray<{ value: RangePreset; label: string }> = [
  { value: 'around', label: 'Last 90 days and next 60' },
  { value: 'month', label: 'This month' },
  { value: 'ahead', label: 'Next 60 days' },
  { value: 'year', label: 'Last 12 months' }
];

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export const isIsoDate = (value: string): boolean => {
  if (!ISO.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === value;
};

const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** The whole calendar month for "YYYY-MM", or null when it is not a month. */
export function monthRange(month: string): TrendsRange | null {
  if (!MONTH.test(month)) return null;
  const [year, number] = month.split('-').map(Number);
  return { start: `${month}-01`, end: `${month}-${String(daysIn(year, number)).padStart(2, '0')}` };
}

/** "YYYY-MM" of an ISO day. */
export const monthOf = (iso: string): string => iso.slice(0, 7);

/** The same day one year back, plus a day: twelve whole months ending on `today`. */
function yearBack(today: string): string {
  const [year, month, day] = today.split('-').map(Number);
  const back = Math.min(day, daysIn(year - 1, month));
  return addDays(`${year - 1}-${String(month).padStart(2, '0')}-${String(back).padStart(2, '0')}`, 1);
}

export function presetRange(preset: RangePreset, today: string): TrendsRange {
  switch (preset) {
    case 'month':
      return monthRange(monthOf(today)) as TrendsRange;
    case 'ahead':
      return { start: today, end: addDays(today, DEFAULT_AHEAD) };
    case 'year':
      return { start: yearBack(today), end: today };
    default:
      return { start: addDays(today, -DEFAULT_BACK), end: addDays(today, DEFAULT_AHEAD) };
  }
}

export const defaultRange = (today: string): TrendsRange => presetRange('around', today);

/** Whole days from start to end, both included. */
export const dayCount = (range: TrendsRange): number =>
  Math.round((Date.parse(`${range.end}T00:00:00Z`) - Date.parse(`${range.start}T00:00:00Z`)) / 86_400_000) + 1;

/** A range the server will take: both dates real, in order, 400 days at most. Longer ones are cut back from the end. */
export function clampRange(range: TrendsRange): TrendsRange {
  if (!isIsoDate(range.start) || !isIsoDate(range.end)) return range;
  const [start, end] = range.end < range.start ? [range.end, range.start] : [range.start, range.end];
  return dayCount({ start, end }) > MAX_DAYS ? { start, end: addDays(start, MAX_DAYS - 1) } : { start, end };
}

/** Which preset a range is exactly, for the control's label; null for a month jump or anything else. */
export function presetOf(range: TrendsRange, today: string): RangePreset | null {
  return (
    PRESETS.find((p) => {
      const r = presetRange(p.value, today);
      return r.start === range.start && r.end === range.end;
    })?.value ?? null
  );
}

/** The range reads as one whole month, so the month control can show it. */
export const monthOfRange = (range: TrendsRange): string | null => {
  const month = monthOf(range.start);
  const whole = monthRange(month);
  return whole && whole.start === range.start && whole.end === range.end ? month : null;
};
