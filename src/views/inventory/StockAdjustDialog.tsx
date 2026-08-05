// views/inventory/StockAdjustDialog.tsx
//
// A manual stock correction. The note is REQUIRED, deliberately: this is the one
// movement with no external cause to point at, so the reason has to come from the
// person making it. Validation rules live in stockFormat.ts and are tested there.

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';

import { ItemStockResponse, Location, adjustItemStock } from 'api/inventoryStock.api';

import { AdjustmentDraft, describeAdjustmentError, toAdjustmentPayload, validateAdjustment } from './stockFormat';

export interface StockAdjustDialogProps {
  open: boolean;
  onClose: () => void;
  onAdjusted: () => void;
  itemId: number;
  itemName: string;
  stock: ItemStockResponse | null;
  locations: Location[];
}

const emptyDraft = (locationId: string | null): AdjustmentDraft => ({
  mode: 'delta',
  value: '',
  reason: 'manual_adjust',
  note: '',
  locationId
});

export default function StockAdjustDialog({ open, onClose, onAdjusted, itemId, itemName, stock, locations }: StockAdjustDialogProps) {
  const defaultLocation = locations.find((location) => location.is_default) ?? locations[0] ?? null;
  const [draft, setDraft] = useState<AdjustmentDraft>(emptyDraft(defaultLocation?.id ?? null));
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(emptyDraft(defaultLocation?.id ?? null));
      setServerError(null);
      setTouched(false);
    }
    // defaultLocation is derived from `locations`; depending on its id keeps the
    // reset stable without re-running on every render.
  }, [open, defaultLocation?.id]);

  const validation = validateAdjustment(draft);
  const currentAtLocation = stock?.levels.find((level) => level.location_id === draft.locationId)?.quantity_on_hand ?? 0;

  const submit = async () => {
    setTouched(true);
    if (!validation.valid) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await adjustItemStock(itemId, toAdjustmentPayload(draft));
      onAdjusted();
      onClose();
    } catch (err) {
      // The 409 body carries requested/available, which is the actionable part.
      setServerError(describeAdjustmentError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const showError = (field: 'value' | 'note') => touched && Boolean(validation.errors[field]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Adjust stock — {itemName}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={draft.mode}
            onChange={(_event, mode) => mode && setDraft({ ...draft, mode, value: '' })}
          >
            <ToggleButton value="delta">Change by</ToggleButton>
            <ToggleButton value="target">Set to counted</ToggleButton>
          </ToggleButtonGroup>

          {locations.length > 1 && (
            <TextField
              select
              label="Location"
              value={draft.locationId ?? ''}
              onChange={(event) => setDraft({ ...draft, locationId: event.target.value || null })}
              helperText="Stock is held per location, so an adjustment applies to one of them."
            >
              {locations.map((location) => (
                <MenuItem key={location.id} value={location.id}>
                  {location.name}
                  {location.is_default ? ' (default)' : ''}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label={draft.mode === 'delta' ? 'Change (e.g. -2)' : 'Counted quantity'}
            value={draft.value}
            onChange={(event) => setDraft({ ...draft, value: event.target.value })}
            onBlur={() => setTouched(true)}
            error={showError('value')}
            helperText={showError('value') ? validation.errors.value : `Currently ${currentAtLocation} at this location`}
            inputProps={{ inputMode: 'numeric' }}
          />

          <TextField
            select
            label="Reason"
            value={draft.reason}
            onChange={(event) => setDraft({ ...draft, reason: event.target.value as AdjustmentDraft['reason'] })}
          >
            <MenuItem value="manual_adjust">Manual adjustment</MenuItem>
            <MenuItem value="shrinkage">Shrinkage (damaged, lost, stolen)</MenuItem>
          </TextField>

          <TextField
            label="Note"
            required
            multiline
            minRows={2}
            value={draft.note}
            onChange={(event) => setDraft({ ...draft, note: event.target.value })}
            onBlur={() => setTouched(true)}
            error={showError('note')}
            helperText={showError('note') ? validation.errors.note : 'Required. This is the only record of why the number changed.'}
          />

          {serverError && <Alert severity="error">{serverError}</Alert>}

          <Typography variant="caption" color="text.secondary">
            Adjustments are recorded in the stock ledger and cannot be edited — a correction is another adjustment.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={submitting}>
          {submitting ? 'Adjusting…' : 'Adjust stock'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
