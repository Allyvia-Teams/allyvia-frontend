// views/inventory/today.ts
//
// Today's rules, as pure functions (spec §5.4). The agent's inventory rows carry
// no urgency figure of their own, so each is joined to the reorder inbox by
// `signal_sources.suggestion_id` and banded by the inbox's own urgency rule:
//
//   Order now   a live suggestion inside its lead time (reorderUrgency critical)
//   This week   every other reorder row (dismissed, superseded, not found),
//               transfers, event rows, rows with no signal, and EVERY row
//               until the inbox list has arrived
//   Watch       markdowns and frozen buy plans
//
// The server's rank order is kept inside each band; nothing here re-sorts.
// Every function is total over null inputs, because a tile or a band must say
// "not loaded" rather than 0 (ALL-103).

import type { PendingRecommendation } from 'api/agent.api';
import type { OnOrderResponse, PurchaseOrder } from 'api/inventoryPurchasing.api';
import { clockTime } from 'features/insights/fromAgent';
import type { InventorySummary } from 'types/analytics';
import { formatCurrency } from 'utils/financeCalculations';
import { DEFAULT_CURRENCY } from 'utils/inventoryKpis';

import { readBuyPlanRecommendation } from './plan/dashboard';
import { readReorderRecommendation, reorderUrgency, type ReorderSuggestion } from './reorder';

// ---------------------------------------------------------------------------
// Query keys (TanStack): one read per source, shared with the shell where the
// shell already fetches it.
// ---------------------------------------------------------------------------

export const TODAY_OVERVIEW_QUERY_KEY = ['inventory-today', 'overview'] as const;
export const TODAY_INBOX_QUERY_KEY = ['inventory-today', 'inbox'] as const;
export const todayOnOrderQueryKey = (locationId: string | null) => ['inventory-today', 'on-order', locationId ?? ''] as const;

// ---------------------------------------------------------------------------
// Bands
// ---------------------------------------------------------------------------

export type TodayBand = 'order_now' | 'this_week' | 'watch';

export const BAND_ORDER: readonly TodayBand[] = ['order_now', 'this_week', 'watch'];

export const BAND_LABELS: Record<TodayBand, string> = {
  order_now: 'Order now',
  this_week: 'This week',
  watch: 'Watch'
};

type InboxRows = ReadonlyArray<ReorderSuggestion> | null;

/** The inbox row a recommendation's signal names, or null (no signal, no id, or not in the list). */
const joinedSuggestion = (row: PendingRecommendation, inbox: InboxRows): ReorderSuggestion | null => {
  if (!inbox) return null;
  const { suggestionId } = readReorderRecommendation(row.signal_sources);
  if (!suggestionId) return null;
  return inbox.find((s) => s.id === suggestionId) ?? null;
};

const isLive = (s: ReorderSuggestion | null): s is ReorderSuggestion => s !== null && s.status === 'suggested';

export const bandFor = (row: PendingRecommendation, inbox: InboxRows): TodayBand => {
  // Nothing is sorted until the inbox is here: every row waits in This week.
  if (inbox === null) return 'this_week';
  const joined = joinedSuggestion(row, inbox);
  if (isLive(joined) && reorderUrgency(joined.days_until_stockout, joined.lead_time_days).level === 'critical') return 'order_now';
  if (row.rec_type === 'overstock_markdown' || readBuyPlanRecommendation(row.signal_sources).isBuyPlan) return 'watch';
  return 'this_week';
};

/** Cards grouped by band, in band order, server order kept inside each; empty bands omitted. */
export const bandRows = <T extends { id: string }>(
  cards: readonly T[],
  rows: readonly PendingRecommendation[],
  inbox: InboxRows
): Array<{ band: TodayBand; cards: T[] }> => {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const groups: Record<TodayBand, T[]> = { order_now: [], this_week: [], watch: [] };
  cards.forEach((card) => {
    const row = byId.get(card.id);
    groups[row ? bandFor(row, inbox) : 'this_week'].push(card);
  });
  return BAND_ORDER.filter((band) => groups[band].length > 0).map((band) => ({ band, cards: groups[band] }));
};

// ---------------------------------------------------------------------------
// The supplier bundle line
// ---------------------------------------------------------------------------

export interface SupplierBundle {
  supplierId: string;
  supplierName: string;
  /** The live suggestion ids create-po/ is sent. */
  suggestionIds: string[];
  /** Rows with a live suggestion (the ones the draft will carry). */
  covered: number;
  /** Rows whose suggestion names this supplier, live or not. */
  total: number;
}

/**
 * One bundle per supplier named by two or more of the Order-now rows. create-po/
 * skips a suggestion that is not live, so `covered` counts the rows the draft
 * will actually carry and the line says so when that is fewer than `total`.
 */
export const supplierBundles = (orderNow: readonly PendingRecommendation[], inbox: ReadonlyArray<ReorderSuggestion>): SupplierBundle[] => {
  const bundles = new Map<string, SupplierBundle>();
  orderNow.forEach((row) => {
    const joined = joinedSuggestion(row, inbox);
    if (!joined || !joined.supplier_id) return;
    const bundle = bundles.get(joined.supplier_id) ?? {
      supplierId: joined.supplier_id,
      supplierName: joined.supplier_name?.trim() || 'this supplier',
      suggestionIds: [],
      covered: 0,
      total: 0
    };
    bundle.total += 1;
    if (isLive(joined)) {
      bundle.covered += 1;
      bundle.suggestionIds.push(joined.id);
    }
    bundles.set(joined.supplier_id, bundle);
  });
  return [...bundles.values()].filter((bundle) => bundle.total >= 2);
};

export const bundleLine = (b: SupplierBundle): string => {
  const line = `Draft the ${b.total} ${b.supplierName} lines as one purchase order`;
  return b.covered < b.total ? `${line} (${b.covered} of ${b.total} have a suggestion)` : line;
};

// ---------------------------------------------------------------------------
// The card's primary action
// ---------------------------------------------------------------------------

export type PrimaryAction = { kind: 'draft_po'; suggestionId: string } | { kind: 'default' };

/**
 * Draft a purchase order only for a reorder row whose joined suggestion is live
 * and has a supplier: the inbox's own previewPurchaseOrders rule, which skips a
 * row without one, is why. Everything else keeps the cards' generic flow.
 */
export const primaryActionFor = (row: PendingRecommendation, inbox: InboxRows): PrimaryAction => {
  const joined = joinedSuggestion(row, inbox);
  if (isLive(joined) && joined.supplier_id) return { kind: 'draft_po', suggestionId: joined.id };
  return { kind: 'default' };
};

// ---------------------------------------------------------------------------
// The health strip
// ---------------------------------------------------------------------------

export interface HealthTile {
  key: 'low' | 'out' | 'on_order' | 'arriving' | 'value';
  label: string;
  /** null = the source has not loaded or failed: the tile reads "—" with a Retry, never 0. */
  value: string | null;
  basis: string;
  tone: 'default' | 'warning' | 'error';
}

type OpenOrder = Pick<PurchaseOrder, 'status' | 'expected_at'>;

const isOpen = (order: OpenOrder) => order.status === 'submitted' || order.status === 'partially_received';

/** 'YYYY-MM-DD' as a local calendar day (the field is a date, not an instant). */
const localDay = (iso: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Open orders expected in [today, today + 7); undated open orders are counted apart, for the basis. */
export const arrivingThisWeek = (orders: ReadonlyArray<OpenOrder>, today: Date): { count: number; undated: number } => {
  const from = startOfDay(today).getTime();
  const to = from + 7 * 24 * 60 * 60 * 1000;
  let count = 0;
  let undated = 0;
  orders.filter(isOpen).forEach((order) => {
    const day = order.expected_at ? localDay(order.expected_at) : null;
    if (!day) {
      undated += 1;
      return;
    }
    const at = day.getTime();
    if (at >= from && at < to) count += 1;
  });
  return { count, undated };
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const healthTiles = (
  overview: InventorySummary | null,
  onOrder: OnOrderResponse | null,
  orders: ReadonlyArray<OpenOrder> | null,
  today: Date
): HealthTile[] => {
  const openCount = orders ? orders.filter(isOpen).length : null;
  const arriving = orders ? arrivingThisWeek(orders, today) : null;
  return [
    {
      key: 'low',
      label: 'Low stock',
      value: overview ? String(overview.low_stock_count) : null,
      basis: 'at or below reorder point',
      tone: overview && overview.low_stock_count > 0 ? 'warning' : 'default'
    },
    {
      key: 'out',
      label: 'Out of stock',
      value: overview ? String(overview.out_of_stock_count) : null,
      basis: 'nothing on hand',
      tone: overview && overview.out_of_stock_count > 0 ? 'error' : 'default'
    },
    {
      key: 'on_order',
      label: 'On order',
      value: onOrder ? String(onOrder.total_units) : null,
      basis: openCount === null ? 'units on open orders' : plural(openCount, 'purchase order', 'purchase orders'),
      tone: 'default'
    },
    {
      key: 'arriving',
      label: 'Arriving this week',
      value: arriving ? String(arriving.count) : null,
      basis: arriving && arriving.undated > 0 ? `next 7 days · ${arriving.undated} with no date` : 'next 7 days',
      tone: 'default'
    },
    {
      key: 'value',
      label: 'Value at cost',
      value: overview ? formatCurrency(overview.total_cost_value, DEFAULT_CURRENCY) : null,
      basis: overview ? `${formatCurrency(overview.total_value, DEFAULT_CURRENCY)} at retail` : 'at retail',
      tone: 'default'
    }
  ];
};

// ---------------------------------------------------------------------------
// The subtitle's refresh time
// ---------------------------------------------------------------------------

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * The clock time of the latest row's generated_at, when that is today; else
 * null. The subtitle says "refreshed today at …", so a row from last night
 * must not be dressed up as today's.
 */
export const todayRefreshedAt = (rows: readonly PendingRecommendation[], now: Date = new Date()): string | null => {
  const latest = rows.reduce<string | null>((acc, row) => (!acc || row.generated_at > acc ? row.generated_at : acc), null);
  if (!latest) return null;
  const at = new Date(latest);
  if (Number.isNaN(at.getTime()) || !sameDay(at, now)) return null;
  return clockTime(latest) || null;
};
