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
