# Immersive Inner Circle UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entering Inner Circle transforms the page into a muted, brand-tinted environment derived from the company's brand theme — AA-safe, both modes, with a 250ms crossfade — while everything outside stays standard.

**Architecture:** A pure OKLCH token builder (`themes/immersiveTheme.ts`, unit-tested) feeds (a) a route-scoped full-assembly `ThemeProvider` wrapping the two Inner Circle routes and (b) a call-site canvas crossfade on the always-mounted `<main>`. Accents land as scoped component overrides; a short list of hardcoded colors gets direct edits; hero band + logo watermark are contrast-gated flourishes.

**Tech Stack:** React 19, MUI v7 + Emotion, existing OKLCH harmony engine, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-21-immersive-inner-circle-design.md`

## Global Constraints

- Branch `innercirclecrmmerge` — verify `git branch --show-current` before EVERY commit (external sessions have switched checkouts).
- Node via nvm: `export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"` before any npm/vitest command.
- Backend zero changes. TS strict, no `any`. No Tailwind.
- Typecheck baseline: 48 pre-existing errors in theme/layout files (incl. `MainContentStyled.ts` TS2339 — NEVER edit that file). Gate = no NEW errors in touched files + `npm run build`.
- OKLCH/contrast imports come from `themes/harmony.ts` ONLY (never the near-duplicate `contrastRatio`/`AA_NORMAL` in `brandPalette.ts` — different luminance threshold).
- `generateBrandPalette` must not be modified (frozen-token tests). `chartPalette.ts` untouched.
- Working dir: `/Users/nigelfernando/Documents/Allyvia/allyvia-frontend`. Tests: `npx vitest run <path>`.

## Verified signatures (from source)

- `harmony.ts`: `Oklch {L,C,H}`; `hexToOklch(hex): Oklch` (throws on bad hex); `oklchToHex(o): string` (gamut-maps by reducing C); `ensureLegible(color: Oklch, bg: string, minRatio: number, label: string): Oklch` (moves L only, auto-direction, console.warns on correction); `contrastRatio(a,b): number`; `AA_NORMAL = 4.5`; `generateHarmony({primary, secondary}, opts?): HarmonyResult` with `{ isNeutralBrand, chromaBudget, toneProfile, brandHue, … }`.
- `brandPalette.ts`: `generateBrandPalette({primary, secondary, mode: 'light'|'dark'}): ColorProps`. Locked text tokens: grey700 `#374151`, darkTextPrimary `#bdc8f0`.
- `palette.tsx`: default `Palette(mode, presetColor, brandTheme?)`; **private** `function buildTheme(mode: ThemeMode, colors: ColorProps)` at ~line 72 → Task 2 exports it.
- Assembly recipe (`themes/index.tsx`): `buildTheme` palette → `Typography(theme, borderRadius, fontFamily, headingFont)` → `customShadows(mode, theme)` → `createTheme({direction, palette, breakpoints {0,375,768,1024,1536}, mixins.toolbar {minHeight:'64px', padding:'16px'}, typography, customShadows})` → `themes.components = componentStyleOverrides(themes, borderRadius, outlinedFilled)` LAST.
- `ColorProps` = `{ readonly [key: string]: string }` (types/index.ts:109). Slot mapping: light `background.paper ← paper`, `background.default ← paper`; dark `background.paper ← darkLevel2`, `background.default ← darkPaper`; `mainContent` dark canvas reads `darkBackground`; compStyleOverride derives from `grey50`/dark tokens.
- MainLayout call site (`layout/MainLayout/index.tsx:103`): `<MainContentStyled {...{ borderRadius, menuOrientation, open: drawerOpen }}>` wrapping Container → `<Outlet />` → `<Footer />`.
- `useConfig()` exposes `borderRadius, brandTheme, fontFamily, headingFontFamily, mode, outlinedFilled, presetColor, themeDirection`.

---

### Task 1: Pure token builder + tests (TDD)

**Files:**

- Create: `src/themes/immersiveTheme.ts`
- Create: `src/themes/immersiveTheme.test.ts`

**Interfaces:**

- Produces: `interface ImmersiveSurfaces { background: string; paper: string; headingInk: string; headerBand: [string, string]; accent: string }`; `buildImmersiveSurfaces(brandTheme: BrandTheme, mode: 'light'|'dark'): ImmersiveSurfaces | null`; `buildImmersiveColors(brandTheme: BrandTheme, mode: 'light'|'dark'): ColorProps | null`. `null` = render standard theme.

- [ ] **Step 1: Write the failing tests**

`src/themes/immersiveTheme.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AA_NORMAL, contrastRatio, hexToOklch } from './harmony';
import { buildImmersiveColors, buildImmersiveSurfaces } from './immersiveTheme';

const BRAND = { primary: '#2f6fd4', secondary: '#5f4cc0', headingFont: 'Playfair Display' };
const HEX = /^#[0-9a-f]{6}$/;
const LIGHT_TEXT = '#374151';
const DARK_TEXT = '#bdc8f0';

const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildImmersiveSurfaces', () => {
  it('returns null for null brand, malformed hex, and neutral brands', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(buildImmersiveSurfaces(null, 'light')).toBeNull();
    expect(buildImmersiveSurfaces({ ...BRAND, primary: 'not-a-hex' }, 'light')).toBeNull();
    expect(buildImmersiveSurfaces({ ...BRAND, primary: '#f7f7f7', secondary: '#eeeeee' }, 'light')).toBeNull();
  });

  it.each(['light', 'dark'] as const)('%s surfaces clear AA vs the locked text tokens (ratios logged)', (mode) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = buildImmersiveSurfaces(BRAND, mode);
    expect(s).not.toBeNull();
    const text = mode === 'light' ? LIGHT_TEXT : DARK_TEXT;
    for (const [name, hex] of [
      ['background', s!.background],
      ['paper', s!.paper]
    ] as const) {
      const ratio = contrastRatio(hex, text);
      console.log(`immersive.${mode}.${name} vs text ${text}: ${ratio.toFixed(2)}:1`);
      expect(hex).toMatch(HEX);
      expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
    }
    const inkRatio = contrastRatio(s!.headingInk, s!.background);
    console.log(`immersive.${mode}.headingInk vs background: ${inkRatio.toFixed(2)}:1`);
    expect(inkRatio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('keeps the brand hue and crushes chroma on the light background', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = buildImmersiveSurfaces(BRAND, 'light')!;
    const brandHue = hexToOklch(BRAND.primary).H;
    const bg = hexToOklch(s.background);
    expect(hueDistance(bg.H, brandHue)).toBeLessThanOrEqual(8);
    expect(bg.C).toBeLessThanOrEqual(0.03 + 1e-6);
  });

  it('emits a two-stop header band and is deterministic', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = buildImmersiveSurfaces(BRAND, 'light')!;
    expect(s.headerBand).toHaveLength(2);
    expect(s.headerBand[0]).toMatch(HEX);
    expect(s.headerBand[1]).toMatch(HEX);
    expect(buildImmersiveSurfaces(BRAND, 'light')).toEqual(s);
  });
});

describe('buildImmersiveColors', () => {
  it('re-points light surface tokens, leaving the brand palette otherwise intact', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = buildImmersiveSurfaces(BRAND, 'light')!;
    const c = buildImmersiveColors(BRAND, 'light')!;
    expect(c.paper).toBe(s.paper);
    expect(c.grey50).toBe(s.background);
    expect(c.primaryMain).toBeDefined();
  });

  it('re-points dark surface tokens', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = buildImmersiveSurfaces(BRAND, 'dark')!;
    const c = buildImmersiveColors(BRAND, 'dark')!;
    expect(c.darkPaper).toBe(s.background);
    expect(c.darkBackground).toBe(s.background);
    expect(c.darkLevel1).toBe(s.paper);
    expect(c.darkLevel2).toBe(s.paper);
  });

  it('returns null whenever surfaces are null', () => {
    expect(buildImmersiveColors(null, 'light')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify RED**

Run: `npx vitest run src/themes/immersiveTheme.test.ts`
Expected: FAIL — cannot resolve `./immersiveTheme`.

- [ ] **Step 3: Implement**

`src/themes/immersiveTheme.ts`:

```ts
// types
import { ColorProps } from 'types';
import { BrandTheme } from 'types/config';

import { generateBrandPalette } from './brandPalette';
import { AA_NORMAL, ensureLegible, generateHarmony, hexToOklch, oklchToHex } from './harmony';

// Locked text tokens (see LOCKED_TIER3_TOKENS in brandPalette.ts) that every
// immersive surface must stay legible against.
const LIGHT_TEXT = '#374151'; // grey700
const DARK_TEXT = '#bdc8f0'; // darkTextPrimary

// Muted-surface ceiling: keep the brand hue, crush the colorfulness.
const SURFACE_CHROMA_MAX = 0.03;

export interface ImmersiveSurfaces {
  /** page canvas — the immersive background.default */
  background: string;
  /** elevated card surface */
  paper: string;
  /** brand-primary ink for h1–h4, AA-corrected against `background` */
  headingInk: string;
  /** hero band gradient stops: brand hue → secondary hue at matched L/C */
  headerBand: [string, string];
  /** accent used by the scoped component overrides */
  accent: string;
}

function surface(L: number, C: number, H: number, text: string, label: string): string {
  return oklchToHex(ensureLegible({ L, C, H }, text, AA_NORMAL, label));
}

/**
 * Derive the immersive Inner Circle surfaces from the brand pair.
 * Returns null when nothing sensible can be derived (no brand, malformed hex —
 * reachable via the unvalidated localStorage cache — or a neutral/near-white
 * brand); callers fall back to the standard theme.
 */
export function buildImmersiveSurfaces(brandTheme: BrandTheme, mode: 'light' | 'dark'): ImmersiveSurfaces | null {
  if (!brandTheme) return null;
  try {
    const harmony = generateHarmony({ primary: brandTheme.primary, secondary: brandTheme.secondary });
    if (harmony.isNeutralBrand) return null;

    const H = harmony.brandHue;
    const C = Math.min(harmony.chromaBudget, SURFACE_CHROMA_MAX);
    const secondaryHue = hexToOklch(brandTheme.secondary).H;

    const light = mode === 'light';
    const text = light ? LIGHT_TEXT : DARK_TEXT;

    const background = surface(light ? 0.97 : 0.18, C, H, text, `immersive.${mode}.background`);
    const paper = surface(light ? 0.985 : 0.22, Math.min(C, 0.02), H, text, `immersive.${mode}.paper`);

    // Brand-primary heading ink, pushed until it clears the tinted canvas.
    const headingInk = oklchToHex(ensureLegible(hexToOklch(brandTheme.primary), background, AA_NORMAL, `immersive.${mode}.headingInk`));

    // Hero band: one perceptual step deeper than the canvas.
    const bandL = light ? 0.955 : 0.21;
    const headerBand: [string, string] = [oklchToHex({ L: bandL, C, H }), oklchToHex({ L: bandL, C, H: secondaryHue })];

    return { background, paper, headingInk, headerBand, accent: brandTheme.primary };
  } catch {
    return null;
  }
}

/**
 * ColorProps for the scoped immersive theme: the standard brand palette with
 * its surface tokens re-pointed at the muted tints. Tokens are tinted BEFORE
 * slot-mapping because mainContent, compStyleOverride, and MainContentStyled
 * read `paper`/`grey50`/`dark*` directly, bypassing `background.*`.
 */
export function buildImmersiveColors(brandTheme: BrandTheme, mode: 'light' | 'dark'): ColorProps | null {
  if (!brandTheme) return null;
  const surfaces = buildImmersiveSurfaces(brandTheme, mode);
  if (!surfaces) return null;
  const base = generateBrandPalette({ primary: brandTheme.primary, secondary: brandTheme.secondary, mode });
  if (mode === 'light') {
    return { ...base, paper: surfaces.paper, grey50: surfaces.background };
  }
  return {
    ...base,
    darkPaper: surfaces.background,
    darkBackground: surfaces.background,
    darkLevel1: surfaces.paper,
    darkLevel2: surfaces.paper
  };
}
```

- [ ] **Step 4: Run to verify GREEN** — `npx vitest run src/themes/immersiveTheme.test.ts` (all pass; ratios visible in output). Then `npx vitest run src/themes/` (no regression in harmony/brandPalette/chartPalette/palette/typography suites).

- [ ] **Step 5: Commit**

```bash
git add src/themes/immersiveTheme.ts src/themes/immersiveTheme.test.ts
git commit -m "feat(theme): immersive Inner Circle surface builder (OKLCH muted brand tints, AA-enforced)"
```

---

### Task 2: Scoped provider + route mounting

**Files:**

- Modify: `src/themes/palette.tsx` (~line 72: `function buildTheme(` → `export function buildTheme(`)
- Create: `src/views/inner-circle/ImmersiveThemeProvider.tsx`
- Modify: `src/routes/MainRoutes.tsx` (wrap the two IC route elements)

**Interfaces:**

- Consumes: Task 1 exports; `buildTheme` (newly exported); `Typography`/`customShadows`/`componentStyleOverrides` per the verified recipe.
- Produces: default `ImmersiveThemeProvider({ children })`; `useImmersive(): { active: boolean; surfaces: ImmersiveSurfaces | null }`.

- [ ] **Step 1: Export buildTheme** — in `src/themes/palette.tsx`, change the declaration at ~line 72 from `function buildTheme(mode: ThemeMode, colors: ColorProps) {` to `export function buildTheme(mode: ThemeMode, colors: ColorProps) {`. Nothing else.

- [ ] **Step 2: Create the provider**

`src/views/inner-circle/ImmersiveThemeProvider.tsx`:

```tsx
import { createContext, ReactNode, useContext, useMemo } from 'react';

// material-ui
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha, createTheme, Theme, ThemeProvider, TypographyVariantsOptions } from '@mui/material/styles';

// project imports
import { ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import componentStyleOverrides from 'themes/compStyleOverride';
import { buildImmersiveColors, buildImmersiveSurfaces, ImmersiveSurfaces } from 'themes/immersiveTheme';
import { buildTheme } from 'themes/palette';
import customShadows from 'themes/shadows';
import Typography from 'themes/typography';

// types
import { CustomShadowProps } from 'types/default-theme';

interface ImmersiveContextValue {
  active: boolean;
  surfaces: ImmersiveSurfaces | null;
}

const ImmersiveContext = createContext<ImmersiveContextValue>({ active: false, surfaces: null });

export function useImmersive(): ImmersiveContextValue {
  return useContext(ImmersiveContext);
}

// ==============================|| INNER CIRCLE - IMMERSIVE THEME PROVIDER ||============================== //

// Route-scoped brand-immersive theme. When the brand yields no sensible tint
// (no brand, malformed hex, neutral brand) it renders children untouched, so
// the standard theme is the guaranteed fallback.
export default function ImmersiveThemeProvider({ children }: { children: ReactNode }) {
  const { borderRadius, brandTheme, fontFamily, headingFontFamily, mode, outlinedFilled, themeDirection } = useConfig();
  const headingFont = brandTheme?.headingFont ?? headingFontFamily;
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const schemeMode = mode === ThemeMode.DARK ? 'dark' : 'light';

  const surfaces = useMemo(() => buildImmersiveSurfaces(brandTheme, schemeMode), [brandTheme, schemeMode]);

  const immersiveTheme: Theme | null = useMemo(() => {
    const colors = buildImmersiveColors(brandTheme, schemeMode);
    if (!colors || !surfaces) return null;

    // Same assembly recipe as ThemeCustomization (themes/index.tsx), from the
    // immersive-tinted ColorProps; componentStyleOverrides comes LAST so every
    // override derives from the finished tinted theme.
    const paletteTheme = buildTheme(mode, colors);
    const typography: TypographyVariantsOptions = Typography(paletteTheme, borderRadius, fontFamily, headingFont);
    (['h1', 'h2', 'h3', 'h4'] as const).forEach((variant) => {
      typography[variant] = { ...(typography[variant] as object), color: surfaces.headingInk };
    });
    const shadows: CustomShadowProps = customShadows(mode, paletteTheme);

    const theme = createTheme({
      direction: themeDirection,
      palette: paletteTheme.palette,
      breakpoints: { values: { xs: 0, sm: 375, md: 768, lg: 1024, xl: 1536 } },
      mixins: { toolbar: { minHeight: '64px', padding: '16px' } },
      typography,
      customShadows: shadows
    });

    const base = componentStyleOverrides(theme, borderRadius, outlinedFilled);
    const accent = theme.palette.primary.main;
    const baseTabs = (base?.MuiTabs?.styleOverrides ?? {}) as Record<string, object>;
    const baseTab = (base?.MuiTab?.styleOverrides ?? {}) as Record<string, object>;
    const baseTableCell = (base?.MuiTableCell?.styleOverrides ?? {}) as Record<string, object>;
    const baseButton = (base?.MuiButton?.styleOverrides ?? {}) as Record<string, object>;

    theme.components = {
      ...base,
      MuiTabs: { styleOverrides: { ...baseTabs, indicator: { ...baseTabs.indicator, backgroundColor: accent } } },
      MuiTab: { styleOverrides: { ...baseTab, root: { ...baseTab.root, '&.Mui-selected': { color: accent } } } },
      MuiTableCell: { styleOverrides: { ...baseTableCell, head: { ...baseTableCell.head, backgroundColor: alpha(accent, 0.06) } } },
      MuiButton: {
        styleOverrides: {
          ...baseButton,
          containedPrimary: {
            ...baseButton.containedPrimary,
            backgroundColor: accent,
            color: theme.palette.primary.contrastText,
            '&:hover': { backgroundColor: theme.palette.primary.dark }
          }
        }
      }
    } as Theme['components'];

    return theme;
  }, [brandTheme, schemeMode, mode, surfaces, borderRadius, fontFamily, headingFont, outlinedFilled, themeDirection]);

  const ctx = useMemo<ImmersiveContextValue>(
    () => ({ active: immersiveTheme !== null, surfaces: immersiveTheme ? surfaces : null }),
    [immersiveTheme, surfaces]
  );

  if (!immersiveTheme) {
    return <>{children}</>;
  }

  return (
    <ImmersiveContext.Provider value={ctx}>
      <ThemeProvider theme={immersiveTheme}>
        <Fade in appear timeout={reducedMotion ? 0 : 250}>
          <Box>{children}</Box>
        </Fade>
      </ThemeProvider>
    </ImmersiveContext.Provider>
  );
}
```

(If `as Theme['components']` proves unnecessary under tsc, drop it; if a narrower cast is needed for a single slot, prefer that over widening. No `any`.)

- [ ] **Step 3: Mount at route level**

`src/routes/MainRoutes.tsx` — add import:

```ts
import ImmersiveThemeProvider from 'views/inner-circle/ImmersiveThemeProvider';
```

Change the two IC routes:

```tsx
{ path: '/inner-circle', element: <ImmersiveThemeProvider><InnerCirclePage /></ImmersiveThemeProvider> },
{ path: '/inner-circle/surveys/drafts', element: <ImmersiveThemeProvider><SurveyDraftsPage /></ImmersiveThemeProvider> },
```

- [ ] **Step 4: Verify** — `npm run typecheck` (no lines mentioning immersiveTheme/ImmersiveThemeProvider/palette.tsx/MainRoutes beyond the 48 baseline), `npm run build`, `npx vitest run src/themes/ src/views/inner-circle/`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(inner-circle): route-scoped immersive brand theme provider"
```

---

### Task 3: Canvas crossfade at the MainLayout call site

**Files:**

- Modify: `src/layout/MainLayout/index.tsx` ONLY (never `MainContentStyled.ts`).

**Interfaces:**

- Consumes: `buildImmersiveSurfaces` (Task 1), `useConfig().brandTheme/mode`, `useLocation`.

- [ ] **Step 1: Compute the immersive canvas + apply inline sx**

In `src/layout/MainLayout/index.tsx`:
(a) Ensure imports include `useMemo` (react), `useLocation` (react-router-dom — the file may already import router hooks; extend the existing import), `ThemeMode` from 'config' (already imported if used; else add), and:

```ts
import { buildImmersiveSurfaces } from 'themes/immersiveTheme';
```

(b) Inside the component (it already calls `useConfig()` — reuse; add `brandTheme` and `mode` to the destructure if absent):

```ts
const { pathname } = useLocation();
// Immersive Inner Circle canvas: painted on the always-mounted <main> so the
// 250ms background-color transition crossfades on BOTH route enter and leave.
const immersiveCanvas = useMemo(() => {
  if (!pathname.startsWith('/inner-circle')) return null;
  return buildImmersiveSurfaces(brandTheme, mode === ThemeMode.DARK ? 'dark' : 'light')?.background ?? null;
}, [pathname, brandTheme, mode]);
```

(c) On the `<MainContentStyled …>` element (line ~103), add:

```tsx
sx={{
  transition: 'background-color 250ms ease',
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
  ...(immersiveCanvas && { backgroundColor: immersiveCanvas })
}}
```

- [ ] **Step 2: Verify** — `npm run typecheck` (no NEW errors mentioning `layout/MainLayout/index`; the pre-existing `MainContentStyled.ts` errors stay), `npm run build`.

- [ ] **Step 3: Commit**

```bash
git add src/layout/MainLayout/index.tsx
git commit -m "feat(layout): crossfade main canvas to immersive tint on Inner Circle routes"
```

---

### Task 4: Hero band + watermark + direct accent edits

**Files:**

- Modify: `src/views/inner-circle/InnerCirclePage.tsx`
- Modify: `src/ui-component/common/AllyviaStats.tsx` (line ~31)
- Modify: `src/ui-component/cards/MainCard.tsx` (line ~74)

**Interfaces:**

- Consumes: `useImmersive()` (Task 2), `useConfig().brandTheme?.logoUrl`, `alpha`/`useTheme` from `@mui/material/styles`.

- [ ] **Step 1: InnerCirclePage — hero band + watermark**

(a) Add imports: `import { alpha, useTheme } from '@mui/material/styles';` and `import { useImmersive } from './ImmersiveThemeProvider';` and ensure `useConfig` is imported (`import useConfig from 'hooks/useConfig';`).
(b) In the component body:

```ts
const theme = useTheme();
const { active: immersive, surfaces } = useImmersive();
const { brandTheme } = useConfig();
const brandLogoUrl = brandTheme?.logoUrl ?? null;
```

(c) Wrap the existing title `<Stack direction={{ xs: 'column', sm: 'row' }} …>` (the "Inner Circle" h3 + Redeem code / Survey Drafts buttons row) in a hero `<Box>`; the Stack itself is unchanged inside:

```tsx
<Box
  sx={{
    position: 'relative',
    ...(immersive && surfaces
      ? {
          p: 2,
          borderRadius: 2,
          overflow: 'hidden',
          background: `linear-gradient(90deg, ${surfaces.headerBand[0]}, ${surfaces.headerBand[1]})`
        }
      : {})
  }}
>
  {immersive && brandLogoUrl && (
    <Box
      component="img"
      src={brandLogoUrl}
      alt=""
      aria-hidden
      sx={{
        position: 'absolute',
        right: 16,
        top: '50%',
        transform: 'translateY(-50%)',
        height: 72,
        opacity: 0.035,
        pointerEvents: 'none'
      }}
    />
  )}
  {/* existing title Stack, unchanged */}
</Box>
```

(d) Top-3 leaderboard row tints — replace the three hardcoded rgba strings (~lines 463-466) with theme-agnostic alpha over the medal hexes:

```ts
bgcolor: rank === 1 ? alpha('#FFD700', 0.06) : rank === 2 ? alpha('#C0C0C0', 0.06) : alpha('#CD7F32', 0.06);
```

(e) Action Queue left borders — each of the four group `<Box>`s (Birthdays this week / Win-back candidates / Near promotion / Open tasks) gets:

```tsx
sx={{ ...(immersive && { borderLeft: `3px solid ${alpha(theme.palette.primary.main, 0.5)}`, pl: 1.5 }) }}
```

(the un-immersive render stays byte-identical to today).

- [ ] **Step 2: AllyviaStats gold + MainCard dark hover**

`src/ui-component/common/AllyviaStats.tsx` line ~31: replace the hardcoded `'#b7791f'` with `theme.palette.warning.dark` (brand-harmonized gold; `theme` is already in scope — verify, else use the file's existing theme access pattern).

`src/ui-component/cards/MainCard.tsx` line ~74: replace the legacy Berry blue dark hover shadow:

```ts
const defaultShadow =
  mode === ThemeMode.DARK ? `0 2px 14px 0 ${alpha(theme.palette.primary.main, 0.1)}` : '0 2px 14px 0 rgb(32 40 45 / 8%)';
```

(add `alpha` to the file's `@mui/material/styles` import if absent; `theme` is in scope — verify).

- [ ] **Step 3: Verify** — `npm run typecheck` (no NEW errors in the three files), `npm run build`, `npx vitest run` (full — AllyviaStats/MainCard are widely used; suites must stay green).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(inner-circle): hero brand band + watermark, action-queue accents, harmonized gold + dark hover shadow"
```

---

### Task 5: Verification pass

**Files:** none (fix-forward only).

- [ ] **Step 1: Static** — `npm run typecheck` (48 baseline, none in touched files); `npm run build`; `npx vitest run` (all suites incl. the new immersiveTheme tests — ratios visible in log); `npx prettier --check` + `npx eslint` on every file this part touched (fix with `--write`/targeted edits if needed).

- [ ] **Step 2: Browser (dev servers on :3000/:8000)** — with the demo company's brand configured:

1. `/dashboard` → `/inner-circle`: canvas crossfades to a visibly tinted (non-white) background over ~250ms; leaving IC fades back.
2. Hero band behind the title with the logo watermark (if a logo is uploaded); heading in brand ink + heading font.
3. Cards/paper read as elevated tinted layers; tables show tinted header rows; tab indicators + selected tabs in brand accent; contained-primary buttons in brand primary; Action Queue groups show left borders.
4. Drawer (open a customer if data allows): tinted paper + themed tabs.
5. Dark mode via Settings → Appearance: repeat 1–3 (dark tints, AA text legible).
6. No-brand fallback: clear the brand theme (or a company without one): IC renders the standard white theme — no tint, no band, no borders; standard app pages unchanged throughout.
7. `/inner-circle/surveys/drafts` also immersive.

- [ ] **Step 3: Commit fixes** — `git add -A && git commit -m "fix: Part 3 verification follow-ups"` (skip if none).

## Self-review notes

- Spec coverage: builder+AA+guards (T1), provider+overrides+routes (T2), crossfade+reduced-motion (T3), flourishes+direct edits (T4), light/dark/fallback verification (T5). Charts: nothing to do (theme-reading, per map). `generateBrandPalette`/`MainContentStyled.ts` untouched by construction.
- Type consistency: `ImmersiveSurfaces` defined once in `immersiveTheme.ts`; `buildImmersiveColors` feeds the exported `buildTheme(mode, colors)`; update-free elsewhere.
- Known judgment calls for reviewers: dark-mode `darkBackground` also tinted (mainContent bypass); `MuiButton.containedPrimary` overrides a documented app-wide ink-button decision route-locally (spec-mandated).
