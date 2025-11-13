/**
 * Company model matching backend API documentation
 * See: /api/v1/company/ endpoints
 */
export interface Company {
  // Basic fields
  id: string;
  name: string;
  created_at: string;
  updated_at: string;

  // QuickBooks Integration fields
  is_connected_to_quickbooks: boolean;
  is_qb_access_token_valid?: boolean;
  is_qb_refresh_token_valid?: boolean;
  qb_realm_id: string | null;
  qb_connected_at?: string | null;
  qb_env?: string | null; // 'sandbox' | 'production'

  // Subscription/Billing fields (from API docs)
  subscription_id?: string | null;
  subscription_status?: string | null; // 'trialing' | 'active' | 'past_due' | 'canceled'
  subscription_plan?: string | null; // 'Service-Based Business Plan' | 'Goods-Based Business Plan' | 'Pro Plan'
  stripe_price_id?: string | null;
  stripe_customer_id?: string | null;
  subscription_item_id?: string | null;
  billing_mode?: string; // default: 'classic'
  amount?: number | null;
  currency?: string; // default: 'USD'
  billing_interval?: string | null; // 'month' | 'year'
  trial_end_date?: string | null;
  subscription_start_date?: string | null;
  subscription_end_date?: string | null;
  subscription_cancel_at?: string | null;
  subscription_renewal_date?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  canceled_at?: string | null;
  cancel_at_period_end?: boolean; // default: false

  // Business Information fields (may need backend support)
  // These fields are not in the API documentation but are needed for Business Info tab
  company_url?: string;
  industry?: string;
  tax_id?: string;
  contact_email?: string;
  contact_phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;

  // Legacy field (may be deprecated in favor of qb_connected_at)
  qb_last_auth?: string | null;
}
