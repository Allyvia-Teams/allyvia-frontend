import { CalendarDate, type DateValue, endOfMonth, startOfMonth, startOfYear, toCalendarDate } from '@internationalized/date';

// Pure date logic behind AllyviaDateRangePicker: the named presets, the trigger
// label, and the typed mm/dd/yyyy fields. Kept free of React so it is testable.

export interface DateRange {
  start: DateValue;
  end: DateValue;
}

export interface DateBounds {
  minDate?: DateValue;
  maxDate?: DateValue;
}

export type PresetId = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'ytd';

export interface DatePreset {
  id: PresetId;
  label: string;
  range: DateRange;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const plain = (d: DateValue): CalendarDate => toCalendarDate(d);

/**
 * The named ranges, anchored on `today` and counted inclusive of it ("Last 7
 * days" is today plus the six days before). A preset that does not fit wholly
 * inside minDate/maxDate is left out rather than clipped, so a label never
 * describes a range it did not produce.
 */
export function getPresets(today: DateValue, bounds: DateBounds = {}): DatePreset[] {
  const t = plain(today);
  const lastMonthEnd = startOfMonth(t).subtract({ days: 1 });
  const all: DatePreset[] = [
    { id: 'today', label: 'Today', range: { start: t, end: t } },
    { id: 'yesterday', label: 'Yesterday', range: { start: t.subtract({ days: 1 }), end: t.subtract({ days: 1 }) } },
    { id: 'last7', label: 'Last 7 days', range: { start: t.subtract({ days: 6 }), end: t } },
    { id: 'last30', label: 'Last 30 days', range: { start: t.subtract({ days: 29 }), end: t } },
    { id: 'thisMonth', label: 'This month', range: { start: startOfMonth(t), end: t } },
    { id: 'lastMonth', label: 'Last month', range: { start: startOfMonth(lastMonthEnd), end: endOfMonth(lastMonthEnd) } },
    { id: 'ytd', label: 'Year to date', range: { start: startOfYear(t), end: t } }
  ];
  return all.filter(({ range }) => rangeError(range.start, range.end, bounds) === null);
}

export function matchPreset(value: DateRange | null | undefined, today: DateValue, bounds: DateBounds = {}): DatePreset | null {
  if (!value?.start || !value?.end) return null;
  const start = plain(value.start);
  const end = plain(value.end);
  return getPresets(today, bounds).find((p) => plain(p.range.start).compare(start) === 0 && plain(p.range.end).compare(end) === 0) ?? null;
}

export function formatDate(d: DateValue, withYear = true): string {
  return `${MONTHS[d.month - 1]} ${d.day}${withYear ? `, ${d.year}` : ''}`;
}

export function formatRangeLabel(range: DateRange): string {
  const start = plain(range.start);
  const end = plain(range.end);
  if (start.compare(end) === 0) return formatDate(end);
  return `${formatDate(start, start.year !== end.year)} – ${formatDate(end)}`;
}

export function dayCount(range: DateRange): number {
  return plain(range.end).compare(plain(range.start)) + 1;
}

/** Shapes raw keystrokes into mm/dd/yyyy, dropping anything past eight digits. */
export function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

/** A complete, real mm/dd/yyyy date, or null (02/31 is rejected, not rolled over). */
export function parseTypedDate(text: string): CalendarDate | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || year < 1900) return null;
  const date = new CalendarDate(year, month, day);
  return date.day === day && date.month === month ? date : null;
}

export function formatTypedDate(d: DateValue): string {
  return `${String(d.month).padStart(2, '0')}/${String(d.day).padStart(2, '0')}/${String(d.year).padStart(4, '0')}`;
}

/** Why a start/end pair cannot be applied, in words for the user, or null when it can. */
export function rangeError(start: DateValue, end: DateValue, bounds: DateBounds = {}): string | null {
  const s = plain(start);
  const e = plain(end);
  if (s.compare(e) > 0) return 'The start date must be on or before the end date.';
  if (bounds.minDate && s.compare(plain(bounds.minDate)) < 0) return `Choose dates on or after ${formatDate(bounds.minDate)}.`;
  if (bounds.maxDate && e.compare(plain(bounds.maxDate)) > 0) return `Choose dates on or before ${formatDate(bounds.maxDate)}.`;
  return null;
}
