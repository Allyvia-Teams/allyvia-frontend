import React, { useState, useMemo } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Box,
  Chip,
  Typography,
  useTheme,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Grid,
  InputAdornment,
  IconButton,
  Tooltip
} from '@mui/material';
import { Search, Clear, FilterList, Tune } from '@mui/icons-material';
import MainCard from 'ui-component/cards/MainCard';

// Column configuration types for different data types
export interface TableColumnConfig {
  field: string;
  headerName: string;
  width?: number;
  type?: string;
  renderCell?: (params: any) => React.ReactNode;
  valueFormatter?: (params: any) => string;
}

export interface AllyviaPaginatedTableProps {
  rows: any[];
  columns: TableColumnConfig[];
  showPagination?: boolean;
  height?: number | string;
  getRowClassName?: (params: any) => string;
  customStyles?: any;
  showFilters?: boolean;
  filterFields?: string[];
  title?: string;
}

export function AllyviaPaginatedTable({
  rows,
  columns,
  showPagination = true,
  height = 500,
  getRowClassName,
  customStyles,
  showFilters = false,
  filterFields = [],
  title
}: AllyviaPaginatedTableProps) {
  const theme = useTheme();

  // Filter state
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  // Filter the rows based on search term and filters
  const filteredRows = useMemo(() => {
    let filtered = rows;

    // Apply search term across all fields
    if (searchTerm) {
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply individual field filters
    Object.entries(filters).forEach(([field, value]) => {
      if (value) {
        filtered = filtered.filter((row) =>
          String(row[field] || '')
            .toLowerCase()
            .includes(value.toLowerCase())
        );
      }
    });

    return filtered;
  }, [rows, searchTerm, filters]);

  // Capitalize text values for better display
  const capitalizeValue = (value: string) => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  };

  // Get unique values for filter dropdowns
  const getUniqueValues = (field: string) => {
    const values = new Set(rows.map((row) => row[field]).filter(Boolean));
    return Array.from(values).sort();
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  // Convert our column config to MUI DataGrid columns
  const gridColumns: GridColDef[] = columns.map((col) => ({
    field: col.field,
    headerName: col.headerName,
    width: col.width || 150,
    type: (col.type as any) || 'string',
    renderCell: col.renderCell,
    valueFormatter:
      col.valueFormatter ||
      ((params: any) => {
        // Default formatter: capitalize text values for better display
        if (params && params.value && typeof params.value === 'string') {
          return capitalizeValue(params.value);
        }
        return params?.value || '';
      })
  }));

  return (
    <MainCard content={false}>
      {/* Compact Filter Section */}
      {showFilters && (
        <Box sx={{ p: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Search Bar */}
          <Box sx={{ flex: 1, maxWidth: 300 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search across all fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <Clear fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Box>

          {/* Filter Button */}
          <Tooltip
            title={`Advanced Filters${Object.keys(filters).some((key) => filters[key]) ? ` (${Object.keys(filters).filter((key) => filters[key]).length} active)` : ''}`}
          >
            <IconButton
              onClick={() => setFilterPanelOpen(!filterPanelOpen)}
              color={Object.keys(filters).some((key) => filters[key]) ? 'primary' : 'default'}
              size="small"
              sx={{
                position: 'relative',
                backgroundColor: Object.keys(filters).some((key) => filters[key]) ? theme.palette.primary.main : 'transparent',
                color: Object.keys(filters).some((key) => filters[key]) ? theme.palette.primary.contrastText : 'inherit',
                '&:hover': {
                  backgroundColor: Object.keys(filters).some((key) => filters[key])
                    ? theme.palette.primary.dark
                    : theme.palette.action.hover
                }
              }}
            >
              <Tune />
              {Object.keys(filters).filter((key) => filters[key]).length > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: theme.palette.error.main,
                    color: theme.palette.error.contrastText,
                    borderRadius: '50%',
                    width: 16,
                    height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}
                >
                  {Object.keys(filters).filter((key) => filters[key]).length}
                </Box>
              )}
            </IconButton>
          </Tooltip>

          {/* Clear Filters Button */}
          {(Object.keys(filters).some((key) => filters[key]) || searchTerm) && (
            <Tooltip title="Clear all filters">
              <IconButton onClick={clearFilters} color="error" size="small">
                <Clear />
              </IconButton>
            </Tooltip>
          )}

          {/* Results Count */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
            <FilterList fontSize="small" color="action" />
            <Typography variant="caption" color="textSecondary">
              {filteredRows.length} of {rows.length}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Expandable Filter Panel */}
      {showFilters && filterPanelOpen && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper'
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Tune fontSize="small" />
            Advanced Filters
          </Typography>

          <Grid container spacing={2}>
            {filterFields.map((field) => {
              const column = columns.find((col) => col.field === field);
              if (!column) return null;

              const uniqueValues = getUniqueValues(field);

              return (
                <Grid key={field} size={{ xs: 12, md: 6 }}>
                  <Box>
                    <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'block' }}>
                      {column.headerName}
                    </Typography>
                    <FormControl fullWidth size="small" variant="outlined">
                      <Select
                        value={filters[field] || ''}
                        onChange={(e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }))}
                        displayEmpty
                        MenuProps={{
                          PaperProps: {
                            style: {
                              maxHeight: 200
                            }
                          }
                        }}
                        sx={{
                          '& .MuiSelect-select': {
                            paddingTop: '8px',
                            paddingBottom: '8px'
                          }
                        }}
                        renderValue={(value) => {
                          if (!value) {
                            return <em>All {column.headerName}</em>;
                          }
                          return value;
                        }}
                      >
                        <MenuItem value="">
                          <em>All {column.headerName}</em>
                        </MenuItem>
                        {uniqueValues
                          .filter((value) => value !== filters[field])
                          .map((value) => (
                            <MenuItem key={value} value={value}>
                              {capitalizeValue(value)}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>
              );
            })}
          </Grid>

          {/* Active Filters Display */}
          {Object.keys(filters).filter((key) => filters[key]).length > 0 && (
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                Active Filters:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(filters)
                  .filter(([, value]) => value)
                  .map(([field, value]) => {
                    const column = columns.find((col) => col.field === field);
                    return (
                      <Chip
                        key={field}
                        label={`${column?.headerName || field}: ${capitalizeValue(value)}`}
                        size="small"
                        onDelete={() => setFilters((prev) => ({ ...prev, [field]: '' }))}
                        color="primary"
                        variant="outlined"
                      />
                    );
                  })}
              </Box>
            </Box>
          )}

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="textSecondary">
              {Object.keys(filters).filter((key) => filters[key]).length} active filters
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton size="small" onClick={clearFilters} color="error">
                <Clear />
              </IconButton>
              <IconButton size="small" onClick={() => setFilterPanelOpen(false)} color="primary">
                Close
              </IconButton>
            </Box>
          </Box>
        </Box>
      )}

      <Box sx={{ height: height === 500 ? 'auto' : height, width: '100%' }}>
        <DataGrid
          rows={filteredRows}
          columns={gridColumns}
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
          getRowClassName={getRowClassName}
          autoHeight={height === 500}
          rowHeight={52}
          sx={{
            border: 2,
            borderColor: theme.palette.divider,
            '& .MuiDataGrid-virtualScroller': {
              overflow: 'auto !important',
              height: 'auto !important'
            },
            '& .MuiDataGrid-virtualScrollerContent': {
              height: 'auto !important',
              minHeight: 'auto !important'
            },
            '& .MuiDataGrid-virtualScrollerRenderZone': {
              height: 'auto !important'
            },
            '& .MuiDataGrid-cell': {
              borderBottom: `1px solid ${theme.palette.divider}`
            },
            '& .MuiDataGrid-columnHeader': {
              backgroundColor: theme.palette.primary.main + '10',
              fontWeight: 'bold',
              borderBottom: `2px solid ${theme.palette.divider}`
            },
            ...customStyles
          }}
        />
      </Box>
    </MainCard>
  );
}

// Predefined column configurations for common finance data types
export const FINANCE_COLUMN_CONFIGS = {
  // Invoice columns
  invoices: [
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
        const getStatusColor = (status: string) => {
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
        const getDaysPastDueColor = (days: number) => {
          if (days <= 30) return 'warning.main';
          if (days <= 60) return 'error.main';
          return 'error.dark';
        };
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
  ],

  // Expense columns
  expenses: [
    {
      field: 'id',
      headerName: 'ID',
      width: 80,
      renderCell: (params: any) => (
        <Typography variant="body2" fontWeight="medium" color="primary">
          {params.value}
        </Typography>
      )
    },
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
      renderCell: (params: any) => <Chip size="small" label={params.value} color="primary" variant="outlined" />
    },
    {
      field: 'vendor',
      headerName: 'Vendor',
      width: 180,
      renderCell: (params: any) => (
        <Typography variant="body2" fontWeight="medium">
          {params.value}
        </Typography>
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
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params: any) => {
        const getStatusColor = (status: string) => {
          switch (status) {
            case 'paid':
              return 'success';
            case 'pending':
              return 'warning';
            default:
              return 'default';
          }
        };
        return (
          <Chip
            size="small"
            label={params.value?.charAt(0).toUpperCase() + params.value?.slice(1) || '—'}
            color={getStatusColor(params.value) as any}
            variant="outlined"
          />
        );
      }
    }
  ],

  // Ledger columns
  ledger: [
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
    {
      field: 'account_type',
      headerName: 'Type',
      width: 140,
      renderCell: (params: any) => {
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
        return (
          <Chip
            size="small"
            label={params.value.replace('_', ' ').toUpperCase()}
            color={getAccountTypeColor(params.value) as any}
            variant="outlined"
          />
        );
      }
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 150
    },
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
  ]
};

// Helper function to get row class names for styling
export const getFinanceRowClassName = (dataType: 'invoices' | 'expenses' | 'ledger') => {
  switch (dataType) {
    case 'invoices':
      return (params: any) => {
        if (params.row.days_past_due && params.row.days_past_due > 0) {
          return 'overdue-row';
        }
        return '';
      };
    case 'expenses':
      return (params: any) => {
        if (params.row.status === 'pending') {
          return 'pending-row';
        }
        return '';
      };
    case 'ledger':
      return (params: any) => {
        if (params.row.debit > 0) {
          return 'debit-row';
        }
        if (params.row.credit > 0) {
          return 'credit-row';
        }
        return '';
      };
    default:
      return () => '';
  }
};

// Helper function to get custom styles for different data types
export const getFinanceCustomStyles = (dataType: 'invoices' | 'expenses' | 'ledger') => {
  const baseStyles = {
    '& .MuiDataGrid-cell': {
      borderBottom: '1px solid rgba(224, 224, 224, 1)'
    },
    '& .MuiDataGrid-columnHeader': {
      backgroundColor: 'rgba(25, 118, 210, 0.1)',
      fontWeight: 'bold',
      borderBottom: '2px solid rgba(224, 224, 224, 1)'
    }
  };

  switch (dataType) {
    case 'invoices':
      return {
        ...baseStyles,
        '& .overdue-row': {
          backgroundColor: 'rgba(244, 67, 54, 0.05)'
        }
      };
    case 'expenses':
      return {
        ...baseStyles,
        '& .pending-row': {
          backgroundColor: 'rgba(255, 152, 0, 0.05)'
        }
      };
    case 'ledger':
      return {
        ...baseStyles,
        '& .debit-row': {
          backgroundColor: 'rgba(244, 67, 54, 0.05)'
        },
        '& .credit-row': {
          backgroundColor: 'rgba(76, 175, 80, 0.05)'
        }
      };
    default:
      return baseStyles;
  }
};
