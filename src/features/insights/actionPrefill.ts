// What a card's main button opens, with the work already filled in (owner trust T16, design 4.9).
//
// Pure: no React, no axios. The backend builds the payload from stored columns
// (agent/actions.py); everything here decides what to do with it: the create-po
// request, the "2 draft orders made" sentence, the markdown review's arithmetic
// and validity, what Approve sends, and the list she copies when a connected
// POS sets her prices.
//
// Money is handled in whole cents. The words are the owner's: no keys, no
// formulas, no em dashes.
//
// A price is never prefilled from the card's sentence. `suggestedPrice` is null
// until the engine computes one, and the field then starts empty.

import { inventoryHref } from 'views/inventory/tabs';
import { createPoPayload, readCreatedPurchaseOrders, type CreatedPurchaseOrder } from 'views/inventory/reorder';

export const ALLYVIA = 'allyvia';
export const QUICK_PERCENTS = [10, 20, 30] as const;

// --- the payload ----------------------------------------------------------------------------------

export type OrderItemState = 'suggested' | 'ordered' | 'no_suggestion';

export interface OrderItem {
  itemId: number;
  productId: string | null;
  name: string;
  sku: string;
  size: string;
  color: string;
  storeName: string | null;
  suggestionId: string | null;
  /** The reorder suggestion's stored quantity; null when the item has no open suggestion. */
  suggestedQty: number | null;
  vendorName: string | null;
  state: OrderItemState;
}

export interface MarkdownRow {
  itemIds: number[];
  name: string;
  sku: string;
  variantCount: number;
  /** Decimal string, "60.00". */
  price: string;
  /** Present for an admin or the owner, and only when the cost is known. */
  cost: string | null;
  onHand: number;
  /** Null until the engine computes a markdown price (it does not today). */
  suggestedPrice: string | null;
}

interface ActionBase {
  recommendationId: string;
  /** 'allyvia' when Allyvia is the till, else the connected POS's name. */
  priceApply: string;
}

export type RecommendationAction =
  | (ActionBase & { kind: 'purchase_order'; items: OrderItem[] })
  | (ActionBase & { kind: 'markdown'; items: MarkdownRow[] })
  | (ActionBase & { kind: 'none' });

export type PurchaseOrderAction = Extract<RecommendationAction, { kind: 'purchase_order' }>;
export type MarkdownAction = Extract<RecommendationAction, { kind: 'markdown' }>;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const int = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) ? v : null);

const readOrderItem = (raw: unknown): OrderItem | null => {
  if (!isObject(raw)) return null;
  const itemId = int(raw.item_id);
  if (itemId === null) return null;
  const state: OrderItemState = raw.state === 'suggested' || raw.state === 'ordered' ? raw.state : 'no_suggestion';
  const suggestionId = strOrNull(raw.suggestion_id);
  const qty = int(raw.suggested_qty);
  return {
    itemId,
    productId: strOrNull(raw.product_id),
    name: str(raw.name),
    sku: str(raw.sku),
    size: str(raw.size),
    color: str(raw.color),
    storeName: strOrNull(raw.store_name),
    // A quantity only travels with a suggestion; anything else reads as no quantity.
    suggestionId,
    suggestedQty: state === 'suggested' && suggestionId && qty !== null && qty >= 0 ? qty : null,
    vendorName: strOrNull(raw.vendor_name),
    state
  };
};

const readMarkdownRow = (raw: unknown): MarkdownRow | null => {
  if (!isObject(raw) || !Array.isArray(raw.item_ids)) return null;
  const itemIds = raw.item_ids.filter((id): id is number => typeof id === 'number' && Number.isInteger(id));
  if (itemIds.length === 0 || toCents(raw.price) === null) return null;
  return {
    itemIds,
    name: str(raw.name),
    sku: str(raw.sku),
    variantCount: int(raw.variant_count) ?? itemIds.length,
    price: str(raw.price),
    cost: toCents(raw.cost) === null ? null : str(raw.cost),
    onHand: int(raw.on_hand) ?? 0,
    suggestedPrice: toCents(raw.suggested_price) === null ? null : str(raw.suggested_price)
  };
};

/** The action route's body, or null when it is not one (the card then navigates as it does today). */
export const readAction = (body: unknown): RecommendationAction | null => {
  if (!isObject(body)) return null;
  const recommendationId = str(body.recommendation_id);
  const priceApply = str(body.price_apply) || ALLYVIA;
  if (!recommendationId) return null;
  const items = Array.isArray(body.items) ? body.items : [];
  if (body.kind === 'purchase_order') {
    return {
      kind: 'purchase_order',
      recommendationId,
      priceApply,
      items: items.map(readOrderItem).filter((i): i is OrderItem => i !== null)
    };
  }
  if (body.kind === 'markdown') {
    return {
      kind: 'markdown',
      recommendationId,
      priceApply,
      items: items.map(readMarkdownRow).filter((r): r is MarkdownRow => r !== null)
    };
  }
  return { kind: 'none', recommendationId, priceApply };
};

// --- money in cents -------------------------------------------------------------------------------

/** "60.00" or 60 to 6000; null for anything that is not a plain amount. */
export const toCents = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value * 100) : null;
  if (typeof value !== 'string') return null;
  const m = /^\s*\$?\s*(\d+)(?:\.(\d{1,2}))?\s*$/.exec(value);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0') || 0);
};

export const fromCents = (cents: number): string => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;

export const dollars = (value: string): string => {
  const cents = toCents(value);
  return cents === null ? value : `$${Math.floor(cents / 100).toLocaleString('en-US')}.${String(cents % 100).padStart(2, '0')}`;
};

/** The price after `percent` off, to the cent (half a cent rounds up); null when the price is not an amount. */
export const percentOff = (price: string, percent: number): string | null => {
  const cents = toCents(price);
  if (cents === null || !Number.isFinite(percent) || percent <= 0 || percent >= 100) return null;
  return fromCents(Math.round((cents * (100 - percent)) / 100));
};

// --- purchase orders ------------------------------------------------------------------------------

/** The open suggestions behind the card, each once. */
export const orderableSuggestionIds = (items: readonly OrderItem[]): string[] => [
  ...new Set(items.filter((i) => i.state === 'suggested' && i.suggestionId).map((i) => i.suggestionId as string))
];

/** POST reorder-suggestions/create-po/, or null when no item has a suggestion. */
export const buildCreatePoRequest = (items: readonly OrderItem[]) => {
  const ids = orderableSuggestionIds(items);
  return ids.length ? createPoPayload(ids) : null;
};

export interface DraftOrderLink {
  id: string | null;
  label: string;
  route: string;
  vendorName: string | null;
}

export interface LeftOutRow {
  key: string;
  name: string;
  reason: string;
  /** Set only when the owner can fix it: the style's page to pick a vendor on. */
  fix: { label: string; href: string } | null;
}

export interface OrdersSummary {
  orders: DraftOrderLink[];
  leftOut: LeftOutRow[];
  sentence: string;
  /** One order and nothing left out: go straight to the editor. */
  direct: boolean;
}

export const NO_VENDOR_FIX = 'Set a vendor on this item first';
export const DRAFTS_NOT_SENT = 'Nothing has been sent to a vendor. You submit each order yourself.';

export const ordersSentence = (orders: readonly Pick<DraftOrderLink, 'vendorName'>[]): string => {
  if (orders.length === 1) return '1 draft order made.';
  const vendors = new Set(orders.map((o) => (o.vendorName ?? '').trim().toLowerCase()));
  return vendors.size === orders.length
    ? `${orders.length} draft orders made, one per vendor.`
    : `${orders.length} draft orders made, one per vendor and store.`;
};

const itemWords = (item: Pick<OrderItem, 'name' | 'size' | 'color'>): string => {
  const extra = [item.color, item.size].filter(Boolean).join(' ');
  return extra && !item.name.toLowerCase().includes(extra.toLowerCase()) ? `${item.name} (${extra})` : item.name;
};

/** Where she picks the item's vendor: Stock, Styles, searched for this item (the style's page has the Vendor picker). */
export const vendorFixHref = (item: { sku: string; name: string }): string =>
  inventoryHref('stock', 'styles', { q: item.sku || item.name });

interface Skip {
  suggestionId: string;
  code: string;
  name: string;
  sku: string;
  productId: string | null;
}

/** create-po's `skipped` list, whatever shape an older server sends. */
export const readSkipped = (body: unknown): Skip[] => {
  const rows = isObject(body) && Array.isArray(body.skipped) ? body.skipped : [];
  return rows.filter(isObject).map((row) => ({
    suggestionId: str(row.suggestion_id),
    code: str(row.code) || (row.reason === 'no_supplier' ? 'no_vendor' : 'not_live'),
    name: str(row.name),
    sku: str(row.sku),
    productId: strOrNull(row.product_id)
  }));
};

/** What create-po made and what it could not, in her words. Items with no suggestion are said too. */
export const buildOrdersSummary = (action: PurchaseOrderAction, createBody: unknown): OrdersSummary => {
  const created: CreatedPurchaseOrder[] = readCreatedPurchaseOrders(createBody);
  const orders: DraftOrderLink[] = created.map((order) => ({
    id: order.id,
    label: order.supplierName ? `${order.supplierName}, ${order.reference}` : order.reference,
    route: order.route,
    vendorName: order.supplierName
  }));
  const byId = new Map(action.items.filter((i) => i.suggestionId).map((i) => [i.suggestionId as string, i]));
  const leftOut: LeftOutRow[] = [];
  const said = new Set<string>();
  readSkipped(createBody).forEach((skip) => {
    const item = byId.get(skip.suggestionId);
    const name = item ? itemWords(item) : skip.name || skip.sku || 'This item';
    said.add(skip.suggestionId);
    if (skip.code === 'no_vendor') {
      leftOut.push({
        key: skip.suggestionId,
        name,
        reason: `${name} has no vendor yet.`,
        fix: { label: NO_VENDOR_FIX, href: vendorFixHref({ sku: skip.sku || item?.sku || '', name: skip.name || item?.name || '' }) }
      });
    } else if (skip.code === 'already_ordered') {
      leftOut.push({ key: skip.suggestionId, name, reason: `${name} is already on an order.`, fix: null });
    } else {
      leftOut.push({ key: skip.suggestionId, name, reason: `${name} is no longer suggested.`, fix: null });
    }
  });
  action.items.forEach((item) => {
    if (item.suggestionId && said.has(item.suggestionId)) return;
    if (item.state === 'ordered')
      leftOut.push({ key: `item-${item.itemId}`, name: itemWords(item), reason: `${itemWords(item)} is already on an order.`, fix: null });
    else if (item.state === 'no_suggestion')
      leftOut.push({
        key: `item-${item.itemId}`,
        name: itemWords(item),
        reason: `${itemWords(item)} has no order suggested right now.`,
        fix: null
      });
  });
  return {
    orders,
    leftOut,
    sentence: orders.length ? ordersSentence(orders) : 'No draft orders were made.',
    direct: orders.length === 1 && leftOut.length === 0
  };
};

// --- the markdown review --------------------------------------------------------------------------

export const rowKey = (row: Pick<MarkdownRow, 'itemIds'>): string => row.itemIds.join(',');

export interface Draft {
  value: string;
  /** She ticked "sell below cost" for this row. */
  belowCostOk: boolean;
}

export type PriceStatus = 'empty' | 'invalid' | 'not_a_drop' | 'below_cost' | 'ok';

export interface PriceCheck {
  status: PriceStatus;
  /** What to say under the field; null when there is nothing to say. */
  message: string | null;
  /** True when Approve must wait: a typed price that cannot be sent as it stands. */
  blocking: boolean;
  /** The price in cents when it parsed. */
  cents: number | null;
}

export const checkPrice = (row: MarkdownRow, draft: Draft | undefined): PriceCheck => {
  const value = (draft?.value ?? '').trim();
  if (value === '') return { status: 'empty', message: null, blocking: false, cents: null };
  const cents = toCents(value);
  if (cents === null) return { status: 'invalid', message: 'Type a price like 48.00.', blocking: true, cents: null };
  if (cents <= 0) return { status: 'invalid', message: 'The new price must be more than zero.', blocking: true, cents };
  const now = toCents(row.price) as number;
  if (cents >= now)
    return { status: 'not_a_drop', message: `The new price must be below the price now (${dollars(row.price)}).`, blocking: true, cents };
  const cost = toCents(row.cost);
  if (cost !== null && cents < cost) {
    return {
      status: 'below_cost',
      message: `Below what it cost you (${dollars(row.cost as string)}). Tick the box to sell below cost.`,
      blocking: !draft?.belowCostOk,
      cents
    };
  }
  return { status: 'ok', message: null, blocking: false, cents };
};

/** A quick button's price for this row, or null when the price is not an amount. */
export const quickPrice = (row: MarkdownRow, percent: number): string | null => percentOff(row.price, percent);

/** The field's starting text: the API's suggested price when it sent one, else empty. */
export const startingDrafts = (rows: readonly MarkdownRow[]): Record<string, Draft> =>
  Object.fromEntries(rows.map((row) => [rowKey(row), { value: row.suggestedPrice ?? '', belowCostOk: false }]));

export interface PriceChangeItem {
  item_id: number;
  new_price: string;
  confirm_below_cost?: true;
}

export interface PriceChangeBody {
  recommendation_id: string;
  items: PriceChangeItem[];
}

export interface Approval {
  /** At least one valid new price and no typed price left that cannot be sent. */
  canApprove: boolean;
  /** Rows with a price she typed that cannot be sent as it stands. */
  problems: number;
  /** Rows that will change. */
  changedRows: number;
  body: PriceChangeBody | null;
}

/** What Approve sends: only the rows with a valid new price, each variant once. Rows left empty are not touched. */
export const buildApproval = (action: MarkdownAction, drafts: Readonly<Record<string, Draft>>): Approval => {
  const items: PriceChangeItem[] = [];
  let problems = 0;
  let changedRows = 0;
  action.items.forEach((row) => {
    const draft = drafts[rowKey(row)];
    const check = checkPrice(row, draft);
    if (check.blocking) problems += 1;
    if (check.status === 'empty' || check.blocking || check.cents === null) return;
    changedRows += 1;
    row.itemIds.forEach((itemId) =>
      items.push({
        item_id: itemId,
        new_price: fromCents(check.cents as number),
        ...(check.status === 'below_cost' && draft?.belowCostOk ? { confirm_below_cost: true as const } : {})
      })
    );
  });
  const canApprove = items.length > 0 && problems === 0;
  return { canApprove, problems, changedRows, body: canApprove ? { recommendation_id: action.recommendationId, items } : null };
};

export const appliedSentence = (changedItems: number): string =>
  changedItems === 0 ? 'Those prices were already set.' : `${changedItems} ${changedItems === 1 ? 'price' : 'prices'} changed.`;

/** `changed` and `unchanged` counts from the price-changes answer. */
export const readPriceChangeResult = (body: unknown): { changed: number; unchanged: number } => ({
  changed: isObject(body) && Array.isArray(body.changed) ? body.changed.length : 0,
  unchanged: isObject(body) && Array.isArray(body.unchanged) ? body.unchanged.length : 0
});

export interface PriceChangeFailure {
  status: number | null;
  sentence: string;
  /** Messages by item id for the rows the server marked. */
  byItem: Record<number, string>;
}

export const GENERIC_PRICE_FAILURE = 'Allyvia could not change the prices. Nothing was changed. Try again.';

/** An axios-style error from the price-changes call, in her words. */
export const readPriceChangeFailure = (err: unknown): PriceChangeFailure => {
  const response = (err as { response?: { status?: number; data?: unknown } } | null)?.response;
  const data = response?.data;
  const status = typeof response?.status === 'number' ? response.status : null;
  const byItem: Record<number, string> = {};
  if (isObject(data) && Array.isArray(data.errors)) {
    data.errors.filter(isObject).forEach((e) => {
      const id = int(e.item_id);
      if (id !== null && typeof e.detail === 'string') byItem[id] = e.detail;
    });
  }
  const sentence = isObject(data) && typeof data.detail === 'string' && data.detail ? data.detail : GENERIC_PRICE_FAILURE;
  return { status, sentence, byItem };
};

// --- when a connected POS sets her prices ----------------------------------------------------------

export const isAllyviaTill = (priceApply: string): boolean => priceApply === ALLYVIA;

export const posSentence = (posName: string): string => `Your prices are set in ${posName}. Change them there.`;

/** The list she takes to her register: each item, the price now, and the price she typed when she typed one. */
export const copyListText = (action: MarkdownAction, drafts: Readonly<Record<string, Draft>>): string =>
  action.items
    .map((row) => {
      const typed = checkPrice(row, drafts[rowKey(row)]);
      const head = `${row.name}${row.sku ? ` (${row.sku})` : ''}: now ${dollars(row.price)}`;
      return typed.cents !== null && typed.status !== 'invalid' ? `${head}, new ${dollars(fromCents(typed.cents))}` : head;
    })
    .join('\n');
