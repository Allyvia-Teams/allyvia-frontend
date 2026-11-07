// Sending a final dismissal (S6). The visit record is written first, so
// /insights/history sees the dismissal at once. If dismissInsight then
// rejects, the dismissal is undone everywhere: the entry leaves the record,
// the page puts the card back (the 'failed' action in dismissals.ts) and a
// toast says so. That toast has no Undo: there is nothing left to undo.

import type { FinalDismissal } from './dismissals';
import { forgetDismissed, recordDismissed, type RecordStorage } from './visitRecord';

export const DISMISS_FAILED_MESSAGE = "Couldn't dismiss. Try again.";

export interface SendDismissalDeps {
  /** dismissInsight in the app. */
  dismiss: (id: string, reason?: string) => Promise<void>;
  /** The visit record's storage (sessionStorage in the app). */
  storage: RecordStorage | null;
  /** The loaded payload's refreshedAt, the record's key; null before a payload loads. */
  refreshedAt: string | null;
  /** Put the card back on the page. */
  onFailed: (id: string) => void;
  /** Shows a short toast. */
  notify: (message: string) => void;
}

export async function sendFinalDismissal(
  { id, reason }: FinalDismissal,
  { dismiss, storage, refreshedAt, onFailed, notify }: SendDismissalDeps
): Promise<'sent' | 'failed'> {
  if (refreshedAt !== null) recordDismissed(storage, refreshedAt, { id, reason });
  try {
    await dismiss(id, reason ?? undefined);
    return 'sent';
  } catch (error) {
    console.warn(`[insights-redesign] dismissInsight(${id}) failed; the card is back`, error);
    if (refreshedAt !== null) forgetDismissed(storage, refreshedAt, id);
    onFailed(id);
    notify(DISMISS_FAILED_MESSAGE);
    return 'failed';
  }
}
