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
// Layering note: a `ui-component` reaching into `views` for its seam. No
// runtime cycle today (the seam imports back by direct path, never the
// barrel); the follow-up is to move the seam under `ui-component/inner-circle/`
// — Session 6 decides.
import { ballotRows, MIN_BALLOT_OPTIONS, oneOf, type VotePrefill } from 'views/inner-circle/outreachRows';
import { isoToLocalInput } from './dateInput';
import { channelSentenceFor } from './outreachChannel';

export interface StyleVoteDialogProps {
  open: boolean;
  /** Round being edited, or null when creating a new one. */
  round: BuyingRound | null;
  /**
   * Starting values for a NEW round — from a recommendation, or a row being
   * duplicated. Ignored entirely when `round` is set. Memoise it at the call
   * site, or the effect below re-runs on every render and fights the typist.
   */
  initialValues?: VotePrefill;
  /** `saved` is present only when a create or update succeeded. */
  onClose: (saved?: { id: string }) => void;
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

function isCustomerTier(value: string | null): value is CustomerTier {
  return value === 'vault' || value === 'regular' || value === 'shopper';
}

const SCOPE_VALUES = SCOPE_OPTIONS.map((o) => o.value);
const TIER_VALUES = TIER_OPTIONS.map((o) => o.value);

/**
 * An existing round wins outright. Otherwise the defaults take whatever the
 * prefill offers. The `options` array is the one prefill field that is not a
 * string, and `ballotRows` rebuilds it safely (see the seam).
 *
 * DEFAULT_FORM's options are copied rather than shared — the form mutates
 * rows in place through `setOption`, and a shared array would leak one
 * session's typing into the next dialog that opens.
 */
function toFormState(round: BuyingRound | null, initialValues?: VotePrefill): FormState {
  if (!round) {
    const form: FormState = { ...DEFAULT_FORM, options: DEFAULT_FORM.options.map((o) => ({ ...o })) };
    const prefill = initialValues ?? {};
    if (prefill.title !== undefined) form.title = prefill.title;
    if (prefill.description !== undefined) form.description = prefill.description;
    if (prefill.top_n !== undefined) form.top_n = prefill.top_n;
    if (prefill.closes_at !== undefined) form.closes_at = prefill.closes_at;
    const scope = oneOf(prefill.eligible_scope, SCOPE_VALUES);
    if (scope) form.eligible_scope = scope;
    const tier = oneOf(prefill.tier, TIER_VALUES);
    if (tier) form.tier = tier;
    const ballot = ballotRows(prefill.options, MIN_BALLOT_OPTIONS);
    if (ballot) form.options = ballot;
    return form;
  }
  const options = round.options.length > 0 ? round.options : DEFAULT_FORM.options;
  // `eligible_scope` goes through `oneOf` here too, not just on the prefill
  // path: the wire can hold an enum this option list does not, and a Select
  // with no matching `MenuItem` renders blank.
  return {
    title: round.title,
    description: round.description,
    options: options.map((o) => ({ label: o.label ?? '', image_url: o.image_url ?? '' })),
    eligible_scope: oneOf(round.eligible_scope, SCOPE_VALUES) ?? DEFAULT_FORM.eligible_scope,
    top_n: String(round.top_n || 25),
    tier: isCustomerTier(round.tier) ? round.tier : 'vault',
    closes_at: isoToLocalInput(round.closes_at)
  };
}

export default function StyleVoteDialog({ open, round, initialValues, onClose }: StyleVoteDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    if (open) setForm(toFormState(round, initialValues));
  }, [open, round, initialValues]);

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
    filledOptions.length >= MIN_BALLOT_OPTIONS &&
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
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ic-buying-rounds'] });
      enqueueSnackbar(round ? 'Round updated' : 'Round created', { variant: 'success' });
      onClose({ id: result.id });
    },
    onError: () => enqueueSnackbar('Failed to save round', { variant: 'error' })
  });

  return (
    // Every close is wrapped: a bare `onClose` would hand MUI's own
    // `(event, reason)` arguments in as the `saved` payload.
    <Dialog open={open} onClose={() => onClose()} fullWidth maxWidth="sm">
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
                <Tooltip
                  title={
                    form.options.length <= MIN_BALLOT_OPTIONS ? `At least ${MIN_BALLOT_OPTIONS} options are required` : 'Remove option'
                  }
                >
                  <span>
                    <IconButton
                      size="small"
                      color="error"
                      sx={{ mt: 0.5 }}
                      disabled={ballotLocked || form.options.length <= MIN_BALLOT_OPTIONS}
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
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          {channelSentenceFor('vote')}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()} disabled={saveMutation.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => saveMutation.mutate()} disabled={!isValid || saveMutation.isPending}>
          {round ? 'Save changes' : 'Create round'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
