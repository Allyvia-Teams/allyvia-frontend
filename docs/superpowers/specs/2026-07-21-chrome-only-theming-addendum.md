# Chrome-Only Theming + Real Preview — Design Addendum

**Date:** 2026-07-21 · **Branch:** `innercirclecrmmerge` · Supersedes the "whole-zone tint" application of the bespoke-branding + luminance-polarity work.

## Problem (user-reported, with Vendors screenshot)
Applying a dark template to the **whole page** tinted the content (tables/charts/status), making data illegible — the green "Active" / orange "Inactive" badges disappear on a dark canvas. Also: the Settings "Live preview" is a **generic mock** (fake "1,284 Active customers"), not the real dashboard; and the 3 template cards **don't visibly differ** (they build with the app's current mode, not each template's effective mode).

## Decisions (user)
1. **Dark = chrome only:** the dark brand color goes on the **collapsible sidebar + top header bar** only. ALL content (cards, tables, charts, status chips) stays on a clean white/light surface — always legible.
2. **Drop the zone toggle:** the template themes the chrome **app-wide**; there is no "brand Inner Circle vs main app" choice. Inner Circle keeps its crown header-tab + brand accents, but its content is legible like every other page.
3. Live preview + template cards must render a **realistic mini-dashboard** (real layout: dark/tinted sidebar + header + WHITE content with a stat tile, a green "Active" status chip, and a mini chart/table) so they accurately show the result and visibly differ per template. Apply must work.

## New model
- **Content theme (global):** the standard **light** brand palette — brand *accents* (primary/secondary on buttons, links, active nav, headings, chart series) on light surfaces. Never dark. Status colors always legible. → `palette.tsx Palette()` reverts its brand branch to `buildTheme(mode, generateBrandPalette(...))` (drop the `resolveZoneTheme` global-dark injection).
- **Chrome theme (scoped):** the **Sidebar + AppBar/Header** are wrapped in a nested `<ThemeProvider>` whose theme is the **template**: Bright → clean near-white chrome; Soft → gentle brand tint; Bold (or any dark brand) → **dark brand-colored chrome + light text**. Reuse the existing engine: `chrome = buildTheme(effectiveMode, buildTemplateColors(brand, appMode, template))` via a small `resolveChromeTheme(brand, appMode, template) → { colors, mode } | null` (the branded-always case of today's `resolveZoneTheme`). The luminance-polarity logic (FIX-A) stays — it now drives the CHROME (dark brand → dark chrome).
- **MainLayout:** wrap `<Sidebar/>` + the `<AppBar>` in the chrome `ThemeProvider`; `MainContentStyled`/`<Outlet/>` stay under the global light theme. **Remove** the `immersiveCanvas` dark-content painting (content no longer tinted).
- **Inner Circle:** `ImmersiveThemeProvider` becomes a **passthrough** (no dark surface tint). IC content renders on the global light theme; IC keeps the crown header tab + accent identity (tier chips, action-queue borders in brand accent — all on light surfaces). Its scoped component overrides that don't hurt legibility may stay, but no dark canvas.
- **Branding settings:** remove the **zone selector**; keep the template picker + color model + fonts. Drop `brandedZone` from the persisted model (leave the field optional/ignored for back-compat, or remove usage). `template` still persists in `overrides`.

## Preview rebuild
One shared `DashboardMiniPreview` component: a scaled mock of the ACTUAL layout — a left sidebar (nav items) + a top bar (logo + Inner Circle pill) themed by the passed chrome theme, beside a WHITE content area containing a stat tile ("1,284 / Active customers"), a green **"Active"** status chip + an orange "Inactive" chip (to prove status legibility), and a mini bar/line chart. Rendered under the given template's chrome theme (for the 3 cards, each its own template via effective mode; for the live preview, the selected template). Cards must visibly differ (bright/soft/bold chrome). Apply persists + reflects immediately.

## Verify
Browser: Bold + dark brand → dark sidebar + header, **white legible content**, green Active & orange Inactive chips clearly visible (the Vendors regression fixed); Bright → light chrome; Soft → tinted chrome; template cards differ and match the applied result; Apply works and persists; light-brand company → light chrome; dark app mode still works. AA on chrome text.

## Guards
generateBrandPalette + frozen tokens untouched. TS strict, no `any`, no-shadow. 48 typecheck baseline. This reuses FIX-A's engine; the change is WHERE it applies (chrome, not global) + content stays light + preview rebuilt + zone toggle removed.
