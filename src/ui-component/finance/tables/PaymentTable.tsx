import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'store';
import type { RootState } from 'store';
import { fetchPaymentList } from 'store/slices/finance';
import {
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
  Tooltip,
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
import {
  CreditCard as CreditCardIcon,
  AccountBalance as BankIcon,
  Paid as PaidIcon,
  AttachMoney as CashIcon,
  SwapHoriz as AchIcon,
  ReceiptLong as CheckIcon
} from '@mui/icons-material';
import { Search, Clear } from '@mui/icons-material';
import AllyviaPagination from 'ui-component/common/AllyviaPagination';
import type { PaymentRow } from 'types/finance';

export const PaymentTable: React.FC = () => {
  const dispatch = useDispatch();
  const { paymentList, loading, filters } = useSelector((state: RootState) => state.finance as any);
  const payments = Array.isArray(paymentList?.items) ? paymentList.items : [];

  // Get pagination info from API response
  const paginationInfo = React.useMemo(() => {
    if (paymentList?.pagination) {
      return paymentList.pagination;
    }
    return {
      total_pages: 1,
      total_count: payments.length,
      current_page: 1,
      page_size: 20
    };
  }, [paymentList, payments.length]);

  // Local filter state
  const [search, setSearch] = useState('');
  const [ordering, setOrdering] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const startDate = filters?.startDate || '';
    const endDate = filters?.endDate || '';
    if (startDate && endDate) {
      dispatch(
        fetchPaymentList({
          startDate,
          endDate,
          page: page,
          pageSize: pageSize,
          search: search || undefined,
          ordering: ordering || undefined
        }) as any
      );
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
    const startDate = filters?.startDate || '';
    const endDate = filters?.endDate || '';
    if (startDate && endDate) {
      dispatch(
        fetchPaymentList({
          startDate,
          endDate,
          page: 1,
          pageSize: newPageSize,
          search: search || undefined,
          ordering: ordering || undefined
        }) as any
      );
    }
  };

  useEffect(() => {
    const startDate = filters?.startDate || '';
    const endDate = filters?.endDate || '';
    if (startDate && endDate) {
      dispatch(
        fetchPaymentList({
          startDate,
          endDate,
          page: currentPage,
          pageSize: pageSize,
          search: search || undefined,
          ordering: ordering || undefined
        }) as any
      );
    }
  }, [dispatch, currentPage, pageSize, search, ordering, filters?.startDate, filters?.endDate]);

  const fmtMoney = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(num || 0);
  };

  const renderMethod = (method?: string) => {
    const m = (method || '').toLowerCase();
    let icon: React.ReactNode = <PaidIcon fontSize="small" sx={{ color: 'text.primary' }} />;
    if (m.includes('credit')) icon = <CreditCardIcon fontSize="small" sx={{ color: 'text.primary' }} />;
    else if (m.includes('bank')) icon = <BankIcon fontSize="small" sx={{ color: 'text.primary' }} />;
    else if (m.includes('cash')) icon = <CashIcon fontSize="small" sx={{ color: 'text.primary' }} />;
    else if (m.includes('ach')) icon = <AchIcon fontSize="small" sx={{ color: 'text.primary' }} />;
    else if (m.includes('check')) icon = <CheckIcon fontSize="small" sx={{ color: 'text.primary' }} />;
    else if (m.includes('paypal')) icon = <PaidIcon fontSize="small" sx={{ color: 'text.primary' }} />;

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        <Typography variant="body2" sx={{ color: '#212529' }}>
          {method || '—'}
        </Typography>
      </Box>
    );
  };

  return (
    <Box>
      {/* Filters Row */}
      <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {/* Search */}
        <Box sx={{ flex: 1, maxWidth: 300 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search payments..."
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

        {/* Ordering */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select
            value={ordering}
            onChange={(e) => {
              setOrdering(e.target.value);
              setCurrentPage(1);
            }}
            displayEmpty
          >
            <MenuItem value="">
              <em>Ordering</em>
            </MenuItem>
            <MenuItem value="payment_date">Date ↑</MenuItem>
            <MenuItem value="-payment_date">Date ↓</MenuItem>
            <MenuItem value="amount">Amount ↑</MenuItem>
            <MenuItem value="-amount">Amount ↓</MenuItem>
            <MenuItem value="customer_name">Customer ↑</MenuItem>
            <MenuItem value="-customer_name">Customer ↓</MenuItem>
            <MenuItem value="payment_method">Method ↑</MenuItem>
            <MenuItem value="-payment_method">Method ↓</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Custom Table */}
      <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Payment #</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Amount
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Payment Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Reference</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment: PaymentRow) => (
              <TableRow key={payment.id} hover sx={{ '&:hover td': { backgroundColor: 'action.hover' } }}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#212529' }}>
                    {payment.qb_id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#212529' }}>
                    {payment.customer_name}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#212529' }}>
                    {fmtMoney(payment.amount)}
                  </Typography>
                </TableCell>
                <TableCell>{renderMethod(payment.payment_method)}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: '#212529' }}>
                    {payment.payment_date
                      ? new Date(payment.payment_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: '#6c757d' }}>
                    {payment.reference_number || '—'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Custom Pagination */}
        <AllyviaPagination
          currentPage={paginationInfo.current_page || currentPage}
          totalPages={paginationInfo.total_pages || 1}
          totalItems={paginationInfo.total_items || 0}
          pageSize={paginationInfo.items_per_page || pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </TableContainer>
    </Box>
  );
};

export default PaymentTable;
