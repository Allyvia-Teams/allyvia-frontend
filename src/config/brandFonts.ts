// ==============================|| BRAND HEADING FONTS (allowlist) ||============================== //
//
// Curated, licensed Google Fonts suitable for headings (h1–h4). This is the allowlist the
// brand-theme settings UI will offer; `weights` lists the faces Google actually serves for each
// family so the runtime loader requests a valid `css2` URL (requesting an unavailable weight
// makes the Google Fonts API return 400 and load nothing).

export type BrandFontCategory = 'serif' | 'sans' | 'display';

export interface BrandFont {
  /** Human-readable name shown in the picker. */
  label: string;
  /** CSS font-family name, exactly as Google Fonts spells it. */
  family: string;
  category: BrandFontCategory;
  /** Weights Google Fonts serves for this family. */
  weights: number[];
}

export const BRAND_FONTS: readonly BrandFont[] = [
  // elegant / editorial serifs
  { label: 'Playfair Display', family: 'Playfair Display', category: 'serif', weights: [400, 500, 600, 700, 800, 900] },
  { label: 'Cormorant', family: 'Cormorant', category: 'serif', weights: [300, 400, 500, 600, 700] },
  { label: 'Libre Baskerville', family: 'Libre Baskerville', category: 'serif', weights: [400, 700] },
  { label: 'Fraunces', family: 'Fraunces', category: 'serif', weights: [400, 500, 600, 700, 900] },
  { label: 'Marcellus', family: 'Marcellus', category: 'serif', weights: [400] },
  { label: 'Prata', family: 'Prata', category: 'serif', weights: [400] },
  // high-contrast display faces
  { label: 'Cinzel', family: 'Cinzel', category: 'display', weights: [400, 500, 600, 700, 800, 900] },
  { label: 'DM Serif Display', family: 'DM Serif Display', category: 'display', weights: [400] },
  // clean geometric / grotesque sans
  { label: 'Poppins', family: 'Poppins', category: 'sans', weights: [400, 500, 600, 700] },
  { label: 'Manrope', family: 'Manrope', category: 'sans', weights: [400, 500, 600, 700, 800] },
  { label: 'Montserrat', family: 'Montserrat', category: 'sans', weights: [400, 500, 600, 700] },
  { label: 'Space Grotesk', family: 'Space Grotesk', category: 'sans', weights: [400, 500, 600, 700] }
];

/** Look up an allowlist entry by family name (case-insensitive). */
export function findBrandFont(family: string): BrandFont | undefined {
  const key = family.trim().toLowerCase();
  return BRAND_FONTS.find((f) => f.family.toLowerCase() === key);
}
