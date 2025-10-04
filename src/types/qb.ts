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

export interface QBPaymentLine {
  id: string;
  txn_id: string;
  txn_type: 'Invoice' | 'CreditMemo' | 'Expense' | string;
  amount: number;
  invoice_ref_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface QBPayment {
  id: string;
  qb_id: string;
  sync_token: string;
  customer_ref_id: string;
  customer_name: string;
  amount: number;
  payment_date: string;
  payment_method?: 'Cash' | 'Check' | 'Credit Card' | 'CreditCard' | 'EFT' | string;
  reference_number?: string;
  deposit_to_account_ref_id?: string;
  unapplied_amount: number;
  is_voided: boolean;
  emailed_at?: string;
  currency_ref: string;
  exchange_rate: number;
  payment_method_ref_id?: string;
  payment_method_name?: string;
  ar_account_ref_id?: string;
  ar_account_ref_name?: string;
  process_payment: boolean;
  txn_source?: string;
  private_note?: string;
  sync_status: 'synced' | 'pending' | 'error' | 'partial';
  sync_error?: string;
  last_sync_attempt?: string;
  qb_last_updated_time?: string;
  created_at?: string;
  updated_at?: string;
  last_synced_at?: string;
  line_items?: QBPaymentLine[];
}

export interface QBAccount {
  id: string;
  qb_id: string;
  sync_token: string;
  name: string;
  fully_qualified_name: string;
  acct_num: string;
  account_type: string;
  account_sub_type: string;
  classification: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense' | string;
  active: boolean;
  sub_account: boolean;
  current_balance: number;
  current_balance_with_sub_accounts: number;
  currency_ref: string;
  parent_ref_id?: string;
  parent_ref_name?: string;
  description?: string;
  tax_code_ref_id?: string;
  tax_code_ref_name?: string;
  is_merged?: boolean;
  status: 'active' | 'inactive';
  qb_last_updated_time?: string;
  created_at?: string;
  updated_at?: string;
  last_synced_at?: string;
}

export interface QBPurchaseLine {
  id: string;
  description?: string;
  amount: number;
  account_ref_id?: string;
  account_name?: string;
  item_ref_id?: string;
  item_name?: string;
  quantity?: number;
  unit_price?: number;
}

export interface QBInvoiceLine {
  id: string;
  qb_id: string;
  description?: string;
  amount: number;
  item_ref_id?: string;
  item_name?: string;
  quantity?: number;
  unit_price?: number;
  tax_code_ref_id?: string;
  tax_code_ref_name?: string;
  discount_rate?: number;
  discount_amount?: number;
  service_date?: string;
  class_ref_id?: string;
}

export interface QBInvoice {
  id: string;
  qb_id: string;
  sync_token: string;
  doc_number?: string;
  customer_ref_id: string;
  customer_name: string;
  date: string;
  due_date: string;
  total_amount: number;
  balance: number;
  status: 'paid' | 'unpaid' | 'overdue';
  currency: string;
  is_voided: boolean;
  emailed_at?: string;
  bill_email?: string;
  delivery_time?: string;
  sales_term_ref_id?: string;
  sales_term_ref_name?: string;
  tax_total_amount?: number;
  tax_rate_ref_id?: string;
  discount_amount?: number;
  discount_account_ref_id?: string;
  apply_tax_after_discount: boolean;
  allow_online_credit_card: boolean;
  allow_online_ach: boolean;
  invoice_link?: string;
  bill_addr_line1?: string;
  bill_addr_city?: string;
  bill_addr_state?: string;
  bill_addr_postal_code?: string;
  bill_addr_country?: string;
  ship_addr_line1?: string;
  ship_addr_city?: string;
  ship_addr_state?: string;
  ship_addr_postal_code?: string;
  ship_addr_country?: string;
  deposit_to_account_ref_id?: string;
  deposit_to_account_ref_name?: string;
  estimate_ref_id?: string;
  class_ref_id?: string;
  class_ref_name?: string;
  department_ref_id?: string;
  department_ref_name?: string;
  private_note?: string;
  txn_source?: string;
  sync_status: 'synced' | 'pending' | 'error' | 'partial';
  qb_last_updated_time?: string;
  last_synced_at?: string;
  line_items?: QBInvoiceLine[];
}

export interface QBVendor {
  id: string;
  qb_id: string;
  sync_token: string;
  display_name: string;
  given_name?: string;
  middle_name?: string;
  family_name?: string;
  company_name?: string;
  print_on_check_name?: string;
  primary_email: string;
  primary_phone: string;
  mobile_phone?: string;
  fax?: string;
  billing_address_line1?: string;
  billing_address_city?: string;
  billing_address_state?: string;
  billing_address_postal_code?: string;
  billing_address_country?: string;
  balance: number;
  currency_ref?: string;
  bill_rate?: number;
  active: boolean;
  vendor_1099: boolean;
  tax_identifier?: string;
  acct_num?: string;
  notes?: string;
  status: 'active' | 'inactive';
  has_email: boolean;
  has_phone: boolean;
  balance_status: 'owes_us' | 'we_owe' | 'zero';
  sync_status: 'synced' | 'pending' | 'error';
  qb_last_updated_time?: string;
  last_synced_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface QBVendorCredit {
  id: string;
  qb_id: string;
  sync_token: string;
  vendor_ref_id: string;
  vendor_ref_name: string;
  txn_date: string;
  doc_number?: string;
  total_amount: number;
  balance: number;
  currency_ref?: string;
  exchange_rate?: number;
  vendor_address_line1?: string;
  vendor_address_city?: string;
  vendor_address_state?: string;
  vendor_address_postal_code?: string;
  vendor_address_country?: string;
  ap_account_ref_id?: string;
  ap_account_ref_name?: string;
  private_note?: string;
  status: 'open' | 'applied' | 'closed';
  age_days: number;
  is_expiring_soon: boolean;
  sync_status: 'synced' | 'pending';
  qb_last_updated_time?: string;
  last_synced_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface QBPurchase {
  id: string;
  qb_id: string;
  sync_token: string;
  payment_type: 'Cash' | 'Check' | 'CreditCard' | string;
  entity_ref_id?: string;
  entity_name?: string;
  entity_type?: 'Vendor' | 'Customer' | string;
  amount: number;
  purchase_date: string;
  doc_number?: string;
  account_ref_id?: string;
  account_name?: string;
  is_voided: boolean;
  currency_ref?: string;
  exchange_rate?: number;
  credit: boolean;
  print_status?: string;
  private_note?: string;
  memo?: string;
  sync_status: 'synced' | 'pending' | 'error' | 'partial';
  qb_last_updated_time?: string;
  last_synced_at?: string;
  line_items?: QBPurchaseLine[];
  status?: 'voided' | 'credit' | 'paid';
  has_entity?: boolean;
}
