export interface BrandIdentity {
  version: 1;
  layout: 'logo' | 'lockup' | 'wordmark';
  name: string;
  tagline: string;
  size: number;
  zoom: number;
  padding: number;
  radius: number;
  background: string;
  fit: 'contain' | 'cover';
}
export function parseBrandIdentity(value: unknown): BrandIdentity {
  const v = value && typeof value === 'object' ? (value as Partial<BrandIdentity>) : {};
  const bounded = (n: unknown, fallback: number, min: number, max: number) =>
    typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  return {
    version: 1,
    layout: v.layout === 'lockup' || v.layout === 'wordmark' ? v.layout : 'logo',
    name: typeof v.name === 'string' ? v.name.slice(0, 60) : '',
    tagline: typeof v.tagline === 'string' ? v.tagline.slice(0, 80) : '',
    size: bounded(v.size, 36, 24, 48),
    zoom: bounded(v.zoom, 1, 1, 2),
    padding: bounded(v.padding, 0, 0, 8),
    radius: bounded(v.radius, 0, 0, 24),
    background: typeof v.background === 'string' && /^#[\da-f]{6}$/i.test(v.background) ? v.background : 'transparent',
    fit: v.fit === 'cover' ? 'cover' : 'contain'
  };
}
