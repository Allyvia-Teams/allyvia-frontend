import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

import { REFUND_DISPOSITIONS, REFUND_DISPOSITION_LABELS, type RefundDisposition } from 'api/refundDispositions';
import type { PosRefundResult } from 'api/stripe.api';

import type { Order } from '../types/pos.types';
import { useRefundOrder } from '../hooks/useRefundOrder';
import { useRefundOrderLines, useSaleRefundSummary } from '../hooks/useRefunds';
import {
  buildRefundLineDrafts,
  canSubmitLineRefund,
  isLineReturnable,
  refundSubtotal,
  selectedUnitCount,
  setLineDisposition,
  setLineQuantity,
  toRefundLineSelections,
  type RefundLineDraft
} from '../utils/refundLines';
import { refundEligibility, refundErrorCopy, refundResultCopy, restockingFeeLine } from '../utils/refundView';
import RefundApprovalActions from './RefundApprovalActions';

export interface RefundDialogProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
}

type Mode = 'whole' | 'lines';

/**
 * The one refund dialog.
 *
 * Used by BOTH the Recent Orders drawer at the till and the Refunds page's
 * returns lookup, because they are the same act: the drawer found the sale in
 * the last ten, the lookup found it by receipt number, and after that the
 * clerk is doing the identical thing. Two dialogs would drift, and the one
 * that drifts is the one that handles money.
 *
 * Whole-sale mode is the till's existing behaviour, unchanged. Line mode is
 * what the backend has supported all along and nothing could reach.
 */
export default function RefundDialog({ open, order, onClose }: RefundDialogProps) {
  const [mode, setMode] = useState<Mode>('whole');
  const [lines, setLines] = useState<RefundLineDraft[]>([]);
  const [result, setResult] = useState<PosRefundResult | null>(null);
  const [errorCopy, setErrorCopy] = useState<string | null>(null);

  // Reset whenever a different sale is opened, so the previous return's
  // selection and result cannot bleed onto this receipt.
  useEffect(() => {
    if (!open || !order) return;
    setMode('whole');
    setLines(buildRefundLineDrafts(order.items));
    setResult(null);
    setErrorCopy(null);
  }, [open, order]);

  const onSuccess = (data: PosRefundResult) => {
    setResult(data);
    setErrorCopy(null);
  };
  const onError = (err: unknown) => {
    setErrorCopy(refundErrorCopy(err));
    setResult(null);
  };

  const wholeRefund = useRefundOrder({ onSuccess, onError });
  const lineRefund = useRefundOrderLines({ onSuccess, onError });

  const isPending = wholeRefund.isPending || lineRefund.isPending;
  const eligibility = order ? refundEligibility(order) : { canRefund: false, reason: '' };

  // A refund parked for a manager keeps the dialog open on its own panel —
  // the clerk must not read "done" and hand the goods over.
  const awaitingApproval = result?.state === 'pending_approval';

  const returnableLines = useMemo(() => lines.filter(isLineReturnable), [lines]);
  const selectedUnits = selectedUnitCount(lines);
  const estimate = refundSubtotal(lines);

  const submit = () => {
    if (!order) return;
    setErrorCopy(null);
    if (mode === 'whole') {
      wholeRefund.mutate({ saleId: order.id });
    } else {
      lineRefund.mutate({ saleId: order.id, lines: toRefundLineSelections(lines) });
    }
  };

  const close = () => {
    if (isPending) return;
    onClose();
  };

  const feeLine = result ? restockingFeeLine(result) : null;

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle>
        {awaitingApproval ? 'Needs manager approval' : 'Refund this order?'}
        {order?.receiptNumber ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Receipt {order.receiptNumber}
          </Typography>
        ) : null}
      </DialogTitle>

      <DialogContent dividers>
        {awaitingApproval && result ? (
          <ApprovalPanel result={result} onDone={onClose} />
        ) : (
          <>
            {!eligibility.canRefund && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {eligibility.reason}
              </Alert>
            )}

            <ToggleButtonGroup
              exclusive
              size="small"
              value={mode}
              onChange={(_e, next: Mode | null) => next && setMode(next)}
              sx={{ mb: 2 }}
              disabled={isPending || Boolean(result)}
            >
              <ToggleButton value="whole">Whole sale</ToggleButton>
              <ToggleButton value="lines" disabled={returnableLines.length === 0}>
                Return specific items
              </ToggleButton>
            </ToggleButtonGroup>

            {mode === 'whole' ? (
              <DialogContentText>
                {order ? `Return $${order.total.toFixed(2)} for order #${order.id} to the original card. This cannot be undone here.` : ''}
              </DialogContentText>
            ) : (
              <Box>
                {lines.map((line) => (
                  <LineRow
                    key={line.lineId}
                    line={line}
                    disabled={isPending || Boolean(result)}
                    onQuantity={(qty) => setLines((prev) => setLineQuantity(prev, line.lineId, qty))}
                    onDisposition={(d) => setLines((prev) => setLineDisposition(prev, line.lineId, d))}
                  />
                ))}

                <Divider sx={{ my: 1.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" fontWeight={800}>
                    {selectedUnits} {selectedUnits === 1 ? 'item' : 'items'} selected
                  </Typography>
                  <Typography variant="body2" fontWeight={900}>
                    ~${estimate.toFixed(2)}
                  </Typography>
                </Box>
                {/* Labelled an estimate on purpose: the server recomputes from
                    its own prices and subtracts any restocking fee, and tax and
                    per-line discounts are not modelled here. */}
                <Typography variant="caption" color="text.secondary">
                  Estimate before tax and any restocking fee — the receipt shows the exact amount.
                </Typography>
              </Box>
            )}

            {result && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {refundResultCopy(result)}
                {feeLine && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {feeLine}
                  </Typography>
                )}
              </Alert>
            )}
            {errorCopy && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errorCopy}
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      {!awaitingApproval && (
        <DialogActions>
          <Button onClick={close} disabled={isPending}>
            {result ? 'Done' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              variant="contained"
              color="error"
              disabled={isPending || !eligibility.canRefund || (mode === 'lines' && !canSubmitLineRefund(lines))}
              startIcon={isPending ? <CircularProgress size={14} /> : undefined}
              onClick={submit}
            >
              {isPending ? 'Refunding…' : 'Refund'}
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
}

/** One returnable line: a capped stepper and a one-tap disposition chip row. */
function LineRow({
  line,
  disabled,
  onQuantity,
  onDisposition
}: {
  line: RefundLineDraft;
  disabled: boolean;
  onQuantity: (qty: number) => void;
  onDisposition: (d: RefundDisposition) => void;
}) {
  const returnable = isLineReturnable(line);

  return (
    <Box sx={{ py: 1, opacity: returnable ? 1 : 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={800} noWrap>
            {line.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {line.sku} · ${line.unitPrice.toFixed(2)} each ·{' '}
            {returnable ? `${line.refundableQuantity} of ${line.quantity} returnable` : `all ${line.quantity} already returned`}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            size="small"
            aria-label={`Return one fewer ${line.name}`}
            disabled={disabled || !returnable || line.selectedQuantity <= 0}
            onClick={() => onQuantity(line.selectedQuantity - 1)}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2" fontWeight={900} sx={{ minWidth: 20, textAlign: 'center' }}>
            {line.selectedQuantity}
          </Typography>
          {/* Capped at the server's refundableQuantity — the + button simply
              stops rather than letting a clerk submit an over-refund. */}
          <IconButton
            size="small"
            aria-label={`Return one more ${line.name}`}
            disabled={disabled || !returnable || line.selectedQuantity >= line.refundableQuantity}
            onClick={() => onQuantity(line.selectedQuantity + 1)}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {returnable && line.selectedQuantity > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
          {REFUND_DISPOSITIONS.map((d) => (
            <Chip
              key={d}
              size="small"
              label={REFUND_DISPOSITION_LABELS[d]}
              color={line.disposition === d ? 'primary' : 'default'}
              variant={line.disposition === d ? 'filled' : 'outlined'}
              onClick={disabled ? undefined : () => onDisposition(d)}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

/**
 * The panel a parked refund lands on.
 *
 * The approve/cancel endpoints are keyed by OUR refund row id, which the
 * create response does not carry (its `refund_id` is Stripe's, and is null for
 * a refund that has not been sent). So the row is resolved from the sale's
 * summary, which does return it.
 *
 * Approval authorizes off the CALLER's own session — there is no step-up
 * mechanism in this app to sign a second manager in here, so a manager
 * approves from their own login, either on this screen or from Refunds →
 * Awaiting approval. The same person who rang it gets 403 `same_identity`,
 * and the copy for that says so plainly rather than blaming permissions.
 */
function ApprovalPanel({ result, onDone }: { result: PosRefundResult; onDone: () => void }) {
  const summary = useSaleRefundSummary(result.sale_id);

  // /approve and /cancel are keyed by OUR refund row id, which the create
  // response does not carry — its `refund_id` is Stripe's, and is null
  // precisely while a refund is parked. The summary endpoint does return it.
  const pending = summary.data?.refunds.find((r) => r.state === 'pending_approval');

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        {refundResultCopy(result)}
      </Alert>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Nothing has been sent to the card yet and no goods should be handed over. A manager with refund-approval permission can approve it
        here from their own login, or from Refunds → Awaiting approval.
      </Typography>

      {summary.isLoading && <CircularProgress size={18} />}
      {summary.isError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Couldn&apos;t load this refund&apos;s details. It is still saved and waiting — find it under Refunds → Awaiting approval.
        </Alert>
      )}

      <RefundApprovalActions
        refundId={pending?.id ?? null}
        loading={summary.isLoading}
        trailing={<Button onClick={onDone}>Close</Button>}
      />
    </Box>
  );
}
