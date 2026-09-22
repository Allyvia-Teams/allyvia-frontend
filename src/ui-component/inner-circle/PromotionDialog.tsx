import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';

import {
  createPromotion,
  updatePromotion,
  type PromotionRule,
  type PromotionRuleInput,
  type PromotionTierScope,
  type PromotionTriggerType
} from 'api/innerCircle.api';
// Layering note: a `ui-component` reaching into `views` for its seam. No
// runtime cycle today (the seam imports back by direct path, never the
// barrel); the follow-up is to move the seam under `ui-component/inner-circle/`
// — Session 6 decides.
import { oneOf, type PromotionPrefill } from 'views/inner-circle/outreachRows';
import { OUTREACH_CHANNEL_SENTENCE } from './outreachChannel';

/** Shown only when the save will activate the rule — see `activateOnSave`. */
const ACTIVATE_ON_SAVE_CAPTION = 'Saving turns this discount on; codes go out to eligible members\u2019 tiles.';

export interface PromotionDialogProps {
  open: boolean;
  /** Rule being edited, or null when creating a new one. */
  promotion: PromotionRule | null;
  /**
   * Starting values for a NEW rule — from a recommendation, or a row being
   * duplicated. Ignored entirely when `promotion` is set: an edit shows what
   * is stored, never a suggestion laid over it. Memoise it at the call site,
   * or the effect below re-runs on every render and fights the typist.
   */
  initialValues?: PromotionPrefill;
  /**
   * A caption above the form, when the host has something to explain about
   * WHY this dialog is in the state it is in — today, only This week's
   * "the suggested rule was removed; this creates a new one". It is not a
   * validation message and never blocks the save.
   */
  notice?: string | null;
  /**
   * Force `is_active: true` on save, create AND edit.
   *
   * Set only when this dialog was opened from a This-week suggestion. The
   * recommender persists its pre-created rule INACTIVE, and the edit payload
   * below otherwise re-asserts the stored flag — so accepting a suggestion
   * wrote the rule back as a Draft, no code was minted, no member saw
   * anything, and the recommendation was marked accepted regardless. The
   * Outreach row-edit path leaves this unset on purpose: editing a paused
   * rule from the table must not silently restart it.
   */
  activateOnSave?: boolean;
  /** `saved` is present only when a create or update succeeded. */
  onClose: (saved?: { id: string }) => void;
}

interface FormState {
  name: string;
  description: string;
  tier_scope: PromotionTierScope;
  top_n: string;
  discount_pct: string;
  cadence_days: string;
  code_valid_days: string;
  trigger_type: PromotionTriggerType;
}

const DEFAULT_FORM: FormState = {
  name: '',
  description: '',
  tier_scope: 'vault',
  top_n: '10',
  discount_pct: '10',
  cadence_days: '30',
  code_valid_days: '14',
  trigger_type: 'manual'
};

const SCOPE_OPTIONS: Array<{ value: PromotionTierScope; label: string }> = [
  { value: 'vault', label: 'Vault members' },
  { value: 'regular', label: 'Regular members' },
  { value: 'shopper', label: 'Shoppers' },
  { value: 'top_n', label: 'Top N by spend' }
];

const TRIGGER_OPTIONS: Array<{ value: PromotionTriggerType; label: string }> = [
  { value: 'new_inventory', label: 'New inventory' },
  { value: 'winback', label: 'Win-back' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'manual', label: 'Manual' }
];

const SCOPE_VALUES = SCOPE_OPTIONS.map((o) => o.value);
const TRIGGER_VALUES = TRIGGER_OPTIONS.map((o) => o.value);

/**
 * An existing rule wins outright — an edit shows what is stored. Otherwise the
 * defaults take whatever the prefill offers, field by field, and each enum is
 * checked against this form's own option list: an unrecognised `tier_scope`
 * would otherwise select a `MenuItem` that does not exist and blank the
 * control, which reads as "no audience" rather than "we ignored a suggestion".
 *
 * THE EXISTING BRANCH GOES THROUGH `oneOf` TOO. It did not, and the wire can
 * always hold an enum value this option list does not — `trigger_type` already
 * does: `network_welcome` is a real stored value with no `MenuItem`, and it
 * blanked the Trigger control on any rule that carried it. That row no longer
 * opens this dialog at all (`isManagedElsewhere`), so this is the second line
 * rather than the first, and it is the one that holds for the NEXT value
 * somebody adds server-side. `PromotionWireTriggerType` makes the narrowing a
 * compile error to skip.
 */
function toFormState(promotion: PromotionRule | null, initialValues?: PromotionPrefill): FormState {
  if (promotion) {
    return {
      name: promotion.name,
      description: promotion.description,
      tier_scope: oneOf(promotion.tier_scope, SCOPE_VALUES) ?? DEFAULT_FORM.tier_scope,
      top_n: promotion.top_n != null ? String(promotion.top_n) : '10',
      discount_pct: String(Number(promotion.discount_pct)),
      cadence_days: String(promotion.cadence_days),
      code_valid_days: String(promotion.code_valid_days),
      trigger_type: oneOf(promotion.trigger_type, TRIGGER_VALUES) ?? DEFAULT_FORM.trigger_type
    };
  }
  const form: FormState = { ...DEFAULT_FORM };
  const prefill = initialValues ?? {};
  if (prefill.name !== undefined) form.name = prefill.name;
  if (prefill.description !== undefined) form.description = prefill.description;
  if (prefill.top_n !== undefined) form.top_n = prefill.top_n;
  if (prefill.discount_pct !== undefined) form.discount_pct = prefill.discount_pct;
  if (prefill.cadence_days !== undefined) form.cadence_days = prefill.cadence_days;
  if (prefill.code_valid_days !== undefined) form.code_valid_days = prefill.code_valid_days;
  const scope = oneOf(prefill.tier_scope, SCOPE_VALUES);
  if (scope) form.tier_scope = scope;
  const trigger = oneOf(prefill.trigger_type, TRIGGER_VALUES);
  if (trigger) form.trigger_type = trigger;
  return form;
}

export default function PromotionDialog({ open, promotion, initialValues, notice, activateOnSave, onClose }: PromotionDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    if (open) setForm(toFormState(promotion, initialValues));
  }, [open, promotion, initialValues]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const discountNum = Number(form.discount_pct);
  const topNNum = Number(form.top_n);
  const cadenceNum = Number(form.cadence_days);
  const validDaysNum = Number(form.code_valid_days);

  const isValid =
    form.name.trim().length > 0 &&
    !Number.isNaN(discountNum) &&
    discountNum > 0 &&
    discountNum <= 100 &&
    Number.isInteger(cadenceNum) &&
    cadenceNum >= 1 &&
    Number.isInteger(validDaysNum) &&
    validDaysNum >= 1 &&
    (form.tier_scope !== 'top_n' || (Number.isInteger(topNNum) && topNNum >= 1));

  const buildPayload = (): PromotionRuleInput => ({
    name: form.name.trim(),
    description: form.description.trim(),
    tier_scope: form.tier_scope,
    top_n: form.tier_scope === 'top_n' ? topNNum : null,
    discount_pct: String(discountNum),
    cadence_days: cadenceNum,
    code_valid_days: validDaysNum,
    trigger_type: form.trigger_type,
    is_active: activateOnSave ? true : promotion ? promotion.is_active : true
  });

  const saveMutation = useMutation({
    mutationFn: () => (promotion ? updatePromotion(promotion.id, buildPayload()) : createPromotion(buildPayload())),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ic-promotions'] });
      enqueueSnackbar(promotion ? 'Promotion updated' : 'Promotion created', { variant: 'success' });
      onClose({ id: result.id });
    },
    onError: () => enqueueSnackbar('Failed to save promotion', { variant: 'error' })
  });

  return (
    // Every close is wrapped: a bare `onClose` would hand MUI's own
    // `(event, reason)` arguments in as the `saved` payload.
    <Dialog open={open} onClose={() => onClose()} fullWidth maxWidth="sm">
      <DialogTitle>{promotion ? 'Edit promotion' : 'New promotion'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {notice ? (
            <Typography variant="caption" color="text.secondary">
              {notice}
            </Typography>
          ) : null}
          <TextField
            label="Name"
            size="small"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            fullWidth
            required
            autoFocus
          />
          <TextField
            label="Description"
            size="small"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Who is eligible</InputLabel>
              <Select
                label="Who is eligible"
                value={form.tier_scope}
                onChange={(e) => setField('tier_scope', e.target.value as PromotionTierScope)}
              >
                {SCOPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {form.tier_scope === 'top_n' && (
              <TextField
                label="Top N"
                type="number"
                size="small"
                value={form.top_n}
                onChange={(e) => setField('top_n', e.target.value)}
                inputProps={{ min: 1, step: 1 }}
                sx={{ width: { xs: '100%', sm: 160 } }}
              />
            )}
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Discount %"
              type="number"
              size="small"
              value={form.discount_pct}
              onChange={(e) => setField('discount_pct', e.target.value)}
              inputProps={{ min: 1, max: 100 }}
              fullWidth
            />
            <TextField
              label="Code valid (days)"
              type="number"
              size="small"
              value={form.code_valid_days}
              onChange={(e) => setField('code_valid_days', e.target.value)}
              inputProps={{ min: 1 }}
              fullWidth
            />
          </Stack>
          <TextField
            label="Cadence (days)"
            type="number"
            size="small"
            value={form.cadence_days}
            onChange={(e) => setField('cadence_days', e.target.value)}
            inputProps={{ min: 1 }}
            fullWidth
            helperText="minimum days between offers per member — keeps offers earned, not spammy"
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Trigger</InputLabel>
            <Select
              label="Trigger"
              value={form.trigger_type}
              onChange={(e) => setField('trigger_type', e.target.value as PromotionTriggerType)}
            >
              {TRIGGER_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          {OUTREACH_CHANNEL_SENTENCE}
        </Typography>
        {/* Said out loud, because this save does something the same button
            does not do from the Outreach table: it turns the rule ON, and the
            backend mints codes on that False→True edge in the same request. */}
        {activateOnSave ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {ACTIVATE_ON_SAVE_CAPTION}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()} disabled={saveMutation.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => saveMutation.mutate()} disabled={!isValid || saveMutation.isPending}>
          {promotion ? 'Save changes' : 'Create promotion'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
