/**
 * Where returned goods go — the disposition taxonomy.
 *
 * Mirrors the backend's `refunds/dispositions.py`, which is the ONE place a
 * disposition name maps to a stock movement. The server rejects anything
 * outside this set, so the dialog's chip row is built from here rather than
 * from a second hand-written list that could drift out of agreement with it.
 *
 * Deliberately its OWN module rather than living in `stripe.api.ts`: this is
 * pure data, and the pure refund-maths modules that need it must not drag the
 * axios client (and its browser-only init) into a unit test.
 */

export type RefundDisposition = 'restock' | 'damaged_writeoff' | 'return_to_vendor' | 'quarantine_inspect' | 'discard';

export const REFUND_DISPOSITIONS: RefundDisposition[] = [
  'restock',
  'damaged_writeoff',
  'return_to_vendor',
  'quarantine_inspect',
  'discard'
];

/** The server's own labels (dispositions.py LABELS), so chips read as the backend names them. */
export const REFUND_DISPOSITION_LABELS: Record<RefundDisposition, string> = {
  restock: 'Restock',
  damaged_writeoff: 'Damaged',
  return_to_vendor: 'Return to vendor',
  quarantine_inspect: 'Inspect',
  discard: 'Discard'
};

/**
 * What a line is returned as unless the clerk says otherwise.
 *
 * Restock, matching the server's own default: the common case by far is goods
 * that go straight back on the shelf, and a default of anything else would
 * quietly write off sellable stock on every untouched line.
 */
export const DEFAULT_REFUND_DISPOSITION: RefundDisposition = 'restock';

/** One line of a line-level return. Mirrors serializers.py RefundLineSelection. */
export interface PosRefundLineSelection {
  line_id: string;
  quantity: number;
  disposition: RefundDisposition;
}
