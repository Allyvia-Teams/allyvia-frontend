import axiosServices from 'utils/axios';
import {
  InventoryItem,
  InventoryItemsResponse,
  InventorySummary,
  InventoryTrend,
  InventoryCreateResponse,
  InventoryUpdateResponse,
  InventoryDeleteResponse,
  InventoryGetResponse
} from 'types/inventory';

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

  // CREATE Item
  static async createItem(itemData: Partial<InventoryItem>, companyId: string): Promise<InventoryCreateResponse> {
    if (USE_MOCK_API) {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newItem = generateMockItem(Date.now().toString(), itemData);
      return {
        success: true,
        item: newItem,
        message: 'Item created in local database'
      };
    }

    const response = await axiosServices.post(`${BASE_URL}/item/?company_id=${companyId}`, itemData);
    return response.data;
  }

  // GET Item
  static async getItem(itemId: string, companyId: string): Promise<InventoryGetResponse> {
    if (USE_MOCK_API) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const item = generateMockItem(itemId);
      return {
        success: true,
        item
      };
    }

    const response = await axiosServices.get(`${BASE_URL}/item/?company_id=${companyId}&id=${itemId}`);
    return response.data;
  }

  // UPDATE Item
  static async updateItem(itemId: string, itemData: Partial<InventoryItem>, companyId: string): Promise<InventoryUpdateResponse> {
    if (USE_MOCK_API) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const updatedItem = generateMockItem(itemId, itemData);
      return {
        success: true,
        item: updatedItem,
        message: 'Item updated in local database'
      };
    }

    const response = await axiosServices.put(`${BASE_URL}/item/?company_id=${companyId}&id=${itemId}`, itemData);
    return response.data;
  }

  // DELETE Item
  static async deleteItem(itemId: string, companyId: string): Promise<InventoryDeleteResponse> {
    if (USE_MOCK_API) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        success: true,
        message: 'Item deleted from local database'
      };
    }

    const response = await axiosServices.delete(`${BASE_URL}/item/?company_id=${companyId}&id=${itemId}`);
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
          cost_price: Math.floor(Math.random() * 50) + 5,
          reorder_point: Math.floor(Math.random() * 20) + 5
        })
      );

      return {
        items: mockItems,
        total_count: mockItems.length,
        filters_applied: false
      };
    }

    const response = await axiosServices.get<InventoryItemsResponse>(`${BASE_URL}/items/`);
    return response.data;
  }

  // GET Item Details (single item with full details)
  static async getItemDetails(itemId: string, companyId: string): Promise<InventoryItem> {
    if (USE_MOCK_API) {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const itemType = ['Inventory', 'NonInventory', 'Service'][parseInt(itemId) % 3];
      const isInventory = itemType === 'Inventory';

      const mockItem = generateMockItem(itemId, {
        name: `Product ${itemId}`,
        sku: `SKU-${itemId}`,
        description: `Detailed description for Product ${itemId}`,
        category: ['Electronics', 'Office Supplies', 'Furniture', 'Software'][parseInt(itemId) % 4],
        quantity_on_hand: isInventory ? Math.floor(Math.random() * 100) + 1 : 0,
        unit_price: Math.floor(Math.random() * 100) + 10,
        cost_price: Math.floor(Math.random() * 50) + 5,
        value: (Math.floor(Math.random() * 100) + 10) * (isInventory ? Math.floor(Math.random() * 100) + 1 : 1),
        reorder_point: isInventory ? Math.floor(Math.random() * 20) + 5 : null,
        barcode: `123456789${itemId}`,
        max_stock_level: isInventory ? Math.floor(Math.random() * 200) + 100 : null,
        item_type: itemType as 'Inventory' | 'NonInventory' | 'Service',
        status: ['active', 'inactive', 'discontinued'][Math.floor(Math.random() * 3)] as 'active' | 'inactive' | 'discontinued',
        is_taxable: Math.random() > 0.5,
        weight: itemType !== 'Service' ? parseFloat((Math.random() * 10 + 0.1).toFixed(2)) : null,
        dimensions_length: itemType !== 'Service' ? parseFloat((Math.random() * 50 + 1).toFixed(2)) : null,
        dimensions_width: itemType !== 'Service' ? parseFloat((Math.random() * 30 + 1).toFixed(2)) : null,
        dimensions_height: itemType !== 'Service' ? parseFloat((Math.random() * 20 + 1).toFixed(2)) : null,
        location: `Warehouse ${String.fromCharCode(65 + Math.floor(Math.random() * 3))}`,
        bin_location: isInventory
          ? `${String.fromCharCode(65 + Math.floor(Math.random() * 3))}${Math.floor(Math.random() * 10) + 1}-${Math.floor(Math.random() * 10) + 1}`
          : null,
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        company_id: companyId
      });

      // Return in the API response format
      return mockItem;
    }

    const response = await axiosServices.get(`${BASE_URL}/item/?company_id=${companyId}&id=${itemId}`);
    return response.data.item;
  }

  // GET Summary (existing function)
  static async getSummary(): Promise<InventorySummary> {
    if (USE_MOCK_API) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        total_items: 150,
        unique_items: 150,
        total_quantity_on_hand: 2500,
        low_stock: 12,
        out_of_stock: 3,
        inventory_value: '450000.00'
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
        total_items: 40,
        total_value: '26100.00'
      };
    }

    const response = await axiosServices.get<InventoryTrend>(`${BASE_URL}/trends/`);
    return response.data;
  }

  // CSV Template Download (existing function)
  static async downloadCsvTemplateV1(): Promise<Blob> {
    if (USE_MOCK_API) {
      // Generate diverse sample data for CSV template
      const sampleData = [
        'Inventory,Professional Laptop,PRO-LAP-001,123456789012,High-performance business laptop with SSD storage,1299.99,650.00,Electronics,15,5,100,2.1,35.0,24.0,2.5,Warehouse A,A1-15,active,true',
        'NonInventory,Marketing Brochure,BRCH-MKT-001,234567890123,Printed marketing material for product promotion,2.50,1.20,Office Supplies,,,,,0.05,8.5,5.5,0.1,Store Front,,active,true',
        'Service,Technical Support,SUPPORT-001,,Remote technical support and troubleshooting service,85.00,25.00,Services,,,,,,,,,,active,false',
        'Inventory,Ergonomic Chair,CHAIR-ERG-001,345678901234,Adjustable ergonomic office chair with lumbar support,299.99,150.00,Furniture,8,3,50,12.5,60.0,65.0,120.0,Warehouse B,B2-08,active,true',
        'NonInventory,Software License,LIC-SW-001,456789012345,Annual software license subscription,199.99,120.00,Software,,,,,,,,,,active,true'
      ];

      const csvContent =
        'item_type,name,sku,barcode,description,unit_price,cost_price,category,quantity_on_hand,reorder_point,max_stock_level,weight,dimensions_length,dimensions_width,dimensions_height,location,bin_location,status,is_taxable\n' +
        sampleData.join('\n');
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

      // Generate 50 unique items with varied data
      const categories = [
        'Electronics',
        'Office Supplies',
        'Furniture',
        'Software',
        'Books',
        'Clothing',
        'Home & Garden',
        'Sports',
        'Beauty',
        'Automotive'
      ];
      const itemTypes = ['Inventory', 'NonInventory', 'Service'];
      const statuses = ['active', 'inactive', 'discontinued'];
      const locations = ['Warehouse A', 'Warehouse B', 'Store Front', 'Storage Room', 'Back Office'];
      const adjectives = [
        'Premium',
        'Professional',
        'Deluxe',
        'Standard',
        'Economy',
        'Advanced',
        'Classic',
        'Modern',
        'Compact',
        'Heavy-Duty'
      ];
      const nouns = ['Widget', 'Device', 'Tool', 'Component', 'Accessory', 'Equipment', 'System', 'Module', 'Unit', 'Kit'];

      const csvData = Array.from({ length: 50 }, (_, i) => {
        const itemType = itemTypes[i % 3];
        const isInventory = itemType === 'Inventory';
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const category = categories[Math.floor(Math.random() * categories.length)];
        const location = locations[Math.floor(Math.random() * locations.length)];

        return {
          row: i + 1,
          field: '',
          error: '',
          item_type: itemType,
          name: `${adjective} ${noun} ${i + 1}`,
          sku: `${category.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
          barcode: `${Math.floor(Math.random() * 900000000000) + 100000000000}`,
          description: `High-quality ${adjective.toLowerCase()} ${noun.toLowerCase()} for professional use. Item #${i + 1}`,
          unit_price: (Math.random() * 500 + 10).toFixed(2),
          cost_price: (Math.random() * 200 + 5).toFixed(2),
          category: category,
          quantity_on_hand: isInventory ? Math.floor(Math.random() * 200) + 1 : 0,
          reorder_point: isInventory ? Math.floor(Math.random() * 20) + 5 : '',
          max_stock_level: isInventory ? Math.floor(Math.random() * 300) + 100 : '',
          weight: itemType !== 'Service' ? (Math.random() * 15 + 0.1).toFixed(2) : '',
          dimensions_length: itemType !== 'Service' ? (Math.random() * 50 + 1).toFixed(1) : '',
          dimensions_width: itemType !== 'Service' ? (Math.random() * 30 + 1).toFixed(1) : '',
          dimensions_height: itemType !== 'Service' ? (Math.random() * 20 + 1).toFixed(1) : '',
          location: location,
          bin_location: isInventory
            ? `${String.fromCharCode(65 + Math.floor(Math.random() * 5))}${Math.floor(Math.random() * 10) + 1}-${Math.floor(Math.random() * 20) + 1}`
            : '',
          status: statuses[Math.floor(Math.random() * statuses.length)],
          is_taxable: Math.random() > 0.3
        };
      });

      return {
        success: true,
        total_rows: 50,
        successful_rows: 50,
        error_rows: 0,
        csvData: csvData
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
