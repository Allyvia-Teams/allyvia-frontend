import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import MainCard from 'ui-component/cards/MainCard';

import type { Order } from './types/pos.types';
import RefundApprovalActions from './components/RefundApprovalActions';
import RefundDialog from './components/RefundDialog';
import { usePendingRefunds, usePosRefunds, useRefundableSales, useSaleRefundSummary } from './hooks/useRefunds';
import { buildRefundHistoryView, buildSalesSearchView } from './utils/refundSearchView';
import { refundStateChip } from './utils/refundView';

const money = (major: number) => `$${major.toFixed(2)}`;
const moneyMinor = (minor: number) => `$${(minor / 100).toFixed(2)}`;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Units already handed back on a sale, across every line. */
const returnedSoFar = (order: Order) => order.items.reduce((sum, line) => sum + (line.returnedQuantity ?? 0), 0);

/**
 * The Refunds screen (ALL-71 / ALL-72).
 *
 * Until this existed the only route to a refund was POS → Recent Orders →
 * expand a row, over the last ten sales. The eleventh receipt was unrefundable
 * and everything the backend could do — line-level returns, dispositions,
 * approval, history — had no client at all.
 */
export default function RefundsPage() {
  const [tab, setTab] = useState(0);
  const pending = usePendingRefunds();
  const pendingCount = pending.data?.count ?? 0;

  return (
    <MainCard
      title="Refunds"
      secondary={pendingCount > 0 ? <Chip size="small" color="warning" label={`${pendingCount} awaiting approval`} /> : undefined}
    >
      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Take a return" />
        <Tab
          label={
            <Badge badgeContent={pendingCount} color="warning" sx={{ pr: pendingCount > 0 ? 1.5 : 0 }}>
              History
            </Badge>
          }
        />
      </Tabs>

      {tab === 0 ? <TakeAReturnTab /> : <HistoryTab />}
    </MainCard>
  );
}

/** Find the sale a customer is returning against, then open the shared dialog. */
function TakeAReturnTab() {
  const [rawQuery, setRawQuery] = useState('');
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [refundableOnly, setRefundableOnly] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);

  // Debounced so a scanned barcode is one request, not one per character.
  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery), 350);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const hasQuery = Boolean(query.trim() || dateFrom || dateTo);
  const params = useMemo(
    () => ({
      q: query.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      refundable: refundableOnly,
      limit: 25
    }),
    [query, dateFrom, dateTo, refundableOnly]
  );

  const { data, isLoading, isError, refetch } = useRefundableSales(params, { enabled: hasQuery });
  const view = buildSalesSearchView({ items: data?.items ?? [], isLoading, isError, hasQuery });

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ md: 'center' }}>
        <TextField
          label="Receipt number or customer"
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
          size="small"
          fullWidth
          autoFocus
        />
        <TextField
          label="From"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="To"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <FormControlLabel
          control={<Switch checked={refundableOnly} onChange={(e) => setRefundableOnly(e.target.checked)} />}
          label="Refundable only"
          sx={{ whiteSpace: 'nowrap' }}
        />
      </Stack>

      {view.status === 'idle' && (
        <Typography variant="body2" color="text.secondary">
          {view.idleLabel}
        </Typography>
      )}
      {view.status === 'loading' && <CircularProgress size={20} />}
      {/* Distinct from empty on purpose: a failed search rendering as "no
          sales match" sends a customer away with goods they are owed for. */}
      {view.status === 'error' && (
        <Box>
          <Alert severity="error" sx={{ mb: 1 }}>
            {view.errorLabel}
          </Alert>
          <Button size="small" variant="outlined" onClick={() => refetch()}>
            Retry
          </Button>
        </Box>
      )}
      {view.status === 'empty' && (
        <Typography variant="body2" color="text.secondary">
          {view.emptyLabel}
        </Typography>
      )}

      {view.status === 'list' && (
        <>
          {view.isStale && (
            <Alert
              severity="warning"
              sx={{ mb: 1 }}
              action={
                <Button size="small" onClick={() => refetch()}>
                  Retry
                </Button>
              }
            >
              These results may be out of date — the last refresh failed.
            </Alert>
          )}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Receipt</TableCell>
                <TableCell>Business date</TableCell>
                <TableCell>Location</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Returned so far</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {view.sales.map((sale) => {
                const returned = returnedSoFar(sale);
                return (
                  <TableRow key={sale.id} hover>
                    <TableCell sx={{ fontWeight: 800 }}>{sale.receiptNumber || sale.id.slice(0, 8)}</TableCell>
                    <TableCell>{shortDate(sale.transactionDate || sale.createdAt)}</TableCell>
                    {/* Blank, not "Default", when the sale predates locations. */}
                    <TableCell>{sale.locationName || '—'}</TableCell>
                    <TableCell align="right">{money(sale.total)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={sale.status.replace(/_/g, ' ')} variant="outlined" />
                    </TableCell>
                    <TableCell align="right">{returned > 0 ? `${returned} item${returned === 1 ? '' : 's'}` : '—'}</TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" onClick={() => setSelected(sale)}>
                        Return
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </>
      )}

      <RefundDialog open={selected !== null} order={selected} onClose={() => setSelected(null)} />
    </Box>
  );
}

/** Every refund taken at this store, newest first, with its event trail. */
function HistoryTab() {
  const [pendingOnly, setPendingOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = usePosRefunds(pendingOnly ? { state: ['pending_approval'] } : undefined);
  const view = buildRefundHistoryView({ items: data?.refunds ?? [], isLoading, isError, pendingOnly });

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Chip
          label="Awaiting approval"
          color={pendingOnly ? 'warning' : 'default'}
          variant={pendingOnly ? 'filled' : 'outlined'}
          onClick={() => setPendingOnly((p) => !p)}
        />
      </Stack>

      {view.status === 'loading' && <CircularProgress size={20} />}
      {/* Never "no refunds": that reads as "this receipt was never refunded"
          and the clerk refunds it a second time. */}
      {view.status === 'error' && (
        <Box>
          <Alert severity="error" sx={{ mb: 1 }}>
            {view.errorLabel}
          </Alert>
          <Button size="small" variant="outlined" onClick={() => refetch()}>
            Retry
          </Button>
        </Box>
      )}
      {view.status === 'empty' && (
        <Typography variant="body2" color="text.secondary">
          {view.emptyLabel}
        </Typography>
      )}

      {view.status === 'list' && (
        <>
          {view.isStale && (
            <Alert
              severity="warning"
              sx={{ mb: 1 }}
              action={
                <Button size="small" onClick={() => refetch()}>
                  Retry
                </Button>
              }
            >
              This list may be out of date — the last refresh failed.
            </Alert>
          )}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Receipt</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Taken by</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {view.refunds.map((refund) => {
                const chip = refundStateChip(refund.state);
                const isOpen = expanded === refund.id;
                return (
                  <React.Fragment key={refund.id}>
                    <TableRow hover>
                      <TableCell>{dateTime(refund.created_at)}</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{refund.sale_receipt_number || '—'}</TableCell>
                      <TableCell align="right">{moneyMinor(refund.amount)}</TableCell>
                      <TableCell>{refund.method.replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        <Chip size="small" label={chip.label} color={chip.color} />
                      </TableCell>
                      <TableCell>{refund.initiated_by_email || '—'}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                          {/* The queue has to be able to act, not just list.
                              Approval authorizes off the CALLER's session, so a
                              manager approving from their own login does it
                              here — this is the primary ALL-72 flow. */}
                          {refund.state === 'pending_approval' && <RefundApprovalActions refundId={refund.id} size="small" />}
                          <Button
                            size="small"
                            endIcon={
                              <ExpandMoreIcon sx={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
                            }
                            onClick={() => setExpanded(isOpen ? null : refund.id)}
                          >
                            Trail
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 0, borderBottom: isOpen ? undefined : 'none' }}>
                        <Collapse in={isOpen} timeout={200} unmountOnExit>
                          <Box sx={{ py: 1.5 }}>
                            <EventTrail saleId={refund.sale_id} refundId={refund.id} />
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </>
      )}
    </Box>
  );
}

/**
 * One refund's transitions, from the sale summary endpoint.
 *
 * The list row carries only the CURRENT state; RefundEvent carries what
 * happened and who did it — including system transitions, which name
 * themselves ("webhook:refund.failed") so "who did this" always has an answer.
 */
function EventTrail({ saleId, refundId }: { saleId: string | null; refundId: string }) {
  const { data, isLoading, isError } = useSaleRefundSummary(saleId);

  if (isLoading) return <CircularProgress size={16} />;
  if (isError) return <Alert severity="warning">Couldn&apos;t load this refund&apos;s history.</Alert>;

  const refund = data?.refunds.find((r) => r.id === refundId);
  if (!refund || refund.events.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        No recorded transitions for this refund.
      </Typography>
    );
  }

  return (
    <Stack spacing={0.5}>
      {refund.events.map((event) => (
        <Box key={event.sequence} sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 130 }}>
            {dateTime(event.created_at)}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {refundStateChip(event.from_state).label} → {refundStateChip(event.to_state).label}
          </Typography>
          <Divider orientation="vertical" flexItem />
          <Typography variant="caption" color="text.secondary">
            {event.actor || 'system'}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
