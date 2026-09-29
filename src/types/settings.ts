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
  // Allyvia Register (iPad) settings. Numbers, not strings -- unlike every
  // business-info field above, which is why they cannot ride on
  // UpdateCompanyPayload's differ (BusinessInfo.tsx .trim()s its values).
  register_idle_timeout_seconds: number;
  register_low_stock_threshold: number;
  register_discount_limit_pct: number;
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

/**
 * The register settings PUT. Deliberately a separate payload from
 * UpdateCompanyPayload even though it is the same endpoint: these three are
 * integers, and the Registers card sends only the keys it owns so it cannot
 * race the business-info form on the same page. The view is partial=True.
 */
export type UpdateRegisterSettingsPayload = Partial<
  Pick<CompanyBusinessInfo, 'register_idle_timeout_seconds' | 'register_low_stock_threshold' | 'register_discount_limit_pct'>
>;

// Team / Roles

export type TeamRoleType = 'admin' | 'member';

// App modules an admin can grant to a member. Inventory and Clock-in are
// baseline (always granted to every member; rendered checked + disabled in
// the UI). Anything else here only resolves true when explicitly granted.
export type ModuleKey =
  | 'storefront'
  | 'inventory'
  | 'clock'
  | 'employees'
  | 'employees.manage'
  | 'employees.approve'
  | 'employees.delete'
  | 'pos'
  | 'finance'
  | 'crm'
  | 'calendar'
  | 'documents'
  | 'analytics'
  | 'insights'
  | 'scheduling'
  | 'onboarding';

// Fine-grained ACTIONS inside a module (ALL-72). Stored in the same
// module_permissions JSON as the module grants and read by the backend's
// Role.has_permission_key. Mirrors role/permissions.py::ACTION_PERMISSIONS —
// the backend also serves it live at GET /role/permission-catalog, but the
// keys have to be a closed type here regardless, and the serializer refuses
// any key outside this set, so this list IS the contract.
export type ActionPermissionKey = 'pos.refund' | 'pos.refund.approve';

/** Everything module_permissions may legally hold. */
export type PermissionKey = ModuleKey | ActionPermissionKey;

export type ModulePermissions = Partial<Record<PermissionKey, boolean>>;

export const BASELINE_MODULES: ModuleKey[] = ['inventory', 'clock'];

export const TOGGLABLE_MODULES: Array<{ key: ModuleKey; label: string; description: string }> = [
  { key: 'employees', label: 'Employee roster', description: 'View staff without pay data or account controls.' },
  {
    key: 'employees.manage',
    label: 'Employee management',
    description: 'Add and edit staff, pay rates and account access. Includes the roster.'
  },
  {
    key: 'employees.approve',
    label: 'Timesheet approval',
    description: 'Review, approve, reject and lock hours independently of employee management.'
  },
  { key: 'employees.delete', label: 'Delete employees', description: 'Delete staff. Requires employee management.' },
  { key: 'storefront', label: 'Online Storefront', description: 'Build and manage the online store.' },
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

// key, label, and the MODULE the key depends on. The dependency is not
// decoration: the backend refuses "pos.refund without pos" as a dead grant
// (the action's own views would allow it while the module gate in front of
// the screen that reaches them does not), so the UI must never assemble one.
// Labels are the backend's own, verbatim.
export const ACTION_PERMISSIONS: Array<{ key: ActionPermissionKey; label: string; module: ModuleKey }> = [
  { key: 'pos.refund', label: 'Take refunds at the till', module: 'pos' },
  { key: 'pos.refund.approve', label: "Approve refunds over the store's threshold", module: 'pos' }
];

const MODULE_KEYS: readonly string[] = [...BASELINE_MODULES, ...TOGGLABLE_MODULES.map((m) => m.key)];

/**
 * Narrow a permission key to a module key.
 *
 * Every consumer that maps a key to something module-shaped — a nav item, a
 * URL prefix — must filter through this: a dotted action key in the same
 * object is a legal grant that maps to NOTHING there, and must yield nothing
 * rather than crash or widen access.
 */
export const isModuleKey = (key: string): key is ModuleKey => MODULE_KEYS.includes(key);

export const isActionPermissionKey = (key: string): key is ActionPermissionKey => ACTION_PERMISSIONS.some((a) => a.key === key);

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
