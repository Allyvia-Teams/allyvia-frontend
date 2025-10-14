import React from 'react';
import { Typography, Chip, Box, TextField, FormControl, Select, MenuItem, InputAdornment, IconButton, Tooltip } from '@mui/material';
import { Search, Clear } from '@mui/icons-material';
import { AllyviaPaginatedTable, TableColumnConfig } from 'ui-component/common/AllyviaPaginatedTable';
import type { InvoiceRow } from 'types/finance';
import { useDispatch, useSelector } from 'store';
import type { RootState } from 'store';
import { fetchInvoiceList, fetchInvoiceStatistics } from 'store/slices/finance';

interface InvoiceTableProps {
  invoices: InvoiceRow[];
  showPagination?: boolean;
  showFilters?: boolean;
  title?: string;
  onRowClick?: (params: any) => void;
}

// Invoice table column configuration
const INVOICE_COLUMNS: TableColumnConfig[] = [
  {
    field: 'doc_number',
    headerName: 'Invoice #',
    width: 120,
    renderCell: (params: any) => (
      <Typography variant="body2" fontWeight="medium" color="primary">
        {params.value}
      </Typography>
    )
  },
  {
    field: 'customer_name',
    headerName: 'Customer',
    width: 200,
    renderCell: (params: any) => (
      <Typography variant="body2" fontWeight="medium">
        {params.value}
      </Typography>
    )
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 120,
    renderCell: (params: any) => (
      <Chip
        size="small"
        label={params.value?.toUpperCase() || '—'}
        color={params.value === 'paid' ? 'success' : params.value === 'overdue' ? 'error' : 'warning'}
        variant="outlined"
      />
    )
  },
  {
    field: 'total_amount',
    headerName: 'Amount',
    type: 'number',
    width: 140,
    renderCell: (params: any) => {
      const amount = parseFloat(params.value || '0');
      if (isNaN(amount)) {
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
            minimumFractionDigits: 2
          }).format(amount)}
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
      const balance = parseFloat(params.value || '0');
      if (isNaN(balance)) {
        return (
          <Typography variant="body2" color="textSecondary">
            —
          </Typography>
        );
      }
      const isPaid = balance === 0;
      return (
        <Typography variant="body2" fontWeight="medium" color={isPaid ? 'success.main' : 'warning.main'}>
          {isPaid
            ? 'Paid'
            : new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2
              }).format(balance)}
        </Typography>
      );
    }
  },
  {
    field: 'date',
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
    field: 'due_date',
    headerName: 'Due Date',
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
      const today = new Date();
      const isOverdue = date < today;
      return (
        <Typography variant="body2" color={isOverdue ? 'error.main' : 'text.primary'} fontWeight={isOverdue ? 'medium' : 'normal'}>
          {date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </Typography>
      );
    }
  }
];

// Helper function to get row class names for styling
const getInvoiceRowClassName = (params: any) => {
  switch (params.row.status) {
    case 'paid':
      return 'paid-row';
    case 'pending':
      return 'pending-row';
    case 'overdue':
      return 'overdue-row';
    default:
      return '';
  }
};

// Helper function to get custom styles
const getInvoiceCustomStyles = () => {
  return {
    '& .MuiDataGrid-cell': {
      borderBottom: '1px solid rgba(224, 224, 224, 1)'
    },
    '& .paid-row': {
      backgroundColor: 'rgba(76, 175, 80, 0.05)'
    },
    '& .pending-row': {
      backgroundColor: 'rgba(255, 152, 0, 0.05)'
    },
    '& .overdue-row': {
      backgroundColor: 'rgba(244, 67, 54, 0.05)'
    }
  };
};

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  showPagination = true,
  showFilters = true,
  title = 'Invoices',
  onRowClick
}) => {
  const dispatch = useDispatch();
  const { filters } = useSelector((state: RootState) => state.finance);

  // Local API filter state
  const [invSearch, setInvSearch] = React.useState('');
  const [invStatus, setInvStatus] = React.useState<string>('');
  const [invAmountRange, setInvAmountRange] = React.useState<string>('');
  const [invCustomerRefId, setInvCustomerRefId] = React.useState<string>('');
  const [invIsVoided, setInvIsVoided] = React.useState<string>('');
  const [invOrdering, setInvOrdering] = React.useState<string>('');
  const [invPageSize, setInvPageSize] = React.useState<number>(50);

  React.useEffect(() => {
    const startDate = filters?.startDate;
    const endDate = filters?.endDate;
    if (startDate && endDate) {
      dispatch(fetchInvoiceStatistics({ startDate, endDate }) as any);
      dispatch(
        fetchInvoiceList({
          startDate,
          endDate,
          search: invSearch || undefined,
          status: invStatus || undefined,
          amount_range: invAmountRange || undefined,
          customer_ref_id: invCustomerRefId || undefined,
          is_voided: invIsVoided ? invIsVoided === 'true' : undefined,
          ordering: invOrdering || undefined,
          page_size: invPageSize || undefined
        }) as any
      );
    }
  }, [
    dispatch,
    filters?.startDate,
    filters?.endDate,
    invSearch,
    invStatus,
    invAmountRange,
    invCustomerRefId,
    invIsVoided,
    invOrdering,
    invPageSize
  ]);

  return (
    <>
      {/* Filters Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
        <Box sx={{ width: 240 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search (customer or #)"
            value={invSearch}
            onChange={(e) => setInvSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: invSearch && (
                <InputAdornment position="end">
                  <Tooltip title="Clear">
                    <IconButton size="small" onClick={() => setInvSearch('')}>
                      <Clear fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              )
            }}
          />
        </Box>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select value={invStatus} displayEmpty onChange={(e) => setInvStatus(e.target.value)}>
            <MenuItem value="">
              <em>All Status</em>
            </MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="unpaid">Unpaid</MenuItem>
            <MenuItem value="overdue">Overdue</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select value={invAmountRange} displayEmpty onChange={(e) => setInvAmountRange(e.target.value)}>
            <MenuItem value="">
              <em>All Amounts</em>
            </MenuItem>
            <MenuItem value="0-1000">0-1000</MenuItem>
            <MenuItem value="1000-5000">1000-5000</MenuItem>
            <MenuItem value="5000+">5000+</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          placeholder="Customer Ref ID"
          value={invCustomerRefId}
          onChange={(e) => setInvCustomerRefId(e.target.value)}
          sx={{ width: 160 }}
        />

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <Select value={invIsVoided} displayEmpty onChange={(e) => setInvIsVoided(e.target.value)}>
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            <MenuItem value="true">Voided</MenuItem>
            <MenuItem value="false">Not Voided</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select value={invOrdering} displayEmpty onChange={(e) => setInvOrdering(e.target.value)}>
            <MenuItem value="">
              <em>Ordering</em>
            </MenuItem>
            <MenuItem value="date">Date ↑</MenuItem>
            <MenuItem value="-date">Date ↓</MenuItem>
            <MenuItem value="due_date">Due Date ↑</MenuItem>
            <MenuItem value="-due_date">Due Date ↓</MenuItem>
            <MenuItem value="total_amount">Amount ↑</MenuItem>
            <MenuItem value="-total_amount">Amount ↓</MenuItem>
            <MenuItem value="customer_name">Customer ↑</MenuItem>
            <MenuItem value="-customer_name">Customer ↓</MenuItem>
            <MenuItem value="balance">Balance ↑</MenuItem>
            <MenuItem value="-balance">Balance ↓</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 110 }}>
          <Select value={String(invPageSize)} onChange={(e) => setInvPageSize(Number(e.target.value))}>
            <MenuItem value={'10'}>10</MenuItem>
            <MenuItem value={'25'}>25</MenuItem>
            <MenuItem value={'50'}>50</MenuItem>
            <MenuItem value={'100'}>100</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <AllyviaPaginatedTable
        rows={invoices}
        columns={INVOICE_COLUMNS}
        showPagination={showPagination}
        showFilters={false}
        filterFields={['status', 'customer_name', 'doc_number']}
        getRowClassName={getInvoiceRowClassName}
        customStyles={getInvoiceCustomStyles()}
        title={title}
        onRowClick={onRowClick}
      />
    </>
  );
};

export default InvoiceTable;
