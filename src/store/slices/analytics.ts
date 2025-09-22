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
