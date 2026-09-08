import type { Order } from '../types/pos.types';

/**
 * The clerk-facing half of the refund flow: may this order be refunded, and
 * what do we say afterwards.
 *
 * Kept pure and separate from the drawer for the same reason
 * `recentOrdersView` is: the wrong words here cost real money. A clerk who is
 * told "Refunded" hands the goods back and closes the till; if the card refund
 * has only been *accepted* by Stripe, the money lands days later and may still
 * fail. So nothing in here says "refunded" until settlement is a fact.
 */

export interface RefundEligibility {
  canRefund: boolean;
  /** Empty when refundable; otherwise something a clerk can read to a customer. */
  reason: string;
}

export function refundEligibility(order: Order): RefundEligibility {
  switch (order.status) {
    case 'completed':
    case 'partially_refunded':
      // Partially refunded orders keep their remaining balance refundable; the
      // server is the authority on how much is left.
      return { canRefund: true, reason: '' };
    case 'refunded':
      return { canRefund: false, reason: 'This order has already been fully refunded.' };
    case 'voided':
      return { canRefund: false, reason: 'This order was voided, so there is nothing to refund.' };
    case 'draft':
    default:
      return { canRefund: false, reason: 'This order has not completed yet.' };
  }
}

/** The workflow state from the refund API — OUR state, not Stripe's status. */
export type RefundWorkflowState =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'executing'
  | 'pending_settlement'
  | 'settled'
  | 'refund_failed'
  | 'canceled';

export interface RefundOutcome {
  state: RefundWorkflowState | string;
  method: 'card' | 'store_credit' | 'cash' | string;
  /** Minor units, as the API returns it. */
  amount: number;
}

const money = (minor: number) => `$${(minor / 100).toFixed(2)}`;

/**
 * What to tell the clerk once the API has answered.
 *
 * The card case is the one that matters: `pending_settlement` means Stripe
 * accepted the instruction, nothing more. "Refund initiated" is true; "Refunded"
 * is not, and would be a promise we cannot keep.
 */
export function refundResultCopy(outcome: RefundOutcome): string {
  const amount = money(outcome.amount);

  if (outcome.state === 'pending_approval') {
    return `${amount} refund needs manager approval before it can be sent.`;
  }
  if (outcome.state === 'refund_failed') {
    return `The ${amount} refund did not go through. Offer store credit or cash instead.`;
  }

  if (outcome.method === 'store_credit') {
    return `${amount} issued as store credit.`;
  }
  if (outcome.method === 'cash') {
    return `${amount} returned in cash from the drawer.`;
  }

  if (outcome.state === 'settled') {
    return `${amount} refunded to the original card.`;
  }
  // Everything still in flight — the honest, specific promise.
  return `Refund initiated — ${amount} back on the original card in 5–10 business days.`;
}

/** Narrow shape of an axios-style failure, so this stays testable without axios. */
interface HttpishError {
  response?: { status?: number; data?: { detail?: string } };
}

/**
 * Turn a failure into something a clerk can act on.
 *
 * A network failure must never read as "the refund failed": we do not know
 * that, and a clerk who believes it will refund a second time.
 */
export function refundErrorCopy(error: unknown): string {
  const res = (error as HttpishError)?.response;
  const detail = res?.data?.detail;

  if (res?.status === 409) {
    return detail || 'This charge is under an open dispute and cannot be refunded. Respond to the dispute instead.';
  }
  if (res?.status === 403) {
    return 'You do not have permission to take refunds. Ask a manager.';
  }
  if (res?.status === 404) {
    return 'This order could not be found for your store.';
  }
  if (detail) {
    // 400s from the refund path are already written for a person to read.
    return detail;
  }
  return "Couldn't reach the server, so we don't know whether the refund went through. Check Recent Orders before trying again.";
}
