import React from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { mockProducts } from 'views/storefront/builder/fixtures/mockProducts';
import type { StorefrontProductRef } from 'views/storefront/builder/types.local';
import { FieldEditorBaseProps, getRequiredError } from './fieldEditorTypes';

export type ProductRefFieldValue = string | null;

const ProductRefField: React.FC<FieldEditorBaseProps<ProductRefFieldValue>> = ({
  field,
  value,
  onChange,
  disabled,
  showValidation
}) => {
  const selected = mockProducts.find((product) => product.id === value) ?? null;
  const requiredError = getRequiredError(field, value, showValidation);

  return (
    <Autocomplete
      options={mockProducts}
      value={selected}
      disabled={disabled}
      getOptionLabel={(option: StorefrontProductRef) => option.title}
      isOptionEqualToValue={(option, current) => option.id === current.id}
      onChange={(_, next) => onChange(next?.id ?? null)}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label={field.label}
          required={field.required}
          error={Boolean(requiredError)}
          helperText={requiredError || field.help_text}
        />
      )}
    />
  );
};

export default ProductRefField;
