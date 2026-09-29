import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import axios from 'utils/axios';
import type { ExpenseCategory } from 'types/expenseCatalogue';
import { treatments } from './expenseCatalogueForm';
const root = '/expense/catalogue/recurring/';
interface Recurring {
  request_id: string;
  id?: string;
  name: string;
  amount: string;
  currency: string;
  category_id: string;
  treatment: string;
  payee: string;
  source_reference: string;
  start_date: string;
  day_of_month: number;
  active?: boolean;
}
export default function RecurringExpenses({
  categories,
  onChange,
  company
}: {
  categories: ExpenseCategory[];
  onChange: () => void;
  company: string;
}) {
  const [rows, setRows] = useState<Recurring[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [through, setThrough] = useState(new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState<Recurring>({
    request_id: crypto.randomUUID(),
    name: '',
    amount: '',
    currency: 'USD',
    category_id: '',
    treatment: 'operating_expense',
    payee: '',
    source_reference: '',
    start_date: through,
    day_of_month: 1
  });
  const load = async () => setRows((await axios.get<Recurring[]>(root, { params: { company_id: company } })).data);
  useEffect(() => {
    void load().catch(() => setError('Could not load recurring obligations.'));
  }, []);
  async function act(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await action();
      await load();
      onChange();
    } catch (e) {
      const value = e as { response?: { data: unknown } };
      setError(value.response ? JSON.stringify(value.response.data) : 'Unable to save the recurring obligation.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Stack spacing={2}>
      <Typography variant="h4">Recurring obligations</Typography>
      <Typography variant="body2">
        Record monthly lease and subscription obligations from verified source documents. Generating entries does not assume they were paid.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" spacing={2}>
        <Button
          onClick={() => {
            setForm({ ...form, request_id: crypto.randomUUID() });
            setOpen(true);
          }}
        >
          Add monthly obligation
        </Button>
        <TextField
          type="date"
          label="Generate through"
          value={through}
          onChange={(e) => setThrough(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>
      {rows.map((row) => (
        <Stack key={row.id} direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap">
          <Typography>
            {row.name} · {row.currency} {row.amount}/month · day {row.day_of_month} · {row.active ? 'Active' : 'Paused'}
          </Typography>
          <Button
            disabled={busy || !row.active}
            onClick={() => void act(() => axios.post(`${root}${row.id}/generate/`, { through_date: through, company_id: company }))}
          >
            Generate unpaid entries
          </Button>
          <Button
            disabled={busy}
            onClick={() => void act(() => axios.patch(`${root}${row.id}/`, { active: !row.active, company_id: company }))}
          >
            {row.active ? 'Pause' : 'Resume'}
          </Button>
        </Stack>
      ))}
      <Dialog open={open} onClose={() => !busy && setOpen(false)} fullWidth>
        <DialogTitle>Monthly obligation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {(['name', 'amount', 'currency', 'payee', 'source_reference'] as const).map((key) => (
              <TextField
                key={key}
                required
                label={key.replaceAll('_', ' ')}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: key === 'currency' ? e.target.value.toUpperCase() : e.target.value })}
              />
            ))}
            <TextField
              label="Start date"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Day of month (1–31)"
              type="number"
              value={form.day_of_month}
              onChange={(e) => setForm({ ...form, day_of_month: Number(e.target.value) })}
            />
            <TextField
              select
              label="Category"
              value={form.category_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  category_id: e.target.value,
                  treatment: categories.find((c) => c.id === e.target.value)?.default_treatment || 'operating_expense'
                })
              }
            >
              {categories
                .filter((c) => c.active)
                .map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
            </TextField>
            <TextField select label="Treatment" value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })}>
              {treatments.map((value) => (
                <MenuItem key={value} value={value}>
                  {value.replaceAll('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await axios.post(root, { ...form, company_id: company });
                setOpen(false);
              })
            }
          >
            Save obligation
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
