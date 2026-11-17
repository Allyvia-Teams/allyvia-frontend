import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

// material-ui
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// project imports
import type { BankCategory } from 'api/banking';
import financeSnapshotApi, { type ExpenseBucket, type FinanceExpenses } from 'api/financeSnapshot';
import { useSelector } from 'store';
import { selectEffectiveRole } from 'store/selectors/effectiveRole';
import { isAdminOrAbove } from 'utils/role';
import { groupedCategories } from '../bankCategories';
import { bankCategoryLabel } from '../bucketLabels';
import { AlertStrip, Panel, PanelMessage, StatusTag } from 'ui-component/frame';
import MerchantRules from '../MerchantRules';
import { allBankTransactionsLink } from './bankActivity';
import BankSorting from './BankSorting';
import { useBankReport } from './useBankReport';
import { useBankReview } from './BankReview';
import DetailFrame from './DetailFrame';
import ExpenseTools from './ExpenseTools';
import { Retry, UnavailableMessage, type Loadable } from './SnapshotSections';
import { bucketFromParams, EXPENSE_FILTERS, expensesQueryFromParams, expensesView, filterUpdate, pageFromParams } from './detailView';
import type { Range } from './snapshotView';
import { loadable, useFinanceRange } from './useFinanceRange';

// ==============================|| FINANCE - EXPENSES ||============================== //
// Bucket, then category, then the rows (/finance/expenses/, 50 a page): one table for every
// owner, filtered on the server by the chips, the category row, the currency, the page, the range
// and the store. Bank owners correct each row's category in the table (undo snackbar, merchant
// rules below); everyone else gets the expense catalogue's tools (Add expense, Upload invoice,
// Recurring bills, Manage expenses). "Not sorted yet" is the bank's needs-review list.

export interface ExpensesBodyProps {
  expenses: Loadable<FinanceExpenses>;
  bucket: ExpenseBucket | null;
  category: string | null;
  page: number;
  /** Set or clear URL params; changing a filter goes back to the first page. */
  onFilter: (next: Record<string, string | null>) => void;
  range: Range;
  locationId?: string | null;
  controls?: ReactNode;
  /** Bank owners: the row category select (admins) and what saving is doing. */
  review?: { canEdit: boolean; savingId: string; error: string; onChange: ExpenseReviewChange } | null;
  /** Merchant rules and the review snackbar, for bank owners. */
  bankSection?: ReactNode;
  /** Under the Categories list, for bank owners: X5's "Not sorted yet" row and the coverage lines. */
  categoriesFooter?: ReactNode;
}

/**
 * Under 600px a row is two lines: date, payee and amount, then the category (the select for a
 * bank owner) under the payee, so the amount never scrolls out of view and the select has room.
 */
const PHONE_ROWS = {
  '@media (max-width:599.95px)': {
    display: 'block',
    '& thead': { display: 'none' },
    '& tbody': { display: 'block' },
    '& tr': {
      display: 'grid',
      // A fixed date column, so every row's description starts at the same x ("Oct 9" vs "Oct 30").
      gridTemplateColumns: '3.25rem minmax(0, 1fr) auto',
      columnGap: '12px',
      px: '14px',
      py: '10px',
      borderBottom: '1px solid',
      borderColor: 'divider'
    },
    '& td': { border: 0, p: 0 },
    '& td:nth-of-type(4)': { order: 3 },
    '& td:nth-of-type(3)': { order: 4, gridColumn: '2 / 4', pt: '6px', minWidth: 0 }
  }
} as const;

export type ExpenseReviewChange = (rowId: string, category: BankCategory, previous: BankCategory, merchant: string) => void;

export function ExpensesBody({
  expenses,
  bucket,
  category,
  page,
  onFilter,
  range,
  locationId,
  controls,
  review,
  bankSection,
  categoriesFooter
}: ExpensesBodyProps) {
  const e = expenses.data;
  const v = e ? expensesView(e, { locationId }) : null;
  return (
    <DetailFrame title="Expenses" subtitle={v?.basis ?? undefined} range={range} locationId={locationId} controls={controls}>
      {e?.expense_source === 'accounting_conflict' ? (
        <AlertStrip
          title="QuickBooks and Xero are both connected."
          body="Choose one in Settings so expenses can be read."
          action={{ label: 'Choose', to: '/settings?tab=integrations' }}
        />
      ) : null}

      <Box role="group" aria-label="Filter by bucket" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {EXPENSE_FILTERS.map((f) => (
          <Chip
            key={f.label}
            label={f.label}
            clickable
            color={bucket === f.bucket ? 'primary' : 'default'}
            variant={bucket === f.bucket ? 'filled' : 'outlined'}
            aria-pressed={bucket === f.bucket}
            onClick={() => onFilter(filterUpdate.bucket(f.bucket))}
          />
        ))}
        {e && e.currencies.length > 1 ? (
          <TextField
            select
            size="small"
            label="Currency"
            value={e.currency}
            onChange={(ev) => onFilter(filterUpdate.currency(ev.target.value))}
            sx={{ minWidth: 110, ml: 'auto' }}
          >
            {e.currencies.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
      </Box>

      {expenses.isLoading ? (
        <Panel title="Categories">
          <Box sx={{ p: '14px' }}>
            <Skeleton height={28} />
            <Skeleton height={28} />
            <Skeleton height={28} />
          </Box>
        </Panel>
      ) : expenses.isError || !e || !v ? (
        <Retry message="Couldn't load your expenses." onRetry={expenses.refetch} />
      ) : v.unavailable ? (
        <Panel title="Categories">
          <UnavailableMessage reason={v.unavailable} fixHref={v.fixHref} />
        </Panel>
      ) : (
        <>
          <Panel
            title="Categories"
            note={v.badge.label ? undefined : e.currency}
            action={v.badge.label ? <StatusTag label={v.badge.label} tooltip={v.badge.tooltip} tone="warning" /> : undefined}
          >
            {v.categories.length === 0 ? (
              <PanelMessage>No expenses in this period.</PanelMessage>
            ) : (
              <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                {v.categories.map((c) => {
                  const selected = category === c.value;
                  return (
                    <Box
                      component="li"
                      key={`${c.bucket}:${c.label}`}
                      sx={{ borderTop: '1px solid', borderColor: 'grey.100', '&:first-of-type': { borderTop: 0 } }}
                    >
                      <ButtonBase
                        onClick={() => onFilter(filterUpdate.category(selected ? null : c.value))}
                        aria-pressed={selected}
                        sx={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 1.5,
                          px: '14px',
                          py: 1,
                          textAlign: 'left',
                          bgcolor: selected ? 'action.selected' : 'transparent',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <Typography component="span" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                          {c.label}
                        </Typography>
                        <Typography
                          component="span"
                          sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.dark', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {c.amount}
                        </Typography>
                      </ButtonBase>
                    </Box>
                  );
                })}
              </Box>
            )}
            {v.badge.label ? (
              <Typography sx={{ px: '14px', pb: '12px', fontSize: '0.8125rem', color: 'text.disabled' }}>{v.badge.tooltip}</Typography>
            ) : null}
            {categoriesFooter}
          </Panel>

          <Panel title={v.tableTitle(category, bucket)}>
            {review?.error ? (
              <Alert severity="error" sx={{ m: '14px' }}>
                {review.error}
              </Alert>
            ) : null}
            {v.rows.length === 0 ? (
              <PanelMessage>No expenses for this filter.</PanelMessage>
            ) : (
              <>
                <TableContainer>
                  <Table size="small" aria-label="Expenses" sx={PHONE_ROWS}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Payee</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {v.rows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.date}</TableCell>
                          <TableCell>{r.payee}</TableCell>
                          <TableCell>
                            {review?.canEdit && r.bankCategory ? (
                              <Select
                                size="small"
                                // The theme stretches every svg to 100% under 768px (compStyleOverride); keep the arrow its own size.
                                sx={{ maxWidth: '100%', '& .MuiSelect-icon': { width: '1em !important' } }}
                                value={r.bankCategory}
                                disabled={!!review.savingId}
                                inputProps={{ 'aria-label': `Category for ${r.payee} on ${r.date}` }}
                                onChange={(ev) =>
                                  review.onChange(r.id, ev.target.value as BankCategory, r.bankCategory as BankCategory, r.payee)
                                }
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
                            ) : (
                              r.category
                            )}
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                            {r.amount}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={e.count}
                  page={page}
                  rowsPerPage={e.page_size}
                  rowsPerPageOptions={[e.page_size]}
                  onPageChange={(_, p) => onFilter(filterUpdate.page(p))}
                />
              </>
            )}
          </Panel>
        </>
      )}

      {bankSection}
    </DetailFrame>
  );
}

export default function ExpensesDetail() {
  const f = useFinanceRange();
  const { range, locationId, scope, enabled, params, update } = f;
  const role = useSelector(selectEffectiveRole);
  const bucket = bucketFromParams(params);
  const category = params.get('category');
  const page = pageFromParams(params);
  const query = expensesQueryFromParams(params);
  const expenses = useQuery({
    queryKey: ['finance', 'expenses', ...scope, range, locationId, query],
    queryFn: () => financeSnapshotApi.expenses({ ...range, locationId }, query),
    enabled,
    retry: false
  });
  const bankReview = useBankReview();
  const source = expenses.data?.expense_source;
  const bank = source === 'bank';
  // X5's sorting and coverage are the bank's, so they show on the whole business only.
  const bankWhole = bank && !locationId;
  const report = useBankReport(range, scope, enabled && bankWhole);
  return (
    <ExpensesBody
      expenses={loadable(expenses)}
      bucket={bucket}
      category={category}
      page={page}
      onFilter={update}
      range={range}
      locationId={locationId}
      controls={f.controls(source && !bank ? <ExpenseTools range={range} /> : null)}
      review={
        bank
          ? {
              canEdit: isAdminOrAbove(role?.role_type),
              savingId: bankReview.savingId,
              error: bankReview.error,
              onChange: (id, next, previous, merchant) => void bankReview.change(id, next, previous, merchant)
            }
          : null
      }
      categoriesFooter={
        bankWhole && expenses.data ? (
          <BankSorting range={range} scope={scope} currency={expenses.data.currency} report={report.data} />
        ) : null
      }
      bankSection={
        bank ? (
          <>
            {allBankTransactionsLink(range, locationId)}
            <MerchantRules />
            {bankReview.snackbar}
          </>
        ) : null
      }
    />
  );
}
