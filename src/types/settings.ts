export interface ProfileSettings {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  avatarDataUrl?: string; // stored as data URL for mock only
}

export type NotificationChannel = 'email' | 'push' | 'sms';
export interface NotificationSettings {
  channels: Record<NotificationChannel, boolean>;
  alerts: {
    marketing: boolean;
    product: boolean;
    security: boolean;
    billing: boolean;
  };
}

export type LayoutDensity = 'comfortable' | 'compact';
export interface PreferenceSettings {
  themeMode: 'light' | 'dark' | 'system';
  accent: 'allyvia' | 'theme1' | 'theme2' | 'theme3' | 'theme4' | 'theme5' | 'theme6';
  density: LayoutDensity;
  sidebarExpanded: boolean;
}

export interface SettingsBundle {
  profile: ProfileSettings;
  notifications: NotificationSettings;
  preferences: PreferenceSettings;
  business?: BusinessInfoSettings;
  billing?: BillingSettings;
  team?: TeamSettings;
}

export interface BusinessInfoSettings {
  companyName: string;
  companyUrl?: string;
  industry?: string;
  taxId?: string;
  contactEmail?: string;
  contactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface BillingSettings {
  plan: 'free' | 'pro' | 'business';
  planPrice?: string;
  billingCycle?: 'monthly' | 'annual';
  nextInvoiceDate?: string;
  nextInvoiceAmount?: string;
  paymentMethodLast4?: string;
  paymentMethodType?: 'card' | 'bank_account';
  status: 'active' | 'past_due' | 'canceled';
  autoRenew?: boolean;
  billingEmail?: string;
}

export interface TeamSettings {
  invitesEnabled: boolean;
  defaultRole: 'member' | 'manager' | 'viewer';
}

export interface UserRoleManagementSettings {
  users: UserSettings[];
  roles: RoleSettings[];
  permissions: PermissionSettings;
}

export interface UserSettings {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: string;
  joinedDate: string;
}

export interface ModulePermissions {
  key: string; // route key (e.g., 'dashboard', 'employees', 'inventory-update')
  moduleName: string; // display name (e.g., 'Dashboard', 'Employees & Payroll', 'Update Inventory')
  view: boolean;
  manage: boolean;
}

export interface RoleSettings {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  modulePermissions: ModulePermissions[];
  userCount: number;
  createdAt: string;
}

export interface PermissionSettings {
  canInviteUsers: boolean;
  canModifyRoles: boolean;
  canDeleteUsers: boolean;
  canChangePermissions: boolean;
}
