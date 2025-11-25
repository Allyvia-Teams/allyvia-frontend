import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

const TopItems: React.FC = () => {
  const { topItems, loading } = useSelector((state: RootState) => state.analytics);
  const [metric, setMetric] = React.useState<'quantity' | 'value'>('quantity');

  const formatCurrency = (amount: number | string) => {
    const n = Number(amount || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(n);
  };

  const handleMetricChange = (event: React.MouseEvent<HTMLElement>, newMetric: 'quantity' | 'value') => {
    if (newMetric !== null) {
      setMetric(newMetric);
    }
  };

  // Prepare chart data
  const chartData = topItems.slice(0, 10).map((item) => ({
    name: item.name,
    value: metric === 'quantity' ? item.qty : Number((item as any).amount || 0),
    id: item.item_id
  }));

  const chartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        columnWidth: '70%',
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => {
        return metric === 'quantity' ? val.toLocaleString() : formatCurrency(val);
      }
    },
    xaxis: {
      categories: chartData.map((item) => `${item.name} (ID: ${item.id})`),
      title: {
        text: metric === 'quantity' ? 'Quantity' : 'Value ($)'
      },
      labels: {
        maxHeight: 60,
        style: {
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Items'
      },
      labels: {
        formatter: (val: number) => (val.toString().length > 20 ? val.toString().substring(0, 20) + '...' : val.toString())
      }
    },
    fill: { type: 'solid' },
    colors: ['#1976d2', '#dc004e', '#9c27b0', '#2e7d32', '#ed6c02', '#0288d1', '#f57c00', '#388e3c', '#7b1fa2', '#c2185b'],
    legend: { show: false },
    grid: { show: true },
    tooltip: {
      y: {
        formatter: (val: number) => {
          return metric === 'quantity' ? `${val.toLocaleString()} units` : formatCurrency(val);
        }
      }
    }
  };

  const series = [
    {
      name: metric === 'quantity' ? 'Quantity' : 'Value',
      data: chartData.map((item) => item.value)
    }
  ];

  // Use AllyviaEmpty inside card for consistent loader/empty UX

  return (
    <MainCard
      title="Top Items by Performance"
      secondary={
        <ToggleButtonGroup value={metric} exclusive onChange={handleMetricChange} size="small" aria-label="metric selection">
          <ToggleButton value="quantity" aria-label="quantity">
            Quantity
          </ToggleButton>
          <ToggleButton value="value" aria-label="value">
            Value
          </ToggleButton>
        </ToggleButtonGroup>
      }
    >
      <AllyviaEmpty
        isLoading={loading}
        isEmpty={topItems.length === 0}
        type="chart"
        height={350}
        title={topItems.length === 0 ? 'No Items Data' : undefined}
        description={topItems.length === 0 ? 'No items data available for the selected period' : undefined}
      >
        <Chart options={chartOptions} series={series} type="bar" height={350} />
      </AllyviaEmpty>
    </MainCard>
  );
};

export default TopItems;
