import React, { useState } from 'react';
// material-ui
import { Button, Grid, Typography, useTheme, TextField, MenuItem } from '@mui/material';

// project
import { gridSpacing, smallWidgetHeight } from 'store/constant';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import SalesLineChartCard from 'ui-component/cards/SalesLineChartCard';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import InventoryTable from './InventoryTableMock';
import { chartData } from 'views/dashboard/chart-data';
import { usePositiveOrNegativeColors } from 'hooks/useErrorSuccessColors';

import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

export const inventoryWidgetsSm = {
  showIcon: false,
  height: smallWidgetHeight
};

export const InventoryMock = () => {
  const ordersPerMonthPercent = 28;
  const { iconColor, textColor } = usePositiveOrNegativeColors(28);

  const status = [
    { value: 'today', label: 'Today' },
    { value: 'month', label: 'Last Month' },
    { value: 'year', label: 'Last Year' }
  ];

  const [value, setValue] = useState('today');

  return (
    <Grid container spacing={gridSpacing} minWidth={400}>
      <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12 }}>
        <Grid container rowSpacing={gridSpacing} columnSpacing={gridSpacing}>
          <Grid size={{ sm: 6, xs: 6, md: 2.5, lg: 2 }}>
            <TotalIncomeDarkCard
              {...inventoryWidgetsSm}
              valueVariant="h3"
              titleVariant="h4"
              value={'3,420'}
              title={'Total Items'}
              isTaggable={false}
            />
          </Grid>
          <Grid size={{ sm: 6, xs: 6, md: 2.5, lg: 2 }}>
            <TotalIncomeDarkCard
              {...inventoryWidgetsSm}
              titleVariant="h4"
              valueVariant="h3"
              value={12}
              title={'Low Stock Alerts'}
              isTaggable={false}
            />
          </Grid>
          <Grid size={{ sm: 6, xs: 6, md: 2.5, lg: 2 }}>
            <TotalIncomeDarkCard
              {...inventoryWidgetsSm}
              titleVariant="h4"
              valueVariant="h3"
              value={3}
              title={'Out of Stock'}
              isWarningCard={true}
              isTaggable={false}
            />
          </Grid>
          <Grid size={{ sm: 6, xs: 6, md: 2.5, lg: 2 }}>
            <TotalIncomeDarkCard
              {...inventoryWidgetsSm}
              valueVariant="h3"
              titleVariant="h4"
              value={'$245,000'}
              title={'Inventory Value'}
              isTaggable={false}
            />
          </Grid>
          <Grid size={{ md: 2, lg: 4 }}>
            <Grid container>
              <Grid size={{ md: 0, lg: 6 }}></Grid>
              <Grid size={{ md: 12, lg: 6 }}>
                <TextField fullWidth id="standard-select-currency" select value={value} onChange={(e) => setValue(e.target.value)}>
                  {status.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Grid size={{ md: 12, lg: 8 }}>
        <InventoryTable />
      </Grid>
      <Grid size={{ sm: 12, md: 12, lg: 4 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={{ sm: 12, md: 6, lg: 12 }}>
            <SalesLineChartCard
              chartData={chartData.TotalSalesChart}
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
          <Grid size={{ sm: 12, md: 6, lg: 12 }}>
            <SmallTable />
          </Grid>
        </Grid>
      </Grid>
      <Grid></Grid>
    </Grid>
  );
};

function SmallTable() {
  const theme = useTheme();
  const dataSet = [
    [
      { id: '1', name: 'USB Drive (1GB)', quantity: 3, reorder: 12 },
      { id: '2', name: 'Compressed Air (8oz)', quantity: 11, reorder: 12 },
      { id: '3', name: 'HDMI Cable (3ft)', quantity: 15, reorder: 60 }
    ],
    [
      { id: '1', name: 'External Hard Drive (3TB)', quantity: 0, reorder: 10 },
      { id: '2', name: 'Wireless Keyboard', quantity: 0, reorder: 12 },
      { id: '3', name: 'Compressed Air (8oz)', quantity: 0, reorder: 25 }
    ]
  ];

  const [isLowStockVisible, setIsLowStockVisible] = useState<boolean>(true);

  const handleToggleDisplay: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    const selector = e.currentTarget.value === 'low' ? true : false;
    setIsLowStockVisible(selector);
  };

  const defaultButtonsProps = {
    height: 32,
    minWidth: 120
  };

  const selectedButtonStyles = {
    ...defaultButtonsProps,
    bgcolor: theme.palette.primary.dark,
    border: 0
  };

  const deselectedButtonStyles = {
    ...defaultButtonsProps,
    bgcolor: theme.palette.common.white,
    border: 1
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Grid container spacing={gridSpacing} sx={{ p: 2 }}>
        <Grid size={6}>
          <Button
            value={'low'}
            fullWidth
            onClick={handleToggleDisplay}
            sx={isLowStockVisible ? selectedButtonStyles : deselectedButtonStyles}
          >
            <Typography color={isLowStockVisible ? '#ffff' : theme.palette.primary.main}>Low Stock</Typography>
          </Button>
        </Grid>
        <Grid size={6}>
          <Button
            value={'out'}
            fullWidth
            onClick={handleToggleDisplay}
            sx={isLowStockVisible ? deselectedButtonStyles : selectedButtonStyles}
          >
            <Typography color={isLowStockVisible ? theme.palette.primary.main : '#ffff'}>Out of Stock</Typography>
          </Button>
        </Grid>
      </Grid>
      <TableContainer sx={{ maxHeight: 322 }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Reorder Level</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dataSet[isLowStockVisible ? 0 : 1].map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.name}</TableCell>
                <TableCell>{d.quantity}</TableCell>
                <TableCell>{d.reorder}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
