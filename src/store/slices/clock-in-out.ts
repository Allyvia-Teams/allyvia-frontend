// Clock In/Out Redux Slice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosServices from '../../utils/axios';

export interface ClockStatus {
  id: number;
  employee: string;
  clock_in: string;
  clock_out: string | null;
  duration_seconds: number | null;
  source: string;
  note: string;
  created_at: string;
  updated_at: string;
}

interface ClockInOutState {
  status: ClockStatus | null;
  loading: boolean;
  error: string | null;
  selectedEmployeeId: string | null; // admin-only selection
}

const initialState: ClockInOutState = {
  status: null,
  loading: false,
  error: null,
  selectedEmployeeId: null
};

export const fetchClockStatus = createAsyncThunk(
  'clockInOut/fetchStatus',
  async (employeeId: string | 'self', { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const currentRole = state.auth?.currentRole;
      const companyId = currentRole?.company_id;

      if (!companyId) {
        return rejectWithValue('No company selected');
      }

      const params = employeeId === 'self' ? {} : { employee_id: employeeId };
      const { data } = await axiosServices.get('/employee/time-entries/current-status', { params });
      try {
        console.log('[CLOCK] fetchStatus result', { employeeId, result: data });
      } catch {}
      return data as ClockStatus | null;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch clock status');
    }
  }
);

export const clockIn = createAsyncThunk(
  'clockInOut/clockIn',
  async ({ employeeId, note }: { employeeId: string | 'self'; note?: string }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const currentRole = state.auth?.currentRole;
      const companyId = currentRole?.company_id;

      if (!companyId) {
        return rejectWithValue('No company selected');
      }

      // Use the correct API endpoint from documentation
      const requestBody: any = {};
      if (employeeId !== 'self') {
        requestBody.employee_id = employeeId;
      }
      if (note) {
        requestBody.note = note;
      }

      try {
        console.log('[CLOCK] clockIn request', { employeeId, note, requestBody });
      } catch {}
      const { data } = await axiosServices.post('/employee/time-entries/clock-in', requestBody);
      try {
        console.log('[CLOCK] clockIn response', data);
      } catch {}
      return data as ClockStatus;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to clock in');
    }
  }
);

export const clockOut = createAsyncThunk(
  'clockInOut/clockOut',
  async ({ employeeId, note }: { employeeId: string | 'self'; note?: string }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const currentRole = state.auth?.currentRole;
      const companyId = currentRole?.company_id;

      if (!companyId) {
        return rejectWithValue('No company selected');
      }

      // Use the correct API endpoint from documentation
      const requestBody: any = {};
      if (employeeId !== 'self') {
        requestBody.employee_id = employeeId;
      }
      if (note) {
        requestBody.note = note;
      }

      try {
        console.log('[CLOCK] clockOut request', { employeeId, note, requestBody });
      } catch {}
      const { data } = await axiosServices.post('/employee/time-entries/clock-out', requestBody);
      try {
        console.log('[CLOCK] clockOut response', data);
      } catch {}
      return data as ClockStatus;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to clock out');
    }
  }
);

const clockInOutSlice = createSlice({
  name: 'clockInOut',
  initialState,
  reducers: {
    setSelectedEmployeeId(state, action) {
      state.selectedEmployeeId = action.payload;
      if (action.payload) {
        localStorage.setItem('sel_employee', action.payload);
      } else {
        localStorage.removeItem('sel_employee');
      }
    },
    restoreSelectedEmployeeId(state) {
      const stored = localStorage.getItem('sel_employee');
      state.selectedEmployeeId = stored ?? null;
    },
    resetClockState(state) {
      state.status = null;
      state.loading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch clock status
      .addCase(fetchClockStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClockStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload;
      })
      .addCase(fetchClockStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Error fetching clock status';
      })

      // Clock in
      .addCase(clockIn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(clockIn.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload;
      })
      .addCase(clockIn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Error clocking in';
      })

      // Clock out
      .addCase(clockOut.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(clockOut.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload;
      })
      .addCase(clockOut.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Error clocking out';
      });
  }
});

export const { setSelectedEmployeeId, restoreSelectedEmployeeId, resetClockState } = clockInOutSlice.actions;
export default clockInOutSlice.reducer;
