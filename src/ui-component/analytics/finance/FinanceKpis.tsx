import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { Grid } from '@mui/material';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import type { FinanceKPIsResponse } from 'types/finance';

const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const FinanceKpis: React.FC = () => {
  const {
    financeKPIs,
    profitAndLoss,
    accountSummary,
    loading: loadingState,
    errors
  } = useSelector((state: RootState) => (state as any).finance);
  const loading = loadingState?.financeKPIs || false;

  // Use new Finance KPIs data if available, otherwise fallback to profit and loss data
  // Try both kpis and summary objects from financeKPIs
  const totalRevenue = financeKPIs?.kpis?.revenue ?? financeKPIs?.summary?.totalRevenue ?? profitAndLoss?.total_income ?? 0;
  const netIncome = financeKPIs?.kpis?.net_income ?? financeKPIs?.summary?.net ?? profitAndLoss?.net_income ?? 0;
  const grossProfit = financeKPIs?.kpis?.gross_profit ?? profitAndLoss?.gross_profit ?? 0;
  const cashBalance = financeKPIs?.kpis?.cash_balance ?? (accountSummary as any)?.total_balance ?? 0;

  // Convert to numbers and handle null/undefined values
  const displayTotalRevenue = Number(totalRevenue || 0);
  const displayNetIncome = Number(netIncome || 0);
  const displayGrossProfit = Number(grossProfit || 0);
  const displayCashBalance = Number(cashBalance || 0);

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AllyviaStats loading={loading} title="Total Revenue" value={fmtMoney(displayTotalRevenue)} theme="success" size="medium" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AllyviaStats
          loading={loading}
          title="Net Income"
          value={fmtMoney(displayNetIncome)}
          theme={displayNetIncome < 0 ? 'alert' : 'success'}
          size="medium"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AllyviaStats loading={loading} title="Gross Profit" value={fmtMoney(displayGrossProfit)} theme="default" size="medium" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <AllyviaStats loading={loading} title="Cash Balance" value={fmtMoney(displayCashBalance)} theme="default" size="medium" />
      </Grid>
    </Grid>
  );
};

export default FinanceKpis;
