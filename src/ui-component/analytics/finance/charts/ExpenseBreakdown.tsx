import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import Chart from 'react-apexcharts';
import { Box, Typography, FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

type DistributionType = 'by_category' | 'by_type' | 'by_payee';

const ExpenseBreakdown: React.FC = () => {
  const { expenseBreakdown } = useSelector((state: RootState) => (state as any).finance);
  const loading = useSelector((state: RootState) => (state as any).finance.loading.expenseBreakdown);

  const [distributionType, setDistributionType] = useState<DistributionType>('by_category');

  const handleDistributionChange = (event: SelectChangeEvent) => {
    setDistributionType(event.target.value as DistributionType);
  };

  // Get data based on selected distribution type
  const breakdownData = expenseBreakdown?.[distributionType] || [];

  let labels: string[] = [];
  let series: number[] = [];
  let title = 'Expense Breakdown';

  if (distributionType === 'by_category') {
    labels = breakdownData.map((c: any) => c.category_name);
    series = breakdownData.map((c: any) => Number(c.total || 0));
    title = 'Expense Categories';
  } else if (distributionType === 'by_type') {
    labels = breakdownData.map((c: any) => c.type);
    series = breakdownData.map((c: any) => Number(c.total || 0));
    title = 'Expense Types';
  } else if (distributionType === 'by_payee') {
    labels = breakdownData.map((c: any) => c.payee_name);
    series = breakdownData.map((c: any) => Number(c.total || 0));
    title = 'Expense Payees';
  }

  // No fallback data - show empty state if no data available
  if (!labels.length || !series.some((v: number) => v > 0)) {
    labels = [];
    series = [];
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
      <MainCard
        title={title}
        secondary={
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select value={distributionType} onChange={handleDistributionChange} displayEmpty>
              <MenuItem value="by_category">By Category</MenuItem>
              <MenuItem value="by_type">By Type</MenuItem>
              <MenuItem value="by_payee">By Payee</MenuItem>
            </Select>
          </FormControl>
        }
      >
        <Chart
          key={`${distributionType}-${series.length}-${series.join(',')}`}
          options={{
            chart: { type: 'donut' },
            labels,
            legend: { position: 'bottom' },
            tooltip: {
              y: {
                formatter: (val: number, { seriesIndex }: any) => {
                  const item = breakdownData[seriesIndex];
                  const count = item?.count || 0;
                  const percentage = item?.percentage || 0;
                  return `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)} (${count} items, ${percentage.toFixed(1)}%)`;
                }
              }
            }
          }}
          series={series}
          type="donut"
          height={350}
        />
      </MainCard>
    </AllyviaEmpty>
  );
};

export default ExpenseBreakdown;
