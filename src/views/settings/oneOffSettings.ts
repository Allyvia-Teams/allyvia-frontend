// One-off items (owner trust T9): what the built-in row on Settings > Store rules says and sends, the reorder
// list's line about them, and the chip on a style. Pure: the components render these and decide no wording.

export const ONE_OFF_MIN_UNITS = 1;
export const ONE_OFF_MAX_UNITS = 20;
export const ONE_OFF_DEFAULT_UNITS = 3;

export const ONE_OFF_TITLE = 'Treat new items that arrive in small quantities as one-offs';
export const ONE_OFF_BLURB =
  'One-offs get no reorder suggestions and are not used to size future orders. We still remember how fast that kind of item sold.';
export const CORE_ITEM_LABEL = 'Core item: always learn from this, even in small quantities';

export interface OneOffForm {
  on: boolean;
  /** The number box as typed. Kept while the switch is off, so switching back on does not lose it. */
  units: string;
}

const whole = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isInteger(value) ? value : null;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
};

/** The form for what the company has stored: 0, missing or unreadable is off (showing the default 3). */
export const oneOffForm = (maxUnits: unknown): OneOffForm => {
  const stored = whole(maxUnits);
  if (stored === null || stored < ONE_OFF_MIN_UNITS) return { on: false, units: String(ONE_OFF_DEFAULT_UNITS) };
  return { on: true, units: String(Math.min(stored, ONE_OFF_MAX_UNITS)) };
};

/** What is wrong with the number, or null. Off is never wrong: the number is not sent. */
export const oneOffError = (form: OneOffForm): string | null => {
  if (!form.on) return null;
  const units = whole(form.units);
  if (units === null || units < ONE_OFF_MIN_UNITS || units > ONE_OFF_MAX_UNITS) {
    return `Enter a whole number from ${ONE_OFF_MIN_UNITS} to ${ONE_OFF_MAX_UNITS}.`;
  }
  return null;
};

/** The number the form stands for: 0 when off, null when it cannot be sent. */
export const oneOffValue = (form: OneOffForm): number | null => {
  if (!form.on) return 0;
  return oneOffError(form) ? null : (whole(form.units) as number);
};

export interface OneOffPayload {
  one_off_max_units: number;
}

/** The PUT body, or null when there is nothing to save (unchanged, or a number that cannot be sent). Off sends 0. */
export const oneOffPayload = (form: OneOffForm, stored: unknown): OneOffPayload | null => {
  const value = oneOffValue(form);
  if (value === null) return null;
  const before = oneOffValue(oneOffForm(stored));
  return value === before ? null : { one_off_max_units: value };
};

/** "unit or fewer" after the number box. */
export const unitsWords = (units: string): string => (whole(units) === 1 ? 'unit or fewer' : 'units or fewer');

/** How many one-off items the server says the reorder list leaves out; 0 for anything unreadable. */
export const readOneOffCount = (value: unknown): number => {
  const count = whole(value);
  return count !== null && count > 0 ? count : 0;
};

/** The reorder list's sentence about one-offs, or null when there are none. */
export const oneOffLine = (count: number | null | undefined): string | null => {
  const n = readOneOffCount(count);
  if (n === 0) return null;
  return n === 1 ? '1 one-off item is left out of reorder suggestions.' : `${n} one-off items are left out of reorder suggestions.`;
};

/** The whole quiet line under the reorder list: her rules' sentence (T8) and the one-off sentence, whichever exist. */
export const heldNote = (rulesLine: string | null, oneOffs: number | null | undefined): string | null => {
  const parts = [rulesLine, oneOffLine(oneOffs)].filter((part): part is string => !!part);
  return parts.length ? parts.join(' ') : null;
};

/** The chip on a style's detail: "One-off" for a one-off style, nothing for a core or ordinary one. */
export const stockClassChip = (stockClass: unknown, markedCore = false): string | null =>
  stockClass === 'one_off' && !markedCore ? 'One-off' : null;
