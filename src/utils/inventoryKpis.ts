// The inventory KPI tile that reports margin, shared by the dashboard section
// and the analytics tab so the two cannot drift apart.
//
// The backend used to compute (unit_price - cost_price) / COST_price per item
// and average it unweighted across SKUs. That is markup, not margin, and it
// counted a $14 hair clip as heavily as a $168 coat: Merths' real catalogue
// showed 212.1% on the same page as a gross profit statement saying 68.6%
// (ALL-89). It is now the on-hand-value-weighted margin of the whole shelf,
// which is why the tile is titled "Inventory Margin" rather than "Average
// Profit Margin" — there is no per-item average left to describe.
//
// The value is nullable: null means "no priced, cost-known stock on hand",
// which is an absent margin, not a margin of zero.

import type { InventorySummary } from 'types/analytics';
import type { InventoryItemsTreemapResponse } from 'types/inventory';

import { formatCurrency } from './financeCalculations';
import { EM_DASH, formatPercent, formatRatio } from './financeFormat';

export const INVENTORY_MARGIN_TITLE = 'Inventory Margin';

// The summary payload carries no currency; the treemap response does.
export const DEFAULT_CURRENCY = 'USD';

type MarginSource = Pick<InventorySummary, 'average_profit_margin'>;

/**
 * The tile's display string: a percentage, or an em dash when the margin is
 * unknown or the summary has not loaded.
 *
 * Never guard the margin with a bare `||` fallback. `||` cannot tell null from
 * a genuine 0% (selling at cost) and collapses both to "0%" — the falsy-zero
 * trap this tile shipped with. `formatPercent` keeps the two distinct.
 */
export function inventoryMarginDisplay(summary: MarginSource | null | undefined): string {
  return formatPercent(summary?.average_profit_margin);
}

type TotalValueSource = Pick<InventorySummary, 'total_value'>;
type TreemapSource = Pick<InventoryItemsTreemapResponse, 'totals'>;

/**
 * Value of stock on hand for the "Total Inventory Value" tile.
 *
 * The summary and the treemap are NOT the same measurement and must not be
 * treated as interchangeable: `summary.total_value` sums quantity x unit_price
 * over ACTIVE items, while the treemap's total sums the same product over
 * EVERY item the company has, discontinued ones included. So the treemap is
 * only a placeholder for the window before the summary arrives, and the
 * summary wins the moment it does.
 *
 * That distinction used to be invisible. The analytics tab read
 * `total_inventory_value`, a key this payload has never carried, so its first
 * branch was always undefined and it silently rendered the treemap's number
 * under the summary's label — a different figure from the identically-labelled
 * tile on the dashboard, whenever a shop had deactivated stock.
 *
 * `??` and not `||`: a shop holding no stock is worth 0, and must not be shown
 * the treemap's total instead.
 */
export function inventoryTotalValue(summary: TotalValueSource | null | undefined, treemap: TreemapSource | null | undefined): number {
  return summary?.total_value ?? treemap?.totals?.categories?.value ?? 0;
}

/** The chip content for a margin that does not cover the whole shelf. */
export type InventoryMarginCaveat = {
  /** Short pill label, rendered uppercase by AllyviaChip. */
  label: string;
  /** Sentence naming what the figure leaves out. */
  tooltip: string;
};

// No 'currency' in this Pick. InventorySummarySerializer does not declare the
// field, and analytics/views.py pipes the service dict through that serializer,
// so the key is dropped in transit even though the service computes one. The
// treemap response is the only payload that carries a currency, which is why it
// arrives here as an argument and why the tiles' own first rung was always
// undefined too. Restoring the key here is a compile error, which is a stronger
// guard than the test that used to stand for it.
type CaveatSource = Pick<InventorySummary, 'average_profit_margin' | 'average_profit_margin_estimated' | 'margin_uncosted_value'>;

/**
 * The excluded stock at retail, or null when there is no amount worth naming.
 *
 * Returns null on 0 as well as on a missing or non-finite value, because
 * `margin_uncosted_value` sums `unit_price * quantity_on_hand` over the
 * EXCLUDED items and an item is excluded for having no price just as much as
 * for having no cost. A price-less item therefore contributes nothing, so a
 * true `estimated` flag routinely arrives alongside a value of 0 — and
 * "$0.00 of stock has no recorded cost" reads as "nothing is missing".
 */
function excludedStockAtRetail(summary: CaveatSource, currency: string): string | null {
  const value = summary.margin_uncosted_value;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  // The currency is threaded in from the caller because this payload carries
  // none to read. It never has: this used to say `summary.currency || 'USD'`,
  // and with the interface wrongly declaring a `currency` the endpoint does not
  // send, the first operand was undefined on every render and the fallback did
  // all the work — so the chip hardcoded dollars while the tile beside it
  // formatted the total in the treemap's currency, and a GBP shop read
  // "$1,200.00" under "£66,812.00". The treemap response is the one source
  // that does carry a currency, so both now come from it.
  try {
    return formatCurrency(value, currency || DEFAULT_CURRENCY);
  } catch {
    // Intl.NumberFormat throws RangeError on a currency code that is not three
    // letters. This runs inside render, so letting it escape would blank the
    // whole Inventory card over a settings typo — and the code is only as
    // trustworthy as whatever configured the treemap.
    return formatCurrency(value, DEFAULT_CURRENCY);
  }
}

/**
 * What the margin tile must disclose, or null when it may stand unqualified.
 *
 * Called "caveat" rather than "estimate" because it covers two different
 * states, and only one of them is an estimate:
 *
 *   - PARTIAL (`Estimated`) — a real margin measured over the costed subset.
 *   - ABSENT (`No cost data`) — the margin is null, so nothing was estimated
 *     at all. This is the newly-onboarded shop whose catalogue arrived with
 *     prices but no costs; the tile reads "—" and an "ESTIMATED" pill beside
 *     it would be incoherent. Say why it is blank and what would fill it.
 *
 * `!== true` mirrors the finance chip's strictness (`cash_balance_estimated
 * === true`): a payload without the key must not start asserting doubt.
 *
 * `currency` comes from the caller because the summary does not carry one --
 * pass the treemap's, the same rung the neighbouring value tile uses. Omitted
 * or unset it falls back to dollars, since naming the amount in the wrong
 * symbol still beats naming no amount.
 */
export function inventoryMarginCaveat(
  summary: CaveatSource | null | undefined,
  currency: string = DEFAULT_CURRENCY
): InventoryMarginCaveat | null {
  if (!summary || summary.average_profit_margin_estimated !== true) {
    return null;
  }

  const excluded = excludedStockAtRetail(summary, currency);

  if (summary.average_profit_margin === null || summary.average_profit_margin === undefined) {
    return {
      label: 'No cost data',
      tooltip: excluded
        ? `${excluded} of stock at retail has no recorded cost, so no margin can be calculated.`
        : 'No stock on hand has both a recorded cost and a price, so no margin can be calculated.'
    };
  }

  return {
    label: 'Estimated',
    tooltip: excluded
      ? `${excluded} of stock at retail has no recorded cost. This margin measures only the stock that has one.`
      : 'Some stock has no recorded cost. This margin measures only the stock that has one.'
  };
}

/**
 * The Inventory Efficiency turnover figure, as "4.25x" or an em dash.
 *
 * The rate is NULLABLE and the em dash is not decoration. `get_inventory_
 * efficiency` returns `turnover_rate: None` with status "no_data" for a shop
 * that has never recorded a sale, or that carried no stock across the window:
 * "a rate would be division by nothing, and 0.0 would read as 'carried it and
 * sold none'". So null must stay visibly absent and must never be coerced --
 * not to 0 by a `||` fallback, and not to "—x" by suffixing the em dash.
 *
 * THE CRASH THIS REPLACES: both render sites called
 * `inventoryEfficiency.turnover_rate.toFixed(n)` directly. For every no_data
 * company that threw "Cannot read properties of null (reading 'toFixed')",
 * which took down the entire /dashboard route rather than one tile. The
 * neighbouring `dio` was guarded at both sites, so only this field was missed
 * -- and `api/inventory.api.ts` declaring it a bare `number` is why the
 * compiler never said so.
 *
 * A finite 0 is a real answer (history, but a quiet window) and prints 0.0x.
 */
export function turnoverRateDisplay(rate: number | null | undefined, digits = 2): string {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) {
    return EM_DASH;
  }
  return `${formatRatio(rate, digits)}x`;
}
