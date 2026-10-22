/**
 * The close handler for an Inner Circle compose dialog: the backdrop, Escape
 * and Cancel all go through it, and it does nothing while the save is in
 * flight.
 *
 * Both hosts unmount the composer on close, but the save's callbacks belong to
 * the mutation and outlive the dialog. Closed mid-save, a refusal lands as a
 * toast with no form behind it, and a late success runs the host's `onClose`
 * — which records the recommendation accept and closes whatever composer is
 * open by then. `EventPromoDialog` holds the same rule for the same reason.
 *
 * It reads the RENDERED `isPending`, so it holds from the first render after
 * `mutate()`, not from the click: measured at ~40 ms on a loaded machine, too
 * short for a person to press Escape in, and the same gap the Save button's
 * own `disabled={isPending}` has.
 *
 * The returned function takes no arguments on purpose: `onClose(saved?)`
 * reads its first argument as "the save succeeded", and MUI calls a Dialog's
 * `onClose` with `(event, reason)`.
 */
export function closeUnlessSaving(isSaving: boolean, onClose: () => void): () => void {
  return () => {
    if (!isSaving) onClose();
  };
}
