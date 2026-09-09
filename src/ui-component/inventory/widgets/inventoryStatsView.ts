import type { InventorySummary } from 'types/inventory';

/** The only item fields the KPI fallbacks read. */
export interface StatsItem {
  quantity_on_hand?: number | null;
  unit_price?: number | null;
  reorder_point?: number | null;
  item_type?: string | null;
}

export interface StatsTile {
  title: string;
  value: string | number;
  theme: 'default' | 'warning' | 'alert' | 'success';
}

/** Shown in place of a figure the app cannot currently stand behind. */
const UNKNOWN = '—';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const isStocked = (item: StatsItem) => item.item_type === 'Inventory';
const qoh = (item: StatsItem) => Number(item.quantity_on_hand || 0);

/**
 * The four inventory KPI tiles.
 *
 * When the summary fetch fails, every tile reads as unknown rather than
 * falling back to a locally-computed figure. The client cannot know whether
 * `items` is itself stale or left over from a previous company after a role
 * switch, and a precise wrong number does more damage than a visible gap.
 * Fallbacks apply only WITHIN a successful response, for a summary that is
 * missing a field — and each one computes exactly what the server computes,
 * so a number means the same thing whichever path produced it.
 */
export function buildInventoryStatsView(input: {
  summary: InventorySummary | null;
  items: StatsItem[];
  summaryLoading: boolean;
  summaryError: string | null;
}): {
  status: 'loading' | 'error' | 'ready';
  tiles: StatsTile[];
  errorLabel: string;
} {
  const { summary, items, summaryLoading, summaryError } = input;
  const errorLabel = "Couldn't load inventory summary";

  if (summaryError) {
    return {
      status: 'error',
      tiles: [
        { title: 'Unique Items / Total QOH', value: UNKNOWN, theme: 'default' },
        { title: 'Low Stock Alerts', value: UNKNOWN, theme: 'default' },
        { title: 'Out of Stock', value: UNKNOWN, theme: 'default' },
        { title: 'Inventory Value', value: UNKNOWN, theme: 'default' }
      ],
      errorLabel
    };
  }

  if (summaryLoading && !summary) {
    return { status: 'loading', tiles: [], errorLabel };
  }

  const uniqueItems = summary?.unique_items ?? summary?.total_items ?? items.length;

  // Server sums on-hand over item_type="Inventory" only.
  const totalQoh = summary?.total_quantity_on_hand ?? items.filter(isStocked).reduce((sum, i) => sum + qoh(i), 0);

  // NO FALLBACK (ALL-98). This used to reduce over `items`, which is the
  // CURRENT PAGE of the inventory list, not the catalogue — so the tile showed
  // a smaller number than the server's whenever the summary was missing the
  // field, and the merchant got a third answer to a question that already had
  // two. A count computed from a page is not a count of the shop, however
  // correct its predicate, so the tile now says so instead of guessing.
  const lowStock = summary?.low_stock ?? UNKNOWN;

  const outOfStock = summary?.out_of_stock ?? items.filter((i) => isStocked(i) && qoh(i) === 0).length;

  // `!= null`, not truthiness: a real valuation of 0 must render as $0.00
  // rather than falling through to the items list.
  const totalValue =
    summary?.inventory_value != null
      ? Number(summary.inventory_value)
      : items.reduce((sum, i) => sum + Number(i.unit_price || 0) * qoh(i), 0);

  return {
    status: 'ready',
    tiles: [
      { title: 'Unique Items / Total QOH', value: `${uniqueItems} / ${totalQoh}`, theme: 'default' },
      { title: 'Low Stock Alerts', value: lowStock, theme: lowStock === 0 ? 'default' : 'warning' },
      { title: 'Out of Stock', value: outOfStock, theme: outOfStock === 0 ? 'default' : 'alert' },
      { title: 'Inventory Value', value: currency.format(totalValue || 0), theme: totalValue === 0 ? 'default' : 'success' }
    ],
    errorLabel
  };
}
