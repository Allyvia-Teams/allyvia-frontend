import { getJSON, setJSON } from './storage';
import type {
  SettingsBundle,
  ProfileSettings,
  NotificationSettings,
  PreferenceSettings,
  BusinessInfoSettings,
  BillingSettings,
  TeamSettings,
  UserRoleManagementSettings,
  UserSettings,
  RoleSettings,
  PermissionSettings,
  ModulePermissions
} from '../types/settings';

const DEFAULTS: SettingsBundle = {
  profile: {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '',
    avatarDataUrl: ''
  },
  notifications: {
    channels: { email: true, push: true, sms: false },
    alerts: { marketing: false, product: true, security: true, billing: true }
  },
  preferences: {
    themeMode: 'system',
    accent: 'allyvia',
    density: 'comfortable',
    sidebarExpanded: true
  },
  business: {
    companyName: 'Acme Inc.',
    companyUrl: 'https://acme.com',
    industry: 'Software',
    taxId: '',
    contactEmail: 'hello@acme.test',
    contactPhone: ''
  },
  billing: {
    plan: 'free',
    planPrice: '$0',
    billingCycle: 'monthly',
    status: 'active',
    nextInvoiceDate: '',
    nextInvoiceAmount: '$0',
    paymentMethodLast4: '',
    autoRenew: true,
    billingEmail: 'billing@acme.test'
  },
  team: {
    invitesEnabled: true,
    defaultRole: 'member'
  }
};

function read(): SettingsBundle {
  return getJSON<SettingsBundle>('bundle', DEFAULTS);
}

function write(next: SettingsBundle): SettingsBundle {
  setJSON('bundle', next);
  return next;
}

export const SettingsMockApi = {
  async getAll(): Promise<SettingsBundle> {
    return read();
  },
  async getBusiness(): Promise<BusinessInfoSettings> {
    return (read().business || DEFAULTS.business)!;
  },
  async updateBusiness(patch: Partial<BusinessInfoSettings>): Promise<BusinessInfoSettings> {
    const current = read();
    const updated = { ...current, business: { ...(current.business || DEFAULTS.business), ...patch } } as SettingsBundle;
    write(updated);
    return updated.business!;
  },
  async getBilling(): Promise<BillingSettings> {
    return (read().billing || DEFAULTS.billing)!;
  },
  async updateBilling(patch: Partial<BillingSettings>): Promise<BillingSettings> {
    const current = read();
    const updated = { ...current, billing: { ...(current.billing || DEFAULTS.billing), ...patch } } as SettingsBundle;
    write(updated);
    return updated.billing!;
  },
  async getTeam(): Promise<TeamSettings> {
    return (read().team || DEFAULTS.team)!;
  },
  async updateTeam(patch: Partial<TeamSettings>): Promise<TeamSettings> {
    const current = read();
    const updated = { ...current, team: { ...(current.team || DEFAULTS.team), ...patch } } as SettingsBundle;
    write(updated);
    return updated.team!;
  },
  async getProfile(): Promise<ProfileSettings> {
    return read().profile;
  },
  async updateProfile(patch: Partial<ProfileSettings>): Promise<ProfileSettings> {
    const current = read();
    const updated = { ...current, profile: { ...current.profile, ...patch } };
    write(updated);
    return updated.profile;
  },
  async getNotifications(): Promise<NotificationSettings> {
    return read().notifications;
  },
  async updateNotifications(patch: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const current = read();
    const updated = { ...current, notifications: { ...current.notifications, ...patch } } as SettingsBundle;
    write(updated);
    return updated.notifications;
  },
  async getPreferences(): Promise<PreferenceSettings> {
    return read().preferences;
  },
  async updatePreferences(patch: Partial<PreferenceSettings>): Promise<PreferenceSettings> {
    const current = read();
    const updated = { ...current, preferences: { ...current.preferences, ...patch } } as SettingsBundle;
    write(updated);
    return updated.preferences;
  },
  async getUserRoleManagement(): Promise<UserRoleManagementSettings> {
    const key = 'user_role_management';
    const defaultData: UserRoleManagementSettings = {
      users: [
        {
          id: '1',
          email: 'john.doe@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'admin',
          status: 'active',
          lastLogin: new Date(Date.now() - 86400000).toISOString(),
          joinedDate: new Date(Date.now() - 365 * 86400000).toISOString()
        },
        {
          id: '2',
          email: 'jane.smith@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
          role: 'manager',
          status: 'active',
          lastLogin: new Date(Date.now() - 172800000).toISOString(),
          joinedDate: new Date(Date.now() - 180 * 86400000).toISOString()
        },
        {
          id: '3',
          email: 'bob.johnson@example.com',
          first_name: 'Bob',
          last_name: 'Johnson',
          role: 'member',
          status: 'active',
          lastLogin: new Date(Date.now() - 604800000).toISOString(),
          joinedDate: new Date(Date.now() - 90 * 86400000).toISOString()
        }
      ],
      roles: [
        {
          id: '1',
          name: 'Admin',
          description: 'Full system access and control',
          permissions: ['create', 'read', 'update', 'delete', 'manage_users', 'manage_roles', 'manage_settings'],
          modulePermissions: [
            { key: 'dashboard', moduleName: 'Dashboard', view: true, manage: false },
            { key: 'integrations', moduleName: 'Integrations', view: true, manage: false },
            { key: 'finance', moduleName: 'Finance & Accounting', view: true, manage: false },
            { key: 'employees', moduleName: 'Employees & Payroll', view: true, manage: true },
            { key: 'employees-clock', moduleName: 'Clock In/Out', view: true, manage: true },
            { key: 'crm', moduleName: 'CRM', view: true, manage: true },
            { key: 'community', moduleName: 'Community Networking', view: true, manage: false },
            { key: 'inventory', moduleName: 'Inventory', view: true, manage: true },
            { key: 'inventory-update', moduleName: 'Update Inventory', view: true, manage: true },
            { key: 'documents', moduleName: 'Documents', view: true, manage: false },
            { key: 'settings', moduleName: 'Settings', view: true, manage: false },
            { key: 'analytics', moduleName: 'Analytics', view: true, manage: false },
            { key: 'calendar', moduleName: 'Calendar', view: true, manage: true },
            { key: 'marketing', moduleName: 'Marketing Tools', view: true, manage: false }
          ],
          userCount: 2,
          createdAt: new Date(Date.now() - 365 * 86400000).toISOString()
        },
        {
          id: '2',
          name: 'Manager',
          description: 'Manage team members and projects',
          permissions: ['create', 'read', 'update', 'manage_team'],
          modulePermissions: [
            { key: 'dashboard', moduleName: 'Dashboard', view: true, manage: false },
            { key: 'integrations', moduleName: 'Integrations', view: true, manage: false },
            { key: 'finance', moduleName: 'Finance & Accounting', view: true, manage: false },
            { key: 'employees', moduleName: 'Employees & Payroll', view: true, manage: true },
            { key: 'employees-clock', moduleName: 'Clock In/Out', view: true, manage: true },
            { key: 'crm', moduleName: 'CRM', view: true, manage: true },
            { key: 'community', moduleName: 'Community Networking', view: true, manage: false },
            { key: 'inventory', moduleName: 'Inventory', view: true, manage: true },
            { key: 'inventory-update', moduleName: 'Update Inventory', view: true, manage: true },
            { key: 'documents', moduleName: 'Documents', view: true, manage: false },
            { key: 'settings', moduleName: 'Settings', view: false, manage: false },
            { key: 'analytics', moduleName: 'Analytics', view: true, manage: false },
            { key: 'calendar', moduleName: 'Calendar', view: true, manage: true },
            { key: 'marketing', moduleName: 'Marketing Tools', view: true, manage: false }
          ],
          userCount: 5,
          createdAt: new Date(Date.now() - 180 * 86400000).toISOString()
        },
        {
          id: '3',
          name: 'Member',
          description: 'Standard access to assigned resources',
          permissions: ['read', 'update'],
          modulePermissions: [
            { key: 'dashboard', moduleName: 'Dashboard', view: true, manage: false },
            { key: 'integrations', moduleName: 'Integrations', view: false, manage: false },
            { key: 'finance', moduleName: 'Finance & Accounting', view: false, manage: false },
            { key: 'employees', moduleName: 'Employees & Payroll', view: true, manage: false },
            { key: 'employees-clock', moduleName: 'Clock In/Out', view: true, manage: false },
            { key: 'crm', moduleName: 'CRM', view: true, manage: false },
            { key: 'community', moduleName: 'Community Networking', view: false, manage: false },
            { key: 'inventory', moduleName: 'Inventory', view: true, manage: false },
            { key: 'inventory-update', moduleName: 'Update Inventory', view: true, manage: false },
            { key: 'documents', moduleName: 'Documents', view: true, manage: false },
            { key: 'settings', moduleName: 'Settings', view: false, manage: false },
            { key: 'analytics', moduleName: 'Analytics', view: true, manage: false },
            { key: 'calendar', moduleName: 'Calendar', view: true, manage: true },
            { key: 'marketing', moduleName: 'Marketing Tools', view: false, manage: false }
          ],
          userCount: 15,
          createdAt: new Date(Date.now() - 90 * 86400000).toISOString()
        }
      ],
      permissions: {
        canInviteUsers: true,
        canModifyRoles: true,
        canDeleteUsers: true,
        canChangePermissions: true
      }
    };
    return getJSON<UserRoleManagementSettings>(key, defaultData);
  },
  async updateUserRoleManagement(patch: Partial<UserRoleManagementSettings>): Promise<UserRoleManagementSettings> {
    const key = 'user_role_management';
    const current = await SettingsMockApi.getUserRoleManagement();
    const updated = { ...current, ...patch };
    setJSON(key, updated);
    return updated;
  },
  async addUser(user: Omit<UserSettings, 'id' | 'joinedDate'>): Promise<UserSettings> {
    const key = 'user_role_management';
    const current = await SettingsMockApi.getUserRoleManagement();
    const newUser: UserSettings = {
      ...user,
      id: Date.now().toString(),
      joinedDate: new Date().toISOString()
    };
    const updated = { ...current, users: [...current.users, newUser] };
    setJSON(key, updated);
    return newUser;
  },
  async updateUser(userId: string, patch: Partial<UserSettings>): Promise<UserSettings> {
    const key = 'user_role_management';
    const current = await SettingsMockApi.getUserRoleManagement();
    const updated = {
      ...current,
      users: current.users.map((u) => (u.id === userId ? { ...u, ...patch } : u))
    };
    setJSON(key, updated);
    const user = updated.users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found');
    return user;
  },
  async deleteUser(userId: string): Promise<void> {
    const key = 'user_role_management';
    const current = await SettingsMockApi.getUserRoleManagement();
    const updated = { ...current, users: current.users.filter((u) => u.id !== userId) };
    setJSON(key, updated);
  }
};

export default SettingsMockApi;
