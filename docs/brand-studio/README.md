# Merchant Brand Studio

Implemented September 8, 2026, from the merchant-customizable Allyvia OS request. Merchants start with a curated style, then fine-tune it. This is a working settings editor and shared visual theme layer, with a development playground for reviewing the design.

## Experience

Settings → Branding now opens Brand Studio. Four starting points: Heritage (warm editorial), Gallery (quiet neutral), Bloom (soft expressive), and After hours (dark compact). These are original style directions, not official merchant brand kits.

Controls cover the primary/supporting accents, workspace/card/navigation surfaces, display and interface typefaces, heading character, corners, card finish, navigation selection, and density. Existing hosted logos, licensed custom heading fonts, extraction, and whole-app/Inner Circle scoping remain in advanced settings. Legacy surface templates remain available for legacy themes.

The interactive preview uses the production theme decorator and real MUI controls, with explicitly illustrative data. It supports Overview/Customers, desktop/tablet width, and light/dark. Changes stay in the draft until Save workspace style succeeds. Reset resets the draft and requires a save. Failed saves keep the draft and the existing live theme. Switching companies remounts the editor and invalidates responses from the previous company's pending save.

## Persistence and integration

- Existing `PUT /company/theme/` contract, using `overrides.experience` (version 1). No migration or new endpoint. Cache/live config is updated from the accepted server response.
- The decoder accepts only known values and six-digit colors. Missing/future versions retain legacy rendering.
- `MainLayout` applies the visual layer independently to navigation and content, honoring the existing zone selection. Common cards, buttons, fields, tables, heading styles and menu selection participate.
- Interface fonts are curated; the existing custom font mechanism continues to handle merchant-provided heading fonts.
- Foreground contrast is checked against both canvas and card surfaces. Incompatible pairs use the card surface for the canvas. Light brand paper receives a dark fallback when the operator chooses dark mode. Primary button fills retain the supplied brand color with contrasting text; text accents can adjust for legibility. Existing semantic status palettes are preserved.

## Preview

Run `npm start` from this worktree and open `/brand-studio-preview.html`. The development-only entry uses sample data and does not make merchant API requests. The production build continues to use the normal `index.html` entry.

The current worktree shares dependencies with the primary checkout. For Vite font serving in that arrangement, allow the real `node_modules` directory in the local preview server's `server.fs.allow`. A standalone checkout with `npm ci` does not need this override.

## Verification

- Unchanged develop baseline: lint, TypeScript, production build and 1,491 tests passed.
- Final: lint, TypeScript, production build and 1,514 tests / 71 files passed. The 23 new cases cover safe decoding, legacy preservation, API response mapping, contrast in every style/mode/zone, and preservation of semantic colors.
- Chrome: preset selection, customer/overview navigation, width toggle, loaded fonts, and 390px layout; no page errors or horizontal overflow.
- Actual settings component against intercepted API responses: failed save preserves live config; successful save caches the accepted theme; switching merchants ignores a delayed previous-merchant save. No live merchant data was written during verification.
- Screenshots: `heritage-desktop.png`, `after-hours-desktop.png`, and `heritage-mobile.png` alongside this document.

## Remaining product work

This establishes the visual system and editor; it does not redesign the information hierarchy of every OS module. Module-specific inline styles may still need a visual audit. Exact merchant matching requires their brand kit and licensed font assets. Automatic website import, image/texture art direction, custom body-font uploads, saved style versions, and merchant-specific dashboard arrangements are not included. No production theme was changed, and this branch has not been deployed.
