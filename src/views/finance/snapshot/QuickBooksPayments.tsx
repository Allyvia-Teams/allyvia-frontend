import { useEffect } from 'react';

// material-ui
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

// project imports
import { useDispatch, useSelector } from 'store';
import type { RootState } from 'store';
import { fetchCashFlow } from 'store/slices/finance';
import { Panel, PanelMessage } from 'ui-component/frame';
import { AmountRows } from './SnapshotSections';
import { QUICKBOOKS_PAYMENTS_LINE, QUICKBOOKS_PAYMENTS_TITLE, quickBooksPaymentsRows } from './detailView';
import type { AmountLine, Range } from './snapshotView';

// ==============================|| FINANCE - QUICKBOOKS PAYMENTS RECORDED ||============================== //
// The old cash flow statement, moved off the Cash page (session 9): it counts only QuickBooks
// invoice payments and bills paid, so beside POS sales it read as the store's cash. Plain rows,
// no tiles and no green or red, under a title that says what it is.

export function QuickBooksPaymentsBody({ rows, loading, error }: { rows: AmountLine[] | null; loading: boolean; error: string | null }) {
  return (
    <Panel title={QUICKBOOKS_PAYMENTS_TITLE}>
      <Typography sx={{ px: '14px', pt: '12px', fontSize: '0.8125rem', color: 'text.secondary' }}>{QUICKBOOKS_PAYMENTS_LINE}</Typography>
      {loading ? (
        <Box sx={{ p: '14px' }}>
          <Skeleton height={28} />
          <Skeleton height={28} />
          <Skeleton height={28} />
        </Box>
      ) : error ? (
        <PanelMessage>Couldn't load the payments QuickBooks recorded.</PanelMessage>
      ) : rows ? (
        <AmountRows rows={rows} />
      ) : (
        <PanelMessage>No payments recorded in QuickBooks for this period.</PanelMessage>
      )}
    </Panel>
  );
}

export default function QuickBooksPayments({ range }: { range: Range }) {
  const dispatch = useDispatch();
  const { cashFlow, loading, errors } = useSelector((state: RootState) => state.finance);
  useEffect(() => {
    dispatch(fetchCashFlow({ startDate: range.start, endDate: range.end }));
  }, [dispatch, range.start, range.end]);
  return <QuickBooksPaymentsBody rows={quickBooksPaymentsRows(cashFlow)} loading={!!loading.cashFlow} error={errors.cashFlow} />;
}
