import { useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  FormControlLabel,
  ListSubheader,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// project imports
import { useSelector } from 'store';
import { selectEffectiveRole } from 'store/selectors/effectiveRole';
import bankingApi, { type BankCategory } from 'api/banking';
import { Panel } from 'ui-component/frame';
import { bankMoney as money } from 'utils/bankMoney';
import { isAdminOrAbove } from 'utils/role';
import { groupedCategories, reviewSnackbarText, sourceChipLabel } from '../bankCategories';
import type { Range } from './snapshotView';

// Bank owners' transaction review, moved unchanged from the old bank page (BankFinance.tsx):
// every bank row (money in, transfers and card repayments included, not only expenses), the
// Needs review switch, the category select for admins, and the undo snackbar when a correction
// teaches a merchant rule. Corrections refresh every banking and finance query.

export default function BankTransactionsPanel({ range, initialNeedsReview = false }: { range: Range; initialNeedsReview?: boolean }) {
  const role = useSelector(selectEffectiveRole);
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [needsReview, setNeedsReview] = useState(initialNeedsReview);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');
  const [snack, setSnack] = useState<{ text: string; undo: { merchantKey: string; rowId: string; previous: BankCategory } | null }>({
    text: '',
    undo: null
  });
  const bankRange = { start_date: range.start, end_date: range.end };
  const report = useQuery({
    queryKey: ['banking', 'report', role?.company_id, role?.id, bankRange],
    queryFn: () => bankingApi.report(bankRange),
    enabled: !!role?.company_id,
    refetchInterval: 30_000,
    retry: false
  });
  const rows = useQuery({
    queryKey: ['banking', 'transactions', role?.company_id, role?.id, bankRange, page, needsReview],
    queryFn: () => bankingApi.transactions(bankRange, page + 1, needsReview),
    enabled: !!role?.company_id,
    refetchInterval: 30_000,
    retry: false
  });
  const refreshAll = async () => {
    await qc.invalidateQueries({ queryKey: ['banking'] });
    await qc.invalidateQueries({ queryKey: ['finance'] });
  };
  const review = async (id: string, category: BankCategory, previous: BankCategory, merchant: string) => {
    setSavingId(id);
    setError('');
    try {
      const result = await bankingApi.review(id, category);
      setSnack({
        text: reviewSnackbarText(result.rule_created, result.rule_applied_count, merchant),
        // Only a rule is worth undoing; a lone correction is one select away.
        undo: result.rule_created ? { merchantKey: result.merchant_key, rowId: id, previous } : null
      });
      await refreshAll();
    } catch {
      setError('Could not save the category. Please retry.');
    } finally {
      setSavingId('');
    }
  };
  const undoReview = async (undo: { merchantKey: string; rowId: string; previous: BankCategory }) => {
    setSnack({ text: '', undo: null });
    setSavingId(undo.rowId);
    setError('');
    try {
      // The rule id is not in the review response, so find it by the key it was taught on.
      const rule = (await bankingApi.rules()).find((r) => r.merchant_key === undo.merchantKey);
      if (rule) await bankingApi.deleteRule(rule.id);
      await bankingApi.review(undo.rowId, undo.previous);
      await refreshAll();
    } catch {
      setError('Could not undo that change. Please retry.');
    } finally {
      setSavingId('');
    }
  };
  return (
    <>
      <Panel title="Bank transactions" note="Correct any category here">
        <Stack spacing={2} sx={{ p: '14px' }}>
          <FormControlLabel
            control={
              <Switch
                checked={needsReview}
                onChange={(_, value) => {
                  setNeedsReview(value);
                  setPage(0);
                }}
              />
            }
            label={`Needs review${report.data ? ` (${report.data.needs_review_count})` : ''}`}
          />
          <Typography variant="body2" color="text.secondary">
            Positive amounts are money out; negative amounts are money in. You can correct each category.
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          {rows.isError ? (
            <Alert severity="error">
              Could not load transactions. <Button onClick={() => rows.refetch()}>Retry</Button>
            </Alert>
          ) : rows.isLoading ? (
            <Typography>Loading transactions…</Typography>
          ) : (
            <>
              <TableContainer>
                <Table size="small" aria-label="Bank transactions">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Account</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.data?.results.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.date}</TableCell>
                        <TableCell>
                          {row.merchant || row.description}
                          <Typography variant="caption" display="block" color="text.secondary">
                            {row.provider_category.replaceAll('_', ' ').toLowerCase()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {row.account_name} {row.account_mask && `••${row.account_mask}`}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          {money(row.amount, row.currency)}
                        </TableCell>
                        <TableCell>
                          <Select
                            size="small"
                            value={row.category}
                            disabled={!isAdminOrAbove(role?.role_type) || !!savingId}
                            inputProps={{ 'aria-label': `Category for ${row.merchant || row.description} on ${row.date}` }}
                            onChange={(e) => review(row.id, e.target.value as BankCategory, row.category, row.merchant || row.description)}
                          >
                            {groupedCategories().flatMap((group) => [
                              <ListSubheader key={group.label}>{group.label}</ListSubheader>,
                              ...group.options.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))
                            ])}
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={sourceChipLabel(row.category_source, row.pending, row.category)}
                            color={row.category === 'needs_review' ? 'warning' : 'default'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {!rows.data?.results.length && (
                      <TableRow>
                        <TableCell colSpan={6}>No transactions for this date range and filter.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={rows.data?.count || 0}
                page={page}
                rowsPerPage={50}
                rowsPerPageOptions={[50]}
                onPageChange={(_, value) => setPage(value)}
              />
            </>
          )}
        </Stack>
      </Panel>
      <Snackbar
        open={!!snack.text}
        autoHideDuration={snack.undo ? 10_000 : 4000}
        onClose={() => setSnack({ text: '', undo: null })}
        message={snack.text}
        action={
          snack.undo ? (
            <Button color="secondary" size="small" onClick={() => snack.undo && undoReview(snack.undo)}>
              Undo
            </Button>
          ) : null
        }
      />
    </>
  );
}
