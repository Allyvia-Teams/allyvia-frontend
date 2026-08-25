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
