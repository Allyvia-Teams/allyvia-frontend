import React from 'react';
import { Typography, Button, Box, Chip, Alert, List, ListItem, ListItemText, ListItemIcon } from '@mui/material';
import { Download, Warning, Error, Inventory } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { downloadCSV } from 'utils/csvDownload';
import { Skeleton } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

const LowStock: React.FC = () => {
  const { lowStock, loading } = useSelector((state: RootState) => state.analytics);

  const handleExport = () => {
    const csvData = lowStock.map((item) => ({
      'Item Name': item.name,
      'On Hand': item.on_hand,
      'Reorder Point': item.reorder_point,
      Status: item.on_hand <= item.reorder_point ? 'Critical' : 'Low',
      'Item ID': item.item_id
    }));

    downloadCSV('low-stock-analytics.csv', csvData);
  };

  const getStockStatus = (onHand: number, reorderPoint: number) => {
    if (onHand <= 0) return { status: 'Out of Stock', color: 'error' as const, severity: 'error' as const };
    if (onHand <= reorderPoint) return { status: 'Critical', color: 'error' as const, severity: 'error' as const };
    return { status: 'Low', color: 'warning' as const, severity: 'warning' as const };
  };

  // Group items by status
  const criticalItems = lowStock.filter((item) => item.on_hand <= item.reorder_point);
  const lowItems = lowStock.filter((item) => item.on_hand > item.reorder_point && item.on_hand <= item.reorder_point * 1.5);

  // Prepare chart data for stock levels
  const chartData = lowStock.slice(0, 10).map((item) => ({
    name: item.name,
    onHand: item.on_hand,
    reorderPoint: item.reorder_point,
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
      formatter: (val: number) => val.toLocaleString()
    },
    xaxis: {
      categories: chartData.map((item) => `${item.name} (ID: ${item.id})`),
      title: {
        text: 'Units'
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
        formatter: (val: string) => (val.length > 15 ? val.substring(0, 15) + '...' : val)
      }
    },
    fill: { type: 'solid' },
    colors: ['#f44336', '#ff9800', '#4caf50', '#2196f3', '#9c27b0', '#ff5722', '#607d8b', '#795548', '#3f51b5', '#e91e63'],
    legend: { show: false },
    grid: { show: true },
    tooltip: {
      y: {
        formatter: (val: number) => `${val.toLocaleString()} units`
      }
    }
  };

  const series = [
    {
      name: 'On Hand',
      data: chartData.map((item) => item.on_hand)
    }
  ];

  if (loading) {
    return (
      <MainCard title="Low Stock Alerts">
        <Skeleton variant="rectangular" height={350} />
      </MainCard>
    );
  }

  return (
    <MainCard
      title="Low Stock Alerts"
      secondary={
        <Button startIcon={<Download />} onClick={handleExport} disabled={loading || lowStock.length === 0} size="small" variant="outlined">
          Export
        </Button>
      }
    >
      {lowStock.length === 0 ? (
        <AllyviaEmpty
          isEmpty={true}
          isLoading={false}
          type="chart"
          title="No Stock Alerts"
          description="All items are well-stocked for the selected period"
          height={350}
        />
      ) : (
        <Box>
          {/* Alert Summary */}
          <Box sx={{ mb: 3 }}>
            {criticalItems.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {criticalItems.length} Critical Items Need Immediate Attention
                </Typography>
                <Typography variant="body2">Items are at or below reorder point and may go out of stock soon.</Typography>
              </Alert>
            )}
            {lowItems.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {lowItems.length} Items Running Low
                </Typography>
                <Typography variant="body2">Consider reordering these items to maintain optimal stock levels.</Typography>
              </Alert>
            )}
          </Box>

          {/* Stock Levels Chart */}
          <Chart options={chartOptions} series={series} type="bar" height={350} />

          {/* Critical Items List */}
          {criticalItems.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom color="error">
                Critical Items ({criticalItems.length})
              </Typography>
              <List dense>
                {criticalItems.slice(0, 5).map((item) => (
                  <ListItem key={item.item_id} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Error color="error" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.name}
                      secondary={`ID: ${item.item_id} | On Hand: ${item.on_hand} | Reorder Point: ${item.reorder_point}`}
                    />
                  </ListItem>
                ))}
                {criticalItems.length > 5 && (
                  <ListItem>
                    <ListItemText
                      primary={`... and ${criticalItems.length - 5} more critical items`}
                      primaryTypographyProps={{ color: 'text.secondary', fontStyle: 'italic' }}
                    />
                  </ListItem>
                )}
              </List>
            </Box>
          )}
        </Box>
      )}
    </MainCard>
  );
};

export default LowStock;
