import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'store';

import stripeApi, { type PosRefundResult } from 'api/stripe.api';

import { invalidatePosQueries } from './useCheckout';

export interface RefundOrderInput {
  saleId: string;
  /** Major units. Omit for everything still refundable on the sale. */
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  method?: 'card' | 'store_credit' | 'cash';
}

/**
 * Take a refund at the till.
 *
 * A settled refund changes stock, the sale's status and every revenue read
 * model, so this invalidates exactly what a checkout does — a clerk who
 * refunds and then looks at Recent Orders must not see the pre-refund figure
 * and ring the return a second time.
 */
export function useRefundOrder(options?: { onSuccess?: (result: PosRefundResult) => void; onError?: (err: unknown) => void }) {
  const queryClient = useQueryClient();
  const companyId = useSelector((s) => s.auth.currentRole?.company_id) || '';

  return useMutation<PosRefundResult, unknown, RefundOrderInput>({
    mutationFn: (input) => {
      if (!companyId) {
        // Better a clear refusal than a 400 from the server with the company
        // field missing — this happens when the role hasn't loaded yet.
        return Promise.reject(new Error('No store selected. Reload and try again.'));
      }
      return stripeApi.refundPosSale({ companyId, ...input });
    },
    onSuccess: (data) => {
      invalidatePosQueries(queryClient);
      options?.onSuccess?.(data);
    },
    onError: (err) => {
      options?.onError?.(err);
    }
  });
}

export default useRefundOrder;
