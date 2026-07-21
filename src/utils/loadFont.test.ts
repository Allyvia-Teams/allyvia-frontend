import { afterEach, describe, expect, it } from 'vitest';

import { customFontFaceRule, googleFontHref, loadCustomFont, loadGoogleFont } from './loadFont';

describe('googleFontHref', () => {
  it('encodes spaces and requests the allowlisted weights for a known family', () => {
    expect(googleFontHref('Playfair Display')).toBe(
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap'
    );
  });

  it('requests a single weight for a single-weight family', () => {
    expect(googleFontHref('Marcellus')).toBe('https://fonts.googleapis.com/css2?family=Marcellus:wght@400&display=swap');
  });

  it('resolves allowlisted weights case-insensitively', () => {
    expect(googleFontHref('playfair display')).toBe(
      'https://fonts.googleapis.com/css2?family=playfair+display:wght@400;500;600;700;800;900&display=swap'
    );
  });

  it('omits the weight axis for an unknown family (so the API never 400s)', () => {
    expect(googleFontHref('Some Unknown Face')).toBe('https://fonts.googleapis.com/css2?family=Some+Unknown+Face&display=swap');
  });

  it('always uses HTTPS and display=swap for a smooth swap', () => {
    for (const family of ['Poppins', 'Fraunces', 'Cormorant']) {
      const href = googleFontHref(family);
      expect(href.startsWith('https://fonts.googleapis.com/css2?')).toBe(true);
      expect(href).toContain('display=swap');
    }
  });
});

describe('loadGoogleFont (no document)', () => {
  it('is a safe no-op in SSR/node and for empty input', () => {
    expect(typeof document).toBe('undefined'); // node test environment, no DOM stub here
    expect(() => loadGoogleFont('Playfair Display')).not.toThrow();
    expect(() => loadGoogleFont('')).not.toThrow();
  });
});

describe('customFontFaceRule', () => {
  it('builds a valid @font-face rule for a hosted font', () => {
    const rule = customFontFaceRule('Corporate Sans', 'https://cdn.x.com/font.woff2');
    expect(rule).toContain("font-family:'Corporate Sans'");
    expect(rule).toContain("src:url('https://cdn.x.com/font.woff2')");
    expect(rule).toContain('font-display:swap');
  });

  it('strips characters that could break out of the CSS string context (injection-safe)', () => {
    // a hostile family/url trying to close the string + inject a rule must be neutralized
    const rule = customFontFaceRule("Evil'}body{color:red}//", "https://x.com/f.woff2');}body{x:1");
    // only the 4 string delimiters remain, so nothing broke out of the two quoted strings
    expect(rule.split("'").length - 1).toBe(4);
    // and the interpolated values carry no character that could terminate/inject a rule
    const family = rule.split("font-family:'")[1].split("'")[0];
    const url = rule.split("url('")[1].split("'")[0];
    for (const value of [family, url]) {
      for (const ch of ['"', '\\', '{', '}', '(', ')', ';']) {
        expect(value).not.toContain(ch);
      }
    }
  });
});

describe('loadCustomFont (no document)', () => {
  it('is a safe no-op in SSR/node, for empty family, and for empty url', () => {
    expect(typeof document).toBe('undefined');
    expect(() => loadCustomFont('Corporate Sans', 'https://cdn.x.com/f.woff2')).not.toThrow();
    expect(() => loadCustomFont('', 'https://cdn.x.com/f.woff2')).not.toThrow();
    expect(() => loadCustomFont('Corporate Sans', '')).not.toThrow();
  });
});

// Minimal DOM stub so the injection/dedup path can be exercised without jsdom.
function makeFakeDocument() {
  const links: any[] = [];
  return {
    _links: links,
    querySelectorAll: (sel: string) => (sel === 'link' ? links.slice() : []),
    createElement: () => {
      const attrs: Record<string, string> = {};
      return {
        set rel(v: string) {
          attrs.rel = v;
        },
        get rel() {
          return attrs.rel;
        },
        set href(v: string) {
          attrs.href = v;
        },
        get href() {
          return attrs.href;
        },
        setAttribute: (k: string, v: string) => {
          attrs[k] = v;
        },
        getAttribute: (k: string) => (k in attrs ? attrs[k] : null)
      };
    },
    head: {
      appendChild: (el: any) => {
        links.push(el);
      }
    }
  };
}

describe('loadGoogleFont (stubbed DOM)', () => {
  afterEach(() => {
    delete (globalThis as any).document;
  });

  it('injects a single stylesheet <link> and dedups repeat/case-variant calls', () => {
    const doc = makeFakeDocument();
    (globalThis as any).document = doc;

    loadGoogleFont('Manrope');
    expect(doc._links).toHaveLength(1);
    const link = doc._links[0];
    expect(link.rel).toBe('stylesheet');
    expect(link.getAttribute('data-brand-font')).toBe('manrope');
    expect(link.href).toBe(googleFontHref('Manrope'));

    // repeated + case-variant calls must not append another link
    loadGoogleFont('Manrope');
    loadGoogleFont('manrope');
    expect(doc._links).toHaveLength(1);
  });

  it('does not re-inject when a matching <link> already exists in the document', () => {
    const doc = makeFakeDocument();
    // pre-seed an existing link for a not-yet-loaded family
    doc._links.push({ getAttribute: (k: string) => (k === 'data-brand-font' ? 'montserrat' : null), href: '' });
    (globalThis as any).document = doc;

    loadGoogleFont('Montserrat');
    expect(doc._links).toHaveLength(1); // no new link appended
  });
});
