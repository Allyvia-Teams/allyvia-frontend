import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import {
  createBuyingRound,
  updateBuyingRound,
  type BuyingRound,
  type BuyingRoundInput,
  type BuyingRoundScope,
  type CustomerTier
} from 'api/innerCircle.api';

export interface StyleVoteDialogProps {
  open: boolean;
  /** Round being edited, or null when creating a new one. */
  round: BuyingRound | null;
  onClose: () => void;
}

const SCOPE_OPTIONS: Array<{ value: BuyingRoundScope; label: string }> = [
  { value: 'top_n', label: 'Top N by spend' },
  { value: 'tier', label: 'By tier' }
];

const TIER_OPTIONS: Array<{ value: CustomerTier; label: string }> = [
  { value: 'vault', label: 'Vault' },
  { value: 'regular', label: 'Regular' },
  { value: 'shopper', label: 'Shopper' }
];

const MIN_OPTIONS = 2;

interface OptionRow {
  label: string;
  image_url: string;
}

interface FormState {
  title: string;
  description: string;
  options: OptionRow[];
  eligible_scope: BuyingRoundScope;
  top_n: string;
  tier: CustomerTier;
  closes_at: string; // datetime-local input value
}

const DEFAULT_FORM: FormState = {
  title: '',
  description: '',
  options: [
    { label: '', image_url: '' },
    { label: '', image_url: '' }
  ],
  eligible_scope: 'top_n',
  top_n: '25',
  tier: 'vault',
  closes_at: ''
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

function toFormState(round: BuyingRound | null): FormState {
  if (!round) return { ...DEFAULT_FORM, options: DEFAULT_FORM.options.map((o) => ({ ...o })) };
  const options = round.options.length > 0 ? round.options : DEFAULT_FORM.options;
  return {
    title: round.title,
    description: round.description,
    options: options.map((o) => ({ label: o.label ?? '', image_url: o.image_url ?? '' })),
    eligible_scope: round.eligible_scope,
    top_n: String(round.top_n || 25),
    tier: isCustomerTier(round.tier) ? round.tier : 'vault',
    closes_at: isoToLocalInput(round.closes_at)
  };
}

export default function StyleVoteDialog({ open, round, onClose }: StyleVoteDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    if (open) setForm(toFormState(round));
  }, [open, round]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setOption = (index: number, key: keyof OptionRow, value: string) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) => (i === index ? { ...opt, [key]: value } : opt))
    }));
  };

  const addOption = () => setForm((prev) => ({ ...prev, options: [...prev.options, { label: '', image_url: '' }] }));

  const removeOption = (index: number) => setForm((prev) => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));

  // The server rejects any options edit once votes exist, because a Vote stores
  // only its ballot position — reordering would silently re-attribute votes.
  const ballotLocked = round != null && round.vote_count > 0;

  const filledOptions = form.options.filter((o) => o.label.trim().length > 0);
  const topNNum = Number(form.top_n);

  const isValid =
    form.title.trim().length > 0 &&
    filledOptions.length >= MIN_OPTIONS &&
    filledOptions.length === form.options.length &&
    (form.eligible_scope !== 'top_n' || (Number.isInteger(topNNum) && topNNum >= 1));

  const buildPayload = (): BuyingRoundInput => ({
    title: form.title.trim(),
    description: form.description.trim(),
    options: form.options.map((o) => ({
      label: o.label.trim(),
      image_url: o.image_url.trim() || null
    })),
    eligible_scope: form.eligible_scope,
    top_n: form.eligible_scope === 'top_n' ? topNNum : (round?.top_n ?? 25),
    tier: form.eligible_scope === 'tier' ? form.tier : null,
    closes_at: form.closes_at ? new Date(form.closes_at).toISOString() : null
  });

  const buildEditPayload = (): Partial<BuyingRoundInput> => {
    const payload = buildPayload();
    if (ballotLocked) {
      const { options, ...rest } = payload;
      return rest;
    }
    return payload;
  };

  const saveMutation = useMutation({
    mutationFn: () => (round ? updateBuyingRound(round.id, buildEditPayload()) : createBuyingRound(buildPayload())),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ic-buying-rounds'] });
      enqueueSnackbar(round ? 'Round updated' : 'Round created', { variant: 'success' });
      onClose();
    },
    onError: () => enqueueSnackbar('Failed to save round', { variant: 'error' })
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{round ? 'Edit style vote' : 'New style vote'}</DialogTitle>
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
            helperText="What are members choosing for? e.g. “Spring drop”"
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

          <Divider textAlign="left">
            <Typography variant="caption" color="textSecondary">
              Ballot options
            </Typography>
          </Divider>

          {ballotLocked && (
            <Alert severity="info" variant="outlined">
              Voting has started, so the ballot is locked. Everything else can still be edited.
            </Alert>
          )}

          <Stack spacing={1.5}>
            {form.options.map((option, index) => (
              <Stack key={index} direction="row" spacing={1} alignItems="flex-start">
                <Box
                  sx={{
                    mt: 1,
                    width: 24,
                    flexShrink: 0,
                    textAlign: 'center',
                    color: 'text.secondary',
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  <Typography variant="caption">{index + 1}</Typography>
                </Box>
                <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                  <TextField
                    label={`Option ${index + 1}`}
                    size="small"
                    value={option.label}
                    onChange={(e) => setOption(index, 'label', e.target.value)}
                    fullWidth
                    disabled={ballotLocked}
                    required
                  />
                  <TextField
                    label="Image URL"
                    size="small"
                    value={option.image_url}
                    onChange={(e) => setOption(index, 'image_url', e.target.value)}
                    fullWidth
                    disabled={ballotLocked}
                    placeholder="https://…"
                  />
                </Stack>
                <Tooltip title={form.options.length <= MIN_OPTIONS ? `At least ${MIN_OPTIONS} options are required` : 'Remove option'}>
                  <span>
                    <IconButton
                      size="small"
                      color="error"
                      sx={{ mt: 0.5 }}
                      disabled={ballotLocked || form.options.length <= MIN_OPTIONS}
                      onClick={() => removeOption(index)}
                      aria-label={`Remove option ${index + 1}`}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            ))}
          </Stack>

          <Box>
            <Button size="small" startIcon={<AddIcon />} onClick={addOption} disabled={ballotLocked} sx={{ textTransform: 'none' }}>
              Add option
            </Button>
          </Box>

          <Divider />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Who can vote</InputLabel>
              <Select
                label="Who can vote"
                value={form.eligible_scope}
                onChange={(e) => setField('eligible_scope', e.target.value as BuyingRoundScope)}
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

          <TextField
            label="Voting closes"
            type="datetime-local"
            size="small"
            value={form.closes_at}
            onChange={(e) => setField('closes_at', e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            helperText="Leave blank to keep voting open until you close it"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saveMutation.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => saveMutation.mutate()} disabled={!isValid || saveMutation.isPending}>
          {round ? 'Save changes' : 'Create round'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
