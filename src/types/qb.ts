export interface QBItemSuggestion {
  qb_id: string;
  name: string;
  count?: number;
}

export interface QBItemSuggestionsResponse {
  suggestions: QBItemSuggestion[];
  query: string;
}

export interface QBItem {
  qb_id: string;
  name: string;
  sku: string;
  type: 'Service' | 'Inventory' | 'NonInventory' | 'Category';
  active: boolean;
  unit_price: string | null;
  qty_on_hand: string | null;
  description: string;
  qb_last_updated_time: string | null;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
  page_size: number;
  total_pages: number;
}

export type QBItemsListResponse = PaginatedResponse<QBItem>;

export interface QBItemsListParams {
  company_id: string;
  search?: string;
  type?: string;
  status?: 'active' | 'inactive' | '';
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface QBItemSuggestionsParams {
  q: string;
  company_id: string;
}

export interface QBCustomer {
  id: string;
  qb_id: string;
  display_name: string;
  given_name?: string;
  middle_name?: string;
  family_name?: string;
  company_name?: string;
  primary_email: string;
  primary_phone: string;
  mobile_phone?: string;
  balance: number;
  billing_address_line1?: string;
  billing_address_city?: string;
  billing_address_state?: string;
  billing_address_postal_code?: string;
  billing_address_country?: string;
  currency_ref?: string;
  active: boolean;
  taxable?: boolean;
  primary_tax_identifier?: string;
  notes?: string;
  is_project?: boolean;
  status: 'active' | 'inactive';
  has_email: boolean;
  has_phone: boolean;
  qb_last_updated_time?: string;
  last_synced_at?: string;
}
