import React, { useEffect, useState } from 'react';
import { Grid, Box, Typography } from '@mui/material';
import { gridSpacing } from 'store/constant';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { useDispatch, useSelector } from 'store';
import { fetchPaymentSummary, fetchPaymentStatistics, fetchPaymentList } from 'store/slices/finance';
import { PaymentTable } from 'ui-component/finance/tables';
import type { RootState } from 'store';

const PaymentsTab: React.FC = () => {
  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  // Get data directly from Redux with proper types
  const dispatch = useDispatch();
  const {
    paymentSummary,
    paymentStatistics,
    paymentList,
    loading: loadingState,
    filters
  } = useSelector((state: RootState) => state.finance);

  // Local filter UI state for payments
  const [paySearch, setPaySearch] = useState('');
  const [payStatus, setPayStatus] = useState<string>('');
  const [payAmountRange, setPayAmountRange] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('');
  const [payOrdering, setPayOrdering] = useState<string>('');
  const [payPageSize, setPayPageSize] = useState<number>(50);

  // Ensure payment data loads when tab mounts or filters change
  useEffect(() => {
    const startDate = (filters as any)?.startDate;
    const endDate = (filters as any)?.endDate;
    if (startDate && endDate) {
      dispatch(fetchPaymentSummary({ startDate, endDate }) as any);
      dispatch(fetchPaymentStatistics({ startDate, endDate }) as any);
      dispatch(
        fetchPaymentList({
          startDate,
          endDate,
          page: 1
        }) as any
      );
    }
  }, [
    dispatch,
    (filters as any)?.startDate,
    (filters as any)?.endDate,
    paySearch,
    payStatus,
    payAmountRange,
    payMethod,
    payOrdering,
    payPageSize
  ]);

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
      value: '95%', // Placeholder - will be calculated from actual data
      theme: 'success' as const,
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
