import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

const InventoryTreemap: React.FC = () => {
  const theme = useTheme();
  const { inventoryItemsTreeMap, loading } = useSelector((state: RootState) => state.analytics);

  const [metric, setMetric] = React.useState<'quantity' | 'value'>('quantity');
  const [groupBy, setGroupBy] = React.useState<'category' | 'location' | 'type' | 'item'>('category');

  const currency = inventoryItemsTreeMap?.currency || 'USD';

  // Debug logging to understand data structure
  React.useEffect(() => {}, [inventoryItemsTreeMap, loading, groupBy, metric]);

  // Get data based on groupBy selection from consolidated response
  const getGroupedData = () => {
    if (!inventoryItemsTreeMap) return [];

    switch (groupBy) {
      case 'category':
        return inventoryItemsTreeMap.categories || [];
      case 'location':
        return inventoryItemsTreeMap.locations || [];
      case 'type':
        return inventoryItemsTreeMap.types || [];
      case 'item':
        return inventoryItemsTreeMap.items || [];
      default:
        return [];
    }
  };

  const groupedData = getGroupedData();

  const total = React.useMemo(() => {
    if (!inventoryItemsTreeMap) return 0;

    const totals = inventoryItemsTreeMap.totals;
    switch (groupBy) {
      case 'category':
        return metric === 'quantity' ? totals.categories.quantity : totals.categories.value;
      case 'location':
        return metric === 'quantity' ? totals.locations.quantity : totals.locations.value;
      case 'type':
        return metric === 'quantity' ? totals.types.quantity : totals.types.value;
      case 'item':
        return metric === 'quantity' ? totals.products.quantity : totals.products.value;
      default:
        return 0;
    }
  }, [inventoryItemsTreeMap, metric, groupBy]);

  const series = React.useMemo(() => {
    if (!inventoryItemsTreeMap) return [];

    // Use pre-aggregated data for smooth switching
    if (groupBy === 'item') {
      // For items, use the raw items data
      const items = inventoryItemsTreeMap.items || [];
      return [
        {
          name: 'Item Distribution',
          data: items.map((item) => ({
            x: item.name,
            y: metric === 'quantity' ? item.quantity_on_hand : item.total_value
          }))
        }
      ];
    } else {
      // For categories, locations, types - use pre-aggregated data
      return [
        {
          name: `${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)} Distribution`,
          data: groupedData.map((item) => ({
            x: item.name,
            y: metric === 'quantity' ? (item as any).quantity : (item as any).value
          }))
        }
      ];
    }
  }, [groupedData, metric, groupBy, inventoryItemsTreeMap]);

  const options: ApexOptions = {
    chart: {
      type: 'treemap',
      height: 500,
      toolbar: { show: false },
      animations: {
        enabled: true,
        speed: 800
      }
    },
    title: {
      text: undefined
    },
    legend: {
      show: true,
      position: 'bottom',
      fontFamily: theme.typography.fontFamily,
      offsetX: 20,
      labels: {
        useSeriesColors: true
      },
      markers: {
        size: 8,
        shape: 'square'
      },
      itemMargin: {
        horizontal: 15,
        vertical: 8
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function (text: string, opts?: any) {
        const nodeValue: number = Number(opts?.value ?? 0);
        const pct = total > 0 ? (nodeValue / total) * 100 : 0;
        return `${text}\n${pct.toFixed(1)}%`;
      },
      style: {
        fontSize: '11px',
        fontWeight: '600',
        colors: ['#fff']
      },
      offsetY: -10
    },
    tooltip: {
      custom: function ({ series: _series, seriesIndex, dataPointIndex, w }) {
        const item = w.config.series[seriesIndex].data[dataPointIndex];
        const value = item.y;
        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

        let formattedValue;
        if (metric === 'quantity') {
          formattedValue = `${value.toLocaleString()} units`;
        } else {
          formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
        }

        const groupByLabel = groupBy.charAt(0).toUpperCase() + groupBy.slice(1);
        const metricLabel = metric === 'quantity' ? 'Quantity' : 'Value';

        // Handle item-specific data
        let itemDetails = '';
        if (groupBy === 'item') {
          const foundItem = inventoryItemsTreeMap?.items?.find((i: any) => i.name === item.x);
          if (foundItem) {
            itemDetails = `
              <div style="margin-bottom: 4px;"><strong>SKU:</strong> ${foundItem.sku || 'N/A'}</div>
              <div style="margin-bottom: 4px;"><strong>Category:</strong> ${foundItem.category || 'N/A'}</div>
              <div style="margin-bottom: 4px;"><strong>Location:</strong> ${foundItem.location || 'N/A'}</div>
            `;
          }
        }

        return `
          <div style="padding: 12px; background: white; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); min-width: 200px;">
            <div style="font-weight: 600; font-size: 14px; color: #333; margin-bottom: 8px;">${item.x}</div>
            <div style="margin-bottom: 4px;"><strong>${groupByLabel}:</strong> ${item.x}</div>
            ${itemDetails}
            <div style="margin-bottom: 4px;"><strong>${metricLabel}:</strong> ${formattedValue}</div>
            <div style="margin-bottom: 4px;"><strong>Percentage:</strong> ${pct}% of total</div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0; font-size: 12px; color: #666;">
              Total ${metricLabel.toLowerCase()}: ${total.toLocaleString()}
            </div>
          </div>
        `;
      }
    },
    plotOptions: {
      treemap: {
        enableShades: true,
        shadeIntensity: 0.3,
        distributed: true
      }
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: {
            height: 400
          },
          dataLabels: {
            style: {
              fontSize: '10px'
            }
          }
        }
      }
    ]
  };

  const handleGroupByChange = (event: React.MouseEvent<HTMLElement>, newGroupBy: 'category' | 'location' | 'type' | 'item') => {
    if (newGroupBy !== null) {
      setGroupBy(newGroupBy);
    }
  };

  const handleMetricChange = (event: React.MouseEvent<HTMLElement>, newMetric: 'quantity' | 'value') => {
    if (newMetric !== null) {
      setMetric(newMetric);
    }
  };

  // Get current color scheme for toggle buttons (brand primary, theme-aware)
  const primaryColor = theme.palette.primary.main;

  return (
    <MainCard
      title="Inventory Distribution"
      secondary={
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={groupBy}
            exclusive
            onChange={handleGroupByChange}
            size="small"
            aria-label="group by selection"
            sx={{
              '& .MuiToggleButton-root': {
                border: `1px solid ${alpha(primaryColor, 0.25)}`,
                color: primaryColor,
                '&:hover': {
                  backgroundColor: alpha(primaryColor, 0.08)
                },
                '&.Mui-selected': {
                  backgroundColor: primaryColor,
                  color: 'white',
                  '&:hover': {
                    backgroundColor: primaryColor,
                    opacity: 0.9
                  }
                }
              }
            }}
          >
            <ToggleButton value="category" aria-label="category">
              Category
            </ToggleButton>
            <ToggleButton value="location" aria-label="location">
              Location
            </ToggleButton>
            <ToggleButton value="type" aria-label="type">
              Type
            </ToggleButton>
            <ToggleButton value="item" aria-label="item">
              Item
            </ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            value={metric}
            exclusive
            onChange={handleMetricChange}
            size="small"
            aria-label="metric selection"
            sx={{
              '& .MuiToggleButton-root': {
                border: `1px solid ${alpha(primaryColor, 0.25)}`,
                color: primaryColor,
                '&:hover': {
                  backgroundColor: alpha(primaryColor, 0.08)
                },
                '&.Mui-selected': {
                  backgroundColor: primaryColor,
                  color: 'white',
                  '&:hover': {
                    backgroundColor: primaryColor,
                    opacity: 0.9
                  }
                }
              }
            }}
          >
            <ToggleButton value="quantity" aria-label="quantity">
              Quantity
            </ToggleButton>
            <ToggleButton value="value" aria-label="value">
              Value
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      }
    >
      <AllyviaEmpty
        isLoading={loading}
        isEmpty={groupedData.length === 0}
        type="chart"
        height={500}
        title={groupedData.length === 0 ? 'No Inventory Data' : undefined}
        description={groupedData.length === 0 ? `No ${groupBy} distribution data available for the selected period` : undefined}
      >
        <Chart type="treemap" height={500} options={options} series={series as any} />
      </AllyviaEmpty>
    </MainCard>
  );
};

export default InventoryTreemap;
