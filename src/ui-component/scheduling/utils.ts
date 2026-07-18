// Shared helpers for the scheduling module

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Stable, theme-friendly palette for role color-coding
const ROLE_COLORS = ['#1976d2', '#9c27b0', '#2e7d32', '#ed6c02', '#0288d1', '#d32f2f', '#7b1fa2', '#00796b'];

export const roleColor = (roleId: number): string => ROLE_COLORS[Math.abs(roleId) % ROLE_COLORS.length];

/** "08:00:00" -> "8am", "13:30:00" -> "1:30pm" */
export const formatTime = (value: string): string => {
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = parseInt(hourRaw, 10);
  const minute = minuteRaw ?? '00';
  const suffix = hour >= 12 ? 'pm' : 'am';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return minute === '00' ? `${display}${suffix}` : `${display}:${minute}${suffix}`;
};

export const hourOf = (value: string): number => parseInt(value.split(':')[0], 10);

/** Hours a block covers (wrap-aware: end <= start crosses midnight). */
export const blockHours = (startTime: string, endTime: string): number => {
  const start = hourOf(startTime) + parseInt(startTime.split(':')[1] ?? '0', 10) / 60;
  const end = hourOf(endTime) + parseInt(endTime.split(':')[1] ?? '0', 10) / 60;
  return end > start ? end - start : end + 24 - start;
};

/** Monday of the week containing (or following) a date, as a Date. */
export const mondayOf = (date: Date): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  result.setHours(0, 0, 0, 0);
  return result;
};

export const nextMonday = (): Date => {
  const monday = mondayOf(new Date());
  monday.setDate(monday.getDate() + 7);
  return monday;
};

export const isoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const addDays = (iso: string, days: number): string => {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  return isoDate(date);
};

export const currency = (value: number | string): string => {
  const numeric = typeof value === 'string' ? parseFloat(value) : value;
  return numeric.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
};
