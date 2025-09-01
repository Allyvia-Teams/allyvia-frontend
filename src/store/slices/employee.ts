// Employee Redux Store Slice
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Employee, CreateEmployeeData, UpdateEmployeeData, CSVRow, ImportSummary, ImportResult } from 'types/employee';
import { employeeAPI, csvImportService } from 'api/employee';

// Async thunks
export const fetchEmployees = createAsyncThunk('employee/fetchEmployees', async (_, { rejectWithValue }) => {
  try {
    const employees = await employeeAPI.getEmployees();
    return employees;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch employees');
  }
});

export const createEmployee = createAsyncThunk('employee/createEmployee', async (employeeData: CreateEmployeeData, { rejectWithValue }) => {
  try {
    const employee = await employeeAPI.createEmployee(employeeData);
    return employee;
  } catch (error: any) {
    console.log('Redux: createEmployee.rejected called with error:', error);
    return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create employee');
  }
});

export const updateEmployee = createAsyncThunk(
  'employee/updateEmployee',
  async ({ id, data }: { id: string; data: UpdateEmployeeData }, { rejectWithValue }) => {
    try {
      const employee = await employeeAPI.updateEmployee(id, data);
      return employee;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update employee');
    }
  }
);

export const deleteEmployee = createAsyncThunk('employee/deleteEmployee', async (id: string, { rejectWithValue }) => {
  try {
    await employeeAPI.deleteEmployee(id);
    return id;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete employee');
  }
});

export const importEmployeesFromCSV = createAsyncThunk(
  'employee/importEmployeesFromCSV',
  async ({ file, companyId }: { file: File; companyId: string }, { rejectWithValue }) => {
    try {
      // Parse CSV
      const csvData = await csvImportService.parseCSV(file);

      // Validate data
      const validation = await csvImportService.validateCSVData(csvData);

      if (validation.errors.length > 0) {
        return rejectWithValue({ type: 'validation', errors: validation.errors });
      }

      // Import employees
      const summary = await csvImportService.importEmployees(validation.valid);

      // Get successful employees for state update
      const successfulEmployees = summary.results.filter((result) => result.success && result.employee).map((result) => result.employee!);

      return { summary, successfulEmployees };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to import employees');
    }
  }
);

// State interface
interface EmployeeState {
  allEmployees: Employee[]; // All employees from API (unfiltered)
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
      });
  }
});

// Export actions
export const {
  clearError,
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
  addEmployees
} = employeeSlice.actions;

// Export reducer
export default employeeSlice.reducer;
