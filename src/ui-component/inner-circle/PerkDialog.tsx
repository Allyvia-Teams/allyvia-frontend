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
  createPerk,
  updatePerk,
  type CustomerTier,
  type PerkEligibleScope,
  type PerkEvent,
  type PerkEventInput,
  type PerkStatus,
  type PerkType
} from 'api/innerCircle.api';
// Layering note: a `ui-component` reaching into `views` for its seam. No
// runtime cycle today (the seam imports back by direct path, never the
// barrel); the follow-up is to move the seam under `ui-component/inner-circle/`
// — Session 6 decides.
import { oneOf, type PerkPrefill } from 'views/inner-circle/outreachRows';
import { isoToLocalInput } from './dateInput';
import { OUTREACH_CHANNEL_SENTENCE } from './outreachChannel';

export interface PerkDialogProps {
  open: boolean;
  /** Perk being edited, or null when creating a new one. */
  perk: PerkEvent | null;
  /**
   * Starting values for a NEW perk — from a recommendation, or a row being
   * duplicated. Ignored entirely when `perk` is set. Memoise it at the call
   * site, or the effect below re-runs on every render and fights the typist.
   */
  initialValues?: PerkPrefill;
  /** `saved` is present only when a create or update succeeded. */
  onClose: (saved?: { id: string }) => void;
}

const PERK_TYPE_OPTIONS: Array<{ value: PerkType; label: string }> = [
  { value: 'design_meeting', label: 'Design meeting' },
  { value: 'private_event', label: 'Private event' },
  { value: 'early_access', label: 'Early access' }
];

const SCOPE_OPTIONS: Array<{ value: PerkEligibleScope; label: string }> = [
  { value: 'top_n', label: 'Top N by spend' },
  { value: 'tier', label: 'By tier' }
];

const TIER_OPTIONS: Array<{ value: CustomerTier; label: string }> = [
  { value: 'vault', label: 'Vault' },
  { value: 'regular', label: 'Regular' },
  { value: 'shopper', label: 'Shopper' }
];

const STATUS_OPTIONS: Array<{ value: PerkStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'inviting', label: 'Inviting' },
  { value: 'closed', label: 'Closed' }
];

interface FormState {
  title: string;
  description: string;
  perk_type: PerkType;
  eligible_scope: PerkEligibleScope;
  top_n: string;
  tier: CustomerTier;
  capacity: string;
  event_date: string; // datetime-local input value
  location: string;
  status: PerkStatus;
}

const DEFAULT_FORM: FormState = {
  title: '',
  description: '',
  perk_type: 'private_event',
  eligible_scope: 'top_n',
  top_n: '10',
  tier: 'vault',
  capacity: '',
  event_date: '',
  location: '',
  status: 'draft'
};

function isCustomerTier(value: string | null): value is CustomerTier {
  return value === 'vault' || value === 'regular' || value === 'shopper';
}

const PERK_TYPE_VALUES = PERK_TYPE_OPTIONS.map((o) => o.value);
const SCOPE_VALUES = SCOPE_OPTIONS.map((o) => o.value);
const TIER_VALUES = TIER_OPTIONS.map((o) => o.value);
const STATUS_VALUES = STATUS_OPTIONS.map((o) => o.value);

/**
 * An existing perk wins outright. Otherwise the defaults take whatever the
 * prefill offers, with each enum checked against this form's own option list
 * — an unrecognised `perk_type` would select a `MenuItem` that does not exist
 * and blank the control.
 *
 * `event_date` arrives already converted to the datetime-local shape by
 * `prefillFor`, which is the only place that conversion happens.
 */
function toFormState(perk: PerkEvent | null, initialValues?: PerkPrefill): FormState {
  if (!perk) {
    const form: FormState = { ...DEFAULT_FORM };
    const prefill = initialValues ?? {};
    if (prefill.title !== undefined) form.title = prefill.title;
    if (prefill.description !== undefined) form.description = prefill.description;
    if (prefill.top_n !== undefined) form.top_n = prefill.top_n;
    if (prefill.capacity !== undefined) form.capacity = prefill.capacity;
    if (prefill.event_date !== undefined) form.event_date = prefill.event_date;
    if (prefill.location !== undefined) form.location = prefill.location;
    const perkType = oneOf(prefill.perk_type, PERK_TYPE_VALUES);
    if (perkType) form.perk_type = perkType;
    const scope = oneOf(prefill.eligible_scope, SCOPE_VALUES);
    if (scope) form.eligible_scope = scope;
    const tier = oneOf(prefill.tier, TIER_VALUES);
    if (tier) form.tier = tier;
    const status = oneOf(prefill.status, STATUS_VALUES);
    if (status) form.status = status;
    return form;
  }
  // The stored values go through `oneOf` too, not just the prefill: the wire
  // can always hold an enum this option list does not (a sibling dialog was
  // already blanking its Trigger control on exactly that), and falling back
  // to the default is better than a Select with no matching `MenuItem`.
  return {
    title: perk.title,
    description: perk.description,
    perk_type: oneOf(perk.perk_type, PERK_TYPE_VALUES) ?? DEFAULT_FORM.perk_type,
    eligible_scope: oneOf(perk.eligible_scope, SCOPE_VALUES) ?? DEFAULT_FORM.eligible_scope,
    top_n: String(perk.top_n || 10),
    tier: isCustomerTier(perk.tier) ? perk.tier : 'vault',
    capacity: perk.capacity != null ? String(perk.capacity) : '',
    event_date: isoToLocalInput(perk.event_date),
    location: perk.location,
    status: oneOf(perk.status, STATUS_VALUES) ?? DEFAULT_FORM.status
  };
}

export default function PerkDialog({ open, perk, initialValues, onClose }: PerkDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    if (open) setForm(toFormState(perk, initialValues));
  }, [open, perk, initialValues]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const topNNum = Number(form.top_n);
  const capacityNum = form.capacity.trim() === '' ? null : Number(form.capacity);

  const isValid =
    form.title.trim().length > 0 &&
    (form.eligible_scope !== 'top_n' || (Number.isInteger(topNNum) && topNNum >= 1)) &&
    (capacityNum === null || (Number.isInteger(capacityNum) && capacityNum >= 1));

  const buildPayload = (): PerkEventInput => ({
    title: form.title.trim(),
    description: form.description.trim(),
    perk_type: form.perk_type,
    eligible_scope: form.eligible_scope,
    top_n: form.eligible_scope === 'top_n' ? topNNum : (perk?.top_n ?? 10),
    tier: form.eligible_scope === 'tier' ? form.tier : null,
    capacity: capacityNum,
    event_date: form.event_date ? new Date(form.event_date).toISOString() : null,
    location: form.location.trim(),
    ...(perk ? { status: form.status } : {})
  });

  const saveMutation = useMutation({
    mutationFn: () => (perk ? updatePerk(perk.id, buildPayload()) : createPerk(buildPayload())),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ic-perks'] });
      enqueueSnackbar(perk ? 'Perk updated' : 'Perk created', { variant: 'success' });
      onClose({ id: result.id });
    },
    onError: () => enqueueSnackbar('Failed to save perk', { variant: 'error' })
  });

  return (
    // Every close is wrapped: a bare `onClose` would hand MUI's own
    // `(event, reason)` arguments in as the `saved` payload.
    <Dialog open={open} onClose={() => onClose()} fullWidth maxWidth="sm">
      <DialogTitle>{perk ? 'Edit perk' : 'New perk'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title"
            size="small"
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
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
              <InputLabel>Perk type</InputLabel>
              <Select label="Perk type" value={form.perk_type} onChange={(e) => setField('perk_type', e.target.value as PerkType)}>
                {PERK_TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {perk && (
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={form.status} onChange={(e) => setField('status', e.target.value as PerkStatus)}>
                  {STATUS_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Who is eligible</InputLabel>
              <Select
                label="Who is eligible"
                value={form.eligible_scope}
                onChange={(e) => setField('eligible_scope', e.target.value as PerkEligibleScope)}
              >
                {SCOPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {form.eligible_scope === 'top_n' ? (
              <TextField
                label="Top N"
                type="number"
                size="small"
                value={form.top_n}
                onChange={(e) => setField('top_n', e.target.value)}
                inputProps={{ min: 1, step: 1 }}
                sx={{ width: { xs: '100%', sm: 200 } }}
              />
            ) : (
              <FormControl size="small" sx={{ width: { xs: '100%', sm: 200 } }}>
                <InputLabel>Tier</InputLabel>
                <Select label="Tier" value={form.tier} onChange={(e) => setField('tier', e.target.value as CustomerTier)}>
                  {TIER_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Event date and time"
              type="datetime-local"
              size="small"
              value={form.event_date}
              onChange={(e) => setField('event_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Capacity"
              type="number"
              size="small"
              value={form.capacity}
              onChange={(e) => setField('capacity', e.target.value)}
              inputProps={{ min: 1, step: 1 }}
              fullWidth
              helperText="Leave blank for unlimited"
            />
          </Stack>
          <TextField label="Location" size="small" value={form.location} onChange={(e) => setField('location', e.target.value)} fullWidth />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          {OUTREACH_CHANNEL_SENTENCE}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()} disabled={saveMutation.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => saveMutation.mutate()} disabled={!isValid || saveMutation.isPending}>
          {perk ? 'Save changes' : 'Create perk'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
