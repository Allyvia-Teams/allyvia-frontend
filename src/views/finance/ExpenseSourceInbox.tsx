import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, MenuItem, Pagination, Stack, TextField, Typography } from '@mui/material';
import axios from 'utils/axios';
import type { ExpenseCategory } from 'types/expenseCatalogue';

interface Source {
  id: string;
  filename: string;
  source_kind: string;
  status: string;
  entry_id: string | null;
  text?: string;
  suggestions: {
    amount: string | null;
    currency: string | null;
    bill_date: string | null;
    due_date: string | null;
    payee: string | null;
    invoice_number: string | null;
    category_hint: string | null;
    recurrence_hint: { frequency: string; day: number | null } | null;
    review_flags: string[];
  };
}
interface Sources {
  gmail_connected: boolean;
  drive_connected: boolean;
  drive_access: boolean;
  email_intake: string;
  documents: { id: string; filename: string }[];
  count: number;
}
const root = '/expense/catalogue/inbox';
const problem = (e: unknown) => {
  const data = (e as { response?: { data?: unknown } }).response?.data;
  return typeof data === 'string'
    ? data
    : data && typeof data === 'object'
      ? Object.values(data).flat().join(' ')
      : 'Could not complete the request. Retry or check the source status.';
};

export default function ExpenseSourceInbox({ company, onChange }: { company: string; onChange?: () => void }) {
  const [items, setItems] = useState<Source[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [drivePage, setDrivePage] = useState(1);
  const [sources, setSources] = useState<Sources | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selected, setSelected] = useState<Source | null>(null);
  const [driveDocument, setDriveDocument] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('');
  const [billDate, setBillDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [payee, setPayee] = useState('');
  const [category, setCategory] = useState('');
  const [treatment, setTreatment] = useState('operating_expense');
  const [existingId, setExistingId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const config = useCallback(() => ({ params: { company_id: company } }), [company]);
  const refresh = useCallback(async () => {
    const [inbox, connections, catalogue] = await Promise.all([
      axios.get(`${root}/`, { params: { company_id: company, page } }),
      axios.get(`${root}/sources/`, { params: { company_id: company, page: drivePage } }),
      axios.get('/expense/catalogue/categories/', config())
    ]);
    if (!alive.current) return;
    setItems(inbox.data.results);
    setCount(inbox.data.count);
    setSources(connections.data);
    setCategories(catalogue.data);
  }, [company, page, drivePage, config]);
  useEffect(() => {
    let active = true;
    refresh().catch((e) => {
      if (active) setError(problem(e));
    });
    return () => {
      active = false;
    };
  }, [refresh]);
  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
    } catch (e) {
      if (alive.current) setError(problem(e));
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const select = (source: Source) => {
    if (!alive.current) return;
    setSelected(source);
    setAmount(source.suggestions.amount ?? '');
    setCurrency(source.suggestions.currency ?? '');
    setBillDate(source.suggestions.bill_date ?? '');
    setDueDate(source.suggestions.due_date ?? '');
    setPayee(source.suggestions.payee ?? '');
    const suggested = categories.find((c) => c.name.toLowerCase() === source.suggestions.category_hint?.toLowerCase());
    setCategory(suggested?.id ?? '');
    setTreatment(suggested?.default_treatment ?? 'operating_expense');
    setExistingId('');
    setNote('');
  };
  const accept = () => {
    if (!selected) return;
    if (!existingId && (!amount || !/^[A-Z]{3}$/.test(currency) || !billDate || !category)) {
      setError('Confirm amount, currency, bill date and category.');
      return;
    }
    void run(async () => {
      const body = {
        action: 'accept',
        note,
        ...(existingId
          ? { entry_id: existingId }
          : {
              entry: {
                amount,
                currency,
                date: billDate,
                recognized_date: billDate,
                due_date: dueDate || null,
                payee,
                description: selected.suggestions.invoice_number ? `Invoice ${selected.suggestions.invoice_number}` : selected.filename,
                lines: [{ category_id: category, treatment, amount }]
              }
            })
      };
      const result = await axios.post(`${root}/${selected.id}/`, body, config());
      if (!alive.current) return;
      setSelected(result.data);
      setNotice(
        existingId
          ? 'Source linked to the existing expense. Its payment status is unchanged.'
          : 'Source reviewed. The expense is recorded as unpaid; no money was sent.'
      );
      await refresh();
      onChange?.();
    });
  };
  const download = () => {
    if (!selected) return;
    void run(async () => {
      const result = await axios.get(`${root}/${selected.id}/download/`, { ...config(), responseType: 'blob' });
      const url = URL.createObjectURL(result.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = selected.filename;
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h4">Expense source inbox</Typography>
        <Typography variant="body2">
          Bring in emailed invoices and Drive documents, review the extracted fields, then record or link an expense.
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {notice && <Alert severity="success">{notice}</Alert>}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button component="label" variant="outlined" disabled={busy}>
            Upload email or invoice
            <input
              hidden
              type="file"
              accept=".eml,.pdf,.docx,.txt"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                void run(async () => {
                  const body = new FormData();
                  body.append('file', file);
                  const result = await axios.post(`${root}/`, body, config());
                  select(result.data);
                  await refresh();
                });
              }}
            />
          </Button>
          <Button disabled={busy} onClick={() => void run(refresh)}>
            Refresh inbox
          </Button>
        </Stack>
        {sources && !sources.gmail_connected && (
          <Typography variant="caption">
            Automatic mailbox sync is not connected. Upload .eml email files now; invoices are never inferred from payment reminders alone.
          </Typography>
        )}
        {sources?.drive_connected ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              select
              label="Synced Drive document"
              value={driveDocument}
              onChange={(event) => setDriveDocument(event.target.value)}
              sx={{ minWidth: 280 }}
            >
              {sources.documents.map((doc) => (
                <MenuItem key={doc.id} value={doc.id}>
                  {doc.filename}
                </MenuItem>
              ))}
            </TextField>
            <Button
              disabled={busy || !driveDocument}
              onClick={() =>
                void run(async () => {
                  const result = await axios.post(`${root}/sources/`, { document_id: driveDocument }, config());
                  select(result.data);
                  await refresh();
                })
              }
            >
              Read selected document
            </Button>
            {sources.count > 50 && (
              <Pagination
                page={drivePage}
                count={Math.ceil(sources.count / 50)}
                onChange={(_, value) => {
                  setDrivePage(value);
                  setDriveDocument('');
                }}
              />
            )}
          </Stack>
        ) : (
          <Typography variant="caption">
            {sources?.drive_access === false
              ? 'Documents access is required to import from Drive. You can upload an invoice here.'
              : 'Connect Google Drive in Documents to read a synced document, or upload it here.'}
          </Typography>
        )}
        {!items.length && <Typography variant="body2">No source documents yet.</Typography>}
        {items.map((item) => (
          <Stack key={item.id} direction="row" spacing={1} alignItems="center">
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const result = await axios.get(`${root}/${item.id}/`, config());
                  select(result.data);
                })
              }
            >
              {item.filename}
            </Button>
            <Chip size="small" label={item.status === 'pending' ? 'Needs review' : item.status} />
            <Typography variant="caption">{item.source_kind}</Typography>
          </Stack>
        ))}
        {count > 25 && <Pagination count={Math.ceil(count / 25)} page={page} onChange={(_, value) => setPage(value)} disabled={busy} />}
        {selected && (
          <Stack spacing={2}>
            <Typography variant="h5">Review {selected.filename}</Typography>
            <Button sx={{ alignSelf: 'flex-start' }} onClick={download} disabled={busy}>
              Download original
            </Button>
            {selected.text && (
              <Box
                component="pre"
                sx={{ whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto', bgcolor: 'action.hover', p: 1, fontSize: 12 }}
              >
                {selected.text}
              </Box>
            )}
            {selected.status === 'pending' && (
              <>
                {selected.suggestions.review_flags.map((flag, i) => (
                  <Typography key={i} variant="caption">
                    {flag}
                  </Typography>
                ))}
                {selected.suggestions.recurrence_hint && (
                  <Alert severity="info">
                    Monthly terms detected. Accepting here records one expense. Use Recurring expenses to schedule future obligations after
                    reviewing the lease; an obligation is not a confirmed payment.
                  </Alert>
                )}
                <TextField
                  label="Link an existing expense ID (optional)"
                  value={existingId}
                  onChange={(e) => setExistingId(e.target.value)}
                  helperText="Link a previously recorded bill to avoid counting it twice."
                />
                {!existingId && (
                  <>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <TextField label="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
                      <TextField label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
                      <TextField label="Payee" value={payee} onChange={(e) => setPayee(e.target.value)} />
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <TextField
                        label="Bill / recognition date"
                        type="date"
                        value={billDate}
                        onChange={(e) => setBillDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                      <TextField
                        label="Due date"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <TextField
                        select
                        label="Category"
                        value={category}
                        sx={{ minWidth: 240 }}
                        onChange={(e) => {
                          setCategory(e.target.value);
                          setTreatment(categories.find((c) => c.id === e.target.value)?.default_treatment ?? 'operating_expense');
                        }}
                      >
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
                        label="Accounting treatment"
                        value={treatment}
                        onChange={(e) => setTreatment(e.target.value)}
                        sx={{ minWidth: 220 }}
                      >
                        {['operating_expense', 'inventory', 'fixed_asset', 'prepaid', 'deposit', 'liability', 'transfer'].map((value) => (
                          <MenuItem key={value} value={value}>
                            {value.replaceAll('_', ' ')}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Stack>
                  </>
                )}
                <TextField label="Review note / dismissal reason" value={note} onChange={(e) => setNote(e.target.value)} />
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" disabled={busy} onClick={accept}>
                    {existingId ? 'Link source to expense' : 'Accept reviewed expense'}
                  </Button>
                  <Button
                    disabled={busy || !note.trim()}
                    onClick={() =>
                      void run(async () => {
                        const result = await axios.post(`${root}/${selected.id}/`, { action: 'dismiss', note }, config());
                        if (alive.current) setSelected(result.data);
                        await refresh();
                      })
                    }
                  >
                    Dismiss source
                  </Button>
                </Stack>
              </>
            )}
            {selected.entry_id && <Typography variant="body2">Linked expense: {selected.entry_id}</Typography>}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
