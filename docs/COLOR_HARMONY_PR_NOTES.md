# Brand theming — perceptual color-harmony upgrade

**Branch:** `feat/color-harmony-upgrade`
**Type:** internals-only. No public signature, `palette.tsx`, `typography.tsx`, backend, config, or component changed.

## What & why

A store's brand color can be anything — pastel pink, yellow, near-black, grey, neon — but the app
also shows semantic colors with fixed meaning (success = green/up, error = red/down, warning = amber,
info = blue). A raw brand color next to a raw semantic color clashes (pink brand + fire-engine-green
"revenue up"). This upgrade makes **any** brand input yield a color set that is both **legible** and
**harmonious**, instantly (<1 ms), deterministically, with no network and no new dependency.

The whole app already routes brand colors through one function, so replacing that function's internals
upgrades everything automatically.

## How it works — `src/themes/harmony.ts` (new)

All math is in **OKLCH** (Björn Ottosson's OKLab). HSL "lightness" is non-perceptual, so it gives
uneven ramps and unreliable contrast reasoning; OKLCH is perceptually uniform. Conversion + WCAG
luminance are implemented inline and unit-tested against reference values (matching the house style
of `brandPalette.ts`, which likewise avoids a color dependency).

1. **Brand personality** — the brand primary → OKLCH `(L, C, H)`. From it: a `chromaBudget`
   (brand chroma, clamped to `[0.05, 0.16]` — floors flat brands, tames neon) and a `toneProfile`
   (brand lightness). Every non-brand color adopts these so the set feels like one system.
2. **Brand ramp** (`light/200/main/dark/800`, light + dark mode) — hue fixed, L stepped across
   perceptual stops relative to a contrast-corrected `main`, chroma peaking mid-ramp and tapering
   at the extremes (no neon-light tint, no muddy-dark shade).
3. **Secondary/accent** — honors a chromatic secondary's hue re-toned to the brand budget; derives
   one (default analogous +30°; `complementary`/`triadic` available) when the secondary is neutral.
4. **Harmonized semantics** — for success/error/warning/info: hue starts at the band center, is
   nudged ≤8° toward the brand, then **hard-clamped inside its meaning band** (inviolable:
   success 140–155°, error 25–35°, warning 70–90°, info 230–260°). Chroma/tone follow the brand
   (muted brand → muted semantics). Each is emitted as a `main` + high-L low-C `tint` pair.
5. **Legibility pass — runs last, always wins** — for every fg/bg pair the UI renders
   (white-on-brand, brand-on-white, semantic-main-on-tint, dark-text-on-amber), WCAG contrast is
   enforced by moving **lightness only** (hue/chroma preserved); every shift is `console.warn`ed.
6. **Robustness gates** — pastel/yellow → darken the action so white text passes, keep tint hue;
   near-black → lighten tints; near-grey → `isNeutralBrand`, inject one tasteful blue accent, keep
   the rest monochrome; neon → clamp chroma on large surfaces.

`generateBrandPalette({primary, secondary, mode}) → ColorProps` is unchanged: it now calls
`generateHarmony` and maps the result onto the existing keys. True neutrals (grey/paper/dark
surfaces + text) and the decorative gold/orange accents stay verbatim from `LOCKED_TIER3_TOKENS`
(a pure-neutral fallback); only the brand ramps and success/error/warning are now brand-derived.

`isNeutralBrand` lives on the engine's own richer return type (`HarmonyResult`) — `ColorProps` is a
`{[k]: string}` map, so the palette function's return shape is untouched.

## Acceptance criteria — live output of the engine (all pairs pass WCAG AA)

| Brand            | neutral | chromaBudget    | primary AA (white) | success on tint | error on white | warn on grey700 | success/error/warn hue |
| ---------------- | ------- | --------------- | ------------------ | --------------- | -------------- | --------------- | ---------------------- |
| Pink `#F7A8C4`   | no      | 0.099           | 4.60               | 4.57            | 5.25           | 4.95            | 140 / 26 / 70          |
| Yellow `#FFD400` | no      | 0.160 (clamped) | 4.60               | 4.54            | 5.29           | 5.03            | 140 / 35 / 86          |
| Teal `#0D9488`   | no      | 0.104           | 4.59               | 4.58            | 5.27           | 4.76            | 154 / 35 / 86          |
| Grey `#3A3A3A`   | **yes** | 0.050           | 5.25               | 4.55            | 5.41           | 4.51            | 146 / 29 / 78          |
| Navy `#17255A`   | no      | 0.097           | 5.50               | 4.58            | 5.35           | 4.60            | 154 / 25 / 71          |
| Neon `#00FF66`   | no      | 0.160 (clamped) | 4.65               | 4.57            | 5.29           | 5.03            | 148 / 35 / 86          |

- **Pink** → legible deep-rose action color; `success` re-toned to a soft brand-matched green
  (H140, C≈0.10 — clearly not fire-engine green) that still reads unambiguously green next to the
  pink brand. A "Revenue ▲" green-on-green-tint chip beside pink buttons looks intentional.
- **Yellow** → tints keep the yellow hue; action darkened to `#8c7300` so white text passes.
- **Grey** → `isNeutralBrand: true`, monochrome primary + one injected blue accent, UI usable.
- **Neon** → chroma clamped (0.255 → 0.16); large surfaces not eye-searing.
- Semantic hues never leave their bands; deterministic (same input → identical output).

**Visual grid:** open [`docs/color-harmony-grid.html`](color-harmony-grid.html) — 6 brands ×
(brand buttons + all four semantic chips), each with its live WCAG ratio. Regenerated straight from
the engine output.

## Adversarial review

Ran a 7-dimension adversarial review (OKLCH math, contrast-always-wins, band inviolability,
determinism/purity, signature/caller preservation, robustness gates, test strength) with an
independent skeptic verifying each finding. 5 dimensions were clean; 3 findings confirmed:

1. **[fixed]** `warning.dark` was contrast-corrected against white, but its `contrastText` is
   grey-700 → it failed AA (~2.0) as a hover surface. Now the `dark` stop honors `legibleAgainst`:
   amber's hover shade is corrected against grey-700 (≥4.5 for every brand), staying a real hover
   shade where legibility allows.
2. **[fixed]** the neon chroma-clamp test was tautological / gamut-masked (asserted on a
   gamut-limited stop). Now asserts on `c200` (0.108 clamped vs 0.173 unclamped) and that
   `chromaBudget < input chroma`, so it fails if the clamp is removed.
3. **[documented — pre-existing, out of scope]** in dark mode, `palette.tsx` pairs the light-amber
   `warning` with a light `contrastText` (`darkTextPrimary`), which is unreadable. The locked
   default has the identical failure; the fix lives in the immutable `palette.tsx`, not the engine.

## Tests

`src/themes/harmony.test.ts` (new) + updated `brandPalette.test.ts`. Coverage: OKLCH conversion vs
reference values, gamut mapping, legibility (moves L only, always reaches target), semantic band
inviolability across a full hue sweep, determinism, WCAG AA for every fg/bg pair across all six
brands, ramp ordering, and each acceptance criterion. `brandPalette.test.ts`'s old "Tier-3 verbatim"
test was split: true neutrals + gold/orange stay locked; success/error/warning are now asserted
harmonized (in-band, legible, re-toned).

All theme tests green; `tsc --noEmit` and `eslint` clean on the changed files. App with no brand set
is byte-for-byte identical to today (the preset SCSS path is untouched).
