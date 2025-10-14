import React, { useEffect, useState } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useDispatch, useSelector } from 'store';
import type { RootState } from 'store';
import { fetchExpensesList } from 'store/slices/finance';
import { TextField, FormControl, Select, MenuItem, InputAdornment, IconButton, Tooltip, Chip, Typography, Box } from '@mui/material';
import { Search, Clear } from '@mui/icons-material';

export const ExpenseTable: React.FC = () => {
  const dispatch = useDispatch();
  const { expensesList, loading, filters } = useSelector((state: RootState) => state.finance as any);
  const expenses = Array.isArray(expensesList?.items) ? expensesList.items : [];
  const totalExpenses: number = (expensesList as any)?.total || (expensesList as any)?.totalItems || expenses.length;

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(20);
  const [ordering, setOrdering] = useState<string>('');

  useEffect(() => {
    const startDate = filters.startDate || '';
    const endDate = filters.endDate || '';
    if (startDate && endDate) {
      dispatch(
        fetchExpensesList({
          page: page + 1,
          pageSize,
          search: search || undefined,
          status: status || undefined,
          ordering: ordering || undefined,
          startDate,
          endDate,
          // Pass through amount filters if present (backend expects min_amount/max_amount via qbEntityFactory or server normalization)
          // We forward them as min_amount/max_amount to be safe
          ...(minAmount ? { min_amount: Number(minAmount) } : {}),
          ...(maxAmount ? { max_amount: Number(maxAmount) } : {})
        }) as any
      );
    }
  }, [dispatch, page, pageSize, search, status, ordering, minAmount, maxAmount, filters.startDate, filters.endDate]);

  const columns: GridColDef[] = [
    {
      field: 'qb_id',
      headerName: 'Expense #',
      width: 140,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="medium" color="primary">
          {params.value}
        </Typography>
      )
    },
    {
      field: 'vendor_name',
      headerName: 'Vendor',
      width: 200,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="medium">
          {params.value}
        </Typography>
      )
    },
    {
      field: 'line_items',
      headerName: 'Description',
      width: 260,
      renderCell: (params) => {
        const items = params.value || [];
        const primary = items[0];
        return (
          <Box>
            <Typography variant="body2" noWrap>
              {primary?.description || '—'}
            </Typography>
            {items.length > 1 && (
              <Typography variant="caption" color="textSecondary">
                +{items.length - 1} more
              </Typography>
            )}
          </Box>
        );
      }
    },
    {
      field: 'amount',
      headerName: 'Amount',
      type: 'number',
      width: 130,
      renderCell: (params) => {
        const amount = parseFloat(params.value || '0');
        return (
          <Typography variant="body2" fontWeight="bold" color="error.main">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(isNaN(amount) ? 0 : amount)}
          </Typography>
        );
      }
    },
    {
      field: 'balance',
      headerName: 'Balance',
      type: 'number',
      width: 130,
      renderCell: (params) => {
        const balance = parseFloat(params.value || '0');
        return (
          <Typography variant="body2" fontWeight="bold" color={balance > 0 ? 'error.main' : 'success.main'}>
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(isNaN(balance) ? 0 : balance)}
          </Typography>
        );
      }
    },
    {
      field: 'bill_date',
      headerName: 'Expense Date',
      width: 130,
      renderCell: (params) => {
        const date = params.value ? new Date(params.value) : null;
        return <Typography variant="body2">{date && !isNaN(date.getTime()) ? date.toLocaleDateString('en-US') : '—'}</Typography>;
      }
    },
    {
      field: 'due_date',
      headerName: 'Due Date',
      width: 130,
      renderCell: (params) => {
        const date = params.value ? new Date(params.value) : null;
        const overdue = date && date < new Date();
        return (
          <Typography variant="body2" color={overdue ? 'error' : 'textPrimary'} fontWeight={overdue ? 'bold' : 'normal'}>
            {date && !isNaN(date.getTime()) ? date.toLocaleDateString('en-US') : '—'}
          </Typography>
        );
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const s = params.value;
        let color: 'success' | 'warning' | 'error' = 'success';
        if (s === 'unpaid') color = 'warning';
        else if (s === 'overdue') color = 'error';
        return <Chip size="small" label={(s || '—').toUpperCase()} color={color} variant="outlined" />;
      }
    }
  ];

  return (
    <Box>
      {/* Filters Row */}
      <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, maxWidth: 300 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => {
              setPage(0);
              setSearch(e.target.value);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: search && (
                <InputAdornment position="end">
                  <Tooltip title="Clear">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSearch('');
                        setPage(0);
                      }}
                    >
                      <Clear fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              )
            }}
          />
        </Box>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
            displayEmpty
          >
            <MenuItem value="">
              <em>All Statuses</em>
            </MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="unpaid">Unpaid</MenuItem>
            <MenuItem value="overdue">Overdue</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Server-paginated table */}
      <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Min Amount"
          value={minAmount}
          onChange={(e) => {
            setPage(0);
            setMinAmount(e.target.value.replace(/[^0-9.]/g, ''));
          }}
          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          sx={{ width: 140 }}
        />
        <TextField
          size="small"
          placeholder="Max Amount"
          value={maxAmount}
          onChange={(e) => {
            setPage(0);
            setMaxAmount(e.target.value.replace(/[^0-9.]/g, ''));
          }}
          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          sx={{ width: 140 }}
        />
      </Box>

      <DataGrid
        rows={expenses.map((e: any, idx: number) => ({ id: e.id || `${page}-${idx}`, ...e }))}
        columns={columns}
        pageSizeOptions={[10, 20, 50, 100]}
        pagination
        paginationModel={{ page, pageSize }}
        onPaginationModelChange={(model) => {
          setPage(model.page);
          setPageSize(model.pageSize);
        }}
        rowCount={(expensesList as any)?.pagination?.total_items ?? totalExpenses}
        paginationMode="server"
        loading={loading?.expensesList}
        autoHeight
      />
    </Box>
  );
};

export default ExpenseTable;
