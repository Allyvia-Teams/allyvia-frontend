import { describe, expect, it } from 'vitest';

import { withStyleImageUrls } from './styleImages';
import type { CatalogStyle } from '../types/pos.types';

const style = (imageUrl?: string): CatalogStyle => ({
  id: 's1',
  name: 'Ada Denim Jacket',
  styleCode: 'ADA',
  category: 'Jackets',
  brand: '',
  price: 148,
  priceMax: null,
  stock: 3,
  imageUrl,
  variants: []
});

describe('withStyleImageUrls', () => {
  it('resolves a path-absolute photo against the API origin, not the page', () => {
    const page = withStyleImageUrls({ styles: [style('/api/v1/inventory/images/abc/123-card.webp')] }, 'https://api.allyvia.test/api/v1/');
    expect(page.styles[0].imageUrl).toBe('https://api.allyvia.test/api/v1/inventory/images/abc/123-card.webp');
  });

  it('leaves an absolute photo URL (a public image base) untouched', () => {
    const page = withStyleImageUrls({ styles: [style('https://img.example.test/x-card.webp')] }, 'https://api.allyvia.test/api/v1/');
    expect(page.styles[0].imageUrl).toBe('https://img.example.test/x-card.webp');
  });

  it('turns "no photo" into absent, so the tile shows its placeholder', () => {
    const page = withStyleImageUrls({ styles: [style(''), style(undefined)] }, 'https://api.allyvia.test/api/v1/');
    expect(page.styles.map((s) => s.imageUrl)).toEqual([undefined, undefined]);
  });

  it('keeps the rest of the page (pagination) as it came', () => {
    const page = withStyleImageUrls({ styles: [], pagination: { has_next: true } }, '/api/v1/');
    expect(page.pagination).toEqual({ has_next: true });
  });
});
