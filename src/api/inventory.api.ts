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

// Legacy interfaces from inventory.ts (for backward compatibility)
export interface LegacyInventoryItem {
  id: number;
  qb_item_id: string;
  name: string;
  category: string;
  sku: string | null;
  description: string;
  quantity_on_hand: number;
  unit_price: string;
  item_type: string;
  status: string;
  is_active: boolean;
  sync_status: string;
  last_synced: string;
  // Additional fields from backend InventoryItemSerializer
  reorder_point: number | null;
  max_stock_level: number | null;
  barcode: string | null;
  cost_price: string | null;
  is_taxable: boolean;
  weight: string | null;
  dimensions_length: string | null;
  dimensions_width: string | null;
  dimensions_height: string | null;
  location: string | null;
  bin_location: string | null;
}

export interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_items: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface LegacyInventoryResponse {
  items: LegacyInventoryItem[];
  pagination: PaginationInfo;
}

// ITEM TREND (line series for a single item)
export const getItemTrend = async (params: {
  item_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  role_id?: string;
}): Promise<{
  item_id: string;
  item_name: string;
  series: { date: string; quantity: number }[];
  isLocal: boolean;
}> => {
  const query = new URLSearchParams();
  query.append('item_id', params.item_id);
  query.append('start_date', params.start_date);
  query.append('end_date', params.end_date);
  const response = await axiosServices.get(`/inventory/item/trend/?${query.toString()}`);
  return response.data;
};

// CREATE Item
export const createItem = async (itemData: Partial<InventoryItem>, companyId: string): Promise<InventoryCreateResponse> => {
  const response = await axiosServices.post(`${BASE_URL}/item/?company_id=${companyId}`, itemData);
  return response.data;
};

// GET Item
export const getItem = async (itemId: string, companyId: string): Promise<InventoryGetResponse> => {
  const response = await axiosServices.get(`${BASE_URL}/item/?company_id=${companyId}&id=${itemId}`);
  return response.data;
};

// UPDATE Item
export const updateItem = async (itemId: string, itemData: Partial<InventoryItem>, companyId: string): Promise<InventoryUpdateResponse> => {
  const response = await axiosServices.put(`${BASE_URL}/item/?company_id=${companyId}&id=${itemId}`, itemData);
  return response.data;
};

// DELETE Item
export const deleteItem = async (itemId: string, companyId: string): Promise<InventoryDeleteResponse> => {
  const response = await axiosServices.delete(`${BASE_URL}/item/?company_id=${companyId}&id=${itemId}`);
  return response.data;
};

// GET All Items
export const getItems = async (): Promise<InventoryItemsResponse> => {
  const response = await axiosServices.get<InventoryItemsResponse>(`${BASE_URL}/items/`);
  return response.data;
};

// GET Item Details (single item with full details)
export const getItemDetails = async (itemId: string, companyId: string): Promise<InventoryItem> => {
  const response = await axiosServices.get(`${BASE_URL}/item/?company_id=${companyId}&id=${itemId}`);
  return response.data.item;
};

// GET Summary
export const getSummary = async (): Promise<InventorySummary> => {
  const response = await axiosServices.get<InventorySummary>(`${BASE_URL}/summary/`);
  return response.data;
};

// GET Trends
export const getTrends = async (): Promise<InventoryTrend> => {
  const response = await axiosServices.get<InventoryTrend>(`${BASE_URL}/trends/`);
  return response.data;
};

// CSV Template Download
export const downloadCsvTemplateV1 = async (): Promise<Blob> => {
  const response = await axiosServices.get(`${BASE_URL}/items/csv_template`, { responseType: 'blob' });
  return response.data;
};

// GET Item by Barcode
export const getItemByBarcode = async (barcode: string, companyId: string): Promise<{ success: boolean; item: InventoryItem | null }> => {
  const response = await axiosServices.get(`${BASE_URL}/items?barcode=${barcode}&company_id=${companyId}`);
  return response.data;
};

// CSV Upload
export const uploadCsvV1 = async (file: File, onProgress?: (progress: number) => void): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axiosServices.post(`${BASE_URL}/items/bulk_upload/`, formData, {
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
};

// Legacy API function from inventory.ts (for backward compatibility)
export const getInventoryItems = async (companyId: string, page: number = 1, pageSize: number = 20): Promise<LegacyInventoryResponse> => {
  const response = await axiosServices.get(`${BASE_URL}/`, {
    params: {
      company_id: companyId,
      page: page,
      page_size: pageSize
    }
  });
  return response.data;
};

// Export InventoryApi class for backward compatibility (deprecated)
export class InventoryApi {
  static getItems = getItems;
  static getSummary = getSummary;
  static getTrends = getTrends;
  static createItem = createItem;
  static updateItem = updateItem;
  static deleteItem = deleteItem;
  static getItemDetails = getItemDetails;
  static getItemByBarcode = getItemByBarcode;
  static uploadCsvV1 = uploadCsvV1;
  static downloadCsvTemplateV1 = downloadCsvTemplateV1;
  static getItemTrend = getItemTrend;
}

// Default export for legacy compatibility
export default {
  getItems,
  getSummary,
  getTrends,
  createItem,
  updateItem,
  deleteItem,
  getItemDetails,
  getItemByBarcode,
  uploadCsvV1,
  downloadCsvTemplateV1,
  getItemTrend,
  getInventoryItems
};
