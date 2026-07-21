import { describe, expect, it, vi } from 'vitest';

import { ThemeMode } from 'config';
import Palette from './palette';
import { chartAxisColor, chartGridColor, chartSeriesPalette } from './chartPalette';

const BRAND = { primary: '#5a3a22', secondary: '#c8a951', headingFont: '' };
const HEX = /^#[0-9a-fA-F]{6}$/;

describe('chartSeriesPalette', () => {
  it('leads with the brand primary and secondary, then tints, then neutral greys', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const theme = Palette(ThemeMode.LIGHT, 'default', BRAND);
    const palette = chartSeriesPalette(theme);

    // exact shape: brand main → tints → neutral greys last (documented order)
    expect(palette).toEqual([
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.primary[200],
      theme.palette.secondary[200],
      theme.palette.primary.dark,
      theme.palette.secondary.dark,
      theme.palette.grey[500],
      theme.palette.grey[300]
    ]);
    // greys are the final two entries, not scattered among the brand colors
    expect(palette.slice(-2)).toEqual([theme.palette.grey[500], theme.palette.grey[300]]);
    // every entry is a valid color
    palette.forEach((c) => expect(c).toMatch(HEX));
  });

  it('is all-distinct so many-series charts stay distinguishable', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const palette = chartSeriesPalette(Palette(ThemeMode.LIGHT, 'default', BRAND));
    expect(new Set(palette).size).toBe(palette.length);
  });

  it('does NOT include semantic status colors (those stay fixed at the call site)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const theme = Palette(ThemeMode.LIGHT, 'default', BRAND);
    const palette = chartSeriesPalette(theme);
    const semantic = [theme.palette.success.main, theme.palette.error.main, theme.palette.warning.main];
    for (const s of semantic) {
      expect(palette).not.toContain(s);
    }
  });

  it('follows the brand primary in dark mode too', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const theme = Palette(ThemeMode.DARK, 'default', BRAND);
    expect(chartSeriesPalette(theme)[0]).toBe(theme.palette.primary.main);
    expect(chartAxisColor(theme)).toBe(theme.palette.text.secondary);
    expect(chartGridColor(theme)).toBe(theme.palette.divider);
  });
});
