// views/inventory/SizeScaleCreateDialog.tsx
//
// The create form: name, kind, axis label(s), and the initial ordered values
// as one textarea per axis (comma- or newline-separated, order preserved).
// Composite asks for TWO axis labels, everything else for one — per the spec's
// "Composite creation asks for two axis labels; 1-axis kinds get one."
// All parsing/validation rules live in sizeScales.ts; this file renders them.

import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';

import { createSizeScale } from 'api/sizeScales.api';

import {
  ScaleCreateDraft,
  ScaleKind,
  SizeScale,
  axesForKind,
  parseSizeScaleError,
  toCreatePayload,
  validateCreateDraft
} from './sizeScales';

const KIND_OPTIONS: Array<{ value: ScaleKind; label: string; hint: string }> = [
  { value: 'alpha', label: 'Alpha (XS–XL)', hint: 'Lettered sizes in the order you list them.' },
  { value: 'numeric', label: 'Numeric (30–40)', hint: 'Numbered sizes in the order you list them — not sorted numerically.' },
  { value: 'composite', label: 'Composite (waist × inseam)', hint: 'Two axes; a variant carries one value from each.' }
];

const emptyDraft = (): ScaleCreateDraft => ({ name: '', kind: 'alpha', axisLabels: ['', ''], valuesText: ['', ''] });

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (scale: SizeScale) => void;
}

export default function SizeScaleCreateDialog({ open, onClose, onCreated }: Props) {
  const [draft, setDraft] = useState<ScaleCreateDraft>(emptyDraft());
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const axes = axesForKind(draft.kind);
  const validation = validateCreateDraft(draft);

  const close = () => {
    setDraft(emptyDraft());
    setTouched(false);
    setError(null);
    onClose();
  };

  const submit = async () => {
    setTouched(true);
    if (!validation.valid) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createSizeScale(toCreatePayload(draft));
      onCreated(created);
      close();
    } catch (err) {
      setError(parseSizeScaleError(err).summary);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : close} fullWidth maxWidth="sm">
      <DialogTitle>New size scale</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <TextField
            label="Name"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            error={touched && Boolean(validation.errors.name)}
            helperText={(touched && validation.errors.name) || 'Unique per company, e.g. "Letter sizes" or "Denim W×L".'}
            autoFocus
            fullWidth
          />
          <TextField
            select
            label="Kind"
            value={draft.kind}
            onChange={(event) => setDraft({ ...draft, kind: event.target.value as ScaleKind })}
            helperText={KIND_OPTIONS.find((option) => option.value === draft.kind)?.hint}
            fullWidth
          >
            {KIND_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          {Array.from({ length: axes }, (_unused, axis) => (
            <Stack key={axis} spacing={1.5}>
              <TextField
                label={axes === 1 ? 'Axis label (optional)' : `Axis ${axis + 1} label`}
                placeholder={axes === 2 ? (axis === 0 ? 'e.g. Waist' : 'e.g. Inseam') : ''}
                value={draft.axisLabels[axis] ?? ''}
                onChange={(event) => {
                  const axisLabels = [...draft.axisLabels];
                  axisLabels[axis] = event.target.value;
                  setDraft({ ...draft, axisLabels });
                }}
                fullWidth
              />
              <TextField
                label={axes === 1 ? 'Values, in order' : `Axis ${axis + 1} values, in order`}
                placeholder={axis === 0 ? 'XS, S, M, L, XL — or one per line' : '30, 32, 34 — or one per line'}
                value={draft.valuesText[axis] ?? ''}
                onChange={(event) => {
                  const valuesText = [...draft.valuesText];
                  valuesText[axis] = event.target.value;
                  setDraft({ ...draft, valuesText });
                }}
                multiline
                minRows={2}
                fullWidth
              />
            </Stack>
          ))}
          {touched && validation.errors.values && <Alert severity="warning">{validation.errors.values}</Alert>}
          <Typography variant="caption" color="text.secondary">
            The order you list values here is the order grids and reports will use. You can reorder, add and deactivate values later; the
            kind cannot change after creation.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={busy || (touched && !validation.valid)}>
          Create scale
        </Button>
      </DialogActions>
    </Dialog>
  );
}
