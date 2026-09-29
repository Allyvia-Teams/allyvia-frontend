/**
 * The one client-side definition of "low stock" (ALL-98).
 *
 * It exists to match `InventoryItem.low_stock_q()` on the server exactly:
 *
 *     reorder_point IS NOT NULL AND quantity_on_hand <= reorder_point
 *
 * and to be the only place that has to be checked when that changes. Four
 * incompatible answers used to be in play at once — a truthiness test that
 * ignored an explicit reorder point of zero, a `|| 0` that turned "no reorder
 * point" into a reorder point of zero, and a `qty > 0` guard that hid exactly
 * the items most in need of reordering. A five-item shelf reported three
 * different totals on three surfaces in the same second.
 *
 * `isLowStock` is the rule. `isStockAlertItem` is the rule the ALERT SURFACES
 * use, which additionally drops out-of-stock rows because they are shown in
 * their own list and would otherwise be reported twice — the same split the
 * server's alerts endpoint makes, and for the same reason. Neither ever
 * substitutes a client count for a server one: see `buildInventoryStatsView`.
 */

export interface LowStockCandidate {
  quantity_on_hand?: number | null;
  reorder_point?: number | null;
  item_type?: string | null;
}

/** A thing that sits on a shelf. A service cannot be low on stock. */
export const isStockedItem = (item: LowStockCandidate) => item.item_type === 'Inventory';

const onHand = (item: LowStockCandidate) => Number(item.quantity_on_hand || 0);

/**
 * `!= null`, never truthiness: a reorder point of 0 means "tell me when it is
 * gone", which is a thing a merchant can mean, and no reorder point at all
 * means they never asked to be told about this item.
 */
export const isLowStock = (item: LowStockCandidate) => item.reorder_point != null && onHand(item) <= Number(item.reorder_point);

export const isOutOfStock = (item: LowStockCandidate) => onHand(item) === 0;

/** Low, and not already being reported as out of stock. */
export const isStockAlertItem = (item: LowStockCandidate) => isLowStock(item) && !isOutOfStock(item);
