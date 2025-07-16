import { useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import SalesLineChartCard from 'ui-component/cards/SalesLineChartCard';
import SeoChartCard from 'ui-component/cards/SeoChartCard';
import { gridSpacing, gridSpacingSm, smallWidgetHeight } from 'store/constant';
import { chartData } from './chart-data';
import { usePositiveOrNegativeColors } from 'hooks/useErrorSuccessColors';
// assets
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Stack } from '@mui/material';

export const InventorySection = ({ isLoading }: { isLoading: boolean }) => {
  // TODO: Remove this once we have data coming in
  const [lineChartData] = useState(chartData.TotalSalesChart);

  const inventoryWidgetsSm = {
    isLoading,
    showIcon: false,
    height: smallWidgetHeight
  };

  const ordersPerMonthPercent = 28;
  const { iconColor, textColor } = usePositiveOrNegativeColors(28);

  return (
    <Grid size={12}>
      <MainCard title="Inventory">
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12, sm: 12, md: 12, lg: 8 }}>
            <Stack spacing={gridSpacing}>
              <Grid container rowSpacing={gridSpacing} columnSpacing={gridSpacingSm}>
                <Grid size={{ sm: 6, xs: 6, md: 3, lg: 3 }}>
                  <TotalIncomeDarkCard {...inventoryWidgetsSm} value={15} title={'Upcoming Invoices'} isTaggable={true} />
                </Grid>
                <Grid size={{ sm: 6, xs: 6, md: 3, lg: 3 }}>
                  <TotalIncomeDarkCard {...inventoryWidgetsSm} value={'$24,482.64'} title={'Value of item'} isTaggable={true} />
                </Grid>
                <Grid size={{ sm: 6, xs: 6, md: 3, lg: 3 }}>
                  <TotalIncomeDarkCard
                    {...inventoryWidgetsSm}
                    value={3}
                    title={'Invoices Overdue'}
                    isWarningCard={true}
                    isTaggable={false}
                  />
                </Grid>
                <Grid size={{ sm: 6, xs: 6, md: 3, lg: 3 }}>
                  <TotalIncomeDarkCard {...inventoryWidgetsSm} value={'$2,577.34'} title={'COGS'} isTaggable={false} />
                </Grid>
              </Grid>
              <Grid container spacing={gridSpacing}>
                <Grid size={{ xs: 12, sm: 5, md: 5, lg: 4 }}>
                  <SeoChartCard type={1} chartData={chartData.InventoryChart2} value="1.55%" title="Return Rate" />
                </Grid>
                <Grid size={{ xs: 12, sm: 7, md: 7, lg: 8 }}>
                  <SeoChartCard type={1} chartData={chartData.InventoryChart1} value="162,564" title="Items in stock" />
                </Grid>
              </Grid>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, sm: 12, md: 8, lg: 4 }}>
            <SalesLineChartCard
              chartData={lineChartData}
              title="Total Orders"
              textColor={textColor}
              percentage={ordersPerMonthPercent}
              icon={<TrendingUpIcon color={iconColor} />}
              footerData={[
                {
                  value: '1695',
                  label: 'Last 30 days'
                },
                {
                  value: '321',
                  label: 'Today'
                }
              ]}
            />
          </Grid>
        </Grid>
      </MainCard>
    </Grid>
  );
};
