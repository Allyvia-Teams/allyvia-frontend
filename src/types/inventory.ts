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
  category?: string | null;
  cost_price?: number | null;
  max_stock_level?: number | null;
  item_type?: 'Inventory' | 'NonInventory' | 'Service';
  status?: 'active' | 'inactive' | 'discontinued';
  is_taxable?: boolean;
  weight?: number | null;
  dimensions_length?: number | null;
  dimensions_width?: number | null;
  dimensions_height?: number | null;
  location?: string | null;
  bin_location?: string | null;
  // QuickBooks specific fields
  qb_item_id?: string | null;
  qb_sync_status?: 'synced' | 'pending' | 'error' | null;
  // Additional metadata
  created_at?: string;
  updated_at?: string;
  company_id?: string;
}

export interface InventorySummary {
  // New fields (preferred)
  unique_items?: number;
  total_quantity_on_hand?: number;
  low_stock?: number;
  out_of_stock?: number;
  inventory_value?: number | string;
  period?: string;
  isLocal?: boolean;
  source?: 'quickbooks' | 'local';

  // Legacy fields (backward compatibility)
  total_items?: number;
  total_value?: number;
  low_stock_items?: number;
  out_of_stock_items?: number;
  average_item_value?: number;
  inventory_turnover_rate?: number;
}

// Trends payloads can differ based on view (line series vs categorical donut)
export interface InventoryTrendCategoryRow {
  category: string;
  total_quantity: number;
  total_value: number;
  item_count: number;
  percentage: number;
}

export interface InventoryTrend {
  // Line/bar chart payload (optional)
  trend_type?: 'line_chart' | 'bar_chart' | 'donut_chart';
  data?: Array<{
    item_id: string;
    item_name: string;
    stock_history: Array<{
      date: string;
      quantity: number;
    }>;
  }>;

  // Donut/categorical payload (optional)
  donut?: {
    labels: string[];
    values: number[];
  };
  categories?: InventoryTrendCategoryRow[];
  total_items?: number;
  total_value?: number | string;

  // Common flags
  isLocal?: boolean;
  source?: 'quickbooks' | 'local';
}

export interface InventoryAlert {
  type: 'low_stock' | 'out_of_stock' | 'reorder_needed';
  item_id: string;
  item_name: string;
  current_quantity: number;
  reorder_point: number;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface InventoryItemsResponse {
  items: InventoryItem[];
  total: number;
  isLocal?: boolean;
  source?: 'quickbooks' | 'local';
}

export interface InventorySummaryResponse {
  summary: InventorySummary;
}

export interface InventoryTrendsResponse {
  trends: InventoryTrend;
}

export interface InventoryAlertsResponse {
  alerts: InventoryAlert[];
}

// CRUD Operation Response Types
export interface InventoryCreateResponse {
  success: boolean;
  item: InventoryItem;
  source: 'quickbooks' | 'local';
  message: string;
}

export interface InventoryGetResponse {
  success: boolean;
  item: InventoryItem;
  source: 'quickbooks' | 'local';
}

export interface InventoryUpdateResponse {
  success: boolean;
  item: InventoryItem;
  source: 'quickbooks' | 'local';
  message: string;
}

export interface InventoryDeleteResponse {
  success: boolean;
  source: 'quickbooks' | 'local';
  message: string;
}

// Form Types for Modals
export interface InventoryFormData {
  name: string;
  sku?: string;
  description?: string;
  quantity_on_hand: number;
  unit_price: number;
  cost_price?: number;
  category?: string;
  reorder_point?: number;
  barcode?: string;
  max_stock_level?: number;
  item_type?: 'Inventory' | 'NonInventory' | 'Service';
  status?: 'active' | 'inactive' | 'discontinued';
  is_taxable?: boolean;
  weight?: number;
  dimensions_length?: number;
  dimensions_width?: number;
  dimensions_height?: number;
  location?: string;
  bin_location?: string;
}

// CSV Import Types
export interface InventoryCsvRow {
  sku?: string;
  name: string;
  barcode?: string;
  description?: string;
  quantity_on_hand: number;
  unit_price: number;
  cost_price?: number;
  category?: string;
  reorder_point?: number;
  max_stock_level?: number;
  item_type?: 'Inventory' | 'NonInventory' | 'Service';
  status?: 'active' | 'inactive' | 'discontinued';
  is_taxable?: boolean;
  weight?: number;
  dimensions_length?: number;
  dimensions_width?: number;
  dimensions_height?: number;
  location?: string;
  bin_location?: string;
}

export interface InventoryCsvUploadResponse {
  success: boolean;
  total_rows: number;
  successful_rows: number;
  error_rows: number;
  csvData: Array<
    InventoryCsvRow & {
      row: number;
      field?: string;
      error?: string;
    }
  >;
}

// Filter Types
export interface InventoryFilters {
  search?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  min_quantity?: number;
  max_quantity?: number;
  low_stock_only?: boolean;
  out_of_stock_only?: boolean;
}

// Pagination Types
export interface InventoryPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}
