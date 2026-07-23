import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, ThemeProvider } from '@mui/material/styles';

import { IconCrown } from '@tabler/icons-react';

import { ThemeMode } from 'config';
import { generateBrandPalette } from 'themes/brandPalette';
import { resolveChromeTheme, resolveContentTheme, TemplateName } from 'themes/immersiveTheme';
import { buildTheme } from 'themes/palette';

const ALLYVIA_PRIMARY = '#2f6fd4';
const ALLYVIA_SECONDARY = '#5f4cc0';
const NAV_DOT_COUNT = 4;
const ACTIVE_NAV_INDEX = 0;
// Hardcoded, always-legible status colors — these must stay readable on EVERY template's content
// card, including bold's dark surface, so they are never routed through the theme engine.
const STATUS_ACTIVE = '#2e7d32';
const STATUS_INACTIVE = '#ed6c02';

export interface DashboardMiniPreviewProps {
  /**
   * Which of the 6 owner-selectable templates to render. Both the chrome (sidebar + top bar) and
   * the content (canvas + card + text + bars) reflect this template exactly as the real app paints
   * it — see docs/superpowers/specs/2026-07-21-template-gallery-design.md.
   */
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
 * A scaled, truthful "what you'll get" mock of the REAL app layout under the 6-template model (see
 * docs/superpowers/specs/2026-07-21-template-gallery-design.md). It reflects BOTH themed layers the
 * way MainLayout resolves them:
 *
 *  • CHROME (sidebar strip + top bar) is scoped under a `resolveChromeTheme` ThemeProvider — falling
 *    back to the LIGHT brand palette (white chrome + brand-colored active nav) for neutral-chrome
 *    templates (clean/widgets), NOT the Allyvia-blue default.
 *  • CONTENT (canvas + card + text + bars) mirrors `resolveContentTheme` by reading the EXACT tokens
 *    MainContentStyled + MUI cards read (canvas = dark[800] in dark / background.paper in light; card
 *    = background.paper; text = text.primary/secondary; border = divider; bars/accent = primary.main).
 *    So clean/tinted/sidebar/widgets compute white/near-white content, immersive a tinted wash, and
 *    bold dark surfaces + light text — instead of a hard-coded white panel.
 *
 * Status chips (green Active / orange Inactive) stay on fixed literal colors so they remain legible
 * on every template. The whole color-engine call is wrapped defensively so an in-progress/invalid
 * hex (mid-keystroke in the hex field) can never throw and take down all 6 cards at once.
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

  // Resolve the chrome + content themes exactly the way MainLayout does (resolveChromeTheme /
  // resolveContentTheme -> buildTheme), then derive the literal content surface colors by mirroring
  // MainContentStyled + cards (the single source of truth). Wrapped defensively: an in-progress/
  // invalid hex would otherwise throw inside the color engine and take down every card at once.
  const resolved = useMemo(() => {
    const brandInput = { primary, secondary, headingFont: headingFont || 'Inter' };

    try {
      // CHROME: resolveChromeTheme; null (neutral chrome → clean/widgets) falls back to the LIGHT
      // BRAND palette (white chrome + brand-colored active nav), NOT the Allyvia-blue default.
      const chromeRes = resolveChromeTheme(brandInput, schemeMode, template);
      const chromeTheme = buildTheme(
        chromeRes ? (chromeRes.mode === 'dark' ? ThemeMode.DARK : ThemeMode.LIGHT) : mode,
        chromeRes ? chromeRes.colors : generateBrandPalette({ primary, secondary, mode: schemeMode })
      );

      // CONTENT: resolveContentTheme; null (clean/sidebar) falls back to the light brand palette
      // (white content).
      const contentRes = resolveContentTheme(brandInput, schemeMode, template);
      const contentMode = contentRes ? (contentRes.mode === 'dark' ? ThemeMode.DARK : ThemeMode.LIGHT) : mode;
      const contentColors = contentRes ? contentRes.colors : generateBrandPalette({ primary, secondary, mode: schemeMode });
      const contentTheme = buildTheme(contentMode, contentColors);
      const cardAccented = contentRes?.cardAccented ?? false;

      // Mirror MainContentStyled + cards EXACTLY: the canvas is the mode-branched surface token
      // (dark mode reads `darkBackground` — the exact source `theme.palette.dark[800]` maps from —
      // else `background.paper`); cards read `background.paper`; text/border/primary come straight
      // off the built theme (primary brightens in dark since buildTheme picks `darkPrimaryMain`).
      const isDark = contentMode === ThemeMode.DARK;
      return {
        chromeTheme,
        cardAccented,
        canvasBg: isDark ? contentColors.darkBackground : contentTheme.palette.background.paper,
        cardBg: contentTheme.palette.background.paper,
        textMain: contentTheme.palette.text.primary,
        textSub: contentTheme.palette.text.secondary,
        cardBorder: contentTheme.palette.divider,
        barColor: contentTheme.palette.primary.main,
        accentColor: contentTheme.palette.primary.main
      };
    } catch {
      // Fall back to the plain Allyvia default for both layers so the preview never crashes.
      const fbColors = generateBrandPalette({ primary: ALLYVIA_PRIMARY, secondary: ALLYVIA_SECONDARY, mode: schemeMode });
      const fb = buildTheme(mode, fbColors);
      const isDark = mode === ThemeMode.DARK;
      return {
        chromeTheme: fb,
        cardAccented: false,
        canvasBg: isDark ? fbColors.darkBackground : fb.palette.background.paper,
        cardBg: fb.palette.background.paper,
        textMain: fb.palette.text.primary,
        textSub: fb.palette.text.secondary,
        cardBorder: fb.palette.divider,
        barColor: fb.palette.primary.main,
        accentColor: fb.palette.primary.main
      };
    }
  }, [primary, secondary, headingFont, schemeMode, template, mode]);

  const { chromeTheme, cardAccented, canvasBg, cardBg, textMain, textSub, cardBorder, barColor, accentColor } = resolved;
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

        {/* CONTENT: canvas + card + text + bars, mirroring resolveContentTheme via the literal tokens
            derived above (canvasBg/cardBg/textMain/textSub/cardBorder/barColor). Rendered with those
            literal colors — not '#ffffff' — so tinted/immersive/bold actually show their surfaces. */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            bgcolor: canvasBg,
            display: 'flex',
            flexDirection: 'column',
            p: compact ? 0.65 : 1.5
          }}
        >
          {/* the stat "card" — reads background.paper like a real MainCard; accented (widgets) adds a
              brand left-border + brand-colored title, matching cardOverrides. */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              bgcolor: cardBg,
              border: `1px solid ${cardBorder}`,
              ...(cardAccented ? { borderLeft: `3px solid ${accentColor}` } : {}),
              borderRadius: compact ? 0.75 : 1.25,
              display: 'flex',
              flexDirection: 'column',
              gap: compact ? 0.4 : 0.85,
              p: compact ? 0.55 : 1.15
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: compact ? 5.5 : 8,
                  fontWeight: 700,
                  letterSpacing: 0.2,
                  textTransform: 'uppercase',
                  color: cardAccented ? accentColor : textSub,
                  lineHeight: 1.2
                }}
              >
                Daily profit
              </Typography>
              <Typography sx={{ fontSize: compact ? 11 : 19, fontWeight: 700, color: textMain, lineHeight: 1.1 }}>1,284</Typography>
              <Typography sx={{ fontSize: compact ? 6 : 8, color: textSub, lineHeight: 1.2 }}>Active customers</Typography>
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
                    bgcolor: barColor
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
