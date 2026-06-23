import { useQuery } from '@tanstack/react-query';

import posApi from '../api/posApi';
import type { ProductsResponse, RecentOrdersResponse } from '../api/posApi';
import type { POSCategory } from '../types/pos.types';

export function useProducts(filters: { category?: string; search?: string; page?: number } = {}) {
  return useQuery<ProductsResponse>({
    queryKey: ['pos-products', filters],
    queryFn: () => posApi.fetchProducts(filters),
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
