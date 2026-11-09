/** Whole hours and minutes; a sub-minute entry reads "<1m" rather than "0h 0m" beside a non-zero cost. */
export const formatHours = (totalSeconds: number): string => {
  const seconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(seconds / 60);
  if (minutes === 0 && seconds > 0) return '<1m';
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

export const employeeInitials = (first: string, last: string): string =>
  `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase() || '—';

export const formatLaborCost = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Math.abs(amount) < 100 ? 2 : 0,
    maximumFractionDigits: Math.abs(amount) < 100 ? 2 : 0
  }).format(amount);

/**
 * US phone as 812-555-0185. The roster stores whatever was typed (often
 * already dashed), so normalise to digits first; anything that is not a
 * 10-digit number (with or without a leading 1) is shown as entered.
 */
export const formatPhone = (value: string): string => {
  const digits = (value || '').replace(/\D/g, '');
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (national.length !== 10) return value;
  return `${national.slice(0, 3)}-${national.slice(3, 6)}-${national.slice(6)}`;
};

export interface ClockedEntry {
  clock_in: string;
  clock_out: string | null;
  duration_seconds: number | null;
}

/**
 * Seconds an entry contributes to a range. A closed entry carries its own
 * duration; an open one (clocked in, not out) counts the time since clock-in
 * up to `now`, so someone shown as "Working now" does not sit at 0h 0m.
 */
export const entrySeconds = (entry: ClockedEntry, nowMs: number = Date.now()): number => {
  if (entry.duration_seconds != null) return Math.max(0, entry.duration_seconds);
  if (!entry.clock_in || entry.clock_out) return 0;
  const started = Date.parse(entry.clock_in);
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.floor((nowMs - started) / 1000));
};

/**
 * Turn a YYYY-MM-DD window (calendar days in the viewer's zone) into the
 * instants the backend should bound `clock_in` by. The server parses full ISO
 * datetimes as aware, so sending the viewer's local midnight and end-of-day
 * keeps an evening shift on the day it was worked instead of the next UTC day.
 */
export const localDayBounds = ({ startDate, endDate }: { startDate: string; endDate: string }): { start: string; end: string } => {
  const parse = (iso: string) => iso.split('-').map((part) => Number(part)) as [number, number, number];
  const [sy, sm, sd] = parse(startDate);
  const [ey, em, ed] = parse(endDate);
  return {
    start: new Date(sy, sm - 1, sd, 0, 0, 0, 0).toISOString(),
    end: new Date(ey, em - 1, ed, 23, 59, 59, 999).toISOString()
  };
};
