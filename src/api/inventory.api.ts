import axiosServices from 'utils/axios';
import { InventoryItem, InventoryItemsResponse, InventorySummary, InventoryTrend } from 'types/inventory';

const BASE_URL = '/inventory';

// Mock API flag
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

// Mock data for development
const generateMockItem = (id: string, overrides: Partial<InventoryItem> = {}): InventoryItem => ({
  id,
  name: 'Sample Item',
  sku: `SKU-${id}`,
  description: 'Sample item description',
  quantity_on_hand: 100,
  unit_price: 29.99,
  value: 2999,
  reorder_point: 10,
  barcode: `123456789${id}`,
  category: 'Electronics',
  cost_price: 15.0,
  ...overrides
});

// Mock data for search functionality
export const inventoryItems = Array.from({ length: 20 }, (_, i) => ({
  id: (i + 1).toString(),
  name: `Product ${i + 1}`,
  sku: `SKU-${String(i + 1).padStart(3, '0')}`,
  category: ['Electronics', 'Office Supplies', 'Furniture', 'Software'][i % 4],
  quantity_on_hand: Math.floor(Math.random() * 100) + 1,
  unit_price: Math.floor(Math.random() * 100) + 10,
  reorder_point: Math.floor(Math.random() * 20) + 5
}));

// Transform data for QuickBooks API compatibility
const transformForQuickBooks = (itemData: Partial<InventoryItem>) => {
  // Start with minimal required fields that QuickBooks API definitely supports
  const qbData: any = {
    name: itemData.name,
    // Include string fields even if empty string so clearing a field propagates
    category: 'category' in itemData ? (itemData.category ?? '') : undefined,
    item_type: 'item_type' in itemData ? (itemData.item_type ?? '') : undefined,
    status: 'status' in itemData ? (itemData.status ?? '') : undefined
  };

  // Add basic optional fields that are commonly supported
  if ('sku' in itemData) qbData.sku = itemData.sku ?? '';
  if ('barcode' in itemData) qbData.barcode = itemData.barcode ?? '';
  if ('description' in itemData) qbData.description = itemData.description ?? '';

  // Convert numeric fields to strings as QuickBooks API might expect string format
  if (itemData.unit_price !== undefined && itemData.unit_price !== null) {
    qbData.unit_price = itemData.unit_price.toString();
  }
  if (itemData.cost_price !== undefined && itemData.cost_price !== null) {
    qbData.cost_price = itemData.cost_price.toString();
  }
  if (itemData.quantity_on_hand !== undefined && itemData.quantity_on_hand !== null) {
    qbData.quantity_on_hand = itemData.quantity_on_hand;
  }

  // Add boolean fields
  if (itemData.is_taxable !== undefined && itemData.is_taxable !== null) {
    qbData.is_taxable = itemData.is_taxable;
  }

  // Add inventory management fields
  if (itemData.reorder_point !== undefined && itemData.reorder_point !== null) {
    qbData.reorder_point = itemData.reorder_point;
  }
  if (itemData.max_stock_level !== undefined && itemData.max_stock_level !== null) {
    qbData.max_stock_level = itemData.max_stock_level;
  }

  // Add physical properties
  if (itemData.weight !== undefined && itemData.weight !== null) {
    qbData.weight = itemData.weight.toString();
  }
  if (itemData.dimensions_length !== undefined && itemData.dimensions_length !== null) {
    qbData.dimensions_length = itemData.dimensions_length.toString();
  }
  if (itemData.dimensions_width !== undefined && itemData.dimensions_width !== null) {
    qbData.dimensions_width = itemData.dimensions_width.toString();
  }
  if (itemData.dimensions_height !== undefined && itemData.dimensions_height !== null) {
    qbData.dimensions_height = itemData.dimensions_height.toString();
  }

  // Add location information (include empty strings if provided)
  if ('location' in itemData) qbData.location = itemData.location ?? '';
  if ('bin_location' in itemData) qbData.bin_location = itemData.bin_location ?? '';

  console.log('Transformed QuickBooks data:', qbData);
  return qbData;
};

export class InventoryApi {
  // ITEM TREND (line series for a single item)
  static async getItemTrend(params: {
    item_id: string;
    start_date: string; // YYYY-MM-DD
    end_date: string; // YYYY-MM-DD
    role_id?: string;
  }): Promise<{
    item_id: string;
    item_name: string;
    series: { date: string; quantity: number }[];
    isLocal: boolean;
  }> {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 400));
      const today = new Date(params.end_date);
      const start = new Date(params.start_date);
      const points: { date: string; quantity: number }[] = [];
      for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
        points.push({ date: d.toISOString().slice(0, 10), quantity: Math.max(0, 50 + Math.round(Math.sin(d.getTime() / 8.64e7) * 10)) });
      }
      return {
        item_id: params.item_id,
        item_name: `Product ${params.item_id}`,
        series: points,
        isLocal: true
      };
    }

    const query = new URLSearchParams();
    query.append('item_id', params.item_id);
    query.append('start_date', params.start_date);
    query.append('end_date', params.end_date);
    const response = await axiosServices.get(`/inventory/item/trend/?${query.toString()}`);
    return response.data;
  }

  // CATEGORICAL DONUT (aggregated value per category)
  static async getCategoricalTrends(params?: {
    barcode?: string;
    sku?: string;
    name?: string;
    category?: string;
    include_inactive?: boolean;
    role_id?: string;
  }): Promise<{
    donut: { labels: string[]; values: number[] };
    categories: { category: string; total_quantity: number; total_value: number; item_count: number; percentage: number }[];
    isLocal: boolean;
    total_items: number;
    total_value: string | number;
  }> {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 300));
      return {
        donut: { labels: ['Electronics', 'Office Supplies', 'Furniture'], values: [12500, 8400, 5200] },
        categories: [
          { category: 'Electronics', total_quantity: 320, total_value: 12500, item_count: 18, percentage: 47.3 },
          { category: 'Office Supplies', total_quantity: 210, total_value: 8400, item_count: 15, percentage: 31.8 },
          { category: 'Furniture', total_quantity: 90, total_value: 5200, item_count: 7, percentage: 20.9 }
        ],
        isLocal: true,
        total_items: 40,
        total_value: 26100
      };
    }

    const query = new URLSearchParams();
    if (params?.barcode) query.append('barcode', params.barcode);
    if (params?.sku) query.append('sku', params.sku);
    if (params?.name) query.append('name', params.name);
    if (params?.category) query.append('category', params.category);
    if (params?.include_inactive !== undefined) query.append('include_inactive', String(params.include_inactive));
    const response = await axiosServices.get(`/inventory/trends/?${query.toString()}`);
    return response.data;
  }
  // CREATE Item
  static async createItem(
    itemData: Partial<InventoryItem>,
    companyId: string
  ): Promise<{ success: boolean; item: InventoryItem; source: string; message: string }> {
    if (USE_MOCK_API) {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newItem = generateMockItem(Date.now().toString(), itemData);
      return {
        success: true,
        item: newItem,
        source: 'local',
        message: 'Item created in local database'
      };
    }

    // Transform data for QuickBooks compatibility
    const transformedData = transformForQuickBooks(itemData);

    console.log('Sending to QuickBooks API:', transformedData);

    try {
      const response = await axiosServices.post(`${BASE_URL}/item/?company_id=${companyId}`, transformedData);
      return response.data;
    } catch (error: any) {
      console.error('QuickBooks API Error:', error.response?.data || error.message);

      // If it's a QuickBooks validation error, try with minimal data
      if (error.response?.data?.details?.includes('QB Validation Exception')) {
        console.log('Retrying with minimal data structure...');

        const minimalData = {
          name: itemData.name,
          category: itemData.category || 'General',
          item_type: itemData.item_type || 'Inventory',
          status: itemData.status || 'active',
          sku: itemData.sku,
          description: itemData.description,
          unit_price: itemData.unit_price?.toString(),
          cost_price: itemData.cost_price?.toString(),
          quantity_on_hand: itemData.quantity_on_hand,
          is_taxable: itemData.is_taxable
        };

        console.log('Retrying with minimal data:', minimalData);
        const retryResponse = await axiosServices.post(`${BASE_URL}/item/?company_id=${companyId}`, minimalData);
        return retryResponse.data;
      }

      throw error;
    }
  }

  // GET Item
  static async getItem(
    itemId: string,
    companyId: string,
    useQuickBooks: boolean = true
  ): Promise<{ success: boolean; item: InventoryItem; source: string }> {
    if (USE_MOCK_API) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const item = generateMockItem(itemId);
      return {
        success: true,
        item,
        source: 'local'
      };
    }

    const response = await axiosServices.get(`${BASE_URL}/item/?company_id=${companyId}&id=${itemId}&use_quickbooks=${useQuickBooks}`);
    return response.data;
  }

  // UPDATE Item
  static async updateItem(
    itemId: string,
    itemData: Partial<InventoryItem>,
    companyId: string
  ): Promise<{ success: boolean; item: InventoryItem; source: string; message: string }> {
    if (USE_MOCK_API) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const updatedItem = generateMockItem(itemId, itemData);
      return {
        success: true,
        item: updatedItem,
        source: 'local',
        message: 'Item updated in local database'
      };
    }

    // Transform data for QuickBooks compatibility
    const transformedData = transformForQuickBooks(itemData);

    console.log('Updating QuickBooks API:', transformedData);

    try {
      const response = await axiosServices.put(`${BASE_URL}/item/?company_id=${companyId}&id=${itemId}`, transformedData);
      return response.data;
    } catch (error: any) {
      console.error('QuickBooks API Update Error:', error.response?.data || error.message);

      // If it's a QuickBooks validation error, try with minimal data
      if (error.response?.data?.details?.includes('QB Validation Exception')) {
        console.log('Retrying update with minimal data structure...');

        const minimalData = {
          name: itemData.name,
          category: itemData.category || 'General',
          item_type: itemData.item_type || 'Inventory',
          status: itemData.status || 'active',
          sku: itemData.sku,
          description: itemData.description,
          unit_price: itemData.unit_price?.toString(),
          cost_price: itemData.cost_price?.toString(),
          quantity_on_hand: itemData.quantity_on_hand,
          is_taxable: itemData.is_taxable
        };

        console.log('Retrying update with minimal data:', minimalData);
        const retryResponse = await axiosServices.put(`${BASE_URL}/item/?company_id=${companyId}&id=${itemId}`, minimalData);
        return retryResponse.data;
      }

      throw error;
    }
  }

  // DELETE Item
  static async deleteItem(
    itemId: string,
    companyId: string,
    useQuickBooks: boolean = true
  ): Promise<{ success: boolean; source: string; message: string }> {
    if (USE_MOCK_API) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        success: true,
        source: 'local',
        message: 'Item deleted from local database'
      };
    }

    const response = await axiosServices.delete(`${BASE_URL}/item/?company_id=${companyId}&id=${itemId}&use_quickbooks=${useQuickBooks}`);
    return response.data;
  }

  // GET All Items (existing function)
  static async getItems(): Promise<InventoryItemsResponse> {
    if (USE_MOCK_API) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockItems = Array.from({ length: 20 }, (_, i) =>
        generateMockItem((i + 1).toString(), {
          name: `Product ${i + 1}`,
          sku: `SKU-${String(i + 1).padStart(3, '0')}`,
          category: ['Electronics', 'Office Supplies', 'Furniture', 'Software'][i % 4],
          quantity_on_hand: Math.floor(Math.random() * 100) + 1,
          unit_price: Math.floor(Math.random() * 100) + 10,
          reorder_point: Math.floor(Math.random() * 20) + 5
        })
      );

      return {
        items: mockItems,
        total: mockItems.length,
        isLocal: true,
        source: 'local'
      };
    }

    const response = await axiosServices.get<InventoryItemsResponse>(`${BASE_URL}/items/`);
    return response.data;
  }

  // GET Item Details (single item with full details)
  static async getItemDetails(itemId: string, companyId: string): Promise<InventoryItem> {
    if (USE_MOCK_API) {
      await new Promise((resolve) => setTimeout(resolve, 800));

      return generateMockItem(itemId, {
        name: `Product ${itemId}`,
        sku: `SKU-${itemId}`,
        description: `Detailed description for Product ${itemId}`,
        category: ['Electronics', 'Office Supplies', 'Furniture', 'Software'][parseInt(itemId) % 4],
        quantity_on_hand: Math.floor(Math.random() * 100) + 1,
        unit_price: Math.floor(Math.random() * 100) + 10,
        cost_price: Math.floor(Math.random() * 50) + 5,
        reorder_point: Math.floor(Math.random() * 20) + 5,
        barcode: `123456789${itemId}`,
        ...{
          max_stock_level: Math.floor(Math.random() * 200) + 100,
          item_type: ['Inventory', 'NonInventory', 'Service'][Math.floor(Math.random() * 3)] as any,
          status: ['active', 'inactive', 'discontinued'][Math.floor(Math.random() * 3)] as any,
          is_taxable: Math.random() > 0.5,
          weight: parseFloat((Math.random() * 10 + 0.1).toFixed(2)),
          dimensions_length: parseFloat((Math.random() * 50 + 1).toFixed(2)),
          dimensions_width: parseFloat((Math.random() * 30 + 1).toFixed(2)),
          dimensions_height: parseFloat((Math.random() * 20 + 1).toFixed(2)),
          location: `Warehouse ${String.fromCharCode(65 + Math.floor(Math.random() * 3))}`,
          bin_location: `${String.fromCharCode(65 + Math.floor(Math.random() * 3))}${Math.floor(Math.random() * 10) + 1}-${Math.floor(Math.random() * 10) + 1}`,
          use_quickbooks: Math.random() > 0.3
        }
      });
    }

    const response = await axiosServices.get<InventoryItem>(`${BASE_URL}/item/${itemId}/?company_id=${companyId}`);
    return response.data;
  }

  // GET Summary (existing function)
  static async getSummary(): Promise<InventorySummary> {
    if (USE_MOCK_API) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        total_items: 150,
        total_value: 450000,
        low_stock_items: 12,
        out_of_stock_items: 3,
        average_item_value: 3000,
        inventory_turnover_rate: 4.2,
        isLocal: true,
        source: 'local'
      };
    }

    const response = await axiosServices.get<InventorySummary>(`${BASE_URL}/summary/`);
    return response.data;
  }

  // GET Trends (existing function)
  static async getTrends(): Promise<InventoryTrend> {
    if (USE_MOCK_API) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Local donut chart data mock
      return {
        donut: { labels: ['Electronics', 'Office Supplies', 'Furniture'], values: [12500, 8400, 5200] },
        categories: [
          { category: 'Electronics', total_quantity: 320, total_value: 12500, item_count: 18, percentage: 47.3 },
          { category: 'Office Supplies', total_quantity: 210, total_value: 8400, item_count: 15, percentage: 31.8 },
          { category: 'Furniture', total_quantity: 90, total_value: 5200, item_count: 7, percentage: 20.9 }
        ],
        isLocal: true,
        total_items: 40,
        total_value: 26100
      };
    }

    const response = await axiosServices.get<InventoryTrend>(`${BASE_URL}/trends/`);
    return response.data;
  }

  // CSV Template Download (existing function)
  static async downloadCsvTemplateV1(): Promise<Blob> {
    if (USE_MOCK_API) {
      const csvContent =
        'sku,name,barcode,description,quantity_on_hand,unit_price,cost_price,category,reorder_point\nSKU-001,Sample Product,123456789001,Sample description,100,29.99,15.00,Electronics,10';
      return new Blob([csvContent], { type: 'text/csv' });
    }

    const response = await axiosServices.get(`${BASE_URL}/items/csv_template`, { responseType: 'blob' });
    return response.data;
  }

  // GET Item by Barcode
  static async getItemByBarcode(barcode: string, companyId: string): Promise<{ success: boolean; item: InventoryItem | null }> {
    if (USE_MOCK_API) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock barcode lookup
      const mockItems = [
        {
          id: '1',
          name: 'Wireless Bluetooth Headphones',
          sku: 'WH-001-BLK',
          barcode: '123456789012',
          quantity_on_hand: 25,
          unit_price: 99.99,
          cost_price: 45.0,
          value: 2499.75, // quantity_on_hand * unit_price
          category: 'Electronics',
          description: 'High-quality wireless headphones with noise cancellation'
        },
        {
          id: '2',
          name: 'Office Desk Lamp',
          sku: 'ODL-002-WHT',
          barcode: '123456789013',
          quantity_on_hand: 15,
          unit_price: 45.99,
          cost_price: 20.0,
          value: 689.85, // quantity_on_hand * unit_price
          category: 'Office Supplies',
          description: 'LED desk lamp with adjustable brightness'
        }
      ];

      const item = mockItems.find((item) => item.barcode === barcode);
      return {
        success: true,
        item: item || null
      };
    }

    const response = await axiosServices.get(`${BASE_URL}/items?barcode=${barcode}&company_id=${companyId}`);
    return response.data;
  }

  // CSV Upload (existing function)
  static async uploadCsvV1(file: File, onProgress?: (progress: number) => void): Promise<any> {
    if (USE_MOCK_API) {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        onProgress?.(i);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return {
        success: true,
        total_rows: 50,
        successful_rows: 45,
        error_rows: 5,
        csvData: Array.from({ length: 5 }, (_, i) => ({
          row: i + 46,
          field: i === 0 ? 'name' : 'unit_price',
          error: i === 0 ? 'Required' : 'Invalid format',
          sku: `SKU-${String(i + 46).padStart(3, '0')}`,
          name: i === 0 ? '' : `Error Product ${i + 46}`,
          barcode: `123456789${String(i + 46).padStart(3, '0')}`,
          description: `Error description ${i + 46}`,
          quantity_on_hand: 10,
          unit_price: i === 1 ? 'invalid_price' : '25.99',
          cost_price: '12.50',
          category: 'Electronics',
          reorder_point: 5
        }))
      };
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosServices.post(`${BASE_URL}/items/bulk_upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    });

    return response.data;
  }
}
