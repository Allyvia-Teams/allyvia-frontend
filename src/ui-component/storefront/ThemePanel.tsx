import React, { useEffect, useMemo } from 'react';
import { Alert, Box, Button, FormControl, InputLabel, MenuItem, Select, Slider, Stack, TextField, Typography } from '@mui/material';
import { IconPhotoPlus } from '@tabler/icons-react';
import { BRAND_FONTS } from 'config/brandFonts';
import { AA_NORMAL, contrastRatio } from 'themes/harmony';
import type { StorefrontTheme } from 'types/storefront';
import { loadGoogleFont } from 'utils/loadFont';
import { mockThemePalette } from 'views/storefront/builder/fixtures/mockTheme';

const COLOR_TOKENS = ['ink', 'paper', 'surface', 'accent', 'line', 'muted'] as const;
type ColorToken = (typeof COLOR_TOKENS)[number];

const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const TOKEN_LABELS: Record<ColorToken, string> = {
  ink: 'Ink',
  paper: 'Paper',
  surface: 'Surface',
  accent: 'Accent',
  line: 'Line',
  muted: 'Muted'
};

/** Sensible defaults for per-group reset (ticket Part 4). */
export const DEFAULT_STOREFRONT_THEME: Required<Pick<StorefrontTheme, 'colors' | 'fonts' | 'radius' | 'logo_media_id'>> = {
  colors: { ...mockThemePalette },
  fonts: {
    heading: BRAND_FONTS[0].family,
    body: BRAND_FONTS[1].family
  },
  radius: 8,
  logo_media_id: null
};

export function mergeThemeDefaults(theme?: StorefrontTheme | null): StorefrontTheme {
  return {
    colors: { ...DEFAULT_STOREFRONT_THEME.colors, ...theme?.colors },
    fonts: {
      heading: theme?.fonts?.heading || DEFAULT_STOREFRONT_THEME.fonts.heading,
      body: theme?.fonts?.body || DEFAULT_STOREFRONT_THEME.fonts.body
    },
    radius: theme?.radius ?? DEFAULT_STOREFRONT_THEME.radius,
    logo_media_id: theme?.logo_media_id ?? null
  };
}

function expandHex(hex: string): string | null {
  if (!HEX_PATTERN.test(hex)) return null;
  if (hex.length === 4) {
    const [, r, g, b] = hex;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return hex.toLowerCase();
}

type ContrastPair = { a: ColorToken; b: ColorToken; label: string };

const CONTRAST_PAIRS: ContrastPair[] = [
  { a: 'ink', b: 'paper', label: 'Ink on paper' },
  { a: 'ink', b: 'surface', label: 'Ink on surface' },
  { a: 'muted', b: 'paper', label: 'Muted on paper' }
];

export type ThemePanelProps = {
  theme: StorefrontTheme;
  onChange: (theme: StorefrontTheme) => void;
  disabled?: boolean;
};

function ResetLink({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button size="small" variant="text" onClick={onClick} disabled={disabled} sx={{ alignSelf: 'flex-start', px: 0, minWidth: 0 }}>
      Reset to default
    </Button>
  );
}

function ColorSwatch({
  token,
  value,
  disabled,
  onChange
}: {
  token: ColorToken;
  value: string;
  disabled?: boolean;
  onChange: (hex: string) => void;
}) {
  const hex = value || '#000000';
  const inputId = `theme-color-${token}`;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        component="label"
        htmlFor={inputId}
        sx={{
          width: 40,
          height: 40,
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          bgcolor: HEX_PATTERN.test(hex) ? hex : 'transparent',
          cursor: disabled ? 'default' : 'pointer',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0
        }}
        title={`${TOKEN_LABELS[token]} ${hex}`}
      >
        <Box
          component="input"
          id={inputId}
          type="color"
          value={expandHex(hex) ?? '#000000'}
          disabled={disabled}
          aria-label={`${TOKEN_LABELS[token]} color`}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            width: '100%',
            height: '100%',
            cursor: disabled ? 'default' : 'pointer',
            border: 0,
            p: 0
          }}
        />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {TOKEN_LABELS[token]}
        </Typography>
        <TextField
          size="small"
          fullWidth
          value={hex}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          inputProps={{ 'aria-label': `${TOKEN_LABELS[token]} hex` }}
        />
      </Box>
    </Box>
  );
}

function FontSpecimen({ family, role }: { family: string; role: 'Heading' | 'Body' }) {
  useEffect(() => {
    if (family) loadGoogleFont(family);
  }, [family]);

  const entry = BRAND_FONTS.find((font) => font.family === family);

  return (
    <Box sx={{ mt: 1, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'grey.50' }}>
      <Typography
        aria-label={`${role} font specimen`}
        sx={{
          fontFamily: `"${family}", sans-serif`,
          fontSize: role === 'Heading' ? 40 : 28,
          lineHeight: 1.1,
          fontWeight: role === 'Heading' ? 600 : 400
        }}
      >
        Aa
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {entry?.label ?? family}
      </Typography>
    </Box>
  );
}

const ThemePanel: React.FC<ThemePanelProps> = ({ theme, onChange, disabled }) => {
  const colors = useMemo(() => ({ ...DEFAULT_STOREFRONT_THEME.colors, ...theme.colors }), [theme.colors]);
  const fonts = theme.fonts ?? DEFAULT_STOREFRONT_THEME.fonts;
  const radius = theme.radius ?? DEFAULT_STOREFRONT_THEME.radius;
  const logoId = theme.logo_media_id ?? null;

  const contrastWarnings = useMemo(() => {
    const warnings: string[] = [];
    for (const pair of CONTRAST_PAIRS) {
      const a = expandHex(colors[pair.a] ?? '');
      const b = expandHex(colors[pair.b] ?? '');
      if (!a || !b) continue;
      const ratio = contrastRatio(a, b);
      if (ratio < AA_NORMAL) {
        warnings.push(`${pair.label}: Low contrast — may be hard to read (ratio: ${ratio.toFixed(1)}, needs 4.5)`);
      }
    }
    return warnings;
  }, [colors]);

  const patch = (partial: Partial<StorefrontTheme>) => {
    onChange({
      ...theme,
      ...partial,
      colors: partial.colors ? { ...colors, ...partial.colors } : theme.colors,
      fonts: partial.fonts ? { ...fonts, ...partial.fonts } : theme.fonts
    });
  };

  const setColor = (token: ColorToken, hex: string) => {
    patch({ colors: { ...colors, [token]: hex } });
  };

  return (
    <Stack spacing={3}>
      <Typography variant="subtitle1" fontWeight={600}>
        Theme
      </Typography>

      {/* Colors */}
      <Stack spacing={1.5}>
        <Typography variant="subtitle2">Colors</Typography>
        <Stack spacing={1.25}>
          {COLOR_TOKENS.map((token) => (
            <ColorSwatch
              key={token}
              token={token}
              value={colors[token] ?? '#000000'}
              disabled={disabled}
              onChange={(hex) => setColor(token, hex)}
            />
          ))}
        </Stack>
        {contrastWarnings.map((warning) => (
          <Alert key={warning} severity="warning" sx={{ py: 0.5 }}>
            {warning}
          </Alert>
        ))}
        <ResetLink disabled={disabled} onClick={() => patch({ colors: { ...DEFAULT_STOREFRONT_THEME.colors } })} />
      </Stack>

      {/* Fonts */}
      <Stack spacing={1.5}>
        <Typography variant="subtitle2">Fonts</Typography>
        <FormControl fullWidth size="small" disabled={disabled}>
          <InputLabel id="theme-heading-font-label">Heading font</InputLabel>
          <Select
            labelId="theme-heading-font-label"
            label="Heading font"
            value={fonts.heading}
            onChange={(event) => patch({ fonts: { ...fonts, heading: String(event.target.value) } })}
          >
            {BRAND_FONTS.map((font) => (
              <MenuItem key={font.family} value={font.family}>
                {font.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FontSpecimen family={fonts.heading} role="Heading" />

        <FormControl fullWidth size="small" disabled={disabled}>
          <InputLabel id="theme-body-font-label">Body font</InputLabel>
          <Select
            labelId="theme-body-font-label"
            label="Body font"
            value={fonts.body}
            onChange={(event) => patch({ fonts: { ...fonts, body: String(event.target.value) } })}
          >
            {BRAND_FONTS.map((font) => (
              <MenuItem key={`body-${font.family}`} value={font.family}>
                {font.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FontSpecimen family={fonts.body} role="Body" />
        <ResetLink disabled={disabled} onClick={() => patch({ fonts: { ...DEFAULT_STOREFRONT_THEME.fonts } })} />
      </Stack>

      {/* Logo */}
      <Stack spacing={1.5}>
        <Typography variant="subtitle2">Logo</Typography>
        <Box
          sx={{
            border: 1,
            borderStyle: 'dashed',
            borderColor: 'divider',
            borderRadius: 1,
            minHeight: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.50',
            px: 2,
            py: 2
          }}
        >
          {logoId ? (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" noWrap>
                {logoId}
              </Typography>
              <Button
                size="small"
                disabled={disabled}
                sx={{ mt: 1 }}
                onClick={() => patch({ logo_media_id: null })}
                aria-label="Remove logo"
              >
                Remove
              </Button>
            </Box>
          ) : (
            <Button
              variant="outlined"
              startIcon={<IconPhotoPlus size={18} />}
              disabled={disabled}
              aria-label="Add logo image"
              onClick={() => {
                // TODO(T3): open media picker when available.
                patch({ logo_media_id: 'media_placeholder' });
              }}
            >
              Add image
            </Button>
          )}
        </Box>

        {/* Header lockup preview */}
        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
            bgcolor: colors.paper
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 1.5,
              py: 1,
              borderBottom: 1,
              borderColor: colors.line,
              bgcolor: colors.surface
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 28,
                borderRadius: `${Math.min(radius, 8)}px`,
                bgcolor: logoId ? colors.accent : colors.line,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.paper,
                fontSize: 11,
                fontWeight: 600,
                flexShrink: 0
              }}
            >
              {logoId ? 'Logo' : 'No logo'}
            </Box>
            <Stack direction="row" spacing={1.5} sx={{ ml: 'auto' }}>
              {['Shop', 'About', 'Contact'].map((item) => (
                <Typography key={item} variant="caption" sx={{ color: colors.ink, opacity: 0.8 }}>
                  {item}
                </Typography>
              ))}
            </Stack>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1.5, py: 1 }}>
            Header lockup preview
          </Typography>
        </Box>
        <ResetLink disabled={disabled} onClick={() => patch({ logo_media_id: null })} />
      </Stack>

      {/* Radius */}
      <Stack spacing={1.5}>
        <Typography variant="subtitle2">Corner radius</Typography>
        <Box sx={{ px: 1 }}>
          <Slider
            value={radius}
            min={0}
            max={24}
            step={1}
            disabled={disabled}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value}px`}
            onChange={(_, value) => patch({ radius: Array.isArray(value) ? value[0] : value })}
            aria-label="Corner radius"
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          {radius}px
        </Typography>
        <ResetLink disabled={disabled} onClick={() => patch({ radius: DEFAULT_STOREFRONT_THEME.radius })} />
      </Stack>
    </Stack>
  );
};

export default ThemePanel;
