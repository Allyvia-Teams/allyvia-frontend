import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import posApi from '../api/posApi';
import type { RecentOrdersResponse } from '../api/posApi';
import type { POSCategory } from '../types/pos.types';
import { nextPageParam } from '../utils/catalogView';

/**
 * The product grid, one page at a time.
 *
 * `category` and `search` are both in the query key: changing either starts a
 * fresh accumulation rather than appending the new results to the old ones.
 * Pass an already-debounced search term — a key change per keystroke would burn
 * a request and a cache entry each time.
 */
export function useProductsInfinite(filters: { category?: string; search?: string } = {}) {
  const category = filters.category || undefined;
  const search = filters.search?.trim() || undefined;

  return useInfiniteQuery({
    queryKey: ['pos-products', { category, search }],
    queryFn: ({ pageParam }) => posApi.fetchProducts({ category, search, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    staleTime: 30_000
  });
}

export function useCategories() {
  return useQuery<POSCategory[]>({
    queryKey: ['pos-categories'],
    queryFn: () => posApi.fetchCategories(),
    staleTime: 30_000
  });
}

export function useRecentOrders() {
  return useQuery<RecentOrdersResponse>({
    queryKey: ['pos-recent-orders'],
    queryFn: () => posApi.fetchRecentOrders()
  });
}
