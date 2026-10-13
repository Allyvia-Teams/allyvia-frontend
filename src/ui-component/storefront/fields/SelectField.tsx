import React from 'react';
import { FormControl, FormHelperText, InputLabel, MenuItem, Select } from '@mui/material';
import { FieldEditorBaseProps, getRequiredError } from './fieldEditorTypes';

export type SelectFieldValue = string;

const SelectField: React.FC<FieldEditorBaseProps<SelectFieldValue>> = ({ field, value, onChange, disabled, showValidation }) => {
  const selected = value ?? '';
  const requiredError = getRequiredError(field, selected, showValidation);
  // T1 SectionField.options is string[] (label === value).
  const options = field.options ?? [];

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
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>{requiredError || ' '}</FormHelperText>
    </FormControl>
  );
};

export default SelectField;
