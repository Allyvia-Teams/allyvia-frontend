import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// material-ui
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

// project imports
import bankingApi, { type BankCategory, type BankReport, type BankTransaction } from 'api/banking';
import { useSelector } from 'store';
import { selectEffectiveRole } from 'store/selectors/effectiveRole';
import { Panel } from 'ui-component/frame';
import { isAdminOrAbove } from 'utils/role';
import { groupedCategories } from '../bankCategories';
import { bankCategoryLabel } from '../bucketLabels';
import { useBankReview } from './BankReview';
import { ALL_BANK_CAPTION, ALL_BANK_TITLE, bankTransactionRows } from './bankActivity';
import type { Loadable } from './SnapshotSections';
import type { Range } from './snapshotView';

// ==============================|| FINANCE - ALL BANK TRANSACTIONS ||============================== //
// Part A of session 10: the deleted bank page's transaction table (d692d49's BankFinance.tsx),
// back on /finance/cash for bank owners. Every movement /banking/transactions/ returns for the
// range, money in, transfers, personal and pending included, with the category select (admins;
// disabled for everyone else, as before), the status chip, the Needs review switch, 50 a page,
// and the undo snackbar. A correction refreshes the banking and the finance queries
// (`refreshAfterReview`), so the snapshot and the Expenses page move with it.

export interface BankTransactionsBodyProps {
  rows: Loadable<{ count: number; results: BankTransaction[] }>;
  range: Range;
  page: number;
  needsReview: boolean;
  needsReviewCount: number | null;
  onPage: (page: number) => void;
  onNeedsReview: (on: boolean) => void;
  review: {
    canEdit: boolean;
    savingId: string;
    error: string;
    onChange: (id: string, next: BankCategory, previous: BankCategory, merchant: string) => void;
  };
}

export function BankTransactionsBody({
  rows,
  range,
  page,
  needsReview,
  needsReviewCount,
  onPage,
  onNeedsReview,
  review
}: BankTransactionsBodyProps) {
  const data = rows.data;
  const view = data ? bankTransactionRows(data.results, range) : [];
  return (
    <Panel title={ALL_BANK_TITLE}>
      <Box sx={{ px: '14px', pt: '4px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
          {ALL_BANK_CAPTION} Positive amounts are money out; negative amounts are money in.
        </Typography>
        <FormControlLabel
          control={<Switch checked={needsReview} onChange={(_, on) => onNeedsReview(on)} />}
          label={`Needs review${needsReviewCount === null ? '' : ` (${needsReviewCount})`}`}
        />
        {review.error ? <Alert severity="error">{review.error}</Alert> : null}
      </Box>
      {rows.isError ? (
        <Alert severity="error" sx={{ m: '14px' }}>
          Could not load transactions. <Button onClick={() => rows.refetch()}>Retry</Button>
        </Alert>
      ) : rows.isLoading || !data ? (
        <Box sx={{ p: '14px' }}>
          <Skeleton height={28} />
          <Skeleton height={28} />
          <Skeleton height={28} />
        </Box>
      ) : (
        <>
          {/* Six columns do not fit a phone; the table scrolls inside its own panel, never the page. */}
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" aria-label="Bank transactions" sx={{ minWidth: 760 }}>
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
                {view.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.date}</TableCell>
                    <TableCell>
                      {row.description}
                      {row.detail ? (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {row.detail}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.account}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {row.amount}
                    </TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        // The theme stretches every svg to 100% under 768px (compStyleOverride); keep the arrow its own size.
                        sx={{ maxWidth: '100%', '& .MuiSelect-icon': { width: '1em !important' } }}
                        value={row.category}
                        disabled={!review.canEdit || !!review.savingId}
                        inputProps={{ 'aria-label': `Category for ${row.description} on ${row.date}` }}
                        onChange={(ev) => review.onChange(row.id, ev.target.value as BankCategory, row.category, row.description)}
                        renderValue={(value) => bankCategoryLabel(value as BankCategory)}
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
                      <Chip size="small" label={row.status} color={row.needsReview ? 'warning' : 'default'} />
                    </TableCell>
                  </TableRow>
                ))}
                {view.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>No transactions for this date range and filter.</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data.count}
            page={page}
            rowsPerPage={50}
            rowsPerPageOptions={[50]}
            onPageChange={(_, p) => onPage(p)}
          />
        </>
      )}
    </Panel>
  );
}

export default function BankTransactionsPanel({
  range,
  scope,
  report
}: {
  range: Range;
  scope: (string | undefined)[];
  report: BankReport | undefined;
}) {
  const role = useSelector(selectEffectiveRole);
  const [page, setPage] = useState(0);
  const [needsReview, setNeedsReview] = useState(false);
  const bankReview = useBankReview();
  const rows = useQuery({
    queryKey: ['banking', 'transactions', ...scope, range, page, needsReview],
    queryFn: () => bankingApi.transactions({ start_date: range.start, end_date: range.end }, page + 1, needsReview),
    refetchInterval: 30_000,
    retry: false
  });
  return (
    <>
      <BankTransactionsBody
        rows={{ data: rows.data, isLoading: rows.isLoading, isError: rows.isError, refetch: () => void rows.refetch() }}
        range={range}
        page={page}
        needsReview={needsReview}
        needsReviewCount={report ? report.needs_review_count : null}
        onPage={setPage}
        onNeedsReview={(on) => {
          setNeedsReview(on);
          setPage(0);
        }}
        review={{
          canEdit: isAdminOrAbove(role?.role_type),
          savingId: bankReview.savingId,
          error: bankReview.error,
          onChange: (id, next, previous, merchant) => void bankReview.change(id, next, previous, merchant)
        }}
      />
      {bankReview.snackbar}
    </>
  );
}
