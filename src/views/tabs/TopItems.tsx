import React from 'react';
import { Typography, Button, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Download } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { downloadCSV } from 'utils/csvDownload';
import { Skeleton } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';

const TopItems: React.FC = () => {
  const { topItems, loading } = useSelector((state: RootState) => state.analytics);

  const handleExport = () => {
    const csvData = topItems.map((item) => ({
      'Item Name': item.name, // Backend: name field
      Quantity: item.qty, // Backend: qty field
      Amount: item.amount, // Backend: amount field
      'Item ID': item.item_id // Backend: item_id field
    }));

    downloadCSV('top-items-analytics.csv', csvData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <MainCard title="Top Items">
        <Skeleton variant="rectangular" height={300} />
      </MainCard>
    );
  }

  return (
    <MainCard
      title="Top Items"
      secondary={
        <Button startIcon={<Download />} onClick={handleExport} disabled={loading || topItems.length === 0} size="small" variant="outlined">
          Export
        </Button>
      }
    >
      {topItems.length === 0 ? (
        <Typography color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
          No items data available for the selected period
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item Name</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topItems.slice(0, 10).map((item, index) => (
                <TableRow key={item.item_id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        ID: {item.item_id}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{item.qty.toLocaleString()}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(item.amount)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </MainCard>
  );
};

export default TopItems;
