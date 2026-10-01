import React from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { mockCollections } from 'views/storefront/builder/fixtures/mockCollections';
import type { StorefrontCollectionRef } from 'views/storefront/builder/types.local';
import { FieldEditorBaseProps, getRequiredError } from './fieldEditorTypes';

export type CollectionRefFieldValue = string | null;

const CollectionRefField: React.FC<FieldEditorBaseProps<CollectionRefFieldValue>> = ({
  field,
  value,
  onChange,
  disabled,
  showValidation
}) => {
  const selected = mockCollections.find((collection) => collection.id === value) ?? null;
  const requiredError = getRequiredError(field, value, showValidation);

  return (
    <Autocomplete
      options={mockCollections}
      value={selected}
      disabled={disabled}
      getOptionLabel={(option: StorefrontCollectionRef) => option.title}
      isOptionEqualToValue={(option, current) => option.id === current.id}
      onChange={(_, next) => onChange(next?.id ?? null)}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label={field.label}
          required={field.required}
          error={Boolean(requiredError)}
          helperText={requiredError || ' '}
        />
      )}
    />
  );
};

export default CollectionRefField;
