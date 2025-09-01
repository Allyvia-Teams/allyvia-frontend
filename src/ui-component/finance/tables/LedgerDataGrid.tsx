import React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, Chip, Typography, useTheme } from '@mui/material';
import { CalendarToday } from '@mui/icons-material';
import type { LedgerRow } from 'types/finance';
import MainCard from 'ui-component/cards/MainCard';

export function LedgerDataGrid({ rows, showPagination = true }: { rows: LedgerRow[]; showPagination?: boolean }) {
  const theme = useTheme();

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'bank':
        return 'primary';
      case 'accounts_receivable':
        return 'success';
      case 'accounts_payable':
        return 'warning';
      case 'income':
        return 'success';
      case 'expense':
        return 'error';
      case 'equity':
        return 'info';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'date',
      headerName: 'Date',
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
      field: 'account_name',
      headerName: 'Account',
      width: 200,
      renderCell: (params: any) => (
        <Typography variant="body2" fontWeight="medium" color="primary">
          {params.value}
        </Typography>
      )
    },
    // Removed mock-only account_code column (not guaranteed by real APIs)
    {
      field: 'account_type',
      headerName: 'Type',
      width: 140,
      renderCell: (params: any) => (
        <Chip
          size="small"
          label={params.value.replace('_', ' ').toUpperCase()}
          color={getAccountTypeColor(params.value) as any}
          variant="outlined"
        />
      )
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 150
    },
    // Removed mock-only memo column (not guaranteed by real APIs)
    {
      field: 'debit',
      headerName: 'Debit',
      type: 'number',
      width: 130,
      renderCell: (params: any) => {
        if (!params.value || params.value <= 0 || isNaN(params.value)) {
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
      field: 'credit',
      headerName: 'Credit',
      type: 'number',
      width: 130,
      renderCell: (params: any) => {
        if (!params.value || params.value <= 0 || isNaN(params.value)) {
          return (
            <Typography variant="body2" color="textSecondary">
              —
            </Typography>
          );
        }
        return (
          <Typography variant="body2" fontWeight="bold" color="success.main">
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
      width: 120,
      renderCell: (params: any) => {
        if (!params.value || isNaN(params.value)) {
          return (
            <Typography variant="body2" color="textSecondary">
              —
            </Typography>
          );
        }
        return (
          <Typography variant="body2" fontWeight="medium" color="primary">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0
            }).format(params.value)}
          </Typography>
        );
      }
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
          getRowClassName={(params: any) => {
            if (params.row.debit > 0) {
              return 'debit-row';
            }
            if (params.row.credit > 0) {
              return 'credit-row';
            }
            return '';
          }}
          sx={{
            '& .debit-row': {
              backgroundColor: theme.palette.error.light + '05'
            },
            '& .credit-row': {
              backgroundColor: theme.palette.success.light + '05'
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
