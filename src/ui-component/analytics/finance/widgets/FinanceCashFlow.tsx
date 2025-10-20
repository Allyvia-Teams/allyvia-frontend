import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { Grid } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import Chart from 'react-apexcharts';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const FinanceCashFlow: React.FC = () => {
  const { cashFlow } = useSelector((state: RootState) => (state as any).finance);
  const loading = useSelector((state: RootState) => (state as any).finance.loading.cashFlow);

  // Use real cash flow data from API
  const cashFlowData = cashFlow?.cash_flow || {};

  const summary = {
    op: cashFlowData?.operating_activities?.net_operating || 0,
    inv: cashFlowData?.investing_activities?.net_investing || 0,
    fin: cashFlowData?.financing_activities?.net_financing || 0,
    net: cashFlowData?.summary?.net_cash_flow || 0
  };

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
      <MainCard title="Cash Flow Overview">
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TotalIncomeDarkCard value={fmtMoney(summary.op)} title="Operating" showIcon={false} height={88} isTaggable={false} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TotalIncomeDarkCard value={fmtMoney(summary.inv)} title="Investing" showIcon={false} height={88} isTaggable={false} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TotalIncomeDarkCard value={fmtMoney(summary.fin)} title="Financing" showIcon={false} height={88} isTaggable={false} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TotalIncomeDarkCard value={fmtMoney(summary.net)} title="Net Cash Flow" showIcon={false} height={88} isTaggable={false} />
          </Grid>
        </Grid>

        {/* Cash Flow Bar Chart - Removed mock data */}
        {cashFlowData?.operating_activities && (
          <Chart
            options={{
              chart: { type: 'bar', stacked: true },
              xaxis: {
                categories: ['Operating', 'Investing', 'Financing'],
                labels: { style: { colors: '#666' } }
              },
              legend: { position: 'bottom' },
              colors: ['#4CAF50', '#F44336']
            }}
            series={[
              {
                name: 'Cash In',
                data: [
                  cashFlowData?.operating_activities?.cash_in?.total_operating_in || 0,
                  cashFlowData?.investing_activities?.cash_in || 0,
                  cashFlowData?.financing_activities?.cash_in || 0
                ]
              },
              {
                name: 'Cash Out',
                data: [
                  cashFlowData?.operating_activities?.cash_out?.total_operating_out || 0,
                  cashFlowData?.investing_activities?.cash_out || 0,
                  cashFlowData?.financing_activities?.cash_out || 0
                ]
              }
            ]}
            type="bar"
            height={320}
          />
        )}
      </MainCard>
    </AllyviaEmpty>
  );
};

export default FinanceCashFlow;
