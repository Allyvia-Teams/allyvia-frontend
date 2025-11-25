import * as React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip,
  Grid,
  SelectChangeEvent,
  CircularProgress
} from '@mui/material';
import { useDispatch, useSelector } from 'store';
import { qbEntityConfigs, EntityType, StatCard, ColumnConfig } from 'config/qbEntities';
import { fetchThunks } from 'store/slices/qbEntities';
import { getCompanyId } from 'utils/authStorage';
import { format } from 'date-fns';
import {
  AllyviaFilterDatePicker,
  AllyviaFilterSelect,
  AllyviaFilterButton,
  AllyviaPagination,
  AllyviaSearchAutocomplete
} from 'ui-component/common';
import TableSkeleton from 'ui-component/common/TableSkeleton';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import axiosInstance from 'utils/axios';

interface QBEntityTableProps {
  entityType: EntityType;
  onRowClick?: (row: any) => void;
  hideActions?: boolean;
  hideFilters?: boolean;
  hideStats?: boolean;
}

export const QBEntityTable: React.FC<QBEntityTableProps> = ({
  entityType,
  onRowClick,
  hideActions = false,
  hideFilters = false,
  hideStats = false
}) => {
  const dispatch = useDispatch();
  const config = qbEntityConfigs[entityType];

  const entityState = useSelector((state) => state.qbEntities[entityType]);
  const { items, pagination, loading, error } = entityState || {
    items: [],
    pagination: null,
    loading: false,
    error: null
  };

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [localFilters, setLocalFilters] = React.useState<Record<string, any>>({});
  const [dateRange, setDateRange] = React.useState<RangeValue | null>(null);
  const [statsLoading, setStatsLoading] = React.useState(false);
  const [statsData, setStatsData] = React.useState<any>(null);

  const companyId = getCompanyId();

  // Fetch stats from server when config has statsEndpoint
  const fetchStats = React.useCallback(async () => {
    if (config.statsEndpoint && companyId) {
      setStatsLoading(true);
      try {
        const response = await axiosInstance.get(config.statsEndpoint, {
          params: { company_id: companyId }
        });
        setStatsData(response.data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setStatsLoading(false);
      }
    }
  }, [config.statsEndpoint, companyId]);

  // Fetch stats only on initial load
  React.useEffect(() => {
    if (config.statsEndpoint) {
      fetchStats();
    }
  }, [companyId, config.statsEndpoint, fetchStats]);

  const handleFetch = React.useCallback(() => {
    if (!companyId) return;

    const fetchThunk = fetchThunks[entityType];

    // Build filter params using the factory method
    const allFilters: Record<string, any> = {
      ...localFilters,
      ...(searchTerm && { search: searchTerm }),
      ...(dateRange && {
        dateRange: {
          start: dateRange.start?.toString(),
          end: dateRange.end?.toString()
        }
      })
    };

    // Convert amountRange to min/max for backend
    if (allFilters.amountRange && allFilters.amountRange !== 'all') {
      const range = allFilters.amountRange;
      delete allFilters.amountRange;

      if (range === '0-1000') {
        allFilters.amount = { min: 0, max: 1000 };
      } else if (range === '1000-5000') {
        allFilters.amount = { min: 1000, max: 5000 };
      } else if (range === '5000-10000') {
        allFilters.amount = { min: 5000, max: 10000 };
      } else if (range === '10000+') {
        allFilters.amount = { min: 10000 };
      }
    }

    dispatch(
      fetchThunk({
        companyId,
        filters: allFilters,
        page: page,
        pageSize: pageSize
      })
    );
  }, [companyId, entityType, localFilters, searchTerm, page, pageSize, dateRange, dispatch, config]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    handleFetch();
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
    handleFetch();
  };

  const handleFilterChange = (filterKey: string, value: any) => {
    if (value === 'all' || value === '') {
      setLocalFilters((prev) => {
        const newFilters = { ...prev };
        delete newFilters[filterKey];
        return newFilters;
      });
    } else {
      setLocalFilters((prev) => ({ ...prev, [filterKey]: value }));
    }
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setLocalFilters({});
    setDateRange(null);
    setPage(1);
  };

  const fetchSuggestions = React.useCallback(
    async (query: string) => {
      if (!companyId || !config.suggestionsEndpoint) return [];

      try {
        const response = await axiosInstance.get(config.suggestionsEndpoint, {
          params: {
            q: query,
            company_id: companyId
          }
        });

        if (response.data?.suggestions) {
          return response.data.suggestions.map((s: any) => ({
            value: s.display || s[config.displayField] || s.name || s.value,
            label: s.display || s[config.displayField] || s.name || s.label,
            type: 'exact' as const,
            count: s.count
          }));
        }
        return [];
      } catch (err) {
        console.error(`Error fetching ${entityType} suggestions:`, err);
        return [];
      }
    },
    [companyId, config.suggestionsEndpoint, config.displayField, entityType]
  );

  React.useEffect(() => {
    const delayDebounceFn = setTimeout(
      () => {
        if (companyId) {
          handleFetch();
        }
      },
      searchTerm && searchTerm.length > 0 ? 500 : 0
    );

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, localFilters, page, pageSize, dateRange, companyId, handleFetch]);

  const getStatValue = (stat: any) => {
    // If we have server-side stats, use them
    if (statsData && config.statsEndpoint) {
      // Map stat label to stats data field - entity-aware to avoid duplicate keys
      const getFieldName = (label: string, type: EntityType): string | undefined => {
        // Common mappings (non-conflicting)
        const commonMap: Record<string, string> = {
          // Bills
          'Total Bills': 'total_bills',
          // Invoices
          'Total Invoices': 'total_invoices',
          Unpaid: 'unpaid_count',
          Overdue: 'overdue_count',
          Paid: 'paid_count',
          'Total Amount': 'total_amount',
          'Outstanding Balance': 'outstanding_balance',
          // Customers
          'Total Customers': 'total_customers',
          'Total Outstanding': 'total_outstanding',
          // Vendors
          'Total Vendors': 'total_vendors',
          'Total Payable': 'total_payable',
          // Vendor Credits
          'Open Credits': 'open_credits',
          'Total Available': 'total_available',
          'Expiring Soon': 'expiring_soon',
          'Unused >90 days': 'unused_over_90_days',
          // Purchases
          'Total Purchases': 'total_purchases',
          'Credit Card': 'creditcard_purchases_count',
          'MTD Amount': 'mtd_amount',
          // Accounts
          'Total Accounts': 'total_accounts',
          'Active Accounts': 'active_accounts',
          'Total Assets': 'total_assets',
          'Total Liabilities': 'total_liabilities',
          // Payments
          'Total Payments': 'total_payments',
          'Total Received': 'total_received',
          'Unapplied Total': 'total_unapplied',
          'Average Payment': 'average_payment',
          "Today's Payments": 'todays_payments',
          'Cash Payments': 'payments_by_cash',
          'Check Payments': 'payments_by_check',
          'Card Payments': 'payments_by_card'
        };

        // Entity-specific overrides for conflicting labels
        const entitySpecificMap: Record<string, Record<string, string>> = {
          customer: {
            'With Balance': 'customers_with_balance',
            'Average Balance': 'average_balance'
          },
          vendor: {
            'With Balance': 'vendors_with_balance',
            'Average Balance': 'average_balance'
          },
          invoice: {
            'Total Balance': 'total_balance'
          },
          account: {
            'Total Balance': 'total_balance'
          }
        };

        return entitySpecificMap[type]?.[label] ?? commonMap[label];
      };

      const field = getFieldName(stat.label, entityType);
      if (field !== undefined) {
        const value = statsData[field];
        return value || 0;
      }
    }

    // Fallback to client-side calculation for entities without stats endpoint
    if (!items || items.length === 0) return 0;

    let filteredItems = items;
    if (stat.filter) {
      filteredItems = items.filter((item) => {
        return Object.entries(stat.filter).every(([key, value]: [string, any]) => {
          if (typeof value === 'object' && value.gt !== undefined) {
            return item[key] > value.gt;
          }
          if (typeof value === 'object' && value.lt !== undefined) {
            return item[key] < value.lt;
          }
          if (value === 'today') {
            return format(new Date(item[key]), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          }
          if (value === 'this_week') {
            const itemDate = new Date(item[key]);
            const today = new Date();
            const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
            const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));
            return itemDate >= weekStart && itemDate <= weekEnd;
          }
          if (value === 'this_month') {
            const itemDate = new Date(item[key]);
            const today = new Date();
            return itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
          }
          if (value === 'overdue' && key === 'status') {
            return item.status === 'overdue';
          }
          return item[key] === value;
        });
      });
    }

    switch (stat.calc) {
      case 'count':
        return filteredItems.length;
      case 'sum':
        return filteredItems.reduce((acc, item) => acc + (parseFloat(item[stat.field]) || 0), 0);
      case 'avg':
        const sum = filteredItems.reduce((acc, item) => acc + (parseFloat(item[stat.field]) || 0), 0);
        return filteredItems.length > 0 ? (sum / filteredItems.length).toFixed(2) : 0;
      case 'max':
        const max = Math.max(...filteredItems.map((item) => parseFloat(item[stat.field]) || 0));
        if (stat.display) {
          const maxItem = filteredItems.find((item) => parseFloat(item[stat.field]) === max);
          return maxItem ? maxItem[stat.display] : 'N/A';
        }
        return max;
      case 'min':
        const min = Math.min(...filteredItems.map((item) => parseFloat(item[stat.field]) || 0));
        return min;
      default:
        return 0;
    }
  };

  const formatCellValue = (column: any, value: any) => {
    if (value === null || value === undefined || value === '') return '-';

    if (column.id.includes('date')) {
      return value ? format(new Date(value), 'MMM dd, yyyy') : '-';
    }

    if (column.id === 'status') {
      const color =
        value === 'paid' || value === 'active'
          ? 'success'
          : value === 'overdue' || value === 'inactive'
            ? 'error'
            : value === 'unpaid'
              ? 'warning'
              : 'default';
      return <Chip label={value} color={color} size="small" />;
    }

    if (column.id === 'sync_status') {
      const color = value === 'synced' ? 'success' : value === 'pending' ? 'warning' : value === 'error' ? 'error' : 'default';
      return <Chip label={value} color={color} size="small" variant="outlined" />;
    }

    if (column.id.includes('amount') || column.id === 'balance' || column.id.includes('price') || column.id === 'current_balance') {
      const num = parseFloat(value);
      return isNaN(num) ? value : `$${num.toFixed(2)}`;
    }

    if (typeof value === 'boolean') {
      return value ? <Chip label="Yes" color="success" size="small" /> : <Chip label="No" color="default" size="small" />;
    }

    return value;
  };

  if (error) {
    return (
      <Paper sx={{ width: '100%', p: 2 }}>
        <Typography color="error">
          Error loading {config.name.toLowerCase()}s: {error}
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {!hideStats && (
        <Box sx={{ position: 'relative' }}>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {config.statCards.map((stat, index) => {
              const value = getStatValue(stat);
              const statField = (stat as StatCard).field;
              const isMonetary =
                statField?.includes('amount') ||
                statField?.includes('balance') ||
                stat.label === 'Total Amount' ||
                stat.label === 'Total Balance' ||
                stat.label === 'Total Outstanding' ||
                stat.label === 'MTD Amount' ||
                stat.label === 'Average Balance' ||
                stat.label === 'Total Assets' ||
                stat.label === 'Total Liabilities' ||
                stat.label.includes('Payable');
              const displayValue = isMonetary && typeof value === 'number' ? `$${value.toFixed(2)}` : value;

              const gridSize =
                config.statCards.length === 5
                  ? { xs: 12, sm: 6, md: 2.4, lg: 2.4 } // 5 columns for accounts
                  : { xs: 12, sm: 6, md: 3, lg: 3 }; // 4 columns for others

              return (
                <Grid key={index} size={gridSize}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" sx={{ fontWeight: 300 }}>
                      {statsLoading ? '-' : displayValue}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {stat.label}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {!hideFilters && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, mt: 3, alignItems: 'center' }}>
          <AllyviaSearchAutocomplete
            placeholder={`Search ${config.name.toLowerCase()}s...`}
            value={searchTerm}
            onChange={setSearchTerm}
            onSearch={handleSearch}
            height={40}
            width="400px"
            fetchSuggestions={fetchSuggestions}
          />

          {'dateRange' in config.filters && config.filters.dateRange && (
            <AllyviaFilterDatePicker
              value={dateRange}
              onChange={(value) => {
                setDateRange(value);
                if (value) {
                  handleFilterChange('dateRange', {
                    start: value.start?.toString(),
                    end: value.end?.toString()
                  });
                } else {
                  handleFilterChange('dateRange', null);
                }
              }}
              height={40}
              placeholder="mm/dd/yyyy - mm/dd/yyyy"
            />
          )}

          {'status' in config.filters && config.filters.status && (
            <AllyviaFilterSelect
              value={localFilters.status || 'all'}
              onChange={(e: SelectChangeEvent) => handleFilterChange('status', e.target.value)}
              height={40}
              placeholder="All Status"
              options={[
                { value: 'all', label: 'All Status' },
                ...((config.filters as any).status.options?.map((option: string) => ({
                  value: option,
                  label: option.charAt(0).toUpperCase() + option.slice(1)
                })) || [])
              ]}
            />
          )}

          {'due' in config.filters && config.filters.due && (
            <AllyviaFilterSelect
              value={localFilters.due || 'all'}
              onChange={(e: SelectChangeEvent) => handleFilterChange('due', e.target.value)}
              height={40}
              width={140}
              placeholder="Due"
              options={[
                { value: 'all', label: 'All Due Dates' },
                { value: 'today', label: 'Due Today' },
                { value: 'this_week', label: 'Due This Week' },
                { value: 'this_month', label: 'Due This Month' },
                { value: 'overdue', label: 'Overdue' }
              ]}
            />
          )}

          {'amount' in config.filters && config.filters.amount && (
            <AllyviaFilterSelect
              value={localFilters.amountRange || 'all'}
              onChange={(e: SelectChangeEvent) => handleFilterChange('amountRange', e.target.value)}
              height={40}
              width={175}
              placeholder="Amount Range"
              options={[
                { value: 'all', label: 'All Amounts' },
                { value: '0-1000', label: '$0 - $1,000' },
                { value: '1000-5000', label: '$1,000 - $5,000' },
                { value: '5000-10000', label: '$5,000 - $10,000' },
                { value: '10000+', label: '$10,000+' }
              ]}
            />
          )}

          {'balance' in config.filters && config.filters.balance && (
            <AllyviaFilterSelect
              value={localFilters.balance || 'all'}
              onChange={(e: SelectChangeEvent) => handleFilterChange('balance', e.target.value)}
              height={40}
              placeholder="Balance"
              options={[
                { value: 'all', label: 'All Balances' },
                ...((config.filters as any).balance.options?.map((option: string) => ({
                  value: option,
                  label:
                    option === 'has_balance'
                      ? 'Has Balance'
                      : option === 'zero'
                        ? 'Zero Balance'
                        : option === 'credit'
                          ? 'Credit Balance'
                          : option === 'we_owe'
                            ? 'We Owe'
                            : option === 'owes_us'
                              ? 'Owes Us'
                              : option
                })) || [])
              ]}
            />
          )}

          {'state' in config.filters && config.filters.state ? (
            <AllyviaFilterSelect
              value={localFilters.state || 'all'}
              onChange={(e: SelectChangeEvent) => handleFilterChange('state', e.target.value)}
              height={40}
              placeholder="State"
              options={[{ value: 'all', label: 'All States' }]}
            />
          ) : null}

          {'is1099' in config.filters && config.filters.is1099 && (
            <AllyviaFilterSelect
              value={localFilters.is1099 || 'all'}
              onChange={(e: SelectChangeEvent) => handleFilterChange('is1099', e.target.value)}
              height={40}
              width={150}
              placeholder="1099 Status"
              options={[
                { value: 'all', label: 'All 1099 Status' },
                ...((config.filters as any).is1099.options?.map((option: string) => ({
                  value: option,
                  label: option === 'true' ? '1099 Vendor' : option === 'false' ? 'Non-1099 Vendor' : option
                })) || [])
              ]}
            />
          )}

          {'paymentType' in config.filters && config.filters.paymentType && (
            <AllyviaFilterSelect
              value={localFilters.paymentType || 'all'}
              onChange={(e: SelectChangeEvent) => handleFilterChange('paymentType', e.target.value)}
              height={40}
              placeholder="Payment Type"
              options={[
                { value: 'all', label: 'All Types' },
                ...((config.filters as any).paymentType.options?.map((option: string) => ({
                  value: option,
                  label: option
                })) || [])
              ]}
            />
          )}

          {'paymentMethod' in config.filters && config.filters.paymentMethod && (
            <AllyviaFilterSelect
              value={localFilters.paymentMethod || 'all'}
              onChange={(e: SelectChangeEvent) => handleFilterChange('paymentMethod', e.target.value)}
              height={40}
              placeholder="Payment Method"
              options={[
                { value: 'all', label: 'All Methods' },
                ...((config.filters as any).paymentMethod.options?.map((option: string) => ({
                  value: option,
                  label: option
                })) || [])
              ]}
            />
          )}

          {'appliedStatus' in config.filters && config.filters.appliedStatus && (
            <AllyviaFilterSelect
              value={localFilters.appliedStatus || 'all'}
              onChange={(e: SelectChangeEvent) => handleFilterChange('appliedStatus', e.target.value)}
              height={40}
              width={130}
              placeholder="Applied Status"
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'fully_applied', label: 'Fully Applied' },
                { value: 'has_unapplied', label: 'Has Unapplied' }
              ]}
            />
          )}

          {'amountRange' in config.filters && config.filters.amountRange && (
            <AllyviaFilterSelect
              value={localFilters.amountRange || 'all'}
              onChange={(e: SelectChangeEvent) => handleFilterChange('amountRange', e.target.value)}
              height={40}
              placeholder="Amount Range"
              options={[
                { value: 'all', label: 'All Amounts' },
                { value: '0-1000', label: '$0 - $1,000' },
                { value: '1000-5000', label: '$1,000 - $5,000' },
                { value: '5000-10000', label: '$5,000 - $10,000' },
                { value: '10000+', label: '$10,000+' }
              ]}
            />
          )}

          <AllyviaFilterButton label="Clear" onClick={handleClearFilters} height={40} variant="outlined" color="primary" />
        </Box>
      )}

      {loading && items.length === 0 ? (
        <TableSkeleton rows={pageSize} columns={config.columns.length} />
      ) : (
        <TableContainer component={Paper} sx={{ position: 'relative' }}>
          {loading && items.length > 0 && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                zIndex: 1
              }}
            >
              <CircularProgress />
            </Box>
          )}
          <Table>
            <TableHead>
              <TableRow>
                {config.columns.map((column) => (
                  <TableCell key={column.id} align={(column as ColumnConfig).align ?? 'left'}>
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={config.columns.length} align="center">
                    <Typography variant="body1" color="textSecondary" sx={{ py: 3 }}>
                      {pagination?.total_items === 0
                        ? `No ${config.name.toLowerCase()} data available`
                        : `No ${config.name.toLowerCase()}s match your filters`}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow
                    hover
                    key={row[config.idField]}
                    onClick={() => onRowClick && onRowClick(row)}
                    sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {config.columns.map((column) => (
                      <TableCell key={column.id} align={(column as ColumnConfig).align ?? 'left'}>
                        {formatCellValue(column, row[column.id])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <AllyviaPagination
        currentPage={page}
        totalPages={pagination?.total_pages || 1}
        totalItems={pagination?.total_items || 0}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={[10, 20, 50, 100]}
      />
    </Box>
  );
};
