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
  TextField
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

export interface PerkDialogProps {
  open: boolean;
  /** Perk being edited, or null when creating a new one. */
  perk: PerkEvent | null;
  onClose: () => void;
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

function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isCustomerTier(value: string | null): value is CustomerTier {
  return value === 'vault' || value === 'regular' || value === 'shopper';
}

function toFormState(perk: PerkEvent | null): FormState {
  if (!perk) return { ...DEFAULT_FORM };
  return {
    title: perk.title,
    description: perk.description,
    perk_type: perk.perk_type,
    eligible_scope: perk.eligible_scope,
    top_n: String(perk.top_n || 10),
    tier: isCustomerTier(perk.tier) ? perk.tier : 'vault',
    capacity: perk.capacity != null ? String(perk.capacity) : '',
    event_date: isoToLocalInput(perk.event_date),
    location: perk.location,
    status: perk.status
  };
}

export default function PerkDialog({ open, perk, onClose }: PerkDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    if (open) setForm(toFormState(perk));
  }, [open, perk]);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ic-perks'] });
      enqueueSnackbar(perk ? 'Perk updated' : 'Perk created', { variant: 'success' });
      onClose();
    },
    onError: () => enqueueSnackbar('Failed to save perk', { variant: 'error' })
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saveMutation.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => saveMutation.mutate()} disabled={!isValid || saveMutation.isPending}>
          {perk ? 'Save changes' : 'Create perk'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
