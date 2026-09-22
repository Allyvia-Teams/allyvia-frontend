import React, { useState } from 'react';
import { Box, Button, FormHelperText, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { IconGripVertical, IconPhotoPlus, IconTrash } from '@tabler/icons-react';
import type { StorefrontMediaValue } from 'views/storefront/builder/types.local';
import { FieldEditorBaseProps, getRequiredError } from './fieldEditorTypes';

export type MediaListFieldValue = NonNullable<StorefrontMediaValue>[];

const MediaListField: React.FC<FieldEditorBaseProps<MediaListFieldValue>> = ({
  field,
  value,
  onChange,
  disabled,
  showValidation
}) => {
  const items = value ?? [];
  const requiredError = getRequiredError(field, items, showValidation);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return;
    }
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(next);
  };

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 500 }}>
        {field.label}
        {field.required ? ' *' : ''}
      </Typography>

      {items.length === 0 ? (
        <Button
          variant="outlined"
          startIcon={<IconPhotoPlus size={18} />}
          disabled={disabled}
          aria-label={`Add images for ${field.label}`}
          onClick={() => {
            // TODO(T3): open media picker when available.
            onChange([{ id: `media_${Date.now()}`, url: '', alt: 'Image' }]);
          }}
        >
          Add images
        </Button>
      ) : (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {items.map((item, index) => (
            <Box
              key={`${item.id ?? item.url ?? 'media'}-${index}`}
              draggable={!disabled}
              onDragStart={() => setDraggedIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggedIndex === null) {
                  return;
                }
                handleReorder(draggedIndex, index);
                setDraggedIndex(null);
              }}
              onDragEnd={() => setDraggedIndex(null)}
              sx={{
                width: 88,
                height: 88,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                position: 'relative',
                bgcolor: 'grey.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: draggedIndex === index ? 0.55 : 1,
                cursor: disabled ? 'default' : 'grab'
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, textAlign: 'center' }}>
                {item.alt || item.id || 'Image'}
              </Typography>

              <Box sx={{ position: 'absolute', top: 2, left: 2, color: 'text.secondary' }}>
                <IconGripVertical size={14} aria-hidden />
              </Box>

              <Tooltip title="Remove image">
                <IconButton
                  size="small"
                  disabled={disabled}
                  aria-label={`Remove image ${index + 1}`}
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                  sx={{ position: 'absolute', top: 0, right: 0 }}
                >
                  <IconTrash size={14} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}

          <Button
            variant="outlined"
            disabled={disabled}
            aria-label={`Add another image to ${field.label}`}
            onClick={() => {
              // TODO(T3): open media picker when available.
              onChange([...items, { id: `media_${Date.now()}`, url: '', alt: 'Image' }]);
            }}
            sx={{ width: 88, height: 88, minWidth: 88 }}
          >
            +
          </Button>
        </Stack>
      )}

      <FormHelperText error={Boolean(requiredError)}>{requiredError || ' '}</FormHelperText>
    </Box>
  );
};

export default MediaListField;
