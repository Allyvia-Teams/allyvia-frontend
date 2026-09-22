# Owner-Configurable Bespoke Branding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Owner picks a brand **template** (Bright/Soft/Bold) and which **zone** (Inner Circle or main app) wears it — the other auto-contrasts to clean neutral chrome — plus a color-count/role model; all persisted per company, AA-safe.

**Architecture:** Generalize `immersiveTheme.ts` into a template engine (`TEMPLATE_PRESETS` + `buildTemplateSurfaces/Colors` + `resolveZoneSurfaces`); inject at `palette.tsx` (main-app zone) and `ImmersiveThemeProvider` (IC zone), both gated on `brandedZone`; persist `template`/`brandedZone`/`accents` in `BrandTheme` → `CompanyTheme.overrides` (no backend change if overrides accepts arbitrary keys — probed in SP-1).

**Tech Stack:** React 19, MUI v7 + Emotion, existing OKLCH harmony engine, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-21-bespoke-branding-templates-design.md`

## Global Constraints

- Branch `innercirclecrmmerge` — verify `git branch --show-current` before EVERY commit.
- Node via nvm: `export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"` before any npm/vitest.
- Backend: no schema change UNLESS SP-1's probe shows `overrides` strips unknown keys (then a small additive DRF serializer change is allowed, scoped to CompanyTheme).
- TS strict, no `any`; `@typescript-eslint/no-shadow` is error-level (never shadow an outer `theme`). No Tailwind.
- Typecheck baseline = exactly **48** `error TS` lines (top offenders `compStyleOverride.tsx`/`palette.tsx`/`typography.tsx` pre-existing). Gate each task on **no NEW errors in touched files**, plus `npm run build`.
- Do NOT modify `generateBrandPalette` (frozen-token tests) or `MainContentStyled.ts` (pre-existing TS2339). Templates re-point `ColorProps` AFTER `generateBrandPalette`, never alter it.
- Consumers must default (`brandTheme.template ?? 'soft'`, `brandedZone ?? 'main-app'`) — the localStorage brand cache is unvalidated JSON.
- Working dir: `/Users/nigelfernando/Documents/Allyvia/allyvia-frontend`. Tests: `npx vitest run <path>`.

## Verified facts (line-checked 2026-07-21)

- `BrandTheme` (`types/config.ts:20-26`): `{ primary; secondary; headingFont; logoUrl?; customFontUrl? } | null`.
- `companyThemeToBrandTheme` (`utils/brandThemeCache.ts:11-20`) maps `CompanyThemeResponse` → `BrandTheme`; ignores `overrides` + `extracted_palette` today. `brandThemeCache.test.ts` uses exact `toEqual` on its output.
- `api/branding.ts`: `CompanyThemePayload.overrides?: Record<string,unknown>` (`:18`), `CompanyThemeResponse.overrides: Record<string,unknown>` (`:29`), `extracted_palette: string[]` (`:28`).
- `immersiveTheme.ts`: `SURFACE_CHROMA_MAX=0.05`; `buildImmersiveSurfaces(brand,mode)` with baked L (light bg 0.94/paper 0.965; dark 0.16/0.20; band light 0.90/dark 0.19); `buildImmersiveColors(brand,mode)` re-points light `{paper,grey50}`, dark `{darkPaper,darkBackground,darkLevel1,darkLevel2}`; `try/catch`+`isNeutralBrand`→null; `surface()` runs `ensureLegible`.
- `palette.tsx`: `Palette(mode,presetColor,brandTheme?)` `:26`; brand branch `:31-38` (`generateBrandPalette`→`buildTheme`); exported `buildTheme(mode,colors)` `:72`; `common.black = colors.darkPaper` `:77`.
- `themes/index.tsx`: `Palette(mode,presetColor,brandTheme)` in `useMemo(...,[mode,presetColor,brandTheme])` `:42`.
- `ImmersiveThemeProvider.tsx`: `useConfig()` `:38`; `buildImmersiveSurfaces` `:43`; `buildImmersiveColors` `:46`; null guard `:115`; memo deps to extend `:43,108`.
- `MainLayout/index.tsx`: `immersiveCanvas = pathname.startsWith('/inner-circle') ? buildImmersiveSurfaces(...)?.background : null` `:68-71`, applied `:120`.
- `Branding.tsx`: `handleApply` `:342`; `putCompanyTheme` sends only `extracted_palette` `:372`; `swatches` state `:223`; brandTheme-sync effect `:266-282`; `ColorField` (AA badge) `:76`; `BrandPreview` scoped ThemeProvider `:133-203`.
- Settings sections live in `ui-component/settings/` (only `index.tsx` is in `views/settings/`). `Brand.tsx` (display-only, no controls) + admin-only `Branding.tsx` both mount on the same tab (`index.tsx:87,90`). `team/InviteMemberDialog.tsx` is orphaned (never imported).

---

### Task 1 (SP-1a): BrandTheme fields + hydration + cache test

**Files:** `types/config.ts`, `utils/brandThemeCache.ts`, `utils/brandThemeCache.test.ts`

**Interfaces produced:** `BrandTheme` gains `template?: 'bright'|'soft'|'bold'`, `brandedZone?: 'inner-circle'|'main-app'`, `accents?: string[]`; `companyThemeToBrandTheme` populates them.

- [ ] **Step 1: Update the cache test (TDD) to expect the new fields.** In `brandThemeCache.test.ts`, extend the `toEqual` expectations so a response with `overrides:{template:'bold',brandedZone:'inner-circle',accents:['#111111']}` maps to a `BrandTheme` including those; and a response with `overrides:{}` + `extracted_palette:['#abcabc']` maps to `template:'soft', brandedZone:'main-app', accents:['#abcabc']`. Run `npx vitest run src/utils/brandThemeCache.test.ts` → FAIL.

- [ ] **Step 2: Add the fields to `BrandTheme`** (`types/config.ts:20-26`), all optional:

```ts
export type BrandTheme = {
  primary: string;
  secondary: string;
  headingFont: string;
  logoUrl?: string | null;
  customFontUrl?: string | null;
  template?: 'bright' | 'soft' | 'bold';
  brandedZone?: 'inner-circle' | 'main-app';
  accents?: string[];
} | null;
```

- [ ] **Step 3: Hydrate in `companyThemeToBrandTheme`** (`brandThemeCache.ts`). Read `resp.overrides` + `resp.extracted_palette` with safe defaults:

```ts
const ov = (resp.overrides ?? {}) as Record<string, unknown>;
const template = ov.template === 'bright' || ov.template === 'bold' ? ov.template : 'soft';
const brandedZone = ov.brandedZone === 'inner-circle' ? 'inner-circle' : 'main-app';
const accents = Array.isArray(ov.accents) ? (ov.accents as string[]) : (resp.extracted_palette ?? []);
// include template, brandedZone, accents in the returned BrandTheme object
```

- [ ] **Step 4:** `npx vitest run src/utils/brandThemeCache.test.ts` → PASS. `npm run typecheck` → no new errors in the 3 files. `npx vitest run` full → green.

- [ ] **Step 5: Commit** `git commit -m "feat(branding): persist template/brandedZone/accents in BrandTheme via CompanyTheme.overrides"`

---

### Task 2 (SP-1b): Persist on save + probe the backend

**Files:** `ui-component/settings/Branding.tsx` (+ backend `company/serializers.py` ONLY if the probe fails)

- [ ] **Step 1: Write `overrides` on save.** In `Branding.tsx handleApply`, add the three fields to `nextTheme` (defaulting `template ?? 'soft'`, `brandedZone ?? 'main-app'`, `accents: swatches.length ? swatches : (brandTheme?.accents ?? [])`) and pass `overrides: { template, brandedZone, accents }` to `putCompanyTheme(...)` alongside the existing `extracted_palette`. Hydrate `swatches`/template/zone form state from `brandTheme` in the sync effect (`:266-282`) so a reload shows saved values.

- [ ] **Step 2: Probe the round-trip.** Run the app (dev servers up), in Settings→Branding save a theme, then in the browser console (or a quick script) GET `/api/v1/company/theme/` and confirm the response `overrides` contains `template`/`brandedZone`/`accents`. OR inspect `backend/app/company/serializers.py` for the CompanyTheme serializer: confirm `overrides` is a plain `JSONField`/`serializers.JSONField` with no key allowlist.

  - **If overrides round-trips:** no backend change. Note it in the report.
  - **If stripped:** add the fields to the serializer (additive, no migration if `overrides` column already exists) and re-probe. Keep the change minimal and scoped to CompanyTheme.

- [ ] **Step 3: Verify** typecheck (no new errors in Branding.tsx), build, full vitest.

- [ ] **Step 4: Commit** `git commit -m "feat(branding): save template/zone/accents to CompanyTheme.overrides (+ probe persistence)"`

---

### Task 3 (SP-2): Template engine (TDD)

**Files:** `themes/immersiveTheme.ts`, `themes/immersiveTheme.test.ts`

**Interfaces produced:** `type TemplateName='bright'|'soft'|'bold'`; `TEMPLATE_PRESETS`; `buildTemplateSurfaces(brand,mode,template='soft'): ImmersiveSurfaces|null`; `buildTemplateColors(brand,mode,template='soft'): ColorProps|null`; `resolveZoneSurfaces(brand,mode,{self,brandedZone,template}): ColorProps|null`. `buildImmersiveSurfaces/Colors` remain as `template='soft'` wrappers.

- [ ] **Step 1: Extend tests (TDD).** In `immersiveTheme.test.ts` add: for each `template ∈ {bright,soft,bold}` × `mode ∈ {light,dark}`, `buildTemplateSurfaces(BRAND,mode,template)` is non-null, every surface clears AA vs the locked text token (assert + `console.log` the ratio), hue preserved, chroma ≤ that template's `chromaMax + 1e-6`. Assert **template separation**: light `bold.background` L < `soft.background` L < `bright.background` L (so AA correction doesn't collapse them). Add `resolveZoneSurfaces`: `self===brandedZone` deep-equals `buildTemplateColors(...)`; else deep-equals the neutral fallback (a `generateBrandPalette` base with standard surface tokens, i.e. no template re-point); null brand → null. Run → FAIL (new exports).

- [ ] **Step 2: Implement.** Replace the baked constants with `TEMPLATE_PRESETS` (values from the design's §A table), thread `template` through `buildTemplateSurfaces`/`buildTemplateColors` (using `preset.bgL[mode]`, `preset.paperL[mode]`, `preset.bandL[mode]`, `preset.chromaMax`), and add `resolveZoneSurfaces`:

```ts
export function resolveZoneSurfaces(
  brandTheme: BrandTheme,
  mode: 'light' | 'dark',
  args: { self: 'main-app' | 'inner-circle'; brandedZone: 'main-app' | 'inner-circle'; template: TemplateName }
): ColorProps | null {
  if (!brandTheme) return null;
  if (args.self === args.brandedZone) {
    return buildTemplateColors(brandTheme, mode, args.template);
  }
  // Non-branded zone: clean neutral standard chrome (no template re-point) so the branded zone pops.
  // Return null-safe: generateBrandPalette base with its own standard surfaces (accents still brand).
  try {
    return generateBrandPalette({ primary: brandTheme.primary, secondary: brandTheme.secondary, mode });
  } catch {
    return null;
  }
}
```

Keep `buildImmersiveSurfaces = (b,m) => buildTemplateSurfaces(b,m,'soft')` and same for Colors. Preserve `isNeutralBrand`/`try/catch` null-returns.

- [ ] **Step 3:** tests PASS (ratios logged, separation asserted); `npx vitest run src/themes/` green; typecheck no new errors.

- [ ] **Step 4: Commit** `git commit -m "feat(theme): template engine — bright/soft/bold presets + resolveZoneSurfaces"`

---

### Task 4 (SP-3a): Apply to the main-app zone

**Files:** `themes/palette.tsx`, `themes/index.tsx`

- [ ] **Step 1:** In `palette.tsx` `Palette()` brand branch (`:31-38`), after `generateBrandPalette`, resolve zone surfaces:

```ts
if (brandTheme) {
  const schemeMode = mode === ThemeMode.DARK ? 'dark' : 'light';
  const zoneColors = resolveZoneSurfaces(brandTheme, schemeMode, {
    self: 'main-app',
    brandedZone: brandTheme.brandedZone ?? 'main-app',
    template: brandTheme.template ?? 'soft'
  });
  return buildTheme(
    mode,
    zoneColors ?? generateBrandPalette({ primary: brandTheme.primary, secondary: brandTheme.secondary, mode: schemeMode })
  );
}
```

Import `resolveZoneSurfaces` from `./immersiveTheme`. No signature change (fields ride inside `brandTheme`). `themes/index.tsx` needs no dep change (`brandTheme` already a memo dep).

- [ ] **Step 2: Verify** typecheck (no new errors in palette.tsx/index.tsx — mind the pre-existing palette.tsx:139), build, full vitest. Browser: with `brandedZone:'main-app'` + `template:'bold'`, the WHOLE app canvas + cards tint; with `brandedZone:'inner-circle'`, the main app is neutral.

- [ ] **Step 3: Commit** `git commit -m "feat(theme): main-app zone wears the brand template when selected"`

---

### Task 5 (SP-3b): Apply to the Inner-Circle zone + crossfade

**Files:** `views/inner-circle/ImmersiveThemeProvider.tsx`, `layout/MainLayout/index.tsx`

- [ ] **Step 1: ImmersiveThemeProvider** — replace `buildImmersiveSurfaces/Colors(brandTheme, schemeMode)` with `buildTemplateSurfaces/Colors(brandTheme, schemeMode, brandTheme?.template ?? 'soft')`; add `brandTheme?.template` to both `useMemo` dep arrays (`:43,108`); at the null guard, additionally gate: if `(brandTheme?.brandedZone ?? 'main-app') !== 'inner-circle'`, resolve the neutral contrast via `resolveZoneSurfaces({self:'inner-circle', brandedZone, template})` and build the theme from that instead of passthrough (so IC visibly contrasts when the main app is branded). If that resolves null, passthrough `<>{children}</>`.

- [ ] **Step 2: MainLayout crossfade** — update `immersiveCanvas` (`:68-71`): when `pathname.startsWith('/inner-circle')`, paint `resolveZoneSurfaces({self:'inner-circle',...})`-derived background; else paint the main-app resolved background (so a bold main-app zone crossfades correctly on non-IC routes too). Keep the 250ms transition + reduced-motion override. Use the outer `theme`/config values (no `no-shadow`).

- [ ] **Step 3: Verify** typecheck/build/vitest; browser QA matrix (3 templates × light/dark × brandedZone∈{inner-circle,main-app}): branded zone shows the template, other zone neutral, crossfade both directions, AA legible.

- [ ] **Step 4: Commit** `git commit -m "feat(inner-circle): IC zone honors template + brandedZone; crossfade paints resolved zone"`

---

### Task 6 (SP-4): Extraction color model in Branding

**Files:** `ui-component/settings/Branding.tsx`

- [ ] **Step 1:** In the color section, add a **count `ToggleButtonGroup`** (values 2,3,4,5,6; default 4) — reuse the segmented pattern from `UIPreferences.tsx`. Render the full `swatches` palette; grey out swatches beyond the selected count. Each visible swatch is tap-to-assign: clicking cycles/sets it as Primary or Secondary (keep the existing `changePrimary`/`changeSecondary`), and swatches not primary/secondary within the count become `accents`. Keep the existing `ColorField` (manual hex + AA badge) for Primary/Secondary. Persist `accents` = the in-count non-primary/secondary swatches into the save (Task 2's `overrides.accents`).

- [ ] **Step 2: Verify** typecheck/build; browser: upload/extract a logo (or use stored swatches), change count, assign roles, Apply → reload shows persistence.

- [ ] **Step 3: Commit** `git commit -m "feat(branding): color-count selector + tap-to-assign roles + accents"`

---

### Task 7 (SP-5a): Template picker + zone selector + live preview

**Files:** `ui-component/settings/Branding.tsx` (+ a small `TemplatePreview` helper if it keeps Branding.tsx focused)

- [ ] **Step 1:** Add a **template picker**: three selectable cards (Bright/Soft/Bold), each a mini live preview built with a scoped `<ThemeProvider>` over `buildTemplateColors(brandTheme, mode, template)` (reuse the `BrandPreview` pattern at `Branding.tsx:133-203`) showing a mini card + button + heading so the owner sees the actual look in their colors. Selecting sets `template` state.
- [ ] **Step 2:** Add a **zone selector** (`ToggleButtonGroup`: "Inner Circle" | "Whole app") setting `brandedZone` state, with a one-line explainer that the other zone stays clean/neutral.
- [ ] **Step 3:** Wire both into `handleApply` (already persists `overrides` from Task 2). Keep everything AA-safe (the engine guarantees it).
- [ ] **Step 4: Verify** typecheck/build; browser: pick each template + zone, Apply, confirm the live app reflects it and it persists across reload.
- [ ] **Step 5: Commit** `git commit -m "feat(branding): template picker + zone selector with live preview"`

---

### Task 8 (SP-5b): Reconcile the duplicate Brand card

**Files:** `views/settings/index.tsx`, `ui-component/settings/Brand.tsx` (delete or convert)

- [ ] **Step 1:** Remove the display-only `Brand.tsx` card from the settings tab (it promises branding it doesn't deliver and duplicates the real editor). Either delete `Brand.tsx` and its mount (`index.tsx:87`), or convert it to a thin read-only summary that reads the REAL `brandTheme` (logo/colors/template/zone) for non-admins while the admin editor remains `Branding.tsx`. Prefer delete unless a non-admin read-only view is wanted — confirm in the report which was done.
- [ ] **Step 2: Verify** `grep -rn "Brand'\\|/Brand\"\\|Brand.tsx\\|<Brand" src/views/settings` shows no dangling import; typecheck/build; browser: the branding tab shows exactly one brand surface.
- [ ] **Step 3: Commit** `git commit -m "fix(settings): remove duplicate display-only Brand card; single branding surface"`

---

### Task 9 (SP-6): Settings audit fixes

**Files:** delete `ui-component/settings/team/InviteMemberDialog.tsx`; optional `ui-component/settings/Integrations.tsx`

- [ ] **Step 1:** `git rm` the orphaned `team/InviteMemberDialog.tsx` (never imported; no backing API). Verify with `grep -rn "InviteMemberDialog" src` → zero matches.
- [ ] **Step 2 (optional):** In `Integrations.tsx`, make the disabled Clover "coming soon" affordance read less like a broken button (e.g., the chip is enough; ensure the button clearly looks disabled). No behavior change.
- [ ] **Step 3: Verify** typecheck/build/full vitest.
- [ ] **Step 4: Commit** `git commit -m "chore(settings): remove orphaned invite dialog; clarify disabled integration affordance"`

---

### Task 10: Full verification pass

- [ ] **Step 1: Static** — `npm run typecheck` (48 baseline, none in touched files), `npm run build`, `npx vitest run` (all green incl. new template/cache tests), `npx prettier --check` + `npx eslint` on every touched file (fix; watch no-shadow).
- [ ] **Step 2: Browser QA** — for a configured brand: cycle all 3 templates × both zones × light/dark; confirm branded zone tints (whole app or IC), other zone neutral, crossfade smooth, AA legible everywhere; header tab present; extraction count/role assignment persists; Settings shows one brand surface; no dead invite dialog. No-brand company → standard theme, no artifacts. Analytics dashboard charts still legible on any tinted canvas.
- [ ] **Step 3: Commit** any fixes.

## Self-review notes

- Spec coverage: config+persist (T1,T2), engine (T3), zones+contrast+crossfade (T4,T5), color model (T6), picker+zone UI (T7), Brand reconcile (T8), audit fixes (T9), verify (T10). Auto-contrast = neutral chrome (locked). Probe in T2 (locked). All 6 SPs covered.
- Type consistency: `TemplateName`/`brandedZone` defined once (immersiveTheme.ts / types/config.ts) and imported; `resolveZoneSurfaces` is the single branded-vs-contrast decision point used by both zones.
- Known deviations to flag in review: bright preset `paperL.light=1.0` (pure white) intended; `buildImmersive*` kept as soft wrappers to avoid caller churn.
