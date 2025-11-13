// ==============================|| ROLE MANAGEMENT TYPES ||============================== //

/**
 * Action Permission Structure
 * Used in pages, tabs, and module-level actions
 */
export interface ActionPermission {
  key: string;
  value: boolean;
  displayName: string;
}

/**
 * Page Permission Structure
 * Used in module permissions
 */
export interface PagePermission {
  key: string;
  displayName: string;
  actions: ActionPermission[];
}

/**
 * Tab Permission Structure
 * Used in module permissions (e.g., finance tabs)
 */
export interface TabPermission {
  key: string;
  displayName: string;
  actions: ActionPermission[];
}

/**
 * Permission Structure
 * Used in role.permissions array
 */
export interface Permission {
  key: string; // Module key (e.g., "employees")
  view: boolean; // Can view module
  manage: boolean; // Can manage module
  pages: PagePermission[]; // Page permissions
  tabs: TabPermission[]; // Tab permissions
  actions: ActionPermission[]; // Module-level actions
}

/**
 * Available Module Structure
 * Used in company.available_modules
 */
export interface AvailableModule {
  key: string;
  moduleName: string; // Display name
  view: boolean; // Module supports view
  manage: boolean; // Module supports manage
  pages: PagePermission[]; // Available pages
  tabs: TabPermission[]; // Available tabs
  actions: ActionPermission[]; // Available module-level actions
}

/**
 * Company Structure
 * Used in permissions API response
 * Note: available_modules is NOT included in permissions response
 * Use /api/v1/role/available-modules/ endpoint separately
 */
export interface CompanyInfo {
  id: string;
  name: string;
  subscription_plan: string;
  // available_modules is fetched separately via /api/v1/role/available-modules/
}

/**
 * User Structure
 * Used in permissions API response
 */
export interface UserInfo {
  id: string;
  email: string;
  name: string;
}

/**
 * Role Structure (in permissions API response)
 * Note: permissions are at top level, not nested in role
 */
export interface RoleInfo {
  id: string;
  role_type: 'admin' | 'member' | 'custom';
  role_display: string;
  // permissions are at top level in PermissionsResponse
}

/**
 * Permissions API Response
 * Updated structure: permissions at top level, company without available_modules
 */
export interface PermissionsResponse {
  permissions: Permission[]; // Top level permissions array
  company: CompanyInfo; // Company info (without available_modules)
  user: UserInfo; // User info
  role: RoleInfo; // Role info (without permissions)
}

/**
 * Role Structure
 * Uses permissions array structure
 */
export interface Role {
  id: string;
  user_id?: string;
  company_id: string;
  company_name?: string;
  role_type: 'admin' | 'member' | 'custom';
  role_display?: string;
  permissions: Permission[];
  created_at?: string;
  updated_at?: string;
  is_system_role?: boolean;
}

/**
 * Create Role Request
 * Uses permissions array
 */
export interface CreateRoleRequest {
  role_display: string;
  permissions: Permission[];
}

/**
 * Update Role Request
 * Uses permissions array
 */
export interface UpdateRoleRequest {
  role_display?: string;
  permissions?: Permission[];
}

export interface CreateRoleResponse {
  success: boolean;
  message: string;
  role: Role;
}

export interface UpdateRoleResponse {
  success: boolean;
  message: string;
  role: Role;
}

export interface DeleteRoleResponse {
  success: boolean;
  message: string;
}

export interface RoleListResponse {
  count: number;
  results: Role[];
}

export interface User {
  user_id: string;
  user_email: string;
  user_name: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
  role_id: string;
  role_type: 'admin' | 'member' | 'custom';
  role_display: string;
  is_active: boolean;
  created_at: string;
}

export interface UserListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: User[];
}

/**
 * UserPermissionsResponse (deprecated - use PermissionsResponse instead)
 */
export interface UserPermissionsResponse {
  role_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  role_type: 'admin' | 'member' | 'custom';
  subscription_plan: string;
  available_modules: string[];
  permissions: Permission[];
}

export interface UpdatePermissionsRequest {
  permissions: Permission[];
}

export interface UpdatePermissionsResponse {
  success: boolean;
  message: string;
  role: {
    id: string;
    user_id: string;
    role_type: string;
    permissions: Permission[];
    updated_at: string;
  };
}

/**
 * Manage value can be true, false, or "-" (string) indicating not available
 */
export type ManageValue = boolean | '-' | string;

/**
 * Available Modules Response
 */
export interface AvailableModulesResponse {
  subscription_plan: string;
  available_modules: AvailableModule[];
}

export interface InviteUserRequest {
  email: string;
  first_name: string;
  last_name: string;
  role_type?: 'admin' | 'member';
  role_definition_id?: string;
}

export interface InviteUserResponse {
  success: boolean;
  message: string;
  user: User;
}

export interface ChangeUserRoleRequest {
  role_definition_id?: string;
  role_type?: 'admin' | 'member';
}

export interface ChangeUserRoleResponse {
  success: boolean;
  message: string;
  user: User;
}

export interface RoleComparison {
  current_role: {
    id: string;
    role_display: string;
    role_type: string;
  };
  new_role: {
    id: string;
    role_display: string;
    role_type: string;
  };
  differences: {
    gained: Permission[];
    lost: Permission[];
    changed: {
      key: string;
      current: Permission;
      new: Permission;
    }[];
  };
  summary: {
    modules_gained: number;
    modules_lost: number;
    modules_changed: number;
  };
}
