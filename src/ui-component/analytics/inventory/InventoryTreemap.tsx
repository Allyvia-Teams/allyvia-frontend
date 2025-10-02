import React from 'react';
import { Box, FormControlLabel, Radio, RadioGroup, Skeleton, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

const InventoryTreemap: React.FC = () => {
  const { inventoryItemsTreeMap, loading } = useSelector((state: RootState) => state.analytics);
  const [metric, setMetric] = React.useState<'quantity' | 'value'>('quantity');

  const products = inventoryItemsTreeMap?.items || [];
  const currency = inventoryItemsTreeMap?.currency || 'USD';

  const total = React.useMemo(() => {
    return products.reduce((sum, p) => sum + (metric === 'quantity' ? Number(p.total_quantity || 0) : Number(p.total_value || 0)), 0);
  }, [products, metric]);

  const series = React.useMemo(() => {
    // Group by category
    const categoryMap = new Map<string, { x: string; y: number }[]>();
    products.forEach((p) => {
      const category = p.category || 'Uncategorized';
      const value = metric === 'quantity' ? Number((p as any).quantity_on_hand || 0) : Number(p.total_value || 0);
      if (!categoryMap.has(category)) categoryMap.set(category, []);
      categoryMap.get(category)!.push({ x: p.name, y: value });
    });

    return Array.from(categoryMap.entries()).map(([cat, data]) => ({ name: cat, data }));
  }, [products, metric]);

  const options: ApexOptions = {
    chart: { type: 'treemap', height: 450, toolbar: { show: false } },
    legend: { show: true, position: 'bottom' },
    dataLabels: {
      enabled: true,
      formatter: (_text: string, opts?: any) => {
        const nodeValue: number = Number(opts?.value ?? 0);
        const pct = total > 0 ? (nodeValue / total) * 100 : 0;
        return `${pct.toFixed(1)}%`;
      },
      style: { fontSize: '12px' }
    },
    tooltip: {
      y: {
        formatter: (val: number) => {
          const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
          if (metric === 'quantity') {
            return `${val.toLocaleString()} (${pct}%)`;
          }
          const abs = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val);
          return `${abs} (${pct}%)`;
        }
      }
    },
    plotOptions: {
      treemap: {
        enableShades: true,
        shadeIntensity: 0.5,
        distributed: false
      }
    },
    colors: ['#1976d2', '#dc004e', '#9c27b0', '#2e7d32', '#ed6c02', '#0288d1']
  };

  return (
    <MainCard
      title="Inventory Treemap"
      secondary={
        <RadioGroup row value={metric} onChange={(e) => setMetric(e.target.value as 'quantity' | 'value')}>
          <FormControlLabel value="quantity" control={<Radio />} label="Quantity" />
          <FormControlLabel value="value" control={<Radio />} label="Value" />
        </RadioGroup>
      }
    >
      {loading ? (
        <Skeleton variant="rectangular" height={450} />
      ) : products.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">No inventory data available for treemap</Typography>
        </Box>
      ) : (
        <Chart type="treemap" height={450} options={options} series={series as any} />
      )}
    </MainCard>
  );
};

export default InventoryTreemap;
