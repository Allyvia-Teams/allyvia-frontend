/**
 * The one `datetime-local` input formatter for this feature area.
 *
 * `PerkDialog` and `StyleVoteDialog` each carried a byte-identical private
 * copy of this function (per the S6 "never give a `.ts` and a `.tsx` the
 * same base name modulo case" naming rule, this file is named `dateInput`,
 * not `PerkDialog`-adjacent). `outreachRows.ts` needs the same conversion
 * for `prefillFor`, so it is pulled out here once rather than grown a third
 * time.
 */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
