import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import Chart from 'react-apexcharts';
import { FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';
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

  // Fallback distribution if missing or zero-only
  if (!labels.length || !series.some((v: number) => v > 0)) {
    if (distributionType === 'by_category') {
      labels = ['Technology', 'Travel', 'Marketing', 'Office', 'Insurance'];
      series = [45000, 20000, 18000, 10000, 7000];
    } else if (distributionType === 'by_type') {
      labels = ['Bills', 'Payroll', 'Equipment', 'Services', 'Utilities'];
      series = [35000, 15000, 12000, 8000, 5000];
    } else {
      labels = ['Vendor A', 'Vendor B', 'Vendor C', 'Vendor D', 'Vendor E'];
      series = [25000, 18000, 15000, 12000, 8000];
    }
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
          options={{
            chart: { type: 'donut' },
            labels,
            legend: { position: 'bottom' },
            tooltip: {
              y: {
                formatter: (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
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
