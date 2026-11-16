import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

// material-ui
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

// project imports
import financeSnapshotApi, { type FinanceCash } from 'api/financeSnapshot';
import { Panel, PanelMessage } from 'ui-component/frame';
import DetailFrame, { CurrencyGroup, currencyHeading } from './DetailFrame';
import { AmountRows, cardsGrid, FigureRowList, Retry, type Loadable } from './SnapshotSections';
import { positionView } from './detailView';
import type { Range } from './snapshotView';
import { loadable, useFinanceRange } from './useFinanceRange';

// ==============================|| FINANCE - WHAT YOU HAVE AND OWE ||============================== //
// Cash by account, inventory at cost (with the count of items missing a cost) and unpaid bills,
// from /finance/cash/. Built from what Allyvia holds; never called a balance sheet.

export interface PositionBodyProps {
  cash: Loadable<FinanceCash>;
  range: Range;
  locationId?: string | null;
  controls?: ReactNode;
}

export function PositionBody({ cash, range, locationId, controls }: PositionBodyProps) {
  const c = cash.data;
  const blocks = c?.currencies ?? [];
  return (
    <DetailFrame
      title="What you have and owe"
      subtitle="Cash, stock at cost and bills not yet paid, from what Allyvia holds."
      range={range}
      locationId={locationId}
      controls={controls}
    >
      {cash.isLoading ? (
        <Panel title="What you have and owe">
          <Box sx={{ p: '14px' }}>
            <Skeleton height={28} />
            <Skeleton height={28} />
            <Skeleton height={28} />
          </Box>
        </Panel>
      ) : cash.isError || !c ? (
        <Retry message="Couldn't load what you have and owe." onRetry={cash.refetch} />
      ) : (
        blocks.map((block) => {
          const v = positionView(block);
          return (
            <CurrencyGroup key={block.currency} heading={currencyHeading(blocks.length, block.currency)}>
              <Box sx={{ ...cardsGrid, mb: 0 }}>
                <Panel title="Have and owe">
                  <FigureRowList rows={v.figures} />
                  {v.missingCost ? (
                    <Typography sx={{ px: '14px', pb: '12px', fontSize: '0.8125rem', color: 'text.secondary' }}>{v.missingCost}</Typography>
                  ) : null}
                </Panel>
                <Panel title="Cash by account">
                  {v.accounts.length ? <AmountRows rows={v.accounts} /> : <PanelMessage>No cash accounts to show.</PanelMessage>}
                </Panel>
              </Box>
            </CurrencyGroup>
          );
        })
      )}
    </DetailFrame>
  );
}

export default function PositionDetail() {
  const f = useFinanceRange();
  const { range, locationId, scope, enabled } = f;
  const cash = useQuery({
    queryKey: ['finance', 'cash', ...scope, range, locationId],
    queryFn: () => financeSnapshotApi.cash({ ...range, locationId }),
    enabled,
    retry: false
  });
  return <PositionBody cash={loadable(cash)} range={range} locationId={locationId} controls={f.controls()} />;
}
