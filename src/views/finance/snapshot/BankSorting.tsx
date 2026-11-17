import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// material-ui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

// project imports
import bankingApi, { type BankReport, type UnsortedMoneyOut } from 'api/banking';
import { useSelector } from 'store';
import { selectEffectiveRole } from 'store/selectors/effectiveRole';
import { localToday } from 'utils/financeFormat';
import { isAdminOrAbove } from 'utils/role';
import CoverageLines from '../CoverageLines';
import SortDrawer from '../SortDrawer';
import { unsortedRow, type Loaded } from '../expenseTruth';
import { useFinancialSource } from '../useFinancialSource';
import type { Range } from './snapshotView';

// ==============================|| FINANCE - EXPENSES, BANK SORTING ||============================== //
// Expense truth X5 (main, PR #201) put these under "Money out by category" on the old bank page,
// which this branch replaced. They live under the Expenses page's Categories now, for a bank owner
// on the whole business: "Not sorted yet (n)" with its Sort drawer (one pick per merchant teaches a
// rule), then the coverage line, the older-history nudge and the CSV files already added. Every
// sort and upload refreshes the finance queries too (`refreshAfterReview`).

export interface NotSortedLineProps {
  unsorted: Loaded<UnsortedMoneyOut>;
  currency: string;
  onSort: () => void;
  onRetry: () => void;
}

/** "Not sorted yet (n)  $X  Sort", shown only above zero; a failed read says so. */
export function NotSortedLine({ unsorted, currency, onSort, onRetry }: NotSortedLineProps) {
  const row = unsortedRow(unsorted, currency);
  if (row.kind === 'hidden') return null;
  if (row.kind === 'error')
    return (
      <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
        Could not load what is not sorted yet.{' '}
        <Button size="small" onClick={onRetry}>
          Retry
        </Button>
      </Typography>
    );
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Typography component="span" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
        {row.label}
      </Typography>
      <Button size="small" onClick={onSort}>
        Sort
      </Button>
      <Typography component="span" sx={{ ml: 'auto', fontSize: '0.875rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {row.amount}
      </Typography>
    </Box>
  );
}

export default function BankSorting({
  range,
  scope,
  currency,
  report
}: {
  range: Range;
  scope: (string | undefined)[];
  currency: string;
  report: BankReport | undefined;
}) {
  const role = useSelector(selectEffectiveRole);
  const source = useFinancialSource();
  const [open, setOpen] = useState(false);
  const isAdmin = isAdminOrAbove(role?.role_type);
  const unsorted = useQuery({
    queryKey: ['banking', 'unsorted', ...scope, range],
    queryFn: () => bankingApi.unsorted({ start_date: range.start, end_date: range.end }),
    retry: false
  });
  const state: Loaded<UnsortedMoneyOut> = unsorted.isSuccess
    ? { status: 'success', data: unsorted.data }
    : unsorted.isError
      ? { status: 'error' }
      : { status: 'pending' };
  return (
    <Box sx={{ px: '14px', pt: 1, pb: '12px', display: 'flex', flexDirection: 'column', gap: 1, '&:empty': { display: 'none' } }}>
      <NotSortedLine unsorted={state} currency={currency} onSort={() => setOpen(true)} onRetry={() => void unsorted.refetch()} />
      {report?.connected && role?.company_id ? (
        <CoverageLines
          report={report}
          today={localToday()}
          companyId={role.company_id}
          isAdmin={isAdmin}
          stripe={source.data?.provider === 'stripe'}
        />
      ) : null}
      <SortDrawer open={open} onClose={() => setOpen(false)} currency={currency} unsorted={unsorted} canSort={isAdmin} />
    </Box>
  );
}
