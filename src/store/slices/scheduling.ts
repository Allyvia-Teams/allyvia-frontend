import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  getAvailability,
  getAvailabilityExceptions,
  getForecast,
  getRecommendationDetail,
  getRecommendations,
  getStaffRoles,
  getTemplateDetail,
  getTemplates
} from 'api/scheduling.api';
import {
  AvailabilityException,
  AvailabilitySlot,
  ForecastRow,
  PaginationInfo,
  ScheduleRecommendation,
  ScheduleTemplate,
  StaffRole
} from 'types/scheduling';

interface SchedulingState {
  roles: StaffRole[];
  templates: ScheduleTemplate[];
  currentTemplate: ScheduleTemplate | null;
  availability: AvailabilitySlot[];
  exceptions: AvailabilityException[];
  recommendations: ScheduleRecommendation[];
  recommendationsPagination: PaginationInfo | null;
  currentRecommendation: ScheduleRecommendation | null;
  forecast: ForecastRow[];
  forecastWeek: string | null;
  loading: boolean;
  detailLoading: boolean;
  error: string | null;
}

const initialState: SchedulingState = {
  roles: [],
  templates: [],
  currentTemplate: null,
  availability: [],
  exceptions: [],
  recommendations: [],
  recommendationsPagination: null,
  currentRecommendation: null,
  forecast: [],
  forecastWeek: null,
  loading: false,
  detailLoading: false,
  error: null
};

const errorMessage = (error: any): string =>
  error?.response?.data?.error || error?.response?.data?.detail || error?.message || 'Request failed';

export const fetchStaffRoles = createAsyncThunk('scheduling/fetchStaffRoles', async (_, { rejectWithValue }) => {
  try {
    return (await getStaffRoles()).items;
  } catch (error) {
    return rejectWithValue(errorMessage(error));
  }
});

export const fetchTemplates = createAsyncThunk('scheduling/fetchTemplates', async (_, { rejectWithValue }) => {
  try {
    return (await getTemplates()).items;
  } catch (error) {
    return rejectWithValue(errorMessage(error));
  }
});

export const fetchTemplateDetail = createAsyncThunk('scheduling/fetchTemplateDetail', async (templateId: number, { rejectWithValue }) => {
  try {
    return await getTemplateDetail(templateId);
  } catch (error) {
    return rejectWithValue(errorMessage(error));
  }
});

export const fetchAvailability = createAsyncThunk(
  'scheduling/fetchAvailability',
  async (employeeId: string | undefined, { rejectWithValue }) => {
    try {
      return (await getAvailability(employeeId)).items;
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const fetchAvailabilityExceptions = createAsyncThunk(
  'scheduling/fetchAvailabilityExceptions',
  async (employeeId: string | undefined, { rejectWithValue }) => {
    try {
      return (await getAvailabilityExceptions(employeeId)).items;
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const fetchRecommendations = createAsyncThunk(
  'scheduling/fetchRecommendations',
  async (params: { status?: string; page?: number } | undefined, { rejectWithValue }) => {
    try {
      return await getRecommendations(params);
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const fetchRecommendationDetail = createAsyncThunk(
  'scheduling/fetchRecommendationDetail',
  async (recommendationId: number, { rejectWithValue }) => {
    try {
      return await getRecommendationDetail(recommendationId);
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const fetchForecast = createAsyncThunk(
  'scheduling/fetchForecast',
  async (params: { weekStart: string; locationId?: string }, { rejectWithValue }) => {
    try {
      const response = await getForecast(params.weekStart, params.locationId || '');
      return { weekStart: params.weekStart, items: response.items };
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  }
);

const scheduling = createSlice({
  name: 'scheduling',
  initialState,
  reducers: {
    clearCurrentRecommendation(state) {
      state.currentRecommendation = null;
      state.forecast = [];
    },
    setCurrentTemplate(state, action: PayloadAction<ScheduleTemplate | null>) {
      state.currentTemplate = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStaffRoles.fulfilled, (state, action) => {
        state.roles = action.payload;
      })
      .addCase(fetchTemplates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.loading = false;
        state.templates = action.payload;
      })
      .addCase(fetchTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchTemplateDetail.fulfilled, (state, action) => {
        state.currentTemplate = action.payload;
      })
      .addCase(fetchTemplateDetail.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(fetchAvailability.fulfilled, (state, action) => {
        state.availability = action.payload;
      })
      .addCase(fetchAvailabilityExceptions.fulfilled, (state, action) => {
        state.exceptions = action.payload;
      })
      .addCase(fetchRecommendations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecommendations.fulfilled, (state, action) => {
        state.loading = false;
        state.recommendations = action.payload.items;
        state.recommendationsPagination = action.payload.pagination;
      })
      .addCase(fetchRecommendations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchRecommendationDetail.pending, (state) => {
        state.detailLoading = true;
      })
      .addCase(fetchRecommendationDetail.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.currentRecommendation = action.payload;
      })
      .addCase(fetchRecommendationDetail.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchForecast.fulfilled, (state, action) => {
        state.forecast = action.payload.items;
        state.forecastWeek = action.payload.weekStart;
      });
  }
});

export const { clearCurrentRecommendation, setCurrentTemplate } = scheduling.actions;
export default scheduling.reducer;
