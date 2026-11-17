import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

// material-ui
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';

// project imports
import financeSnapshotApi, { type FinanceSales } from 'api/financeSnapshot';
import { posApi, type SalesSearchResponse } from 'features/pos/api/posApi';
import { Panel, PanelMessage } from 'ui-component/frame';
import DetailFrame, { CurrencyGroup, currencyHeading, Headline } from './DetailFrame';
import { AmountRows, cardsGrid, Retry, type Loadable } from './SnapshotSections';
import { ORDER_PAGE_SIZE, orderSearchParams, pageFromParams, paymentMethodLabel, salesView } from './detailView';
import { formatOrderAmount } from './snapshotFormat';
import { tableDay, type Range } from './snapshotView';
import { loadable, useFinanceRange } from './useFinanceRange';

// ==============================|| FINANCE - SALES ||============================== //
// Net sales by channel, by day and by payment method, refunds and tax, then the orders
// themselves for the same range (posApi.searchSales). Replaces the old POS Sales tab, which
// summed the ten most recent orders whatever the range.

export interface SalesBodyProps {
  sales: Loadable<FinanceSales>;
  orders: Loadable<SalesSearchResponse>;
  page: number;
  onPage: (page: number) => void;
  range: Range;
  locationId?: string | null;
  controls?: ReactNode;
}

/**
 * Under 600px an order is two lines: date, receipt and total, then how it was paid and its
 * status, so the total never scrolls out of view.
 */
const ORDER_PHONE_ROWS = {
  '@media (max-width:599.95px)': {
    display: 'block',
    '& thead': { display: 'none' },
    '& tbody': { display: 'block' },
    '& tr': {
      display: 'grid',
      gridTemplateColumns: 'auto minmax(0, 1fr) auto',
      columnGap: '12px',
      rowGap: '2px',
      px: '14px',
      py: '10px',
      borderBottom: '1px solid',
      borderColor: 'divider'
    },
    '& td': { border: 0, p: 0 },
    '& td:nth-of-type(5)': { order: 3 },
    '& td:nth-of-type(3)': { order: 4, gridColumn: '2 / 3', color: 'text.secondary' },
    '& td:nth-of-type(4)': { order: 5, gridColumn: '3 / 4', color: 'text.secondary', textAlign: 'right' }
  }
} as const;

export function SalesBody({ sales, orders, page, onPage, range, locationId, controls }: SalesBodyProps) {
  const blocks = sales.data?.currencies ?? [];
  return (
    <DetailFrame
      title="Sales"
      subtitle="Net of tax and refunds. Payment methods show money collected, tax included."
      range={range}
      locationId={locationId}
      controls={controls}
    >
      {sales.isLoading ? (
        <Panel title="Net sales">
          <Box sx={{ p: '14px' }}>
            <Skeleton height={36} width={160} />
            <Skeleton height={28} />
            <Skeleton height={28} />
          </Box>
        </Panel>
      ) : sales.isError || !sales.data ? (
        <Retry message="Couldn't load your sales." onRetry={sales.refetch} />
      ) : blocks.length === 0 ? (
        <PanelMessage>No sales in this period.</PanelMessage>
      ) : (
        blocks.map((block) => {
          const v = salesView(block, range);
          return (
            <CurrencyGroup key={block.currency} heading={currencyHeading(blocks.length, block.currency)}>
              <Panel title="Net sales">
                <Headline view={v.netSales} />
                <AmountRows
                  rows={[
                    { label: 'Refunds (sales value)', amount: v.refunds },
                    { label: 'Sales tax collected', amount: v.salesTax }
                  ]}
                />
              </Panel>
              <Box sx={{ ...cardsGrid, mb: 0 }}>
                <Panel title="By channel">
                  {v.channels.length ? <AmountRows rows={v.channels} /> : <PanelMessage>No sales in this period.</PanelMessage>}
                </Panel>
                <Panel title="By payment method">
                  {v.methods.length ? <AmountRows rows={v.methods} /> : <PanelMessage>No payments in this period.</PanelMessage>}
                </Panel>
              </Box>
              <Panel title="By day" note={`${v.days.length} ${v.days.length === 1 ? 'day' : 'days'} with sales`}>
                {v.days.length ? (
                  <AmountRows rows={v.days.map((d) => ({ label: `${d.date} · ${d.count}`, amount: d.amount }))} />
                ) : (
                  <PanelMessage>No sales in this period.</PanelMessage>
                )}
              </Panel>
            </CurrencyGroup>
          );
        })
      )}

      <Panel title="Orders" note="Receipt totals include tax">
        {orders.isLoading ? (
          <Box sx={{ p: '14px' }}>
            <Skeleton height={28} />
            <Skeleton height={28} />
            <Skeleton height={28} />
          </Box>
        ) : orders.isError || !orders.data ? (
          <Retry message="Couldn't load the orders." onRetry={orders.refetch} />
        ) : orders.data.items.length === 0 ? (
          <PanelMessage>No orders in this period.</PanelMessage>
        ) : (
          <>
            <TableContainer>
              <Table size="small" aria-label="Orders" sx={ORDER_PHONE_ROWS}>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Receipt</TableCell>
                    <TableCell>Paid by</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.data.items.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{tableDay(o.transactionDate || o.createdAt, range)}</TableCell>
                      <TableCell>{o.receiptNumber || o.id.slice(0, 8)}</TableCell>
                      <TableCell>{paymentMethodLabel(o.paymentMethod)}</TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{String(o.status).replace(/_/g, ' ')}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {formatOrderAmount(o.total, 'USD')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={orders.data.count}
              page={page}
              rowsPerPage={ORDER_PAGE_SIZE}
              rowsPerPageOptions={[ORDER_PAGE_SIZE]}
              onPageChange={(_, p) => onPage(p)}
            />
          </>
        )}
      </Panel>
    </DetailFrame>
  );
}

export default function SalesDetail() {
  const f = useFinanceRange();
  const { range, locationId, scope, enabled, params, update } = f;
  const page = pageFromParams(params);
  const sales = useQuery({
    queryKey: ['finance', 'snapshot-sales', ...scope, range, locationId],
    queryFn: () => financeSnapshotApi.sales({ ...range, locationId }),
    enabled,
    retry: false
  });
  const search = orderSearchParams(range, locationId, page);
  const orders = useQuery({
    queryKey: ['finance', 'orders', ...scope, search],
    queryFn: () => posApi.searchSales(search),
    enabled,
    retry: false
  });
  return (
    <SalesBody
      sales={loadable(sales)}
      orders={loadable(orders)}
      page={page}
      onPage={(p) => update({ page: p ? String(p) : null })}
      range={range}
      locationId={locationId}
      controls={f.controls()}
    />
  );
}
