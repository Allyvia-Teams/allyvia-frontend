// Employee Types for Employee Management System

export interface Employee {
  id: string;
  company_id: string; // Company ID (auto-assigned)
  company_name: string; // Company name (display only)
  first_name: string;
  last_name: string;
  full_name: string; // Computed field
  email: string;
  phone?: string; // Optional
  title?: string; // Optional
  address?: string; // Optional
  status: 'active' | 'inactive'; // Optional, defaults to 'active'
  is_active: boolean;
  created_at: string; // Excluded from table display
  updated_at: string; // Excluded from table display
}

export interface CreateEmployeeData {
  first_name: string; // REQUIRED
  last_name: string; // REQUIRED
  email: string; // REQUIRED
  phone?: string; // Optional
  title?: string; // Optional
  address?: string; // Optional
  status?: string; // Optional, defaults to 'active'
}

export interface UpdateEmployeeData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  title?: string;
  address?: string;
  status?: string;
  is_active?: boolean;
  // Note: company_id cannot be changed
}

// CSV Import Types (Updated with Company)
export interface CSVRow {
  first_name: string; // REQUIRED
  last_name: string; // REQUIRED
  email: string; // REQUIRED
  phone?: string; // Optional
  title?: string; // Optional
  address?: string; // Optional
  status?: string; // Optional, defaults to 'active'
}

export interface ImportResult {
  row: number;
  data: CSVRow;
  success: boolean;
  employee?: Employee;
  error?: string;
}

export interface ImportSummary {
  total: number;
  successful: number;
  failed: number;
  results: ImportResult[];
}

// Employee Statistics for AllyviaStats
export interface EmployeeStats {
  totalEmployees: number;
  totalTitles: number;
  activeEmployees: number;
  inactiveEmployees: number;
}

// Company Types (use existing from auth slice)
export interface Role {
  id: string;
  company_id: string;
  company_name: string;
  role_type: 'admin' | 'manager' | 'member' | 'viewer';
  role_display: string;
  permissions?: string[];
}
