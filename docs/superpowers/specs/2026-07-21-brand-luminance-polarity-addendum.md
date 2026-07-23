# Brand-Luminance Polarity — Design Addendum

**Date:** 2026-07-21 · **Branch:** `innercirclecrmmerge` · Follow-up to the bespoke-branding mini-mission.

## Problem (user-reported)
Primary `#18552a` (dark green, OKLCH L≈0.35) rendered as a **pale mint** surface. Two causes in `themes/immersiveTheme.ts`:
1. `surface()` runs `ensureLegible` against a text token chosen by **app mode** (light→`#374151` dark ink). A dark target surface gets **lightened** to keep dark text legible → surfaces are structurally forced light in light mode. "Bold" light preset is `bgL 0.90` (light) — never actually dark.
2. Chroma capped 0.05–0.09 → surface is a **desaturated hue wash**, not the real saturated brand color.

## Decisions (user)
- **Auto-reflect the primary:** surface polarity follows the primary's lightness.
- **Near-white text** on dark surfaces (bright brand tint reserved for headings/accents).

## New model — luminance-driven polarity
```
primaryL = hexToOklch(primary).L
darkBrand = primaryL < DARK_BRAND_THRESHOLD   // 0.5
polarity(template, appMode):
  if appMode === 'dark' return 'dark'                 // respect the user's dark-mode toggle
  if template === 'bright' return 'light'             // Bright is the always-light/airy escape
  return darkBrand ? 'dark' : 'light'                 // Soft/Bold auto-reflect the brand
effectiveMode = polarity   // what buildTheme() is called with (may differ from appMode)
```

- **Light polarity** — light surfaces + dark text (today's behavior). Presets vary tint intensity:
  bright bg 0.985 / paper 1.0 / chromaMax 0.03; soft bg 0.94 / paper 0.965 / 0.05; bold bg 0.90 / paper 0.94 / 0.07.
- **Dark polarity** — dark **brand-colored** surfaces (low L, fuller chroma so the green reads) + near-white text:
  soft bg 0.30 / paper 0.36 / chromaMax 0.09; bold bg 0.20 / paper 0.26 / chromaMax 0.12. (`bright` never dark.)
  `headingInk` = a **bright** tint of the primary (high L) so headings pop on the dark surface; body text = the dark ramp's light tokens.

## How it renders (the fix)
`surface()` gets the text token by **polarity** (dark→near-white, light→dark ink), so `ensureLegible` keeps a dark surface dark. `buildTemplateColors` builds the zone from `generateBrandPalette(effectiveMode)` (so text tokens match the surface) then re-points the effectiveMode's surface slots to the brand-derived surfaces. The zone theme is built with `buildTheme(effectiveMode, colors)` — a dark-polarity zone renders with the dark ramp (light text, brand-green dark surfaces) even while the app toggle is Light. This is "the dark colors of the brand + white text," not a generic grey dark-mode.

## Interface change
`resolveZoneSurfaces(...) : ColorProps | null` → **`resolveZoneTheme(...) : { colors: ColorProps; mode: 'light'|'dark' } | null`** (returns the effective mode too). Branded zone → `{templateColors, effectiveMode}`; non-branded zone → `{ generateBrandPalette(appMode), appMode }` (neutral, follows app mode). Consumers (`palette.tsx`, `ImmersiveThemeProvider`, `MainLayout`) call `buildTheme(zt.mode, zt.colors)` and paint the canvas from the effectiveMode's background slot (`grey50` light / `darkBackground` dark).

## Guards / AA
Every surface still AA-corrected via `ensureLegible` against its polarity text token (tests assert ≥ 4.5 for BOTH polarities). Null/neutral/malformed brand → null (unchanged). generateBrandPalette + frozen tokens untouched. Template separation still asserted within each polarity.

## Verify
Browser (admin, real dark-green brand): Soft/Bold → dark green surfaces + near-white text (light app mode); Bright → white/airy; light-brand company → light surfaces (unchanged); dark app mode → dark throughout. AA logged in tests.
