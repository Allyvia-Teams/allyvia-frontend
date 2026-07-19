import { describe, expect, it } from 'vitest';

import { ThemeMode } from 'config';

import Palette from './palette';
import { generateBrandPalette } from './brandPalette';

// NOTE: only the brandTheme (generateBrandPalette) branch is unit-tested here. The presetColor
// fallback reads `.module.scss` tokens, which vitest resolves to scoped class-name strings rather
// than the `:export` hex values, so createTheme rejects them under test. The null/preset path is
// unchanged legacy behavior, verified live (Allyvia blue) and by the null-path review.

const BRAND = { primary: '#5a3a22', secondary: '#c8a951', headingFont: 'Playfair Display' };
const ALLYVIA_BLUE = '#2f6fd4';

describe('Palette brandTheme wiring', () => {
  it('derives the palette from the brand pair when a brandTheme is set, short-circuiting presetColor', () => {
    const expected = generateBrandPalette({ primary: BRAND.primary, secondary: BRAND.secondary, mode: 'light' });
    // pass a non-brand presetColor to prove it is ignored when brandTheme is present
    const theme = Palette(ThemeMode.LIGHT, 'theme3', BRAND);

    expect(theme.palette.primary.main.toLowerCase()).toBe(expected.primaryMain);
    expect(theme.palette.secondary.main.toLowerCase()).toBe(expected.secondaryMain);
    expect(theme.palette.primary.main.toLowerCase()).not.toBe(ALLYVIA_BLUE);
  });

  it('maps dark mode to the brand dark ramp', () => {
    const expected = generateBrandPalette({ primary: BRAND.primary, secondary: BRAND.secondary, mode: 'dark' });
    const theme = Palette(ThemeMode.DARK, 'allyvia', BRAND);

    expect(theme.palette.mode).toBe('dark');
    expect(theme.palette.primary.main.toLowerCase()).toBe(expected.darkPrimaryMain);
  });
});
