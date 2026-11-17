import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

// material-ui
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';

// project imports
import financeSnapshotApi, { type FinanceCash } from 'api/financeSnapshot';
import { Panel, PanelMessage } from 'ui-component/frame';
import DetailFrame, { CurrencyGroup, currencyHeading } from './DetailFrame';
import BankTransactionsPanel from './BankTransactionsPanel';
import { useBankReport } from './useBankReport';
import { FeedStrip, type FeedAlert, feedAlert } from './bankActivity';
import { AmountRows, cardsGrid, CardNote, FigureRowList, Retry, type Loadable } from './SnapshotSections';
import { cashView, reviewBankHref } from './detailView';
import { formatSyncedAt } from './snapshotFormat';
import type { Range } from './snapshotView';
import { loadable, useFinanceRange } from './useFinanceRange';

// ==============================|| FINANCE - CASH ||============================== //
// Cash per currency from /finance/cash/, the snapshot's own figures. Bank owners: balance, money
// in, money out, accounts, last synced and a link to review their bank rows. QuickBooks owners:
// the balance, one line saying QuickBooks gives balances only, and accounts. The old cash flow
// statement counted only QuickBooks payments, so it lives on the QuickBooks page instead.

export interface CashBodyProps {
  cash: Loadable<FinanceCash>;
  range: Range;
  locationId?: string | null;
  controls?: ReactNode;
  /** Bank owners on the whole business: the one feed strip (session 10, Part B). */
  feed?: FeedAlert | null;
  /** Bank owners on the whole business: every bank movement, under the balance and accounts (Part A). */
  bankSection?: ReactNode;
}

export function CashBody({ cash, range, locationId, controls, feed, bankSection }: CashBodyProps) {
  const c = cash.data;
  const blocks = c?.currencies ?? [];
  const review = c ? reviewBankHref(c.expense_source, range, locationId) : null;
  return (
    <DetailFrame
      title="Cash"
      subtitle={c ? (c.last_synced_at ? `Last synced ${formatSyncedAt(c.last_synced_at)}` : 'Not synced yet') : undefined}
      range={range}
      locationId={locationId}
      controls={controls}
    >
      {feed ? <FeedStrip alert={feed} /> : null}
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
                <Panel title="Cash">
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
      {bankSection}
      {review ? (
        <Box sx={{ fontSize: '0.875rem' }}>
          <Link component={RouterLink} to={review} underline="hover" sx={{ fontWeight: 600 }}>
            Review bank transactions
          </Link>
        </Box>
      ) : null}
    </DetailFrame>
  );
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
  // The feed and the full transaction list are the bank's, so a bank owner sees them on the whole
  // business only (a store view shows nothing from the bank, as the cash figures already say).
  const bankWhole = cash.data?.expense_source === 'bank' && !locationId;
  const report = useBankReport(range, scope, enabled && bankWhole);
  return (
    <CashBody
      cash={loadable(cash)}
      range={range}
      locationId={locationId}
      controls={f.controls()}
      feed={bankWhole ? feedAlert(report.data) : null}
      bankSection={bankWhole ? <BankTransactionsPanel range={range} scope={scope} report={report.data} /> : null}
    />
  );
}
