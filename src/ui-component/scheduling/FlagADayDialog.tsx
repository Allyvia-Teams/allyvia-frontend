import * as React from 'react';
import { useSnackbar } from 'notistack';

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';

import { createCalendarException } from 'api/scheduling.api';
import {
  EXCLUSIONS_BLURB,
  clashMessage,
  emptyRangeDraft,
  isRangeDraftValid,
  payloadFromRangeDraft,
  rangeDraftErrors,
  rangeSummary
} from './learningExclusions';
import type { RangeDraft } from './learningExclusions';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  todayIso: string;
  locationIds: string[];
}

/**
 * "Tell Allyvia to ignore these days."
 *
 * Deliberately NOT the existing exception dialog. That one is the full
 * instrument — kind, demand effect, multiplier, count-crew headcount — and is
 * the right tool for "we're closed Monday, staff two people for the count".
 * This is the other job: something outside the owner's control threw off some
 * days and they want them left out of what the model learns from, with no
 * opinion about demand. Every row it writes is neutral, so flagging a day can
 * never silently rewrite a forecast as a side effect.
 *
 * ON THE DATE INPUTS: two plain `type="date"` fields, matching the sibling
 * dialog, NOT `AllyviaDateRangePicker`. That component defaults `maxDate` to
 * TODAY, so its quick-select presets cannot reach a future date — and a
 * planned renovation is the future-dated case this dialog exists for.
 */
const FlagADayDialog: React.FC<Props> = ({ open, onClose, onSaved, todayIso, locationIds }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [draft, setDraft] = React.useState<RangeDraft>(() => emptyRangeDraft(todayIso));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [failure, setFailure] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setDraft(emptyRangeDraft(todayIso));
      setErrors({});
      setFailure(null);
    }
  }, [open, todayIso]);

  const set = <K extends keyof RangeDraft>(key: K, value: RangeDraft[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      // Dragging the start past the end is a slip, not an intent. Carry the
      // end with it rather than showing an error the owner did not ask for.
      if (key === 'start_date' && next.end_date && next.end_date < String(value)) {
        next.end_date = String(value);
      }
      return next;
    });
    setErrors({});
    setFailure(null);
  };

  const save = async () => {
    const found = rangeDraftErrors(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setFailure(null);
    try {
      const response = await createCalendarException(payloadFromRangeDraft(draft));
      const days = response.days_declared ?? 1;
      enqueueSnackbar(
        days === 1
          ? 'That day is now left out of what Allyvia learns from.'
          : `Those ${days} days are now left out of what Allyvia learns from.`,
        { variant: 'success' }
      );
      onSaved();
      onClose();
    } catch (error) {
      const response = (error as { response?: { status?: number; data?: { clashing_dates?: string[]; error?: string } } })?.response;
      if (response?.status === 409) {
        setFailure(clashMessage(response.data?.clashing_dates));
      } else if (response?.status === 400 && response.data?.error) {
        setFailure(response.data.error);
      } else {
        setFailure("That didn't save. Try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const summary = rangeSummary(draft.start_date, draft.end_date);

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Flag a day</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {EXCLUSIONS_BLURB}
        </Typography>

        {failure && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {failure}
          </Alert>
        )}

        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5}>
            <TextField
              label="From"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={draft.start_date}
              onChange={(event) => set('start_date', event.target.value)}
              error={Boolean(errors.start_date)}
              helperText={errors.start_date}
            />
            <TextField
              label="To"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={draft.end_date}
              onChange={(event) => set('end_date', event.target.value)}
              error={Boolean(errors.end_date)}
              helperText={errors.end_date}
            />
          </Stack>

          {summary && (
            <Box>
              <Typography variant="caption" color="textSecondary">
                {summary}
              </Typography>
            </Box>
          )}

          {locationIds.length > 0 && (
            <TextField
              select
              label="Which store"
              fullWidth
              size="small"
              value={draft.location_id}
              onChange={(event) => set('location_id', event.target.value)}
            >
              <MenuItem value="">All stores</MenuItem>
              {locationIds.map((id) => (
                <MenuItem key={id} value={id}>
                  {id}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="What happened? (optional)"
            fullWidth
            size="small"
            placeholder="Road closed, power out, renovating…"
            value={draft.note}
            onChange={(event) => set('note', event.target.value)}
            error={Boolean(errors.note)}
            helperText={errors.note}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving} color="inherit">
          Cancel
        </Button>
        <Button onClick={save} variant="contained" disabled={saving || !isRangeDraftValid(draft)}>
          {saving ? 'Saving…' : 'Ignore these days'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FlagADayDialog;
