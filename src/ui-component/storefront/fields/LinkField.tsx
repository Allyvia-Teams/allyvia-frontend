import React from 'react';
import { Box, FormControl, FormHelperText, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import type { StorefrontLinkKind, StorefrontLinkValue } from 'views/storefront/builder/types.local';
import { FieldEditorBaseProps, getRequiredError } from './fieldEditorTypes';

export type LinkFieldValue = StorefrontLinkValue;

const LINK_OPTIONS: Array<{ value: StorefrontLinkKind; label: string }> = [
  { value: 'home', label: 'Home' },
  { value: 'collection', label: 'Collection' },
  { value: 'product', label: 'Product' },
  { value: 'page', label: 'Page' },
  { value: 'external', label: 'External URL' }
];

function isValidExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

const LinkField: React.FC<FieldEditorBaseProps<LinkFieldValue>> = ({ field, value, onChange, disabled, showValidation }) => {
  const link = value ?? { kind: 'home' as StorefrontLinkKind };
  const requiredError = getRequiredError(field, link, showValidation);
  const externalError =
    showValidation && link.kind === 'external' && link.value && !isValidExternalUrl(link.value)
      ? 'URL must start with http:// or https://'
      : undefined;
  const error = requiredError || externalError;

  return (
    <Box>
      <FormControl fullWidth size="small" disabled={disabled} error={Boolean(error)}>
        <InputLabel id={`${field.key}-link-kind-label`}>{field.label}</InputLabel>
        <Select
          labelId={`${field.key}-link-kind-label`}
          label={field.label}
          value={link.kind}
          onChange={(event) => {
            const kind = event.target.value as StorefrontLinkKind;
            onChange({
              kind,
              value: kind === 'home' ? undefined : link.value
            });
          }}
        >
          {LINK_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {link.kind === 'external' ? (
        <TextField
          fullWidth
          size="small"
          sx={{ mt: 1.5 }}
          label="External URL"
          value={link.value ?? ''}
          disabled={disabled}
          error={Boolean(externalError) || (showValidation && field.required && !link.value)}
          // Never silently truncate URLs.
          onChange={(event) => onChange({ ...link, value: event.target.value })}
          inputProps={{ 'aria-label': `${field.label} external URL` }}
        />
      ) : null}

      {link.kind !== 'home' && link.kind !== 'external' ? (
        <TextField
          fullWidth
          size="small"
          sx={{ mt: 1.5 }}
          label={`${LINK_OPTIONS.find((option) => option.value === link.kind)?.label ?? 'Target'} ID`}
          value={link.value ?? ''}
          disabled={disabled}
          onChange={(event) => onChange({ ...link, value: event.target.value })}
          inputProps={{ 'aria-label': `${field.label} target` }}
        />
      ) : null}

      <FormHelperText error={Boolean(error)}>{error || ' '}</FormHelperText>
    </Box>
  );
};

export default LinkField;
