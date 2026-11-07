// The one place the five insight categories get their color and icon. Cards
// tint their icon tile and meta label from here; anything else that needs a
// category color should read this map rather than pick its own.
//
// The hues are fixed, not taken from the theme: a shop's brand palette
// replaces primary/secondary, and the categories must stay tellable apart
// whatever the brand is. `text` is the 700 shade (at least 4.5:1 on white, so
// it is safe for the small uppercase label); `textDark` is the 400 shade for
// dark surfaces.

import { IconHeart, IconPackage, IconTag, IconUsers, IconWallet } from '@tabler/icons-react';

import type { InsightCategory } from './types';

export interface CategoryStyle {
  /** Label and icon color on a light surface. */
  text: string;
  /** Label and icon color on a dark surface. */
  textDark: string;
  Icon: typeof IconPackage;
}

export const categoryTheme: Record<InsightCategory, CategoryStyle> = {
  inventory: { text: '#6d28d9', textDark: '#a78bfa', Icon: IconPackage }, // purple
  staffing: { text: '#1d4ed8', textDark: '#60a5fa', Icon: IconUsers }, // blue
  pricing: { text: '#c2410c', textDark: '#fb923c', Icon: IconTag }, // orange
  inner_circle: { text: '#be185d', textDark: '#f472b6', Icon: IconHeart }, // pink
  cash: { text: '#15803d', textDark: '#4ade80', Icon: IconWallet } // green
};

export const categoryColor = (category: InsightCategory, mode: 'light' | 'dark'): string =>
  mode === 'dark' ? categoryTheme[category].textDark : categoryTheme[category].text;

/**
 * The impact figure's green. The theme's success green (#00c853) is 2.2:1 on
 * white, under the 3:1 even large text needs, so the badge uses the cash hue.
 */
export const impactColor = (mode: 'light' | 'dark'): string => (mode === 'dark' ? categoryTheme.cash.textDark : categoryTheme.cash.text);
