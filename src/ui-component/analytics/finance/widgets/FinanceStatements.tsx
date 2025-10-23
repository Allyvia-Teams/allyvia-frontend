import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { Grid } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';

const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const FinanceStatements: React.FC = () => {
  const { profitAndLoss, balanceSheet } = useSelector(
    (state: RootState) =>
      ({
        profitAndLoss: (state as any).finance.profitAndLoss,
        balanceSheet: (state as any).finance.balanceSheet || []
      }) as any
  );

  const assets = (balanceSheet || []).filter((r: any) => r.category === 'asset');
  const liabilities = (balanceSheet || []).filter((r: any) => r.category === 'liability');
  const equity = (balanceSheet || []).filter((r: any) => r.category === 'equity');
  const totalAssets = assets.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  const totalLiabilities = liabilities.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  const totalEquity = equity.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

  return (
    <MainCard title="Financial Statements Summary">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            value={fmtMoney(profitAndLoss?.total_income || 0)}
            title="Total Income"
            showIcon={false}
            height={88}
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            value={fmtMoney(profitAndLoss?.cost_of_goods_sold || 0)}
            title="COGS"
            showIcon={false}
            height={88}
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            value={fmtMoney(profitAndLoss?.gross_profit || 0)}
            title="Gross Profit"
            showIcon={false}
            height={88}
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            value={fmtMoney(profitAndLoss?.net_income || 0)}
            title="Net Income"
            showIcon={false}
            height={88}
            isTaggable={false}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard value={fmtMoney(totalAssets)} title="Total Assets" showIcon={false} height={88} isTaggable={false} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            value={fmtMoney(totalLiabilities)}
            title="Total Liabilities"
            showIcon={false}
            height={88}
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard value={fmtMoney(totalEquity)} title="Total Equity" showIcon={false} height={88} isTaggable={false} />
        </Grid>
      </Grid>
    </MainCard>
  );
};

export default FinanceStatements;
