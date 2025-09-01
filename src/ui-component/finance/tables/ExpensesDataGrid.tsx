import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, Chip, Typography, useTheme } from '@mui/material';
import { Category, Business, CalendarToday } from '@mui/icons-material';
import type { Expense } from 'types/finance';
import MainCard from 'ui-component/cards/MainCard';

export function ExpensesDataGrid({ rows, showPagination = true }: { rows: Expense[]; showPagination?: boolean }) {
  const theme = useTheme();

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'credit_card':
        return 'primary';
      case 'bank_transfer':
        return 'success';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'description',
      headerName: 'Description',
      width: 250,
      renderCell: (params: any) => (
        <Typography variant="body2" fontWeight="medium">
          {params.value}
        </Typography>
      )
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 150,
      renderCell: (params: any) => (
        <Chip size="small" label={params.value} variant="outlined" color="primary" icon={<Category fontSize="small" />} />
      )
    },
    {
      field: 'vendor',
      headerName: 'Vendor',
      width: 180,
      renderCell: (params: any) => {
        if (!params.value) {
          return (
            <Typography variant="body2" color="textSecondary">
              —
            </Typography>
          );
        }
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Business fontSize="small" color="action" />
            <Typography variant="body2">{params.value}</Typography>
          </Box>
        );
      }
    },
    {
      field: 'amount',
      headerName: 'Amount',
      type: 'number',
      width: 140,
      renderCell: (params: any) => {
        if (!params.value || isNaN(params.value)) {
          return (
            <Typography variant="body2" color="textSecondary">
              —
            </Typography>
          );
        }
        return (
          <Typography variant="body2" fontWeight="bold" color="error.main">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0
            }).format(params.value)}
          </Typography>
        );
      }
    },
    {
      field: 'payment_method',
      headerName: 'Payment Method',
      width: 180,
      renderCell: (params: any) => {
        if (!params.value) {
          return (
            <Typography variant="body2" color="textSecondary">
              —
            </Typography>
          );
        }
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
            <Chip
              size="small"
              label={params.value.replace('_', ' ').toUpperCase()}
              color={getPaymentMethodColor(params.value) as any}
              variant="outlined"
            />
          </Box>
        );
      }
    },
    {
      field: 'date',
      headerName: 'Date',
      width: 120,
      valueFormatter: (params: any) => {
        if (!params.value) return '—';
        const date = new Date(params.value);
        return isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params: any) => (
        <Chip size="small" label={params.value} color={params.value === 'paid' ? 'success' : 'warning'} variant="outlined" />
      )
    }
  ];

  return (
    <MainCard content={false}>
      <Box sx={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSizeOptions={showPagination ? [10, 25, 50, 100] : []}
          initialState={
            showPagination
              ? {
                  pagination: {
                    paginationModel: { page: 0, pageSize: 25 }
                  }
                }
              : {}
          }
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell': {
              borderBottom: `1px solid ${theme.palette.divider}`
            },
            '& .MuiDataGrid-columnHeader': {
              backgroundColor: theme.palette.primary.main + '10',
              fontWeight: 'bold',
              borderBottom: `2px solid ${theme.palette.divider}`
            }
          }}
        />
      </Box>
    </MainCard>
  );
}
