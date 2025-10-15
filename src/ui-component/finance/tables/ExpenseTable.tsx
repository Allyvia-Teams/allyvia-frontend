import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'store';
import type { RootState } from 'store';
import { fetchExpensesList } from 'store/slices/finance';
import {
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
  Tooltip,
  Chip,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { Search, Clear } from '@mui/icons-material';
import AllyviaPagination from 'ui-component/common/AllyviaPagination';

export const ExpenseTable: React.FC = () => {
  const dispatch = useDispatch();
  const { expensesList, loading, filters } = useSelector((state: RootState) => state.finance as any);
  const expenses = Array.isArray(expensesList?.items) ? expensesList.items : [];

  // Get pagination info from API response
  const paginationInfo = React.useMemo(() => {
    if ((expensesList as any)?.pagination) {
      return (expensesList as any).pagination;
    }
    return {
      total_pages: 1,
      total_count: expenses.length,
      current_page: 1,
      page_size: 20
    };
  }, [expensesList, expenses.length]);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(20);
  const [ordering, setOrdering] = useState<string>('');

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const startDate = filters.startDate || '';
    const endDate = filters.endDate || '';
    if (startDate && endDate) {
      dispatch(
        fetchExpensesList({
          page: page,
          pageSize,
          search: search || undefined,
          status: status || undefined,
          ordering: ordering || undefined,
          startDate,
          endDate,
          ...(minAmount ? { min_amount: Number(minAmount) } : {}),
          ...(maxAmount ? { max_amount: Number(maxAmount) } : {})
        }) as any
      );
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
    const startDate = filters.startDate || '';
    const endDate = filters.endDate || '';
    if (startDate && endDate) {
      dispatch(
        fetchExpensesList({
          page: 1,
          pageSize: newPageSize,
          search: search || undefined,
          status: status || undefined,
          ordering: ordering || undefined,
          startDate,
          endDate,
          ...(minAmount ? { min_amount: Number(minAmount) } : {}),
          ...(maxAmount ? { max_amount: Number(maxAmount) } : {})
        }) as any
      );
    }
  };

  useEffect(() => {
    const startDate = filters.startDate || '';
    const endDate = filters.endDate || '';
    if (startDate && endDate) {
      dispatch(
        fetchExpensesList({
          page: currentPage,
          pageSize,
          search: search || undefined,
          status: status || undefined,
          ordering: ordering || undefined,
          startDate,
          endDate,
          ...(minAmount ? { min_amount: Number(minAmount) } : {}),
          ...(maxAmount ? { max_amount: Number(maxAmount) } : {})
        }) as any
      );
    }
  }, [dispatch, currentPage, pageSize, search, status, ordering, minAmount, maxAmount, filters.startDate, filters.endDate]);

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
              setCurrentPage(1);
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
                        setCurrentPage(1);
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
              setCurrentPage(1);
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
            setCurrentPage(1);
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
            setCurrentPage(1);
            setMaxAmount(e.target.value.replace(/[^0-9.]/g, ''));
          }}
          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          sx={{ width: 140 }}
        />
      </Box>

      {/* Custom Table */}
      <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Expense #</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Vendor</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Description</TableCell>
              <TableCell align="right" sx={{ color: '#fff', fontWeight: 600 }}>
                Amount
              </TableCell>
              <TableCell align="right" sx={{ color: '#fff', fontWeight: 600 }}>
                Balance
              </TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Expense Date</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Due Date</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.map((expense: any) => (
              <TableRow key={expense.id} hover sx={{ '&:hover td': { backgroundColor: 'action.hover' } }}>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium" color="primary">
                    {expense.qb_id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {expense.vendor_name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" noWrap>
                      {expense.line_items?.[0]?.description || '—'}
                    </Typography>
                    {expense.line_items && expense.line_items.length > 1 && (
                      <Typography variant="caption" color="textSecondary">
                        +{expense.line_items.length - 1} more
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="bold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(expense.amount || '0'))}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    color={parseFloat(expense.balance || '0') > 0 ? 'error.main' : 'text.primary'}
                  >
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(expense.balance || '0'))}
                  </Typography>
                </TableCell>
                <TableCell>
                  {expense.bill_date ? (
                    <Typography variant="body2">{new Date(expense.bill_date).toLocaleDateString('en-US')}</Typography>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      —
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {expense.due_date ? (
                    (() => {
                      const date = new Date(expense.due_date);
                      const overdue = date < new Date();
                      return (
                        <Typography variant="body2" color={overdue ? 'error' : 'textPrimary'} fontWeight={overdue ? 'bold' : 'normal'}>
                          {date.toLocaleDateString('en-US')}
                        </Typography>
                      );
                    })()
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      —
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={(expense.status || '—').toUpperCase()}
                    color={expense.status === 'paid' ? 'success' : expense.status === 'overdue' ? 'error' : 'info'}
                    variant="filled"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Custom Pagination */}
        <AllyviaPagination
          currentPage={paginationInfo.current_page || currentPage}
          totalPages={paginationInfo.total_pages || 1}
          totalItems={paginationInfo.total_count || 0}
          pageSize={paginationInfo.page_size || pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </TableContainer>
    </Box>
  );
};

export default ExpenseTable;
