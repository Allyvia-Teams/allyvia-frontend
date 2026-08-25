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
import { formatPercent } from './financeFormat';

export const INVENTORY_MARGIN_TITLE = 'Inventory Margin';

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
export function inventoryTotalValue(
  summary: TotalValueSource | null | undefined,
  treemap: TreemapSource | null | undefined
): number {
  return summary?.total_value ?? treemap?.totals?.categories?.value ?? 0;
}

/** The chip content for a margin that does not cover the whole shelf. */
export type InventoryMarginCaveat = {
  /** Short pill label, rendered uppercase by AllyviaChip. */
  label: string;
  /** Sentence naming what the figure leaves out. */
  tooltip: string;
};

type CaveatSource = Pick<
  InventorySummary,
  'average_profit_margin' | 'average_profit_margin_estimated' | 'margin_uncosted_value' | 'currency'
>;

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
function excludedStockAtRetail(summary: CaveatSource): string | null {
  const value = summary.margin_uncosted_value;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  try {
    return formatCurrency(value, summary.currency || 'USD');
  } catch {
    // Intl.NumberFormat throws RangeError on a currency code that is not three
    // letters. This runs inside render, so letting it escape would blank the
    // whole Inventory card over a settings typo.
    return formatCurrency(value, 'USD');
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
 */
export function inventoryMarginCaveat(summary: CaveatSource | null | undefined): InventoryMarginCaveat | null {
  if (!summary || summary.average_profit_margin_estimated !== true) {
    return null;
  }

  const excluded = excludedStockAtRetail(summary);

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
