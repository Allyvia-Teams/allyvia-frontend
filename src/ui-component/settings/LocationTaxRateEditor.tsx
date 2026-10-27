// One store's sales tax rate: shown with where it came from, editable as a
// percent, and revertible to the automatic rate once set by hand. Used by
// Inventory > Locations and by Business Info (Settings > General and the
// onboarding wizard's first step).

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { updateLocation, type Location, type LocationUpdate } from 'api/inventoryStock.api';

import { checkTaxPercent, editStartPercent, isManualRate, taxRateLabel, taxSourceLabel } from './locationTax';
import { fractionToPercent } from './taxRate';

/** The react-query key every location list in the app shares. */
export const LOCATIONS_QUERY_KEY = ['inventory-locations'];

const errorMessage = (err: unknown, fallback: string): string => {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data ?? {};
  if (typeof data.detail === 'string') return data.detail;
  const first = Object.values(data).find((value) => Array.isArray(value) && value.length);
  if (Array.isArray(first)) return String(first[0]);
  return fallback;
};

interface Props {
  location: Location;
  disabled?: boolean;
  onSaved?: (location: Location) => void;
}

export default function LocationTaxRateEditor({ location, disabled, onSaved }: Props) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (payload: LocationUpdate) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateLocation(location.id, payload);
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY });
      onSaved?.(updated);
    } catch (err) {
      setError(errorMessage(err, 'The rate could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    const check = checkTaxPercent(value);
    const base = fractionToPercent(location.state_base_rate);
    return (
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-start' }}>
        <TextField
          size="small"
          label="Sales tax rate"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          error={!!error || (value !== '' && !!check.error)}
          helperText={error || (value !== '' && check.error) || (base ? `State base rate: ${base}%` : ' ')}
          slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
          sx={{ width: 180 }}
          autoFocus
        />
        <Button
          size="small"
          variant="contained"
          disabled={saving || !check.fraction}
          onClick={() => check.fraction && save({ sales_tax_rate: check.fraction })}
          sx={{ mt: { sm: 0.5 } }}
        >
          Save
        </Button>
        <Button size="small" disabled={saving} onClick={() => setEditing(false)} sx={{ mt: { sm: 0.5 } }}>
          Cancel
        </Button>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <Typography variant="body2">{taxRateLabel(location)}</Typography>
      <Typography variant="caption" color="text.secondary">
        {taxSourceLabel(location)}
      </Typography>
      <Button
        size="small"
        disabled={disabled || saving}
        onClick={() => {
          setValue(editStartPercent(location));
          setError(null);
          setEditing(true);
        }}
      >
        Change
      </Button>
      {isManualRate(location) ? (
        <Button size="small" disabled={disabled || saving} onClick={() => save({ use_automatic_tax_rate: true })}>
          Use automatic rate
        </Button>
      ) : null}
      {error ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
}
