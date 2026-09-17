import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Grid,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'store';
import bankingApi, { BANK_CATEGORIES, type BankCategory } from 'api/banking';
import MainCard from 'ui-component/cards/MainCard';
import { PageHeader } from 'ui-component/frame';
import { bankMoney as money } from 'utils/bankMoney';
import { localToday } from 'utils/financeFormat';

export default function BankFinance() {
  const role = useSelector((state) => state.auth.currentRole);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const today = localToday();
  const [start, setStart] = useState(`${today.slice(0, 7)}-01`);
  const [end, setEnd] = useState(today);
  const [page, setPage] = useState(0);
  const [needsReview, setNeedsReview] = useState(false);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');
  const validRange = !!start && !!end && start <= end;
  const range = { start_date: start, end_date: end };
  const report = useQuery({
    queryKey: ['banking', 'report', role?.company_id, role?.id, range],
    queryFn: () => bankingApi.report(range),
    enabled: !!role?.company_id && validRange,
    refetchInterval: 30_000,
    retry: false
  });
  const rows = useQuery({
    queryKey: ['banking', 'transactions', role?.company_id, role?.id, range, page, needsReview],
    queryFn: () => bankingApi.transactions(range, page + 1, needsReview),
    enabled: !!role?.company_id && validRange,
    refetchInterval: 30_000,
    retry: false
  });
  const review = async (id: string, category: BankCategory) => {
    setSavingId(id);
    setError('');
    try {
      await bankingApi.review(id, category);
      await qc.invalidateQueries({ queryKey: ['banking'] });
    } catch {
      setError('Could not save the category. Please retry.');
    } finally {
      setSavingId('');
    }
  };
  return (
    <>
      <PageHeader
        title="Finance & accounting"
        subtitle="Bank activity"
        right={<Button onClick={() => navigate('/integrations/bank')}>Manage bank</Button>}
      />
      <Stack spacing={2}>
        <Stack direction="row" spacing={2}>
          <TextField
            label="From"
            type="date"
            value={start}
            slotProps={{ inputLabel: { shrink: true } }}
            onChange={(e) => {
              setStart(e.target.value);
              setPage(0);
            }}
          />
          <TextField
            label="To"
            type="date"
            value={end}
            slotProps={{ inputLabel: { shrink: true } }}
            onChange={(e) => {
              setEnd(e.target.value);
              setPage(0);
            }}
          />
        </Stack>
        {!validRange && <Alert severity="warning">Choose a valid date range.</Alert>}
        {report.isLoading && <Typography>Loading bank activity…</Typography>}
        {report.isError && (
          <Alert severity="error">
            Could not load bank activity. <Button onClick={() => report.refetch()}>Retry</Button>
          </Alert>
        )}
        {report.data && (
          <>
            {!report.data.connected && <Alert severity="info">Connect a bank to automatically populate this page.</Alert>}
            {report.data.connected && !report.data.history_complete && (
              <Alert severity="info">Your bank history is still importing. Totals may be incomplete.</Alert>
            )}
            {report.data.connected && report.data.stale && (
              <Alert severity="warning">Bank updates need attention. These figures may be out of date.</Alert>
            )}
            <Typography variant="body2" color="text.secondary">
              Last Allyvia scan: {report.data.last_synced_at ? new Date(report.data.last_synced_at).toLocaleString() : 'Not yet scanned'}.{' '}
              Bank data updated:{' '}
              {report.data.institution_updated_at ? new Date(report.data.institution_updated_at).toLocaleString() : 'Not provided by bank'}.
            </Typography>
            {report.data.currencies.map((currency) => (
              <MainCard key={currency.currency} title={`Cash & spending · ${currency.currency}`}>
                <Grid container spacing={2}>
                  {(
                    [
                      ['Cash balance', currency.cash_balance],
                      ['Cash in', currency.cash_in],
                      ['Cash out', currency.cash_out],
                      ['Net cash movement', currency.net_cash_movement],
                      ['Categorized operating expenses', currency.operating_expenses],
                      ['Categorized business income', currency.classified_income],
                      ['Credit card balance', currency.card_balance],
                      ['Card spending', currency.card_spending],
                      ['Pending outflows', currency.pending_outflows]
                    ] as const
                  ).map(([label, value]) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={label}>
                      <Typography variant="body2" color="text.secondary">
                        {label}
                      </Typography>
                      <Typography variant="h4">{money(value, currency.currency)}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </MainCard>
            ))}
            <Typography variant="body2" color="text.secondary">
              Cash in and out include transfers; card activity is separate. Categorized amounts exclude items needing review. Bank activity
              does not establish unpaid invoices, inventory costs or an accrual profit statement.
            </Typography>
            {report.data.accounts.length > 0 && (
              <MainCard title="Connected accounts">
                <Stack spacing={1}>
                  {report.data.accounts.map((account) => (
                    <Box key={account.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography>
                        {account.name} {account.mask && `••${account.mask}`}{' '}
                        <Typography component="span" variant="caption">
                          ({account.type === 'credit' ? 'Credit card' : 'Bank account'})
                        </Typography>
                      </Typography>
                      <Typography>{money(account.current_balance, account.currency)}</Typography>
                    </Box>
                  ))}
                </Stack>
              </MainCard>
            )}
          </>
        )}
        <MainCard title="Bank transactions">
          <Stack spacing={2}>
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
                              disabled={role?.role_type !== 'admin' || !!savingId}
                              inputProps={{ 'aria-label': `Category for ${row.merchant || row.description} on ${row.date}` }}
                              onChange={(e) => review(row.id, e.target.value as BankCategory)}
                            >
                              {Object.entries(BANK_CATEGORIES).map(([value, label]) => (
                                <MenuItem key={value} value={value}>
                                  {label}
                                </MenuItem>
                              ))}
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={
                                row.pending
                                  ? 'Pending'
                                  : row.reviewed
                                    ? 'Reviewed'
                                    : row.category === 'needs_review'
                                      ? 'Needs review'
                                      : 'Suggested'
                              }
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
        </MainCard>
      </Stack>
    </>
  );
}
