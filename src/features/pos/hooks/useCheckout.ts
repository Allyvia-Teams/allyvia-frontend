import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { CheckoutResult, Order } from '../types/pos.types';
import posApi from '../api/posApi';

// Every read model a settled sale touches. Shared between the cash mutation
// below and the card/terminal flow in CheckoutModal, which finalizes
// asynchronously (draft sale → reader charge → payment-status confirm) and so
// must invalidate at *payment* time, not order-creation time.
export function invalidatePosQueries(queryClient: QueryClient) {
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
  // when a sale completes, so invalidate to pick up the fresh LTV/visit data.
  queryClient.invalidateQueries({ queryKey: ['inner-circle-summary'] });
  queryClient.invalidateQueries({ queryKey: ['inner-circle-customers'] });
  queryClient.invalidateQueries({ queryKey: ['inner-circle-action-queue'] });
  queryClient.invalidateQueries({ queryKey: ['customer-detail'] });
}

// The cash mutation carries the same per-attempt key as the card flow. React
// Query retries this mutation on the caller's behalf, and a retry that is not
// keyed is indistinguishable from a second sale on the server (ALL-83).
export function useCheckout(options?: {
  onSuccess?: (result: CheckoutResult) => void;
  onError?: (err: unknown) => void;
  idempotencyKey?: () => string | undefined;
}) {
  const queryClient = useQueryClient();

  return useMutation<CheckoutResult, unknown, Omit<Order, 'id' | 'createdAt'>>({
    mutationFn: (order) => posApi.submitOrder(order, options?.idempotencyKey?.()),
    onSuccess: (data) => {
      invalidatePosQueries(queryClient);
      options?.onSuccess?.(data);
    },
    onError: (err) => {
      options?.onError?.(err);
    }
  });
}
