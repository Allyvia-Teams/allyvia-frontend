export interface Vendor {
  id: number;
  name: string; // Required field
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  account_number?: string | null;
  tax_id?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
  status?: 'active' | 'inactive';
  is_active?: boolean; // Local soft delete flag
  created_at?: string;
  updated_at?: string;
}

export interface VendorPaginationInfo {
  current_page: number;
  total_pages: number;
  total_items: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface VendorListResponse {
  items: Vendor[];
  pagination: VendorPaginationInfo;
}

// CRUD Operation Response Types
export interface VendorCreateResponse {
  success: boolean;
  item: Vendor;
  message: string;
}

export interface VendorGetResponse {
  success: boolean;
  item: Vendor;
}

export interface VendorUpdateResponse {
  success: boolean;
  item: Vendor;
  message: string;
}

export interface VendorDeleteResponse {
  success: boolean;
  message: string;
}

// Bulk upload result types
export interface VendorUploadRowError {
  row: number;
  field: string;
  message: string;
  original_row?: Record<string, any>;
}

export interface VendorUploadResult {
  created: number;
  updated: number;
  errors: VendorUploadRowError[];
  // Only present when the backend response contains row errors
  csvData?: Array<Record<string, any> & { row?: number; error?: string }>;
  isLocal?: boolean;
  message?: string;
  total_rows: number;
  error?: string;
  details?: string;
}

// Form Types for Modals
export interface VendorFormData {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  account_number: string;
  tax_id: string;
  payment_terms: string;
  notes: string;
  status: 'active' | 'inactive';
}
