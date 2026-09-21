import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import { acceptOutreachRecommendation, type BuyingRound, type PerkEvent, type PromotionRule } from 'api/innerCircle.api';
import { PENDING_QUERY_KEY } from 'views/dashboard/RecommendationFeedback';
import type { OutreachKind } from 'views/inner-circle/navigation';
// Layering note: a `ui-component` reaching into `views` for its seam. No
// runtime cycle today (the seam imports back by direct path, never the
// barrel); the follow-up is to move the seam under `ui-component/inner-circle/`
// — Session 6 decides.
import { isPerk, isPromotion, isRound, prefillFor } from 'views/inner-circle/outreachRows';
import PerkDialog from './PerkDialog';
import PromotionDialog from './PromotionDialog';
import StyleVoteDialog from './StyleVoteDialog';

// ==============================|| INNER CIRCLE - OUTREACH COMPOSER ||============================== //
// One host for the three create/edit dialogs, so Outreach.tsx never knows
// which of them is open. It does three things the dialogs cannot do for
// themselves: pick the dialog for a kind, hand it a memoised prefill, and —
// when the outreach was suggested — close the loop back to the recommendation
// that suggested it.

export interface OutreachComposerProps {
  open: boolean;
  kind: OutreachKind;
  /**
   * The row being edited; absent when composing something new.
   *
   * SESSION 5's ACCEPT MUST USE THIS, not `prefill` alone, for a discount
   * card. `outreach_recommender._write` has ALREADY created a real (inactive)
   * `PromotionRule` for every win-back card and bound the recommendation's
   * whole measurement to that rule's codes
   * (`adoption_override.params.promotion_rule_id`). Opening the composer with
   * `existing` null takes `PromotionDialog`'s create branch and makes a
   * SECOND rule: the accept then records the new id while the ledger keeps
   * watching the first, which is inactive forever and mints nothing, so
   * ALL-152 reads a suggestion that worked as never adopted.
   *
   * The id is in the card's `prefill.promotion_rule_id` — deliberately NOT a
   * form key, so `prefillFor` drops it (correctly: it is not a field). Accept
   * resolves it to the rule and passes it HERE, and the dialog then edits and
   * activates the rule the recommender made. Until that lands, the Outreach
   * table marks those rules rather than showing them as owner Drafts — see
   * `fromRecommendation`.
   */
  existing?: PromotionRule | PerkEvent | BuyingRound | null;
  /** Starting values for a NEW piece of outreach; ignored when editing. */
  prefill?: Record<string, unknown> | null;
  /** When set, the recommendation this composer was opened from. */
  recommendationId?: string | null;
  onClose: (saved?: { kind: OutreachKind; id: string }) => void;
}

export default function OutreachComposer({ open, kind, existing, prefill, recommendationId, onClose }: OutreachComposerProps) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  // Memoised, and it has to be: the dialogs re-seed their form whenever this
  // identity changes, so a fresh object each render would overwrite whatever
  // the owner had typed on every keystroke elsewhere in the tree.
  const promotionPrefill = useMemo(() => prefillFor('discount', prefill ?? null), [prefill]);
  const perkPrefill = useMemo(() => prefillFor('event', prefill ?? null), [prefill]);
  const votePrefill = useMemo(() => prefillFor('vote', prefill ?? null), [prefill]);

  // Narrowed with the same structural predicates the status table uses, rather
  // than cast from `kind` — a row whose kind and object disagree then composes
  // a blank NEW item instead of reading fields off the wrong shape.
  const promotion = existing && isPromotion(existing) ? existing : null;
  const perk = existing && isPerk(existing) ? existing : null;
  const round = existing && isRound(existing) ? existing : null;

  const handleSaved = (saved?: { id: string }) => {
    if (!saved) {
      onClose();
      return;
    }
    // The save has already succeeded. Marking the recommendation as used is a
    // separate, later call: if it fails the outreach still exists, so the
    // dialog closes regardless and the failure is reported on its own terms.
    // Re-opening here would invite a duplicate.
    if (recommendationId) {
      acceptOutreachRecommendation(recommendationId, { outreach_kind: kind, outreach_id: saved.id })
        .then(() => {
          // ONE invalidation for three surfaces. `OUTREACH_RECOMMENDATIONS_QUERY_KEY`
          // is `[...PENDING_QUERY_KEY, 'inner-circle']`, and React Query matches
          // by prefix — so invalidating the Dashboard's key also refreshes This
          // week's cards and the Outreach table's suggested marks. Imported
          // rather than retyped: a rename there must move all three at once.
          queryClient.invalidateQueries({ queryKey: PENDING_QUERY_KEY });
        })
        .catch(() => enqueueSnackbar('Saved — but the suggestion it came from could not be marked as used.', { variant: 'warning' }));
    }
    onClose({ kind, id: saved.id });
  };

  return (
    <>
      <PromotionDialog open={open && kind === 'discount'} promotion={promotion} initialValues={promotionPrefill} onClose={handleSaved} />
      <PerkDialog open={open && kind === 'event'} perk={perk} initialValues={perkPrefill} onClose={handleSaved} />
      <StyleVoteDialog open={open && kind === 'vote'} round={round} initialValues={votePrefill} onClose={handleSaved} />
    </>
  );
}
