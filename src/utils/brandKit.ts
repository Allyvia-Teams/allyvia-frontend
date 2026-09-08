import type { BrandTheme } from 'types/config';
import { findBrandFont } from 'config/brandFonts';
import { DEFAULT_EXPERIENCE, parseBrandExperience } from 'themes/brandExperience';
import { extractBrandColors } from './extractBrandColors';

export interface BrandAsset {
  name: string;
  kind: 'logo' | 'design' | 'gallery';
  image: string;
  thumbnail: string;
  colors: string[];
}
export interface BrandAnalysis {
  primary?: string;
  colors: string[];
  fonts: string[];
  website: string;
  method: 'extracted' | 'visual-and-extracted';
  warnings: string[];
  interpretation: { character: string; heading_character: 'editorial' | 'modern'; font_family: string; reasoning: string } | null;
}
export interface BrandKit {
  version: 1;
  website: string;
  colors: string[];
  fonts: string[];
  logo?: string;
  character: string;
  sources: { name: string; kind: BrandAsset['kind']; thumbnail: string }[];
}
export const pngData = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 240_000 && /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value);
export function parseBrandKit(value: unknown): BrandKit | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const v = value as Partial<BrandKit>;
  if (v.version !== 1) return undefined;
  return {
    version: 1,
    website: typeof v.website === 'string' ? v.website.slice(0, 1000) : '',
    colors: Array.isArray(v.colors) ? v.colors.filter((c) => typeof c === 'string' && /^#[\da-f]{6}$/i.test(c)).slice(0, 12) : [],
    fonts: Array.isArray(v.fonts)
      ? v.fonts
          .filter((f) => typeof f === 'string')
          .map((f) => f.slice(0, 80))
          .slice(0, 8)
      : [],
    logo: pngData(v.logo) ? v.logo : undefined,
    character: typeof v.character === 'string' ? v.character.slice(0, 240) : '',
    sources: Array.isArray(v.sources)
      ? v.sources
          .filter(
            (s) =>
              s &&
              typeof s.name === 'string' &&
              ['logo', 'design', 'gallery'].includes(s.kind) &&
              pngData(s.thumbnail) &&
              s.thumbnail.length <= 40_000
          )
          .slice(0, 6)
          .map((s) => ({ ...s, name: s.name.slice(0, 120) }))
      : []
  };
}

export async function prepareBrandAsset(file: File, kind: BrandAsset['kind']): Promise<BrandAsset> {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type) || file.size > 8 * 1024 * 1024)
    throw new Error('Use PNG, JPG, WebP or SVG images, up to 8 MB each.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Could not read ${file.name}. Try a PNG or JPG export.`));
      image.src = url;
    });
    if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 32_000_000)
      throw new Error('Export an image smaller than 32 megapixels.');
    const render = (max: number) => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Image processing is unavailable in this browser.');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    };
    let normalized = render(512);
    if (normalized.length > 240_000) normalized = render(256);
    if (normalized.length > 240_000) throw new Error('This image is too detailed. Try a smaller export.');
    let thumbnail = render(128);
    if (thumbnail.length > 40_000) thumbnail = render(64);
    const colors = (await extractBrandColors(file)).swatches;
    return { name: file.name.slice(0, 120), kind, image: normalized, thumbnail, colors };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function tailorBrand(brand: NonNullable<BrandTheme>, analysis: BrandAnalysis, assets: BrandAsset[]): NonNullable<BrandTheme> {
  const colors = [...new Set(analysis.colors.filter((c) => /^#[\da-f]{6}$/i.test(c)).map((c) => c.toUpperCase()))];
  const e = parseBrandExperience(brand.experience) ?? DEFAULT_EXPERIENCE;
  const font = analysis.fonts.map(findBrandFont).find(Boolean) ?? findBrandFont(analysis.interpretation?.font_family ?? '');
  const light = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).reduce((a, b) => a + b, 0) / 3;
  const chromatic = colors.find(
    (c) =>
      Math.max(...[1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))) -
        Math.min(...[1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))) >
      20
  );
  const primary =
    analysis.primary && /^#[\da-f]{6}$/i.test(analysis.primary)
      ? analysis.primary.toUpperCase()
      : (chromatic ?? colors[0] ?? brand.primary);
  const background = colors.find((c) => light(c) > 225);
  const blend = (a: string, b: string, weight: number) =>
    '#' +
    [1, 3, 5]
      .map((i) =>
        Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - weight) + parseInt(b.slice(i, i + 2), 16) * weight)
          .toString(16)
          .padStart(2, '0')
      )
      .join('');
  const canvas = light(e.canvas) > 160 ? (background ?? blend(primary, '#ffffff', 0.96)) : blend(primary, '#101310', 0.9);
  const logo = assets.find((a) => a.kind === 'logo')?.image;
  return {
    ...brand,
    primary,
    secondary: colors.find((c) => c !== primary && light(c) < 220) ?? brand.secondary,
    ...(font && !brand.customFontUrl ? { headingFont: font.family } : {}),
    logoUrl: logo ?? (pngData(brand.logoUrl) ? null : brand.logoUrl),
    experience: {
      ...e,
      canvas,
      surface: light(e.surface) > 160 ? blend(canvas, '#ffffff', 0.6) : blend(canvas, '#ffffff', 0.05),
      navigation: blend(canvas, primary, 0.04)
    },
    brandKit: {
      version: 1,
      website: analysis.website,
      colors,
      fonts: analysis.fonts,
      logo,
      character: analysis.interpretation?.character ?? 'Colors and type extracted from your brand materials.',
      sources: assets.map(({ name, kind, thumbnail }) => ({ name, kind, thumbnail }))
    }
  };
}
