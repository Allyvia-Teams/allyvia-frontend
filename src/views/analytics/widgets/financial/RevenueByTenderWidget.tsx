import React, { useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from 'store';
import { fetchPaymentSplit } from 'store/slices/finance';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import { formatCurrency } from 'utils/financeCalculations';
import { toNum } from 'utils/financeFormat';
import { toISO } from 'views/analytics/analyticsDateRange';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';

type TenderRow = {
  provider: string;
  amount: number;
  count: number;
  pct: number;
};

function tenderRows(paymentSplit: unknown): TenderRow[] {
  const raw = paymentSplit as { payment_methods?: Array<{ provider?: string; amount?: unknown; count?: unknown }> } | unknown[] | null;
  const rows = Array.isArray(raw) ? raw : (raw?.payment_methods ?? []);
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const parsed = rows
    .map((row: any) => ({
      provider: String(row?.provider ?? 'Unknown'),
      amount: toNum(row?.amount),
      count: toNum(row?.count)
    }))
    .filter((row) => row.amount !== 0);

  const total = parsed.reduce((sum, row) => sum + row.amount, 0);
  if (total <= 0) return [];

  return parsed
    .map((row) => ({
      ...row,
      pct: (row.amount / total) * 100
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Revenue by tender / payment provider from `/payment/split/` via Redux
 * `fetchPaymentSplit` (same source as FinancialAnalyticsCard).
 */
const RevenueByTenderWidget: React.FC<AnalyticsWidgetProps> = ({ dateRange, isLoading: parentLoading }) => {
  const dispatch = useDispatch<AppDispatch>();
  const paymentSplit = useSelector((state: RootState) => state.finance.paymentSplit);
  const loadingSplit = useSelector((state: RootState) => state.finance.loading.paymentSplit);

  const startDate = toISO(dateRange?.start as { year: number; month: number; day: number } | null | undefined);
  const endDate = toISO(dateRange?.end as { year: number; month: number; day: number } | null | undefined);

  useEffect(() => {
    if (!startDate || !endDate) return;
    dispatch(fetchPaymentSplit({ startDate, endDate }));
  }, [dispatch, startDate, endDate]);

  const rows = useMemo(() => tenderRows(paymentSplit), [paymentSplit]);
  const loading = Boolean(parentLoading || loadingSplit);

  return (
    <AllyviaEmpty
      isLoading={loading}
      isEmpty={rows.length === 0}
      type="chart"
      height={280}
      title="Revenue by tender"
      description="No payment split data for the selected range."
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.5 }}>
        {rows.map((row) => (
          <Box key={row.provider} sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap fontWeight={600}>
                {row.provider}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {row.count} payment{row.count === 1 ? '' : 's'}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
              <Typography variant="body2" fontWeight={600}>
                {formatCurrency(row.amount)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {row.pct.toFixed(1)}%
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </AllyviaEmpty>
  );
};

export default RevenueByTenderWidget;
