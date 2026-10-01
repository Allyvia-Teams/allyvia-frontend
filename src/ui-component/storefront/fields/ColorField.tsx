import React, { useMemo, useState } from 'react';
import { Box, FormHelperText, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { mockThemePalette } from 'views/storefront/builder/fixtures/mockTheme';
import { FieldEditorBaseProps, getRequiredError } from './fieldEditorTypes';

export type ColorFieldValue = string;

const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const ColorField: React.FC<FieldEditorBaseProps<ColorFieldValue>> = ({ field, value, onChange, disabled, showValidation }) => {
  const paletteEntries = useMemo(
    () =>
      Object.entries(mockThemePalette).map(([token, hex]) => ({
        token,
        hex
      })),
    []
  );

  const current = value ?? '';
  const matchedToken = paletteEntries.find((entry) => entry.hex.toLowerCase() === current.toLowerCase())?.token;
  const [mode, setMode] = useState<'palette' | 'custom'>(matchedToken ? 'palette' : current ? 'custom' : 'palette');

  const requiredError = getRequiredError(field, current, showValidation);
  const hexError =
    showValidation && mode === 'custom' && current && !HEX_PATTERN.test(current) ? 'Enter a valid hex color (#RGB or #RRGGBB)' : undefined;
  const error = requiredError || hexError;

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 500 }}>
        {field.label}
        {field.required ? ' *' : ''}
      </Typography>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={mode}
        disabled={disabled}
        onChange={(_, next) => {
          if (!next) {
            return;
          }
          setMode(next);
          if (next === 'palette' && matchedToken) {
            return;
          }
          if (next === 'palette') {
            onChange(mockThemePalette.accent);
          }
        }}
        sx={{ mb: 1.5 }}
      >
        <ToggleButton value="palette" aria-label="Theme palette colors">
          Theme
        </ToggleButton>
        <ToggleButton value="custom" aria-label="Custom hex color">
          Custom
        </ToggleButton>
      </ToggleButtonGroup>

      {mode === 'palette' ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {paletteEntries.map((entry) => {
            const selected = current.toLowerCase() === entry.hex.toLowerCase();
            return (
              <Box
                key={entry.token}
                component="button"
                type="button"
                disabled={disabled}
                aria-label={`${entry.token} ${entry.hex}`}
                onClick={() => onChange(entry.hex)}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  border: 2,
                  borderColor: selected ? 'primary.main' : 'divider',
                  bgcolor: entry.hex,
                  cursor: disabled ? 'default' : 'pointer',
                  p: 0
                }}
                title={`${entry.token}: ${entry.hex}`}
              />
            );
          })}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
              bgcolor: HEX_PATTERN.test(current) ? current : 'transparent'
            }}
          />
          <TextField
            size="small"
            label="Hex"
            value={current}
            disabled={disabled}
            error={Boolean(hexError)}
            onChange={(event) => onChange(event.target.value)}
            inputProps={{ 'aria-label': `${field.label} hex color` }}
            sx={{ flex: 1 }}
          />
        </Box>
      )}

      <FormHelperText error={Boolean(error)}>{error || ' '}</FormHelperText>
    </Box>
  );
};

export default ColorField;
