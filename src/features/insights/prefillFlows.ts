// The two flows that open a place to act with the work done (owner trust T16, design 4.9):
//
//   purchase_order  make draft orders from the card's open reorder suggestions, then open the editor
//   markdown        open the price review
//
// Neither sends anything to a vendor or changes a price on its own. An order is a DRAFT she submits in the
// editor; a price changes only when she approves it in the review.
//
// Each flow answers one of three things (runPrimaryAction reads them):
//   'done'      the draft exists, or she approved, or she took the list away: the card is acted on
//   'stopped'   a request failed or she cancelled: nothing is marked
//   'navigate'  nothing here can be prefilled for this card (no suggestion, no items, another kind, no
//               answer from the server): the card behaves as it did before
//
// The host supplies the requests and the two screens. Nothing here imports axios.

import type { Recommendation } from './types';
import { buildCreatePoRequest, buildOrdersSummary, readAction, type MarkdownAction, type OrdersSummary } from './actionPrefill';

export type PrefillResult = 'done' | 'stopped' | 'navigate';

/** What the price review hands back: `done` when she approved or took the list; `sentence` says what happened. */
export interface ReviewResult {
  done: boolean;
  sentence: string | null;
}

export interface PrefillHost {
  fetchAction: (recommendationId: string) => Promise<unknown>;
  createPurchaseOrders: (body: unknown) => Promise<unknown>;
  /** Opens the price review and resolves when she closes it. */
  reviewMarkdown: (action: MarkdownAction) => Promise<ReviewResult>;
  /** Shows the draft orders made and what was left out; resolves when she closes it. */
  showOrders: (summary: OrdersSummary) => Promise<void>;
  navigate: (to: string) => void;
  notify: (message: string, variant?: 'info' | 'error' | 'success') => void;
}

export const ORDER_FAILED = 'Allyvia could not make the order. Nothing was changed.';

type PrefillRec = Pick<Recommendation, 'id' | 'recommendationId'>;

const loadAction = async (rec: PrefillRec, host: PrefillHost) => {
  if (!rec.recommendationId) return null;
  try {
    return readAction(await host.fetchAction(rec.recommendationId));
  } catch {
    return null;
  }
};

export const prefillPurchaseOrder = async (rec: PrefillRec, host: PrefillHost): Promise<PrefillResult> => {
  const action = await loadAction(rec, host);
  if (!action || action.kind !== 'purchase_order') return 'navigate';
  const request = buildCreatePoRequest(action.items);
  if (!request) return 'navigate';

  let body: unknown;
  try {
    body = await host.createPurchaseOrders(request);
  } catch {
    host.notify(ORDER_FAILED, 'error');
    return 'stopped';
  }
  const summary = buildOrdersSummary(action, body);
  if (summary.orders.length === 0) {
    host.notify('No draft orders were made. Check the vendors on these items.', 'error');
    return 'stopped';
  }
  if (summary.direct) {
    host.navigate(summary.orders[0].route);
    return 'done';
  }
  await host.showOrders(summary);
  return 'done';
};

export const prefillMarkdown = async (rec: PrefillRec, host: PrefillHost): Promise<PrefillResult> => {
  const action = await loadAction(rec, host);
  if (!action || action.kind !== 'markdown' || action.items.length === 0) return 'navigate';
  const result = await host.reviewMarkdown(action);
  if (!result.done) return 'stopped';
  if (result.sentence) host.notify(result.sentence, 'success');
  return 'done';
};
