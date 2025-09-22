# FS-019: Analytics Tab Implementation Guide

## Overview

This document provides a clean implementation guide for creating a production-ready analytics dashboard following the exact patterns used in inventory and employee modules. We'll use Redux thunks, clean API clients, and structured component organization.

## Current State Analysis

### ✅ **What's Already Implemented:**

1. **Route Structure**: `/analytics` route exists in `MainRoutes.tsx`
2. **Basic Page Structure**: `src/views/analytics/index.tsx` with tab-based layout
3. **Chart Infrastructure**: ApexCharts integration with theme support
4. **UI Components**: Date range picker, filter components, KPI cards
5. **Project Patterns**: Well-established Redux thunk patterns in inventory/employee modules

### ❌ **What Needs to be Implemented:**

1. **Remove Tab Structure**: Convert from 5 tabs to single analytics page
2. **Create Clean API Client**: Direct API calls (no mock fallbacks)
3. **Redux Slice**: Async thunks following inventory/employee patterns
4. **Component Structure**: Organized like inventory module
5. **Focus on Ops/Finance**: Remove CRM, Employee, Inventory analytics
6. **Add Navigation**: Add Analytics to main navigation menu

## Backend Field Mapping

### ✅ **Actual Backend Field Names:**

Based on the backend model verification, here are the correct field names that will be returned by the backend:

#### Revenue Data

- **QBInvoice**: `total_amount`, `date`, `status`, `balance`, `customer_name`, `currency`
- **QBPayment**: `amount`, `payment_date`, `customer_name`, `payment_method`, `currency_ref`

#### Expense Data

- **QBBill**: `amount`, `bill_date`, `vendor_name`, `balance`
- **QBPurchase**: `amount`, `purchase_date`, `entity_name`, `payment_type`
- **QBBillPayment**: `total_amount`, `payment_date`, `vendor_ref_name`, `payment_type`

#### Inventory Data

- **InventoryItem**: `quantity_on_hand`, `unit_price`, `cost_price`, `reorder_point`, `category`, `item_type`, `is_active`

#### Time Data

- **TimeEntry**: `clock_in`, `clock_out`, `duration_seconds`, `employee`

## Implementation Plan

### Phase 1: Backend API Requirements

#### Required Backend Endpoints

The backend team needs to implement these 7 endpoints following existing patterns:

```typescript
// Base URL: /analytics/ (company-scoped, all GET)
// Query params: company_id, from, to, provider?, location_id?

GET /analytics/summary/
GET /analytics/revenue-series/
GET /analytics/expense-breakdown/
GET /analytics/payments-split/
GET /analytics/top-items/
GET /analytics/low-stock/
GET /analytics/time-utilization/
```

### Phase 2: Frontend Implementation (Following Existing Patterns)

#### 2.1 Types Definition (Updated for Backend Field Names)

**File**: `src/types/analytics.ts`

```typescript
// Updated to match actual backend field names
export interface AnalyticsSummary {
  total_revenue: number; // Backend: total_amount from QBInvoice (status='paid')
  payments_count: number; // Backend: count of QBPayment records
  avg_ticket: number; // Backend: average total_amount from QBInvoice
  expenses: number; // Backend: sum of QBBill.amount + QBPurchase.amount
  net: number; // Backend: total_revenue - expenses
  inventory_value: number; // Backend: sum of quantity_on_hand * unit_price from InventoryItem
  currency: string; // Backend: 'USD' (default) or from company settings
}

export interface RevenueSeriesPoint {
  date: string; // Backend: date field from QBInvoice
  amount: number; // Backend: total_amount from QBInvoice
}

export interface ExpenseBreakdownItem {
  category: string; // Backend: derived from account_name or vendor_name
  amount: number; // Backend: amount from QBBill/QBPurchase
}

export interface PaymentSplitItem {
  provider: string; // Backend: 'quickbooks' or 'square'
  amount: number; // Backend: amount from QBPayment or 0 for Square
}

export interface TopItem {
  item_id: string; // Backend: id from InventoryItem
  name: string; // Backend: name from InventoryItem
  qty: number; // Backend: quantity_on_hand from InventoryItem
  amount: number; // Backend: quantity_on_hand * unit_price (stock_value)
}

export interface LowStockItem {
  item_id: string; // Backend: id from InventoryItem
  name: string; // Backend: name from InventoryItem
  on_hand: number; // Backend: quantity_on_hand from InventoryItem
  reorder_point: number; // Backend: reorder_point from InventoryItem
}

export interface TimeUtilizationPoint {
  week_start: string; // Backend: week_start date (YYYY-MM-DD)
  hours: number; // Backend: sum of duration_seconds / 3600
}

export interface AnalyticsParams {
  from_date?: string; // Backend expects 'from' parameter
  to_date?: string; // Backend expects 'to' parameter
  provider?: string; // Backend expects 'provider' parameter
  location_id?: string; // Backend expects 'location_id' parameter
}
```

#### 2.2 API Client (Clean - No Mock Fallbacks)

**File**: `src/api/analytics.api.ts`

```typescript
import axiosServices from 'utils/axios';
import {
  AnalyticsSummary,
  RevenueSeriesPoint,
  ExpenseBreakdownItem,
  PaymentSplitItem,
  TopItem,
  LowStockItem,
  TimeUtilizationPoint,
  AnalyticsParams
} from 'types/analytics';

const BASE_URL = '/analytics';

// Analytics Summary
export const getAnalyticsSummary = async (params?: AnalyticsParams): Promise<AnalyticsSummary> => {
  const queryParams = new URLSearchParams();
  if (params?.from_date) queryParams.append('from', params.from_date);
  if (params?.to_date) queryParams.append('to', params.to_date);
  if (params?.provider) queryParams.append('provider', params.provider);
  if (params?.location_id) queryParams.append('location_id', params.location_id);

  const response = await axiosServices.get(`${BASE_URL}/summary/?${queryParams.toString()}`);
  return response.data;
};

// Revenue Series
export const getRevenueSeries = async (params?: AnalyticsParams): Promise<RevenueSeriesPoint[]> => {
  const queryParams = new URLSearchParams();
  if (params?.from_date) queryParams.append('from', params.from_date);
  if (params?.to_date) queryParams.append('to', params.to_date);
  if (params?.provider) queryParams.append('provider', params.provider);
  if (params?.location_id) queryParams.append('location_id', params.location_id);

  const response = await axiosServices.get(`${BASE_URL}/revenue-series/?${queryParams.toString()}`);
  return response.data;
};

// Expense Breakdown
export const getExpenseBreakdown = async (params?: AnalyticsParams): Promise<ExpenseBreakdownItem[]> => {
  const queryParams = new URLSearchParams();
  if (params?.from_date) queryParams.append('from', params.from_date);
  if (params?.to_date) queryParams.append('to', params.to_date);
  if (params?.provider) queryParams.append('provider', params.provider);
  if (params?.location_id) queryParams.append('location_id', params.location_id);

  const response = await axiosServices.get(`${BASE_URL}/expense-breakdown/?${queryParams.toString()}`);
  return response.data;
};

// Payments Split
export const getPaymentsSplit = async (params?: AnalyticsParams): Promise<PaymentSplitItem[]> => {
  const queryParams = new URLSearchParams();
  if (params?.from_date) queryParams.append('from', params.from_date);
  if (params?.to_date) queryParams.append('to', params.to_date);
  if (params?.provider) queryParams.append('provider', params.provider);
  if (params?.location_id) queryParams.append('location_id', params.location_id);

  const response = await axiosServices.get(`${BASE_URL}/payments-split/?${queryParams.toString()}`);
  return response.data;
};

// Top Items
export const getTopItems = async (params?: AnalyticsParams): Promise<TopItem[]> => {
  const queryParams = new URLSearchParams();
  if (params?.from_date) queryParams.append('from', params.from_date);
  if (params?.to_date) queryParams.append('to', params.to_date);
  if (params?.provider) queryParams.append('provider', params.provider);
  if (params?.location_id) queryParams.append('location_id', params.location_id);

  const response = await axiosServices.get(`${BASE_URL}/top-items/?${queryParams.toString()}`);
  return response.data;
};

// Low Stock
export const getLowStock = async (params?: AnalyticsParams): Promise<LowStockItem[]> => {
  const queryParams = new URLSearchParams();
  if (params?.from_date) queryParams.append('from', params.from_date);
  if (params?.to_date) queryParams.append('to', params.to_date);
  if (params?.provider) queryParams.append('provider', params.provider);
  if (params?.location_id) queryParams.append('location_id', params.location_id);

  const response = await axiosServices.get(`${BASE_URL}/low-stock/?${queryParams.toString()}`);
  return response.data;
};

// Time Utilization
export const getTimeUtilization = async (params?: AnalyticsParams): Promise<TimeUtilizationPoint[]> => {
  const queryParams = new URLSearchParams();
  if (params?.from_date) queryParams.append('from', params.from_date);
  if (params?.to_date) queryParams.append('to', params.to_date);
  if (params?.provider) queryParams.append('provider', params.provider);
  if (params?.location_id) queryParams.append('location_id', params.location_id);

  const response = await axiosServices.get(`${BASE_URL}/time-utilization/?${queryParams.toString()}`);
  return response.data;
};
```

#### 2.3 Redux Slice (Following Inventory Pattern)

**File**: `src/store/slices/analytics.ts`

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  getAnalyticsSummary,
  getRevenueSeries,
  getExpenseBreakdown,
  getPaymentsSplit,
  getTopItems,
  getLowStock,
  getTimeUtilization
} from 'api/analytics.api';
import {
  AnalyticsSummary,
  RevenueSeriesPoint,
  ExpenseBreakdownItem,
  PaymentSplitItem,
  TopItem,
  LowStockItem,
  TimeUtilizationPoint,
  AnalyticsParams
} from 'types/analytics';

// Async Thunks
export const fetchAnalyticsSummary = createAsyncThunk('analytics/fetchSummary', async (params?: AnalyticsParams) => {
  const response = await getAnalyticsSummary(params);
  return response;
});

export const fetchRevenueSeries = createAsyncThunk('analytics/fetchRevenueSeries', async (params?: AnalyticsParams) => {
  const response = await getRevenueSeries(params);
  return response;
});

export const fetchExpenseBreakdown = createAsyncThunk('analytics/fetchExpenseBreakdown', async (params?: AnalyticsParams) => {
  const response = await getExpenseBreakdown(params);
  return response;
});

export const fetchPaymentsSplit = createAsyncThunk('analytics/fetchPaymentsSplit', async (params?: AnalyticsParams) => {
  const response = await getPaymentsSplit(params);
  return response;
});

export const fetchTopItems = createAsyncThunk('analytics/fetchTopItems', async (params?: AnalyticsParams) => {
  const response = await getTopItems(params);
  return response;
});

export const fetchLowStock = createAsyncThunk('analytics/fetchLowStock', async (params?: AnalyticsParams) => {
  const response = await getLowStock(params);
  return response;
});

export const fetchTimeUtilization = createAsyncThunk('analytics/fetchTimeUtilization', async (params?: AnalyticsParams) => {
  const response = await getTimeUtilization(params);
  return response;
});

interface AnalyticsState {
  // Loading states
  loading: boolean;

  // Error state
  error: string | null;

  // Data
  summary: AnalyticsSummary | null;
  revenueSeries: RevenueSeriesPoint[];
  expenseBreakdown: ExpenseBreakdownItem[];
  paymentsSplit: PaymentSplitItem[];
  topItems: TopItem[];
  lowStock: LowStockItem[];
  timeUtilization: TimeUtilizationPoint[];

  // Filters
  filters: AnalyticsParams;
}

const initialState: AnalyticsState = {
  loading: false,
  error: null,
  summary: null,
  revenueSeries: [],
  expenseBreakdown: [],
  paymentsSplit: [],
  topItems: [],
  lowStock: [],
  timeUtilization: [],
  filters: {}
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<AnalyticsParams>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Summary
    builder
      .addCase(fetchAnalyticsSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnalyticsSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload;
        state.error = null;
      })
      .addCase(fetchAnalyticsSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch analytics summary';
      });

    // Revenue Series
    builder
      .addCase(fetchRevenueSeries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRevenueSeries.fulfilled, (state, action) => {
        state.loading = false;
        state.revenueSeries = action.payload;
        state.error = null;
      })
      .addCase(fetchRevenueSeries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch revenue series';
      });

    // Expense Breakdown
    builder
      .addCase(fetchExpenseBreakdown.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExpenseBreakdown.fulfilled, (state, action) => {
        state.loading = false;
        state.expenseBreakdown = action.payload;
        state.error = null;
      })
      .addCase(fetchExpenseBreakdown.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch expense breakdown';
      });

    // Payments Split
    builder
      .addCase(fetchPaymentsSplit.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentsSplit.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentsSplit = action.payload;
        state.error = null;
      })
      .addCase(fetchPaymentsSplit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch payments split';
      });

    // Top Items
    builder
      .addCase(fetchTopItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTopItems.fulfilled, (state, action) => {
        state.loading = false;
        state.topItems = action.payload;
        state.error = null;
      })
      .addCase(fetchTopItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch top items';
      });

    // Low Stock
    builder
      .addCase(fetchLowStock.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLowStock.fulfilled, (state, action) => {
        state.loading = false;
        state.lowStock = action.payload;
        state.error = null;
      })
      .addCase(fetchLowStock.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch low stock items';
      });

    // Time Utilization
    builder
      .addCase(fetchTimeUtilization.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTimeUtilization.fulfilled, (state, action) => {
        state.loading = false;
        state.timeUtilization = action.payload;
        state.error = null;
      })
      .addCase(fetchTimeUtilization.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch time utilization';
      });
  }
});

export const { setFilters, clearFilters, clearError } = analyticsSlice.actions;
export default analyticsSlice.reducer;
```

#### 2.4 Store Integration

**File**: `src/store/index.ts`

```typescript
// Add analytics reducer
import analyticsReducer from './slices/analytics';

const store = configureStore({
  reducer: {
    // ... existing reducers
    analytics: analyticsReducer
  }
  // ... rest of store config
});
```

### Phase 3: Component Structure (Following Inventory Pattern)

#### 3.1 Main Analytics Page

**File**: `src/views/analytics/index.tsx`

```typescript
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Grid, Box, Typography } from '@mui/material';
import { RootState, AppDispatch } from 'store';
import {
  fetchAnalyticsSummary,
  fetchRevenueSeries,
  fetchExpenseBreakdown,
  fetchPaymentsSplit,
  fetchTopItems,
  fetchLowStock,
  fetchTimeUtilization,
  setFilters
} from 'store/slices/analytics';
import MainCard from 'ui-component/cards/MainCard';
import AnalyticsFilters from './components/AnalyticsFilters';
import KpiCards from './components/KpiCards';
import RevenueTrend from './components/RevenueTrend';
import ExpenseBreakdown from './components/ExpenseBreakdown';
import PaymentsByProvider from './components/PaymentsByProvider';
import TopItems from './components/TopItems';
import LowStock from './components/LowStock';
import TimeUtilization from './components/TimeUtilization';
import { AnalyticsParams } from 'types/analytics';

const Analytics: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, filters, summary } = useSelector((state: RootState) => state.analytics);

  // Load data on mount and when filters change
  useEffect(() => {
    const params: AnalyticsParams = {
      from_date: filters.from_date,
      to_date: filters.to_date,
      provider: filters.provider,
      location_id: filters.location_id
    };

    dispatch(fetchAnalyticsSummary(params));
    dispatch(fetchRevenueSeries(params));
    dispatch(fetchExpenseBreakdown(params));
    dispatch(fetchPaymentsSplit(params));
    dispatch(fetchTopItems(params));
    dispatch(fetchLowStock(params));
    dispatch(fetchTimeUtilization(params));
  }, [dispatch, filters]);

  const handleFiltersChange = (newFilters: AnalyticsParams) => {
    dispatch(setFilters(newFilters));
  };

  return (
    <Box>
      <MainCard title="Analytics Dashboard">
        <Grid container spacing={3}>
          {/* Filters */}
          <Grid item xs={12}>
            <AnalyticsFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              loading={loading}
            />
          </Grid>

          {/* KPI Cards */}
          <Grid item xs={12}>
            <KpiCards data={summary} loading={loading} />
          </Grid>

          {/* Charts Row 1 */}
          <Grid item xs={12} md={8}>
            <RevenueTrend />
          </Grid>
          <Grid item xs={12} md={4}>
            <ExpenseBreakdown />
          </Grid>

          {/* Charts Row 2 */}
          <Grid item xs={12} md={6}>
            <PaymentsByProvider />
          </Grid>
          <Grid item xs={12} md={6}>
            <TimeUtilization />
          </Grid>

          {/* Tables Row */}
          <Grid item xs={12} md={6}>
            <TopItems />
          </Grid>
          <Grid item xs={12} md={6}>
            <LowStock />
          </Grid>
        </Grid>
      </MainCard>
    </Box>
  );
};

export default Analytics;
```

#### 3.2 Component Structure

**Folder**: `src/views/analytics/components/`

```
analytics/
├── index.tsx                 # Main analytics page
└── components/
    ├── AnalyticsFilters.tsx  # Date range + provider filters
    ├── KpiCards.tsx         # 6 KPI metrics cards
    ├── RevenueTrend.tsx     # Line chart
    ├── ExpenseBreakdown.tsx # Pie chart
    ├── PaymentsByProvider.tsx # Stacked bar chart
    ├── TopItems.tsx         # Table with export
    ├── LowStock.tsx         # Table with export
    └── TimeUtilization.tsx  # Bar chart
```

#### 3.3 Filters Component

**File**: `src/views/analytics/components/AnalyticsFilters.tsx`

```typescript
import React from 'react';
import { Grid, Box, Button } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { AnalyticsParams } from 'types/analytics';
import AllyviaFilterSelect from 'ui-component/common/AllyviaFilterSelect';

interface AnalyticsFiltersProps {
  filters: AnalyticsParams;
  onFiltersChange: (filters: AnalyticsParams) => void;
  loading: boolean;
}

const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  filters,
  onFiltersChange,
  loading
}) => {
  const handleDateRangeChange = (field: 'from_date' | 'to_date', value: Date | null) => {
    onFiltersChange({
      ...filters,
      [field]: value ? value.toISOString().split('T')[0] : undefined
    });
  };

  const handleProviderChange = (provider: string) => {
    onFiltersChange({
      ...filters,
      provider: provider === 'all' ? undefined : provider
    });
  };

  const handleQuickFilters = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    onFiltersChange({
      ...filters,
      from_date: startDate.toISOString().split('T')[0],
      to_date: endDate.toISOString().split('T')[0]
    });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Grid container spacing={2} alignItems="center">
          {/* Quick Date Filters */}
          <Grid item>
            <Button
              variant={!filters.from_date ? 'contained' : 'outlined'}
              onClick={() => handleQuickFilters(7)}
              disabled={loading}
            >
              Last 7 Days
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              onClick={() => handleQuickFilters(30)}
              disabled={loading}
            >
              Last 30 Days
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              onClick={() => handleQuickFilters(90)}
              disabled={loading}
            >
              Last 90 Days
            </Button>
          </Grid>

          {/* Custom Date Range */}
          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <DatePicker
                  label="Start Date"
                  value={filters.from_date ? new Date(filters.from_date) : null}
                  onChange={(value) => handleDateRangeChange('from_date', value)}
                  disabled={loading}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true
                    }
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <DatePicker
                  label="End Date"
                  value={filters.to_date ? new Date(filters.to_date) : null}
                  onChange={(value) => handleDateRangeChange('to_date', value)}
                  disabled={loading}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true
                    }
                  }}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Provider Filter */}
          <Grid item xs={12} md={3}>
            <AllyviaFilterSelect
              label="Provider"
              value={filters.provider || 'all'}
              onChange={handleProviderChange}
              options={[
                { value: 'all', label: 'All Providers' },
                { value: 'quickbooks', label: 'QuickBooks' },
                { value: 'square', label: 'Square' }
              ]}
              disabled={loading}
            />
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default AnalyticsFilters;
```

#### 3.4 KPI Cards Component

**File**: `src/views/analytics/components/KpiCards.tsx`

```typescript
import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import { TrendingUp, TrendingDown, AttachMoney, ShoppingCart, Inventory, Schedule } from '@mui/icons-material';
import { AnalyticsSummary } from 'types/analytics';

interface KpiCardsProps {
  data: AnalyticsSummary | null;
  loading: boolean;
}

const KpiCards: React.FC<KpiCardsProps> = ({ data, loading }) => {
  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const getKpiColor = (value: number, type: 'positive' | 'neutral' | 'negative' = 'neutral') => {
    if (type === 'positive' && value > 0) return '#4caf50';
    if (type === 'negative' && value < 0) return '#f44336';
    return '#2196f3';
  };

  // Updated to match backend field names
  const kpiData = [
    {
      title: 'Total Revenue',
      value: data?.total_revenue || 0,  // Backend: total_revenue
      icon: <AttachMoney />,
      color: getKpiColor(data?.total_revenue || 0, 'positive'),
      formatter: (val: number) => formatCurrency(val, data?.currency)
    },
    {
      title: 'Payments Count',
      value: data?.payments_count || 0,  // Backend: payments_count
      icon: <ShoppingCart />,
      color: getKpiColor(data?.payments_count || 0, 'neutral'),
      formatter: (val: number) => val.toLocaleString()
    },
    {
      title: 'Avg Ticket',
      value: data?.avg_ticket || 0,  // Backend: avg_ticket
      icon: <TrendingUp />,
      color: getKpiColor(data?.avg_ticket || 0, 'positive'),
      formatter: (val: number) => formatCurrency(val, data?.currency)
    },
    {
      title: 'Expenses',
      value: data?.expenses || 0,  // Backend: expenses
      icon: <TrendingDown />,
      color: getKpiColor(data?.expenses || 0, 'neutral'),
      formatter: (val: number) => formatCurrency(val, data?.currency)
    },
    {
      title: 'Net Income',
      value: data?.net || 0,  // Backend: net
      icon: <TrendingUp />,
      color: getKpiColor(data?.net || 0, data?.net && data.net >= 0 ? 'positive' : 'negative'),
      formatter: (val: number) => formatCurrency(val, data?.currency)
    },
    {
      title: 'Inventory Value',
      value: data?.inventory_value || 0,  // Backend: inventory_value
      icon: <Inventory />,
      color: getKpiColor(data?.inventory_value || 0, 'neutral'),
      formatter: (val: number) => formatCurrency(val, data?.currency)
    }
  ];

  if (loading) {
    return (
      <Grid container spacing={3}>
        {kpiData.map((_, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <Card>
              <CardContent>
                <Skeleton variant="rectangular" height={40} />
                <Skeleton variant="text" />
                <Skeleton variant="text" width="60%" />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={3}>
      {kpiData.map((kpi, index) => (
        <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    {kpi.title}
                  </Typography>
                  <Typography variant="h4" style={{ color: kpi.color }}>
                    {kpi.formatter(kpi.value)}
                  </Typography>
                </Box>
                <Box style={{ color: kpi.color }}>
                  {kpi.icon}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default KpiCards;
```

#### 3.5 Navigation Menu Update

**File**: `src/menu-items/pages.ts`

```typescript
// Add Analytics to navigation (after Finance, before Employees)
const pages: NavItemType = {
  id: 'root',
  title: '',
  type: 'group',
  children: [
    { id: 'dashboard', title: 'Dashboard', icon: icons.IconHome, type: 'item', url: '/dashboard' },
    { id: 'integrations', title: 'Integrations', icon: icons.IconPlugConnected, type: 'item', url: '/integrations' },
    { id: 'finance', title: 'Finance & Accounting', url: '/finance', type: 'item', icon: icons.IconReportMoney },
    { id: 'analytics', title: 'Analytics', url: '/analytics', type: 'item', icon: icons.IconChartBar }, // ADD THIS
    {
      id: 'employees',
      title: 'Employees & Payroll'
      // ... rest of employees config
    }
  ]
};
```

#### 3.6 Chart Components (Using Existing ApexCharts)

**File**: `src/views/analytics/components/RevenueTrend.tsx`

```typescript
import React from 'react';
import { Card, CardHeader, CardContent, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import AnalyticsChart from 'views/analytics/AnalyticsChart';

const RevenueTrend: React.FC = () => {
  const { revenueSeries, loading } = useSelector((state: RootState) => state.analytics);

  const chartOptions = {
    chart: {
      type: 'line' as const,
      height: 350,
      toolbar: {
        show: true
      }
    },
    stroke: {
      curve: 'smooth' as const,
      width: 3
    },
    xaxis: {
      type: 'datetime' as const,
      categories: revenueSeries.map(item => item.date)
    },
    yaxis: {
      title: {
        text: 'Revenue ($)'
      },
      labels: {
        formatter: (value: number) => `$${value.toLocaleString()}`
      }
    },
    tooltip: {
      x: {
        format: 'dd MMM yyyy'
      },
      y: {
        formatter: (value: number) => `$${value.toLocaleString()}`
      }
    }
  };

  const series = [
    {
      name: 'Revenue',
      data: revenueSeries.map(item => item.amount)
    }
  ];

  return (
    <Card>
      <CardHeader
        title={
          <Typography variant="h5" component="div">
            Revenue Trend
          </Typography>
        }
      />
      <CardContent>
        <AnalyticsChart
          options={chartOptions}
          series={series}
          type="line"
          height={350}
        />
      </CardContent>
    </Card>
  );
};

export default RevenueTrend;
```

#### 3.7 Export Functionality

**File**: `src/views/analytics/components/TopItems.tsx`

```typescript
import React from 'react';
import { Card, CardHeader, CardContent, Typography, Button, Box } from '@mui/material';
import { Download } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { downloadCSV } from 'utils/csvDownload';
import { TopItem } from 'types/analytics';

const TopItems: React.FC = () => {
  const { topItems, loading } = useSelector((state: RootState) => state.analytics);

  const handleExport = () => {
    const csvData = topItems.map(item => ({
      'Item Name': item.name,        // Backend: name field
      'Quantity': item.qty,          // Backend: qty field
      'Amount': item.amount,         // Backend: amount field
      'Item ID': item.item_id        // Backend: item_id field
    }));

    downloadCSV(csvData, 'top-items-analytics.csv');
  };

  return (
    <Card>
      <CardHeader
        title={
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" component="div">
              Top Items
            </Typography>
            <Button
              startIcon={<Download />}
              onClick={handleExport}
              disabled={loading || topItems.length === 0}
              size="small"
            >
              Export
            </Button>
          </Box>
        }
      />
      <CardContent>
        {/* Table implementation */}
        {topItems.length === 0 ? (
          <Typography color="textSecondary">No data available</Typography>
        ) : (
          // Table component here
          <div>Table content</div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopItems;
```

### Phase 4: Implementation Steps

#### Step 1: Create Types and API Client

1. Create `src/types/analytics.ts` with all interfaces
2. Create `src/api/analytics.api.ts` with clean API calls
3. No mock data fallbacks - direct API integration

#### Step 2: Redux Integration

1. Create `src/store/slices/analytics.ts` with async thunks
2. Add analytics reducer to `src/store/index.ts`
3. Follow exact patterns from inventory slice

#### Step 3: Component Structure

1. Refactor `src/views/analytics/index.tsx` to single page layout
2. Create `src/views/analytics/components/` folder
3. Build all 8 components following the patterns above

#### Step 4: Navigation and Features

1. Add Analytics to main navigation menu
2. Implement CSV export functionality
3. Add loading states and error handling
4. Test with real backend endpoints

### Phase 5: Backend Requirements Summary

The backend team needs to implement these 7 endpoints:

```
GET /analytics/summary/          # KPI summary data
GET /analytics/revenue-series/   # Daily revenue points
GET /analytics/expense-breakdown/ # Expense categories
GET /analytics/payments-split/   # Provider breakdown
GET /analytics/top-items/        # Top selling items
GET /analytics/low-stock/        # Low inventory items
GET /analytics/time-utilization/ # Weekly hours data
```

All endpoints should:

- Accept query parameters: `from`, `to`, `provider`, `location_id`
- Return JSON responses matching the TypeScript interfaces
- Be company-scoped (enforce company_id tenancy)
- Cache responses for 5 minutes
- Follow existing QuickBooks integration patterns

### Phase 6: Testing Strategy

1. **Unit Tests**: Test Redux thunks and selectors
2. **Integration Tests**: Test API client functions
3. **Component Tests**: Test chart rendering and data display
4. **E2E Tests**: Test full analytics workflow with filters

### Phase 7: Deployment Checklist

- [ ] All 7 backend endpoints implemented
- [ ] Frontend types match backend responses
- [ ] Redux slice properly integrated
- [ ] All components render without errors
- [ ] CSV export functionality works
- [ ] Navigation menu updated
- [ ] Loading and error states handled
- [ ] Feature flag implemented (if needed)
- [ ] Performance optimized (charts, large datasets)

## Key Changes Made for Backend Field Mapping

### ✅ **Field Name Updates:**

- `totalRevenue` → `total_revenue`
- `paymentsCount` → `payments_count`
- `avgTicket` → `avg_ticket`
- `inventoryValue` → `inventory_value`
- `startDate` → `from_date`
- `endDate` → `to_date`
- `itemId` → `item_id`
- `onHand` → `on_hand`
- `reorderPoint` → `reorder_point`
- `weekStart` → `week_start`

### ✅ **API Parameter Updates:**

- Query parameters now use `from` and `to` instead of `startDate` and `endDate`
- All parameter names match backend expectations

### ✅ **Type Safety:**

- All TypeScript interfaces updated to match backend field names
- Proper typing for all API responses

### ✅ **Component Updates:**

- KPI cards use correct field names from backend
- Chart components use correct data field names
- Export functions use correct field names

This implementation follows the exact patterns used in the inventory and employee modules, ensuring consistency with the existing codebase architecture while matching the actual backend field names and data structure.
