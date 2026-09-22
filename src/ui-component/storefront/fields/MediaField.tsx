import React from 'react';
import { Box, Button, FormHelperText, Typography } from '@mui/material';
import { IconPhotoPlus } from '@tabler/icons-react';
import type { StorefrontMediaValue } from 'views/storefront/builder/types.local';
import { FieldEditorBaseProps, getRequiredError } from './fieldEditorTypes';

export type MediaFieldValue = StorefrontMediaValue;

const MediaField: React.FC<FieldEditorBaseProps<MediaFieldValue>> = ({
  field,
  value,
  onChange,
  disabled,
  showValidation
}) => {
  const requiredError = getRequiredError(field, value, showValidation);
  const hasMedia = Boolean(value?.url || value?.id);

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 500 }}>
        {field.label}
        {field.required ? ' *' : ''}
      </Typography>

      <Box
        sx={{
          border: 1,
          borderStyle: 'dashed',
          borderColor: requiredError ? 'error.main' : 'divider',
          borderRadius: 1,
          minHeight: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.50',
          px: 2,
          py: 2
        }}
      >
        {hasMedia ? (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" noWrap>
              {value?.url || value?.id}
            </Typography>
            <Button
              size="small"
              disabled={disabled}
              sx={{ mt: 1 }}
              onClick={() => onChange(null)}
              aria-label={`Remove ${field.label}`}
            >
              Remove
            </Button>
          </Box>
        ) : (
          <Button
            variant="outlined"
            startIcon={<IconPhotoPlus size={18} />}
            disabled={disabled}
            aria-label={`Add image for ${field.label}`}
            onClick={() => {
              // TODO(T3): open media picker when available. Placeholder click target only.
              onChange({ id: 'media_placeholder', url: '', alt: field.label });
            }}
          >
            Add image
          </Button>
        )}
      </Box>

      <FormHelperText error={Boolean(requiredError)}>{requiredError || ' '}</FormHelperText>
    </Box>
  );
};

export default MediaField;
