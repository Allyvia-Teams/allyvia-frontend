import React, { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack } from '@mui/material';

import { useApproveRefund, useCancelRefund } from '../hooks/useRefunds';
import { isSameIdentityError, refundErrorCopy, refundResultCopy } from '../utils/refundView';

export interface RefundApprovalActionsProps {
  /** OUR StripeRefund row id — not Stripe's refund_id, which is null while parked. */
  refundId: string | null;
  size?: 'small' | 'medium';
  /** Shown while the row id is still being resolved. */
  loading?: boolean;
  /** Rendered to the right of the actions (the dialog puts its Close button here). */
  trailing?: React.ReactNode;
}

/**
 * Approve or refuse one parked refund.
 *
 * Shared by the dialog's "Needs manager approval" panel and the Refunds page's
 * Awaiting-approval queue, because they are the same two buttons against the
 * same endpoints. The queue is the one that matters: approval authorizes off
 * the CALLER's session, and there is no step-up mechanism in this app to sign a
 * second manager in inside the dialog, so the real flow is a manager opening
 * the queue under their own login. A panel that tells them to do that while the
 * queue offers no way to act is worse than not mentioning it.
 *
 * `same_identity` is shown as a warning rather than an error: in a two-person
 * flow, the person who rang the sale being refused is the system working, not
 * a fault. The severity is decided by the server's `code` via
 * `isSameIdentityError`, never by matching the copy.
 */
export default function RefundApprovalActions({ refundId, size = 'medium', loading = false, trailing }: RefundApprovalActionsProps) {
  const [notice, setNotice] = useState<{ text: string; severity: 'info' | 'warning' | 'error' } | null>(null);

  const approve = useApproveRefund({
    onSuccess: (data) => setNotice({ text: refundResultCopy(data), severity: 'info' }),
    onError: (err) => setNotice({ text: refundErrorCopy(err), severity: isSameIdentityError(err) ? 'warning' : 'error' })
  });
  const cancel = useCancelRefund({
    onSuccess: () => setNotice({ text: 'Refund canceled. The goods have been released back to stock.', severity: 'info' }),
    onError: (err) => setNotice({ text: refundErrorCopy(err), severity: 'error' })
  });

  const busy = approve.isPending || cancel.isPending;
  const ready = Boolean(refundId) && !loading;

  return (
    <Box>
      {notice && (
        <Alert severity={notice.severity} sx={{ mb: 1.5 }} onClose={() => setNotice(null)}>
          {notice.text}
        </Alert>
      )}
      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          variant="contained"
          size={size}
          disabled={!ready || busy}
          startIcon={approve.isPending ? <CircularProgress size={14} /> : undefined}
          onClick={() => refundId && approve.mutate({ refundId })}
        >
          {approve.isPending ? 'Approving…' : 'Approve'}
        </Button>
        <Button
          color="error"
          size={size}
          disabled={!ready || busy}
          startIcon={cancel.isPending ? <CircularProgress size={14} /> : undefined}
          onClick={() => refundId && cancel.mutate({ refundId })}
        >
          {cancel.isPending ? 'Canceling…' : 'Refuse'}
        </Button>
        {trailing ? (
          <>
            <Box sx={{ flex: 1 }} />
            {trailing}
          </>
        ) : null}
      </Stack>
    </Box>
  );
}
