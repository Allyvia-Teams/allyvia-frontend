import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import bankingApi, { type BankReport, type DateOrder, type HistoryPreview, type SignReading } from 'api/banking';
import { bankMoney } from 'utils/bankMoney';
import {
  DATE_ORDER_LABELS,
  dayLabel,
  historyRefusal,
  previewCounts,
  refusalProblems,
  sampleDirection,
  signReadingLabel,
  uploadResultSentence
} from './expenseTruth';

/**
 * Expense truth X5: add older bank history by CSV (X3's routes). Pick the account,
 * choose the file, see ten rows labelled money out or money in, answer the sign
 * and date questions only when the file needs them, confirm. Nothing is saved
 * until Add; the commit sends the file again with the preview's fingerprint.
 */
export default function OlderHistoryDialog({
  open,
  onClose,
  accounts
}: {
  open: boolean;
  onClose: () => void;
  accounts: BankReport['accounts'];
}) {
  const qc = useQueryClient();
  const [accountId, setAccountId] = useState(() => (accounts.find((a) => a.type === 'depository') ?? accounts[0])?.id ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [dateOrder, setDateOrder] = useState<DateOrder | undefined>(undefined);
  const [preview, setPreview] = useState<HistoryPreview | null>(null);
  const [reading, setReading] = useState<SignReading | null>(null);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<{ text: string; problems: string[] } | null>(null);
  const [result, setResult] = useState('');

  const reset = () => {
    setFile(null);
    setDateOrder(undefined);
    setPreview(null);
    setReading(null);
    setRefusal(null);
    setResult('');
  };
  const close = () => {
    reset();
    onClose();
  };

  const runPreview = async (account: string, chosen: File, order?: DateOrder) => {
    setBusy(true);
    setRefusal(null);
    setPreview(null);
    try {
      const answer = await bankingApi.historyPreview(account, chosen, order);
      setPreview(answer);
      setReading(answer.sign_readings.length > 1 ? null : answer.sign_reading);
    } catch (error) {
      setRefusal({ text: historyRefusal(error), problems: refusalProblems(error) });
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!file || !preview || !reading) return;
    setBusy(true);
    setRefusal(null);
    try {
      const upload = await bankingApi.historyCommit(accountId, file, preview.sha256, reading, dateOrder);
      setResult(uploadResultSentence(upload));
      setPreview(null);
      await qc.invalidateQueries({ queryKey: ['banking'] });
    } catch (error) {
      setRefusal({ text: historyRefusal(error), problems: refusalProblems(error) });
    } finally {
      setBusy(false);
    }
  };

  const currency = accounts.find((a) => a.id === accountId)?.currency || 'USD';
  const canAdd = !!preview && preview.can_commit && preview.rows_kept > 0 && !!reading && !busy;

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      <DialogTitle>Add older bank history</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {result ? (
            <Alert severity="success">{result}</Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                Download a CSV statement from your bank for the months before your bank connection. Rows your bank already shared are
                skipped.
              </Typography>
              <FormControl size="small" fullWidth>
                <InputLabel id="older-history-account">Account</InputLabel>
                <Select
                  labelId="older-history-account"
                  label="Account"
                  value={accountId}
                  onChange={(e) => {
                    setAccountId(e.target.value);
                    if (file) runPreview(e.target.value, file, dateOrder);
                  }}
                >
                  {accounts.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {[a.name, a.mask].filter(Boolean).join(' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="outlined" component="label" disabled={busy || !accountId} sx={{ alignSelf: 'flex-start' }}>
                {file ? `Choose another file (${file.name})` : 'Choose a CSV file'}
                <input
                  hidden
                  type="file"
                  accept=".csv,text/csv"
                  aria-label="Bank statement CSV"
                  onChange={(e) => {
                    const chosen = e.target.files?.[0];
                    e.target.value = '';
                    if (!chosen) return;
                    setFile(chosen);
                    setDateOrder(undefined);
                    runPreview(accountId, chosen);
                  }}
                />
              </Button>
              {busy && <Typography variant="body2">Reading the file…</Typography>}
            </>
          )}
          {refusal && (
            <Alert severity="error">
              {refusal.text}
              {refusal.problems.map((p) => (
                <Typography key={p} variant="body2">
                  {p}
                </Typography>
              ))}
            </Alert>
          )}
          {preview && (
            <Stack spacing={2}>
              {preview.problems.length > 0 && (
                <Alert severity="warning">
                  {preview.problems.map((p) => (
                    <Typography key={p} variant="body2">
                      {p}
                    </Typography>
                  ))}
                </Alert>
              )}
              {preview.needs_date_order && (
                <FormControl>
                  <FormLabel>How are dates written in this file?</FormLabel>
                  <RadioGroup
                    value={dateOrder ?? ''}
                    onChange={(e) => {
                      const order = e.target.value as DateOrder;
                      setDateOrder(order);
                      if (file) runPreview(accountId, file, order);
                    }}
                  >
                    {(Object.keys(DATE_ORDER_LABELS) as DateOrder[]).map((order) => (
                      <FormControlLabel key={order} value={order} control={<Radio size="small" />} label={DATE_ORDER_LABELS[order]} />
                    ))}
                  </RadioGroup>
                </FormControl>
              )}
              {preview.sign_readings.length > 1 && (
                <FormControl>
                  <FormLabel>How does this file show money out?</FormLabel>
                  <RadioGroup value={reading ?? ''} onChange={(e) => setReading(e.target.value as SignReading)}>
                    {preview.sign_readings.map((r) => (
                      <FormControlLabel key={r} value={r} control={<Radio size="small" />} label={signReadingLabel(r)} />
                    ))}
                  </RadioGroup>
                </FormControl>
              )}
              {preview.samples.length > 0 && (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small" aria-label="The first rows of the file">
                    <TableBody>
                      {preview.samples.map((s, i) => (
                        <TableRow key={`${s.date}-${i}`}>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{dayLabel(s.date)}</TableCell>
                          <TableCell>{s.description}</TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            {bankMoney(s.amount, currency)}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{sampleDirection(s.direction, preview.sign_reading, reading)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
              {preview.can_commit && <Typography>{previewCounts(preview)}</Typography>}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {result ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button onClick={close}>Cancel</Button>
            <Button variant="contained" disabled={!canAdd} onClick={add}>
              Add
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
