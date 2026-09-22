import type { Order } from '../types/pos.types';
import type { PosRefundListItem } from 'api/stripe.api';

/**
 * Loading / empty / error discipline for the Refunds page (ALL-103).
 *
 * The same rule `buildRecentOrdersView` exists for, applied to the two lists on
 * the Refunds page: a FAILED FETCH MUST NEVER RENDER AS "NOTHING FOUND".
 *
 * On the lookup that reads as "we have no record of that receipt", and the
 * clerk sends a customer away with goods they are owed money for. On the
 * history it reads as "this receipt has never been refunded", and the clerk
 * refunds it a second time. Both are the error state wearing the empty state's
 * clothes, which is why the two are separate `status` values here and not a
 * single `items.length === 0` check at the call site.
 *
 * Rows that already loaded stay on screen when a REFRESH fails — a stale list
 * with a warning is more useful than a blank page, and the caller renders the
 * warning off `isStale`.
 */

export type ListStatus = 'idle' | 'loading' | 'error' | 'empty' | 'list';

interface ListViewInput {
  isLoading: boolean;
  isError: boolean;
  /** False before the clerk has searched at all — 'idle', not 'empty'. */
  hasQuery?: boolean;
}

function resolveStatus(rowCount: number, input: ListViewInput): ListStatus {
  const { isLoading, isError, hasQuery = true } = input;
  if (!hasQuery && rowCount === 0 && !isLoading) return 'idle';
  if (isLoading && rowCount === 0) return 'loading';
  // Order matters: error is checked before empty, so a failed fetch with no
  // rows is 'error'. Reversing these two lines is the whole bug.
  if (isError && rowCount === 0) return 'error';
  if (rowCount === 0) return 'empty';
  return 'list';
}

export interface SalesSearchView {
  status: ListStatus;
  sales: Order[];
  /** Rows are on screen but the last refresh failed — show a warning, keep the rows. */
  isStale: boolean;
  idleLabel: string;
  emptyLabel: string;
  errorLabel: string;
}

export function buildSalesSearchView(input: ListViewInput & { items: Order[] }): SalesSearchView {
  const sales = input.items;
  const status = resolveStatus(sales.length, input);
  return {
    status,
    sales,
    isStale: input.isError && sales.length > 0,
    idleLabel: 'Search by receipt number or customer name to find the sale being returned.',
    // Says what to try next, and does not assert the sale does not exist —
    // the filters (refundable-only, a date window) are the likelier reason.
    emptyLabel: 'No sales match that search. Check the date range, or clear “refundable only” to include sales already fully returned.',
    errorLabel: "Couldn't run that search. This does not mean the sale doesn't exist — try again before telling the customer."
  };
}

export interface RefundHistoryView {
  status: ListStatus;
  refunds: PosRefundListItem[];
  isStale: boolean;
  idleLabel: string;
  emptyLabel: string;
  errorLabel: string;
}

export function buildRefundHistoryView(input: ListViewInput & { items: PosRefundListItem[]; pendingOnly?: boolean }): RefundHistoryView {
  const refunds = input.items;
  const status = resolveStatus(refunds.length, { ...input, hasQuery: true });
  return {
    status,
    refunds,
    isStale: input.isError && refunds.length > 0,
    idleLabel: '',
    emptyLabel: input.pendingOnly ? 'No refunds are waiting for approval.' : 'No refunds have been taken at this store yet.',
    errorLabel: "Couldn't load refund history. This does not mean nothing has been refunded — try again before taking another refund."
  };
}
