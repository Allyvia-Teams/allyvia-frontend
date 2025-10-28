// Employee API Service
import axiosServices from 'utils/axios';
import {
  Employee,
  CreateEmployeeData,
  UpdateEmployeeData,
  CSVRow,
  ImportSummary,
  EmployeeListItem,
  ResendEmailResponse
} from 'types/employee';

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
  },

  // Resend welcome email for employee
  resendWelcomeEmail: async (id: string): Promise<ResendEmailResponse> => {
    const response = await axiosServices.post(`/employee/${id}/resend-welcome/`);
    return response.data;
  },

  // Create user account for existing employee
  createUserAccount: async (id: string, companyId: string): Promise<Employee> => {
    const response = await axiosServices.patch(`/employee/${id}/?company_id=${companyId}`, {
      create_user_account: true
    });
    return response.data;
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

export type TimeEntry = {
  id: number;
  employee: string;
  employee_full_name?: string | null;
  employee_email?: string | null;
  clock_in: string;
  clock_in_formatted?: string; // New formatted field from API
  clock_out: string | null;
  clock_out_formatted?: string; // New formatted field from API
  duration_seconds: number | null;
  duration_formatted?: string; // New formatted field from API
  source: 'manual' | 'axiosServices' | 'import';
  note: string;
  created_at: string;
  updated_at: string;
};

export type Shift = {
  id: number;
  employee: string;
  employee_full_name?: string | null;
  employee_email?: string | null;
  start: string; // ISO
  end: string; // ISO
  note?: string;
  created_at: string;
  updated_at: string;
};

export const clockIn = (data?: { employee_id?: string; company_id?: string }) =>
  axiosServices.post<TimeEntry>('/employee/time-entries/clock-in', data || {});
export const clockOut = (note?: string, data?: { employee_id?: string; company_id?: string }) =>
  axiosServices.post<TimeEntry>('/employee/time-entries/clock-out', {
    ...(note ? { note } : {}),
    ...(data || {})
  });

export const getMyTimeEntries = (params?: { start?: string; end?: string; open?: boolean; employee_id?: string; company_id?: string }) =>
  axiosServices.get<TimeEntry[]>('/employee/time-entries/me', {
    params: {
      ...params,
      open: params?.open ? 'true' : undefined,
      employee_id: params?.employee_id,
      company_id: params?.company_id
    }
  });

export const getTimeEntries = (params: { employee_id: string; start?: string; end?: string }) =>
  axiosServices.get<TimeEntry[]>('/employee/time-entries', { params });

// Get all employees' time entries (admin only) - no employee_id means all employees
export const getAllEmployeesTimeEntries = (params?: { start?: string; end?: string }) =>
  axiosServices.get<TimeEntry[]>('/employee/time-entries', { params });

// Get current user's clock status (whether they have an active entry)
export const getCurrentUserClockStatus = (employee_id?: string) =>
  axiosServices.get<TimeEntry | null>('/employee/time-entries/current-status', {
    params: employee_id ? { employee_id } : {}
  });

// Shifts APIs
export const getShifts = (params?: { employee_id?: string; start?: string; end?: string; me?: boolean }) =>
  axiosServices.get<Shift[]>('/employee/shifts', {
    params: {
      ...params,
      me: params?.me ? 'true' : undefined
    }
  });

export const createShift = (data: { employee: string; start: string; end: string; note?: string }) =>
  axiosServices.post<Shift>('/employee/shifts', data);

export const deleteShift = (id: number) => axiosServices.delete('/employee/shifts', { params: { id } });

// Delete a specific time entry (admin only)
export const deleteTimeEntry = (id: number) => axiosServices.delete(`/employee/time-entries/${id}`);
