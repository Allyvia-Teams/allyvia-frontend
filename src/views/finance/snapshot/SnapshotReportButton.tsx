import { useTheme } from '@mui/material/styles';

// project imports
import { useDispatch } from 'store';
import {
  fetchBalanceSheet,
  fetchCashFlow,
  fetchExpenseSummary,
  fetchExpensesList,
  fetchInvoiceList,
  fetchInvoiceStatistics,
  fetchProfitAndLoss
} from 'store/slices/finance';
import { FinanceReportButton } from 'ui-component/finance';
import type { Range } from './snapshotView';

/**
 * The QuickBooks owners' CSV / PDF report, unchanged, moved from the old tabbed page to the
 * snapshot header. It loads what it reads only when the owner asks for a report, so the
 * snapshot does not make seven extra requests on every visit.
 */
export default function SnapshotReportButton({ range }: { range: Range }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const window = { startDate: range.start, endDate: range.end };
  const prepare = () =>
    Promise.all([
      dispatch(fetchProfitAndLoss(window)),
      dispatch(fetchInvoiceList(window)),
      dispatch(fetchExpensesList(window)),
      dispatch(fetchBalanceSheet({ asOfDate: range.end })),
      dispatch(fetchCashFlow(window)),
      dispatch(fetchInvoiceStatistics(window)),
      dispatch(fetchExpenseSummary(window))
    ]);
  return <FinanceReportButton startISO={range.start} endISO={range.end} theme={theme} prepare={prepare} />;
}
