import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { expenseCatalogueAPI } from 'api/expenseCatalogue.api';
import type { ExpenseCategory, ExpenseForm, NativeExpense, ExpenseReport } from 'types/expenseCatalogue';
import RecurringExpenses from './RecurringExpenses';
import ExpenseSourceInbox from './ExpenseSourceInbox';
import { useSelector } from 'store';
import { expensePayload, treatments, orderedExpenseGroups } from './expenseCatalogueForm';

const today = () => new Date().toISOString().slice(0, 10);
const blank = (): ExpenseForm => ({
  source_id: `manual:${crypto.randomUUID()}`,
  amount: '',
  currency: 'USD',
  date: today(),
  recognized_date: today(),
  payee: '',
  receipt_reference: '',
  lines: [{ category_id: '', treatment: 'operating_expense', amount: '' }]
});
function errorText(error: unknown): string {
  const e = error as { response?: { data?: unknown }; message?: string };
  return e.response?.data ? JSON.stringify(e.response.data) : e.message || 'Unable to complete this action. Please try again.';
}

interface CatalogueProps {
  analytics?: boolean;
  startDate?: string;
  endDate?: string;
}
export default function ExpenseCatalogue(props: CatalogueProps) {
  const { currentRole } = useSelector((state) => state.auth);
  if (!currentRole?.company_id) return <Alert severity="info">Select a company to view expenses.</Alert>;
  return <ExpenseCatalogueBody key={currentRole.id} company={currentRole.company_id} {...props} />;
}
function ExpenseCatalogueBody({ analytics = false, startDate, endDate, company }: CatalogueProps & { company: string }) {
  const api = useMemo(() => expenseCatalogueAPI(company), [company]);
  const [start, setStart] = useState(startDate || `${today().slice(0, 7)}-01`);
  const [end, setEnd] = useState(endDate || today());
  const [currency, setCurrency] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [entries, setEntries] = useState<NativeExpense[]>([]);
  const [report, setReport] = useState<ExpenseReport>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ExpenseForm>();
  const [editing, setEditing] = useState<string>();
  const [detail, setDetail] = useState<NativeExpense>();
  const [payment, setPayment] = useState({ amount: '', date: today(), reference: '' });
  const [reason, setReason] = useState('');
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newTreatment, setNewTreatment] = useState('operating_expense');
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [recordFilter, setRecordFilter] = useState('');
  useEffect(() => {
    if (startDate) setStart(startDate);
    if (endDate) setEnd(endDate);
  }, [startDate, endDate]);
  const reload = useCallback(async () => {
    setLoading(true);
    setReport(undefined);
    setEntries([]);
    try {
      const params: Record<string, string> = {
        start_date: start,
        end_date: end,
        ...(currency ? { currency } : {}),
        ...(category ? { category_id: category } : {})
      };
      const data = await api.report(params, analytics);
      setReport(data);
      if (!analytics) {
        const [cats, list] = await Promise.all([api.categories(), api.entries({ ...params, page })]);
        setCategories(cats);
        setEntries(list.results);
        setCount(list.count);
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [start, end, currency, category, analytics, page, api]);
  useEffect(() => {
    void reload();
  }, [reload]);
  async function act(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await action();
      await reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const field = (key: keyof ExpenseForm, value: string) => setForm((current) => (current ? { ...current, [key]: value } : current));
  return (
    <Box sx={{ py: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h3">Business costs and spending</Typography>
        <Typography color="text.secondary">
          Recognized operating costs, settled cash, and unpaid commitments. Amounts stay in their original currency.
        </Typography>
        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
          <TextField
            label="From"
            type="date"
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              setPage(1);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Through"
            type="date"
            value={end}
            onChange={(e) => {
              setEnd(e.target.value);
              setPage(1);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Currency (optional)"
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value.toUpperCase());
              setPage(1);
            }}
            inputProps={{ maxLength: 3 }}
          />
          {!analytics && (
            <TextField
              select
              label="Category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">All categories</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          )}
          <Button onClick={() => void reload()} disabled={loading}>
            Refresh
          </Button>
        </Stack>
        {loading && <CircularProgress size={24} aria-label="Loading expenses" />}
        {report && (
          <>
            <Alert severity="info">Coverage is partial. {report.basis}</Alert>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Currency</TableCell>
                    <TableCell>Operating costs recognized</TableCell>
                    <TableCell>Cash settled</TableCell>
                    <TableCell>Unpaid at period end</TableCell>
                    <TableCell>Unclassified costs</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(report.currencies).map(([code, totals]) => (
                    <TableRow key={code}>
                      <TableCell>{code}</TableCell>
                      {(['recognized_expenses', 'cash_paid', 'outstanding', 'unclassified'] as const).map((key) => (
                        <TableCell key={key}>
                          <Button size="small" onClick={() => setRecordFilter(code)}>
                            {totals[key] || '0.00'}
                          </Button>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            {Object.keys(report.currencies).length === 0 && <Typography>No captured costs match this period and these filters.</Typography>}
            <details>
              <summary>Source coverage and freshness</summary>
              {report.coverage.map((source) => (
                <Typography key={source.source} sx={{ mt: 1 }}>
                  <strong>{source.source.replaceAll('_', ' ')}:</strong> {source.detail}{' '}
                  {source.last_updated ? `Last update: ${new Date(source.last_updated).toLocaleString()}` : ''}
                </Typography>
              ))}
            </details>
            <details open>
              <summary>Records behind these totals</summary>
              {recordFilter && <Button onClick={() => setRecordFilter('')}>Show every currency</Button>}
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Source / date</TableCell>
                      <TableCell>Payee / category</TableCell>
                      <TableCell>Treatment</TableCell>
                      <TableCell>Recognized / cash / unpaid</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orderedExpenseGroups(report.records.filter((row) => !recordFilter || row.currency === recordFilter)).map((group) => (
                      <Fragment key={group.key}>
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Typography variant="h5">{group.label}</Typography>
                          </TableCell>
                        </TableRow>
                        {group.rows.map((row) => (
                          <TableRow key={row.source_id}>
                            <TableCell>
                              {row.recognized_date}
                              <Typography variant="caption" display="block">
                                {row.source_id}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {row.payee}
                              <Typography variant="caption" display="block">
                                {row.category}
                              </Typography>
                            </TableCell>
                            <TableCell>{row.treatment.replaceAll('_', ' ')}</TableCell>
                            <TableCell>
                              {row.currency} {row.recognized_expense} / {row.cash_paid} / {row.outstanding}
                            </TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </details>
            <details>
              <summary>Category, month and payee totals</summary>
              {Object.entries(report.groups).map(([dimension, groups]) => (
                <Box key={dimension} sx={{ mt: 2 }}>
                  <Typography variant="h5">By {dimension}</Typography>
                  {groups.map((group) => (
                    <Typography key={`${group.currency}-${group.label}`}>
                      {group.label} · {group.currency}: recognized {group.recognized_expenses}; cash {group.cash_paid}; unpaid{' '}
                      {group.outstanding}
                    </Typography>
                  ))}
                </Box>
              ))}
            </details>
          </>
        )}
        {!analytics && (
          <>
            <ExpenseSourceInbox company={company} onChange={() => void reload()} />
            <RecurringExpenses company={company} categories={categories} onChange={() => void reload()} />
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Button
                variant="contained"
                onClick={() => {
                  setForm(blank());
                  setEditing(undefined);
                }}
              >
                Add expense
              </Button>
              <Button onClick={() => setCategoryDialog(true)}>Manage categories</Button>
              <Button component="label" disabled={busy}>
                Import CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      void act(async () => {
                        if (file.size > 512000) throw new Error('CSV is limited to 500 KB');
                        await api.import(await file.text());
                      });
                    e.target.value = '';
                  }}
                />
              </Button>
            </Stack>
            <Typography variant="caption">
              CSV headers: source_id,date,recognized_date,amount,currency,payee,category,treatment. Up to 500 rows; a repeated source_id is
              reconciled, never counted twice. Use the exact category name.
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Payee</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell>{entry.payee || 'Unspecified'}</TableCell>
                      <TableCell>
                        {entry.currency} {entry.amount}
                      </TableCell>
                      <TableCell>
                        {entry.status.replaceAll('_', ' ')} · unpaid {entry.outstanding}
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => {
                            setDetail(entry);
                            setReason('');
                            setPayment({ amount: entry.outstanding, date: today(), reference: '' });
                          }}
                        >
                          Details / payments
                        </Button>
                        {!entry.voided && (
                          <Button
                            onClick={() => {
                              setForm(entry);
                              setEditing(entry.id);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            {!entries.length && !loading && (
              <Typography>No native expenses in this range. Add an expense or import a CSV to begin.</Typography>
            )}
            <Stack direction="row" spacing={2}>
              <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Typography>
                Page {page} · {count} expenses
              </Typography>
              <Button disabled={page * 50 >= count} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </Stack>
          </>
        )}
      </Stack>
      <Dialog open={!!form} onClose={() => !busy && setForm(undefined)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? 'Correct expense' : 'Add expense'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error">{error}</Alert>}
          {form && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {(['payee', 'description', 'amount', 'currency', 'receipt_reference'] as const).map((key) => (
                <TextField
                  key={key}
                  label={key.replaceAll('_', ' ')}
                  value={form[key] || ''}
                  onChange={(e) => field(key, key === 'currency' ? e.target.value.toUpperCase() : e.target.value)}
                />
              ))}
              <Stack direction="row" spacing={2}>
                {(['date', 'recognized_date', 'due_date'] as const).map((key) => (
                  <TextField
                    key={key}
                    label={key.replaceAll('_', ' ')}
                    type="date"
                    value={form[key] || ''}
                    onChange={(e) => field(key, e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                ))}
              </Stack>
              <Typography variant="h5">Category splits</Typography>
              <Typography variant="caption">
                Inventory, deposits, equipment and transfers do not become operating costs simply because they were paid.
              </Typography>
              {form.lines.map((line, index) => (
                <Stack key={index} direction="row" spacing={1}>
                  <TextField
                    select
                    label="Category"
                    value={line.category_id}
                    sx={{ minWidth: 180 }}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        lines: form.lines.map((l, i) =>
                          i === index
                            ? {
                                ...l,
                                category_id: e.target.value,
                                treatment: categories.find((c) => c.id === e.target.value)?.default_treatment || l.treatment
                              }
                            : l
                        )
                      })
                    }
                  >
                    <MenuItem value="">Choose category</MenuItem>
                    {categories
                      .filter((c) => c.active)
                      .map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))}
                  </TextField>
                  <TextField
                    select
                    label="Treatment"
                    value={line.treatment}
                    sx={{ minWidth: 150 }}
                    onChange={(e) =>
                      setForm({ ...form, lines: form.lines.map((l, i) => (i === index ? { ...l, treatment: e.target.value } : l)) })
                    }
                  >
                    {treatments.map((t) => (
                      <MenuItem key={t} value={t}>
                        {t.replaceAll('_', ' ')}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Split amount"
                    value={line.amount}
                    onChange={(e) =>
                      setForm({ ...form, lines: form.lines.map((l, i) => (i === index ? { ...l, amount: e.target.value } : l)) })
                    }
                  />
                  <Button
                    disabled={form.lines.length === 1}
                    onClick={() => setForm({ ...form, lines: form.lines.filter((_, i) => i !== index) })}
                  >
                    Remove
                  </Button>
                </Stack>
              ))}
              <Button
                onClick={() =>
                  setForm({ ...form, lines: [...form.lines, { category_id: '', treatment: 'operating_expense', amount: '' }] })
                }
              >
                Add split
              </Button>
              {editing && (
                <TextField required label="Correction reason" value={form.reason || ''} onChange={(e) => field('reason', e.target.value)} />
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setForm(undefined)}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            variant="contained"
            onClick={() =>
              void act(async () => {
                if (form) {
                  await api.save(expensePayload(form), editing);
                  setForm(undefined);
                }
              })
            }
          >
            Save expense
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!detail} onClose={() => !busy && setDetail(undefined)} fullWidth maxWidth="sm">
        <DialogTitle>Expense details and payments</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error">{error}</Alert>}
          {detail && (
            <Stack spacing={2}>
              <Typography>
                {detail.payee} · {detail.currency} {detail.amount} · {detail.status}
              </Typography>
              <Typography>Receipt reference: {detail.receipt_reference || 'None'}</Typography>
              {detail.settlements.map((s) => (
                <Box key={s.id}>
                  <Typography>
                    {s.paid_date} · {s.amount} · {s.reference} {s.reversed ? '(reversed)' : ''}
                  </Typography>
                  {!s.reversed && (
                    <Button
                      disabled={busy || !reason}
                      onClick={() =>
                        void act(async () => {
                          await api.reverse(detail.id, s.id, payment.date, reason);
                          setDetail(undefined);
                        })
                      }
                    >
                      Record return on {payment.date}
                    </Button>
                  )}
                </Box>
              ))}
              {!detail.voided && (
                <>
                  <Divider />
                  <Typography variant="h5">Record an external payment</Typography>
                  <Typography variant="caption">This records money already paid. It does not send a payment.</Typography>
                  <TextField label="Amount" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
                  <TextField
                    label="Payment / return date"
                    type="date"
                    value={payment.date}
                    onChange={(e) => setPayment({ ...payment, date: e.target.value })}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    label="Unique payment reference"
                    value={payment.reference}
                    onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
                  />
                  <Button
                    disabled={busy || !payment.reference}
                    onClick={() =>
                      void act(async () => {
                        await api.settle(detail.id, payment.amount, payment.date, payment.reference);
                        setDetail(undefined);
                      })
                    }
                  >
                    Record payment
                  </Button>
                  <TextField label="Reason for void or return" value={reason} onChange={(e) => setReason(e.target.value)} />
                  <Button
                    color="error"
                    disabled={busy || !reason || detail.paid !== '0.00'}
                    onClick={() =>
                      void act(async () => {
                        await api.void(detail.id, reason);
                        setDetail(undefined);
                      })
                    }
                  >
                    Void expense
                  </Button>
                </>
              )}
              <Typography variant="h5">History</Typography>
              {detail.audit.map((event, i) => (
                <Typography key={i} variant="body2">
                  {new Date(event.created_at).toLocaleString()} · {event.actor_email} · {event.action} {event.reason}
                </Typography>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(undefined)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={categoryDialog} onClose={() => setCategoryDialog(false)} fullWidth>
        <DialogTitle>Expense categories</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="New category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            <TextField select label="Suggested treatment" value={newTreatment} onChange={(e) => setNewTreatment(e.target.value)}>
              {treatments.map((t) => (
                <MenuItem key={t} value={t}>
                  {t.replaceAll('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
            <Button
              disabled={busy || !newCategory}
              onClick={() =>
                void act(async () => {
                  await api.category({ name: newCategory, default_treatment: newTreatment });
                  setNewCategory('');
                })
              }
            >
              Add category
            </Button>
            {categories.map((c) => (
              <Stack key={c.id} direction="row" alignItems="center" justifyContent="space-between">
                <Typography>
                  {c.name} · {c.default_treatment.replaceAll('_', ' ')}
                </Typography>
                <Button disabled={busy} onClick={() => void act(() => api.category({ active: !c.active }, c.id))}>
                  {c.active ? 'Archive' : 'Restore'}
                </Button>
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
