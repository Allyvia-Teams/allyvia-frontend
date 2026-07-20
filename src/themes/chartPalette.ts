import { Theme } from '@mui/material/styles';

// ==============================|| BRAND-DERIVED CHART PALETTE ||============================== //
//
// Series colors for ApexCharts, derived from the (brand) primary/secondary plus their tints, then
// neutral greys. Multi-series charts follow the brand while staying distinguishable and readable.
//
// IMPORTANT: this palette is for generic/categorical series only. Semantic status colors
// (up/down, gain/loss, success/error) must stay fixed at the call site — do NOT pull them from here.

/** Ordered brand-derived series colors, most prominent first, ending in neutral greys. */
export function chartSeriesPalette(theme: Theme): string[] {
  const p = theme.palette;
  return [p.primary.main, p.secondary.main, p.primary[200], p.secondary[200], p.primary.dark, p.secondary.dark, p.grey[500], p.grey[300]];
}

/** Neutral color for chart axis labels / legend text (mode-aware). */
export function chartAxisColor(theme: Theme): string {
  return theme.palette.text.secondary;
}

/** Neutral color for chart gridlines / borders (mode-aware). */
export function chartGridColor(theme: Theme): string {
  return theme.palette.divider;
}
