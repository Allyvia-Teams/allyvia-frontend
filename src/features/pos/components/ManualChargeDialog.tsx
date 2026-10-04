import { useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import type { Product } from '../types/pos.types';
import { createManualCharge, manualChargePriceError, type ManualChargeForm } from '../utils/manualCharge';

interface Props {
  taxRate: number;
  onAdd: (product: Product) => void;
  onClose: () => void;
}

// Mounted only while open, so each new entry starts blank and taxable.
export default function ManualChargeDialog({ taxRate, onAdd, onClose }: Props) {
  const [form, setForm] = useState<ManualChargeForm>({ price: '', name: '', description: '', isTaxable: true });
  const [attempted, setAttempted] = useState(false);
  const priceError = manualChargePriceError(form.price);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="manual-charge-title">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setAttempted(true);
          if (priceError) return;
          onAdd(createManualCharge(form, taxRate));
          onClose();
        }}
      >
        <DialogTitle id="manual-charge-title">Manual charge</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              label="Price"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              error={attempted && Boolean(priceError)}
              helperText={attempted ? priceError : 'Required · price per item'}
              slotProps={{
                htmlInput: { inputMode: 'decimal', maxLength: 13 },
                input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }
              }}
            />
            <TextField
              fullWidth
              label="Name (optional)"
              placeholder="Manual charge"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              slotProps={{ htmlInput: { maxLength: 255 } }}
            />
            <TextField
              fullWidth
              label="Description (optional)"
              value={form.description}
              multiline
              minRows={2}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
            />
            <FormControlLabel
              control={<Checkbox checked={form.isTaxable} onChange={(_event, checked) => setForm({ ...form, isTaxable: checked })} />}
              label="Taxable"
            />
            <Typography variant="caption" color="text.secondary">
              {form.isTaxable ? `Store tax (${Number((taxRate * 100).toFixed(2))}%) applies.` : 'No tax will be added.'} This charge does
              not change inventory.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            Add to order
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
