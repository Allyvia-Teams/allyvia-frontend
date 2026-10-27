import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ProductCard from './ProductCard';
import type { CatalogStyle } from '../types/pos.types';

const base: CatalogStyle = {
  id: 's1',
  name: 'Ada Denim Jacket',
  styleCode: 'ADA',
  category: 'Jackets',
  brand: '',
  price: 148,
  priceMax: null,
  stock: 3,
  variants: [{ id: 'v1', sku: 'ADA-M', barcode: '', size: 'M', color: '', price: 148, stock: 3, taxRate: 0.08 }]
};

describe('ProductCard photo tile', () => {
  it('renders the style photo contained in a square box', () => {
    const html = renderToStaticMarkup(<ProductCard style={{ ...base, imageUrl: 'https://api.test/x-card.webp' }} onSelect={() => {}} />);
    expect(html).toContain('src="https://api.test/x-card.webp"');
    expect(html).toContain('alt="Ada Denim Jacket"');
    expect(html).toContain('loading="lazy"');
    expect(html).toMatch(/aspect-ratio:\s*1\s*\/\s*1/);
    expect(html).toMatch(/object-fit:\s*contain/);
  });

  it('falls back to the placeholder icon with no photo', () => {
    const html = renderToStaticMarkup(<ProductCard style={base} onSelect={() => {}} />);
    expect(html).not.toContain('<img');
    expect(html).toContain('ImageNotSupportedIcon');
  });
});
