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
  /**
   * Withheld under the store's return policy, minor units.
   *
   * `amount` is ALREADY net of this — it is not subtracted again anywhere.
   * The customer is getting `amount`; this is the receipt's own line
   * explaining why that is less than what they paid.
   */
  restocking_fee_minor?: number;
}

const money = (minor: number) => `$${(minor / 100).toFixed(2)}`;

/**
 * The restocking-fee line for a result, or null when there is no fee.
 *
 * Its own line rather than folded into the result sentence: a clerk reading
 * "$45.00 refunded" to a customer who paid $50 needs the $5 to have a stated
 * reason on screen, or the conversation happens without it.
 */
export function restockingFeeLine(outcome: RefundOutcome): string | null {
  const fee = outcome.restocking_fee_minor ?? 0;
  if (fee <= 0) return null;
  return `${money(fee)} restocking fee withheld under the store's return policy.`;
}

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
  response?: { status?: number; data?: { detail?: string; code?: string } };
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
  const code = res?.data?.code;

  // 422 is the store's OWN return policy refusing a well-formed request —
  // final sale, window closed, receipt required, wrong location. The server
  // writes `detail` for the clerk to read to the customer, so it is rendered
  // verbatim: paraphrasing it here would put two different sentences about
  // the same rule in front of two different people.
  if (res?.status === 422) {
    return detail || 'The store’s return policy does not allow this refund.';
  }
  if (res?.status === 409) {
    return detail || 'This charge is under an open dispute and cannot be refunded. Respond to the dispute instead.';
  }
  if (res?.status === 403) {
    // Not a permissions problem, and must not read as one: this manager may
    // approve refunds, just not THIS one, because they are the person who
    // rang it. Telling them to "ask a manager" when they are the manager is
    // how a clerk ends up hunting for a permission that is already granted.
    if (code === 'same_identity') {
      return 'A different manager has to approve this refund.';
    }
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

export interface RefundStateChip {
  label: string;
  color: 'default' | 'info' | 'warning' | 'success' | 'error';
}

/**
 * How one refund's workflow state is shown in a list.
 *
 * The distinction that matters is `pending_settlement` vs `settled`. Stripe has
 * accepted the instruction in the first and the money has actually moved in the
 * second, and they can be days apart. Labelling the first "Refunded" is the
 * same false promise `refundResultCopy` exists to avoid, so it says "Sent" —
 * true, and visibly not the same word as the terminal state.
 *
 * An unknown state is shown verbatim rather than mapped to a default: the
 * server owns this vocabulary, and quietly relabelling a state we have not
 * heard of would understate what happened to someone's money.
 */
export function refundStateChip(state: string): RefundStateChip {
  switch (state) {
    case 'draft':
      return { label: 'Draft', color: 'default' };
    case 'pending_approval':
      return { label: 'Awaiting approval', color: 'warning' };
    case 'approved':
      return { label: 'Approved', color: 'info' };
    case 'executing':
      return { label: 'Sending', color: 'info' };
    case 'pending_settlement':
      return { label: 'Sent', color: 'info' };
    case 'settled':
      return { label: 'Refunded', color: 'success' };
    case 'refund_failed':
      return { label: 'Failed', color: 'error' };
    case 'canceled':
      return { label: 'Canceled', color: 'default' };
    default:
      return { label: state, color: 'default' };
  }
}

/**
 * Whether a failure is the "you rang it, so you cannot approve it" refusal.
 *
 * Callers need this to decide how loudly to show the message: it is a normal,
 * expected step in a two-person flow, not a fault. Checked off the server's
 * `code` rather than by matching the copy, so rewording `refundErrorCopy`
 * cannot silently change how the failure is presented.
 */
export function isSameIdentityError(error: unknown): boolean {
  const res = (error as HttpishError)?.response;
  return res?.status === 403 && res?.data?.code === 'same_identity';
}
