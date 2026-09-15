import React from 'react';
import { FormControl, FormHelperText, InputLabel, MenuItem, Select } from '@mui/material';
import { FieldEditorBaseProps, getRequiredError } from './fieldEditorTypes';

export type SelectFieldValue = string;

const SelectField: React.FC<FieldEditorBaseProps<SelectFieldValue>> = ({
  field,
  value,
  onChange,
  disabled,
  showValidation
}) => {
  const selected = value ?? '';
  const requiredError = getRequiredError(field, selected, showValidation);

  return (
    <FormControl fullWidth size="small" disabled={disabled} error={Boolean(requiredError)} required={field.required}>
      <InputLabel id={`${field.key}-select-label`}>{field.label}</InputLabel>
      <Select
        labelId={`${field.key}-select-label`}
        label={field.label}
        value={selected}
        onChange={(event) => onChange(String(event.target.value))}
        inputProps={{ 'aria-label': field.label }}
      >
        {(field.options ?? []).map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>{requiredError || field.help_text || ' '}</FormHelperText>
    </FormControl>
  );
};

export default SelectField;
