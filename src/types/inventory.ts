// src/types/inventory.ts
// TypeScript interfaces for inventory management and CSV bulk upload

// QuickBooks API Response Schema (Final Backend Format)
export interface InventoryItem {
  id: string; // QuickBooks item ID
  name: string; // Required field
  sku?: string | null;
  description?: string | null;
  quantity_on_hand: number;
  unit_price: number; // String in API, number in frontend
  value: number; // String in API, number in frontend
  reorder_point?: number | null;
  // Optional fields that may not be present in QB response
  barcode?: string | null;
  cost_price?: number | null;
  category?: string | null;
}

export interface CsvUploadResponse {
  upload_id: string;
  status: 'processing' | 'completed' | 'failed';
  total_rows: number;
  created_count: number;
  updated_count: number;
  error_count: number;
  errors: CsvError[];
  estimated_completion?: string;
}

export interface CsvError {
  row: number;
  field: string;
  message: string;
  raw_data?: Record<string, any>;
}

export interface UploadProgress {
  upload_id: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  message: string;
  created_count?: number;
  updated_count?: number;
  error_count?: number;
  errors?: CsvError[];
}

export interface CsvPreviewRow {
  row_number: number;
  data: Record<string, any>;
  has_errors: boolean;
  errors: string[];
}

export interface InventoryUploadState {
  loading: boolean;
  progress: number;
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';
  upload_id: string | null;
  errors: CsvError[];
  created_count: number;
  updated_count: number;
  error_count: number;
}

export interface InventoryListResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface InventoryFilters {
  search?: string;
  category?: string;
  status?: string;
  item_type?: string;
  page?: number;
  page_size?: number;
}

// ==============================|| V1 BACKEND TYPES (NON-BREAKING ADDITIONS) ||============================== //

// Summary response from /inventory/summary/
export type InventorySummary = {
  total_items: number;
  total_value: string; // String from API (e.g., "125000.50")
  period: string; // "2024-01-01 to 2024-01-31"
  low_stock?: number; // Items with quantity > 0 and <= reorder_point
  out_of_stock?: number; // Items with quantity = 0
  source: 'quickbooks' | 'local'; // Data source
  synced_items?: number; // Only for local source
  unsynced_items?: number; // Only for local source
};

// Stock trend point (date-quantity)
export type StockPoint = { date: string; quantity: number };

// Trend series for items from /inventory/trend/
export type InventoryTrendSeries = {
  item_id: string;
  item_name: string;
  stock_history: StockPoint[];
};

// Hybrid trend response - can be line chart (QuickBooks) or donut chart (local)
export type InventoryTrendResponse =
  | {
      trend_type: 'line_chart';
      source: 'quickbooks';
      data: InventoryTrendSeries[];
    }
  | {
      trend_type: 'donut_chart';
      source: 'local';
      total_value: number;
      total_items: number;
      categories: Array<{
        category: string;
        total_quantity: number;
        total_value: number;
        item_count: number;
        percentage: number;
        items: Array<{
          id: string;
          name: string;
          sku?: string;
          quantity: number;
          unit_price: number;
          value: number;
        }>;
      }>;
      generated_at: string;
    };

// CSV upload response from /inventory/items/bulk_upload
export type CsvUploadSimpleResponse = {
  created: number;
  updated: number;
  errors: { row: number; field: string; message: string; original_row?: Record<string, any> }[];
  csvData: Array<{
    row: number;
    field: string;
    error: string;
    sku?: string;
    name?: string;
    barcode?: string;
    quantity_on_hand?: string;
    unit_price?: string;
    cost_price?: string;
    category?: string;
    reorder_point?: string;
  }>;
  duration_ms: number;
  total_rows: number;
  quickbooks_uploaded?: boolean; // Whether items were uploaded to QuickBooks
  message?: string; // Success/error message
};

// Items response from /inventory/items/
export type InventoryItemsResponse = {
  items: InventoryItem[];
  sync_status: InventorySyncStatus;
};

// Sync status from /inventory/sync/status/
export type InventorySyncStatus = {
  total_items: number;
  synced_items: number;
  unsynced_items: number;
  recent_unsynced: number;
  sync_percentage: number;
  quickbooks_connected: boolean;
  last_sync: string | null;
  sync_status: 'up_to_date' | 'pending_sync' | 'out_of_sync';
};

// Sync result from /inventory/sync/to_quickbooks/
export type InventorySyncResult = {
  success: boolean;
  synced_count: number;
  total_unsynced: number;
  message: string;
};

// CSV Template structure
export interface CsvTemplate {
  headers: string[];
  sample_data: Record<string, any>[];
  validation_rules: Record<string, string[]>;
}

// Upload validation result
export interface ValidationResult {
  is_valid: boolean;
  errors: CsvError[];
  warnings: CsvError[];
  preview_data: CsvPreviewRow[];
  total_rows: number;
}

// Bulk operation result
export interface BulkOperationResult {
  success: boolean;
  message: string;
  created_count: number;
  updated_count: number;
  error_count: number;
  errors: CsvError[];
  processing_time?: number;
}
