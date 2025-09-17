// Employee API Service
import axiosServices from 'utils/axios';
import { Employee, CreateEmployeeData, UpdateEmployeeData, CSVRow, ImportSummary, EmployeeListItem } from 'types/employee';

// Shift Types
export interface Shift {
  id: string;
  employee: string;
  company: string;
  title?: string;
  starts_at: string;
  ends_at: string;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateShiftRequest {
  employee: string;
  company: string;
  starts_at: string;
  ends_at: string;
  title?: string;
  metadata?: any;
  notes?: string;
}

export interface UpdateShiftRequest {
  employee?: string;
  starts_at?: string;
  ends_at?: string;
  title?: string;
  metadata?: any;
  notes?: string;
}

export interface ShiftFilters {
  start?: string;
  end?: string;
  employee?: string;
  company?: string;
}

export interface MyShiftsFilters {
  start?: string;
  end?: string;
}

export const employeeAPI = {
  // Get all employees (filtered by company via URL parameter)
  getEmployees: async (companyId: string, search?: string): Promise<EmployeeListItem[]> => {
    const params = new URLSearchParams({ company_id: companyId });
    if (search) {
      params.append('search', search);
    }
    const response = await axiosServices.get(`/employee/?${params.toString()}`);
    return response.data;
  },

  // Get single employee by ID
  getEmployee: async (id: string, companyId: string): Promise<Employee> => {
    const response = await axiosServices.get(`/employee/${id}/?company_id=${companyId}`);
    return response.data;
  },

  // Create new employee (company ID sent via URL parameter)
  createEmployee: async (data: CreateEmployeeData, companyId: string): Promise<Employee> => {
    const response = await axiosServices.post(`/employee/?company_id=${companyId}`, data);
    return response.data;
  },

  // Update employee (full update)
  updateEmployee: async (id: string, data: UpdateEmployeeData, companyId: string): Promise<Employee> => {
    const response = await axiosServices.put(`/employee/${id}/?company_id=${companyId}`, data);
    return response.data;
  },

  // Partial update employee
  patchEmployee: async (id: string, data: UpdateEmployeeData, companyId: string): Promise<Employee> => {
    const response = await axiosServices.patch(`/employee/${id}/?company_id=${companyId}`, data);
    return response.data;
  },

  // Delete/deactivate employee
  deleteEmployee: async (id: string, companyId: string): Promise<void> => {
    await axiosServices.delete(`/employee/${id}/?company_id=${companyId}`);
  }
};

// CSV Import Service
export const csvImportService = {
  // Parse CSV file
  parseCSV: async (file: File): Promise<CSVRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const csvText = event.target?.result as string;
          const lines = csvText.split('\n');
          const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

          // Validate required columns
          const requiredColumns = ['first_name', 'last_name', 'email'];
          const missingColumns = requiredColumns.filter((col) => !headers.includes(col));

          if (missingColumns.length > 0) {
            reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
            return;
          }

          const rows: CSVRow[] = [];

          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
              const values = lines[i].split(',').map((v) => v.trim());
              const row: CSVRow = {
                first_name: values[headers.indexOf('first_name')] || '',
                last_name: values[headers.indexOf('last_name')] || '',
                email: values[headers.indexOf('email')] || '',
                phone: values[headers.indexOf('phone')] || '',
                title: values[headers.indexOf('title')] || '',
                address: values[headers.indexOf('address')] || '',
                status: (values[headers.indexOf('status')] as 'active' | 'inactive') || 'active'
              };

              // Validate row data
              if (row.first_name && row.last_name && row.email) {
                rows.push(row);
              }
            }
          }

          resolve(rows);
        } catch (error) {
          reject(new Error('Failed to parse CSV file'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },

  // Validate CSV data
  validateCSVData: async (data: CSVRow[]): Promise<{ valid: CSVRow[]; errors: string[] }> => {
    const valid: CSVRow[] = [];
    const errors: string[] = [];

    data.forEach((row, index) => {
      const rowErrors: string[] = [];

      if (!row.first_name) rowErrors.push('First name is required');
      if (!row.last_name) rowErrors.push('Last name is required');
      if (!row.email) rowErrors.push('Email is required');

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (row.email && !emailRegex.test(row.email)) {
        rowErrors.push('Invalid email format');
      }

      if (rowErrors.length > 0) {
        errors.push(`Row ${index + 1}: ${rowErrors.join(', ')}`);
      } else {
        valid.push(row);
      }
    });

    return { valid, errors };
  },

  // Import employees from CSV (individual API calls)
  importEmployees: async (data: CSVRow[], companyId: string): Promise<ImportSummary> => {
    const results = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      try {
        const employeeData: CreateEmployeeData = {
          ...row
        };

        // Call individual create employee API for each row with company ID
        const employee = await employeeAPI.createEmployee(employeeData, companyId);

        results.push({
          row: i + 1,
          data: row,
          success: true,
          employee: employee
        });

        successful++;
      } catch (error: any) {
        results.push({
          row: i + 1,
          data: row,
          success: false,
          error: error.response?.data?.message || error.message || 'Unknown error'
        });

        failed++;
      }
    }

    return {
      total: data.length,
      successful,
      failed,
      results
    };
  }
};

// Shift API Service
export const shiftAPI = {
  // Get all shifts (admin/manager only)
  getShifts: async (filters: ShiftFilters = {}): Promise<Shift[]> => {
    const params = new URLSearchParams();
    if (filters.start) params.append('start', filters.start);
    if (filters.end) params.append('end', filters.end);
    if (filters.employee) params.append('employee', filters.employee);
    if (filters.company) params.append('company', filters.company);

    const response = await axiosServices.get(`/employee/shifts/?${params.toString()}`);
    return response.data;
  },

  // Get my shifts (employee only)
  getMyShifts: async (filters: MyShiftsFilters = {}): Promise<Shift[]> => {
    const params = new URLSearchParams();
    if (filters.start) params.append('start', filters.start);
    if (filters.end) params.append('end', filters.end);

    const response = await axiosServices.get(`/employee/my-shifts/?${params.toString()}`);
    return response.data;
  },

  // Create new shift
  createShift: async (data: CreateShiftRequest): Promise<Shift> => {
    const response = await axiosServices.post('/employee/shifts/', data);
    return response.data;
  },

  // Update shift
  updateShift: async (id: string, data: UpdateShiftRequest): Promise<Shift> => {
    const response = await axiosServices.put(`/employee/shifts/${id}/`, data);
    return response.data;
  },

  // Delete shift
  deleteShift: async (id: string): Promise<void> => {
    await axiosServices.delete(`/employee/shifts/${id}/`);
  }
};

// SWR Hooks for React components
import useSWR from 'swr';

export const useGetShifts = (filters: ShiftFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.start) params.append('start', filters.start);
  if (filters.end) params.append('end', filters.end);
  if (filters.employee) params.append('employee', filters.employee);
  if (filters.company) params.append('company', filters.company);

  const { data, error, mutate } = useSWR(`/employee/shifts/?${params.toString()}`, () => shiftAPI.getShifts(filters));

  return {
    shifts: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  };
};

export const useGetMyShifts = (filters: MyShiftsFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.start) params.append('start', filters.start);
  if (filters.end) params.append('end', filters.end);

  const { data, error, mutate } = useSWR(`/employee/my-shifts/?${params.toString()}`, () => shiftAPI.getMyShifts(filters));

  return {
    shifts: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  };
};

export const useGetEmployees = (companyId: string, search?: string) => {
  const params = new URLSearchParams({ company_id: companyId });
  if (search) params.append('search', search);

  const { data, error, mutate } = useSWR(`/employee/?${params.toString()}`, () => employeeAPI.getEmployees(companyId, search));

  return {
    employees: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  };
};
