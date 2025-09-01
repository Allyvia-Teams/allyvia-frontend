// Employee API Service
import axiosServices from 'utils/axios';
import { Employee, CreateEmployeeData, UpdateEmployeeData, CSVRow, ImportSummary } from 'types/employee';

export const employeeAPI = {
  // Get all employees (no filtering parameters)
  getEmployees: async (): Promise<Employee[]> => {
    const response = await axiosServices.get('/employee/');
    return response.data;
  },

  // Get single employee by ID
  getEmployee: async (id: string): Promise<Employee> => {
    const response = await axiosServices.get(`/employee/${id}/`);
    return response.data;
  },

  // Create new employee
  createEmployee: async (data: CreateEmployeeData): Promise<Employee> => {
    const response = await axiosServices.post('/employee/', data);
    return response.data;
  },

  // Update employee (full update)
  updateEmployee: async (id: string, data: UpdateEmployeeData): Promise<Employee> => {
    const response = await axiosServices.put(`/employee/${id}/`, data);
    return response.data;
  },

  // Partial update employee
  patchEmployee: async (id: string, data: UpdateEmployeeData): Promise<Employee> => {
    const response = await axiosServices.patch(`/employee/${id}/`, data);
    return response.data;
  },

  // Delete/deactivate employee
  deleteEmployee: async (id: string): Promise<void> => {
    await axiosServices.delete(`/employee/${id}/`);
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
          const requiredColumns = ['first_name', 'last_name', 'email', 'phone', 'title', 'address'];
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
                status: values[headers.indexOf('status')] || 'active'
              };

              // Validate row data
              if (row.first_name && row.last_name && row.email && row.phone && row.title) {
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
      if (!row.phone) rowErrors.push('Phone is required');
      if (!row.title) rowErrors.push('Title is required');

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
  importEmployees: async (data: CSVRow[]): Promise<ImportSummary> => {
    const results = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      try {
        // Company ID is automatically sent via X-Company-Id header
        const employeeData: CreateEmployeeData = {
          ...row
        };

        // Call individual create employee API for each row
        const employee = await employeeAPI.createEmployee(employeeData);

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
