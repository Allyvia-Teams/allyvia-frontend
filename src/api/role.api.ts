import axiosServices from 'utils/axios';
import type {
  Role,
  UserListResponse,
  UserPermissionsResponse,
  PermissionsResponse,
  UpdatePermissionsRequest,
  UpdatePermissionsResponse,
  AvailableModulesResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
  CreateRoleResponse,
  UpdateRoleResponse,
  DeleteRoleResponse,
  RoleListResponse,
  InviteUserRequest,
  InviteUserResponse,
  ChangeUserRoleRequest,
  ChangeUserRoleResponse,
  RoleComparison,
  Permission
} from 'types/role';

// ==============================|| ROLE MANAGEMENT API ||============================== //

export const roleAPI = {
  /**
   * Get All User's Roles (for auth slice)
   * GET /api/v1/role/
   */
  getRoles: async (): Promise<Role[]> => {
    const response = await axiosServices.get('/role/');
    const roles = Array.isArray(response.data) ? response.data : [];
    // Backend returns permissions array, return as-is
    return roles;
  },

  /**
   * Get Current User's Role
   * GET /api/v1/role/current/
   */
  getCurrentRole: async (): Promise<Role> => {
    const response = await axiosServices.get('/role/current/');
    // Backend returns permissions array, return as-is
    return response.data;
  },

  /**
   * Get User's Role by ID
   * GET /api/v1/role/{id}/
   * Note: This endpoint may not exist in backend - using role definitions endpoint instead
   */
  getRoleById: async (roleId: string): Promise<Role> => {
    // Try to get from role definitions list and find by ID
    const response = await axiosServices.get('/role/list/');
    const roleList = response.data;
    const role = roleList.results?.find((r: Role) => r.id === roleId);
    if (!role) {
      throw new Error(`Role with id ${roleId} not found`);
    }
    return role;
  },

  /**
   * Get Current User's Effective Permissions
   * GET /api/v1/role/permissions/
   *
   * Returns unified response with permissions, company, user, and role information.
   * Note: permissions are at top level, company does not include available_modules
   * Normalizes and validates the response:
   * - Lowercases all keys
   * - Validates structure
   * - Normalizes permissions array
   */
  getMyPermissions: async (): Promise<PermissionsResponse> => {
    const response = await axiosServices.get('/role/permissions/');
    const data = response.data;

    // Log raw response for debugging
    console.log('[getMyPermissions] Raw API response:', data);

    // Handle both old and new response structures for backward compatibility
    // Old structure: { company: {...}, user: {...}, role: { permissions: [...] } }
    // New structure: { permissions: [...], company: {...}, user: {...}, role: {...} }
    let permissions: Permission[] = [];

    if (data.permissions && Array.isArray(data.permissions)) {
      // New structure: permissions at top level
      permissions = data.permissions;
    } else if (data.role?.permissions && Array.isArray(data.role.permissions)) {
      // Old structure: permissions nested in role
      console.warn('[getMyPermissions] Using old structure (role.permissions). Backend should return permissions at top level.');
      permissions = data.role.permissions;
    } else {
      // No permissions found - log warning and use empty array
      console.warn('[getMyPermissions] No permissions found in response. Expected "permissions" at top level or "role.permissions".');
      permissions = [];
    }

    // Normalize permissions structure
    const normalizedPermissions: Permission[] = [];
    if (permissions && Array.isArray(permissions)) {
      for (const perm of permissions) {
        const normalized: Permission = {
          ...perm,
          // WHY: Lowercase module key for consistent comparison
          // WHAT: Converts "Employees" → "employees" to match menu IDs
          key: perm.key ? perm.key.toLowerCase() : perm.key,
          // WHY: Ensure boolean type (backend may return 1/0 or "true"/"false")
          // WHAT: Converts truthy values to strict boolean true/false
          view: perm.view === true,
          manage: perm.manage === true,
          // WHY: Normalize page keys and their nested actions
          // WHAT: Pages array contains page permissions with nested action permissions
          pages: (perm.pages || []).map((page) => ({
            ...page,
            // WHY: Lowercase page key (e.g., "employees-mgmt" → "employees-mgmt")
            key: page.key ? page.key.toLowerCase() : page.key,
            // WHY: Normalize action keys within each page
            // WHAT: Actions are page-specific permissions (e.g., "employees-add-employee")
            actions: (page.actions || []).map((action) => ({
              ...action,
              key: action.key ? action.key.toLowerCase() : action.key,
              // WHY: Ensure boolean type for action value
              value: action.value === true
            }))
          })),
          // WHY: Normalize tab keys and their nested actions (e.g., finance tabs)
          // WHAT: Tabs array contains tab permissions with nested action permissions
          tabs: (perm.tabs || []).map((tab) => ({
            ...tab,
            // WHY: Lowercase tab key (e.g., "finance-accounts" → "finance-accounts")
            key: tab.key ? tab.key.toLowerCase() : tab.key,
            // WHY: Normalize action keys within each tab
            actions: (tab.actions || []).map((action) => ({
              ...action,
              key: action.key ? action.key.toLowerCase() : action.key,
              value: action.value === true
            }))
          })),
          // WHY: Normalize module-level actions (cross-module permissions)
          // WHAT: Actions at module level (e.g., "security-manage-pins")
          actions: (perm.actions || []).map((action) => ({
            ...action,
            key: action.key ? action.key.toLowerCase() : action.key,
            value: action.value === true
          }))
        };
        normalizedPermissions.push(normalized);
      }
    }

    // Build response with normalized structure
    const normalizedResponse: PermissionsResponse = {
      permissions: normalizedPermissions,
      company: data.company || {
        id: '',
        name: '',
        subscription_plan: ''
      },
      user: data.user || {
        id: '',
        email: '',
        name: ''
      },
      role: data.role || {
        id: '',
        role_type: 'member',
        role_display: ''
      }
    };

    console.log('[getMyPermissions] Normalized response:', normalizedResponse);

    return normalizedResponse;
  },

  /**
   * List All Users in Company
   * GET /api/v1/role/users/
   */
  getUsers: async (params?: { page?: number; page_size?: number }): Promise<UserListResponse> => {
    const response = await axiosServices.get('/role/users/', { params });
    return response.data;
  },

  /**
   * Get User Permissions by Role ID
   * GET /api/v1/role/{role_id}/permissions/
   */
  getUserPermissions: async (roleId: string): Promise<UserPermissionsResponse> => {
    const response = await axiosServices.get(`/role/${roleId}/permissions/`);
    return response.data;
  },

  /**
   * Update Role Permissions
   * PUT /api/v1/role/{role_id}/permissions/
   */
  updatePermissions: async (roleId: string, data: UpdatePermissionsRequest): Promise<UpdatePermissionsResponse> => {
    const response = await axiosServices.put(`/role/${roleId}/permissions/`, data);
    return response.data;
  },

  /**
   * Get Available Modules for Subscription
   * GET /api/v1/role/available-modules/
   *
   * Returns available modules based on subscription plan.
   * Admin: returns all available modules
   * Non-admin: returns only accessible modules
   */
  getAvailableModules: async (): Promise<AvailableModulesResponse> => {
    const response = await axiosServices.get('/role/available-modules/');
    const data = response.data as AvailableModulesResponse;

    // WHY: Normalize all module keys to lowercase for consistent comparison
    // WHAT: Backend may return mixed-case keys
    if (data.available_modules && Array.isArray(data.available_modules)) {
      data.available_modules = data.available_modules.map((module) => {
        const normalized = {
          ...module,
          key: module.key ? module.key.toLowerCase() : module.key,
          view: module.view === true,
          manage: module.manage === true,
          pages: (module.pages || []).map((page) => ({
            ...page,
            key: page.key ? page.key.toLowerCase() : page.key,
            actions: (page.actions || []).map((action) => ({
              ...action,
              key: action.key ? action.key.toLowerCase() : action.key,
              value: action.value === true
            }))
          })),
          tabs: (module.tabs || []).map((tab) => ({
            ...tab,
            key: tab.key ? tab.key.toLowerCase() : tab.key,
            actions: (tab.actions || []).map((action) => ({
              ...action,
              key: action.key ? action.key.toLowerCase() : action.key,
              value: action.value === true
            }))
          })),
          actions: (module.actions || []).map((action) => ({
            ...action,
            key: action.key ? action.key.toLowerCase() : action.key,
            value: action.value === true
          }))
        };
        return normalized;
      });
    }

    return data;
  },

  /**
   * List All Roles (Role Definitions)
   * GET /api/v1/role/list/
   */
  getRoleDefinitions: async (): Promise<RoleListResponse> => {
    const response = await axiosServices.get('/role/list/');
    return response.data;
  },

  /**
   * Create Custom Role
   * POST /api/v1/role/create/
   */
  createRole: async (data: CreateRoleRequest): Promise<CreateRoleResponse> => {
    const response = await axiosServices.post('/role/create/', data);
    return response.data;
  },

  /**
   * Update Role Definition
   * PUT /api/v1/role/{id}/update/
   */
  updateRole: async (roleId: string, data: UpdateRoleRequest): Promise<UpdateRoleResponse> => {
    const response = await axiosServices.put(`/role/${roleId}/update/`, data);
    return response.data;
  },

  /**
   * Delete Custom Role
   * DELETE /api/v1/role/{id}/delete/
   */
  deleteRole: async (roleId: string): Promise<DeleteRoleResponse> => {
    const response = await axiosServices.delete(`/role/${roleId}/delete/`);
    return response.data;
  },

  /**
   * Invite User
   * POST /api/v1/role/users/invite/
   */
  inviteUser: async (data: InviteUserRequest): Promise<InviteUserResponse> => {
    const response = await axiosServices.post('/role/users/invite/', data);
    return response.data;
  },

  /**
   * Change User Role
   * PUT /api/v1/role/users/{user_id}/role/
   */
  changeUserRole: async (userId: string, data: ChangeUserRoleRequest): Promise<ChangeUserRoleResponse> => {
    const response = await axiosServices.put(`/role/users/${userId}/role/`, data);
    return response.data;
  },

  /**
   * Delete User
   * DELETE /api/v1/user/{user_id}/
   */
  deleteUser: async (userId: string, options?: { delete_account?: boolean }): Promise<{ success: boolean; message: string }> => {
    const response = await axiosServices.delete(`/user/${userId}/`, { data: options });
    return response.data;
  },

  /**
   * Compare Role Changes
   * GET /api/v1/role/users/{user_id}/role/compare/
   */
  compareRoleChanges: async (
    userId: string,
    params: { role_definition_id?: string; role_type?: 'admin' | 'member' }
  ): Promise<RoleComparison> => {
    const queryParams = new URLSearchParams();
    if (params.role_definition_id) {
      queryParams.append('role_definition_id', params.role_definition_id);
    }
    if (params.role_type) {
      queryParams.append('role_type', params.role_type);
    }
    const response = await axiosServices.get(`/role/users/${userId}/role/compare/?${queryParams.toString()}`);
    return response.data;
  }
};

export default roleAPI;
