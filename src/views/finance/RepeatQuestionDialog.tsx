// "Which of these repeat?" after an expense import. The rows and payloads come from recurringSuggest.ts.
import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { ExpenseCategory, RecurringPayload, SuggestedGroup } from 'types/expenseCatalogue';
import { CHOICES, payloadsFor, rowsFor, withCategory, type RepeatChoice, type RepeatRow } from './recurringSuggest';

interface Props {
  groups: SuggestedGroup[];
  categories: ExpenseCategory[];
  /** Creates the recurring expenses. Throws a sentence for the owner when one fails. */
  onSave: (payloads: RecurringPayload[]) => Promise<void>;
  onClose: () => void;
}

export default function RepeatQuestionDialog({ groups, categories, onSave, onClose }: Props) {
  const [rows, setRows] = useState<RepeatRow[]>(() => rowsFor(groups));
  // One request id per row, kept across a retry so a second Save replays rather than doubling.
  const [ids, setIds] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((row) => [row.key, crypto.randomUUID()])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const change = (key: string, update: (row: RepeatRow) => RepeatRow) => {
    setRows((current) => current.map((row) => (row.key === key ? update(row) : row)));
    // The terms changed, so this row is a new request.
    setIds((current) => ({ ...current, [key]: crypto.randomUUID() }));
  };

  async function save() {
    setBusy(true);
    setError('');
    try {
      await onSave(payloadsFor(rows, (row) => ids[row.key]));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
      setBusy(false);
    }
  }

  return (
    <Dialog open fullWidth maxWidth="md" onClose={() => !busy && onClose()} aria-labelledby="repeat-question-title">
      <DialogTitle id="repeat-question-title">Which of these repeat?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          These showed up more than once in your file. Say how often each one repeats and we will add the next one when it is due.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2}>
          {rows.map((row) => (
            <Stack key={row.key} direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              <Stack sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap>{row.payee}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {row.amountLabel} · {row.countLabel}
                </Typography>
              </Stack>
              <TextField
                select
                size="small"
                label="Repeats"
                sx={{ minWidth: 180 }}
                value={row.choice}
                disabled={busy}
                onChange={(e) => change(row.key, (r) => ({ ...r, choice: e.target.value as RepeatChoice }))}
              >
                {CHOICES.map((choice) => (
                  <MenuItem key={choice.value} value={choice.value}>
                    {choice.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Category"
                sx={{ minWidth: 180 }}
                value={row.categoryId}
                disabled={busy}
                onChange={(e) => change(row.key, (r) => withCategory(r, e.target.value, categories))}
              >
                {categories
                  .filter((c) => c.active || c.id === row.categoryId)
                  .map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
              </TextField>
            </Stack>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Not now
        </Button>
        <Button variant="contained" onClick={() => void save()} disabled={busy}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
