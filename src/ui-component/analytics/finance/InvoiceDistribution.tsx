import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import Chart from 'react-apexcharts';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

const InvoiceDistribution: React.FC = () => {
  const { invoiceStatistics } = useSelector((state: RootState) => (state as any).finance);
  const loading = useSelector((state: RootState) => (state as any).finance.loading.invoiceStatistics);

  // Invoice Status Distribution
  const statusData = invoiceStatistics?.invoices_by_status || {};
  const statusLabels = Object.keys(statusData);
  const statusSeries = Object.values(statusData).map((count: any) => Number(count || 0));

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
      <MainCard title="Invoice Distribution">
        <Chart
          key={`invoice-dist-${statusSeries.length}-${statusSeries.join(',')}`}
          options={{
            chart: { type: 'donut' },
            labels: statusLabels.length ? statusLabels : ['Paid', 'Pending', 'Overdue'],
            legend: { position: 'bottom' },
            colors: ['#4caf50', '#ff9800', '#f44336']
          }}
          series={statusSeries.length ? statusSeries : [15, 8, 3]}
          type="donut"
          height={350}
        />
      </MainCard>
    </AllyviaEmpty>
  );
};

export default InvoiceDistribution;
