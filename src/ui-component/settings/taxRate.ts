/**
 * Sales tax rate: percent on screen, fraction on the wire (ALL-96).
 *
 * The API stores a fraction — "0.0700" is 7% — because that is what the
 * checkout arithmetic multiplies by. Merchants say "seven percent". Getting the
 * conversion wrong in either direction is a 100x error in what a shop collects,
 * so it lives here with tests rather than inline in the form.
 *
 * Four decimal places throughout, matching the column: US local surtaxes are
 * quoted to a quarter point and 7.25% must not round to 7%.
 */

/** "0.0700" -> "7". Trailing zeros dropped so the field reads "7", not "7.00". */
export const fractionToPercent = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) return '';
  return String(Number((asNumber * 100).toFixed(4)));
};

/** "7" -> "0.0700". Empty for anything that is not a number, so the form can
 * refuse to send it rather than sending NaN. */
export const percentToFraction = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed === '') return '';
  const asNumber = Number(trimmed);
  if (!Number.isFinite(asNumber)) return '';
  return (asNumber / 100).toFixed(4);
};
