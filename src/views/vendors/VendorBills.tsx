import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { vendorBillsAPI as api } from 'api/vendorBills.api';
import type { Vendor } from 'types/vendor';
import type { BillLine, BillPayState, BillTreatment, VendorBill, VendorBillInput } from 'types/vendorBills';
import { billAmount, validateBill, validatePayment } from './vendorBillForm';
import { pendingPaymentStore } from './vendorBillPending';

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const treatments: [BillTreatment, string][] = [
  ['operating_expense', 'Operating expense'],
  ['inventory', 'Inventory'],
  ['fixed_asset', 'Equipment / fixed asset'],
  ['prepaid', 'Prepaid expense'],
  ['deposit', 'Deposit'],
  ['liability', 'Liability settlement'],
  ['transfer', 'Transfer']
];
const newLine = (): BillLine => ({ description: '', category: '', treatment: 'operating_expense', amount: '' });
const failure = (error: unknown): string => {
  const response = (error as { response?: { data?: unknown } }).response?.data;
  if (typeof response === 'string') return response;
  if (response && typeof response === 'object') return Object.values(response).flat().join(' ');
  return 'Could not complete the request. Your bill is preserved; retry to check its status.';
};

export default function VendorBills({
  vendor,
  company,
  isAdmin,
  onClose
}: {
  vendor: Vendor;
  company: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<BillPayState | null>(null);
  const [selected, setSelected] = useState<VendorBill | null>(null);
  const [form, setForm] = useState<VendorBillInput | null>(null);
  const [editId, setEditId] = useState<string>();
  const [operation, setOperation] = useState<'record-payment' | 'credit' | 'pay' | 'void' | null>(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(today());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);
  const operationKey = useRef('');
  const pendingStore = pendingPaymentStore(window.localStorage);
  const pending = selected ? pendingStore.read(company, selected.id) : null;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const [list, status] = await Promise.all([api.list(company, vendor.id, page), api.state(company)]);
    if (!alive.current) return;
    setBills(list.results);
    setCount(list.count);
    setState(status);
  }, [company, vendor.id, page]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    refresh()
      .catch((e) => {
        if (active) setError(failure(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (e) {
      if (alive.current) setError(failure(e));
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const openBill = (id: string) =>
    run(async () => {
      const bill = await api.detail(company, id);
      if (alive.current) {
        setSelected(bill);
        setForm(null);
      }
    });
  const reloadSelected = async () => {
    if (selected) {
      const next = await api.detail(company, selected.id);
      if (alive.current) setSelected(next);
    }
    await refresh();
  };
  const startForm = (bill?: VendorBill) => {
    setEditId(bill?.id);
    setSelected(null);
    setError('');
    setForm(
      bill
        ? {
            vendor_id: vendor.id,
            invoice_number: bill.invoice_number,
            bill_date: bill.bill_date,
            due_date: bill.due_date,
            lines: bill.lines.map((line) => ({ ...line })),
            memo: bill.memo
          }
        : { vendor_id: vendor.id, invoice_number: '', bill_date: today(), due_date: today(), lines: [newLine()], memo: '' }
    );
  };
  const save = () => {
    if (!form) return;
    const message = validateBill(
      form.invoice_number,
      form.bill_date,
      form.due_date,
      form.lines.map((line) => line.amount)
    );
    if (message || form.lines.some((line) => !line.category.trim() || !line.description.trim())) {
      setError(message || 'Add a description and category for every line.');
      return;
    }
    void run(async () => {
      const saved = await api.save(company, form, editId);
      if (!alive.current) return;
      setForm(null);
      setSelected(saved);
      await refresh();
    });
  };
  const begin = (action: typeof operation) => {
    const saved = selected ? pendingStore.read(company, selected.id) : null;
    if (saved) {
      setOperation(saved.action);
      setAmount(saved.body.amount);
      setReference(saved.body.reference ?? saved.body.reason ?? '');
      setPaymentDate(saved.body.paid_date ?? saved.body.scheduled_date ?? today());
      operationKey.current = saved.body.idempotency_key;
      setError('');
      return;
    }
    setOperation(action);
    setAmount(selected?.remaining ?? '');
    setReference('');
    setPaymentDate(today());
    setError('');
    operationKey.current = crypto.randomUUID();
  };
  const confirm = () => {
    if (!selected || !operation) return;
    if (operation !== 'void' && !pending) {
      const message = validatePayment(amount, selected.remaining, operation === 'pay' ? today() : paymentDate, today());
      if (message) {
        setError(message);
        return;
      }
    }
    if (operation !== 'pay' && !reference.trim()) {
      setError('Enter a reference or reason.');
      return;
    }
    void run(async () => {
      const body: Record<string, string> =
        operation === 'void'
          ? { reason: reference }
          : {
              amount,
              idempotency_key: operationKey.current,
              ...(operation === 'record-payment'
                ? { paid_date: paymentDate, reference }
                : operation === 'credit'
                  ? { reason: reference }
                  : { scheduled_date: paymentDate })
            };
      const submission = pending ?? (operation === 'void' ? null : { action: operation, body });
      if (submission) pendingStore.save(company, selected.id, submission);
      try {
        await api.action(company, selected.id, submission?.action ?? operation, submission?.body ?? body);
      } catch (err) {
        const status = (err as { response?: { status?: number } }).response?.status;
        if (status && [400, 403, 404, 409].includes(status)) pendingStore.clear(company, selected.id);
        throw err;
      }
      pendingStore.clear(company, selected.id);
      if (!alive.current) return;
      setOperation(null);
      await reloadSelected();
    });
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{vendor.name} · Bills & payments</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          {state && !state.payments_enabled && <Alert severity="info">{state.reason}</Alert>}
          {loading ? (
            <CircularProgress aria-label="Loading vendor bills" />
          ) : (
            <>
              <Stack direction="row" spacing={1} justifyContent="space-between">
                <Typography variant="body2">{count} bills · USD</Typography>
                <Stack direction="row" spacing={1}>
                  <Button disabled={busy} onClick={() => void run(refresh)}>
                    Refresh
                  </Button>
                  {isAdmin && (
                    <Button variant="contained" disabled={busy} onClick={() => startForm()}>
                      Add bill
                    </Button>
                  )}
                </Stack>
              </Stack>
              <Table size="small" aria-label="Vendor bills">
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice</TableCell>
                    <TableCell>Due</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Outstanding</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell>{bill.invoice_number}</TableCell>
                      <TableCell>{bill.due_date}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={bill.overdue ? 'error' : 'default'}
                          label={bill.overdue ? 'Overdue' : bill.status.replace('_', ' ')}
                        />
                      </TableCell>
                      <TableCell align="right">${bill.amount}</TableCell>
                      <TableCell align="right">${bill.remaining}</TableCell>
                      <TableCell>
                        <Button disabled={busy} onClick={() => void openBill(bill.id)}>
                          View bill
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!bills.length && (
                    <TableRow>
                      <TableCell colSpan={6}>No bills yet. Add an invoice to track what you owe this vendor.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {count > 50 && (
                <Pagination count={Math.ceil(count / 50)} page={page} onChange={(_, value) => setPage(value)} disabled={busy} />
              )}
            </>
          )}
          {form && (
            <Box
              component="form"
              onSubmit={(event) => {
                event.preventDefault();
                save();
              }}
            >
              <Stack spacing={2}>
                <Divider />
                <Typography variant="h4">{editId ? 'Edit draft' : 'New bill'}</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Vendor invoice number"
                    required
                    value={form.invoice_number}
                    onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                  />
                  <TextField
                    label="Bill date"
                    type="date"
                    value={form.bill_date}
                    onChange={(e) => setForm({ ...form, bill_date: e.target.value })}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    label="Due date"
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>
                {form.lines.map((line, index) => {
                  const change = (patch: Partial<BillLine>) =>
                    setForm({ ...form, lines: form.lines.map((existing, i) => (i === index ? { ...existing, ...patch } : existing)) });
                  return (
                    <Stack key={index} direction={{ xs: 'column', md: 'row' }} spacing={1}>
                      <TextField
                        label={`Line ${index + 1} description`}
                        required
                        value={line.description}
                        onChange={(e) => change({ description: e.target.value })}
                      />
                      <TextField
                        label="Category"
                        required
                        placeholder="e.g. Rent, Merchandise"
                        value={line.category}
                        onChange={(e) => change({ category: e.target.value })}
                      />
                      <TextField
                        select
                        label="Accounting treatment"
                        value={line.treatment}
                        onChange={(e) => change({ treatment: e.target.value as BillTreatment })}
                        sx={{ minWidth: 190 }}
                      >
                        {treatments.map(([value, label]) => (
                          <MenuItem key={value} value={value}>
                            {label}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        label="Amount (USD)"
                        value={line.amount}
                        onChange={(e) => change({ amount: e.target.value })}
                        slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                      />
                      {form.lines.length > 1 && (
                        <Button onClick={() => setForm({ ...form, lines: form.lines.filter((_, i) => i !== index) })}>Remove</Button>
                      )}
                    </Stack>
                  );
                })}
                <Button disabled={form.lines.length >= 100} onClick={() => setForm({ ...form, lines: [...form.lines, newLine()] })}>
                  Add line
                </Button>
                <TextField label="Memo" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
                <Typography>
                  Total: ${billAmount(form.lines.map((line) => line.amount)) ?? '—'} USD. Attach the invoice after saving.
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button type="submit" variant="contained" disabled={busy}>
                    Save draft
                  </Button>
                  <Button disabled={busy} onClick={() => setForm(null)}>
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}
          {selected && (
            <Stack spacing={2}>
              <Divider />
              <Typography variant="h4">{selected.invoice_number}</Typography>
              <Typography>
                Bill ${selected.amount} · Paid ${selected.paid} · Credits ${selected.credited} · Reserved ${selected.reserved} · Outstanding
                ${selected.remaining}
              </Typography>
              {selected.lines.map((line, i) => (
                <Typography key={i} variant="body2">
                  {line.description} · {line.category} · {line.treatment.replaceAll('_', ' ')} · ${line.amount}
                </Typography>
              ))}
              {selected.memo && <Typography variant="body2">{selected.memo}</Typography>}
              {isAdmin && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {pending && (
                    <Button disabled={busy} onClick={() => begin(pending.action)}>
                      Resolve pending payment record
                    </Button>
                  )}
                  {selected.status === 'draft' && (
                    <>
                      <Button disabled={busy} onClick={() => startForm(selected)}>
                        Edit draft
                      </Button>
                      <Button
                        variant="contained"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await api.action(company, selected.id, 'approve');
                            await reloadSelected();
                          })
                        }
                      >
                        Approve bill
                      </Button>
                    </>
                  )}
                  {['open', 'partially_paid'].includes(selected.status) && (
                    <>
                      <Button variant="contained" disabled={busy || !state?.payments_enabled} onClick={() => begin('pay')}>
                        Pay from Stripe balance
                      </Button>
                      <Button disabled={busy} onClick={() => begin('record-payment')}>
                        Record external payment
                      </Button>
                      <Button disabled={busy} onClick={() => begin('credit')}>
                        Apply vendor credit
                      </Button>
                    </>
                  )}
                  {selected.status !== 'void' &&
                    selected.paid === '0.00' &&
                    selected.credited === '0.00' &&
                    selected.reserved === '0.00' && (
                      <Button color="error" disabled={busy} onClick={() => begin('void')}>
                        Void bill
                      </Button>
                    )}
                  <Button component="label" disabled={busy}>
                    Attach invoice
                    <input
                      hidden
                      type="file"
                      accept="application/pdf,image/png,image/jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file)
                          void run(async () => {
                            await api.upload(company, selected.id, file);
                            await reloadSelected();
                          });
                      }}
                    />
                  </Button>
                </Stack>
              )}
              {selected.documents?.map((doc) => (
                <Button
                  key={doc.id}
                  sx={{ alignSelf: 'flex-start' }}
                  disabled={busy}
                  onClick={() => void run(async () => api.download(company, selected.id, doc.id, doc.filename))}
                >
                  {doc.filename}
                </Button>
              ))}
              <Typography variant="h5">Payment history</Typography>
              {!selected.payments?.length && <Typography variant="body2">No payments recorded.</Typography>}
              {selected.payments?.map((payment) => (
                <Stack key={payment.id} direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2">
                    ${payment.amount} ·{' '}
                    {payment.kind === 'external' ? 'Paid outside Allyvia' : payment.kind === 'credit' ? 'Vendor credit' : 'Stripe balance'}{' '}
                    · {payment.status} · {payment.paid_date ?? payment.scheduled_date} · {payment.reference}
                  </Typography>
                  {isAdmin && payment.kind !== 'stripe' && payment.status === 'completed' && (
                    <Button
                      disabled={busy}
                      onClick={() => {
                        const reason = window.prompt('Reason for reversing this recorded payment or credit');
                        if (reason?.trim())
                          void run(async () => {
                            await api.paymentAction(company, selected.id, payment.id, 'return', reason);
                            await reloadSelected();
                          });
                      }}
                    >
                      Record reversal
                    </Button>
                  )}
                  {isAdmin && payment.status === 'scheduled' && (
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await api.paymentAction(company, selected.id, payment.id, 'cancel', '');
                          await reloadSelected();
                        })
                      }
                    >
                      Cancel scheduled payment
                    </Button>
                  )}
                </Stack>
              ))}
              <Typography variant="h5">Activity</Typography>
              {selected.audit?.map((item, i) => (
                <Typography key={i} variant="caption">
                  {new Date(item.created_at).toLocaleString()} · {item.action.replaceAll('_', ' ')} ·{' '}
                  {item.actor_email || 'Payment provider'}
                </Typography>
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={onClose}>
          Close
        </Button>
      </DialogActions>
      <Dialog open={operation !== null} onClose={busy ? undefined : () => setOperation(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {operation === 'pay'
            ? 'Review payment'
            : operation === 'credit'
              ? 'Apply vendor credit'
              : operation === 'void'
                ? 'Void bill'
                : 'Record external payment'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {pending && (
              <Alert severity="warning">The last result is unconfirmed. Retry the saved request to retrieve its status safely.</Alert>
            )}
            {operation === 'record-payment' && (
              <Alert severity="info">This records a payment already made outside Allyvia. It does not send money.</Alert>
            )}
            {operation === 'pay' && (
              <Typography>
                Source: merchant Stripe balance · Available: {state?.available_balance ?? 'Unavailable'} · Fee: {state?.fee ?? 'Not quoted'}{' '}
                · Arrival: {state?.estimated_arrival ?? 'Not quoted'}
              </Typography>
            )}
            {operation !== 'void' && (
              <TextField disabled={!!pending} label="Amount (USD)" value={amount} onChange={(e) => setAmount(e.target.value)} />
            )}
            {(operation === 'record-payment' || operation === 'pay') && (
              <TextField
                disabled={!!pending}
                label={operation === 'pay' ? 'Payment date' : 'Paid date'}
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            )}
            {operation !== 'pay' && (
              <TextField
                disabled={!!pending}
                label={operation === 'record-payment' ? 'Payment reference' : 'Reason'}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setOperation(null)}>
            Cancel
          </Button>
          <Button variant="contained" disabled={busy || (operation === 'pay' && !state?.payments_enabled)} onClick={confirm}>
            {busy ? 'Saving…' : operation === 'pay' ? 'Confirm payment' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
