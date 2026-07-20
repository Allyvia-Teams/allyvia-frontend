// Employee Redux Store Slice
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Employee, CreateEmployeeData, UpdateEmployeeData, ImportSummary, ImportResult, EmployeeListItem } from 'types/employee';
import {
  employeeAPI,
  csvImportService,
  clockIn,
  clockOut,
  getMyTimeEntries,
  getTimeEntries,
  getAllEmployeesTimeEntries,
  getCurrentUserClockStatus,
  TimeEntry
} from 'api/employee.api';
import { deleteTimeEntry } from 'api/employee.api';

// Async thunks
export const fetchEmployees = createAsyncThunk('employee/fetchEmployees', async (_, { rejectWithValue, getState }) => {
  try {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const selectedCompanyId = currentRole?.company_id; // This is the currently selected company from CompanySelector

    if (!selectedCompanyId) {
      return rejectWithValue('No company selected');
    }

    const employees = await employeeAPI.getEmployees(selectedCompanyId);
    return employees;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch employees');
  }
});

export const createEmployee = createAsyncThunk(
  'employee/createEmployee',
  async (employeeData: CreateEmployeeData, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const currentRole = state.auth?.currentRole;
      const selectedCompanyId = currentRole?.company_id;

      if (!selectedCompanyId) {
        return rejectWithValue('No company selected');
      }

      const employee = await employeeAPI.createEmployee(employeeData, selectedCompanyId);
      return employee;
    } catch (error: any) {
      // Handle API error responses more specifically
      if (error.response?.data?.email) {
        // Handle email validation errors from API
        return rejectWithValue(error.response.data.email[0] || 'Email validation failed');
      } else if (error.response?.data?.detail) {
        // Handle general API error messages
        return rejectWithValue(error.response.data.detail);
      } else if (error.response?.data?.message) {
        // Handle custom error messages
        return rejectWithValue(error.response.data.message);
      } else if (error.response?.data) {
        // Handle any other API error response
        const errorMessage = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
        return rejectWithValue(errorMessage);
      } else {
        // Fallback to generic error
        return rejectWithValue(error.message || 'Failed to create employee');
      }
    }
  }
);

export const updateEmployee = createAsyncThunk(
  'employee/updateEmployee',
  async ({ id, data }: { id: string; data: UpdateEmployeeData }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const currentRole = state.auth?.currentRole;
      const selectedCompanyId = currentRole?.company_id;

      if (!selectedCompanyId) {
        return rejectWithValue('No company selected');
      }

      const employee = await employeeAPI.patchEmployee(id, data, selectedCompanyId);
      return employee;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update employee');
    }
  }
);

export const deleteEmployee = createAsyncThunk('employee/deleteEmployee', async (id: string, { rejectWithValue, getState }) => {
  try {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const selectedCompanyId = currentRole?.company_id;

    if (!selectedCompanyId) {
      return rejectWithValue('No company selected');
    }

    await employeeAPI.deleteEmployee(id, selectedCompanyId);
    return id;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete employee');
  }
});

export const importEmployeesFromCSV = createAsyncThunk(
  'employee/importEmployeesFromCSV',
  async ({ file }: { file: File }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const currentRole = state.auth?.currentRole;
      const selectedCompanyId = currentRole?.company_id;

      if (!selectedCompanyId) {
        return rejectWithValue('No company selected');
      }

      // Parse CSV
      const csvData = await csvImportService.parseCSV(file);

      // Validate data
      const validation = await csvImportService.validateCSVData(csvData);

      if (validation.errors.length > 0) {
        return rejectWithValue({ type: 'validation', errors: validation.errors });
      }

      // Import employees
      const summary = await csvImportService.importEmployees(validation.valid, selectedCompanyId);

      // Get successful employees for state update
      const successfulEmployees = summary.results.filter((result) => result.success && result.employee).map((result) => result.employee!);

      return { summary, successfulEmployees };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to import employees');
    }
  }
);

// Clock In/Out Thunks
export const clockInEmployee = createAsyncThunk(
  'employee/clockIn',
  async (data: { employee_id?: string; company_id?: string } = {}, { rejectWithValue }) => {
    try {
      const response = await clockIn(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Clock-in failed');
    }
  }
);

export const clockOutEmployee = createAsyncThunk(
  'employee/clockOut',
  async ({ note, data }: { note?: string; data?: { employee_id?: string; company_id?: string } }, { rejectWithValue }) => {
    try {
      const response = await clockOut(note, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Clock-out failed');
    }
  }
);

export const fetchTimeEntries = createAsyncThunk(
  'employee/fetchTimeEntries',
  async (params: { employee_id?: string; start?: string; end?: string; open?: boolean }, { rejectWithValue }) => {
    try {
      const response = await getMyTimeEntries(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch time entries');
    }
  }
);

export const fetchEmployeeTimeEntries = createAsyncThunk(
  'employee/fetchEmployeeTimeEntries',
  async (params: { employee_id: string; start?: string; end?: string }, { rejectWithValue }) => {
    try {
      const response = await getTimeEntries(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch employee time entries');
    }
  }
);

export const fetchAllEmployeesTimeEntries = createAsyncThunk(
  'employee/fetchAllEmployeesTimeEntries',
  async (params: { start?: string; end?: string } = {}, { rejectWithValue }) => {
    try {
      const response = await getAllEmployeesTimeEntries(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch all employees time entries');
    }
  }
);

// Admin delete time entry
export const deleteTimeEntryAsync = createAsyncThunk('employee/deleteTimeEntry', async (id: number, { rejectWithValue }) => {
  try {
    await deleteTimeEntry(id);
    return id;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete time entry');
  }
});

export const fetchCurrentUserClockStatus = createAsyncThunk(
  'employee/fetchCurrentUserClockStatus',
  async (employee_id: string | undefined = undefined, { rejectWithValue }) => {
    try {
      const response = await getCurrentUserClockStatus(employee_id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch current user clock status');
    }
  }
);

// State interface
interface EmployeeState {
  allEmployees: EmployeeListItem[]; // All employees from API (unfiltered)
  loading: boolean;
  error: string | null;
  selectedEmployee: Employee | null;
  csvImport: {
    status: 'idle' | 'uploading' | 'validating' | 'importing' | 'completed' | 'error';
    progress: number;
    totalRows: number;
    currentRow: number;
    results: ImportResult[];
    summary: ImportSummary | null;
    errors: string[];
  };
  // Time tracking state
  timeTracking: {
    currentEntry: TimeEntry | null;
    currentUserEntry: TimeEntry | null; // Current user's active clock (separate from selected employee)
    timeEntries: TimeEntry[];
    loading: boolean;
    error: string | null;
  };
  // Modal states
  isEditModalOpen: boolean;
  isDetailModalOpen: boolean;
  isCSVImportModalOpen: boolean;
}

// Initial state
const initialState: EmployeeState = {
  allEmployees: [],
  loading: false,
  error: null,
  selectedEmployee: null,
  csvImport: {
    status: 'idle',
    progress: 0,
    totalRows: 0,
    currentRow: 0,
    results: [],
    summary: null,
    errors: []
  },
  timeTracking: {
    currentEntry: null,
    currentUserEntry: null,
    timeEntries: [],
    loading: false,
    error: null
  },
  isEditModalOpen: false,
  isDetailModalOpen: false,
  isCSVImportModalOpen: false
};

// Employee slice
const employeeSlice = createSlice({
  name: 'employee',
  initialState,
  reducers: {
    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Set selected employee
    setSelectedEmployee: (state, action: PayloadAction<Employee | null>) => {
      state.selectedEmployee = action.payload;
    },

    // Modal state management
    openEditModal: (state, action: PayloadAction<Employee>) => {
      state.selectedEmployee = action.payload;
      state.isEditModalOpen = true;
    },

    closeEditModal: (state) => {
      state.isEditModalOpen = false;
      state.selectedEmployee = null;
    },

    openDetailModal: (state, action: PayloadAction<Employee>) => {
      state.selectedEmployee = action.payload;
      state.isDetailModalOpen = true;
    },

    closeDetailModal: (state) => {
      state.isDetailModalOpen = false;
      state.selectedEmployee = null;
    },

    openCSVImportModal: (state) => {
      state.isCSVImportModalOpen = true;
      state.csvImport.status = 'idle';
      state.csvImport.progress = 0;
      state.csvImport.errors = [];
    },

    closeCSVImportModal: (state) => {
      state.isCSVImportModalOpen = false;
      state.csvImport.status = 'idle';
      state.csvImport.progress = 0;
      state.csvImport.errors = [];
    },

    // CSV import progress
    setCSVImportProgress: (state, action: PayloadAction<{ current: number; total: number }>) => {
      state.csvImport.currentRow = action.payload.current;
      state.csvImport.totalRows = action.payload.total;
      state.csvImport.progress = (action.payload.current / action.payload.total) * 100;
    },

    // Add single employee (for optimistic updates)
    addEmployee: (state, action: PayloadAction<Employee>) => {
      state.allEmployees.push(action.payload);
    },

    // Update single employee (for optimistic updates)
    updateEmployeeInState: (state, action: PayloadAction<Employee>) => {
      const index = state.allEmployees.findIndex((emp) => emp.id === action.payload.id);
      if (index !== -1) {
        state.allEmployees[index] = action.payload;
      }
    },

    // Remove single employee (for optimistic updates)
    removeEmployee: (state, action: PayloadAction<string>) => {
      state.allEmployees = state.allEmployees.filter((emp) => emp.id !== action.payload);
    },

    // Add multiple employees (for CSV import)
    addEmployees: (state, action: PayloadAction<Employee[]>) => {
      state.allEmployees.push(...action.payload);
    },

    // Clear all employees (when switching companies)
    clearEmployees: (state) => {
      state.allEmployees = [];
      state.loading = false;
      state.error = null;
    },

    // Time tracking actions
    clearTimeTrackingError: (state) => {
      state.timeTracking.error = null;
    },

    setCurrentTimeEntry: (state, action: PayloadAction<TimeEntry | null>) => {
      state.timeTracking.currentEntry = action.payload;
    },

    setCurrentUserEntry: (state, action: PayloadAction<TimeEntry | null>) => {
      state.timeTracking.currentUserEntry = action.payload;
    },

    clearTimeTracking: (state) => {
      state.timeTracking.currentEntry = null;
      state.timeTracking.timeEntries = [];
      state.timeTracking.loading = false;
      state.timeTracking.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch employees
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.allEmployees = action.payload;
        state.error = null;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Create employee
      .addCase(createEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.allEmployees.push(action.payload);
        state.error = null;
      })
      .addCase(createEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update employee
      .addCase(updateEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.allEmployees.findIndex((emp) => emp.id === action.payload.id);
        if (index !== -1) {
          state.allEmployees[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Delete employee
      .addCase(deleteEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.allEmployees = state.allEmployees.filter((emp) => emp.id !== action.payload);
        state.error = null;
      })
      .addCase(deleteEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // CSV import
      .addCase(importEmployeesFromCSV.pending, (state) => {
        state.csvImport.status = 'importing';
        state.csvImport.errors = [];
        state.error = null;
      })
      .addCase(importEmployeesFromCSV.fulfilled, (state, action) => {
        state.csvImport.status = 'completed';
        state.csvImport.summary = action.payload.summary;
        state.csvImport.results = action.payload.summary.results;
        // Add successful employees to state
        state.allEmployees.push(...action.payload.successfulEmployees);
        state.error = null;
      })
      .addCase(importEmployeesFromCSV.rejected, (state, action) => {
        state.csvImport.status = 'error';
        if (action.payload && typeof action.payload === 'object' && 'errors' in action.payload) {
          state.csvImport.errors = (action.payload as any).errors;
        } else {
          state.csvImport.errors = [action.payload as string];
        }
        state.error = action.payload as string;
      })

      // Clock In
      .addCase(clockInEmployee.pending, (state) => {
        state.timeTracking.loading = true;
        state.timeTracking.error = null;
      })
      .addCase(clockInEmployee.fulfilled, (state, action) => {
        state.timeTracking.loading = false;
        state.timeTracking.currentEntry = action.payload;
        state.timeTracking.error = null;
      })
      .addCase(clockInEmployee.rejected, (state, action) => {
        state.timeTracking.loading = false;
        state.timeTracking.error = action.payload as string;
      })

      // Clock Out
      .addCase(clockOutEmployee.pending, (state) => {
        state.timeTracking.loading = true;
        state.timeTracking.error = null;
      })
      .addCase(clockOutEmployee.fulfilled, (state, action) => {
        state.timeTracking.loading = false;
        state.timeTracking.currentEntry = action.payload;
        // If this is the current user's clock out (no employee_id), also set currentUserEntry
        if (!action.payload.employee) {
          state.timeTracking.currentUserEntry = action.payload;
        }
        state.timeTracking.error = null;
      })
      .addCase(clockOutEmployee.rejected, (state, action) => {
        state.timeTracking.loading = false;
        state.timeTracking.error = action.payload as string;
      })

      // Fetch Time Entries
      .addCase(fetchTimeEntries.pending, (state) => {
        state.timeTracking.loading = true;
        state.timeTracking.error = null;
      })
      .addCase(fetchTimeEntries.fulfilled, (state, action) => {
        state.timeTracking.loading = false;
        state.timeTracking.timeEntries = action.payload;
        // Set current entry if there's an open one
        state.timeTracking.currentEntry = action.payload.find((entry: any) => !entry.clock_out) || null;
        // Also set current user entry (this is for the logged-in user's own timesheet)
        state.timeTracking.currentUserEntry = action.payload.find((entry: any) => !entry.clock_out) || null;
        state.timeTracking.error = null;
      })
      .addCase(fetchTimeEntries.rejected, (state, action) => {
        state.timeTracking.loading = false;
        state.timeTracking.error = action.payload as string;
      })

      // Fetch Employee Time Entries
      .addCase(fetchEmployeeTimeEntries.pending, (state) => {
        state.timeTracking.loading = true;
        state.timeTracking.error = null;
      })
      .addCase(fetchEmployeeTimeEntries.fulfilled, (state, action) => {
        state.timeTracking.loading = false;
        state.timeTracking.timeEntries = action.payload;
        state.timeTracking.error = null;
      })
      .addCase(fetchEmployeeTimeEntries.rejected, (state, action) => {
        state.timeTracking.loading = false;
        state.timeTracking.error = action.payload as string;
      })

      // Fetch All Employees Time Entries
      .addCase(fetchAllEmployeesTimeEntries.pending, (state) => {
        state.timeTracking.loading = true;
        state.timeTracking.error = null;
      })
      .addCase(fetchAllEmployeesTimeEntries.fulfilled, (state, action) => {
        state.timeTracking.loading = false;
        state.timeTracking.timeEntries = action.payload;
        state.timeTracking.error = null;
      })
      .addCase(fetchAllEmployeesTimeEntries.rejected, (state, action) => {
        state.timeTracking.loading = false;
        state.timeTracking.error = action.payload as string;
      })

      // Delete time entry (admin)
      .addCase(deleteTimeEntryAsync.fulfilled, (state, action) => {
        const id = action.payload as number;
        state.timeTracking.timeEntries = state.timeTracking.timeEntries.filter((e) => e.id !== id);
        if (state.timeTracking.currentEntry?.id === id) state.timeTracking.currentEntry = null;
        if (state.timeTracking.currentUserEntry?.id === id) state.timeTracking.currentUserEntry = null;
      })
      .addCase(deleteTimeEntryAsync.rejected, (state, action) => {
        state.timeTracking.error = action.payload as string;
      })

      // Fetch Current User Clock Status
      .addCase(fetchCurrentUserClockStatus.pending, (state) => {
        state.timeTracking.loading = true;
        state.timeTracking.error = null;
      })
      .addCase(fetchCurrentUserClockStatus.fulfilled, (state, action) => {
        state.timeTracking.loading = false;
        state.timeTracking.currentUserEntry = action.payload;
        state.timeTracking.error = null;
      })
      .addCase(fetchCurrentUserClockStatus.rejected, (state, action) => {
        state.timeTracking.loading = false;
        state.timeTracking.error = action.payload as string;
      });
  }
});

// Export actions
export const {
  clearError,
  clearEmployees,
  setSelectedEmployee,
  openEditModal,
  closeEditModal,
  openDetailModal,
  closeDetailModal,
  openCSVImportModal,
  closeCSVImportModal,
  setCSVImportProgress,
  addEmployee,
  updateEmployeeInState,
  removeEmployee,
  addEmployees,
  clearTimeTrackingError,
  setCurrentTimeEntry,
  setCurrentUserEntry,
  clearTimeTracking
} = employeeSlice.actions;

// Export reducer
export default employeeSlice.reducer;
