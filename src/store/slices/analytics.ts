import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AnalyticsAPI } from 'api/analytics.api';
import {
  AnalyticsSummary,
  RevenueSeriesPoint,
  ExpenseBreakdownItem,
  PaymentSplitItem,
  TopItem,
  LowStockItem,
  TimeUtilizationPoint,
  AnalyticsParams,
  InventorySummary,
  InventoryCategory,
  InventoryLocation,
  InventoryType,
  InventoryAlerts,
  InventoryOverviewResponse,
  InventoryAllResponse,
  InventoryTrendsOverview,
  EmployeeOverviewResponse,
  EmployeeAllResponse,
  EmployeeSummary,
  TopEmployee,
  EmployeeTimeBreakdown,
  EmployeeDailyResponse,
  DailyBreakdown,
  CRMAnalyticsParams,
  CRMAnalyticsOverviewResponse,
  CRMAnalyticsPipelineResponse,
  CRMAnalyticsConversionResponse,
  CRMAnalyticsSourcesResponse,
  CRMAnalyticsActivitiesResponse,
  CRMAnalyticsDealAgingResponse,
  CRMAnalyticsRepsResponse,
  CRMAnalyticsStalledResponse,
  CRMRepPerformanceParams,
  CRMRepPerformanceResponse
} from 'types/analytics';
import { InventoryItemsTreemapResponse } from '../../types/inventory';

// Async Thunks
export const fetchAnalyticsSummary = createAsyncThunk('analytics/fetchSummary', async (params?: AnalyticsParams) => {
  const response = await AnalyticsAPI.Financial.getSummary(params);
  return response;
});

export const fetchRevenueSeries = createAsyncThunk('analytics/fetchRevenueSeries', async (params?: AnalyticsParams) => {
  const response = await AnalyticsAPI.Financial.getRevenueSeries(params);
  return response;
});

export const fetchExpenseBreakdown = createAsyncThunk('analytics/fetchExpenseBreakdown', async (params?: AnalyticsParams) => {
  const response = await AnalyticsAPI.Financial.getExpenseBreakdown(params);
  return response;
});

export const fetchPaymentsSplit = createAsyncThunk('analytics/fetchPaymentsSplit', async (params?: AnalyticsParams) => {
  const response = await AnalyticsAPI.Financial.getPaymentsSplit(params);
  return response;
});

export const fetchTopItems = createAsyncThunk('analytics/fetchTopItems', async (params?: AnalyticsParams) => {
  const response = await AnalyticsAPI.Financial.getTopItems(params);
  return response;
});

export const fetchLowStock = createAsyncThunk('analytics/fetchLowStock', async (params?: AnalyticsParams) => {
  const response = await AnalyticsAPI.Financial.getLowStock(params);
  return response;
});

export const fetchTimeUtilization = createAsyncThunk('analytics/fetchTimeUtilization', async (params?: AnalyticsParams) => {
  const response = await AnalyticsAPI.Financial.getTimeUtilization(params);
  return response;
});

// New Inventory Analytics Thunks
export const fetchInventorySummary = createAsyncThunk('analytics/fetchInventorySummary', async () => {
  const response = await AnalyticsAPI.Inventory.getSummary();
  return response;
});

export const fetchInventoryCategories = createAsyncThunk('analytics/fetchInventoryCategories', async () => {
  const response = await AnalyticsAPI.Inventory.getCategories();
  return response;
});

export const fetchInventoryLocations = createAsyncThunk('analytics/fetchInventoryLocations', async () => {
  const response = await AnalyticsAPI.Inventory.getLocations();
  return response;
});

export const fetchInventoryTypes = createAsyncThunk('analytics/fetchInventoryTypes', async () => {
  const response = await AnalyticsAPI.Inventory.getTypes();
  return response;
});

export const fetchInventoryAlerts = createAsyncThunk('analytics/fetchInventoryAlerts', async () => {
  const response = await AnalyticsAPI.Inventory.getAlerts();
  return response;
});

// New consolidated inventory thunks
export const fetchInventoryOverview = createAsyncThunk('analytics/fetchInventoryOverview', async (sections?: string) => {
  const response: InventoryOverviewResponse = await AnalyticsAPI.Inventory.getOverview(sections);
  return response;
});

export const fetchInventoryAll = createAsyncThunk('analytics/fetchInventoryAll', async () => {
  const response: InventoryAllResponse = await AnalyticsAPI.Inventory.getAll();
  return response;
});

// Products Treemap
export const fetchInventoryItemsTreeMap = createAsyncThunk(
  'analytics/fetchInventoryItemsTreeMap',
  async (params: AnalyticsParams | undefined, thunkAPI) => {
    const state: any = thunkAPI.getState();
    const filters: AnalyticsParams = state.analytics?.filters || {};
    const effective: AnalyticsParams = {
      start_date: params?.start_date ?? filters.start_date ?? params?.from_date ?? filters.from_date,
      end_date: params?.end_date ?? filters.end_date ?? params?.to_date ?? filters.to_date
    };
    const response: InventoryItemsTreemapResponse = await AnalyticsAPI.Inventory.getItemsTreemap(effective);
    return response;
  }
);

// Employee analytics thunks
export const fetchEmployeeOverview = createAsyncThunk(
  'analytics/fetchEmployeeOverview',
  async (params: AnalyticsParams | undefined, thunkAPI) => {
    const state: any = thunkAPI.getState();
    const filters: AnalyticsParams = state.analytics?.filters || {};
    const effective: AnalyticsParams = {
      start_date: params?.start_date ?? filters.start_date ?? params?.from_date ?? filters.from_date,
      end_date: params?.end_date ?? filters.end_date ?? params?.to_date ?? filters.to_date
    };
    const response: EmployeeOverviewResponse = await AnalyticsAPI.Employee.getOverview(effective);
    return response;
  }
);

export const fetchEmployeeAll = createAsyncThunk('analytics/fetchEmployeeAll', async (params: AnalyticsParams | undefined, thunkAPI) => {
  const state: any = thunkAPI.getState();
  const filters: AnalyticsParams = state.analytics?.filters || {};
  const effective: AnalyticsParams = {
    start_date: params?.start_date ?? filters.start_date ?? params?.from_date ?? filters.from_date,
    end_date: params?.end_date ?? filters.end_date ?? params?.to_date ?? filters.to_date
  };
  const response: EmployeeAllResponse = await AnalyticsAPI.Employee.getAll(effective);
  return response;
});

export const fetchEmployeeDailyBreakdown = createAsyncThunk(
  'analytics/fetchEmployeeDailyBreakdown',
  async (params: AnalyticsParams | undefined, thunkAPI) => {
    const state: any = thunkAPI.getState();
    const filters: AnalyticsParams = state.analytics?.filters || {};
    const effective: AnalyticsParams = {
      start_date: params?.start_date ?? filters.start_date ?? params?.from_date ?? filters.from_date,
      end_date: params?.end_date ?? filters.end_date ?? params?.to_date ?? filters.to_date
    };
    const response: EmployeeDailyResponse = await AnalyticsAPI.Employee.getDailyBreakdown(effective);
    return response;
  }
);

// CRM Analytics Thunks
export const fetchCRMAnalyticsOverview = createAsyncThunk('analytics/fetchCRMAnalyticsOverview', async (params?: CRMAnalyticsParams) => {
  const response = await AnalyticsAPI.CRM.getOverview(params);
  return response;
});

export const fetchCRMAnalyticsPipeline = createAsyncThunk('analytics/fetchCRMAnalyticsPipeline', async (params?: CRMAnalyticsParams) => {
  const response = await AnalyticsAPI.CRM.getPipeline(params);
  return response;
});

export const fetchCRMAnalyticsConversion = createAsyncThunk(
  'analytics/fetchCRMAnalyticsConversion',
  async (params?: CRMAnalyticsParams) => {
    const response = await AnalyticsAPI.CRM.getConversion(params);
    return response;
  }
);

export const fetchCRMAnalyticsSources = createAsyncThunk('analytics/fetchCRMAnalyticsSources', async (params?: CRMAnalyticsParams) => {
  const response = await AnalyticsAPI.CRM.getSources(params);
  return response;
});

export const fetchCRMAnalyticsActivities = createAsyncThunk(
  'analytics/fetchCRMAnalyticsActivities',
  async (params?: CRMAnalyticsParams & { bucket?: 'day' | 'week' | 'month' }) => {
    const response = await AnalyticsAPI.CRM.getActivities(params);
    return response;
  }
);

export const fetchCRMAnalyticsDealAging = createAsyncThunk('analytics/fetchCRMAnalyticsDealAging', async (params?: CRMAnalyticsParams) => {
  const response = await AnalyticsAPI.CRM.getDealAging(params);
  return response;
});

export const fetchCRMAnalyticsReps = createAsyncThunk('analytics/fetchCRMAnalyticsReps', async (params?: CRMAnalyticsParams) => {
  const response = await AnalyticsAPI.CRM.getReps(params);
  return response;
});

export const fetchCRMAnalyticsStalled = createAsyncThunk(
  'analytics/fetchCRMAnalyticsStalled',
  async (params?: CRMAnalyticsParams & { days_no_activity?: number; min_value?: number }) => {
    const response = await AnalyticsAPI.CRM.getStalled(params);
    return response;
  }
);

// Rep Performance
export const fetchCRMRepPerformance = createAsyncThunk('analytics/fetchCRMRepPerformance', async (params: CRMRepPerformanceParams) => {
  const response = await AnalyticsAPI.CRM.getRepPerformance(params);
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
  // New Inventory Analytics Data
  inventorySummary: InventorySummary | null;
  inventoryCategories: InventoryCategory[];
  inventoryLocations: InventoryLocation[];
  inventoryTypes: InventoryType[];
  inventoryAlerts: InventoryAlerts | null;
  inventoryTrends: InventoryTrendsOverview | null;
  inventoryItemsTreeMap?: InventoryItemsTreemapResponse | null;

  // Employee analytics
  employeeSummary: EmployeeSummary | null;
  employeeTimeUtilization: { week_start: string; hours: number }[];
  topEmployees: TopEmployee[];
  employeeTimeBreakdown: EmployeeTimeBreakdown[];
  dailyBreakdown: DailyBreakdown[];

  // CRM Analytics Data
  crmOverview: CRMAnalyticsOverviewResponse | null;
  crmPipeline: CRMAnalyticsPipelineResponse | null;
  crmConversion: CRMAnalyticsConversionResponse | null;
  crmSources: CRMAnalyticsSourcesResponse | null;
  crmActivities: CRMAnalyticsActivitiesResponse | null;
  crmDealAging: CRMAnalyticsDealAgingResponse | null;
  crmReps: CRMAnalyticsRepsResponse | null;
  crmStalled: CRMAnalyticsStalledResponse | null;
  crmRepPerformance: CRMRepPerformanceResponse | null;

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
  // New Inventory Analytics Data
  inventorySummary: null,
  inventoryCategories: [],
  inventoryLocations: [],
  inventoryTypes: [],
  inventoryAlerts: null,
  inventoryTrends: null,
  inventoryItemsTreeMap: null,
  employeeSummary: null,
  employeeTimeUtilization: [],
  topEmployees: [],
  employeeTimeBreakdown: [],
  dailyBreakdown: [],

  // CRM Analytics Data
  crmOverview: null,
  crmPipeline: null,
  crmConversion: null,
  crmSources: null,
  crmActivities: null,
  crmDealAging: null,
  crmReps: null,
  crmStalled: null,
  crmRepPerformance: null,

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

    // New Inventory Analytics extraReducers (legacy endpoints)
    // Inventory Summary
    builder
      .addCase(fetchInventorySummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventorySummary.fulfilled, (state, action) => {
        state.loading = false;
        state.inventorySummary = action.payload;
        state.error = null;
      })
      .addCase(fetchInventorySummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch inventory summary';
      });

    // Inventory Categories
    builder
      .addCase(fetchInventoryCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.inventoryCategories = action.payload;
        state.error = null;
      })
      .addCase(fetchInventoryCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch inventory categories';
      });

    // Inventory Locations
    builder
      .addCase(fetchInventoryLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.inventoryLocations = action.payload;
        state.error = null;
      })
      .addCase(fetchInventoryLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch inventory locations';
      });

    // Inventory Types
    builder
      .addCase(fetchInventoryTypes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryTypes.fulfilled, (state, action) => {
        state.loading = false;
        state.inventoryTypes = action.payload;
        state.error = null;
      })
      .addCase(fetchInventoryTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch inventory types';
      });

    // Inventory Alerts
    builder
      .addCase(fetchInventoryAlerts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.inventoryAlerts = action.payload;
        state.error = null;
      })
      .addCase(fetchInventoryAlerts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch inventory alerts';
      });

    // Consolidated Inventory Overview
    builder
      .addCase(fetchInventoryOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.inventorySummary = action.payload.summary;
        state.inventoryTrends = action.payload.trends;
        state.inventoryAlerts = action.payload.alerts;
        state.error = null;
      })
      .addCase(fetchInventoryOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch inventory overview';
      });

    // Consolidated Inventory All
    builder
      .addCase(fetchInventoryAll.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryAll.fulfilled, (state, action) => {
        state.loading = false;
        state.inventorySummary = action.payload.summary;
        state.inventoryCategories = action.payload.categories;
        state.inventoryLocations = action.payload.locations;
        state.inventoryTypes = action.payload.types;
        state.lowStock = action.payload.low_stock;
        state.topItems = action.payload.top_items;
        state.inventoryAlerts = action.payload.alerts;
        state.inventoryTrends = action.payload.trends;
        state.error = null;
      })
      .addCase(fetchInventoryAll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch inventory analytics';
      });
    // Items Treemap
    builder
      .addCase(fetchInventoryItemsTreeMap.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryItemsTreeMap.fulfilled, (state, action) => {
        state.loading = false;
        state.inventoryItemsTreeMap = action.payload;
        state.error = null;
      })
      .addCase(fetchInventoryItemsTreeMap.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch inventory items treemap';
      });

    // Employee Overview
    builder
      .addCase(fetchEmployeeOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployeeOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.employeeSummary = action.payload.summary;
        state.employeeTimeUtilization = (action.payload.time_utilization || []).map((p) => ({
          week_start: p.date, // Map date to week_start for backward compatibility
          hours: Number(p.hours || 0)
        }));
        state.error = null;
      })
      .addCase(fetchEmployeeOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch employee overview';
      });

    // Employee All
    builder
      .addCase(fetchEmployeeAll.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployeeAll.fulfilled, (state, action) => {
        state.loading = false;
        state.employeeSummary = action.payload.summary;
        state.employeeTimeUtilization = (action.payload.time_utilization || []).map((p) => ({
          week_start: p.date, // Map date to week_start for backward compatibility
          hours: Number(p.hours || 0)
        }));
        state.topEmployees = action.payload.top_employees || [];
        state.employeeTimeBreakdown = action.payload.employee_time_breakdown || [];
        state.error = null;
      })
      .addCase(fetchEmployeeAll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch employee analytics';
      })
      // Employee Daily Breakdown
      .addCase(fetchEmployeeDailyBreakdown.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployeeDailyBreakdown.fulfilled, (state, action) => {
        state.loading = false;
        state.dailyBreakdown = action.payload.daily_breakdown || [];
        state.error = null;
      })
      .addCase(fetchEmployeeDailyBreakdown.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch employee daily breakdown';
      });

    // CRM Analytics extraReducers
    // CRM Overview
    builder
      .addCase(fetchCRMAnalyticsOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.crmOverview = action.payload;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch CRM overview';
      });

    // CRM Pipeline
    builder
      .addCase(fetchCRMAnalyticsPipeline.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsPipeline.fulfilled, (state, action) => {
        state.loading = false;
        state.crmPipeline = action.payload;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsPipeline.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch CRM pipeline';
      });

    // CRM Conversion
    builder
      .addCase(fetchCRMAnalyticsConversion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsConversion.fulfilled, (state, action) => {
        state.loading = false;
        state.crmConversion = action.payload;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsConversion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch CRM conversion';
      });

    // CRM Sources
    builder
      .addCase(fetchCRMAnalyticsSources.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsSources.fulfilled, (state, action) => {
        state.loading = false;
        state.crmSources = action.payload;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsSources.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch CRM sources';
      });

    // CRM Activities
    builder
      .addCase(fetchCRMAnalyticsActivities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsActivities.fulfilled, (state, action) => {
        state.loading = false;
        state.crmActivities = action.payload;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsActivities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch CRM activities';
      });

    // CRM Deal Aging
    builder
      .addCase(fetchCRMAnalyticsDealAging.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsDealAging.fulfilled, (state, action) => {
        state.loading = false;
        state.crmDealAging = action.payload;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsDealAging.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch CRM deal aging';
      });

    // CRM Reps
    builder
      .addCase(fetchCRMAnalyticsReps.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsReps.fulfilled, (state, action) => {
        state.loading = false;
        state.crmReps = action.payload;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsReps.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch CRM reps';
      });

    // CRM Stalled
    builder
      .addCase(fetchCRMAnalyticsStalled.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsStalled.fulfilled, (state, action) => {
        state.loading = false;
        state.crmStalled = action.payload;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsStalled.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch CRM stalled deals';
      });

    // CRM Rep Performance
    builder
      .addCase(fetchCRMRepPerformance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCRMRepPerformance.fulfilled, (state, action) => {
        state.loading = false;
        state.crmRepPerformance = action.payload;
        state.error = null;
      })
      .addCase(fetchCRMRepPerformance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch CRM rep performance';
      });
  }
});

export const { setFilters, clearFilters, clearError } = analyticsSlice.actions;
export default analyticsSlice.reducer;
