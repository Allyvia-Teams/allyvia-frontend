import React from 'react';
import { FormControlLabel, FormHelperText, Switch } from '@mui/material';
import { FieldEditorBaseProps } from './fieldEditorTypes';

export type ToggleFieldValue = boolean;

const ToggleField: React.FC<FieldEditorBaseProps<ToggleFieldValue>> = ({ field, value, onChange, disabled }) => {
  return (
    <>
      <FormControlLabel
        control={
          <Switch
            checked={Boolean(value)}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
            inputProps={{ 'aria-label': field.label }}
          />
        }
        label={field.label}
      />
      <FormHelperText> </FormHelperText>
    </>
  );
};

export default ToggleField;
