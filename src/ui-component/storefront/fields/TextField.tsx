import React from 'react';
import { Box, FormHelperText, TextField as MuiTextField, Typography } from '@mui/material';
import { FieldEditorBaseProps, getRequiredError } from './fieldEditorTypes';

export type TextFieldValue = string;

const TextField: React.FC<FieldEditorBaseProps<TextFieldValue>> = ({
  field,
  value,
  onChange,
  disabled,
  showValidation
}) => {
  const text = value ?? '';
  const maxLength = field.max_length;
  const requiredError = getRequiredError(field, text, showValidation);
  const lengthError =
    showValidation && typeof maxLength === 'number' && text.length > maxLength
      ? `Must be ${maxLength} characters or fewer`
      : undefined;
  const error = requiredError || lengthError;

  return (
    <Box>
      <MuiTextField
        fullWidth
        size="small"
        label={field.label}
        value={text}
        disabled={disabled}
        required={field.required}
        error={Boolean(error)}
        helperText={error || field.help_text}
        // Never silently truncate — allow full input and surface validation instead.
        onChange={(event) => onChange(event.target.value)}
        inputProps={{
          'aria-label': field.label
        }}
      />
      {typeof maxLength === 'number' ? (
        <Typography
          variant="caption"
          color={text.length > maxLength ? 'error' : 'text.secondary'}
          sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}
        >
          {text.length} / {maxLength}
        </Typography>
      ) : null}
      {!error && !field.help_text ? <FormHelperText> </FormHelperText> : null}
    </Box>
  );
};

export default TextField;
