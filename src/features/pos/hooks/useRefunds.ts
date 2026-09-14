import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'store';

import stripeApi, {
  type PosRefundListResponse,
  type PosRefundLineSelection,
  type PosRefundResult,
  type PosSaleRefundSummary
} from 'api/stripe.api';

import posApi, { type SalesSearchParams, type SalesSearchResponse } from '../api/posApi';
import { invalidatePosQueries } from './useCheckout';

/**
 * The refunds surface's data hooks (ALL-71 / ALL-72).
 *
 * Every key here starts with 'pos-' so `invalidatePosQueries` keeps being the
 * one place a completed sale or a settled refund fans out from. Adding a key
 * here means adding it there too.
 */

/** The returns lookup — search the sales a return could be taken against. */
export function useRefundableSales(params: SalesSearchParams, options?: { enabled?: boolean }) {
  return useQuery<SalesSearchResponse>({
    queryKey: ['pos-sales-search', params],
    queryFn: () => posApi.searchSales(params),
    // A returns lookup is a point-in-time question the clerk asked; keeping it
    // fresh for a few seconds stops a retyped character refetching the same page.
    staleTime: 5_000,
    enabled: options?.enabled !== false
  });
}

/** One receipt's return history and what is still returnable on it. */
export function useSaleRefundSummary(saleId: string | null | undefined) {
  const companyId = useSelector((s) => s.auth.currentRole?.company_id) || '';

  return useQuery<PosSaleRefundSummary>({
    queryKey: ['pos-refund-summary', companyId, saleId],
    queryFn: () => stripeApi.saleRefundSummary(companyId, String(saleId)),
    enabled: Boolean(companyId && saleId)
  });
}

/**
 * The store's refunds, newest first.
 *
 * `state` narrows to a workflow state — ['pending_approval'] is the approval
 * queue. Omit it for the full history.
 */
export function usePosRefunds(params?: { state?: string[]; limit?: number }) {
  const companyId = useSelector((s) => s.auth.currentRole?.company_id) || '';

  return useQuery<PosRefundListResponse>({
    queryKey: ['pos-refunds', companyId, params?.state ?? null, params?.limit ?? null],
    queryFn: () => stripeApi.listRefunds({ companyId, state: params?.state, limit: params?.limit }),
    enabled: Boolean(companyId)
  });
}

/**
 * Just the refunds parked awaiting a manager — what the History tab's badge counts.
 *
 * Deliberately the same endpoint and the same key family as the list above, so
 * approving one refund updates the badge and the table together.
 */
export function usePendingRefunds() {
  return usePosRefunds({ state: ['pending_approval'] });
}

/** Take a line-level return, with a disposition per line. */
export function useRefundOrderLines(options?: { onSuccess?: (result: PosRefundResult) => void; onError?: (err: unknown) => void }) {
  const queryClient = useQueryClient();
  const companyId = useSelector((s) => s.auth.currentRole?.company_id) || '';

  return useMutation<
    PosRefundResult,
    unknown,
    {
      saleId: string;
      lines: PosRefundLineSelection[];
      reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
      method?: 'card' | 'store_credit' | 'cash';
      acceptingLocationId?: string;
    }
  >({
    mutationFn: (input) => {
      if (!companyId) {
        return Promise.reject(new Error('No store selected. Reload and try again.'));
      }
      return stripeApi.refundPosSaleLines({ companyId, ...input });
    },
    onSuccess: (data) => {
      invalidatePosQueries(queryClient);
      options?.onSuccess?.(data);
    },
    onError: (err) => options?.onError?.(err)
  });
}

/**
 * Approve a refund parked in `pending_approval`.
 *
 * Authorizes off the CALLER's own session: the server requires
 * `pos.refund.approve` and a different identity from the initiator, and
 * answers 403 `same_identity` when the same person tries both halves.
 */
export function useApproveRefund(options?: { onSuccess?: (result: PosRefundResult) => void; onError?: (err: unknown) => void }) {
  const queryClient = useQueryClient();
  const companyId = useSelector((s) => s.auth.currentRole?.company_id) || '';

  return useMutation<PosRefundResult, unknown, { refundId: string; note?: string }>({
    mutationFn: (input) => {
      if (!companyId) {
        return Promise.reject(new Error('No store selected. Reload and try again.'));
      }
      return stripeApi.approveRefund({ companyId, ...input });
    },
    onSuccess: (data) => {
      invalidatePosQueries(queryClient);
      options?.onSuccess?.(data);
    },
    onError: (err) => options?.onError?.(err)
  });
}

/** Withdraw a refund that has not reached Stripe; reserved units are released. */
export function useCancelRefund(options?: { onSuccess?: (result: PosRefundResult) => void; onError?: (err: unknown) => void }) {
  const queryClient = useQueryClient();
  const companyId = useSelector((s) => s.auth.currentRole?.company_id) || '';

  return useMutation<PosRefundResult, unknown, { refundId: string; reason?: string }>({
    mutationFn: (input) => {
      if (!companyId) {
        return Promise.reject(new Error('No store selected. Reload and try again.'));
      }
      return stripeApi.cancelRefund({ companyId, ...input });
    },
    onSuccess: (data) => {
      invalidatePosQueries(queryClient);
      options?.onSuccess?.(data);
    },
    onError: (err) => options?.onError?.(err)
  });
}
