import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { Grid } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import Chart from 'react-apexcharts';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import AllyviaStats from 'ui-component/common/AllyviaStats';

const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const ProfitAnalytics: React.FC = () => {
  const { profitAndLoss, cogsDetail, grossProfitDetail, balanceSheet, cashFlow } = useSelector(
    (state: RootState) => (state as any).finance
  );

  const loading = useSelector((state: RootState) => (state as any).finance.loading.profitAndLoss);

  // Profit & Loss KPIs
  const profitKPIs = [
    {
      title: 'Total Revenue',
      value: fmtMoney(profitAndLoss?.total_income || 0),
      theme: 'success' as const,
      loading: loading
    },
    {
      title: 'Gross Profit',
      value: fmtMoney(profitAndLoss?.gross_profit || 0),
      theme: 'default' as const,
      loading: loading
    },
    {
      title: 'Net Income',
      value: fmtMoney(profitAndLoss?.net_income || 0),
      theme: (profitAndLoss?.net_income || 0) >= 0 ? ('success' as const) : ('alert' as const),
      loading: loading
    },
    {
      title: 'Operating Expenses',
      value: fmtMoney(profitAndLoss?.total_expenses || 0),
      theme: 'alert' as const,
      loading: loading
    }
  ];

  // P&L Breakdown Data
  const plBreakdown = [
    { category: 'Revenue', amount: profitAndLoss?.total_income || 0, color: '#4caf50' },
    { category: 'COGS', amount: profitAndLoss?.cost_of_goods_sold || 0, color: '#f44336' },
    { category: 'Gross Profit', amount: profitAndLoss?.gross_profit || 0, color: '#2196f3' },
    { category: 'Operating Expenses', amount: profitAndLoss?.total_expenses || 0, color: '#ff9800' },
    { category: 'Net Income', amount: profitAndLoss?.net_income || 0, color: '#9c27b0' }
  ];

  const plLabels = plBreakdown.map((item) => item.category);
  const plSeries = plBreakdown.map((item) => Math.abs(item.amount));
  const plColors = plBreakdown.map((item) => item.color);

  // Cash Flow Data
  const cashFlowData = cashFlow?.cash_flow_statement || [];
  const cfCategories = cashFlowData.map((cf: any) => cf.category);
  const cfSeries = cashFlowData.map((cf: any) => Number(cf.amount || 0));

  // Balance Sheet Summary
  const balanceSheetKPIs = [
    {
      title: 'Total Assets',
      value: fmtMoney(balanceSheet?.total_assets || 0),
      theme: 'success' as const,
      loading: loading
    },
    {
      title: 'Total Liabilities',
      value: fmtMoney(balanceSheet?.total_liabilities || 0),
      theme: 'warning' as const,
      loading: loading
    },
    {
      title: 'Equity',
      value: fmtMoney(balanceSheet?.equity || 0),
      theme: 'default' as const,
      loading: loading
    }
  ];

  return (
    <Grid container spacing={3}>
      {/* Profit & Loss KPIs */}
      <Grid size={{ xs: 12 }}>
        <Grid container spacing={3}>
          {profitKPIs.map((kpi, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* P&L Breakdown */}
      <Grid size={{ xs: 12, md: 8 }}>
        <AllyviaEmpty
          isLoading={loading}
          isEmpty={false}
          type="chart"
          skeletonType="chart"
          height={0}
          width="100%"
          sx={{ p: 0, height: 'auto' }}
        >
          <MainCard title="Profit & Loss Breakdown">
            <Chart
              options={{
                chart: { type: 'bar', height: 400 },
                xaxis: { categories: plLabels },
                plotOptions: {
                  bar: { horizontal: false }
                },
                dataLabels: { enabled: false },
                colors: plColors,
                legend: { position: 'top' }
              }}
              series={[{ name: 'Amount', data: plSeries }]}
              type="bar"
              height={400}
            />
          </MainCard>
        </AllyviaEmpty>
      </Grid>

      {/* Balance Sheet KPIs */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Grid container spacing={2}>
          {balanceSheetKPIs.map((kpi, index) => (
            <Grid size={{ xs: 12 }} key={index}>
              <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* Cash Flow Statement */}
      <Grid size={{ xs: 12 }}>
        <AllyviaEmpty
          isLoading={loading}
          isEmpty={false}
          type="chart"
          skeletonType="chart"
          height={0}
          width="100%"
          sx={{ p: 0, height: 'auto' }}
        >
          <MainCard title="Cash Flow Statement">
            <Chart
              options={{
                chart: { type: 'bar', height: 350 },
                xaxis: {
                  categories: cfCategories.length ? cfCategories : ['Operating', 'Investing', 'Financing', 'Net Cash Flow']
                },
                plotOptions: {
                  bar: { horizontal: false }
                },
                dataLabels: { enabled: false },
                colors: ['#2196f3', '#ff9800', '#4caf50', '#9c27b0']
              }}
              series={[
                {
                  name: 'Cash Flow',
                  data: cfSeries.length ? cfSeries : [45000, -15000, -8000, 22000]
                }
              ]}
              type="bar"
              height={350}
            />
          </MainCard>
        </AllyviaEmpty>
      </Grid>

      {/* Financial Ratios */}
      <Grid size={{ xs: 12 }}>
        <AllyviaEmpty
          isLoading={loading}
          isEmpty={false}
          type="card"
          skeletonType="card"
          height={0}
          width="100%"
          sx={{ p: 0, height: 'auto' }}
        >
          <MainCard title="Key Financial Ratios">
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <AllyviaStats
                  title="Gross Margin"
                  value={`${(((profitAndLoss?.gross_profit || 0) / (profitAndLoss?.total_income || 1)) * 100).toFixed(1)}%`}
                  theme="success"
                  size="medium"
                  loading={loading}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <AllyviaStats
                  title="Net Margin"
                  value={`${(((profitAndLoss?.net_income || 0) / (profitAndLoss?.total_income || 1)) * 100).toFixed(1)}%`}
                  theme={(profitAndLoss?.net_income || 0) >= 0 ? 'success' : 'alert'}
                  size="medium"
                  loading={loading}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <AllyviaStats
                  title="Current Ratio"
                  value={((balanceSheet?.current_assets || 0) / (balanceSheet?.current_liabilities || 1)).toFixed(2)}
                  theme={(balanceSheet?.current_assets || 0) / (balanceSheet?.current_liabilities || 1) >= 2 ? 'success' : 'warning'}
                  size="medium"
                  loading={loading}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <AllyviaStats
                  title="Debt to Equity"
                  value={((balanceSheet?.total_liabilities || 0) / (balanceSheet?.equity || 1)).toFixed(2)}
                  theme={(balanceSheet?.total_liabilities || 0) / (balanceSheet?.equity || 1) <= 1 ? 'success' : 'warning'}
                  size="medium"
                  loading={loading}
                />
              </Grid>
            </Grid>
          </MainCard>
        </AllyviaEmpty>
      </Grid>
    </Grid>
  );
};

export default ProfitAnalytics;
