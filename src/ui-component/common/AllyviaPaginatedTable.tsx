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
  Tooltip,
  Checkbox,
  Popover,
  Button
} from '@mui/material';
import { Search, Clear, FilterList, Tune, ViewColumn } from '@mui/icons-material';
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
  showColumnSelector?: boolean;
  onRowClick?: (params: any) => void;
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
  title,
  showColumnSelector = false,
  onRowClick
}: AllyviaPaginatedTableProps) {
  const theme = useTheme();

  // Generate unique storage key based on table title and user profile
  const getStorageKey = (suffix: string) => {
    const tableKey = title ? title.toLowerCase().replace(/\s+/g, '_') : 'default_table';
    return `allyvia_table_${tableKey}_${suffix}`;
  };

  // (localStorage helpers kept minimal; inline usage below)

  // Filter state
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  // Column selector state with local storage
  const [columnSelectorAnchor, setColumnSelectorAnchor] = useState<null | HTMLElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    // Initialize with saved columns or default to all columns
    const savedColumns = localStorage.getItem(getStorageKey('visible_columns'));
    if (savedColumns) {
      try {
        const parsedColumns = JSON.parse(savedColumns);
        // Validate that saved columns still exist in current columns
        const validColumns = parsedColumns.filter((col: string) => columns.some((c) => c.field === col));
        return validColumns.length > 0 ? validColumns : columns.map((col) => col.field);
      } catch (error) {
        console.warn('Failed to parse saved columns:', error);
        return columns.map((col) => col.field);
      }
    }
    return columns.map((col) => col.field);
  });

  // Save table title to local storage when component mounts or title changes
  React.useEffect(() => {
    if (title) {
      localStorage.setItem(getStorageKey('title'), title);
    }
  }, [title]);

  // Update visible columns when columns prop changes (e.g., new data loaded)
  React.useEffect(() => {
    const savedColumns = localStorage.getItem(getStorageKey('visible_columns'));
    if (savedColumns) {
      try {
        const parsedColumns = JSON.parse(savedColumns);
        // Validate that saved columns still exist in current columns
        const validColumns = parsedColumns.filter((col: string) => columns.some((c) => c.field === col));
        if (validColumns.length > 0 && validColumns.length !== visibleColumns.length) {
          setVisibleColumns(validColumns);
        }
      } catch (error) {
        console.warn('Failed to parse saved columns on columns change:', error);
      }
    }
  }, [columns]);

  // Normalize and filter the rows based on search term and filters
  const filteredRows = useMemo(() => {
    // First, normalize the data to handle different API response formats
    const normalizedRows = rows.map((row, index) => {
      const normalizedRow = { ...row };

      // Ensure all rows have unique IDs
      if (!normalizedRow.id) {
        normalizedRow.id = `row-${index}`;
      }

      // Handle expense data field name variations
      if ('expense_name' in normalizedRow && !('description' in normalizedRow)) {
        normalizedRow.description = normalizedRow.expense_name;
        delete normalizedRow.expense_name;
      }

      return normalizedRow;
    });

    let filtered = normalizedRows;

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

  // Capitalize text values for better display (coerce non-strings safely)
  const capitalizeValue = (value: any) => {
    if (value == null) return '';
    const str = String(value);
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
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

  // Column selector functions
  const handleColumnSelectorOpen = (event: React.MouseEvent<HTMLElement>) => {
    setColumnSelectorAnchor(event.currentTarget);
  };

  const handleColumnSelectorClose = () => {
    setColumnSelectorAnchor(null);
  };

  const handleColumnToggle = (field: string) => {
    setVisibleColumns((prev) => {
      const newColumns = prev.includes(field) ? prev.filter((col) => col !== field) : [...prev, field];
      // Save to local storage
      localStorage.setItem(getStorageKey('visible_columns'), JSON.stringify(newColumns));
      return newColumns;
    });
  };

  const handleSelectAllColumns = () => {
    const allColumns = columns.map((col) => col.field);
    setVisibleColumns(allColumns);
    // Save to local storage
    localStorage.setItem(getStorageKey('visible_columns'), JSON.stringify(allColumns));
  };

  const handleDeselectAllColumns = () => {
    setVisibleColumns([]);
    // Save to local storage
    localStorage.setItem(getStorageKey('visible_columns'), JSON.stringify([]));
  };

  // Convert our column config to MUI DataGrid columns (only visible columns)
  const gridColumns: GridColDef[] = columns
    .filter((col) => visibleColumns.includes(col.field))
    .map((col) => ({
      field: col.field,
      headerName: col.headerName,
      ...(col.width && { width: col.width }), // Only set width if explicitly provided
      minWidth: col.width || 100, // Set minimum width to prevent cramped headers
      flex: col.width ? 0 : 1, // Use flex for auto-width columns
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

          {/* Simple Column Selector Button */}
          {showColumnSelector && (
            <Tooltip title={`Column Visibility (${visibleColumns.length}/${columns.length})`}>
              <IconButton
                onClick={handleColumnSelectorOpen}
                size="small"
                sx={{
                  position: 'relative',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover
                  }
                }}
              >
                <ViewColumn />
                {visibleColumns.length < columns.length && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      backgroundColor: theme.palette.warning.main,
                      color: theme.palette.warning.contrastText,
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
                    {columns.length - visibleColumns.length}
                  </Box>
                )}
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
                    paginationModel: { page: 0, pageSize: 10 }
                  }
                }
              : {}
          }
          pagination={showPagination ? true : undefined}
          disableRowSelectionOnClick
          getRowId={(row) => row.id || `fallback-${Math.random()}`}
          getRowClassName={getRowClassName}
          autoHeight={height === 500}
          rowHeight={52}
          onRowClick={onRowClick}
          sx={{
            border: 1,
            borderColor: theme.palette.divider,
            width: '100%',
            '& .MuiDataGrid-footerContainer': {
              overflow: 'hidden',
              minHeight: 40,
              height: 40
            },
            '& .MuiTablePagination-root': {
              overflow: 'hidden',
              minHeight: 40,
              height: 40
            },
            '& .MuiTablePagination-toolbar': {
              minHeight: 40,
              height: 40,
              paddingTop: 0,
              paddingBottom: 0
            },
            '& .MuiDataGrid-cell': {
              borderBottom: `1px solid ${theme.palette.divider}`
            },
            '& .MuiDataGrid-columnHeader': {
              backgroundColor: theme.palette.primary.main + '10',
              fontWeight: 'bold',
              borderBottom: `2px solid ${theme.palette.divider}`
            },
            '& .MuiDataGrid-row': {
              cursor: onRowClick ? 'pointer' : 'default',
              '&:hover': {
                backgroundColor: onRowClick ? theme.palette.action.hover : 'inherit'
              }
            },
            ...customStyles
          }}
        />
      </Box>

      {/* Simplified Column Selector Popover */}
      <Popover
        open={Boolean(columnSelectorAnchor)}
        anchorEl={columnSelectorAnchor}
        onClose={handleColumnSelectorClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left'
        }}
        PaperProps={{
          sx: {
            minWidth: 250,
            maxHeight: 350,
            overflow: 'hidden',
            borderRadius: 2,
            boxShadow: theme.shadows[4]
          }
        }}
      >
        <Box sx={{ p: 0 }}>
          {/* Inline Header with Action */}
          <Box sx={{ p: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Columns : {visibleColumns.length}/{columns.length}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Checkbox
                  checked={visibleColumns.length === columns.length}
                  indeterminate={visibleColumns.length > 0 && visibleColumns.length < columns.length}
                  onChange={() => {
                    if (visibleColumns.length === columns.length) {
                      handleDeselectAllColumns();
                    } else {
                      handleSelectAllColumns();
                    }
                  }}
                  size="small"
                  sx={{
                    '&.Mui-checked': {
                      color: theme.palette.primary.main
                    }
                  }}
                />
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                  All
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Column List */}
          <Box
            sx={{
              maxHeight: 200,
              overflow: 'auto',
              '&::-webkit-scrollbar': {
                width: '4px'
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: theme.palette.grey[100]
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: theme.palette.grey[400],
                borderRadius: '2px'
              }
            }}
          >
            {columns.map((column, index) => (
              <Box
                key={column.field}
                onClick={() => handleColumnToggle(column.field)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 1,
                  borderBottom: index < columns.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover
                  },
                  transition: 'background-color 0.2s ease'
                }}
              >
                <Checkbox
                  checked={visibleColumns.includes(column.field)}
                  onChange={() => handleColumnToggle(column.field)}
                  size="small"
                  sx={{
                    '&.Mui-checked': {
                      color: theme.palette.primary.main
                    }
                  }}
                />
                <Typography variant="body2" sx={{ ml: 1, flex: 1 }}>
                  {column.headerName}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Simple Footer */}
          <Box
            sx={{
              p: 1.5,
              borderTop: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.grey[50]
            }}
          >
            <Button
              size="small"
              variant="contained"
              onClick={handleColumnSelectorClose}
              sx={{
                textTransform: 'none',
                fontWeight: 'medium',
                width: '100%'
              }}
            >
              Done
            </Button>
          </Box>
        </Box>
      </Popover>
    </MainCard>
  );
}

// Predefined column configurations for common finance data types
export const FINANCE_COLUMN_CONFIGS = {
  // Invoice columns
  invoices: [
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
      // Allyvia brand blue (#2f6fd4) at ~10% opacity — was the pre-rebrand
      // default MUI blue (#1976d2), now matches the live header style above.
      backgroundColor: 'rgba(47, 111, 212, 0.1)',
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
