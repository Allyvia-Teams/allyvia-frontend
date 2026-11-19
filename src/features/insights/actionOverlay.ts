// The screen a prefill flow is waiting on (owner trust T16): the price review or the list of draft orders made.
// The controller hook holds one of these in state and the page renders it; closing it resolves the flow.

import type { MarkdownAction, OrdersSummary, PriceChangeBody } from './actionPrefill';
import type { ReviewResult } from './prefillFlows';

export type ActionOverlay =
  | {
      kind: 'markdown';
      action: MarkdownAction;
      /** POST price-changes/. Rejects with the axios error when the server refuses or fails. */
      apply: (body: PriceChangeBody) => Promise<unknown>;
      resolve: (result: ReviewResult) => void;
    }
  | { kind: 'orders'; summary: OrdersSummary; resolve: () => void };
