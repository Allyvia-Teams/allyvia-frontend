import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

// material-ui
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

// project imports
import financeSnapshotApi, { type FinanceProfit } from 'api/financeSnapshot';
import { Panel, PanelMessage } from 'ui-component/frame';
import DetailFrame, { CurrencyGroup, currencyHeading } from './DetailFrame';
import { AmountRows, cardsGrid, FigureRowList, Retry, type Loadable } from './SnapshotSections';
import { gapView, profitView } from './detailView';
import type { Range } from './snapshotView';
import { loadable, useFinanceRange } from './useFinanceRange';

// ==============================|| FINANCE - PROFIT ||============================== //
// The profit and loss statement in section 4 order, with tax, margin, inventory bought and
// equipment beside it (never in profit), the cost-of-goods quality, and, for QuickBooks owners
// with a large gap, why the figure differs from QuickBooks. All from /finance/profit/.

const BASIS: Record<string, string> = {
  billed: 'Expenses are billed, from QuickBooks.',
  paid: 'Expenses are paid, from your bank.'
};

export interface ProfitBodyProps {
  profit: Loadable<FinanceProfit>;
  range: Range;
  locationId?: string | null;
  controls?: ReactNode;
}

export function ProfitBody({ profit, range, locationId, controls }: ProfitBodyProps) {
  const p = profit.data;
  const blocks = p?.currencies ?? [];
  const gap = p ? gapView(p) : null;
  return (
    <DetailFrame
      title="Profit"
      subtitle={p?.expense_basis ? `Net profit is gross profit minus operating expenses. ${BASIS[p.expense_basis] ?? ''}` : undefined}
      range={range}
      locationId={locationId}
      controls={controls}
    >
      {profit.isLoading ? (
        <Panel title="Profit and loss">
          <Box sx={{ p: '14px' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={28} />
            ))}
          </Box>
        </Panel>
      ) : profit.isError || !p ? (
        <Retry message="Couldn't load your profit and loss." onRetry={profit.refetch} />
      ) : (
        <>
          {blocks.map((block) => {
            const v = profitView(block, { source: p.expense_source, locationId });
            return (
              <CurrencyGroup key={block.currency} heading={currencyHeading(blocks.length, block.currency)}>
                <Panel title="Profit and loss">
                  <FigureRowList rows={v.statement} />
                  {v.costNotes.length ? (
                    <Box sx={{ px: '14px', pb: '12px' }}>
                      {v.costNotes.map((n) => (
                        <Typography key={n} sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                          {n}
                        </Typography>
                      ))}
                    </Box>
                  ) : null}
                </Panel>
                <Box sx={{ ...cardsGrid, mb: 0 }}>
                  <Panel title="Beside the statement" note="Not in profit">
                    <FigureRowList rows={v.beside} />
                  </Panel>
                  <Panel title="Operating expenses by category">
                    {v.buckets.length ? <AmountRows rows={v.buckets} /> : <PanelMessage>No operating expenses to show.</PanelMessage>}
                  </Panel>
                </Box>
              </CurrencyGroup>
            );
          })}
          {gap && 'quiet' in gap ? (
            <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{gap.quiet}</Typography>
          ) : gap ? (
            <Panel title={gap.heading}>
              <AmountRows
                rows={[
                  { label: 'Difference from QuickBooks', amount: gap.gap },
                  { label: "QuickBooks' net income", amount: gap.quickbooksNetIncome },
                  ...gap.reasons
                ]}
              />
            </Panel>
          ) : null}
        </>
      )}
    </DetailFrame>
  );
}

export default function ProfitDetail() {
  const f = useFinanceRange();
  const { range, locationId, scope, enabled } = f;
  const profit = useQuery({
    queryKey: ['finance', 'profit', ...scope, range, locationId],
    queryFn: () => financeSnapshotApi.profit({ ...range, locationId }),
    enabled,
    retry: false
  });
  return <ProfitBody profit={loadable(profit)} range={range} locationId={locationId} controls={f.controls()} />;
}
