// Dismiss with undo, as a pure state machine (S3). The container keeps a
// DismissState and runs every user action through runDismissAction, which
// returns the next state and hands any dismissal that is now final to `send`
// (dismissInsight in the app, a spy in tests).
//
//   dismiss  the card leaves the list at once (its id joins dismissedIds) and
//            becomes the pending dismissal behind the undo toast. A dismissal
//            already pending is final at that moment and is sent first.
//   reason   records (or clears) the reason on the pending dismissal.
//   undo     puts the pending card back. Nothing is sent.
//   commit   the toast timed out (or was closed): the pending dismissal is
//            sent with its reason. A commit for any other id is stale and
//            ignored, so a late timeout can never send twice.
//   failed   a final dismissal's send was rejected (S6): the card comes back.
//            The list is derived from the payload's order, so it returns at
//            the position it left. Nothing is sent. A pending id is ignored.
//
// Nothing here reads a clock: the toast owns the timer and dispatches commit.

import type { FeedbackReasonCode } from 'api/agentFeedback';

import type { Recommendation } from './types';

/**
 * The toast's three reason chips, mapped to the codes the Dashboard's
 * thumbs-down already sends (api/agentFeedback FEEDBACK_REASON_CODES), so the
 * backend files them under the same reasons.
 */
export const DISMISS_REASONS = [
  { code: 'not_relevant', label: 'Not relevant' },
  { code: 'already_doing_it', label: 'Already did this' },
  { code: 'data_looks_wrong', label: 'Numbers look wrong' }
] as const satisfies readonly { code: FeedbackReasonCode; label: string }[];

export type DismissReason = (typeof DISMISS_REASONS)[number]['code'];

export interface PendingDismissal {
  id: string;
  title: string;
  reason: DismissReason | null;
  /** Dismiss came from the keyboard: the toast takes focus so Undo is one keypress away. */
  focusUndo: boolean;
}

export interface DismissState {
  /** Every card off the list, the pending one included. */
  dismissedIds: string[];
  pending: PendingDismissal | null;
}

export type DismissAction =
  | { type: 'dismiss'; rec: Pick<Recommendation, 'id' | 'title'>; focusUndo?: boolean }
  | { type: 'reason'; reason: DismissReason | null }
  | { type: 'undo' }
  | { type: 'commit'; id: string }
  | { type: 'failed'; id: string };

/** A dismissal that is final: what dismissInsight receives. */
export interface FinalDismissal {
  id: string;
  reason: DismissReason | null;
}

export const INITIAL_DISMISS_STATE: DismissState = { dismissedIds: [], pending: null };

const finalOf = ({ id, reason }: PendingDismissal): FinalDismissal => ({ id, reason });

export function reduceDismissal(state: DismissState, action: DismissAction): { state: DismissState; send: FinalDismissal[] } {
  const { pending } = state;
  switch (action.type) {
    case 'dismiss': {
      const { id, title } = action.rec;
      if (pending?.id === id || state.dismissedIds.includes(id)) return { state, send: [] };
      return {
        state: {
          dismissedIds: [...state.dismissedIds, id],
          pending: { id, title, reason: null, focusUndo: Boolean(action.focusUndo) }
        },
        send: pending ? [finalOf(pending)] : []
      };
    }
    case 'reason':
      if (!pending) return { state, send: [] };
      return { state: { ...state, pending: { ...pending, reason: action.reason } }, send: [] };
    case 'undo':
      if (!pending) return { state, send: [] };
      return { state: { dismissedIds: state.dismissedIds.filter((id) => id !== pending.id), pending: null }, send: [] };
    case 'commit':
      if (pending?.id !== action.id) return { state, send: [] };
      return { state: { ...state, pending: null }, send: [finalOf(pending)] };
    case 'failed':
      if (pending?.id === action.id || !state.dismissedIds.includes(action.id)) return { state, send: [] };
      return { state: { ...state, dismissedIds: state.dismissedIds.filter((id) => id !== action.id) }, send: [] };
    default:
      return { state, send: [] };
  }
}

/** Apply one action and send whatever it made final. Returns the next state. */
export function runDismissAction(state: DismissState, action: DismissAction, send: (dismissal: FinalDismissal) => void): DismissState {
  const next = reduceDismissal(state, action);
  for (const dismissal of next.send) send(dismissal);
  return next.state;
}
