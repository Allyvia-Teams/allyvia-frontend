import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

// material-ui
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

// project imports
import { useDispatch } from 'store';
import { fetchCashFlow } from 'store/slices/finance';
import financeSnapshotApi, { type FinanceCash } from 'api/financeSnapshot';
import { Panel, PanelMessage } from 'ui-component/frame';
import CashFlowSection from '../tabs/CashFlowSection';
import BankCashReport from './BankCashReport';
import DetailFrame, { CurrencyGroup, currencyHeading } from './DetailFrame';
import { AmountRows, cardsGrid, CardNote, FigureRowList, Retry, type Loadable } from './SnapshotSections';
import { cashView } from './detailView';
import { formatSyncedAt } from './snapshotFormat';
import type { Range } from './snapshotView';
import { loadable, useFinanceRange } from './useFinanceRange';

// ==============================|| FINANCE - CASH ||============================== //
// Cash per currency (balance, money in and out, accounts) from /finance/cash/, then the source's
// own detail: bank owners get their bank report, QuickBooks owners the cash flow statement.

export interface CashBodyProps {
  cash: Loadable<FinanceCash>;
  range: Range;
  locationId?: string | null;
  controls?: ReactNode;
  /** The source's own section: the bank report or the QuickBooks cash flow statement. */
  sourceSection?: ReactNode;
}

export function CashBody({ cash, range, locationId, controls, sourceSection }: CashBodyProps) {
  const c = cash.data;
  const blocks = c?.currencies ?? [];
  return (
    <DetailFrame
      title="Cash"
      subtitle={c ? (c.last_synced_at ? `Last synced ${formatSyncedAt(c.last_synced_at)}` : 'Not synced yet') : undefined}
      range={range}
      locationId={locationId}
      controls={controls}
    >
      {cash.isLoading ? (
        <Panel title="Cash">
          <Box sx={{ p: '14px' }}>
            <Skeleton height={28} />
            <Skeleton height={28} />
            <Skeleton height={28} />
          </Box>
        </Panel>
      ) : cash.isError || !c ? (
        <Retry message="Couldn't load your cash." onRetry={cash.refetch} />
      ) : (
        blocks.map((block) => {
          const v = cashView(block, { source: c.expense_source, locationId });
          return (
            <CurrencyGroup key={block.currency} heading={currencyHeading(blocks.length, block.currency)}>
              <Box sx={{ ...cardsGrid, mb: 0 }}>
                <Panel title="Money in and out">
                  <FigureRowList rows={v.figures} />
                  {v.note ? <CardNote>{v.note}</CardNote> : null}
                </Panel>
                <Panel title="Accounts">
                  {v.accounts.length ? <AmountRows rows={v.accounts} /> : <PanelMessage>No cash accounts to show.</PanelMessage>}
                </Panel>
              </Box>
            </CurrencyGroup>
          );
        })
      )}
      {sourceSection}
    </DetailFrame>
  );
}

function QuickBooksCashFlow({ range }: { range: Range }) {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchCashFlow({ startDate: range.start, endDate: range.end }));
  }, [dispatch, range.start, range.end]);
  return <CashFlowSection />;
}

export default function CashDetail() {
  const f = useFinanceRange();
  const { range, locationId, scope, enabled } = f;
  const cash = useQuery({
    queryKey: ['finance', 'cash', ...scope, range, locationId],
    queryFn: () => financeSnapshotApi.cash({ ...range, locationId }),
    enabled,
    retry: false
  });
  const source = cash.data?.expense_source;
  // Bank and QuickBooks figures are the whole business: neither shows on a store view.
  const sourceSection = locationId ? null : source === 'bank' ? (
    <BankCashReport range={range} />
  ) : source === 'quickbooks' ? (
    <QuickBooksCashFlow range={range} />
  ) : null;
  return <CashBody cash={loadable(cash)} range={range} locationId={locationId} controls={f.controls()} sourceSection={sourceSection} />;
}
