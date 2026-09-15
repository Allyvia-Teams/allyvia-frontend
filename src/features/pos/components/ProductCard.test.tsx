import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ProductCard from './ProductCard';
import type { Product } from '../types/pos.types';

const base: Product = {
  id: '1',
  name: 'Ada Denim Jacket',
  sku: 'ADA',
  category: 'Jackets',
  price: 148,
  stock: 3,
  taxRate: 0.08
} as Product;

describe('ProductCard photo tile', () => {
  it('renders the photo contained in a square box', () => {
    const html = renderToStaticMarkup(<ProductCard product={{ ...base, imageUrl: 'https://api.test/x-card.webp' }} onAdd={() => {}} />);
    expect(html).toContain('src="https://api.test/x-card.webp"');
    expect(html).toContain('loading="lazy"');
    expect(html).toMatch(/aspect-ratio:\s*1\s*\/\s*1/);
    expect(html).toMatch(/object-fit:\s*contain/);
  });
  it('falls back to the placeholder icon with no photo', () => {
    const html = renderToStaticMarkup(<ProductCard product={base} onAdd={() => {}} />);
    expect(html).not.toContain('<img');
    expect(html).toContain('ImageNotSupportedIcon');
  });
});
