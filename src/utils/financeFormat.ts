// Shared numeric coercion and display formatting for finance surfaces.
//
// Backend money can arrive as JSON numbers OR decimal strings (Django
// Decimals — see docs/finance-metrics-fix-sessions.md RC4). "0.00" is truthy,
// so string money must never reach arithmetic or `||` fallbacks. Margins are
// undefined when there is no revenue: they are null in the API and render as
// an em dash — never 0%, -100%, NaN% or -Infinity%.

import type { COGSData, GrossProfitData, ProfitAndLossData } from 'types/finance';

const EM_DASH = '—';

/** Coerce anything the API can send into a finite number; everything else is 0. */
export function toNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Render a percentage; null/undefined/non-finite means "undefined" → em dash. */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EM_DASH;
  }
  return `${value.toFixed(digits)}%`;
}

/** Render a plain ratio (Current Ratio, Debt-to-Equity) with the same em-dash convention. */
export function formatRatio(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EM_DASH;
  }
  return value.toFixed(digits);
}

/**
 * A margin as a percentage, or null when it is undefined (denominator <= 0).
 * Accepts numbers or decimal strings on both sides.
 */
export function marginOf(numerator: unknown, denominator: unknown): number | null {
  const d = toNum(denominator);
  if (d <= 0) {
    return null;
  }
  return (toNum(numerator) / d) * 100;
}

/**
 * The one delta-badge convention for dashboard tiles.
 *
 * - new period / no delta → em dash
 * - value 0 with a -100% delta → neutral "No activity this period" (the API
 *   stays truthful; this is presentation only)
 * - otherwise a signed percentage to one decimal place
 */
export function formatDeltaLabel(deltaPct: number | null | undefined, newPeriod?: boolean, value?: number): string {
  if (newPeriod || deltaPct === null || deltaPct === undefined) {
    return EM_DASH;
  }
  if (value === 0 && deltaPct === -100) {
    return 'No activity this period';
  }
  const sign = deltaPct > 0 ? '+' : '';
  return `${sign}${deltaPct.toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Payload normalizers — called from the finance slice's fulfilled reducers so
// every consumer reads real numbers from the store. Each accepts null because
// BaseFinanceAPI.safeGet can fulfil a thunk with null.
// ---------------------------------------------------------------------------

export function normalizeProfitAndLoss(payload: ProfitAndLossData | null): ProfitAndLossData | null {
  if (!payload) {
    return null;
  }
  return {
    ...payload,
    net_income: toNum(payload.net_income),
    net_operating_income: toNum(payload.net_operating_income),
    gross_profit: toNum(payload.gross_profit),
    total_income: toNum(payload.total_income),
    total_expenses: toNum(payload.total_expenses),
    operating_expenses: toNum(payload.operating_expenses),
    cost_of_goods_sold: toNum(payload.cost_of_goods_sold)
  };
}

export function normalizeGrossProfitDetail(payload: GrossProfitData | null): GrossProfitData | null {
  if (!payload) {
    return null;
  }
  const margin = payload.gross_profit_margin;
  return {
    ...payload,
    revenue: toNum(payload.revenue),
    cost_of_goods_sold: toNum(payload.cost_of_goods_sold),
    gross_profit: toNum(payload.gross_profit),
    gross_profit_margin: margin === null || margin === undefined ? null : toNum(margin)
  };
}

export function normalizeCOGSDetail(payload: COGSData | null): COGSData | null {
  if (!payload) {
    return null;
  }
  return {
    ...payload,
    total_cogs: toNum(payload.total_cogs)
  };
}
