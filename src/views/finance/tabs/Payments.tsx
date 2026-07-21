import React, { useEffect } from 'react';
import { Grid, Box } from '@mui/material';
import { gridSpacing } from 'store/constant';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { useDispatch, useSelector } from 'store';
import { fetchPaymentSummary, fetchPaymentList } from 'store/slices/finance';
import { PaymentTable } from 'ui-component/finance/tables';
import type { RootState } from 'store';

const PaymentsTab: React.FC = () => {
  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  // Get data directly from Redux with proper types
  const dispatch = useDispatch();
  const { paymentSummary, loading: loadingState, filters } = useSelector((state: RootState) => state.finance);

  // Ensure payment data loads when tab mounts or filters change
  useEffect(() => {
    const startDate = (filters as any)?.startDate;
    const endDate = (filters as any)?.endDate;
    if (startDate && endDate) {
      dispatch(fetchPaymentSummary({ startDate, endDate }) as any);
      dispatch(fetchPaymentList({ startDate, endDate, page: 1 }) as any);
    }
  }, [dispatch, (filters as any)?.startDate, (filters as any)?.endDate]);

  // Payment KPIs
  const paymentKPIs = [
    {
      title: 'Total Payments',
      value: paymentSummary ? fmtMoney(paymentSummary.total_payments) : fmtMoney(0),
      theme: 'success' as const,
      loading: loadingState.paymentSummary || false
    },
    {
      title: 'Payment Count',
      value: paymentSummary?.payment_count || 0,
      theme: 'default' as const,
      loading: loadingState.paymentSummary || false
    },
    {
      title: 'Average Payment',
      value:
        paymentSummary && paymentSummary.payment_count > 0
          ? fmtMoney(paymentSummary.total_payments / paymentSummary.payment_count)
          : fmtMoney(0),
      theme: 'default' as const,
      loading: loadingState.paymentSummary || false
    },
    {
      title: 'Success Rate',
      // Real value from the payment summary (percentage 0-100, serialized as a
      // decimal string by DRF). Success = payments fully applied (no unapplied amount).
      value: paymentSummary ? `${Math.round(Number(paymentSummary.success_rate) || 0)}%` : '0%',
      theme: (paymentSummary && Number(paymentSummary.success_rate) >= 95 ? 'success' : 'warning') as 'success' | 'warning',
      loading: loadingState.paymentSummary || false
    }
  ];

  return (
    <>
      {/* Payment KPIs */}
      <Grid container spacing={gridSpacing}>
        {paymentKPIs.map((kpi, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
          </Grid>
        ))}
      </Grid>

      {/* Payment Table */}
      <Box sx={{ mt: 3 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12 }}>
            <PaymentTable />
          </Grid>
        </Grid>
      </Box>
    </>
  );
};

export default PaymentsTab;
