import React from 'react';
import { TextField } from '@mui/material';
import { FieldEditorBaseProps, getRequiredError } from './fieldEditorTypes';

export type NumberFieldValue = number | null;

const NumberField: React.FC<FieldEditorBaseProps<NumberFieldValue>> = ({
  field,
  value,
  onChange,
  disabled,
  showValidation
}) => {
  const requiredError = getRequiredError(field, value, showValidation);
  const numeric = typeof value === 'number' ? value : null;

  let rangeError: string | undefined;
  if (showValidation && numeric !== null) {
    if (typeof field.min === 'number' && numeric < field.min) {
      rangeError = `Must be at least ${field.min}`;
    } else if (typeof field.max === 'number' && numeric > field.max) {
      rangeError = `Must be at most ${field.max}`;
    }
  }

  const error = requiredError || rangeError;

  return (
    <TextField
      fullWidth
      size="small"
      type="number"
      label={field.label}
      value={numeric ?? ''}
      disabled={disabled}
      required={field.required}
      error={Boolean(error)}
      helperText={error || ' '}
      inputProps={{
        min: field.min,
        max: field.max,
        'aria-label': field.label
      }}
      onChange={(event) => {
        const raw = event.target.value;
        if (raw === '') {
          onChange(null);
          return;
        }

        const next = Number(raw);
        if (Number.isNaN(next)) {
          return;
        }

        // Block values outside the declared range rather than accepting and truncating.
        if (typeof field.min === 'number' && next < field.min) {
          return;
        }
        if (typeof field.max === 'number' && next > field.max) {
          return;
        }

        onChange(next);
      }}
    />
  );
};

export default NumberField;
