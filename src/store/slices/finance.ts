import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchProfitAndLossSummary,
  fetchCOGSDetail,
  fetchGrossProfitDetail,
  fetchExpenseSummary,
  fetchExpensesByCategory,
  fetchTopExpenses,
  fetchExpenseTrends,
  fetchExpensesByType,
  fetchExpensesByPayee,
  fetchBillsByStatus,
  fetchInvoiceStatistics,
  fetchInvoiceList,
  syncHistoricalInvoices,
  fetchInvoiceAging,
  fetchPaymentSummary,
  fetchPaymentTrends,
  fetchPaymentDetails,
  fetchAccountSummary,
  fetchAccountDetails,
  fetchAccountTrends,
  fetchLedger,
  fetchKPIs,
  fetchSeries,
  fetchEnhancedSeries
} from 'api/finance.api';
import type {
  KPI,
  TimeseriesPoint,
  CategoryAmount,
  InvoiceRow,
  Expense,
  AgingBucket,
  LedgerRow,
  Page,
  ProfitAndLossSummary,
  COGSDetail,
  GrossProfitDetail,
  PaymentSummary,
  PaymentTrend,
  PaymentDetail
} from 'types/finance';

// ============================================================================
// ASYNC THUNKS
// ============================================================================

export const fetchProfitAndLossSummaryAsync = createAsyncThunk(
  'finance/fetchProfitAndLossSummary',
  async (params?: { startDate?: string; endDate?: string }) => {
    const response = await fetchProfitAndLossSummary(params);
    return response;
  }
);

export const fetchCOGSDetailAsync = createAsyncThunk(
  'finance/fetchCOGSDetail',
  async (params?: { startDate?: string; endDate?: string }) => {
    const response = await fetchCOGSDetail(params);
    return response;
  }
);

export const fetchGrossProfitDetailAsync = createAsyncThunk(
  'finance/fetchGrossProfitDetail',
  async (params?: { startDate?: string; endDate?: string }) => {
    const response = await fetchGrossProfitDetail(params);
    return response;
  }
);

export const fetchExpenseSummaryAsync = createAsyncThunk(
  'finance/fetchExpenseSummary',
  async (params?: { startDate?: string; endDate?: string }) => {
    const response = await fetchExpenseSummary(params);
    return response;
  }
);

export const fetchExpensesByCategoryAsync = createAsyncThunk(
  'finance/fetchExpensesByCategory',
  async (params?: { startDate?: string; endDate?: string }) => {
    const response = await fetchExpensesByCategory(params);
    return response;
  }
);

export const fetchTopExpensesAsync = createAsyncThunk(
  'finance/fetchTopExpenses',
  async (params?: { startDate?: string; endDate?: string; limit?: number }) => {
    const response = await fetchTopExpenses(params);
    return response;
  }
);

export const fetchExpenseTrendsAsync = createAsyncThunk(
  'finance/fetchExpenseTrends',
  async (params?: { startDate?: string; endDate?: string }) => {
    const response = await fetchExpenseTrends(params);
    return response;
  }
);

export const fetchExpensesByTypeAsync = createAsyncThunk(
  'finance/fetchExpensesByType',
  async (params?: { startDate?: string; endDate?: string }) => {
    const response = await fetchExpensesByType(params);
    return response;
  }
);

export const fetchExpensesByPayeeAsync = createAsyncThunk(
  'finance/fetchExpensesByPayee',
  async (params?: { startDate?: string; endDate?: string }) => {
    const response = await fetchExpensesByPayee(params);
    return response;
  }
);

export const fetchBillsByStatusAsync = createAsyncThunk(
  'finance/fetchBillsByStatus',
  async (params?: { startDate?: string; endDate?: string }) => {
    const response = await fetchBillsByStatus(params);
    return response;
  }
);

export const fetchInvoiceStatisticsAsync = createAsyncThunk(
  'finance/fetchInvoiceStatistics',
  async (params?: { startDate?: string; endDate?: string }) => {
    const response = await fetchInvoiceStatistics(params);
    return response;
  }
);

export const fetchInvoiceListAsync = createAsyncThunk(
  'finance/fetchInvoiceList',
  async (params?: { startDate?: string; endDate?: string; status?: string }) => {
    const response = await fetchInvoiceList(params);
    return response;
  }
);

export const syncHistoricalInvoicesAsync = createAsyncThunk('finance/syncHistoricalInvoices', async (monthsBack: number = 12) => {
  const response = await syncHistoricalInvoices(monthsBack);
  return response;
});

export const fetchInvoiceAgingAsync = createAsyncThunk(
  'finance/fetchInvoiceAging',
  async (params?: { startDate?: string; endDate?: string }) => {
    const response = await fetchInvoiceAging(params);
    return response;
  }
);

export const fetchPaymentSummaryAsync = createAsyncThunk(
  'finance/fetchPaymentSummary',
  async (params?: { startDate?: string; endDate?: string }) => {
    const response = await fetchPaymentSummary(params);
    return response;
  }
);

export const fetchPaymentTrendsAsync = createAsyncThunk(
  'finance/fetchPaymentTrends',
  async (params?: { startDate?: string; endDate?: string }) => {
    const response = await fetchPaymentTrends(params);
    return response;
  }
);

export const fetchPaymentDetailsAsync = createAsyncThunk(
  'finance/fetchPaymentDetails',
  async (params?: { startDate?: string; endDate?: string }) => {
    const response = await fetchPaymentDetails(params);
    return response;
  }
);

export const fetchAccountSummaryAsync = createAsyncThunk(
  'finance/fetchAccountSummary',
  async (params?: { startDate?: string; endDate?: string }) => {
    const response = await fetchAccountSummary(params);
    return response;
  }
);

export const fetchAccountDetailsAsync = createAsyncThunk(
  'finance/fetchAccountDetails',
  async (params?: { startDate?: string; endDate?: string }) => {
    const response = await fetchAccountDetails();
    return response;
  }
);

export const fetchAccountTrendsAsync = createAsyncThunk(
  'finance/fetchAccountTrends',
  async (params?: { startDate?: string; endDate?: string }) => {
    const response = await fetchAccountTrends(params);
    return response;
  }
);

export const fetchLedgerAsync = createAsyncThunk(
  'finance/fetchLedger',
  async (params?: { startDate?: string; endDate?: string; accountType?: string; category?: string }) => {
    const response = await fetchLedger(params);
    return response;
  }
);

export const fetchKPIsAsync = createAsyncThunk('finance/fetchKPIs', async (params?: { startDate?: string; endDate?: string }) => {
  const response = await fetchKPIs(params);
  return response;
});

export const fetchSeriesAsync = createAsyncThunk('finance/fetchSeries', async (params?: { startDate?: string; endDate?: string }) => {
  const response = await fetchSeries(params);
  return response;
});

export const fetchEnhancedSeriesAsync = createAsyncThunk(
  'finance/fetchEnhancedSeries',
  async (params?: { startDate?: string; endDate?: string }) => {
    const response = await fetchEnhancedSeries(params);
    return response;
  }
);

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface FinanceState {
  // Loading states
  loading: {
    profitAndLoss: boolean;
    expenses: boolean;
    invoices: boolean;
    payments: boolean;
    accounts: boolean;
    ledger: boolean;
    kpis: boolean;
    series: boolean;
  };

  // Error states
  errors: {
    profitAndLoss: string | null;
    expenses: string | null;
    invoices: string | null;
    payments: string | null;
    accounts: string | null;
    ledger: string | null;
    kpis: string | null;
    series: string | null;
  };

  // Data
  profitAndLoss: ProfitAndLossSummary | null;
  cogsDetail: COGSDetail | null;
  grossProfitDetail: GrossProfitDetail | null;
  expenseSummary: any;
  expensesByCategory: CategoryAmount[];
  topExpenses: any[];
  expenseTrends: any[];
  expensesByType: any[];
  expensesByPayee: any[];
  billsByStatus: any[];
  invoiceStatistics: any;
  invoiceList: InvoiceRow[];
  invoiceAging: AgingBucket[];
  paymentSummary: PaymentSummary | null;
  paymentTrends: PaymentTrend[];
  paymentDetails: PaymentDetail[];
  accountSummary: any;
  accountDetails: any[];
  accountTrends: any[];
  ledger: LedgerRow[];
  kpis: KPI | null;
  series: TimeseriesPoint[];
  enhancedSeries: any;

  // Filters
  filters: {
    startDate: string | null;
    endDate: string | null;
    status: string | null;
    category: string | null;
    accountType: string | null;
  };
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: FinanceState = {
  loading: {
    profitAndLoss: false,
    expenses: false,
    invoices: false,
    payments: false,
    accounts: false,
    ledger: false,
    kpis: false,
    series: false
  },
  errors: {
    profitAndLoss: null,
    expenses: null,
    invoices: null,
    payments: null,
    accounts: null,
    ledger: null,
    kpis: null,
    series: null
  },
  profitAndLoss: null,
  cogsDetail: null,
  grossProfitDetail: null,
  expenseSummary: null,
  expensesByCategory: [],
  topExpenses: [],
  expenseTrends: [],
  expensesByType: [],
  expensesByPayee: [],
  billsByStatus: [],
  invoiceStatistics: null,
  invoiceList: [],
  invoiceAging: [],
  paymentSummary: null,
  paymentTrends: [],
  paymentDetails: [],
  accountSummary: null,
  accountDetails: [],
  accountTrends: [],
  ledger: [],
  kpis: null,
  series: [],
  enhancedSeries: null,
  filters: {
    startDate: null,
    endDate: null,
    status: null,
    category: null,
    accountType: null
  }
};

// ============================================================================
// SLICE
// ============================================================================

const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<FinanceState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearErrors: (state) => {
      state.errors = initialState.errors;
    },
    clearData: (state) => {
      state.profitAndLoss = null;
      state.cogsDetail = null;
      state.grossProfitDetail = null;
      state.expenseSummary = null;
      state.expensesByCategory = [];
      state.topExpenses = [];
      state.expenseTrends = [];
      state.expensesByType = [];
      state.expensesByPayee = [];
      state.billsByStatus = [];
      state.invoiceStatistics = null;
      state.invoiceList = [];
      state.invoiceAging = [];
      state.paymentSummary = null;
      state.paymentTrends = [];
      state.paymentDetails = [];
      state.accountSummary = null;
      state.accountDetails = [];
      state.accountTrends = [];
      state.ledger = [];
      state.kpis = null;
      state.series = [];
      state.enhancedSeries = null;
    }
  },
  extraReducers: (builder) => {
    // Profit & Loss
    builder
      .addCase(fetchProfitAndLossSummaryAsync.pending, (state) => {
        state.loading.profitAndLoss = true;
        state.errors.profitAndLoss = null;
      })
      .addCase(fetchProfitAndLossSummaryAsync.fulfilled, (state, action) => {
        state.loading.profitAndLoss = false;
        state.profitAndLoss = action.payload;
      })
      .addCase(fetchProfitAndLossSummaryAsync.rejected, (state, action) => {
        state.loading.profitAndLoss = false;
        state.errors.profitAndLoss = action.error.message || 'Failed to fetch profit and loss summary';
      });

    // COGS Detail
    builder
      .addCase(fetchCOGSDetailAsync.pending, (state) => {
        state.loading.profitAndLoss = true;
        state.errors.profitAndLoss = null;
      })
      .addCase(fetchCOGSDetailAsync.fulfilled, (state, action) => {
        state.loading.profitAndLoss = false;
        state.cogsDetail = action.payload;
      })
      .addCase(fetchCOGSDetailAsync.rejected, (state, action) => {
        state.loading.profitAndLoss = false;
        state.errors.profitAndLoss = action.error.message || 'Failed to fetch COGS detail';
      });

    // Gross Profit Detail
    builder
      .addCase(fetchGrossProfitDetailAsync.pending, (state) => {
        state.loading.profitAndLoss = true;
        state.errors.profitAndLoss = null;
      })
      .addCase(fetchGrossProfitDetailAsync.fulfilled, (state, action) => {
        state.loading.profitAndLoss = false;
        state.grossProfitDetail = action.payload;
      })
      .addCase(fetchGrossProfitDetailAsync.rejected, (state, action) => {
        state.loading.profitAndLoss = false;
        state.errors.profitAndLoss = action.error.message || 'Failed to fetch gross profit detail';
      });

    // Expenses
    builder
      .addCase(fetchExpenseSummaryAsync.pending, (state) => {
        state.loading.expenses = true;
        state.errors.expenses = null;
      })
      .addCase(fetchExpenseSummaryAsync.fulfilled, (state, action) => {
        state.loading.expenses = false;
        state.expenseSummary = action.payload;
      })
      .addCase(fetchExpenseSummaryAsync.rejected, (state, action) => {
        state.loading.expenses = false;
        state.errors.expenses = action.error.message || 'Failed to fetch expense summary';
      });

    builder
      .addCase(fetchExpensesByCategoryAsync.pending, (state) => {
        state.loading.expenses = true;
        state.errors.expenses = null;
      })
      .addCase(fetchExpensesByCategoryAsync.fulfilled, (state, action) => {
        state.loading.expenses = false;
        state.expensesByCategory = action.payload;
      })
      .addCase(fetchExpensesByCategoryAsync.rejected, (state, action) => {
        state.loading.expenses = false;
        state.errors.expenses = action.error.message || 'Failed to fetch expenses by category';
      });

    builder
      .addCase(fetchTopExpensesAsync.pending, (state) => {
        state.loading.expenses = true;
        state.errors.expenses = null;
      })
      .addCase(fetchTopExpensesAsync.fulfilled, (state, action) => {
        state.loading.expenses = false;
        state.topExpenses = action.payload;
      })
      .addCase(fetchTopExpensesAsync.rejected, (state, action) => {
        state.loading.expenses = false;
        state.errors.expenses = action.error.message || 'Failed to fetch top expenses';
      });

    builder
      .addCase(fetchExpenseTrendsAsync.pending, (state) => {
        state.loading.expenses = true;
        state.errors.expenses = null;
      })
      .addCase(fetchExpenseTrendsAsync.fulfilled, (state, action) => {
        state.loading.expenses = false;
        state.expenseTrends = action.payload;
      })
      .addCase(fetchExpenseTrendsAsync.rejected, (state, action) => {
        state.loading.expenses = false;
        state.errors.expenses = action.error.message || 'Failed to fetch expense trends';
      });

    // Invoices
    builder
      .addCase(fetchInvoiceStatisticsAsync.pending, (state) => {
        state.loading.invoices = true;
        state.errors.invoices = null;
      })
      .addCase(fetchInvoiceStatisticsAsync.fulfilled, (state, action) => {
        state.loading.invoices = false;
        state.invoiceStatistics = action.payload;
      })
      .addCase(fetchInvoiceStatisticsAsync.rejected, (state, action) => {
        state.loading.invoices = false;
        state.errors.invoices = action.error.message || 'Failed to fetch invoice statistics';
      });

    builder
      .addCase(fetchInvoiceListAsync.pending, (state) => {
        state.loading.invoices = true;
        state.errors.invoices = null;
      })
      .addCase(fetchInvoiceListAsync.fulfilled, (state, action) => {
        state.loading.invoices = false;
        state.invoiceList = action.payload;
      })
      .addCase(fetchInvoiceListAsync.rejected, (state, action) => {
        state.loading.invoices = false;
        state.errors.invoices = action.error.message || 'Failed to fetch invoice list';
      });

    builder
      .addCase(fetchInvoiceAgingAsync.pending, (state) => {
        state.loading.invoices = true;
        state.errors.invoices = null;
      })
      .addCase(fetchInvoiceAgingAsync.fulfilled, (state, action) => {
        state.loading.invoices = false;
        state.invoiceAging = action.payload;
      })
      .addCase(fetchInvoiceAgingAsync.rejected, (state, action) => {
        state.loading.invoices = false;
        state.errors.invoices = action.error.message || 'Failed to fetch invoice aging';
      });

    // Payments
    builder
      .addCase(fetchPaymentSummaryAsync.pending, (state) => {
        state.loading.payments = true;
        state.errors.payments = null;
      })
      .addCase(fetchPaymentSummaryAsync.fulfilled, (state, action) => {
        state.loading.payments = false;
        state.paymentSummary = action.payload;
      })
      .addCase(fetchPaymentSummaryAsync.rejected, (state, action) => {
        state.loading.payments = false;
        state.errors.payments = action.error.message || 'Failed to fetch payment summary';
      });

    builder
      .addCase(fetchPaymentTrendsAsync.pending, (state) => {
        state.loading.payments = true;
        state.errors.payments = null;
      })
      .addCase(fetchPaymentTrendsAsync.fulfilled, (state, action) => {
        state.loading.payments = false;
        state.paymentTrends = action.payload;
      })
      .addCase(fetchPaymentTrendsAsync.rejected, (state, action) => {
        state.loading.payments = false;
        state.errors.payments = action.error.message || 'Failed to fetch payment trends';
      });

    builder
      .addCase(fetchPaymentDetailsAsync.pending, (state) => {
        state.loading.payments = true;
        state.errors.payments = null;
      })
      .addCase(fetchPaymentDetailsAsync.fulfilled, (state, action) => {
        state.loading.payments = false;
        state.paymentDetails = action.payload;
      })
      .addCase(fetchPaymentDetailsAsync.rejected, (state, action) => {
        state.loading.payments = false;
        state.errors.payments = action.error.message || 'Failed to fetch payment details';
      });

    // Accounts
    builder
      .addCase(fetchAccountSummaryAsync.pending, (state) => {
        state.loading.accounts = true;
        state.errors.accounts = null;
      })
      .addCase(fetchAccountSummaryAsync.fulfilled, (state, action) => {
        state.loading.accounts = false;
        state.accountSummary = action.payload;
      })
      .addCase(fetchAccountSummaryAsync.rejected, (state, action) => {
        state.loading.accounts = false;
        state.errors.accounts = action.error.message || 'Failed to fetch account summary';
      });

    builder
      .addCase(fetchAccountDetailsAsync.pending, (state) => {
        state.loading.accounts = true;
        state.errors.accounts = null;
      })
      .addCase(fetchAccountDetailsAsync.fulfilled, (state, action) => {
        state.loading.accounts = false;
        state.accountDetails = action.payload;
      })
      .addCase(fetchAccountDetailsAsync.rejected, (state, action) => {
        state.loading.accounts = false;
        state.errors.accounts = action.error.message || 'Failed to fetch account details';
      });

    builder
      .addCase(fetchAccountTrendsAsync.pending, (state) => {
        state.loading.accounts = true;
        state.errors.accounts = null;
      })
      .addCase(fetchAccountTrendsAsync.fulfilled, (state, action) => {
        state.loading.accounts = false;
        state.accountTrends = action.payload;
      })
      .addCase(fetchAccountTrendsAsync.rejected, (state, action) => {
        state.loading.accounts = false;
        state.errors.accounts = action.error.message || 'Failed to fetch account trends';
      });

    // Ledger
    builder
      .addCase(fetchLedgerAsync.pending, (state) => {
        state.loading.ledger = true;
        state.errors.ledger = null;
      })
      .addCase(fetchLedgerAsync.fulfilled, (state, action) => {
        state.loading.ledger = false;
        // Extract rows from Page wrapper if present
        if (action.payload && typeof action.payload === 'object' && 'rows' in action.payload) {
          state.ledger = action.payload.rows;
        } else {
          state.ledger = action.payload;
        }
      })
      .addCase(fetchLedgerAsync.rejected, (state, action) => {
        state.loading.ledger = false;
        state.errors.ledger = action.error.message || 'Failed to fetch ledger';
      });

    // KPIs
    builder
      .addCase(fetchKPIsAsync.pending, (state) => {
        state.loading.kpis = true;
        state.errors.kpis = null;
      })
      .addCase(fetchKPIsAsync.fulfilled, (state, action) => {
        state.loading.kpis = false;
        state.kpis = action.payload;
      })
      .addCase(fetchKPIsAsync.rejected, (state, action) => {
        state.loading.kpis = false;
        state.errors.kpis = action.error.message || 'Failed to fetch KPIs';
      });

    // Series
    builder
      .addCase(fetchSeriesAsync.pending, (state) => {
        state.loading.series = true;
        state.errors.series = null;
      })
      .addCase(fetchSeriesAsync.fulfilled, (state, action) => {
        state.loading.series = false;
        state.series = action.payload;
      })
      .addCase(fetchSeriesAsync.rejected, (state, action) => {
        state.loading.series = false;
        state.errors.series = action.error.message || 'Failed to fetch series';
      });

    builder
      .addCase(fetchEnhancedSeriesAsync.pending, (state) => {
        state.loading.series = true;
        state.errors.series = null;
      })
      .addCase(fetchEnhancedSeriesAsync.fulfilled, (state, action) => {
        state.loading.series = false;
        state.enhancedSeries = action.payload;
      })
      .addCase(fetchEnhancedSeriesAsync.rejected, (state, action) => {
        state.loading.series = false;
        state.errors.series = action.error.message || 'Failed to fetch enhanced series';
      });
  }
});

// ============================================================================
// EXPORTS
// ============================================================================

export const { setFilters, clearFilters, clearErrors, clearData } = financeSlice.actions;
export default financeSlice.reducer;
