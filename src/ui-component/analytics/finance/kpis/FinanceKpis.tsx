import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { Grid } from '@mui/material';
import AllyviaStats from '../../../common/AllyviaStats';
import AllyviaChip from '../../../common/AllyviaChip';

const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const FinanceKpis: React.FC = () => {
  const { financeKPIs, profitAndLoss, accountSummary, loading: loadingState } = useSelector((state: RootState) => (state as any).finance);
  const loading = loadingState?.financeKPIs || false;

  // Use new Finance KPIs data if available, otherwise fallback to profit and loss data
  // Try both kpis and summary objects from financeKPIs
  const totalRevenue = financeKPIs?.kpis?.revenue ?? financeKPIs?.summary?.total_revenue ?? profitAndLoss?.total_income ?? 0;
  const netIncome = financeKPIs?.kpis?.net_income ?? financeKPIs?.summary?.net ?? profitAndLoss?.net_income ?? 0;
  const cashBalance = financeKPIs?.kpis?.cash_balance ?? (accountSummary as any)?.total_balance ?? 0;
  const cashBalanceEstimated = financeKPIs?.kpis?.cash_balance_estimated === true;

  // Convert to numbers and handle null/undefined values
  const displayTotalRevenue = Number(totalRevenue || 0);
  const displayNetIncome = Number(netIncome || 0);
  const displayCashBalance = Number(cashBalance || 0);

  // Helper function to determine theme based on value
  const getTheme = (value: number, isMoneyMaking = false): 'alert' | 'success' | 'default' | 'warning' | 'gold' => {
    if (value === 0) return 'default';
    if (isMoneyMaking) return value > 0 ? 'success' : 'alert';
    return 'default';
  };

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <AllyviaStats loading={loading} title="Total Revenue" value={fmtMoney(displayTotalRevenue)} theme="default" size="medium" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <AllyviaStats
          loading={loading}
          title="Net Income"
          value={fmtMoney(displayNetIncome)}
          theme={getTheme(displayNetIncome, true)}
          size="medium"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <AllyviaStats
          loading={loading}
          title="Cash Balance"
          value={fmtMoney(displayCashBalance)}
          theme="default"
          size="medium"
          chip={
            cashBalanceEstimated ? (
              <AllyviaChip
                label="Estimated from POS"
                color="warning"
                variant="outlined"
                tooltipTitle="No QuickBooks bank accounts are connected. This balance is estimated from POS sale and refund transactions."
              />
            ) : undefined
          }
        />
      </Grid>
    </Grid>
  );
};

export default FinanceKpis;
