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
  createPromotion,
  updatePromotion,
  type PromotionRule,
  type PromotionRuleInput,
  type PromotionTierScope,
  type PromotionTriggerType
} from 'api/innerCircle.api';

export interface PromotionDialogProps {
  open: boolean;
  /** Rule being edited, or null when creating a new one. */
  promotion: PromotionRule | null;
  onClose: () => void;
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

function toFormState(promotion: PromotionRule | null): FormState {
  if (!promotion) return { ...DEFAULT_FORM };
  return {
    name: promotion.name,
    description: promotion.description,
    tier_scope: promotion.tier_scope,
    top_n: promotion.top_n != null ? String(promotion.top_n) : '10',
    discount_pct: String(Number(promotion.discount_pct)),
    cadence_days: String(promotion.cadence_days),
    code_valid_days: String(promotion.code_valid_days),
    trigger_type: promotion.trigger_type
  };
}

export default function PromotionDialog({ open, promotion, onClose }: PromotionDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    if (open) setForm(toFormState(promotion));
  }, [open, promotion]);

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
    is_active: promotion ? promotion.is_active : true
  });

  const saveMutation = useMutation({
    mutationFn: () => (promotion ? updatePromotion(promotion.id, buildPayload()) : createPromotion(buildPayload())),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ic-promotions'] });
      enqueueSnackbar(promotion ? 'Promotion updated' : 'Promotion created', { variant: 'success' });
      onClose();
    },
    onError: () => enqueueSnackbar('Failed to save promotion', { variant: 'error' })
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{promotion ? 'Edit promotion' : 'New promotion'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saveMutation.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => saveMutation.mutate()} disabled={!isValid || saveMutation.isPending}>
          {promotion ? 'Save changes' : 'Create promotion'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
