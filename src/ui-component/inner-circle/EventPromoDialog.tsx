import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';

import { fetchOffer, updateEventPromo, type PromotionRule } from 'api/innerCircle.api';
import { PENDING_QUERY_KEY } from 'views/dashboard/RecommendationFeedback';
// Layering note: a `ui-component` reaching into `views` for its seam, as
// PromotionDialog and OutreachComposer already do.
import {
  eventChannelSentence,
  eventFormLocks,
  eventFormState,
  eventFormValid,
  eventRulePatch,
  eventSwitchOnConfirm,
  localTodayISO,
  notificationMayNotArrive,
  OFFER_PREVIEW_HEADING,
  offerPreviewCaption,
  promotionSaveErrorMessage,
  segmentSummary,
  type EventRuleForm,
  type OfferPreviewStatus
} from 'views/inner-circle/eventPromo';
import { OUTREACH_CHANNEL_SENTENCE_EVENT } from './outreachChannel';

// ==============================|| INNER CIRCLE - EVENT PROMO DIALOG ||============================== //
// The composer for an EVENT PROMO (E6): a discount Allyvia prepared for a busy
// event day, for a group of members chosen by their own interests.
//
// A dialog of its own rather than an "event mode" in PromotionDialog, and the
// reason is the payload. PromotionDialog's form narrows a stored scope it does
// not offer (`segment` → `vault`, `event` → `manual`) and its save sends every
// field, which the backend refuses for an event promo ("its audience is
// fixed"). Here the form holds only what may change, and the PATCH is built by
// `eventRulePatch`: the fields the owner changed and nothing else. And there is
// NO CREATE PATH — this file does not import `createPromotion` — because an
// event promo is never made by hand.
//
// Composition only: every rule and every sentence is in `eventPromo.ts`.

export interface EventPromoDialogProps {
  open: boolean;
  /** The prepared rule. Always present: there is nothing to create. */
  rule: PromotionRule;
  /** The linked offer, when the card named it — shown as a preview. */
  offerId?: string | null;
  /**
   * This save switches the promo ON (the This-week accept). The Outreach row
   * edit leaves it unset: renaming a draft from the table must never send it.
   */
  activateOnSave?: boolean;
  /**
   * Opened from the Outreach table: the row's mark (`eventFormLocks`). A
   * prepared draft is held while its suggestion is open on This week (`true`)
   * or This week has not loaded (`null`), and editable with no open card
   * (`false`). Absent when opened from a card.
   */
  tableMark?: boolean | null;
  /** `saved` only after a successful save; `rule` is the server's answer. */
  onClose: (saved?: { id: string; rule: PromotionRule }) => void;
}

const DATE_FIELD_PROPS = { shrink: true } as const;

function offerStatus(query: { isError: boolean; error: unknown }): OfferPreviewStatus {
  if (!query.isError) return 'loaded';
  return (query.error as { response?: { status?: number } } | null)?.response?.status === 404 ? 'missing' : 'unavailable';
}

export default function EventPromoDialog({ open, rule, offerId, activateOnSave = false, tableMark, onClose }: EventPromoDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<EventRuleForm>(() => eventFormState(rule));
  const [error, setError] = useState<string | null>(null);

  // `rule` is held in the host's state (taken at the click), never read live
  // off a query — a refetch must not re-seed this form over the owner's typing.
  useEffect(() => {
    if (open) {
      setForm(eventFormState(rule));
      setError(null);
    }
  }, [open, rule]);

  // The preview is decoration, so it is a query of its own, outside the
  // effect above: its arrival must never reset the form, and its failure must
  // never block the save.
  const offerQuery = useQuery({
    queryKey: ['ic-offer', offerId],
    queryFn: () => fetchOffer(offerId as string),
    enabled: open && !!offerId,
    retry: false
  });

  const today = localTodayISO();
  // The switch-on is judged on the window this save SENDS (review round 3, C7).
  const locks = eventFormLocks(rule, today, {
    activating: activateOnSave,
    tableMark,
    window: { valid_from: form.valid_from, valid_to: form.valid_to }
  });
  const valid = eventFormValid(form, { locked: locks.locked });
  const patch = useMemo(
    () => eventRulePatch(form, rule, { activate: activateOnSave, locked: locks.locked, textLocked: locks.textLocked }),
    [form, rule, activateOnSave, locks.locked, locks.textLocked]
  );
  // The switch-on caption reads the window being SAVED, so a date the owner
  // just moved is the one it names — and today, because what "on" means
  // (notified overnight; the code in the tile now; nothing on the last day)
  // depends on where today falls.
  const switchOnCopy = eventSwitchOnConfirm({ ...rule, valid_from: form.valid_from, valid_to: form.valid_to }, today);
  // Switched on today, is a notification assured? Not on its last day or
  // after: the overnight send skips it once the store's last day has ended,
  // and neither that hour nor the store's day is known here (review round 3).
  const lastDayOrAfter = !rule.is_active && notificationMayNotArrive({ valid_to: form.valid_to }, today);

  const setField = <K extends keyof EventRuleForm>(key: K, value: EventRuleForm[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const saveMutation = useMutation({
    mutationFn: () => updateEventPromo(rule.id, patch),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ic-promotions'] });
      // "Codes issued this month" on This week reads the summary.
      queryClient.invalidateQueries({ queryKey: ['inner-circle-summary'] });
      // From This week the composer says the next step once the accept lands;
      // a second line here would say the same thing twice.
      if (!activateOnSave) enqueueSnackbar('Event promo updated', { variant: 'success' });
      onClose({ id: result.id, rule: result });
    },
    onError: (err) => {
      // INLINE, with the form intact: an activation refusal rolled the whole
      // save back, and the owner has to read why before deciding what next.
      setError(promotionSaveErrorMessage(err));
      queryClient.invalidateQueries({ queryKey: ['ic-promotions'] });
      // A 404 means the rule is gone — and with it the card (the nightly
      // retires both together), so This week must refetch rather than offer
      // Set it up on a suggestion that no longer exists.
      if ((err as { response?: { status?: number } } | null)?.response?.status === 404) {
        queryClient.invalidateQueries({ queryKey: PENDING_QUERY_KEY });
      }
    }
  });

  // NO CLOSE WHILE THE SAVE IS IN FLIGHT (review C1). The mutation's
  // callbacks outlive the dialog: closed mid-save, a refusal lands on an
  // unmounted form (the owner never learns nothing was sent) and a late
  // success runs the host's onClose — which closes whatever composer is open
  // by then. Escape, the backdrop and Cancel all wait for the answer.
  const close = () => {
    if (!saveMutation.isPending) onClose();
  };

  const save = () => {
    setError(null);
    if (Object.keys(patch).length === 0) {
      // Nothing to send. From This week the promo may already be on (switched
      // on from Outreach while its card was snoozed): the accept still records
      // it, against the rule as it stands.
      onClose(activateOnSave ? { id: rule.id, rule } : undefined);
      return;
    }
    saveMutation.mutate();
  };

  const offer = offerQuery.data ?? null;

  return (
    // Every close is wrapped: a bare `onClose` would hand MUI's own
    // `(event, reason)` arguments in as the `saved` payload.
    <Dialog open={open} onClose={close} disableEscapeKeyDown={saveMutation.isPending} fullWidth maxWidth="sm">
      <DialogTitle>Event promo</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          ) : null}
          <TextField
            label="Name"
            size="small"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            disabled={locks.textLocked}
            fullWidth
            required
          />
          <TextField
            label="Description"
            size="small"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            disabled={locks.textLocked}
            fullWidth
            multiline
            minRows={2}
          />
          {/* The discount on its own line and the two days side by side: in
              this dialog's width three fields in a row clipped the dates to
              "10/28/2…" (seen on the rig). */}
          <TextField
            label="Discount %"
            type="number"
            size="small"
            value={form.discount_pct}
            onChange={(e) => setField('discount_pct', e.target.value)}
            inputProps={{ min: 1, max: 100 }}
            disabled={locks.locked}
            sx={{ width: 140 }}
          />
          <Stack direction="row" spacing={2}>
            {/* Raw YYYY-MM-DD in, raw YYYY-MM-DD out: a calendar day, never
                a Date, so no timezone can move it. */}
            <TextField
              label="First day"
              type="date"
              size="small"
              value={form.valid_from}
              onChange={(e) => setField('valid_from', e.target.value)}
              InputLabelProps={DATE_FIELD_PROPS}
              inputProps={{ max: form.valid_to || undefined }}
              disabled={locks.locked}
              fullWidth
            />
            <TextField
              label="Last day"
              type="date"
              size="small"
              value={form.valid_to}
              onChange={(e) => setField('valid_to', e.target.value)}
              InputLabelProps={DATE_FIELD_PROPS}
              inputProps={{ min: form.valid_from || undefined }}
              disabled={locks.locked}
              fullWidth
            />
          </Stack>
          {locks.lockReason ? (
            <Typography variant="caption" color="text.secondary">
              {locks.lockReason}
            </Typography>
          ) : null}

          <Box>
            <Typography
              sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'grey.600' }}
            >
              Who gets it
            </Typography>
            {/* The members' own words, read off the rule's segment by the one
                reader that never prints its internal keys. Fixed: the group
                was chosen with its count. */}
            <Typography sx={{ mt: '2px', fontSize: '0.875rem', color: 'text.primary' }}>{segmentSummary(rule.segment)}</Typography>
          </Box>

          {offerId ? (
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', px: 1.5, py: 1.25 }}>
              <Typography
                sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'grey.600' }}
              >
                {OFFER_PREVIEW_HEADING}
              </Typography>
              {offerQuery.isPending ? (
                <Typography sx={{ mt: 0.5, fontSize: '0.875rem', color: 'text.disabled' }}>Loading…</Typography>
              ) : (
                <>
                  {offer ? (
                    <>
                      <Typography sx={{ mt: 0.5, fontSize: '0.875rem', fontWeight: 600, color: 'text.dark' }}>{offer.title}</Typography>
                      <Typography sx={{ mt: '2px', fontSize: '0.875rem', color: 'text.primary', textWrap: 'pretty' }}>
                        {offer.body}
                      </Typography>
                    </>
                  ) : null}
                  <Typography sx={{ mt: 0.75, fontSize: '0.8125rem', color: 'text.disabled', textWrap: 'pretty' }}>
                    {offerPreviewCaption(offer, offerStatus(offerQuery), { mayNotDeliver: lastDayOrAfter })}
                  </Typography>
                </>
              )}
            </Box>
          ) : null}
        </Stack>
        {/* One chooser with the card (review round 3): on its last day, or
            after, the sentence says a notification may not reach members, as
            the switch-on line below does. */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          {rule.is_active ? OUTREACH_CHANNEL_SENTENCE_EVENT : eventChannelSentence(form.valid_to, today)}
        </Typography>
        {/* Only when the switch-on can happen: above a "can't be switched on"
            line it would promise what the button below refuses (review C14). */}
        {activateOnSave && !rule.is_active && locks.canSave ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {switchOnCopy.body}
          </Typography>
        ) : null}
        {locks.saveBlockedReason ? (
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
            {locks.saveBlockedReason}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={saveMutation.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={!valid || !locks.canSave || saveMutation.isPending}>
          {activateOnSave && !rule.is_active ? 'Switch on' : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
