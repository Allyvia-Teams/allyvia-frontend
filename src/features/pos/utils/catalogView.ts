import type { ProductsResponse } from '../api/posApi';
import type { Product } from '../types/pos.types';

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
export function nextPageParam(lastPage: ProductsResponse): number | undefined {
  return lastPage.pagination.has_next ? lastPage.pagination.current_page + 1 : undefined;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * Everything the product grid renders, derived from the loaded pages.
 *
 * `countLabel` always states truncation when there is any, so a partial result
 * set can never read as the whole catalogue. An error only wins when there is
 * nothing to show — a failed second page must not hide a good first one, and a
 * failed fetch must never render as the empty state.
 */
export function buildCatalogView(input: { pages: ProductsResponse[]; isError: boolean; isLoading: boolean; search: string }): {
  status: 'loading' | 'error' | 'empty' | 'grid';
  products: Product[];
  countLabel: string;
  hintLabel: string;
  emptyLabel: string;
  showLoadMore: boolean;
  loadMoreLabel: string;
} {
  const { pages, isError, isLoading } = input;
  const search = input.search.trim();
  const searching = search.length > 0;

  const products = pages.flatMap((page) => page.items);
  const lastPage = pages[pages.length - 1];
  const total = lastPage?.pagination.total_items ?? 0;
  const loaded = products.length;
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
      countLabel = searching ? plural(total, 'match', 'matches') : plural(total, 'product', 'products');
    }
  }

  return {
    status,
    products,
    countLabel,
    hintLabel: searching ? 'Searching all categories' : '',
    emptyLabel: searching ? `No results for "${search}"` : 'No products in this category',
    showLoadMore: Boolean(lastPage?.pagination.has_next),
    loadMoreLabel: `Load more (${loaded} of ${total})`
  };
}
