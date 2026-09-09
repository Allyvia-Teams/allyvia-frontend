# Merchant Brand Studio

Implemented September 8, 2026, from the merchant-customizable Allyvia OS request. Merchants start with a curated style, then fine-tune it. This is a working settings editor and shared visual theme layer, with a development playground for reviewing the design.

## Experience

Settings → Branding now opens Brand Studio. Four starting points: Heritage (warm editorial), Gallery (quiet neutral), Bloom (soft expressive), and After hours (dark compact). These are original style directions, not official merchant brand kits.

Controls cover the primary/supporting accents, workspace/card/navigation surfaces, display and interface typefaces, heading character, corners, card finish, navigation selection, and density. Existing hosted logos, licensed custom heading fonts, extraction, and whole-app/Inner Circle scoping remain in advanced settings. Legacy surface templates remain available for legacy themes.

The interactive preview uses the production theme decorator and real MUI controls, with explicitly illustrative data. It supports Overview/Customers, desktop/tablet width, and light/dark. Changes stay in the draft until Save workspace style succeeds. Reset resets the draft and requires a save. Failed saves keep the draft and the existing live theme. Switching companies remounts the editor and invalidates responses from the previous company's pending save.

## Persistence and integration

- Existing `PUT /company/theme/` contract, using `overrides.experience` (version 1). No migration. Brand analysis uses the new `POST /company/theme/analyze/` endpoint. Cache/live config is updated from the accepted server response.
- The decoder accepts only known values and six-digit colors. Missing/future versions retain legacy rendering.
- `MainLayout` applies the visual layer independently to navigation and content, honoring the existing zone selection. Common cards, buttons, fields, tables, heading styles and menu selection participate.
- Interface fonts are curated; the existing custom font mechanism continues to handle merchant-provided heading fonts.
- Foreground contrast is checked against both canvas and card surfaces. Incompatible pairs use the card surface for the canvas. Light brand paper receives a dark fallback when the operator chooses dark mode. Primary button fills retain the supplied brand color with contrasting text; text accents can adjust for legibility. Existing semantic status palettes are preserved.

## Preview

Run `npm start` from this worktree and open `/brand-studio-preview.html`. The development-only entry uses sample data and does not make merchant API requests. The production build continues to use the normal `index.html` entry.

The current worktree shares dependencies with the primary checkout. For Vite font serving in that arrangement, allow the real `node_modules` directory in the local preview server's `server.fs.allow`. A standalone checkout with `npm ci` does not need this override.

## Verification

- Unchanged develop baseline: lint, TypeScript, production build and 1,491 tests passed.
- Final: lint, TypeScript, production build and 1,521 tests / 72 files passed. The 23 new cases cover safe decoding, legacy preservation, API response mapping, contrast in every style/mode/zone, and preservation of semantic colors.
- Chrome: preset selection, customer/overview navigation, width toggle, loaded fonts, and 390px layout; no page errors or horizontal overflow.
- Actual settings component against intercepted API responses: failed save preserves live config; successful save caches the accepted theme; switching merchants ignores a delayed previous-merchant save. No live merchant data was written during verification.
- Screenshots: `heritage-desktop.png`, `after-hours-desktop.png`, and `heritage-mobile.png` alongside this document.

## Remaining product work

This establishes the visual system and editor; it does not redesign the information hierarchy of every OS module. Module-specific inline styles may still need a visual audit. Exact merchant matching requires their brand kit and licensed font assets. Automatic image/texture placement, custom body-font uploads, saved style versions, and merchant-specific dashboard arrangements are not included. Reference galleries inform analysis; this is not a full-resolution asset library. No production theme was changed, and this branch has not been deployed.

## Brand kit and element templates

The next step after selecting a curated style is **Bring your brand into the room**: upload a logo, design references and campaign/product/interior imagery, enter an HTTPS website, and optionally supply exact hex colors. Read my brand extracts evidence and, when configured on the backend, interprets visual character. Merchants review the result before Tailor my chosen style changes the draft. Explicit colors take priority. Unknown font names are surfaced for review; licensed custom heading fonts remain supported in advanced settings. The software does not download font files from the supplied website.

Up to six images, 8 MB each, are accepted as PNG/JPEG/WebP/SVG. The browser rasterizes SVG and resizes images to bounded PNGs before sending them. The persisted kit contains a compact logo and reference thumbnails, not original full-resolution uploads. `overrides.brandKit` and `overrides.styleId` travel with the existing company theme. Website input and imagery are sent to the authenticated analysis endpoint; configured visual interpretation sends the bounded evidence to the existing Google model integration. Extraction still works if visual interpretation is unavailable.

Independent visual choices cover navigation selection, card treatment, button shape/treatment, and table spacing/striping. These use the shared runtime theme layer and preserve the merchant's identity. Colors, surfaces and typography remain directly editable. Save publishes the draft only after the API accepts it; Undo tailoring restores the previous draft.

The development playground performs real local image color extraction but does not call the website/AI endpoint. Use the signed-in settings page with the matching backend branch for website and visual interpretation. Both branches must be deployed together for that endpoint to be available.

Additional verification: logo upload and rasterization, palette tailoring, real button/table appearance, 390px overflow check, and actual settings save/reload/logo removal against intercepted API responses. Seven new unit cases cover tailoring, palette normalization, custom-font preservation, safe kit decoding, persistence mapping and element isolation. `kit-desktop.png` and `kit-mobile.png` show the new flow. Live website extraction was checked against aimeleondore.com; provider interpretation was exercised through fallback/mocks, not a live paid model call.

## Editable workspace identity (September 9)

Settings uses the new Brand Studio editor. Saving an experience now explicitly targets the whole OS, including merchants whose legacy theme was scoped only to Inner Circle. Shared navigation/content theme providers apply accepted styles to the actual app; this is not limited to the playground. Module-specific layouts and explicit inline styles are not automatically redesigned.

The top-left identity has three presentations: original logo, logo with editable name/tagline, and editable wordmark. Height, zoom, contain/crop framing, inner spacing, corners and backdrop are configurable. Expanded and collapsed previews use the same `BrandIdentity` component as the production `Logo`. Collapsed text-only identities use an initial; failed merchant images fall back to a merchant wordmark. Authentication screens continue to use Allyvia. Presentation controls do not edit pixels or convert raster text to editable text.

Versioned `overrides.identity` persists through the existing company-theme API and company cache. Validation bounds numeric controls and accepts only fixed layouts and safe color values. Browser verification confirmed that the actual Logo changes after a successful Settings save, survives reload, and the saved scope is main-app. Desktop/mobile upload-and-lockup checks pass without page errors or horizontal overflow. Frontend unit suite: 1,523 tests in 73 files. See `identity-desktop.png` and `identity-mobile.png`.
