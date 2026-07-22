import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, ThemeProvider } from '@mui/material/styles';

import { IconCrown } from '@tabler/icons-react';

import { ThemeMode } from 'config';
import { generateBrandPalette } from 'themes/brandPalette';
import { resolveChromeTheme, TemplateName } from 'themes/immersiveTheme';
import { buildTheme } from 'themes/palette';

const ALLYVIA_PRIMARY = '#2f6fd4';
const ALLYVIA_SECONDARY = '#5f4cc0';
const NAV_DOT_COUNT = 4;
const ACTIVE_NAV_INDEX = 0;
// Hardcoded, always-legible status colors (per the chrome-only theming addendum) — these must
// stay visible on the content panel regardless of how dark/bold the chrome gets.
const STATUS_ACTIVE = '#2e7d32';
const STATUS_INACTIVE = '#ed6c02';

export interface DashboardMiniPreviewProps {
  /** Which of the 3 owner-selectable looks themes the chrome (sidebar + top bar). */
  template: TemplateName;
  /** Owner's CURRENT (possibly unsaved) primary/secondary — kept live, not the persisted brandTheme. */
  primary: string;
  secondary: string;
  headingFont?: string;
  mode: ThemeMode;
  /** 'card' = small template-picker thumbnail; 'live' = the larger live-preview panel. Defaults to 'live'. */
  size?: 'card' | 'live';
}

/**
 * A scaled mock of the REAL app layout under the chrome-only theming model (see
 * docs/superpowers/specs/2026-07-21-chrome-only-theming-addendum.md): a themed sidebar strip +
 * top bar (the "chrome", scoped under its own ThemeProvider exactly like MainLayout resolves it)
 * beside an ALWAYS-white content panel that is deliberately rendered OUTSIDE that ThemeProvider
 * and styled with literal colors — proving status-chip/content legibility survives a dark/bold
 * chrome. Shared by the 3 template-picker cards and the bottom "Live preview" panel so both
 * reflect the same real layout instead of a generic mock.
 */
export default function DashboardMiniPreview({
  template,
  primary,
  secondary,
  headingFont,
  mode,
  size = 'live'
}: DashboardMiniPreviewProps) {
  const compact = size === 'card';
  const schemeMode: 'light' | 'dark' = mode === ThemeMode.DARK ? 'dark' : 'light';

  // Resolve the chrome theme exactly the way MainLayout does (resolveChromeTheme -> buildTheme),
  // scoped to this preview instance. Wrapped defensively: an in-progress/invalid hex (e.g.
  // mid-keystroke in the hex TextField) would otherwise throw inside the color engine and take
  // down every card at once.
  const chromeTheme = useMemo(() => {
    try {
      const brandInput = { primary, secondary, headingFont: headingFont || 'Inter' };
      const resolved = resolveChromeTheme(brandInput, schemeMode, template);
      if (resolved) {
        const chromeMode = resolved.mode === 'dark' ? ThemeMode.DARK : ThemeMode.LIGHT;
        return buildTheme(chromeMode, resolved.colors);
      }
    } catch {
      // fall through to the plain Allyvia default below
    }
    return buildTheme(mode, generateBrandPalette({ primary: ALLYVIA_PRIMARY, secondary: ALLYVIA_SECONDARY, mode: schemeMode }));
  }, [primary, secondary, headingFont, schemeMode, template, mode]);

  const chromePrimary = chromeTheme.palette.primary.main;

  return (
    <Box
      sx={{
        display: 'flex',
        borderRadius: 2,
        overflow: 'hidden',
        border: (t) => `1px solid ${t.palette.divider}`,
        height: compact ? 108 : 220
      }}
    >
      {/* CHROME: left sidebar strip — themed by the template */}
      <ThemeProvider theme={chromeTheme}>
        <Box
          sx={{
            width: compact ? 20 : 36,
            flexShrink: 0,
            bgcolor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: compact ? 0.5 : 1,
            pt: compact ? 0.75 : 1.5
          }}
        >
          {Array.from({ length: NAV_DOT_COUNT }).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: compact ? 9 : 15,
                height: compact ? 9 : 15,
                borderRadius: 0.75,
                bgcolor: i === ACTIVE_NAV_INDEX ? 'primary.main' : (t) => alpha(t.palette.text.primary, 0.15)
              }}
            />
          ))}
        </Box>
      </ThemeProvider>

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* CHROME: top bar — logo mark + Inner Circle crown pill, themed by the template */}
        <ThemeProvider theme={chromeTheme}>
          <Box
            sx={{
              height: compact ? 18 : 28,
              flexShrink: 0,
              bgcolor: 'background.default',
              borderBottom: (t) => `1px solid ${t.palette.divider}`,
              display: 'flex',
              alignItems: 'center',
              px: compact ? 0.6 : 1.25,
              gap: 0.5
            }}
          >
            {/* logo mark */}
            <Box sx={{ width: compact ? 7 : 10, height: compact ? 7 : 10, borderRadius: 0.5, bgcolor: 'primary.main' }} />
            <Box sx={{ flex: 1 }} />
            {/* Inner Circle crown pill */}
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.3}
              sx={{
                borderRadius: 5,
                px: compact ? 0.4 : 0.75,
                py: 0.15,
                bgcolor: (t) => alpha(t.palette.primary.main, 0.18)
              }}
            >
              <IconCrown size={compact ? 7 : 11} stroke={2} color={chromePrimary} />
              {!compact && (
                <Typography sx={{ fontSize: 6.5, fontWeight: 700, color: 'primary.main', lineHeight: 1, whiteSpace: 'nowrap' }}>
                  Inner Circle
                </Typography>
              )}
            </Stack>
          </Box>
        </ThemeProvider>

        {/* CONTENT: ALWAYS white/legible — deliberately outside the chrome ThemeProvider, styled
            with literal colors so it never inherits the chrome's dark/tinted surfaces. */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            bgcolor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: compact ? 0.5 : 1,
            p: compact ? 0.65 : 1.5
          }}
        >
          <Box>
            <Typography sx={{ fontSize: compact ? 11 : 19, fontWeight: 700, color: '#1f2933', lineHeight: 1.1 }}>1,284</Typography>
            <Typography sx={{ fontSize: compact ? 6 : 8, color: '#5b6472' }}>Active customers</Typography>
          </Box>

          <Stack direction="row" spacing={0.5}>
            <Box
              sx={{
                bgcolor: STATUS_ACTIVE,
                color: '#fff',
                borderRadius: 4,
                px: compact ? 0.5 : 0.75,
                fontSize: compact ? 6 : 8,
                fontWeight: 600,
                lineHeight: compact ? '11px' : '16px'
              }}
            >
              Active
            </Box>
            <Box
              sx={{
                bgcolor: STATUS_INACTIVE,
                color: '#fff',
                borderRadius: 4,
                px: compact ? 0.5 : 0.75,
                fontSize: compact ? 6 : 8,
                fontWeight: 600,
                lineHeight: compact ? '11px' : '16px'
              }}
            >
              Inactive
            </Box>
          </Stack>

          <Stack direction="row" spacing={compact ? 0.4 : 0.6} alignItems="flex-end" sx={{ flex: 1, pb: 0.25 }}>
            {[0.45, 0.75, 0.55, 0.95].map((h, i) => (
              <Box
                key={i}
                sx={{
                  width: compact ? 4 : 7,
                  height: `${h * 100}%`,
                  minHeight: 3,
                  borderRadius: 0.5,
                  bgcolor: primary
                }}
              />
            ))}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
