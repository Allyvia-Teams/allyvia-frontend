import { useEffect, type ReactElement, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

// material-ui
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

// project imports
import { useDispatch } from 'store';
import {
  fetchBalanceSheet,
  fetchInvoiceList,
  fetchInvoiceStatistics,
  fetchInvoiceSuggestions,
  fetchPaymentList,
  fetchPaymentStatistics,
  fetchPaymentSummary,
  setFilters
} from 'store/slices/finance';
import type { FinanceSnapshot } from 'api/financeSnapshot';
import BalanceSheetSection from '../tabs/BalanceSheetSection';
import InvoicesTab from '../tabs/Invoices';
import PaymentsTab from '../tabs/Payments';
import DetailFrame from './DetailFrame';
import QuickBooksPayments from './QuickBooksPayments';
import { Retry, type Loadable } from './SnapshotSections';
import { quickBooksExtrasAllowed } from './detailView';
import { withRange, type Range } from './snapshotView';
import { useFinanceRange, useSnapshotQuery, loadable } from './useFinanceRange';

// ==============================|| FINANCE - QUICKBOOKS EXTRAS ||============================== //
// Invoices, Payments and the balance sheet, moved unchanged from the old tabbed page. Only for
// owners whose expenses come from QuickBooks; anyone else is sent back to the snapshot.

export type ExtrasView = 'invoices' | 'payments' | 'balance-sheet';
const VIEWS: { value: ExtrasView; label: string }[] = [
  { value: 'invoices', label: 'Invoices' },
  { value: 'payments', label: 'Payments' },
  { value: 'balance-sheet', label: 'Balance sheet' }
];
export const extrasView = (raw: string | null): ExtrasView => VIEWS.find((v) => v.value === raw)?.value ?? 'invoices';

/** The page for a QuickBooks owner; a redirect to the snapshot for anyone else. */
export function QuickBooksGate({
  snapshot,
  range,
  locationId,
  children
}: {
  snapshot: Loadable<FinanceSnapshot>;
  range: Range;
  locationId?: string | null;
  children: ReactNode;
}): ReactElement | null {
  if (snapshot.isLoading) return null;
  if (snapshot.isError || !snapshot.data) return <Retry message="Couldn't check your QuickBooks connection." onRetry={snapshot.refetch} />;
  if (!quickBooksExtrasAllowed(snapshot.data)) return <Navigate to={withRange('/finance', range, locationId)} replace />;
  return <>{children}</>;
}

function ExtrasContent({ view, range }: { view: ExtrasView; range: Range }) {
  const dispatch = useDispatch();
  useEffect(() => {
    const window = { startDate: range.start, endDate: range.end };
    // The moved tabs read their range and data from the finance store, as they did before.
    dispatch(setFilters(window));
    if (view === 'invoices') {
      dispatch(fetchInvoiceStatistics(window));
      dispatch(fetchInvoiceList(window));
      dispatch(fetchInvoiceSuggestions());
    } else if (view === 'payments') {
      dispatch(fetchPaymentSummary(window));
      dispatch(fetchPaymentStatistics(window));
      dispatch(fetchPaymentList(window));
    } else {
      dispatch(fetchBalanceSheet({ asOfDate: range.end }));
    }
  }, [dispatch, view, range.start, range.end]);
  if (view === 'payments')
    return (
      <>
        <QuickBooksPayments range={range} />
        <PaymentsTab />
      </>
    );
  if (view === 'balance-sheet') return <BalanceSheetSection />;
  return <InvoicesTab />;
}

export default function QuickBooksExtras() {
  const f = useFinanceRange();
  const { range, locationId, params, update } = f;
  const snapshot = useSnapshotQuery(f);
  const view = extrasView(params.get('view'));
  return (
    <QuickBooksGate snapshot={loadable(snapshot)} range={range} locationId={locationId}>
      <DetailFrame
        title="QuickBooks"
        subtitle="Straight from your QuickBooks books."
        range={range}
        locationId={locationId}
        controls={f.controls()}
      >
        <Tabs
          value={view}
          onChange={(_, v: ExtrasView) => update({ view: v })}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="QuickBooks"
        >
          {VIEWS.map((v) => (
            <Tab key={v.value} value={v.value} label={v.label} />
          ))}
        </Tabs>
        <ExtrasContent view={view} range={range} />
      </DetailFrame>
    </QuickBooksGate>
  );
}
