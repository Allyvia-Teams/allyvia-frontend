# Inner Circle Header Tab (Part 2 of 4) — Design

**Date:** 2026-07-21
**Branch:** `innercirclecrmmerge` (no new branches)
**Status:** Approved by Nigel 2026-07-21 (icon: crown; accent: soft tinted pill)

Part 2 of the four-part mission (1: CRM merge — DONE; 2: this; 3: immersive brand UI; 4: extraction/font fixes).

## Goal

Move the Inner Circle entry point out of the sidebar into the top header: a prominent, branded tab centered in the dead space between the search bar and the right-side header controls. Remove the `inner-circle` sidebar collapse group.

## Current state (verified against source)

- Header: `src/layout/MainLayout/Header/index.tsx` — order: logo + sidebar toggle → `SearchSection` → **two `<Box sx={{ flexGrow: 1 }} />` spacers (lines 104–105, the dead space)** → `GlobalSyncIndicator` → conditional kiosk Lock button.
- Brand state: `useConfig()` → `brandTheme: { primary, secondary, headingFont, logoUrl?, customFontUrl? } | null`.
- Font resolution already handled: `src/themes/index.tsx:28` computes `headingFont = brandTheme?.headingFont ?? headingFontFamily`, feeds it to typography (h1–h4 use it) and triggers `loadCustomFont`/`loadGoogleFont` at bootstrap. Therefore **`theme.typography.h4.fontFamily` IS the brand heading font with fallback built in** — the tab uses that, no manual null-handling.
- Brand primary already flows into `theme.palette.primary.main` (brand palette engine), falling back to Allyvia default when `brandTheme` is null — accents key off the theme, never off raw hex.
- Sidebar: `src/menu-items/pages.ts` — `inner-circle` collapse group (Dashboard `/inner-circle`, Survey Drafts `/inner-circle/surveys/drafts`).
- Survey Drafts is already reachable inside the page: `InnerCirclePage.tsx` header has a "Survey Drafts" button (`navigate('/inner-circle/surveys/drafts')`). Nothing needs relocating.

## Design

### A. Component

New `src/layout/MainLayout/Header/InnerCircleTab.tsx` — self-contained (uses `useTheme`, `useNavigate`, `useLocation`, `useMediaQuery`):

- `ButtonBase` pill (rounded), vertical stack: **`IconCrown`** (~22px, brand-primary ink) with **"Inner Circle"** beneath in `theme.typography.h4.fontFamily` (= brand heading font, auto-fallback).
- **Soft tinted pill**: `alpha(primary.main, 0.08)` fill + `alpha(primary.main, 0.24)` border; hover deepens to 0.12. Noticeably larger than a standard nav item (generous `px`/`py`).
- **Active** when `location.pathname.startsWith('/inner-circle')`: tint 0.16, border 0.45, label/icon in primary, `aria-current="page"`.
- Click → `navigate('/inner-circle')`.
- **Responsive**: below `md`, label hidden (crown-only, tighter padding) wrapped in `Tooltip title="Inner Circle"`; `flexShrink: 0` so it never collapses into or overlaps the search bar (flexGrow spacers absorb the squeeze).
- No brand configured → theme primary is the Allyvia default and the h4 font is the default heading font: the tab renders fully styled either way.

### B. Placement

In `Header/index.tsx`, replace the two adjacent spacers with: `<Box flexGrow:1 /> <InnerCircleTab /> <Box flexGrow:1 />` — centered between search and the right-side controls.

### C. Sidebar cleanup

Remove the `inner-circle` collapse group from `src/menu-items/pages.ts`; drop `IconCrown` and `IconClipboardList` from the import + `icons` object (both become unused there). Survey Drafts stays accessible via the page-header button (verified present).

## Verification

1. Typecheck adds no errors to touched files (48-error pre-existing baseline in theme/layout files stands); `npm run build` passes; existing vitest suites pass.
2. Browser: tab centered in header (crown + "Inner Circle" label); click navigates to `/inner-circle`; active treatment on any `/inner-circle*` route; narrow viewport → icon-only with tooltip, no search-bar overlap; sidebar shows no Inner Circle group; Survey Drafts button still works from the page.

## Out of scope

Immersive Inner Circle page theming (Part 3); font-load-at-bootstrap verification and extraction accuracy (Part 4); any backend change.
