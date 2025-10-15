import React from 'react';
import {
  Typography,
  Chip,
  Box,
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
  Tooltip,
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

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  showPagination = true,
  showFilters = true,
  title = 'Invoices',
  onRowClick
}) => {
  const dispatch = useDispatch();
  const { filters, invoiceList } = useSelector((state: RootState) => state.finance);

  // Local API filter state
  const [invSearch, setInvSearch] = React.useState('');
  const [invStatus, setInvStatus] = React.useState<string>('');
  const [invAmountRange, setInvAmountRange] = React.useState<string>('');
  const [invCustomerRefId, setInvCustomerRefId] = React.useState<string>('');
  const [invIsVoided, setInvIsVoided] = React.useState<string>('');
  const [invOrdering, setInvOrdering] = React.useState<string>('');
  const [invPageSize, setInvPageSize] = React.useState<number>(50);
  const [currentPage, setCurrentPage] = React.useState(1);

  // Get pagination info from API response
  const paginationInfo = React.useMemo(() => {
    if (Array.isArray(invoiceList) && (invoiceList as any)?.pagination) {
      return (invoiceList as any).pagination;
    }
    return {
      total_pages: 1,
      total_count: invoices.length,
      current_page: 1,
      page_size: invPageSize
    };
  }, [invoiceList, invoices.length, invPageSize]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const startDate = filters?.startDate;
    const endDate = filters?.endDate;
    if (startDate && endDate) {
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
          page_size: invPageSize,
          page: page
        }) as any
      );
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setInvPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
    const startDate = filters?.startDate;
    const endDate = filters?.endDate;
    if (startDate && endDate) {
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
          page_size: newPageSize,
          page: 1
        }) as any
      );
    }
  };

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
          page_size: invPageSize,
          page: currentPage
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
    invPageSize,
    currentPage
  ]);

  return (
    <>
      {/* Filters Bar */}
      {showFilters && (
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
        </Box>
      )}

      {/* Custom Table */}
      <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice #</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">Balance</TableCell>
              <TableCell>Issued</TableCell>
              <TableCell>Due Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id} hover sx={{ cursor: 'pointer' }} onClick={() => onRowClick?.(invoice)}>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium" color="primary">
                    {invoice.doc_number}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {invoice.customer_name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={invoice.status?.toUpperCase() || '—'}
                    color={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'error' : 'warning'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="bold" color="primary">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 2
                    }).format(parseFloat(invoice.total_amount || '0'))}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {(() => {
                    const balance = parseFloat(invoice.balance || '0');
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
                  })()}
                </TableCell>
                <TableCell>
                  {invoice.date ? (
                    <Typography variant="body2">
                      {new Date(invoice.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      —
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {invoice.due_date ? (
                    (() => {
                      const date = new Date(invoice.due_date);
                      const today = new Date();
                      const isOverdue = date < today;
                      return (
                        <Typography
                          variant="body2"
                          color={isOverdue ? 'error.main' : 'text.primary'}
                          fontWeight={isOverdue ? 'medium' : 'normal'}
                        >
                          {date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Typography>
                      );
                    })()
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      —
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Custom Pagination */}
        {showPagination && (
          <AllyviaPagination
            currentPage={paginationInfo.current_page || currentPage}
            totalPages={paginationInfo.total_pages || 1}
            totalItems={paginationInfo.total_count || 0}
            pageSize={paginationInfo.page_size || invPageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </TableContainer>
    </>
  );
};

export default InvoiceTable;
