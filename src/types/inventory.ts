export interface InventoryItem {
  id: string;
  name: string; // Required field
  sku?: string | null;
  description?: string | null;
  quantity_on_hand: number;
  unit_price: number; // String in API, number in frontend
  value: number; // String in API, number in frontend
  reorder_point?: number | null;
  barcode?: string | null;
  barcode_symbology?: 'CODE128' | 'UPCA' | null;
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
  is_active?: boolean; // Local soft delete flag
  created_at?: string;
  updated_at?: string;
  company_id?: string;
}

export interface LabelSpec {
  name: string;
  kind: 'thermal' | 'avery' | string;
  width?: number;
  height?: number;
  columns?: number;
  rows?: number;
  label_width?: number;
  label_height?: number;
}

export interface InventorySummary {
  total_items: number;
  unique_items: number;
  total_quantity_on_hand: number;
  low_stock: number;
  out_of_stock: number;
  inventory_value: number | string;
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
  // Donut/categorical payload
  donut: {
    labels: string[];
    values: number[];
  };
  categories: InventoryTrendCategoryRow[];
  total_items: number;
  total_value: number | string;
}

export interface InventoryItemsResponse {
  items: InventoryItem[];
  total_count: number;
  filters_applied: boolean;
}

// Treemap types for Inventory Analytics
export interface InventoryProductTreemapItem {
  product_id: string;
  product_name: string;
  category: string;
  total_quantity: number;
  total_value: number;
  sku?: string | null;
  location?: string | null;
}

export interface InventoryProductsTreemapResponse {
  products: InventoryProductTreemapItem[];
  currency: string;
}

// New consolidated treemap types
export interface InventoryTreemapGroup {
  name: string;
  type: 'category' | 'location' | 'type' | 'product';
  quantity: number;
  value: number;
  percentage: number;
  items?: InventoryTreemapItem[];
}

export interface InventoryTreemapItem {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  location?: string;
  item_type?: string;
  quantity: number;
  value: number;
  percentage: number;
}

export interface InventoryTreemapResponse {
  currency: string;
  total: {
    quantity: number;
    value: number;
  };
  groups: InventoryTreemapGroup[];
}

// Legacy treemap types (updated to match API schema)
export interface InventoryItemTreemapNode {
  id: string;
  name: string;
  category: string;
  quantity_on_hand: number;
  total_value: number;
  quantity_percentage: number;
  value_percentage: number;
  sku?: string | null;
  location?: string | null;
}

export interface InventoryItemsTreemapResponse {
  currency: string;
  // Product-level data (for detailed treemap)
  items: InventoryItemTreemapNode[];
  // Pre-aggregated data for smooth switching
  categories: InventoryTreemapGroup[];
  locations: InventoryTreemapGroup[];
  types: InventoryTreemapGroup[];
  // Totals for each grouping
  totals: {
    categories: { quantity: number; value: number };
    locations: { quantity: number; value: number };
    types: { quantity: number; value: number };
    products: { quantity: number; value: number };
  };
}

// CRUD Operation Response Types
export interface InventoryCreateResponse {
  success: boolean;
  item: InventoryItem;
  message: string;
}

export interface InventoryGetResponse {
  success: boolean;
  item: InventoryItem;
}

export interface InventoryUpdateResponse {
  success: boolean;
  item: InventoryItem;
  message: string;
}

export interface InventoryDeleteResponse {
  success: boolean;
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
