import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import ReactApexChart from 'react-apexcharts';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import { buildAccountBalancesChartData } from './accountBalancesChartView';

const AccountBalancesChart: React.FC = () => {
  const { accountSummary, accountTrends } = useSelector((state: RootState) => (state as any).finance);
  const loading = useSelector((state: RootState) => (state as any).finance.loading.accountSummary);
  const data = buildAccountBalancesChartData(accountTrends, accountSummary);
  const isEmpty = !loading && data.length === 0;

  return (
    <AllyviaEmpty
      isLoading={loading}
      isEmpty={isEmpty}
      type="chart"
      skeletonType="chart"
      height={350}
      width="100%"
      title="No account balance data yet"
      description="Account balances will appear here once your accounts are connected and synced."
      sx={{ p: 0, height: 'auto' }}
    >
      <MainCard title="Account Balances by Type">
        <ReactApexChart
          options={{ chart: { type: 'bar', height: 350 }, xaxis: { type: 'category' }, dataLabels: { enabled: false } }}
          series={[{ name: 'Account Balance', data }]}
          type="bar"
          height={350}
        />
      </MainCard>
    </AllyviaEmpty>
  );
};

export default AccountBalancesChart;
