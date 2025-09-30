import React from 'react';
import { Typography, Button, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import { Download, Warning } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { downloadCSV } from 'utils/csvDownload';
import { Skeleton } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';

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
    if (onHand <= 0) return { status: 'Out of Stock', color: 'error' as const };
    if (onHand <= reorderPoint) return { status: 'Critical', color: 'error' as const };
    return { status: 'Low', color: 'warning' as const };
  };

  if (loading) {
    return (
      <MainCard title="Low Stock Items">
        <Skeleton variant="rectangular" height={300} />
      </MainCard>
    );
  }

  return (
    <MainCard
      title="Low Stock Items"
      secondary={
        <Button startIcon={<Download />} onClick={handleExport} disabled={loading || lowStock.length === 0} size="small" variant="outlined">
          Export
        </Button>
      }
    >
      {lowStock.length === 0 ? (
        <Typography color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
          No low stock items for the selected period
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item Name</TableCell>
                <TableCell align="right">On Hand</TableCell>
                <TableCell align="right">Reorder Point</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lowStock.map((item, index) => {
                const stockStatus = getStockStatus(item.on_hand, item.reorder_point);
                return (
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
                      <Typography variant="body2" fontWeight="medium">
                        {(item.on_hand || 0).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{(item.reorder_point || 0).toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={stockStatus.status === 'Critical' ? <Warning /> : undefined}
                        label={stockStatus.status}
                        color={stockStatus.color}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </MainCard>
  );
};

export default LowStock;
