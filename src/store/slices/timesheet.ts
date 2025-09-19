// Timesheet Redux Slice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosServices from '../../utils/axios';
import { TimeEntry } from 'api/employee.api';
export interface TimesheetData {
  entries: TimeEntry[];
  weekStartISO: string;
}

interface TimesheetState {
  data: TimesheetData | null;
  loading: boolean;
  error: string | null;
}

const initialState: TimesheetState = {
  data: null,
  loading: false,
  error: null
};

export const fetchTimesheet = createAsyncThunk(
  'timesheet/fetch',
  async (params: { weekStartISO: string; employeeId?: string }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const currentRole = state.auth?.currentRole;
      const companyId = currentRole?.company_id;
      const roleType = currentRole?.role_type;

      if (!companyId) {
        return rejectWithValue('No company selected');
      }

      const queryParams: any = {
        start: params.weekStartISO.split('T')[0], // Convert to YYYY-MM-DD format
        end: new Date(new Date(params.weekStartISO).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      // Use the correct endpoint based on user role
      let endpoint: string;
      if (roleType === 'admin') {
        // Admin can use /employee/time-entries (admin endpoint)
        endpoint = '/employee/time-entries';
        if (params.employeeId) {
          queryParams.employee_id = params.employeeId;
        }
      } else {
        // Members should use /employee/time-entries/me (their own entries)
        endpoint = '/employee/time-entries/me';
        // For members, we can optionally pass employee_id if they want to view a specific employee's entries
        if (params.employeeId) {
          queryParams.employee_id = params.employeeId;
        }
      }

      const { data } = await axiosServices.get(endpoint, { params: queryParams });
      return {
        entries: data,
        weekStartISO: params.weekStartISO
      } as TimesheetData;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch timesheet');
    }
  }
);

const timesheetSlice = createSlice({
  name: 'timesheet',
  initialState,
  reducers: {
    resetTimesheet(state) {
      state.data = null;
      state.loading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTimesheet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTimesheet.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchTimesheet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Error fetching timesheet';
      });
  }
});

export const { resetTimesheet } = timesheetSlice.actions;
export default timesheetSlice.reducer;
