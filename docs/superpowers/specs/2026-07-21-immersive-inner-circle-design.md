# Immersive Brand-Derived Inner Circle UI (Part 3 of 4) — Design

**Date:** 2026-07-21
**Branch:** `innercirclecrmmerge` (no new branches)
**Status:** Approved by Nigel 2026-07-21 (flourishes: gradient band + logo watermark both IN)

Part 3 of the four-part mission (1: CRM merge — DONE; 2: header tab — DONE; 4: extraction/font fixes — pending).

## Goal

Entering Inner Circle transforms the page from the flat white operations UI into a rich, muted, colorful environment derived 100% from the company's brand theme. Visibility/contrast first; all color placement decided by the system (no user controls). Both light and dark modes. Everything outside the Inner Circle routes stays standard.

## Architecture (verified against source by 4-reader mapping workflow)

### 1. Pure token builder — `src/themes/immersiveTheme.ts`

`buildImmersiveSurfaces(brandTheme, mode)` and `buildImmersiveColors(brandTheme, mode)`:

- OKLCH primitives from **`themes/harmony.ts` only** (`hexToOklch`, `oklchToHex`, `generateHarmony`, `ensureLegible`, `contrastRatio`, `AA_NORMAL`) — never the near-duplicate exports in `brandPalette.ts` (different luminance threshold; do not mix).
- Surfaces keep the brand hue, crush chroma to ≤0.03: light `background` L≈0.97 / `paper` L≈0.985; dark `background` L≈0.18 / `paper` L≈0.22. Every surface passes `ensureLegible` against the real locked text tokens (`#374151` grey700 light; `#bdc8f0` darkTextPrimary dark) at `AA_NORMAL`.
- `buildImmersiveColors` clones `generateBrandPalette(...)` output (never modifies that function — frozen-token tests) and re-points the **ColorProps tokens** (`paper`, `grey50`; dark: `darkPaper`, `darkBackground`, `darkLevel1/2`) _before_ slot-mapping, because three consumers bypass `background.*`.
- Also emits: `headingInk` (brand primary `ensureLegible`'d vs the tinted background), `headerBand` gradient stops (primary-hue → secondary-hue at matched L/C), and `accent` (primary main).
- **Guards → return `null` (caller renders standard theme):** `brandTheme === null`; malformed hex (reachable via unvalidated localStorage cache — try/catch); `generateHarmony().isNeutralBrand` (near-white/grey brands); primary≈secondary handled by harmony's derived accent hue.
- Unit tests in `themes/harmony.test.ts` house style; contrast ratios computed, **logged, and asserted ≥ 4.5**.

### 2. Scoped provider — `src/views/inner-circle/ImmersiveThemeProvider.tsx`

- Full theme assembly (the exact `ThemeCustomization` recipe: `buildTheme` palette → `Typography` → `customShadows` → `createTheme` → `componentStyleOverrides` last), memoized on `[brandTheme, mode, …]`. Requires exporting the currently-private `buildTheme` from `palette.tsx` (one-line change). Palette-only nesting (the BrandPreview precedent) is explicitly NOT copied — it renders cards/buttons subtly off.
- Typography h1–h4 get `headingInk` (brand-primary, AA-checked) — page title + section headers.
- Scoped component overrides merged on top (system-decided accents, no per-component edits): `MuiTabs` indicator + `MuiTab` selected → accent (covers section tabs, sub-toggles, drawer tabs at once); `MuiTableCell-head` → `alpha(primary, .06)` tint (all seven tables); `MuiButton` containedPrimary → brand primary; tinted paper flows to `MuiPaper`/`MuiDrawer-paper`/`MainCard` via the palette tokens; filled-variant `MuiChip` → tier chips (they pass `variant='filled'` explicitly); focus rings + row hovers already key off `palette.primary` — free.
- Exposes `useImmersive(): { active, surfaces }` via context. Null build → passthrough (`<>{children}</>`, `active: false`).
- Entry fade: `<Fade in appear timeout={250}>` (0 when `prefers-reduced-motion: reduce` — first reduced-motion support in the repo).
- Mounted at **route level** in `MainRoutes.tsx` around both `/inner-circle` and `/inner-circle/surveys/drafts` elements — zero page-file churn for mounting. Portaled MUI Drawers keep the nested theme via React context (verified).

### 3. Canvas crossfade — call-site edit in `MainLayout/index.tsx`

The always-mounted `<main>` (`MainContentStyled`, which insets content by `contentPadding` and paints `background.paper` white in light mode) gets an inline `sx`: when `pathname.startsWith('/inner-circle')` and surfaces build non-null, `backgroundColor = surfaces.background` with `transition: background-color 250ms ease` (`none` under reduced motion). Because the element never unmounts this is a true crossfade on **both enter and leave**, full-bleed including under the footer — no negative margins, no radius replication, and the TS2339-afflicted `MainContentStyled.ts` is never edited.

### 4. Direct accent edits (short list, from the surface inventory)

- `InnerCirclePage`: hero — the title row gains a low-alpha `linear-gradient(headerBand[0] → headerBand[1])` band with the company logo watermark at ~3.5% opacity (only when `logoUrl` exists and immersive is active; never behind body text). Top-3 leaderboard row tints: hardcoded `rgba(...)` → `alpha(MEDAL.color, 0.06)`. Action Queue: the four group boxes gain brand-primary left borders (`borderLeft: 3px solid alpha(primary, .5)`) when immersive.
- `AllyviaStats.tsx:31`: hardcoded gold `#b7791f` → `theme.palette.warning.dark` (brand-harmonized).
- `MainCard.tsx:74`: dark hover shadow's legacy Berry blue `rgb(33 150 243 / 10%)` → `alpha(theme.palette.primary.main, 0.1)`.
- Alpha stacking on the leaderboard stays ≤12% (design-system ceiling).

### 5. Untouched

`generateBrandPalette` + its locked-token tests; `chartPalette.ts` (reads the active theme — charts inside the provider re-seed for free); all non-IC routes; backend.

## Verification

1. Unit tests: ratios logged + asserted ≥ AA_NORMAL both modes; hue preservation; chroma cap; null/malformed/neutral guards return null; determinism.
2. Static: no new typecheck errors over the 48-error baseline; build; full vitest; prettier/eslint on touched files.
3. Browser: with brand → visibly tinted (not white) IC background in light AND dark (live Settings toggle), all six tabs + drawer on tinted surfaces, hero band + watermark, crossfade both directions; with NO brand → IC renders the standard theme, no styling artifacts; outside IC unchanged.

## Out of scope

Extraction accuracy + font consistency (Part 4); user-facing placement controls (deliberately none); backend changes.
