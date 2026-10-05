/**
 * ALL-108 — clearing a numeric field must not mean zero.
 *
 * `parseInt(e.target.value) || 0` was used throughout the inventory and POS
 * forms. Backspacing the last character of a price therefore did not leave the
 * field empty — it set the value to 0, and at the till that meant a line at
 * £0.00 with no record that an override had happened. `|| 0` also swallows a
 * legitimately typed 0, and NaN, and "-", indistinguishably.
 *
 * These keep the two cases apart. An empty (or unparseable) field returns
 * `null`, which callers render as an empty box and treat as "not answered yet"
 * — never as zero.
 */

/** A number the user actually typed, or null for an empty/unparseable field. */
export function numberOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Whole units (quantities, reorder points). Null for an empty field. */
export function integerOrNull(raw: string): number | null {
  const parsed = numberOrNull(raw);
  return parsed === null ? null : Math.trunc(parsed);
}

/** Render a possibly-null numeric value back into a controlled input. */
export function fieldValue(value: number | null | undefined): number | string {
  return value === null || value === undefined || Number.isNaN(value) ? '' : value;
}
