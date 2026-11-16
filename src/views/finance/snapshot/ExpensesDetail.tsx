import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

// material-ui
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
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
import financeSnapshotApi, { type ExpenseBucket, type FinanceExpenses } from 'api/financeSnapshot';
import { AlertStrip, Panel, PanelMessage, StatusTag } from 'ui-component/frame';
import MerchantRules from '../MerchantRules';
import BankTransactionsPanel from './BankTransactionsPanel';
import DetailFrame from './DetailFrame';
import ExpenseTools from './ExpenseTools';
import { Retry, UnavailableMessage, type Loadable } from './SnapshotSections';
import { bucketFromParams, EXPENSE_FILTERS, expensesView, pageFromParams } from './detailView';
import type { Range } from './snapshotView';
import { loadable, useFinanceRange } from './useFinanceRange';

// ==============================|| FINANCE - EXPENSES ||============================== //
// Bucket, then category, then the rows (/finance/expenses/, 50 a page). Bank owners review and
// recategorise their bank transactions here and manage merchant rules; everyone else gets the
// expense catalogue's tools (Add expense, Upload invoice, Recurring bills, Manage expenses).

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
  /** The bank review panel and merchant rules, for bank owners. */
  bankSection?: ReactNode;
}

export function ExpensesBody({ expenses, bucket, category, page, onFilter, range, locationId, controls, bankSection }: ExpensesBodyProps) {
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
            onClick={() => onFilter({ bucket: f.bucket, category: null, page: null })}
          />
        ))}
        {e && e.currencies.length > 1 ? (
          <TextField
            select
            size="small"
            label="Currency"
            value={e.currency}
            onChange={(ev) => onFilter({ currency: ev.target.value, category: null, page: null })}
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
                        onClick={() => onFilter({ category: selected ? null : c.value, page: null })}
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
          </Panel>

          <Panel title={category ?? 'Expenses'}>
            {v.rows.length === 0 ? (
              <PanelMessage>No expenses for this filter.</PanelMessage>
            ) : (
              <>
                <TableContainer>
                  <Table size="small" aria-label="Expenses">
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
                          <TableCell>{r.category}</TableCell>
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
                  onPageChange={(_, p) => onFilter({ page: p ? String(p) : null })}
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
  const bucket = bucketFromParams(params);
  const category = params.get('category');
  const currency = params.get('currency') ?? undefined;
  const page = pageFromParams(params);
  const query = { bucket: bucket ?? undefined, category: category ?? undefined, currency, page: page + 1 };
  const expenses = useQuery({
    queryKey: ['finance', 'expenses', ...scope, range, locationId, query],
    queryFn: () => financeSnapshotApi.expenses({ ...range, locationId }, query),
    enabled,
    retry: false
  });
  const source = expenses.data?.expense_source;
  return (
    <ExpensesBody
      expenses={loadable(expenses)}
      bucket={bucket}
      category={category}
      page={page}
      onFilter={update}
      range={range}
      locationId={locationId}
      controls={f.controls(source && source !== 'bank' ? <ExpenseTools range={range} /> : null)}
      bankSection={
        source === 'bank' ? (
          <>
            <BankTransactionsPanel key={bucket ?? 'all'} range={range} initialNeedsReview={bucket === 'unreviewed'} />
            <MerchantRules />
          </>
        ) : null
      }
    />
  );
}
