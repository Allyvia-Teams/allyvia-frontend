import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CheckoutResult, Order } from '../types/pos.types';
import posApi from '../api/posApi';

export function useCheckout(options?: {
  onSuccess?: (result: CheckoutResult) => void;
  onError?: (err: unknown) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<CheckoutResult, unknown, Omit<Order, 'id' | 'createdAt'>>({
    mutationFn: (order) => posApi.submitOrder(order),
    onSuccess: (data) => {
      // POS inventory + POS UI refresh
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      queryClient.invalidateQueries({ queryKey: ['pos-categories'] });
      queryClient.invalidateQueries({ queryKey: ['pos-recent-orders'] });

      // Integration points (expected in larger app):
      // TODO: replace with actual query keys used by Inventory / Transactions / Analytics modules.
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', 'analytics'] });

      // Inner Circle — contact stats are updated synchronously on the backend
      // during checkout, so invalidate to pick up the fresh LTV/visit data.
      queryClient.invalidateQueries({ queryKey: ['inner-circle-summary'] });
      queryClient.invalidateQueries({ queryKey: ['inner-circle-customers'] });
      queryClient.invalidateQueries({ queryKey: ['inner-circle-action-queue'] });
      queryClient.invalidateQueries({ queryKey: ['customer-detail'] });

      options?.onSuccess?.(data);
    },
    onError: (err) => {
      options?.onError?.(err);
    }
  });
}
