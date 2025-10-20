import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AnalyticsAPI } from 'api/analytics.api';
import { InsightsAPI } from 'api/insights.api';
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
  InventoryAlerts,
  InventoryOverviewResponse,
  InventoryAllResponse,
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
  CRMRepPerformanceResponse,
  CompanyProfile,
  SupplierRiskAnalysis,
  OverstockAnalysis
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

// Consolidated Inventory Analytics Thunks
export const fetchInventorySummary = createAsyncThunk('analytics/fetchInventorySummary', async () => {
  const response = await AnalyticsAPI.Inventory.getSummary();
  return response;
});

export const fetchInventoryAlerts = createAsyncThunk('analytics/fetchInventoryAlerts', async () => {
  const response = await AnalyticsAPI.Inventory.getAlerts();
  return response;
});

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
    // Thread optional employee_id through
    if ((params as any)?.employee_id) {
      (effective as any).employee_id = (params as any).employee_id;
    }
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

// Insights Thunks
export const fetchCompanyProfile = createAsyncThunk('analytics/fetchCompanyProfile', async () => {
  const response = await InsightsAPI.CompanyProfile.getProfile();
  return response;
});

export const generateCompanyProfile = createAsyncThunk('analytics/generateCompanyProfile', async () => {
  const response = await InsightsAPI.CompanyProfile.refreshProfile();
  return response;
});

export const updateCompanyProfile = createAsyncThunk('analytics/updateCompanyProfile', async (updates: Partial<CompanyProfile>) => {
  const response = await InsightsAPI.CompanyProfile.updateProfile(updates);
  return response;
});

export const fetchSupplierRisk = createAsyncThunk('analytics/fetchSupplierRisk', async () => {
  const response = await InsightsAPI.SupplierRisk.getAnalysis();
  return response;
});

export const generateSupplierRisk = createAsyncThunk('analytics/generateSupplierRisk', async () => {
  const response = await InsightsAPI.SupplierRisk.generateAnalysis();
  return response;
});

export const fetchOverstock = createAsyncThunk('analytics/fetchOverstock', async () => {
  const response = await InsightsAPI.Overstock.getAnalysis();
  return response;
});

export const generateOverstock = createAsyncThunk('analytics/generateOverstock', async () => {
  const response = await InsightsAPI.Overstock.generateAnalysis();
  return response;
});

interface Loadable<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

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
  // Consolidated Inventory Analytics Data
  inventorySummary: InventorySummary | null;
  inventoryAlerts: InventoryAlerts | null;
  inventoryItemsTreeMap: InventoryItemsTreemapResponse | null;

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

  // Insights Data
  companyProfile: CompanyProfile | null;
  companyProfileLoading: boolean;
  companyProfileError: string | null;

  supplierRisk: SupplierRiskAnalysis | null;
  supplierRiskLoading: boolean;
  supplierRiskError: string | null;

  overstock: OverstockAnalysis | null;
  overstockLoading: boolean;
  overstockError: string | null;

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
  // Consolidated Inventory Analytics Data
  inventorySummary: null,
  inventoryAlerts: null,
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

  // Insights Data
  companyProfile: null,
  companyProfileLoading: false,
  companyProfileError: null,

  supplierRisk: null,
  supplierRiskLoading: false,
  supplierRiskError: null,

  overstock: null,
  overstockLoading: false,
  overstockError: null,

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
        state.lowStock = action.payload.low_stock;
        state.topItems = action.payload.top_items;
        state.inventoryAlerts = action.payload.alerts;
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

    // CRM Overview
    builder
      .addCase(fetchCRMAnalyticsOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.crmOverview = { ...(state.crmOverview || ({} as any)), isLoading: true } as any;
      })
      .addCase(fetchCRMAnalyticsOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.crmOverview = { data: action.payload, isLoading: false, error: null } as any;
        state.error = null;
        // handled via response.isLoading
      })
      .addCase(fetchCRMAnalyticsOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch CRM overview';
        if (state.crmOverview) (state.crmOverview as any).isLoading = false;
      });

    // CRM Pipeline
    builder
      .addCase(fetchCRMAnalyticsPipeline.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.crmPipeline = { ...(state.crmPipeline || ({} as any)), isLoading: true } as any;
      })
      .addCase(fetchCRMAnalyticsPipeline.fulfilled, (state, action) => {
        state.loading = false;
        state.crmPipeline = { data: action.payload, isLoading: false, error: null } as any;
        state.error = null;
        // handled via response.isLoading
      })
      .addCase(fetchCRMAnalyticsPipeline.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch CRM pipeline';
        if (state.crmPipeline) (state.crmPipeline as any).isLoading = false;
      });

    // CRM Conversion
    builder
      .addCase(fetchCRMAnalyticsConversion.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.crmConversion = { ...(state.crmConversion || ({} as any)), isLoading: true } as any;
      })
      .addCase(fetchCRMAnalyticsConversion.fulfilled, (state, action) => {
        state.loading = false;
        state.crmConversion = { ...action.payload, isLoading: false } as any;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsConversion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch CRM conversion';
        if (state.crmConversion) (state.crmConversion as any).isLoading = false;
      });

    // CRM Sources
    builder
      .addCase(fetchCRMAnalyticsSources.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.crmSources = { ...(state.crmSources || ({} as any)), isLoading: true } as any;
      })
      .addCase(fetchCRMAnalyticsSources.fulfilled, (state, action) => {
        state.loading = false;
        state.crmSources = { ...action.payload, isLoading: false } as any;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsSources.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch CRM sources';
        if (state.crmSources) (state.crmSources as any).isLoading = false;
      });

    // CRM Activities
    builder
      .addCase(fetchCRMAnalyticsActivities.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.crmActivities = { ...(state.crmActivities || ({} as any)), isLoading: true } as any;
      })
      .addCase(fetchCRMAnalyticsActivities.fulfilled, (state, action) => {
        state.loading = false;
        state.crmActivities = { ...action.payload, isLoading: false } as any;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsActivities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch CRM activities';
        if (state.crmActivities) (state.crmActivities as any).isLoading = false;
      });

    // CRM Deal Aging
    builder
      .addCase(fetchCRMAnalyticsDealAging.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.crmDealAging = { ...(state.crmDealAging || ({} as any)), isLoading: true } as any;
      })
      .addCase(fetchCRMAnalyticsDealAging.fulfilled, (state, action) => {
        state.loading = false;
        state.crmDealAging = { ...action.payload, isLoading: false } as any;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsDealAging.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch CRM deal aging';
        if (state.crmDealAging) (state.crmDealAging as any).isLoading = false;
      });

    // CRM Reps
    builder
      .addCase(fetchCRMAnalyticsReps.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.crmReps = { ...(state.crmReps || ({} as any)), isLoading: true } as any;
      })
      .addCase(fetchCRMAnalyticsReps.fulfilled, (state, action) => {
        state.loading = false;
        state.crmReps = { ...action.payload, isLoading: false } as any;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsReps.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch CRM reps';
        if (state.crmReps) (state.crmReps as any).isLoading = false;
      });

    // CRM Stalled
    builder
      .addCase(fetchCRMAnalyticsStalled.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.crmStalled = { ...(state.crmStalled || ({} as any)), isLoading: true } as any;
      })
      .addCase(fetchCRMAnalyticsStalled.fulfilled, (state, action) => {
        state.loading = false;
        state.crmStalled = { ...action.payload, isLoading: false } as any;
        state.error = null;
      })
      .addCase(fetchCRMAnalyticsStalled.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch CRM stalled deals';
        if (state.crmStalled) (state.crmStalled as any).isLoading = false;
      });

    // CRM Rep Performance
    builder
      .addCase(fetchCRMRepPerformance.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.crmRepPerformance = { ...(state.crmRepPerformance || ({} as any)), isLoading: true } as any;
      })
      .addCase(fetchCRMRepPerformance.fulfilled, (state, action) => {
        state.loading = false;
        state.crmRepPerformance = { ...action.payload, isLoading: false } as any;
        state.error = null;
      })
      .addCase(fetchCRMRepPerformance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch CRM rep performance';
        if (state.crmRepPerformance) (state.crmRepPerformance as any).isLoading = false;
      });

    // Employee granular loading
    builder
      .addCase(fetchEmployeeAll.pending, (state) => {
        state.loading = true;
        state.error = null;
        // handled via response.isLoading
      })
      .addCase(fetchEmployeeAll.fulfilled, (state, action) => {
        state.loading = false;
        state.employeeSummary = action.payload.summary;
        state.employeeTimeUtilization = (action.payload.time_utilization || []).map((p) => ({
          week_start: p.date,
          hours: Number(p.hours || 0)
        }));
        state.topEmployees = action.payload.top_employees || [];
        state.employeeTimeBreakdown = action.payload.employee_time_breakdown || [];
        state.error = null;
        // handled via response.isLoading
      })
      .addCase(fetchEmployeeAll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch employee analytics';
        // handled via response.isLoading
      });

    builder
      .addCase(fetchEmployeeDailyBreakdown.pending, (state) => {
        state.loading = true;
        state.error = null;
        // handled via response.isLoading
      })
      .addCase(fetchEmployeeDailyBreakdown.fulfilled, (state, action) => {
        state.loading = false;
        state.dailyBreakdown = action.payload.daily_breakdown || [];
        state.error = null;
        // handled via response.isLoading
      })
      .addCase(fetchEmployeeDailyBreakdown.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch employee daily breakdown';
        // handled via response.isLoading
      });

    builder
      .addCase(fetchCompanyProfile.pending, (state) => {
        state.companyProfileLoading = true;
        state.companyProfileError = null;
      })
      .addCase(fetchCompanyProfile.fulfilled, (state, action) => {
        state.companyProfileLoading = false;
        state.companyProfile = action.payload;
        state.companyProfileError = null;
      })
      .addCase(fetchCompanyProfile.rejected, (state, action) => {
        state.companyProfileLoading = false;
        state.companyProfileError = action.error.message || 'Failed to fetch company profile';
      });

    builder
      .addCase(generateCompanyProfile.pending, (state) => {
        state.companyProfileLoading = true;
        state.companyProfileError = null;
      })
      .addCase(generateCompanyProfile.fulfilled, (state, action) => {
        state.companyProfileLoading = false;
        state.companyProfile = action.payload;
        state.companyProfileError = null;
      })
      .addCase(generateCompanyProfile.rejected, (state, action) => {
        state.companyProfileLoading = false;
        state.companyProfileError = action.error.message || 'Failed to generate company profile';
      });

    builder
      .addCase(updateCompanyProfile.pending, (state) => {
        state.companyProfileLoading = true;
        state.companyProfileError = null;
      })
      .addCase(updateCompanyProfile.fulfilled, (state, action) => {
        state.companyProfileLoading = false;
        state.companyProfile = action.payload;
        state.companyProfileError = null;
      })
      .addCase(updateCompanyProfile.rejected, (state, action) => {
        state.companyProfileLoading = false;
        state.companyProfileError = action.error.message || 'Failed to update company profile';
      });

    builder
      .addCase(fetchSupplierRisk.pending, (state) => {
        state.supplierRiskLoading = true;
        state.supplierRiskError = null;
      })
      .addCase(fetchSupplierRisk.fulfilled, (state, action) => {
        state.supplierRiskLoading = false;
        state.supplierRisk = action.payload;
        state.supplierRiskError = null;
      })
      .addCase(fetchSupplierRisk.rejected, (state, action) => {
        state.supplierRiskLoading = false;
        state.supplierRiskError = action.error.message || 'Failed to fetch supplier risk';
      });

    builder
      .addCase(generateSupplierRisk.pending, (state) => {
        state.supplierRiskLoading = true;
        state.supplierRiskError = null;
      })
      .addCase(generateSupplierRisk.fulfilled, (state, action) => {
        state.supplierRiskLoading = false;
        state.supplierRisk = action.payload;
        state.supplierRiskError = null;
      })
      .addCase(generateSupplierRisk.rejected, (state, action) => {
        state.supplierRiskLoading = false;
        state.supplierRiskError = action.error.message || 'Failed to generate supplier risk';
      });

    builder
      .addCase(fetchOverstock.pending, (state) => {
        state.overstockLoading = true;
        state.overstockError = null;
      })
      .addCase(fetchOverstock.fulfilled, (state, action) => {
        state.overstockLoading = false;
        state.overstock = action.payload;
        state.overstockError = null;
      })
      .addCase(fetchOverstock.rejected, (state, action) => {
        state.overstockLoading = false;
        state.overstockError = action.error.message || 'Failed to fetch overstock';
      });

    builder
      .addCase(generateOverstock.pending, (state) => {
        state.overstockLoading = true;
        state.overstockError = null;
      })
      .addCase(generateOverstock.fulfilled, (state, action) => {
        state.overstockLoading = false;
        state.overstock = action.payload;
        state.overstockError = null;
      })
      .addCase(generateOverstock.rejected, (state, action) => {
        state.overstockLoading = false;
        state.overstockError = action.error.message || 'Failed to generate overstock';
      });
  }
});

export const { setFilters, clearFilters, clearError } = analyticsSlice.actions;
export default analyticsSlice.reducer;
