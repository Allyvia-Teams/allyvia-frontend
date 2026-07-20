import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Fab from '@mui/material/Fab';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { ThemeProvider, useTheme } from '@mui/material/styles';

import { IconBrush, IconPlus, IconLayoutDashboard, IconUpload } from '@tabler/icons-react';

import SettingsSectionCard from './SettingsSectionCard';
import useConfig from 'hooks/useConfig';
import { ThemeMode } from 'config';
import { BRAND_FONTS } from 'config/brandFonts';
import { loadGoogleFont } from 'utils/loadFont';
import { extractBrandColors } from 'utils/extractBrandColors';
import { AA_NORMAL, contrastRatio } from 'themes/brandPalette';
import Palette from 'themes/palette';
import { dispatch, useSelector } from 'store';
import { openSnackbar } from 'store/slices/snackbar';
import { putCompanyTheme } from 'api/branding';
import { writeBrandThemeCache } from 'utils/brandThemeCache';

const ALLYVIA_PRIMARY = '#2f6fd4';
const ALLYVIA_SECONDARY = '#5f4cc0';
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const notify = (message: string, color: 'success' | 'error' = 'success') =>
  dispatch(
    openSnackbar({
      open: true,
      message,
      variant: 'alert',
      alert: { color },
      anchorOrigin: { vertical: 'top', horizontal: 'right' },
      close: true
    })
  );

/** WCAG contrast against white, guarded so an in-progress/invalid hex never throws. */
function safeContrastOnWhite(hex: string): number {
  try {
    return contrastRatio(hex, '#fff');
  } catch {
    return 0;
  }
}

function normalizeHexInput(raw: string): string {
  const v = raw.trim();
  return v.startsWith('#') ? v : `#${v}`;
}

// ---- color field: native swatch + hex input + live AA contrast badge --------------------

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  const ratio = safeContrastOnWhite(value);
  const passes = ratio >= AA_NORMAL;
  const validHex = HEX_RE.test(value);

  return (
    <Stack spacing={0.75} sx={{ minWidth: 220 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          component="input"
          type="color"
          value={validHex ? value : '#000000'}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          aria-label={`${label} color picker`}
          sx={{
            width: 44,
            height: 40,
            p: 0,
            border: (t) => `1px solid ${t.palette.divider}`,
            borderRadius: 1,
            bgcolor: 'transparent',
            cursor: 'pointer'
          }}
        />
        <TextField
          size="small"
          value={value}
          onChange={(e) => onChange(normalizeHexInput(e.target.value))}
          error={!validHex}
          sx={{ width: 130 }}
          inputProps={{ 'aria-label': `${label} hex value` }}
        />
        <Tooltip title="White text on this color — WCAG AA needs ≥ 4.5:1">
          <Chip
            size="small"
            color={passes ? 'success' : 'warning'}
            variant={passes ? 'filled' : 'outlined'}
            label={validHex ? `${passes ? 'AA' : 'Low'} ${ratio.toFixed(1)}:1` : 'Invalid'}
          />
        </Tooltip>
      </Stack>
    </Stack>
  );
}

// ---- scoped live preview of the brand theme ---------------------------------------------

interface PreviewProps {
  primary: string;
  secondary: string;
  headingFont: string;
  mode: ThemeMode;
}

function BrandPreview({ primary, secondary, headingFont, mode }: PreviewProps) {
  // A full MUI theme built from the current selections. Scoped to this subtree via ThemeProvider,
  // so nothing leaks to the app until the admin clicks Apply.
  const previewTheme = useMemo(
    () => Palette(mode, 'default', { primary, secondary, headingFont: headingFont || 'Inter' }),
    [mode, primary, secondary, headingFont]
  );

  return (
    <ThemeProvider theme={previewTheme}>
      <Box
        sx={{
          borderRadius: 2,
          border: (t) => `1px solid ${t.palette.divider}`,
          bgcolor: 'background.paper',
          p: 2.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontFamily: headingFont ? `'${headingFont}', serif` : undefined, color: 'text.primary', fontWeight: 700 }}
        >
          Dashboard
        </Typography>

        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <Button variant="contained" color="primary">
            Save changes
          </Button>
          <Button variant="outlined" color="secondary">
            Secondary
          </Button>
          <Tooltip title="Add new item">
            <Fab color="primary" size="medium" aria-label="Add new item">
              <IconPlus size={22} />
            </Fab>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          {/* KPI stat */}
          <Box sx={{ px: 2, py: 1.5, borderRadius: 2, bgcolor: (t) => t.palette.primary.light, minWidth: 140 }}>
            <Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 700 }}>
              1,284
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Active customers
            </Typography>
          </Box>

          {/* active sidebar row */}
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ px: 2, py: 1.25, borderRadius: 2, bgcolor: (t) => t.palette.primary.light, color: 'primary.main', minWidth: 180 }}
          >
            <IconLayoutDashboard size={20} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
              Dashboard
            </Typography>
            <Chip size="small" color="secondary" label="New" sx={{ ml: 'auto' }} />
          </Stack>
        </Stack>
      </Box>
    </ThemeProvider>
  );
}

// ---- main panel -------------------------------------------------------------------------

export interface BrandingProps {
  /** 'settings' (default) renders the titled settings card with Apply/Reset; 'onboarding' renders
   *  the bare editor with "Apply & continue" / "Skip" that call onDone (for the signup step). */
  variant?: 'settings' | 'onboarding';
  onDone?: () => void;
}

export default function Branding({ variant = 'settings', onDone }: BrandingProps = {}) {
  const theme = useTheme();
  const { brandTheme, onChangeBrandTheme } = useConfig();
  const companyId = useSelector((state) => state.auth?.currentRole?.company_id) as string | undefined;

  const [saving, setSaving] = useState(false);
  const [primary, setPrimary] = useState(brandTheme?.primary ?? ALLYVIA_PRIMARY);
  const [secondary, setSecondary] = useState(brandTheme?.secondary ?? ALLYVIA_SECONDARY);
  const [headingFont, setHeadingFont] = useState(brandTheme?.headingFont ?? '');
  const [swatches, setSwatches] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fontsPreloaded, setFontsPreloaded] = useState(false);

  const mode = theme.palette.mode === 'dark' ? ThemeMode.DARK : ThemeMode.LIGHT;

  // Once the admin edits anything, stop mirroring the resolved brandTheme into the form so we
  // never clobber their in-progress changes.
  const edited = useRef(false);
  const changePrimary = (v: string) => {
    edited.current = true;
    setPrimary(v);
  };
  const changeSecondary = (v: string) => {
    edited.current = true;
    setSecondary(v);
  };
  const changeHeadingFont = (v: string) => {
    edited.current = true;
    setHeadingFont(v);
  };

  // Keep the form fields in sync with the resolved brandTheme until the admin edits. This is the
  // guard against a data-loss race: if the panel mounts before BrandThemeSync's server fetch
  // resolves, the fields would otherwise stay on defaults and an Apply would overwrite the real
  // saved theme with default colors.
  useEffect(() => {
    if (edited.current) return;
    setPrimary(brandTheme?.primary ?? ALLYVIA_PRIMARY);
    setSecondary(brandTheme?.secondary ?? ALLYVIA_SECONDARY);
    setHeadingFont(brandTheme?.headingFont ?? '');
  }, [brandTheme]);

  // Load the selected heading font so the preview + select value render in it.
  useEffect(() => {
    if (headingFont) loadGoogleFont(headingFont);
  }, [headingFont]);

  // Revoke the current logo object URL when it changes and on unmount (avoids leaks on re-drop
  // and when the panel unmounts with a logo still loaded).
  useEffect(
    () => () => {
      if (logoUrl) URL.revokeObjectURL(logoUrl);
    },
    [logoUrl]
  );

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    edited.current = true; // extraction intentionally sets the fields
    setError(null);
    setExtracting(true);
    setLogoUrl(URL.createObjectURL(file));
    try {
      const result = await extractBrandColors(file);
      setSwatches(result.swatches);
      setPrimary(result.suggestedPrimary);
      setSecondary(result.suggestedSecondary);
    } catch (e: any) {
      setError(e?.message || 'Could not extract colors from that image.');
    } finally {
      setExtracting(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/svg+xml': ['.svg']
    },
    maxFiles: 1,
    multiple: false
  });

  const handleFontMenuOpen = () => {
    if (!fontsPreloaded) {
      BRAND_FONTS.forEach((f) => loadGoogleFont(f.family));
      setFontsPreloaded(true);
    }
  };

  const handleFontChange = (e: SelectChangeEvent) => changeHeadingFont(e.target.value);

  const handleApply = async () => {
    if (!HEX_RE.test(primary) || !HEX_RE.test(secondary)) {
      setError('Enter valid 6-digit hex colors before applying.');
      return;
    }
    setError(null);

    // Store '' (not 'Inter') for the default option so it round-trips to the "Default (Inter)"
    // Select item on remount; Phase 1's typography falls back to the body font (Inter) for ''.
    const nextTheme = { primary, secondary, headingFont };

    // Apply locally right away for a snappy result...
    onChangeBrandTheme(nextTheme);

    // ...then persist server-side so the whole org gets it on any device.
    setSaving(true);
    try {
      await putCompanyTheme({
        primary_hex: primary,
        secondary_hex: secondary,
        heading_font: headingFont,
        extracted_palette: swatches
      });
      if (companyId) writeBrandThemeCache(companyId, nextTheme);
      notify('Brand theme saved for your organization.');
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      notify(detail || 'Applied locally, but saving to the server failed.', 'error');
    } finally {
      setSaving(false);
    }

    // During onboarding, continue to the app after the save attempt (don't block on a server error).
    if (variant === 'onboarding') onDone?.();
  };

  const handleReset = () => {
    onChangeBrandTheme(null);
    setPrimary(ALLYVIA_PRIMARY);
    setSecondary(ALLYVIA_SECONDARY);
    setHeadingFont('');
    setSwatches([]);
    setLogoUrl(null); // the [logoUrl] effect revokes the old object URL
    setError(null);
    notify('Reverted to the Allyvia default theme.');
  };

  // Onboarding "Skip" — keep the Allyvia default (no brand theme) and continue.
  const handleSkip = () => {
    onChangeBrandTheme(null);
    if (companyId) writeBrandThemeCache(companyId, null);
    onDone?.();
  };

  const inner = (
    <Stack spacing={2.5}>
      {error && <Alert severity="error">{error}</Alert>}

      {/* logo upload */}
      <Box
        {...getRootProps()}
        sx={{
          border: (t) => `1.5px dashed ${isDragActive ? t.palette.primary.main : t.palette.divider}`,
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: (t) => (isDragActive ? t.palette.primary.light : 'transparent'),
          transition: 'border-color .15s, background-color .15s'
        }}
      >
        <input {...getInputProps()} />
        <Stack spacing={1} alignItems="center">
          {logoUrl ? (
            <Box component="img" src={logoUrl} alt="Uploaded logo" sx={{ maxHeight: 72, maxWidth: '100%', objectFit: 'contain' }} />
          ) : (
            <Box sx={{ color: 'text.secondary', display: 'flex' }}>
              <IconUpload size={28} stroke={1.5} />
            </Box>
          )}
          <Typography variant="body2" color="text.secondary">
            {extracting
              ? 'Extracting colors…'
              : isDragActive
                ? 'Drop the logo here'
                : 'Drag a logo here, or click to browse (PNG, JPG, SVG)'}
          </Typography>
          {extracting && <CircularProgress size={18} />}
        </Stack>
      </Box>

      {/* extracted swatches */}
      {swatches.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Extracted colors
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {swatches.map((hex) => (
              <Tooltip key={hex} title={`${hex} — click to use as primary`}>
                <Box
                  onClick={() => changePrimary(hex)}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    bgcolor: hex,
                    cursor: 'pointer',
                    border: (t) => `1px solid ${t.palette.divider}`
                  }}
                />
              </Tooltip>
            ))}
          </Stack>
        </Stack>
      )}

      {/* color pickers */}
      <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
        <ColorField label="Primary" value={primary} onChange={changePrimary} />
        <ColorField label="Secondary" value={secondary} onChange={changeSecondary} />
      </Stack>

      {/* heading font */}
      <FormControl size="small" sx={{ maxWidth: 320 }}>
        <InputLabel id="brand-heading-font-label">Heading font</InputLabel>
        <Select
          labelId="brand-heading-font-label"
          label="Heading font"
          value={headingFont}
          onOpen={handleFontMenuOpen}
          onChange={handleFontChange}
          sx={{ fontFamily: headingFont ? `'${headingFont}', serif` : undefined }}
        >
          <MenuItem value="">
            <em>Default (Inter)</em>
          </MenuItem>
          {BRAND_FONTS.map((f) => (
            <MenuItem
              key={f.family}
              value={f.family}
              sx={{ fontFamily: `'${f.family}', ${f.category === 'sans' ? 'sans-serif' : 'serif'}` }}
            >
              {f.label}
              <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                {f.category}
              </Typography>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Divider />

      {/* live preview */}
      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Live preview
        </Typography>
        <BrandPreview primary={primary} secondary={secondary} headingFont={headingFont} mode={mode} />
      </Stack>

      {/* actions */}
      {variant === 'onboarding' ? (
        <Stack direction="row" spacing={1.5}>
          <Button variant="contained" onClick={handleApply} disabled={saving}>
            {saving ? 'Saving…' : 'Apply & continue'}
          </Button>
          <Button variant="text" color="inherit" onClick={handleSkip} disabled={saving}>
            Skip for now
          </Button>
        </Stack>
      ) : (
        <Stack direction="row" spacing={1.5}>
          <Button variant="contained" onClick={handleApply} disabled={saving}>
            {saving ? 'Saving…' : 'Apply'}
          </Button>
          <Button variant="text" color="inherit" onClick={handleReset} disabled={saving}>
            Reset to Allyvia default
          </Button>
        </Stack>
      )}
    </Stack>
  );

  return variant === 'onboarding' ? (
    inner
  ) : (
    <SettingsSectionCard
      title="Branding"
      description="Upload your logo to theme Allyvia in your brand colors. Only heading and accent colors change — status colors stay consistent."
      icon={<IconBrush size={24} stroke={1.5} />}
    >
      {inner}
    </SettingsSectionCard>
  );
}
