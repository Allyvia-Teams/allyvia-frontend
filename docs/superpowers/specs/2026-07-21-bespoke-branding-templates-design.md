# Owner-Configurable Bespoke Branding — Design

**Date:** 2026-07-21
**Branch:** `innercirclecrmmerge` (no new branches)
**Status:** Draft for Nigel's review

Follow-up mini-mission after the 4-part Inner Circle work, driven by Nigel's feedback that the immersive theme was too faint, not truly bespoke, and lacked owner control. Quick wins (bigger header tab + bolder tint) already shipped (`66aeb6c`). This designs the full system.

## Goal

Make brand theming truly bespoke and **owner-configurable**: the owner picks a **template** (a whole-page look derived from their brand colors), chooses **which zone** wears it (Inner Circle _or_ the main app) with the other zone auto-contrasting, and controls **how many colors** are pulled and what role each plays — all persisted per company, all AA-safe, with a few curated choices (not freeform control).

## Decisions locked with Nigel

- **3 templates**, all owner-selectable with live preview: **Bright** (white/airy, brand as accents), **Soft Tint** (muted brand-tinted surfaces ≈ today, richer), **Bold Immersive** (deep brand-colored background + contrasting light text).
- **Zone model:** owner picks ONE branded zone (`inner-circle` | `main-app`, mutually exclusive); the other zone auto-derives a clean contrasting treatment. Per company; always the owner's choice.
- **Color model:** count selector (2–6) + tap-to-assign Primary/Secondary + extra colors → accents; manual hex entry retained; every assignment AA-checked.
- **Persistence:** per company in the existing `CompanyTheme.overrides` free-JSON field — **no backend schema change** (pending one probe verification, below).
- **Settings:** audit found the surface is **almost entirely wired**; the real fixes are narrow (below), not a broad re-wire.

## Verified architecture (line-checked 2026-07-21)

Two nested MUI theme zones already exist:

- **Main-app zone** — global `ThemeCustomization` (`src/themes/index.tsx`), wraps the whole app.
- **Inner-Circle zone** — route-scoped `ImmersiveThemeProvider` (`src/views/inner-circle/ImmersiveThemeProvider.tsx`), mounted on `/inner-circle` + `/inner-circle/surveys/drafts`.

Both build `palette` via shared `buildTheme(mode, colors)` (`palette.tsx:72`) from a `ColorProps`. **Surface color rides on raw `ColorProps` keys (`paper`/`grey50`/`dark*`), not `palette.background.*`** — the canvas (`MainContentStyled.ts:20`) and cards (`compStyleOverride.tsx`) read those keys. So a template must re-point `ColorProps` **before** `buildTheme`, exactly as today's `buildImmersiveColors` does.

### A. Template engine (`src/themes/immersiveTheme.ts` → generalized)

Turn today's baked constants into a preset map and thread a `template` arg:

```ts
type TemplateName = 'bright' | 'soft' | 'bold';
const TEMPLATE_PRESETS: Record<TemplateName, { bgL: { light; dark }; paperL: { light; dark }; bandL: { light; dark }; chromaMax: number }> =
  {
    soft: { bgL: { light: 0.94, dark: 0.16 }, paperL: { light: 0.965, dark: 0.2 }, bandL: { light: 0.9, dark: 0.19 }, chromaMax: 0.05 }, // = today
    bright: { bgL: { light: 0.985, dark: 0.2 }, paperL: { light: 1.0, dark: 0.24 }, bandL: { light: 0.96, dark: 0.23 }, chromaMax: 0.03 },
    bold: { bgL: { light: 0.9, dark: 0.12 }, paperL: { light: 0.94, dark: 0.16 }, bandL: { light: 0.84, dark: 0.15 }, chromaMax: 0.09 }
  };
export function buildTemplateSurfaces(brand, mode, template = 'soft'): ImmersiveSurfaces | null;
export function buildTemplateColors(brand, mode, template = 'soft'): ColorProps | null;
export function resolveZoneSurfaces(brand, mode, { self, brandedZone, template }): ColorProps | null;
```

- Return shapes unchanged; keep the `try/catch` + `isNeutralBrand` null-fallback so malformed/neutral brands drop to the standard theme (critical now that this can theme the _whole app_).
- `ensureLegible` still runs per surface → the preset lightness values are **targets**; AA is enforced after. (See Risk 1 — presets must be spaced enough that AA correction doesn't collapse them.)
- Keep `buildImmersiveSurfaces`/`buildImmersiveColors` as thin `template='soft'` wrappers to avoid caller churn, or migrate callers.
- **Template governs surface tint only.** Brand accent ramps (`primary`/`secondary` from `generateBrandPalette`) keep applying app-wide in both zones (buttons, links, charts) so the two zones read as one brand.

### B. Zone application + auto-contrast (one decision point)

`resolveZoneSurfaces(brand, mode, {self, brandedZone, template})`:

- `self === brandedZone` → `buildTemplateColors(brand, mode, template)`.
- else → the **auto-contrast** surface. **Recommended rule: the non-branded zone uses the neutral standard chrome** (`LOCKED_TIER3_TOKENS`, `brandPalette.ts:236`) so the branded zone visibly pops.
- neutral/malformed brand → `null` (standard theme).

Wire it in two places, both gated on `brandedZone`:

- **Main-app:** `Palette()` `if (brandTheme)` branch (`palette.tsx:31–38`) calls `resolveZoneSurfaces({self:'main-app', …})`. `template`/`brandedZone` ride inside the existing `brandTheme` arg — no signature change; `themes/index.tsx` memo already deps on `brandTheme`.
- **Inner-Circle:** `ImmersiveThemeProvider` calls `resolveZoneSurfaces({self:'inner-circle', …})`, adds `template` to its memo deps, and gates immersion on `brandedZone`.
- **Crossfade:** `MainLayout/index.tsx` `immersiveCanvas` (currently hardcoded to `/inner-circle`) paints the resolved zone background; express the IC route boundary once.

### C. Config & persistence (no backend change — pending probe)

`CompanyTheme.overrides` (free JSON) + `extracted_palette` already round-trip on the wire. Three edit clusters close the UI gaps:

1. **Type** — add to `BrandTheme` (`types/config.ts`), **nested** (not top-level, or the ConfigContext default-reset clobbers them): `template?`, `brandedZone?`, `accents?: string[]` (all optional → old caches stay valid).
2. **Write** — `Branding.tsx handleApply` sends `overrides:{template,brandedZone,accents}` in `putCompanyTheme` and into the cached `nextTheme`.
3. **Hydrate** — `companyThemeToBrandTheme` (`brandThemeCache.ts`) reads `overrides` + `extracted_palette` with safe defaults (`'soft'`/`'main-app'`/`[]`). Consumers also default (`brandTheme.template ?? 'soft'`) since the cache is unvalidated JSON.

Everything else (ConfigContext preservation, localStorage, cache read/write) round-trips the whole `BrandTheme` for free.
**Must verify before relying on "no backend change":** save-then-GET a probe `overrides` key to confirm the backend doesn't strip unknown keys via a server-side allowlist. If it does, add the fields to the serializer (small backend change) — the only thing that could break the no-backend claim.

### D. Extraction color model

Build on the Part-4 `extractBrandColors` (returns `swatches`) + existing `ColorField` (live AA badge). Add: a **2–6 count selector** (reuse the `ToggleButtonGroup` segmented pattern from `UIPreferences`), the full detected palette with extras beyond the count greyed, **tap-to-assign** Primary/Secondary (+ accents), manual hex retained. Persist chosen `accents` to `brandTheme.accents`.

### E. Branding settings rebuild + Settings audit (narrowed)

The audit's honest headline: **the live Settings surface is almost entirely wired.** The "buttons that do nothing" perception traces to:

- **`Brand.tsx`** — a display-only card that _promises_ per-company branding ("your logo and colors… sampled from it") but renders the static Allyvia logo + global colors and has **zero controls**; it's shown to all users while the real editor `Branding.tsx` is admin-only → two competing brand cards on one tab. **Reconcile:** remove `Brand.tsx` (or make it a read-only summary of the real config); route branding to the rebuilt `Branding.tsx`.
- **`team/InviteMemberDialog.tsx`** — orphaned (never rendered; no backing API). **Delete** as dead code.
- **Integrations** Clover (disabled "coming soon") + Branding `BrandPreview` buttons (decorative) read as broken but are intentional — leave, optionally clarify the disabled affordance.

Everything else (Account, Notifications, UI Preferences, Security, Business Info, Team, Billing, Audit) is fully wired — no fixes.

The Branding rebuild adds: **template picker** (3 cards + live preview reusing the scoped `BrandPreview` ThemeProvider pattern), **zone selector** (Inner Circle | main app), and the **color model** (D), all saving into `overrides`.

## Build decomposition (ordered sub-projects)

- **SP-1 Config foundation** — `BrandTheme` fields + `companyThemeToBrandTheme` hydration + `Branding.tsx` write + cache-test update + **probe verification**. Delivers persistence round-trip; today's look unchanged (defaults reproduce it).
- **SP-2 Template engine** — generalize `immersiveTheme.ts` (`TEMPLATE_PRESETS`, `buildTemplateSurfaces/Colors`, `resolveZoneSurfaces`); tests for 3 templates × 2 modes (AA ratios asserted).
- **SP-3 Apply to zones** — wire `Palette()` + `ImmersiveThemeProvider` + `MainLayout` crossfade to `resolveZoneSurfaces`; QA matrix 3×2×2×(branded/neutral).
- **SP-4 Extraction UX** — count selector + tap-assign + accents.
- **SP-5 Branding rebuild** — template picker + zone selector + live preview; reconcile `Brand.tsx`.
- **SP-6 Settings audit fixes** — delete orphan dialog; resolve Brand/Branding duplication; optional Integrations affordance polish.

## Risks

1. **AA vs. template spacing (esp. Bold app-wide).** `ensureLegible` auto-lightens too-dark backgrounds, so Bold may be pulled toward legibility and the 3 templates could converge — presets must be spaced; tests assert both AA _and_ visible separation. Bold's `chromaMax≈0.09` must not collide with neutral `divider`/border tokens; verify in both zones.
2. **`common.black = darkPaper`** (`palette.tsx:77`) — re-pointing dark surfaces tints anything reading `common.black`; grep before shipping Bold dark.
3. **48-error typecheck baseline** — gate each SP on "no NEW errors in touched files" (top offenders `compStyleOverride.tsx`/`palette.tsx` are pre-existing).
4. **Do-not-break** `generateBrandPalette` (templates re-point _after_ it) + analytics `chartSeriesPalette` (confirm series contrast on tinted canvas).
5. **Whole-app theming** — Bold on `main-app` tints _every_ page (dashboard/finance/pos/inventory/kiosk/auth), far more QA surface than IC-only.
6. **Test/memo hazards** — `brandThemeCache.test.ts` uses exact `toEqual`; update with the mapper. Defaults required everywhere (unvalidated cache).

## Out of scope

Full freeform color-placement control; a "both zones branded" option (mutually exclusive by design); backend schema changes (unless the probe shows `overrides` is allowlisted).
