import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Fab from '@mui/material/Fab';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { ThemeProvider, useTheme } from '@mui/material/styles';

import { IconBrush, IconPlus, IconLayoutDashboard, IconUpload } from '@tabler/icons-react';

import SettingsSectionCard from './SettingsSectionCard';
import useConfig from 'hooks/useConfig';
import { ThemeMode } from 'config';
import { BRAND_FONTS } from 'config/brandFonts';
import { loadCustomFont, loadGoogleFont } from 'utils/loadFont';
import { extractBrandColors } from 'utils/extractBrandColors';
import { AA_NORMAL, contrastRatio, generateBrandPalette } from 'themes/brandPalette';
import { buildTemplateColors, TemplateName } from 'themes/immersiveTheme';
import Palette, { buildTheme } from 'themes/palette';
import { dispatch, useSelector } from 'store';
import { openSnackbar } from 'store/slices/snackbar';
import { putCompanyTheme } from 'api/branding';
import { writeBrandThemeCache } from 'utils/brandThemeCache';

const ALLYVIA_PRIMARY = '#2f6fd4';
const ALLYVIA_SECONDARY = '#5f4cc0';
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// ---- extraction color count model ---------------------------------------------------------

const MIN_COLOR_COUNT = 2;
const MAX_COLOR_COUNT = 6;
const DEFAULT_COLOR_COUNT = 4;
const COLOR_COUNT_OPTIONS = [2, 3, 4, 5, 6] as const;

/** Which role the next swatch tap assigns. */
type SwatchRole = 'primary' | 'secondary';

function clampColorCount(n: number): number {
  return Math.min(MAX_COLOR_COUNT, Math.max(MIN_COLOR_COUNT, n));
}

/** Default the count selector to the persisted palette size, else DEFAULT_COLOR_COUNT. */
function initialColorCount(swatchCount: number): number {
  return swatchCount > 0 ? clampColorCount(swatchCount) : DEFAULT_COLOR_COUNT;
}

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

// ---- template picker: mini live preview per template ------------------------------------

const TEMPLATE_OPTIONS: { name: TemplateName; label: string }[] = [
  { name: 'bright', label: 'Bright' },
  { name: 'soft', label: 'Soft' },
  { name: 'bold', label: 'Bold' }
];

interface TemplatePreviewCardProps {
  templateName: TemplateName;
  label: string;
  primary: string;
  secondary: string;
  headingFont: string;
  mode: ThemeMode;
  selected: boolean;
  onSelect: () => void;
}

/** A selectable mini live preview of one template, rendered in the owner's current brand colors. */
function TemplatePreviewCard({ templateName, label, primary, secondary, headingFont, mode, selected, onSelect }: TemplatePreviewCardProps) {
  // Same "scoped ThemeProvider over the resolved brand colors" approach as BrandPreview, but built
  // directly from buildTemplateColors for THIS card's template (not whichever template/zone the
  // owner has saved), so all three cards render side-by-side regardless of the current selection.
  // Wrapped defensively: an in-progress/invalid hex (e.g. mid-keystroke in the hex TextField) would
  // otherwise throw inside the color engine and take down all three cards at once.
  const cardTheme = useMemo(() => {
    const schemeMode = mode === ThemeMode.DARK ? 'dark' : 'light';
    const brandInput = { primary, secondary, headingFont: headingFont || 'Inter' };
    try {
      const colors =
        buildTemplateColors(brandInput, schemeMode, templateName) ?? generateBrandPalette({ primary, secondary, mode: schemeMode });
      return buildTheme(mode, colors);
    } catch {
      return buildTheme(mode, generateBrandPalette({ primary: ALLYVIA_PRIMARY, secondary: ALLYVIA_SECONDARY, mode: schemeMode }));
    }
  }, [mode, primary, secondary, headingFont, templateName]);

  return (
    <ThemeProvider theme={cardTheme}>
      <Box
        onClick={onSelect}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={`${label} template`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
        sx={{
          flex: '1 1 160px',
          minWidth: 150,
          borderRadius: 2,
          border: (t) => `2px solid ${selected ? t.palette.primary.main : t.palette.divider}`,
          bgcolor: 'background.default',
          p: 1.5,
          cursor: 'pointer',
          outline: 'none',
          transition: 'border-color .15s'
        }}
      >
        <Stack spacing={1}>
          <Box sx={{ borderRadius: 1.5, bgcolor: 'background.paper', p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontFamily: headingFont ? `'${headingFont}', serif` : undefined, color: 'text.primary', fontWeight: 700 }}
            >
              Dashboard
            </Typography>
            <Button size="small" variant="contained" color="primary" sx={{ alignSelf: 'flex-start' }}>
              Save
            </Button>
          </Box>
          <Typography
            variant="caption"
            sx={{ fontWeight: selected ? 700 : 500, color: selected ? 'primary.main' : 'text.secondary', textAlign: 'center' }}
          >
            {label}
          </Typography>
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
  // How many of the extracted swatches are in play, and which role the next swatch tap assigns.
  // The owner's chosen count round-trips via brandTheme.colorCount; fall back to deriving one
  // from the persisted palette size when no count was ever saved.
  const [colorCount, setColorCount] = useState<number>(() =>
    typeof brandTheme?.colorCount === 'number'
      ? clampColorCount(brandTheme.colorCount)
      : initialColorCount(brandTheme?.accents?.length ?? 0)
  );
  const [swatchRole, setSwatchRole] = useState<SwatchRole>('primary');
  // Whole-app chrome look (sidebar + header); content always stays on the light theme.
  const [template, setTemplate] = useState<TemplateName>(brandTheme?.template ?? 'soft');
  const [logoUrl, setLogoUrl] = useState<string | null>(null); // blob URL of the uploaded file (for extraction/thumbnail)
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fontsPreloaded, setFontsPreloaded] = useState(false);

  // Phase 5: hosted brand assets (URL-based; no upload storage). logoImageUrl swaps the app logo;
  // the custom-font trio replaces the heading font with a self-hosted, licensed font.
  const [logoImageUrl, setLogoImageUrl] = useState(brandTheme?.logoUrl ?? '');
  const [customFamily, setCustomFamily] = useState(brandTheme?.customFontUrl ? (brandTheme?.headingFont ?? '') : '');
  const [customFontUrl, setCustomFontUrl] = useState(brandTheme?.customFontUrl ?? '');
  const [licenseAck, setLicenseAck] = useState(Boolean(brandTheme?.customFontUrl));

  const mode = theme.palette.mode === 'dark' ? ThemeMode.DARK : ThemeMode.LIGHT;

  // A custom font only takes effect once the family + URL are provided AND the license is confirmed.
  const customActive = Boolean(customFamily.trim() && customFontUrl.trim() && licenseAck);
  const effectiveHeadingFont = customActive ? customFamily.trim() : headingFont;
  const effectiveCustomFontUrl = customActive ? customFontUrl.trim() : null;

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
  const markEdited = () => {
    edited.current = true;
  };

  // Keep the form fields in sync with the resolved brandTheme until the admin edits. This is the
  // guard against a data-loss race: if the panel mounts before BrandThemeSync's server fetch
  // resolves, the fields would otherwise stay on defaults and an Apply would overwrite the real
  // saved theme with default colors.
  useEffect(() => {
    if (edited.current) return;
    setPrimary(brandTheme?.primary ?? ALLYVIA_PRIMARY);
    setSecondary(brandTheme?.secondary ?? ALLYVIA_SECONDARY);
    const savedAccents = brandTheme?.accents ?? [];
    setSwatches(savedAccents);
    setColorCount(
      typeof brandTheme?.colorCount === 'number' ? clampColorCount(brandTheme.colorCount) : initialColorCount(savedAccents.length)
    );
    setSwatchRole('primary');
    setTemplate(brandTheme?.template ?? 'soft');
    setLogoImageUrl(brandTheme?.logoUrl ?? '');
    const cf = brandTheme?.customFontUrl ?? '';
    setCustomFontUrl(cf);
    setLicenseAck(Boolean(cf));
    if (cf) {
      // custom font active: the allowlist Select goes back to default and the family lives in the custom field
      setHeadingFont('');
      setCustomFamily(brandTheme?.headingFont ?? '');
    } else {
      setHeadingFont(brandTheme?.headingFont ?? '');
      setCustomFamily('');
    }
  }, [brandTheme]);

  // Load the effective heading font so the preview renders in it: a self-hosted custom font via
  // @font-face when active, otherwise the selected Google Font.
  useEffect(() => {
    if (customActive) {
      loadCustomFont(customFamily.trim(), customFontUrl.trim());
    } else if (headingFont) {
      loadGoogleFont(headingFont);
    }
  }, [customActive, customFamily, customFontUrl, headingFont]);

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
      setColorCount(initialColorCount(result.swatches.length));
      setSwatchRole('primary');
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

  // Count selector: how many of the extracted swatches are in play (the rest are greyed out).
  const handleColorCountChange = (_event: React.MouseEvent<HTMLElement>, value: number | null) => {
    if (value === null) return; // exclusive group re-clicking the active button — keep current count
    markEdited();
    setColorCount(value);
  };

  // Role toggle: which role the next in-count swatch tap assigns.
  const handleSwatchRoleChange = (_event: React.MouseEvent<HTMLElement>, value: SwatchRole | null) => {
    if (value === null) return;
    setSwatchRole(value);
  };

  // Template picker: selecting a card sets the whole-app chrome look (sidebar + header).
  const handleTemplateSelect = (next: TemplateName) => {
    markEdited();
    setTemplate(next);
  };

  // Tap-to-assign: clicking an in-count swatch sets it as whichever role is currently selected.
  // Guard against a single swatch silently holding both roles: if the tapped swatch is currently
  // the OTHER role, swap — the other role takes over this role's previous value.
  const assignSwatch = (hex: string) => {
    const target = hex.toLowerCase();
    if (swatchRole === 'primary') {
      if (target === secondary.toLowerCase()) changeSecondary(primary);
      changePrimary(hex);
    } else {
      if (target === primary.toLowerCase()) changePrimary(secondary);
      changeSecondary(hex);
    }
  };

  const handleApply = async () => {
    if (!HEX_RE.test(primary) || !HEX_RE.test(secondary)) {
      setError('Enter valid 6-digit hex colors before applying.');
      return;
    }
    setError(null);

    // Store '' (not 'Inter') for the default option so it round-trips to the "Default (Inter)"
    // Select item on remount; Phase 1's typography falls back to the body font (Inter) for ''.
    const logo = logoImageUrl.trim() || null;
    // Accents = the FULL detected palette (not just the in-count slice, and not minus P/S) so the
    // owner's complete palette round-trips on reload — primary/secondary already persist via
    // primary_hex/secondary_hex. Falls back to the last-saved accents when no logo has been
    // extracted this session. colorCount persists the owner's chosen in-count size alongside it.
    const accents = swatches.length ? swatches : (brandTheme?.accents ?? []);
    const nextTheme = {
      primary,
      secondary,
      headingFont: effectiveHeadingFont,
      logoUrl: logo,
      customFontUrl: effectiveCustomFontUrl,
      template,
      accents,
      colorCount
    };

    // Apply locally right away for a snappy result...
    onChangeBrandTheme(nextTheme);

    // ...then persist server-side so the whole org gets it on any device.
    setSaving(true);
    try {
      await putCompanyTheme({
        primary_hex: primary,
        secondary_hex: secondary,
        heading_font: effectiveHeadingFont,
        logo_url: logo,
        custom_font_url: effectiveCustomFontUrl,
        extracted_palette: swatches,
        overrides: { template, accents, colorCount }
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
    setColorCount(DEFAULT_COLOR_COUNT);
    setSwatchRole('primary');
    setTemplate('soft');
    setLogoUrl(null); // the [logoUrl] effect revokes the old object URL
    setLogoImageUrl('');
    setCustomFamily('');
    setCustomFontUrl('');
    setLicenseAck(false);
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

      {/* hosted logo URL (persisted; swaps the app logo) */}
      <TextField
        size="small"
        label="Logo image URL (optional)"
        placeholder="https://cdn.yourcompany.com/logo.png"
        value={logoImageUrl}
        onChange={(e) => {
          markEdited();
          setLogoImageUrl(e.target.value);
        }}
        helperText="Paste a hosted logo (PNG/SVG). Replaces the Allyvia logo across the app; falls back to Allyvia if it fails to load."
        fullWidth
      />

      {/* extracted swatches: choose how many to use, then tap-to-assign Primary/Secondary */}
      {swatches.length > 0 && (
        <Stack spacing={1.25}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Extracted colors
          </Typography>

          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap alignItems="flex-end">
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                Colors to use
              </Typography>
              <ToggleButtonGroup value={colorCount} exclusive onChange={handleColorCountChange} size="small">
                {COLOR_COUNT_OPTIONS.map((n) => (
                  <ToggleButton key={n} value={n} aria-label={`Use ${n} colors`}>
                    {n}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>

            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                Tap a swatch below to set its
              </Typography>
              <ToggleButtonGroup value={swatchRole} exclusive onChange={handleSwatchRoleChange} size="small">
                <ToggleButton value="primary">Primary</ToggleButton>
                <ToggleButton value="secondary">Secondary</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
            {swatches.map((hex, index) => {
              const inCount = index < colorCount;
              // Badge/ring reflect the swatch's actual role regardless of in-count status, so an
              // assigned Primary/Secondary swatch never loses its indicator just because the
              // owner later lowered the color count. Assignment itself stays gated on inCount.
              const isPrimary = hex.toLowerCase() === primary.toLowerCase();
              const isSecondary = hex.toLowerCase() === secondary.toLowerCase();
              const roleLabel: 'Primary' | 'Secondary' | null = isPrimary ? 'Primary' : isSecondary ? 'Secondary' : null;
              const title = roleLabel
                ? `${hex} — ${roleLabel}${inCount ? '' : ' (excluded at this color count)'}`
                : !inCount
                  ? `${hex} — excluded at this color count`
                  : `${hex} — click to set as ${swatchRole}`;

              return (
                <Tooltip key={`${hex}-${index}`} title={title}>
                  <Box
                    onClick={inCount ? () => assignSwatch(hex) : undefined}
                    role={inCount ? 'button' : undefined}
                    aria-label={inCount ? `${hex}, set as ${swatchRole}` : `${hex}, ${roleLabel ?? 'excluded from color count'}`}
                    aria-disabled={!inCount}
                    sx={{
                      position: 'relative',
                      width: 36,
                      height: 36,
                      borderRadius: 1,
                      bgcolor: hex,
                      cursor: inCount ? 'pointer' : 'default',
                      opacity: inCount ? 1 : 0.35,
                      filter: inCount ? 'none' : 'grayscale(100%)',
                      pointerEvents: inCount ? 'auto' : 'none',
                      border: (t) =>
                        `2px solid ${isPrimary ? t.palette.primary.main : isSecondary ? t.palette.secondary.main : t.palette.divider}`
                    }}
                  >
                    {roleLabel && (
                      <Chip
                        size="small"
                        label={isPrimary ? 'P' : 'S'}
                        color={isPrimary ? 'primary' : 'secondary'}
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          height: 16,
                          '& .MuiChip-label': { px: 0.5, fontSize: 10, fontWeight: 700 }
                        }}
                      />
                    )}
                  </Box>
                </Tooltip>
              );
            })}
          </Stack>

          <Typography variant="caption" color="text.secondary">
            Greyed-out swatches are excluded from this count. Remaining in-count colors that aren&apos;t Primary or Secondary are saved as
            the accent palette.
          </Typography>
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

      {/* custom (self-hosted, licensed) heading font — advanced */}
      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Custom heading font (advanced)
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Host a licensed font file yourself and use it for headings. Leave blank to use the list above.
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            label="Font family name"
            value={customFamily}
            onChange={(e) => {
              markEdited();
              setCustomFamily(e.target.value);
            }}
            sx={{ minWidth: 200 }}
          />
          <TextField
            size="small"
            label="Font file URL (woff2/woff)"
            placeholder="https://cdn.yourcompany.com/font.woff2"
            value={customFontUrl}
            onChange={(e) => {
              markEdited();
              setCustomFontUrl(e.target.value);
            }}
            sx={{ minWidth: 260, flex: 1 }}
          />
        </Stack>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={licenseAck}
              onChange={(e) => {
                markEdited();
                setLicenseAck(e.target.checked);
              }}
            />
          }
          label="I confirm we are licensed to use this font."
        />
        {customFamily.trim() && customFontUrl.trim() && !licenseAck && (
          <Typography variant="caption" color="warning.main">
            Confirm the license above to apply the custom font.
          </Typography>
        )}
      </Stack>

      {/* template picker: pick the whole-page look, previewed live in the owner's own colors */}
      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Template
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Pick the overall surface look. Your colors stay the same in every option.
        </Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          {TEMPLATE_OPTIONS.map((opt) => (
            <TemplatePreviewCard
              key={opt.name}
              templateName={opt.name}
              label={opt.label}
              primary={primary}
              secondary={secondary}
              headingFont={effectiveHeadingFont}
              mode={mode}
              selected={template === opt.name}
              onSelect={() => handleTemplateSelect(opt.name)}
            />
          ))}
        </Stack>
      </Stack>

      <Divider />

      {/* live preview */}
      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Live preview
        </Typography>
        <BrandPreview primary={primary} secondary={secondary} headingFont={effectiveHeadingFont} mode={mode} />
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
