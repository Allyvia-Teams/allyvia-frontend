// src/api/inventory.api.ts
// Complete Inventory API client for Django backend integration

import axiosInstance from 'utils/axios';
import type {
  InventoryItem,
  InventorySummary,
  CsvUploadSimpleResponse,
  InventoryItemsResponse,
  InventoryTrendResponse,
  InventorySyncStatus,
  InventorySyncResult
} from 'types/inventory';

const BASE_URL = '/inventory';

// Mock data fallback when VITE_USE_MOCK_API is true
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

// Helper function to safely make API calls with mock fallback
const safeApiCall = async <T>(url: string, params?: any, fallback?: () => Promise<T>): Promise<T> => {
  if (USE_MOCK_API) {
    // Return mock data based on endpoint
    if (url.includes('/summary')) {
      // Generate summary with date range parameters
      const summary = calculateMockSummary(params?.start_date, params?.end_date);
      return summary as T;
    } else if (url.includes('/items') && !url.includes('/csv_template') && !url.includes('/bulk_upload') && !url.includes('/sync')) {
      // Return items with sync status
      const itemsResponse = generateMockItemsResponse();
      return itemsResponse as T;
    } else if (url.includes('/trend')) {
      // Generate hybrid trends with date range parameters
      const trends = generateMockTrendResponse(params?.start_date, params?.end_date);
      return trends as T;
    }
    if (fallback) return fallback();
  }
  const response = await axiosInstance.get(url, { params });
  return response.data;
};

// ============================================================================
// Mock data for development and fallback
// ============================================================================

// Generate comprehensive mock data (1200 items)
const generateMockInventoryItems = (): InventoryItem[] => {
  const items: InventoryItem[] = [];
  const categories = ['Electronics', 'Furniture', 'Office Supplies', 'Software', 'Accessories'];
  const names = [
    'Wireless Mouse',
    'Office Chair',
    'Mechanical Keyboard',
    'Desk Lamp',
    'Monitor Stand',
    'Wireless Headphones',
    'Laptop Stand',
    'USB Hub',
    'Bluetooth Speaker',
    'Webcam',
    'Gaming Mouse',
    'Standing Desk',
    'Ergonomic Keyboard',
    'LED Monitor',
    'Laptop Bag',
    'Power Bank',
    'Tablet Stand',
    'Wireless Charger',
    'Cable Organizer',
    'Desk Mat',
    'Coffee Maker',
    'Water Bottle',
    'Notebook',
    'Pen Set',
    'Stapler',
    'Paper Shredder',
    'File Cabinet',
    'Whiteboard',
    'Marker Set',
    'Calendar'
  ];

  for (let i = 0; i < 1200; i++) {
    const name = names[i % names.length];
    const category = categories[i % categories.length];
    const quantity = Math.floor(Math.random() * 100);
    const unitPrice = Math.round((Math.random() * 200 + 10) * 100) / 100;
    const costPrice = Math.round(unitPrice * (0.4 + Math.random() * 0.3) * 100) / 100;
    const reorderPoint = Math.floor(Math.random() * 20) + 5;

    // Create some items with 0 quantity (out of stock)
    const finalQuantity = Math.random() < 0.1 ? 0 : quantity;

    // Create some items with low stock (below reorder point)
    const adjustedQuantity = Math.random() < 0.15 ? Math.floor(reorderPoint * 0.5) : finalQuantity;

    items.push({
      id: `qb_item_${String(i + 1).padStart(3, '0')}`,
      name: `${name} ${i > 29 ? `(${Math.floor(i / 30) + 1})` : ''}`,
      sku: `SKU${String(i + 1).padStart(3, '0')}`,
      description: `High-quality ${name.toLowerCase()} for professional use`,
      quantity_on_hand: adjustedQuantity,
      unit_price: unitPrice,
      value: adjustedQuantity * unitPrice,
      reorder_point: reorderPoint,
      barcode: `123456789${String(i + 1).padStart(3, '0')}`,
      cost_price: costPrice,
      category: category
    });
  }

  return items;
};

// Export the generated mock data
export const inventoryItems: InventoryItem[] = generateMockInventoryItems();

// Calculate summary from actual mock data with date range support
const calculateMockSummary = (startDate?: string, endDate?: string): InventorySummary => {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 29 * 86400000); // Default 30 days

  // Calculate days difference to simulate different business periods
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Simulate different inventory levels based on date range
  // Shorter periods = more focused inventory, longer periods = broader inventory
  const periodMultiplier = Math.min(daysDiff / 30, 1); // Scale based on period length

  // Base values that change based on date range
  const baseItems = Math.floor(1200 * periodMultiplier);
  const baseValue = Math.floor(125000 * periodMultiplier);
  const baseLowStock = Math.floor(45 * periodMultiplier);
  const baseOutOfStock = Math.floor(12 * periodMultiplier);

  // Add some randomness based on the date range
  const dateSeed = start.getTime() + end.getTime();
  const randomFactor = (dateSeed % 100) / 100; // 0-1 based on dates

  const totalItems = baseItems + Math.floor(randomFactor * 50);
  const totalValue = baseValue + Math.floor(randomFactor * 5000);
  const lowStock = baseLowStock + Math.floor(randomFactor * 10);
  const outOfStock = baseOutOfStock + Math.floor(randomFactor * 5);

  const period = `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`;

  // Simulate QuickBooks connection status (mock as connected for demo)
  const isQuickBooksConnected = true; // This would come from integrations state

  return {
    total_items: totalItems,
    total_value: totalValue.toFixed(2),
    period: period,
    low_stock: lowStock,
    out_of_stock: outOfStock,
    source: isQuickBooksConnected ? 'quickbooks' : 'local',
    synced_items: isQuickBooksConnected ? totalItems : Math.floor(totalItems * 0.8),
    unsynced_items: isQuickBooksConnected ? 0 : Math.floor(totalItems * 0.2)
  };
};

// Generate hybrid trend response (line chart for QuickBooks, donut chart for local)
const generateMockTrendResponse = (startDate?: string, endDate?: string): InventoryTrendResponse => {
  // Simulate QuickBooks connection status (mock as connected for demo)
  const isQuickBooksConnected = true; // This would come from integrations state

  if (isQuickBooksConnected) {
    // Return line chart data for QuickBooks
    const trendItems = inventoryItems.slice(0, 5);
    const data = trendItems.map((item, itemIndex) => {
      const stockHistory = [];
      const currentQty = item.quantity_on_hand;

      // Calculate date range
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 29 * 86400000);

      // Generate data points ONLY for the selected date range
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const dataPoints = Math.min(daysDiff, 30);

      // Create deterministic but varied trends based on date range and item
      const dateSeed = start.getTime() + end.getTime() + itemIndex;
      const trendType = dateSeed % 4;

      for (let i = 0; i < dataPoints; i++) {
        const date = new Date(start.getTime() + i * 86400000);

        if (date < start || date > end) {
          continue;
        }

        let trendQty = currentQty;

        switch (trendType) {
          case 0: // Declining trend
            trendQty = Math.max(0, currentQty - Math.floor(i * 2));
            break;
          case 1: // Rising trend
            trendQty = currentQty + Math.floor(i * 1.5);
            break;
          case 2: // Volatile trend
            trendQty = currentQty + Math.floor(Math.sin(i * 0.5) * 10);
            break;
          case 3: // Stable with slight variation
            trendQty = currentQty + Math.floor(Math.sin(i * 0.2) * 3);
            break;
        }

        const daySeed = date.getTime() + itemIndex;
        const randomVariation = (daySeed % 7) - 3;
        trendQty = Math.max(0, trendQty + randomVariation);

        stockHistory.push({
          date: date.toISOString().slice(0, 10),
          quantity: trendQty
        });
      }

      return {
        item_id: item.id,
        item_name: item.name,
        stock_history: stockHistory
      };
    });

    return {
      trend_type: 'line_chart',
      source: 'quickbooks',
      data
    };
  } else {
    // Return donut chart data for local database
    const categories = ['Electronics', 'Furniture', 'Office Supplies', 'Software', 'Accessories'];
    const totalValue = inventoryItems.reduce((sum, item) => sum + item.value, 0);
    const totalItems = inventoryItems.length;

    const categoryData = categories.map((category) => {
      const categoryItems = inventoryItems.filter((item) => item.category === category);
      const totalQuantity = categoryItems.reduce((sum, item) => sum + item.quantity_on_hand, 0);
      const categoryValue = categoryItems.reduce((sum, item) => sum + item.value, 0);
      const percentage = (categoryValue / totalValue) * 100;

      return {
        category,
        total_quantity: totalQuantity,
        total_value: categoryValue,
        item_count: categoryItems.length,
        percentage: Math.round(percentage * 10) / 10,
        items: categoryItems.slice(0, 5).map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku || undefined,
          quantity: item.quantity_on_hand,
          unit_price: item.unit_price,
          value: item.value
        }))
      };
    });

    return {
      trend_type: 'donut_chart',
      source: 'local',
      total_value: totalValue,
      total_items: totalItems,
      categories: categoryData,
      generated_at: new Date().toISOString()
    };
  }
};

// Generate items response with sync status
const generateMockItemsResponse = (): InventoryItemsResponse => {
  const syncStatus: InventorySyncStatus = {
    total_items: inventoryItems.length,
    synced_items: Math.floor(inventoryItems.length * 0.8),
    unsynced_items: Math.floor(inventoryItems.length * 0.2),
    recent_unsynced: Math.floor(inventoryItems.length * 0.05),
    sync_percentage: 80.0,
    quickbooks_connected: true, // Mock as connected
    last_sync: new Date().toISOString(),
    sync_status: 'pending_sync'
  };

  const response = {
    items: inventoryItems,
    sync_status: syncStatus
  };

  console.log('generateMockItemsResponse - Generated response:', {
    itemsCount: response.items.length,
    syncStatus: response.sync_status
  });

  return response;
};

const mockCsvUploadResponse: CsvUploadSimpleResponse = {
  created: 25,
  updated: 10,
  errors: [
    {
      row: 3,
      field: 'name',
      message: 'Required'
    },
    {
      row: 5,
      field: 'unit_price',
      message: 'Must be a non-negative number'
    }
  ],
  duration_ms: 1250,
  total_rows: 50,
  csvData: []
};

// ============================================================================
// API CLASS
// ============================================================================

export class InventoryApi {
  static BASE_URL = BASE_URL;

  // ==============================|| V1 BACKEND - NEW ENDPOINTS ||============================== //
  /**
   * Get inventory summary (hybrid: QuickBooks or local)
   * GET /api/v1/inventory/summary/
   */
  static async getSummary(params?: { start_date?: string; end_date?: string; qb_connected?: string }): Promise<InventorySummary> {
    return safeApiCall(`${BASE_URL}/summary/`, params);
  }

  /**
   * Get detailed inventory items with sync status
   * GET /api/v1/inventory/items/
   */
  static async getItems(): Promise<InventoryItemsResponse> {
    return safeApiCall(`${BASE_URL}/items/`);
  }

  /**
   * Get inventory stock trends (hybrid: line chart or donut chart)
   * GET /api/v1/inventory/trend/
   */
  static async getTrend(params?: {
    start_date?: string;
    end_date?: string;
    item_ids?: string;
    qb_connected?: string;
  }): Promise<InventoryTrendResponse> {
    return safeApiCall(`${BASE_URL}/trend/`, params);
  }

  // Removed alerts and sync status endpoints per request

  /**
   * Manually sync unsynced local items to QuickBooks
   * POST /api/v1/inventory/sync/to_quickbooks/
   */
  static async syncToQuickBooks(): Promise<InventorySyncResult> {
    if (USE_MOCK_API) {
      // Mock sync result
      return {
        success: true,
        synced_count: 15,
        total_unsynced: 30,
        message: 'Synced 15 items to QuickBooks'
      };
    }
    return axiosInstance.post(`${BASE_URL}/sync/to_quickbooks/`);
  }

  /**
   * Download CSV template for bulk upload
   * GET /api/v1/inventory/items/csv_template
   */
  static async downloadCsvTemplateV1(): Promise<Blob> {
    if (USE_MOCK_API) {
      // Mock CSV template matching backend format
      const csvContent = `sku,name,barcode,quantity_on_hand,unit_price,cost_price,category,reorder_point
W-A-001,Widget A,8901234567890,100,19.99,8.50,Gadgets,10
W-A-002,Widget B,,50,14.99,6.00,Gadgets,5
,Unnamed with barcode,778899001122,20,9.99,4.00,Accessories,2
,Minimal Item,,,,,,`;
      return new Blob([csvContent], { type: 'text/csv' });
    }
    return axiosInstance.get(`${BASE_URL}/items/csv_template`, { responseType: 'blob' });
  }

  /**
   * Bulk upload inventory items via CSV
   * POST /api/v1/inventory/items/bulk_upload
   */
  static async uploadCsvV1(file: File, onProgress?: (progress: number) => void): Promise<CsvUploadSimpleResponse> {
    if (USE_MOCK_API) {
      // Simulate upload progress
      if (onProgress) {
        for (let i = 0; i <= 100; i += 10) {
          setTimeout(() => onProgress(i), i * 10);
        }
      }
      return mockCsvUploadResponse;
    }

    const formData = new FormData();
    formData.append('file', file);

    return axiosInstance.post(`${BASE_URL}/items/bulk_upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
  }
}
