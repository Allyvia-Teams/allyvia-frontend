// A new plan (design §10): a name, the store, the order date, and optionally the selling window and a budget.
// The server fills the window from the order date when it is left out, and answers each field in its own words.

import { useState } from 'react';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import type { NewPlan } from 'api/buying.api';

interface Props {
  open: boolean;
  busy: boolean;
  stores: { id: string; name: string }[];
  /** The store the page is scoped to (fixed), or null when she picks. */
  fixedStore: { id: string; name: string } | null;
  offerAll: boolean;
  errors: Record<string, string>;
  error: string | null;
  onClose: () => void;
  onCreate: (payload: NewPlan) => void;
}

export default function NewPlanDialog({ open, busy, stores, fixedStore, offerAll, errors, error, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [store, setStore] = useState('');
  const [target, setTarget] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [budget, setBudget] = useState('');

  const submit = () => {
    const payload: NewPlan = { name: name.trim(), target_date: target };
    const location = fixedStore ? fixedStore.id : store;
    if (location) payload.location = location;
    if (start) payload.window_start = start;
    if (end) payload.window_end = end;
    if (budget.trim()) payload.budget_cost = budget.trim();
    onCreate(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New plan</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={Boolean(errors.name)}
            helperText={errors.name}
            autoFocus
          />
          {fixedStore ? (
            <TextField label="Store" value={fixedStore.name} slotProps={{ htmlInput: { readOnly: true } }} />
          ) : (
            <TextField
              select
              label="Store"
              value={store}
              onChange={(e) => setStore(e.target.value)}
              error={Boolean(errors.location)}
              helperText={errors.location || 'One memo per store.'}
            >
              {offerAll ? <MenuItem value="all">Every store (one plan each)</MenuItem> : null}
              {stores.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            type="date"
            label="Order by"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            error={Boolean(errors.target_date)}
            helperText={errors.target_date || 'The day you place the order.'}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              type="date"
              label="Selling from (optional)"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              error={Boolean(errors.window_start)}
              helperText={errors.window_start}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              type="date"
              label="Selling until (optional)"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              error={Boolean(errors.window_end)}
              helperText={errors.window_end}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </Stack>
          <TextField
            label="Budget at cost (optional)"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            error={Boolean(errors.budget_cost)}
            helperText={errors.budget_cost}
            slotProps={{ htmlInput: { inputMode: 'decimal' } }}
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy || !name.trim() || !target}>
          Create plan
        </Button>
      </DialogActions>
    </Dialog>
  );
}
