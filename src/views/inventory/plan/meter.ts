// The quantity meter (Inventory › Plan, buy planner B9; v1's rule): the number and its range on one track.
//
// The track runs from 0 to 1.3 × the larger of the top of the range and the number, so the band and the mark
// always sit inside it. The mark is drawn only where the payload puts the number: a number outside its own
// range draws no meter at all (never a mark clamped to a figure the node does not carry), a cut line has none
// (its figure carries no range), and an insufficient line (no number) draws nothing.

export interface MeterInput {
  amount: string | null;
  low: string | null;
  high: string | null;
}

export interface MeterGeometry {
  /** Percent of the track; null when the number has no range. */
  band: { left: number; width: number } | null;
  /** Percent of the track. */
  mark: number;
}

const num = (text: string | null): number | null => {
  if (text === null || text === undefined || String(text).trim() === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
};

export const meter = (value: MeterInput | null, options: { cut?: boolean } = {}): MeterGeometry | null => {
  if (!value || options.cut) return null;
  const amount = num(value.amount);
  if (amount === null || amount < 0) return null;
  const low = num(value.low);
  const high = num(value.high);
  const hasRange = low !== null && high !== null && high >= low;
  if (hasRange && (amount < low || amount > high)) return null;
  const top = 1.3 * Math.max(hasRange ? (high as number) : 0, amount);
  if (!(top > 0)) return null;
  const pct = (x: number) => (x / top) * 100;
  return {
    band: hasRange ? { left: pct(low as number), width: pct((high as number) - (low as number)) } : null,
    mark: pct(amount)
  };
};
