# Template Gallery (6 looks) + Zone Toggle — Design

**Date:** 2026-07-21 · **Branch:** `innercirclecrmmerge` · Expands the chrome-only model into a 6-look gallery + restores the zone toggle. User approved all 6 mocks.

## Goal

Owner picks one of **6 cohesive templates** (how the whole UI looks) and a **zone** (Inner Circle only, or whole app). Every template keeps content legible — status chips (green Active / orange Inactive) always readable.

## The 6 templates (each = treatments across 3 layers + always-brand accents)

Layers: **chrome** (sidebar + top bar), **canvas** (content page background), **card** (widget/card surfaces). Treatments: `neutral` (standard light/white), `tinted` (light brand wash, dark text), `dark` (dark brand surface, near-white text), `accented` (white card + brand header/left-border/icon).

| Template      | chrome  | canvas  | card     | rendered look                                      |
| ------------- | ------- | ------- | -------- | -------------------------------------------------- |
| **clean**     | neutral | neutral | neutral  | white chrome + white content + brand accents       |
| **tinted**    | neutral | tinted  | tinted   | white chrome + soft brand-washed content           |
| **sidebar**   | dark    | neutral | neutral  | dark brand chrome + white content                  |
| **widgets**   | neutral | neutral | accented | white content + brand left-stripe & title on cards |
| **immersive** | tinted  | tinted  | tinted   | tinted chrome + brand-washed content               |
| **bold**      | dark    | dark    | dark     | dark brand surfaces everywhere + near-white text   |

**Light-mode single-surface reality (important):** `MainContentStyled` paints the content canvas from `background.paper` (light) / `dark[800]` (dark), and cards also read `background.paper`; in light mode `buildTheme` maps `background.paper` from `colors.paper`, and `grey50` is not read by the canvas. So a light-mode content tint MUST land in `paper` to render, and canvas-vs-card cannot be split into different colors in light mode. Consequence: `tinted` and `immersive` both wash the whole content area; they are differentiated by CHROME (tinted = neutral/white chrome, immersive = tinted chrome). The `widgets` accent is a `::before` left-stripe (not `borderLeft`) so it survives `MainCard`'s instance `sx: { border: 'none' }`.

Accents (brand primary/secondary) apply in every template regardless: active nav, buttons, links, headings, chart series. Status colors (success/warning) are FIXED bright tokens — never overridden — so they stay legible on any surface (esp. `bold` dark).

## Zone toggle (restored)

`brandedZone: 'inner-circle' | 'main-app'`.

- **main-app (whole app):** the template applies to every route — chrome themed globally; global content theme = the template's canvas/card treatment.
- **inner-circle:** the template applies ONLY on `/inner-circle*` routes — chrome themed while on IC routes (neutral elsewhere), IC content themed via `ImmersiveThemeProvider`; the rest of the app is standard/neutral.

## Architecture (reuse + extend the engine)

Two **independent** themed layers, both applied in `MainLayout` via nested `<ThemeProvider>` and route-gated by zone. The global theme (`palette.tsx`/ThemeCustomization) stays neutral-light everywhere — no change there — so anything not wrapped is always legible.

`src/themes/immersiveTheme.ts` (rewrite the template layer; keep `buildTemplateSurfaces`'s OKLCH/`ensureLegible` surface machinery + `generateBrandPalette` untouched):

- `type TemplateName = 'clean'|'tinted'|'sidebar'|'widgets'|'immersive'|'bold'`.
- `type Treatment = 'neutral'|'tinted'|'dark'|'accented'` (`accented` valid only on `card`).
- `TEMPLATE_SPECS: Record<TemplateName, { chrome: Treatment; canvas: Treatment; card: Treatment }>` (the table above).
- `buildTreatmentColors(brand, treatment, appMode) → {colors, mode} | null`: one uniform treatment →
  - `neutral` → `generateBrandPalette(appMode)` unchanged (mode = appMode).
  - `tinted` → light-polarity tinted surfaces (bgL≈0.94 canvas, paperL≈0.965 card, chromaMax≈0.05) re-pointed onto `generateBrandPalette(light)`; mode `light`. (≈ old soft-light.)
  - `dark` → dark-polarity brand surfaces (bgL≈0.2/paperL≈0.26, chromaMax≈0.12) + near-white text; mode `dark`. (≈ old bold-dark.)
  - `accented` → treated as `neutral` for surfaces (flag handled separately).
- `resolveChromeTheme(brand, appMode, template) → {colors, mode} | null` = `buildTreatmentColors(brand, TEMPLATE_SPECS[t].chrome, appMode)`.
- `resolveContentTheme(brand, appMode, template) → {colors, mode, cardAccented} | null`: build canvas surfaces from `.canvas` treatment, then re-point ONLY the card/paper tokens from the `.card` treatment (so `tinted` canvas + `neutral` card = tinted page + white cards). `cardAccented = TEMPLATE_SPECS[t].card === 'accented'`. Returns null when content is fully neutral (clean/sidebar/widgets have neutral canvas) UNLESS `cardAccented` (widgets needs the override carried). mode = dark iff canvas is `dark`.
- `cardOverrides(brandPrimary)` → a `components` fragment (brand left-border + brand-tinted title on `MuiCard`/`MainCard`/`MuiPaper` cards) merged into the content theme when `cardAccented`.
- Null-safe throughout (null/malformed/neutral brand → null → un-themed passthrough). Keep the old `bright|soft|bold` names OUT — migrate call sites; hydration maps any legacy value → nearest new name.

Consumers — all in `src/layout/MainLayout/index.tsx`:

- `applies = zone === 'main-app' || (zone === 'inner-circle' && pathname.startsWith('/inner-circle'))`.
- **Chrome** (AppBar + Sidebar): wrap in `resolveChromeTheme` theme when `applies`; else neutral (today's behavior). (Unchanged mechanism; just the new resolver + route gate.)
- **Content** (`MainContentStyled` + `Outlet`): when `applies` and `resolveContentTheme` non-null, wrap in a content `<ThemeProvider>` built with the SAME 4-step assembly, merging `cardOverrides` when `cardAccented`. Else render unwrapped (global neutral theme) exactly as today. This is what paints tinted/dark canvas + cards for `tinted`/`immersive`/`bold` and the accented cards for `widgets`, WITHOUT touching the global theme.
- `ImmersiveThemeProvider` stays passthrough (MainLayout's route gate now covers the IC zone) — do not re-add its Provider.
- **Status colors**: never override `success`/`warning`; on `bold` (dark content) verify green Active / orange Inactive chips stay legible and, if MUI's dark filled variant dims them, pin the chip tokens bright.

## Branding settings

- **Template picker → 6 cards** (Clean/Tinted/Sidebar/Widgets/Immersive/Bold), each a `DashboardMiniPreview` rendering that template's chrome+canvas+card+status-chip look (matching the approved mocks). Cards visibly differ.
- **Restore the zone `ToggleButtonGroup`** ("Inner Circle" | "Whole app").
- Persist `template` (6 values) + `brandedZone` in `overrides` (reuse T1/T2 plumbing; `brandedZone` already optional in `BrandTheme`).

## Guards / verify

AA on every template's text/surface pair (tests, both content + chrome, dark templates vs near-white). Status success/warning tokens never overridden — verify green/orange chips legible on `bold`. generateBrandPalette + frozen tokens untouched; MainContentStyled untouched; 48 typecheck baseline; analytics charts legible on tinted/dark canvas. Browser QA: each of 6 templates × (IC zone, whole-app zone); Vendors status legible in all; cards differ in picker.

## Out of scope

Per-widget color pickers (freeform); more than these 6; backend changes.
