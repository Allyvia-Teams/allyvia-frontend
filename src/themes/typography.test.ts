import { createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import Typography from './typography';

// A real MUI theme supplies palette.mode / grey / text that Typography reads (no jsdom needed).
const theme = createTheme();
const BODY = `'Inter', sans-serif`;

// Variants that MUST stay on the body font — the brand heading font must never reach them.
const BODY_VARIANTS = ['h5', 'h6', 'body1', 'body2', 'button', 'caption', 'subtitle1', 'subtitle2'] as const;

describe('Typography heading-font split', () => {
  it('applies the heading font to h1–h4 only', () => {
    const t = Typography(theme, 8, BODY, 'Playfair Display') as Record<string, any>;

    expect(t.fontFamily).toBe(BODY); // root/body font unchanged
    for (const h of ['h1', 'h2', 'h3', 'h4']) {
      expect(t[h].fontFamily, `${h} should use the heading font`).toBe('Playfair Display');
    }
    for (const v of BODY_VARIANTS) {
      expect(t[v]?.fontFamily, `${v} must not carry a heading-font override`).toBeUndefined();
    }
  });

  it('falls back to the body font for headings when no heading font is provided (current behavior)', () => {
    const t = Typography(theme, 8, BODY) as Record<string, any>;

    expect(t.fontFamily).toBe(BODY);
    for (const h of ['h1', 'h2', 'h3', 'h4']) {
      expect(t[h].fontFamily, `${h} should fall back to the body font`).toBe(BODY);
    }
    for (const v of BODY_VARIANTS) {
      expect(t[v]?.fontFamily).toBeUndefined();
    }
  });
});
