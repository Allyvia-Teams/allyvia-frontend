import type { StylesResponse } from '../api/posApi';
import type { CatalogStyle, Product, StyleVariant } from '../types/pos.types';

const ALL_CATEGORY_ID = 'all';

/**
 * The category to send with a products request.
 *
 * A search spans the whole catalogue: the backend composes category AND search,
 * so keeping the active chip would hide a garment filed under a category the
 * clerk did not expect. Clearing the box restores the chip filter.
 */
export function effectiveCategory(activeCategoryId: string, search: string): string | undefined {
  if (search.trim()) return undefined;
  return activeCategoryId === ALL_CATEGORY_ID ? undefined : activeCategoryId;
}

/** The page number to fetch after `lastPage`, or undefined when it was the last. */
export function nextPageParam(lastPage: StylesResponse): number | undefined {
  return lastPage.pagination.has_next ? lastPage.pagination.current_page + 1 : undefined;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * Everything the product grid renders, derived from the loaded style pages.
 *
 * `countLabel` always states truncation when there is any, so a partial result
 * set can never read as the whole catalogue. An error only wins when there is
 * nothing to show — a failed second page must not hide a good first one, and a
 * failed fetch must never render as the empty state.
 */
export function buildCatalogView(input: { pages: StylesResponse[]; isError: boolean; isLoading: boolean; search: string }): {
  status: 'loading' | 'error' | 'empty' | 'grid';
  styles: CatalogStyle[];
  countLabel: string;
  hintLabel: string;
  emptyLabel: string;
  showLoadMore: boolean;
  loadMoreLabel: string;
} {
  const { pages, isError, isLoading } = input;
  const search = input.search.trim();
  const searching = search.length > 0;

  const styles = pages.flatMap((page) => page.styles);
  const lastPage = pages[pages.length - 1];
  const total = lastPage?.pagination.total_items ?? 0;
  const loaded = styles.length;
  const truncated = loaded < total;

  let status: 'loading' | 'error' | 'empty' | 'grid';
  if (isLoading && pages.length === 0) {
    status = 'loading';
  } else if (isError && loaded === 0) {
    status = 'error';
  } else if (loaded === 0) {
    status = 'empty';
  } else {
    status = 'grid';
  }

  let countLabel = '';
  if (total > 0) {
    if (truncated) {
      countLabel = `Showing ${loaded} of ${total}`;
    } else {
      countLabel = searching ? plural(total, 'match', 'matches') : plural(total, 'style', 'styles');
    }
  }

  return {
    status,
    styles,
    countLabel,
    hintLabel: searching ? 'Searching all categories' : '',
    emptyLabel: searching ? `No results for "${search}"` : 'No styles in this category',
    showLoadMore: Boolean(lastPage?.pagination.has_next),
    loadMoreLabel: `Load more (${loaded} of ${total})`
  };
}

/** Cart / checkout product from a style + chosen variant. */
export function productFromVariant(style: CatalogStyle, variant: StyleVariant): Product {
  return {
    id: variant.id,
    name: style.name,
    sku: variant.sku,
    category: style.category,
    price: Number(variant.price),
    stock: Number(variant.stock),
    imageUrl: style.imageUrl,
    taxRate: Number(variant.taxRate ?? 0),
    size: variant.size,
    color: variant.color,
    styleId: style.id,
    styleName: style.name
  };
}

/** Axes label for cart / receipt lines. */
export function sizeColourLabel(product: Pick<Product, 'size' | 'color'>): string {
  const parts = [product.size, product.color].filter(Boolean);
  return parts.join(' · ');
}
