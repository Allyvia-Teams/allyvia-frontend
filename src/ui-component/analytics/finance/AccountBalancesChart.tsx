import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import ReactApexChart from 'react-apexcharts';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

const AccountBalancesChart: React.FC = () => {
  const { accountTrends } = useSelector((state: RootState) => (state as any).finance);
  const loading = useSelector((state: RootState) => (state as any).finance.loading.accounts);

  let data = (accountTrends || [])
    .filter((a: any) => Number(a.total_balance) > 0)
    .map((a: any) => ({ x: String(a.account_type || 'Other').replace(/_/g, ' '), y: Number(a.total_balance) }));

  // Fallback mock categories if empty
  if (!data.length) {
    data = [
      { x: 'Cash', y: 50000 },
      { x: 'Accounts Receivable', y: 80000 },
      { x: 'Accounts Payable', y: 30000 },
      { x: 'Equity', y: 70000 }
    ];
  }

  return (
    <AllyviaEmpty
      isLoading={loading}
      isEmpty={false}
      type="chart"
      skeletonType="chart"
      height={0}
      width="100%"
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
