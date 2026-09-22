# Extraction Accuracy + Font Consistency (Part 4 of 4) — Design

**Date:** 2026-07-21
**Branch:** `innercirclecrmmerge` (no new branches)
**Status:** Approved by Nigel 2026-07-21 (chart legends only, not titles)

Final part of the four-part mission (1: CRM merge, 2: header tab, 3: immersive UI — all DONE).

## 4a — Rewrite brand color extraction for accuracy

`src/utils/extractBrandColors.ts`. Public `extractBrandColors(file: File): Promise<{ swatches, suggestedPrimary, suggestedSecondary }>` and its return shape are **unchanged** (the Branding settings UI consumer keeps working).

**Load-bearing constraint (verified):** the test env is plain node — no jsdom, no canvas, no setupFiles. So `extractBrandColors` stays a thin canvas shell (untested), and **all algorithm logic lives in pure exported functions** fed `Rgb[]` / `Uint8ClampedArray`, so the five scenarios run shim-free.

Known weaknesses being fixed (from the spec):

- Median-cut ran in RGB → move clustering to **OKLab** (perceptual). No OKLab distance helper exists in the codebase, so it's hand-written; per-pixel sRGB→OKLab is inlined (not via `hexToOklch`, which would round-trip hex 65k times).
- Fixed thresholds (`L≥0.92`/`L≤0.08`/`S<0.15`) dropped muted/pastel/earth-tone brands → **adaptive chroma cutoff** computed from the image's chroma distribution: a real cut only when genuinely-chromatic pixels exist, a low floor otherwise. Near-white/black gate moves to OKLab L.
- Coverage was computed then discarded → clusters now carry real **coverage**; ranking is coverage-based with distinctiveness surfacing the accent as secondary.
- "Darkest saturated = primary" → **primary = highest-coverage sufficiently-chromatic cluster; secondary = most hue-distant remaining.**
- Sample canvas **128 → 256px**; alpha filtering kept (`MIN_ALPHA=128`).

**Preserved contracts:** empty input → Allyvia defaults `#2f6fd4`/`#5f4cc0`; single-color logo → `secondary===primary`; both suggestions pass `ensureAccessible(hex,'#fff')`; **no `console.warn`** added. The old `pixelSaturationLightness`/`isBrandPixel` HSL helpers become dead and are removed with their tests; `selectSuggestions` changes signature (now takes clusters) and its tests are rewritten in lockstep. New tests: solid / two-color / 90-10 accent / pastel / photographic / transparent-bg, all deterministic.

## 4b — Font consistency

- **h5 + h6** get `fontFamily: headingFont` in `src/themes/typography.tsx` (they currently inherit Inter; h1–h4 already have it). Body/inputs/tables stay Inter.
- **10 hardcoded chart legend `fontFamily: 'Roboto, sans-serif'` sites → `theme.typography.fontFamily`** (brand body font), additive-only (these analytics files were flagged do-not-break in Part 1). Chart **titles** left as-is (approved: legends only). Sites + fix per the table in the plan; #2 is a static config object whose consumer `TotalGrowthBarChart.tsx` already merges a themed legend — fix there. **Never a global `fontFamily` sweep** — ~11 intentional monospace / unrelated sites must stay untouched (RedeemCodeDialog, EmailDraftDrawer, POSSales, FinancialStatements, TwoFactorSetupWizard, plus employee/error/playground monospace).
- **Bootstrap font-load: already correct — verify-only, no change.** `BrandThemeSync` mounts inside `ThemeCustomization` above the router; the localStorage cache paints instantly → `themes/index.tsx` load effect fires at bootstrap before any route, so the header tab (Part 2) doesn't flash for returning users. Only a first-ever cold-browser visit briefly waits for the server theme, mitigated by `font-display: swap` — extending to that case would need an index.html preload, out of scope.

## Verification

1. New extraction tests pass; determinism verified; empty/mono/transparent guards. Full vitest green.
2. Typecheck stays at the 48-error baseline (the 10 chart files have 0 errors → keep at 0; `typography.tsx`'s 2 pre-existing errors at L69/124 are away from the h5/h6 edit). Build; lint/prettier on touched files.
3. Browser: analytics dashboard still renders (charts intact) with legend font = Inter; a heading (h5/h6) shows the brand heading font on the immersive Inner Circle page; Branding settings extraction still produces suggestions.

## Out of scope

First-visit cold-browser font preload; chart title fonts; any backend change; fixing pre-existing typecheck errors.
