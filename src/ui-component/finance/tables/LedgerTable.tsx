import React from 'react';
import { Typography, Chip } from '@mui/material';
import { AllyviaPaginatedTable, TableColumnConfig } from 'ui-component/common/AllyviaPaginatedTable';
import type { LedgerRow } from 'types/finance';

interface LedgerTableProps {
  ledger: LedgerRow[];
  showPagination?: boolean;
  showFilters?: boolean;
  title?: string;
  onRowClick?: (params: any) => void;
}

// Ledger table column configuration
const LEDGER_COLUMNS: TableColumnConfig[] = [
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
      return (
        <Typography variant="body2">
          {date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </Typography>
      );
    }
  },
  {
    field: 'account',
    headerName: 'Account',
    width: 180,
    renderCell: (params: any) => (
      <Typography variant="body2" fontWeight="medium">
        {params.value}
      </Typography>
    )
  },
  {
    field: 'description',
    headerName: 'Description',
    width: 250,
    renderCell: (params: any) => <Typography variant="body2">{params.value || '—'}</Typography>
  },
  {
    field: 'type',
    headerName: 'Type',
    width: 100,
    renderCell: (params: any) => (
      <Chip
        size="small"
        label={params.value?.toUpperCase() || '—'}
        color={params.value === 'debit' ? 'error' : 'success'}
        variant="outlined"
      />
    )
  },
  {
    field: 'debit',
    headerName: 'Debit',
    type: 'number',
    width: 140,
    renderCell: (params: any) => {
      if (!params.value || isNaN(params.value) || params.value === 0) {
        return (
          <Typography variant="body2" color="textSecondary">
            —
          </Typography>
        );
      }
      return (
        <Typography variant="body2" fontWeight="bold" color="error">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
          }).format(params.value)}
        </Typography>
      );
    }
  },
  {
    field: 'credit',
    headerName: 'Credit',
    type: 'number',
    width: 140,
    renderCell: (params: any) => {
      if (!params.value || isNaN(params.value) || params.value === 0) {
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
            minimumFractionDigits: 2
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
      const isNegative = params.value < 0;
      return (
        <Typography variant="body2" fontWeight="bold" color={isNegative ? 'error.main' : 'success.main'}>
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
          }).format(params.value)}
        </Typography>
      );
    }
  }
];

// Helper function to get row class names for styling
const getLedgerRowClassName = (params: any) => {
  switch (params.row.type) {
    case 'debit':
      return 'debit-row';
    case 'credit':
      return 'credit-row';
    default:
      return '';
  }
};

// Helper function to get custom styles
const getLedgerCustomStyles = () => {
  return {
    '& .MuiDataGrid-cell': {
      borderBottom: '1px solid rgba(224, 224, 224, 1)'
    },
    '& .debit-row': {
      backgroundColor: 'rgba(244, 67, 54, 0.05)'
    },
    '& .credit-row': {
      backgroundColor: 'rgba(76, 175, 80, 0.05)'
    }
  };
};

export const LedgerTable: React.FC<LedgerTableProps> = ({
  ledger,
  showPagination = true,
  showFilters = true,
  title = 'General Ledger',
  onRowClick
}) => {
  return (
    <AllyviaPaginatedTable
      rows={ledger}
      columns={LEDGER_COLUMNS}
      showPagination={showPagination}
      showFilters={showFilters}
      filterFields={['account', 'type', 'description', 'date']}
      getRowClassName={getLedgerRowClassName}
      customStyles={getLedgerCustomStyles()}
      title={title}
      onRowClick={onRowClick}
    />
  );
};

export default LedgerTable;
