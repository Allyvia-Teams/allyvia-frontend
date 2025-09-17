import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, Chip, Typography, useTheme } from '@mui/material';
import type { InvoiceRow } from 'types/finance';
import MainCard from 'ui-component/cards/MainCard';

export function InvoicesDataGrid({ rows, showPagination = true }: { rows: InvoiceRow[]; showPagination?: boolean }) {
  const theme = useTheme();

  const getStatusColor = (status: InvoiceRow['status']) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  const getDaysPastDueColor = (days: number) => {
    if (days <= 30) return 'warning';
    if (days <= 60) return 'error';
    return 'error';
  };

  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'Invoice #',
      width: 120,
      renderCell: (params: any) => (
        <Typography variant="body2" fontWeight="medium" color="primary">
          {params.value}
        </Typography>
      )
    },
    {
      field: 'customer',
      headerName: 'Customer',
      width: 200,
      renderCell: (params: any) => (
        <Typography variant="body2" fontWeight="medium">
          {params.value}
        </Typography>
      )
    },
    {
      field: 'invoice_type',
      headerName: 'Type',
      width: 120,
      renderCell: (params: any) => (
        <Chip size="small" label={params.value?.replace('_', ' ').toUpperCase() || '—'} color="primary" variant="outlined" />
      )
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
          <Typography variant="body2" fontWeight="bold" color="primary">
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
      field: 'balance',
      headerName: 'Balance',
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
        const isPaid = params.value === 0;
        return (
          <Typography variant="body2" fontWeight="medium" color={isPaid ? 'success.main' : 'warning.main'}>
            {isPaid
              ? 'Paid'
              : new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0
                }).format(params.value)}
          </Typography>
        );
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params: any) => {
        const statusLabels = {
          paid: 'Paid',
          pending: 'Pending',
          overdue: 'Overdue'
        };
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              size="small"
              label={statusLabels[params.value as keyof typeof statusLabels] || params.value}
              color={getStatusColor(params.value) as any}
              variant="outlined"
            />
          </Box>
        );
      }
    },
    {
      field: 'issue_date',
      headerName: 'Issued',
      width: 120,
      renderCell: (params: any) => {
        if (!params.value) {
          return (
            <Typography variant="body2" color="textSecondary">
              —
            </Typography>
          );
        }
        const date = new Date(params.value);
        if (isNaN(date.getTime())) {
          return (
            <Typography variant="body2" color="textSecondary">
              —
            </Typography>
          );
        }
        return <Typography variant="body2">{date.toLocaleDateString()}</Typography>;
      }
    },
    {
      field: 'due_date',
      headerName: 'Due',
      width: 120,
      renderCell: (params: any) => {
        if (!params.value) {
          return (
            <Typography variant="body2" color="textSecondary">
              —
            </Typography>
          );
        }
        const date = new Date(params.value);
        if (isNaN(date.getTime())) {
          return (
            <Typography variant="body2" color="textSecondary">
              —
            </Typography>
          );
        }
        return <Typography variant="body2">{date.toLocaleDateString()}</Typography>;
      }
    },
    {
      field: 'days_past_due',
      headerName: 'Days Past Due',
      type: 'number',
      width: 140,
      renderCell: (params: any) => {
        if (!params.value || params.value <= 0) {
          return (
            <Typography variant="body2" color="success.main">
              On Time
            </Typography>
          );
        }
        return (
          <Typography variant="body2" color={getDaysPastDueColor(params.value)}>
            {params.value} days
          </Typography>
        );
      }
    },
    {
      field: 'company_name',
      headerName: 'Company',
      width: 150,
      renderCell: (params: any) => (
        <Typography variant="body2" color="textSecondary">
          {params.value || '—'}
        </Typography>
      )
    }
  ];

  // Ensure all rows have unique IDs for DataGrid
  const rowsWithIds = rows.map((row, index) => ({
    ...row,
    id: row.id || `invoice-${index}` // Fallback ID if missing
  }));

  return (
    <MainCard content={false}>
      <Box sx={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={rowsWithIds}
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
          getRowId={(row) => row.id || `fallback-${Math.random()}`}
          getRowClassName={(params: any) => {
            if (params.row.days_past_due && params.row.days_past_due > 0) {
              return 'overdue-row';
            }
            return '';
          }}
          sx={{
            '& .overdue-row': {
              backgroundColor: theme.palette.error.light + '10'
            },
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
