import axiosServices from 'utils/axios';

const INVENTORY_BASE_URL = '/inventory';

export interface InventoryItem {
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
}

export interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_items: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface InventoryResponse {
  items: InventoryItem[];
  pagination: PaginationInfo;
}

const inventoryApi = {
  getInventoryItems: async (companyId: string): Promise<InventoryResponse> => {
    const response = await axiosServices.get(`${INVENTORY_BASE_URL}/`, {
      params: {
        company_id: companyId
      }
    });
    return response.data;
  }
};

export default inventoryApi;
