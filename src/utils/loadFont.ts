// ==============================|| RUNTIME GOOGLE FONT LOADER ||============================== //
//
// Injects a Google Fonts <link rel="stylesheet"> for a family at runtime, exactly once per
// family. Used to load a brand's heading font on demand (index.html only ships Inter).

import { findBrandFont } from 'config/brandFonts';

// Families already injected this session, keyed by lowercased family name.
const injected = new Set<string>();

/**
 * Build the Google Fonts `css2` URL for a family. Requests the weights the family actually
 * serves (from the allowlist) so the API never 400s on an unavailable weight; falls back to no
 * weight axis for unknown families. Pure — exported for testing.
 */
export function googleFontHref(family: string): string {
  const name = family.trim().replace(/\s+/g, '+');
  const weights = findBrandFont(family)?.weights;
  const axis = weights && weights.length ? `:wght@${[...weights].sort((a, b) => a - b).join(';')}` : '';
  return `https://fonts.googleapis.com/css2?family=${name}${axis}&display=swap`;
}

/**
 * Load a Google Font family once. No-op when: input is empty, there is no `document` (SSR/tests),
 * the family was already injected, or a matching <link> is already in the document.
 */
export function loadGoogleFont(family: string): void {
  if (!family || typeof document === 'undefined') return;
  const key = family.trim().toLowerCase();
  if (!key || injected.has(key)) return;

  const href = googleFontHref(family);
  // Dedup by iterating existing <link>s rather than building an attribute selector from the
  // (untrusted) family name — an unescaped family containing a quote would make querySelector throw.
  const already = Array.from(document.querySelectorAll('link')).some(
    (el) => el.getAttribute('data-brand-font') === key || (el as HTMLLinkElement).href === href
  );
  if (already) {
    injected.add(key);
    return;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute('data-brand-font', key);
  document.head.appendChild(link);
  injected.add(key);
}

// Custom (self-hosted, licensed) fonts injected via a runtime @font-face, keyed separately from
// the Google-Fonts links above.
const injectedCustom = new Set<string>();

/** Build a CSS @font-face rule for a custom family + hosted font URL. Pure — exported for testing. */
export function customFontFaceRule(family: string, url: string): string {
  // Both values are wrapped in single-quoted CSS strings. Strip every character that could break
  // out of that context or terminate/inject a rule (quotes, backslash, parens, braces, semicolons,
  // and — for the url — whitespace), so a hostile family/url cannot inject CSS.
  const safeFamily = family.trim().replace(/['"\\(){};]/g, '');
  const safeUrl = url.trim().replace(/['"\\(){};\s]/g, '');
  return `@font-face{font-family:'${safeFamily}';src:url('${safeUrl}');font-weight:400 800;font-display:swap;}`;
}

/**
 * Inject a custom heading font via @font-face once per family. No-op without a document, for
 * empty input, or if already injected. Used when a brand theme supplies a licensed customFontUrl.
 */
export function loadCustomFont(family: string, url: string): void {
  if (!family || !url || typeof document === 'undefined') return;
  const key = family.trim().toLowerCase();
  if (!key || injectedCustom.has(key)) return;
  if (document.querySelector(`style[data-custom-font="${key}"]`)) {
    injectedCustom.add(key);
    return;
  }

  const style = document.createElement('style');
  style.setAttribute('data-custom-font', key);
  style.textContent = customFontFaceRule(family, url);
  document.head.appendChild(style);
  injectedCustom.add(key);
}
