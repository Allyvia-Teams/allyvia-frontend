import { describe, expect, it } from 'vitest';

import type { ProductsResponse } from '../api/posApi';
import type { Product } from '../types/pos.types';
import { buildCatalogView, effectiveCategory, nextPageParam } from './catalogView';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Black Tee',
    sku: 'BLK-TEE-M',
    category: 'Tops',
    price: 25,
    stock: 4,
    taxRate: 0.08,
    ...overrides
  };
}

// One server page. `total` is the whole result set, not this page.
function makePage(page: number, itemCount: number, total: number): ProductsResponse {
  const pageSize = 24;
  return {
    items: Array.from({ length: itemCount }, (_, i) => makeProduct({ id: `p${(page - 1) * pageSize + i}`, sku: `SKU-${page}-${i}` })),
    pagination: {
      current_page: page,
      page_size: pageSize,
      total_pages: Math.max(1, Math.ceil(total / pageSize)),
      total_items: total,
      has_next: page * pageSize < total,
      has_previous: page > 1
    }
  };
}

const idle = { isError: false, isLoading: false };

describe('effectiveCategory', () => {
  it('drops the category while searching so a search spans the whole catalogue', () => {
    // The backend composes category AND search. Keeping the chip would hide an
    // item filed under a category the clerk did not expect — which is how
    // ALL-101 stayed invisible even to people who tried other chips.
    expect(effectiveCategory('Tops', 'BLK-TEE-M')).toBeUndefined();
  });

  it('passes the chip through when the search is empty', () => {
    expect(effectiveCategory('Tops', '')).toBe('Tops');
  });

  it('treats a whitespace-only search as no search', () => {
    // A stray space must not silently widen the scope to every category.
    expect(effectiveCategory('Tops', '   ')).toBe('Tops');
  });

  it('sends no category for the All chip', () => {
    expect(effectiveCategory('all', '')).toBeUndefined();
  });
});

describe('nextPageParam', () => {
  it('asks for the page after the one just received', () => {
    expect(nextPageParam(makePage(2, 24, 61))).toBe(3);
  });

  it('stops at the last page', () => {
    expect(nextPageParam(makePage(3, 13, 61))).toBeUndefined();
  });
});

describe('buildCatalogView', () => {
  it('finds a product that is not on the first page — the BLK-TEE-M case', () => {
    // BEFORE: ProductCatalog debounced the term and then filtered the 24-item
    // array already in memory. BLK-TEE-M is the 57th item in Tops, so the
    // filter never saw it and the grid rendered "No results" — the clerk
    // mis-rang the garment or waved it through. AFTER: the term goes to the
    // server, which returns the one match out of the whole catalogue.
    const view = buildCatalogView({ ...idle, pages: [makePage(1, 1, 1)], search: 'BLK-TEE-M' });

    expect(view.status).toBe('grid');
    expect(view.products).toHaveLength(1);
    expect(view.products[0].sku).toBe('SKU-1-0');
    expect(view.countLabel).toBe('1 match');
    expect(view.showLoadMore).toBe(false);
  });

  it('states the truncation whenever more products exist than are loaded', () => {
    const view = buildCatalogView({ ...idle, pages: [makePage(1, 24, 61)], search: '' });

    expect(view.status).toBe('grid');
    expect(view.countLabel).toBe('Showing 24 of 61');
    expect(view.showLoadMore).toBe(true);
    expect(view.loadMoreLabel).toBe('Load more (24 of 61)');
  });

  it('accumulates loaded pages into one grid', () => {
    const view = buildCatalogView({ ...idle, pages: [makePage(1, 24, 61), makePage(2, 24, 61)], search: '' });

    expect(view.products).toHaveLength(48);
    expect(view.countLabel).toBe('Showing 48 of 61');
    expect(view.showLoadMore).toBe(true);
  });

  it('stops offering Load more once the last page is in', () => {
    const view = buildCatalogView({
      ...idle,
      pages: [makePage(1, 24, 61), makePage(2, 24, 61), makePage(3, 13, 61)],
      search: ''
    });

    expect(view.products).toHaveLength(61);
    expect(view.countLabel).toBe('61 products');
    expect(view.showLoadMore).toBe(false);
  });

  it('counts matches rather than products while searching', () => {
    const view = buildCatalogView({ ...idle, pages: [makePage(1, 3, 3)], search: 'tee' });

    expect(view.countLabel).toBe('3 matches');
    expect(view.hintLabel).toBe('Searching all categories');
  });

  it('shows no all-categories hint while merely browsing', () => {
    const view = buildCatalogView({ ...idle, pages: [makePage(1, 3, 3)], search: '' });

    expect(view.hintLabel).toBe('');
  });

  it('reports a failed fetch as an error, never as an empty catalogue', () => {
    // A network blip used to render the same "No results" as a genuinely empty
    // category, so the clerk read a broken till as an empty shelf.
    const view = buildCatalogView({ pages: [], isError: true, isLoading: false, search: '' });

    expect(view.status).toBe('error');
  });

  it('keeps showing loaded products when a later page fails', () => {
    // Hiding 24 good products behind an error panel would be worse than the
    // bug being fixed. Only a total absence of content earns the error state.
    const view = buildCatalogView({ pages: [makePage(1, 24, 61)], isError: true, isLoading: false, search: '' });

    expect(view.status).toBe('grid');
    expect(view.products).toHaveLength(24);
  });

  it('names the search term when a search genuinely matches nothing', () => {
    const view = buildCatalogView({ ...idle, pages: [makePage(1, 0, 0)], search: 'ZZZ-NOPE' });

    expect(view.status).toBe('empty');
    expect(view.emptyLabel).toBe('No results for "ZZZ-NOPE"');
    expect(view.countLabel).toBe('');
  });

  it('explains an empty category without inventing a search term', () => {
    const view = buildCatalogView({ ...idle, pages: [makePage(1, 0, 0)], search: '' });

    expect(view.status).toBe('empty');
    expect(view.emptyLabel).toBe('No products in this category');
  });

  it('is loading until the first page arrives', () => {
    const view = buildCatalogView({ pages: [], isError: false, isLoading: true, search: '' });

    expect(view.status).toBe('loading');
    expect(view.countLabel).toBe('');
    expect(view.showLoadMore).toBe(false);
  });
});
