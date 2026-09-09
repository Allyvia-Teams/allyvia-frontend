import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import { Table, TableBody, TableRow, TableCell } from '@mui/material';
import BrandIdentity from 'ui-component/BrandIdentity';
import BrandIdentityEditor from './BrandIdentityEditor';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha, ThemeProvider } from '@mui/material/styles';
import {
  IconArrowUpRight,
  IconCheck,
  IconLayoutDashboard,
  IconUsers,
  IconPackage,
  IconShoppingBag,
  IconSettings,
  IconDeviceDesktop,
  IconDeviceTablet
} from '@tabler/icons-react';
import { ThemeMode } from 'config';
import { BRAND_FONTS, findBrandFont } from 'config/brandFonts';
import type { BrandTheme } from 'types/config';
import {
  BRAND_STYLES,
  BODY_FONTS,
  DEFAULT_EXPERIENCE,
  parseBrandExperience,
  applyBrandExperience,
  BrandExperience
} from 'themes/brandExperience';
import { generateBrandPalette } from 'themes/brandPalette';
import { resolveChromeTheme, resolveContentTheme } from 'themes/immersiveTheme';
import { buildTheme } from 'themes/palette';
import themeTypography from 'themes/typography';
import componentStyleOverrides from 'themes/compStyleOverride';
import { loadGoogleFont } from 'utils/loadFont';
import BrandKitPanel from './BrandKitPanel';
import ElementLooks from './ElementLooks';

type Brand = NonNullable<BrandTheme>;
export interface BrandStudioProps {
  brand: Brand;
  onChange: (brand: Brand) => void;
  storeName?: string;
  previewOnly?: boolean;
}

export function buildStudioThemes(brand: Brand, mode: ThemeMode) {
  const scheme = mode === ThemeMode.DARK ? 'dark' : 'light';
  const fallback = generateBrandPalette({ primary: '#234C3A', secondary: '#895C39', mode: scheme });
  const build = (zone: 'chrome' | 'content') => {
    let theme;
    try {
      const result =
        zone === 'chrome'
          ? resolveChromeTheme(brand, scheme, brand.template ?? 'tinted')
          : resolveContentTheme(brand, scheme, brand.template ?? 'tinted');
      theme = buildTheme(
        result ? (result.mode === 'dark' ? ThemeMode.DARK : ThemeMode.LIGHT) : mode,
        result?.colors ?? generateBrandPalette({ primary: brand.primary, secondary: brand.secondary, mode: scheme })
      );
    } catch {
      theme = buildTheme(mode, fallback);
    }
    Object.assign(theme.typography, themeTypography(theme, 8, "'Inter', sans-serif", brand.headingFont));
    theme.components = componentStyleOverrides(theme, 8, true);
    return applyBrandExperience(theme, brand, zone);
  };
  return { chrome: build('chrome'), content: build('content') };
}

/** Uses the production theme assembly and real MUI cards/buttons, with explicitly illustrative data. */
export function BrandWorkspacePreview({
  brand,
  mode = ThemeMode.LIGHT,
  storeName = 'Your store'
}: {
  brand: Brand;
  mode?: ThemeMode;
  storeName?: string;
}) {
  const [page, setPage] = useState<'overview' | 'customers'>('overview');
  const [narrow, setNarrow] = useState(false);
  const themes = useMemo(() => buildStudioThemes(brand, mode), [brand, mode]);
  const e = parseBrandExperience(brand.experience);
  const nav = themes.chrome;
  const content = themes.content;
  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#3A7250' }} />
          <Typography variant="overline">Live workspace preview</Typography>
        </Stack>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={narrow ? 'tablet' : 'desktop'}
          onChange={(_, v) => v && setNarrow(v === 'tablet')}
          aria-label="Preview width"
        >
          <ToggleButton value="desktop" aria-label="Desktop preview">
            <IconDeviceDesktop size={17} />
          </ToggleButton>
          <ToggleButton value="tablet" aria-label="Tablet preview">
            <IconDeviceTablet size={17} />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '12px',
          overflow: 'hidden',
          maxWidth: narrow ? 620 : '100%',
          mx: 'auto',
          boxShadow: '0 16px 48px rgb(0 0 0 / 7%)'
        }}
      >
        <ThemeProvider theme={nav}>
          <Box
            sx={{
              bgcolor: 'background.default',
              color: 'text.primary',
              fontFamily: nav.typography.fontFamily,
              borderBottom: '1px solid',
              borderColor: 'divider',
              py: 1.5,
              px: 2.5,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <BrandIdentity brand={brand} name={storeName} />
            <Typography variant="caption">
              Workspace <span aria-hidden="true">⌘ K</span>
            </Typography>
          </Box>
        </ThemeProvider>
        <Box sx={{ display: 'flex', minHeight: 520 }}>
          <ThemeProvider theme={nav}>
            <Box
              sx={{
                bgcolor: 'background.default',
                color: 'text.primary',
                width: narrow ? 56 : { xs: 48, md: 144 },
                flexShrink: 0,
                borderRight: '1px solid',
                borderColor: 'divider',
                p: 1.25,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75
              }}
            >
              {(
                [
                  { label: 'Overview', icon: IconLayoutDashboard, page: 'overview' },
                  { label: 'Customers', icon: IconUsers, page: 'customers' }
                ] as const
              ).map((item) => (
                <Button
                  key={item.page}
                  onClick={() => setPage(item.page)}
                  aria-pressed={page === item.page}
                  aria-label={`Preview ${item.label}`}
                  sx={{
                    minWidth: 0,
                    justifyContent: 'flex-start',
                    gap: 1,
                    px: 1,
                    color: 'text.primary',
                    borderRadius: e?.navStyle === 'line' ? 0 : `${e?.corners ?? 8}px`,
                    bgcolor: page === item.page ? alpha(nav.palette.text.primary, 0.08) : 'transparent',
                    boxShadow: page === item.page && e?.navStyle === 'line' ? `inset 2px 0 ${nav.palette.text.primary}` : 'none'
                  }}
                >
                  <item.icon size={17} stroke={1.5} />
                  <Box component="span" sx={{ display: narrow ? 'none' : { xs: 'none', md: 'inline' }, fontSize: 11 }}>
                    {item.label}
                  </Box>
                </Button>
              ))}
              {[
                { label: 'Inventory', icon: IconPackage },
                { label: 'Sales', icon: IconShoppingBag },
                { label: 'Settings', icon: IconSettings }
              ].map((item) => (
                <Box key={item.label} sx={{ px: 1, py: 1.3, display: 'flex', gap: 1, alignItems: 'center', color: 'text.secondary' }}>
                  <item.icon size={17} stroke={1.5} />
                  <Typography sx={{ fontSize: 11, display: narrow ? 'none' : { xs: 'none', md: 'block' } }}>{item.label}</Typography>
                </Box>
              ))}
              <Typography variant="caption" sx={{ mt: 'auto', px: 1, fontSize: 9, display: narrow ? 'none' : { xs: 'none', md: 'block' } }}>
                POWERED BY ALLYVIA
              </Typography>
            </Box>
          </ThemeProvider>
          <ThemeProvider theme={content}>
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                bgcolor: 'background.default',
                color: 'text.primary',
                fontFamily: content.typography.fontFamily,
                p: { xs: 1.5, md: 3 }
              }}
            >
              <Typography sx={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.16em', color: 'text.secondary', mb: 1.5 }}>
                Your business, at a glance
              </Typography>
              <Typography variant="h1" sx={{ fontSize: { xs: 23, md: narrow ? 27 : 34 }, mb: 0.75 }}>
                {page === 'overview' ? 'A good day starts here.' : 'Know your regulars.'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 3, fontSize: 11 }}>
                {page === 'overview' ? 'The details that keep your store moving.' : 'Thoughtful service starts with a familiar face.'}
              </Typography>
              {page === 'overview' && (
                <>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5, mb: 1.5 }}>
                    {[
                      ['Net sales', '$12,840', '+12.8%'],
                      ['Returning customers', '64%', '+8.2%']
                    ].map(([label, value, change]) => (
                      <Card key={label} elevation={0}>
                        <CardContent>
                          <Typography sx={{ fontSize: 10, color: 'text.secondary', mb: 1 }}>{label}</Typography>
                          <Typography variant="h2" sx={{ fontSize: { xs: 20, md: 27 }, fontVariantNumeric: 'tabular-nums' }}>
                            {value}
                          </Typography>
                          <Typography sx={{ fontSize: 10, mt: 1, color: 'text.secondary' }}>{change} vs. previous period</Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                  <Card elevation={0} sx={{ mb: 1.5 }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="h4">Sales rhythm</Typography>
                        <Typography variant="caption">This week</Typography>
                      </Stack>
                      <Box
                        role="img"
                        aria-label="Illustrative weekly sales chart"
                        sx={{ height: 95, mt: 2, display: 'flex', gap: 0.8, alignItems: 'flex-end' }}
                      >
                        {[35, 48, 40, 65, 58, 89, 72, 52, 68, 94, 75, 85].map((height, i) => (
                          <Box
                            key={i}
                            sx={{
                              flex: 1,
                              height: `${height}%`,
                              bgcolor: 'primary.main',
                              opacity: i < 9 ? 0.3 : 1,
                              borderRadius: `${Math.min(e?.corners ?? 4, 4)}px ${Math.min(e?.corners ?? 4, 4)}px 0 0`
                            }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </>
              )}
              <Card elevation={0}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="h4">{page === 'overview' ? 'People, not just purchases.' : 'Your community'}</Typography>
                    <IconArrowUpRight size={16} />
                  </Stack>
                  <Table size="small" aria-label="Sample customers">
                    <TableBody>
                      {(page === 'overview'
                        ? ['Jordan Lee', 'Alex Morgan']
                        : ['Jordan Lee', 'Alex Morgan', 'Sam Rivera', 'Taylor Chen']
                      ).map((name, i) => (
                        <TableRow key={name}>
                          <TableCell sx={{ fontSize: 11, px: 0 }}>{name}</TableCell>
                          <TableCell align="right" sx={{ px: 0 }}>
                            <Chip
                              size="small"
                              label={i % 2 ? 'New customer' : 'Regular'}
                              variant="outlined"
                              sx={{ fontSize: 9, height: 22, color: 'text.secondary', borderColor: 'divider' }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setPage(page === 'overview' ? 'customers' : 'overview')}
                    sx={{ mt: 2, fontSize: 11 }}
                  >
                    {page === 'overview' ? 'View customers' : 'Back to overview'}
                  </Button>
                </CardContent>
              </Card>
            </Box>
          </ThemeProvider>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ display: 'block', mt: 1.5, textAlign: 'center', color: 'text.secondary' }}>
        Sample data · Changes stay in this preview until you save.
      </Typography>
    </Box>
  );
}

export default function BrandStudio({ brand, onChange, storeName, previewOnly }: BrandStudioProps) {
  const experience = parseBrandExperience(brand.experience) ?? DEFAULT_EXPERIENCE;
  const [previewMode, setPreviewMode] = useState(ThemeMode.LIGHT);
  const [chosenStyle, setChosenStyle] = useState(
    brand.styleId ?? BRAND_STYLES.find((s) => s.brand.primary === brand.primary)?.id ?? 'heritage'
  );
  useEffect(() => {
    if (brand.styleId) setChosenStyle(brand.styleId);
  }, [brand.styleId]);
  const update = (patch: Partial<BrandExperience>) => onChange({ ...brand, experience: { ...experience, ...patch } });
  useEffect(() => {
    if (experience.bodyFont !== 'Inter') loadGoogleFont(experience.bodyFont);
  }, [experience.bodyFont]);
  useEffect(() => {
    BRAND_STYLES.forEach((style) => loadGoogleFont(style.brand.headingFont));
  }, []);
  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="overline" sx={{ letterSpacing: '.18em', color: 'text.secondary' }}>
            ALLYVIA / BRAND STUDIO
          </Typography>
          <Typography variant="h2" sx={{ mt: 0.5, fontSize: { xs: 27, md: 34 }, letterSpacing: '-.045em' }}>
            Make yourself at home.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Start with a point of view. Make every detail yours.
          </Typography>
        </Box>
        <Chip variant="outlined" label="Your brand. Your workspace." sx={{ alignSelf: 'center' }} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', lg: 'repeat(4,minmax(0,1fr))' }, gap: 1.5 }}>
        {BRAND_STYLES.map((style) => {
          const chosen = brand.styleId
            ? brand.styleId === style.id
            : brand.primary === style.brand.primary &&
              brand.headingFont === style.brand.headingFont &&
              JSON.stringify(brand.experience) === JSON.stringify(style.brand.experience);
          const e = style.brand.experience;
          return (
            <Box
              component="button"
              type="button"
              key={style.id}
              aria-pressed={chosen}
              onClick={() => {
                setChosenStyle(style.id);
                onChange({
                  ...brand,
                  ...style.brand,
                  styleId: style.id,
                  ...(brand.brandKit
                    ? {
                        primary: brand.primary,
                        secondary: brand.secondary,
                        headingFont: brand.headingFont,
                        customFontUrl: brand.customFontUrl
                      }
                    : { customFontUrl: null })
                });
              }}
              sx={{
                textAlign: 'left',
                color: 'text.primary',
                font: 'inherit',
                cursor: 'pointer',
                p: 0,
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid',
                borderColor: chosen ? 'text.primary' : 'divider',
                bgcolor: 'background.paper',
                outlineOffset: 4,
                '&:hover': { borderColor: 'text.primary' },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' }
              }}
            >
              <Box
                sx={{
                  height: 114,
                  bgcolor: e.canvas,
                  color: style.id === 'after-hours' ? '#FFF' : '#252B26',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  p: 2
                }}
              >
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ fontSize: 9, letterSpacing: '.16em' }}>
                    0{BRAND_STYLES.indexOf(style) + 1} / {style.name.toUpperCase()}
                  </Typography>
                  {chosen && <IconCheck size={15} />}
                </Stack>
                <Typography
                  sx={{
                    fontFamily: `'${style.brand.headingFont}', ${findBrandFont(style.brand.headingFont)?.category === 'sans' ? 'sans-serif' : 'serif'}`,
                    fontSize: 30,
                    lineHeight: 1
                  }}
                >
                  {style.name}
                </Typography>
                <Stack direction="row" spacing={0.6}>
                  {[style.brand.primary, style.brand.secondary, e.navigation, e.surface].map((c, i) => (
                    <Box key={i} sx={{ width: 20, height: 5, bgcolor: c, border: '1px solid rgb(0 0 0 / 8%)' }} />
                  ))}
                </Stack>
              </Box>
              <Typography sx={{ p: 1.5, fontSize: 11, minHeight: 53, color: 'text.secondary' }}>{style.description}</Typography>
            </Box>
          );
        })}
      </Box>
      <BrandKitPanel brand={brand} onChange={onChange} style={chosenStyle} previewOnly={previewOnly} />
      <BrandIdentityEditor brand={brand} onChange={onChange} storeName={storeName ?? 'Your store'} />
      <ElementLooks brand={brand} onChange={onChange} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: '280px minmax(0,1fr)' }, gap: 3, alignItems: 'start' }}>
        <Stack spacing={2.5} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 2.5 }}>
          <Box>
            <Typography variant="h4" sx={{ fontSize: 16, fontWeight: 600 }}>
              The finer details
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tune your style without starting over.
            </Typography>
          </Box>
          <Stack spacing={1.25}>
            {[
              ['primary', 'Brand accent'],
              ['secondary', 'Supporting accent'],
              ['canvas', 'Workspace'],
              ['surface', 'Cards & panels'],
              ['navigation', 'Navigation']
            ].map(([key, label]) => (
              <Stack key={key} direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="body2">{label}</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {key === 'primary' || key === 'secondary' ? brand[key] : experience[key as 'canvas']}
                  </Typography>
                  <Box
                    component="input"
                    type="color"
                    aria-label={`${label} color`}
                    value={
                      key === 'primary' || key === 'secondary'
                        ? /^#[\da-f]{6}$/i.test(brand[key])
                          ? brand[key]
                          : '#234C3A'
                        : experience[key as 'canvas']
                    }
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      key === 'primary' || key === 'secondary'
                        ? onChange({ ...brand, [key]: event.target.value })
                        : update({ [key]: event.target.value })
                    }
                    sx={{
                      p: 0,
                      width: 30,
                      height: 30,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: 'none'
                    }}
                  />
                </Stack>
              </Stack>
            ))}
          </Stack>
          <TextField
            select
            size="small"
            label="Display typeface"
            value={brand.customFontUrl ? '__custom' : brand.headingFont}
            onChange={(event) => onChange({ ...brand, headingFont: event.target.value, customFontUrl: null })}
          >
            <MenuItem value="">Default</MenuItem>
            {brand.customFontUrl && <MenuItem value="__custom">{brand.headingFont} (custom)</MenuItem>}
            {BRAND_FONTS.map((f) => (
              <MenuItem key={f.family} value={f.family}>
                {f.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Interface typeface"
            value={experience.bodyFont}
            onChange={(event) => update({ bodyFont: event.target.value as BrandExperience['bodyFont'] })}
          >
            {BODY_FONTS.map((font) => (
              <MenuItem key={font} value={font}>
                {font}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Heading character"
            value={experience.headingStyle}
            onChange={(event) => update({ headingStyle: event.target.value as BrandExperience['headingStyle'] })}
          >
            <MenuItem value="editorial">Editorial</MenuItem>
            <MenuItem value="modern">Modern</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Corners"
            value={experience.corners}
            onChange={(event) => update({ corners: Number(event.target.value) as BrandExperience['corners'] })}
          >
            {[
              [0, 'Architectural'],
              [6, 'Subtle'],
              [12, 'Rounded'],
              [20, 'Soft']
            ].map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Card finish"
            value={experience.finish}
            onChange={(event) => update({ finish: event.target.value as BrandExperience['finish'] })}
          >
            <MenuItem value="flat">Flat · quiet surfaces</MenuItem>
            <MenuItem value="outlined">Outlined · fine borders</MenuItem>
            <MenuItem value="elevated">Elevated · soft shadows</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Navigation style"
            value={experience.navStyle}
            onChange={(event) => update({ navStyle: event.target.value as BrandExperience['navStyle'] })}
          >
            <MenuItem value="pill">Filled selection</MenuItem>
            <MenuItem value="line">Editorial rule</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Workspace density"
            value={experience.density}
            onChange={(event) => update({ density: event.target.value as BrandExperience['density'] })}
          >
            <MenuItem value="comfortable">Comfortable</MenuItem>
            <MenuItem value="compact">Compact</MenuItem>
          </TextField>
          <Typography variant="caption" color="text.secondary">
            Text contrast adjusts automatically. Status colors keep their meaning across every style.
          </Typography>
        </Stack>
        <Box sx={{ position: { lg: 'sticky' }, top: 100, minWidth: 0 }}>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={previewMode}
              onChange={(_, value) => value && setPreviewMode(value)}
              aria-label="Preview color mode"
            >
              <ToggleButton value={ThemeMode.LIGHT}>Light</ToggleButton>
              <ToggleButton value={ThemeMode.DARK}>Dark</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <BrandWorkspacePreview brand={brand} mode={previewMode} storeName={storeName} />
        </Box>
      </Box>
    </Stack>
  );
}
