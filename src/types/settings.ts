export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserPreferences {
  theme: ThemePreference;
  dashboard_layout: Record<string, unknown>;
  email_notifications: boolean;
  sms_notifications: boolean;
  marketing_opt_in: boolean;
}

export interface UserSettingsProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  created_at: string;
  preferences: UserPreferences;
}

export type UpdateUserProfilePayload = Partial<{
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  avatar_url: string;
  preferences: Partial<UserPreferences>;
}>;

export type UpdateUserPreferencesPayload = Partial<UserPreferences>;

// Company / Business Info

export interface CompanyBusinessInfo {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_connected_to_quickbooks: boolean;
  qb_realm_id: string | null;
  qb_connected_at: string | null;
  qb_env: string | null;
  latitude: number | null;
  longitude: number | null;
  industry: string | null;
  tax_id: string | null;
  business_phone: string | null;
  business_email: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  /**
   * Whether this store appears in the consumer app's marketplace directory.
   *
   * LISTING ALONE DOES NOT MAKE IT VISIBLE: the consumer queryset also
   * requires a saved CompanyTheme, so a listed themeless store never appears
   * and nothing tells the merchant why. MarketplaceListing warns about that.
   */
  marketplace_listed: boolean;
}

export type UpdateCompanyPayload = Partial<
  Pick<
    CompanyBusinessInfo,
    | 'name'
    | 'industry'
    | 'tax_id'
    | 'business_phone'
    | 'business_email'
    | 'website'
    | 'address_line1'
    | 'address_line2'
    | 'city'
    | 'state'
    | 'postal_code'
    | 'country'
    | 'marketplace_listed'
  >
>;

// Team / Roles

export type TeamRoleType = 'admin' | 'member';

// App modules an admin can grant to a member. Inventory and Clock-in are
// baseline (always granted to every member; rendered checked + disabled in
// the UI). Anything else here only resolves true when explicitly granted.
export type ModuleKey =
  | 'inventory'
  | 'clock'
  | 'pos'
  | 'finance'
  | 'crm'
  | 'calendar'
  | 'documents'
  | 'analytics'
  | 'insights'
  | 'scheduling'
  | 'onboarding';

export type ModulePermissions = Partial<Record<ModuleKey, boolean>>;

export const BASELINE_MODULES: ModuleKey[] = ['inventory', 'clock'];

export const TOGGLABLE_MODULES: Array<{ key: ModuleKey; label: string; description: string }> = [
  { key: 'pos', label: 'POS', description: 'Ring up sales at the point-of-sale.' },
  { key: 'finance', label: 'Finance & Accounting', description: 'View and edit invoices, expenses, and reports.' },
  { key: 'crm', label: 'CRM', description: 'Access customer records and contact history.' },
  { key: 'calendar', label: 'Calendar', description: 'See company calendars and schedule events.' },
  { key: 'documents', label: 'Documents', description: 'View and upload company documents.' },
  { key: 'analytics', label: 'Analytics', description: 'Review business performance dashboards.' },
  { key: 'insights', label: 'Insights', description: 'Read ML-driven business insights and recommendations.' },
  {
    key: 'scheduling',
    label: 'Scheduling',
    description: 'Submit weekly availability and view the auto-generated schedule.'
  },
  { key: 'onboarding', label: 'Data Onboarding', description: 'Upload files and connect data sources to import business data.' }
];

export interface TeamMember {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  last_login: string | null;
  role_type: TeamRoleType;
  module_permissions: ModulePermissions;
  role_display: string;
  created_at: string;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role_type: TeamRoleType;
  status: 'pending' | 'accepted' | 'expired';
  invited_by_email: string;
  company_name: string;
  created_at: string;
  expires_at: string;
}

export interface SendInvitationPayload {
  email: string;
  role_type: TeamRoleType;
}

// Audit Log

export interface AuditLogEntry {
  id: string;
  user_email: string;
  action: string;
  target_type: string;
  target_id: string;
  changes: Record<string, { old: unknown; new: unknown }> | Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogPagination {
  current_page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface AuditLogResponse {
  items: AuditLogEntry[];
  pagination: AuditLogPagination;
}

export interface AuditLogFilters {
  action?: string;
  target_type?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}
