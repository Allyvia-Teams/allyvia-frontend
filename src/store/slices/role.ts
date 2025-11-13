import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { roleAPI } from 'api/role.api';
import { fetchSubscriptionStatus, updateSubscriptionStatusFromPermissions } from './subscription';
import type {
  User,
  UserListResponse,
  UserPermissionsResponse,
  PermissionsResponse,
  UpdatePermissionsRequest,
  AvailableModulesResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
  Role,
  RoleListResponse,
  InviteUserRequest,
  ChangeUserRoleRequest,
  RoleComparison
} from 'types/role';

interface RoleState {
  // Users List
  users: User[];
  usersLoading: boolean;
  usersError: string | null;
  usersCount: number;
  usersNext: string | null;
  usersPrevious: string | null;

  // Current User's Permissions (for navigation filtering)
  // PermissionsResponse with company, user, role
  myPermissions: PermissionsResponse | null;
  myPermissionsLoading: boolean;
  myPermissionsError: string | null;

  // Selected User Permissions
  selectedUserPermissions: UserPermissionsResponse | null;
  permissionsLoading: boolean;
  permissionsError: string | null;

  // Available Modules
  availableModules: AvailableModulesResponse | null;
  availableModulesLoading: boolean;
  availableModulesError: string | null;

  // Update Permissions
  updateLoading: boolean;
  updateError: string | null;
  updateSuccess: boolean;

  // Role Definitions
  roleDefinitions: Role[];
  roleDefinitionsLoading: boolean;
  roleDefinitionsError: string | null;

  // Create Role
  createRoleLoading: boolean;
  createRoleError: string | null;
  createRoleSuccess: boolean;

  // Update Role
  updateRoleLoading: boolean;
  updateRoleError: string | null;
  updateRoleSuccess: boolean;

  // Delete Role
  deleteRoleLoading: boolean;
  deleteRoleError: string | null;
  deleteRoleSuccess: boolean;

  // Invite User
  inviteUserLoading: boolean;
  inviteUserError: string | null;
  inviteUserSuccess: boolean;

  // Change User Role
  changeRoleLoading: boolean;
  changeRoleError: string | null;
  changeRoleSuccess: boolean;

  // Delete User
  deleteUserLoading: boolean;
  deleteUserError: string | null;
  deleteUserSuccess: boolean;

  // Compare Role Changes
  roleComparison: RoleComparison | null;
  roleComparisonLoading: boolean;
  roleComparisonError: string | null;
}

const initialState: RoleState = {
  users: [],
  usersLoading: false,
  usersError: null,
  usersCount: 0,
  usersNext: null,
  usersPrevious: null,
  myPermissions: null,
  myPermissionsLoading: false,
  myPermissionsError: null,
  selectedUserPermissions: null,
  permissionsLoading: false,
  permissionsError: null,
  availableModules: null,
  availableModulesLoading: false,
  availableModulesError: null,
  updateLoading: false,
  updateError: null,
  updateSuccess: false,
  roleDefinitions: [],
  roleDefinitionsLoading: false,
  roleDefinitionsError: null,
  createRoleLoading: false,
  createRoleError: null,
  createRoleSuccess: false,
  updateRoleLoading: false,
  updateRoleError: null,
  updateRoleSuccess: false,
  deleteRoleLoading: false,
  deleteRoleError: null,
  deleteRoleSuccess: false,
  inviteUserLoading: false,
  inviteUserError: null,
  inviteUserSuccess: false,
  changeRoleLoading: false,
  changeRoleError: null,
  changeRoleSuccess: false,
  deleteUserLoading: false,
  deleteUserError: null,
  deleteUserSuccess: false,
  roleComparison: null,
  roleComparisonLoading: false,
  roleComparisonError: null
};

export const fetchUsers = createAsyncThunk(
  'role/fetchUsers',
  async (params: { page?: number; page_size?: number } | undefined, { rejectWithValue }) => {
    try {
      const response = await roleAPI.getUsers(params);
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to fetch users';
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchMyPermissions = createAsyncThunk('role/fetchMyPermissions', async (_, { rejectWithValue, dispatch }) => {
  try {
    console.log('[fetchMyPermissions] Fetching permissions...');
    const response = await roleAPI.getMyPermissions();
    console.log('[fetchMyPermissions] Response received:', response);

    // Validate response structure
    if (!response) {
      throw new Error('Empty response from permissions API');
    }

    if (!response.permissions) {
      console.warn('[fetchMyPermissions] Response missing permissions array:', response);
      // Use empty array if permissions are missing
      response.permissions = [];
    }

    // Update subscription status with company info from permissions response
    // Note: company no longer includes available_modules (fetched separately)
    if (response.company) {
      // Update subscription status with company data from permissions response
      // This ensures subscription and permissions are in sync
      dispatch(updateSubscriptionStatusFromPermissions({ company: response.company }));
      // Also fetch subscription status to ensure we have the latest data
      dispatch(fetchSubscriptionStatus());
    }

    // Fetch available modules separately (not included in permissions response)
    // This ensures we have both permissions and available modules
    // Only fetch if permissions were successfully retrieved
    if (response.permissions && response.permissions.length >= 0) {
      dispatch(fetchAvailableModules());
    }

    return response;
  } catch (error: any) {
    console.error('[fetchMyPermissions] Error fetching permissions:', error);
    console.error('[fetchMyPermissions] Error response:', error.response);
    console.error('[fetchMyPermissions] Error data:', error.response?.data);

    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'Failed to retrieve permissions';

    console.error('[fetchMyPermissions] Error message:', errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const fetchUserPermissions = createAsyncThunk('role/fetchUserPermissions', async (roleId: string, { rejectWithValue }) => {
  try {
    const response = await roleAPI.getUserPermissions(roleId);
    return response;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to fetch user permissions';
    return rejectWithValue(errorMessage);
  }
});

export const fetchAvailableModules = createAsyncThunk('role/fetchAvailableModules', async (_, { rejectWithValue }) => {
  try {
    const response = await roleAPI.getAvailableModules();
    return response;
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to fetch available modules';
    return rejectWithValue(errorMessage);
  }
});

export const updateUserPermissions = createAsyncThunk(
  'role/updateUserPermissions',
  async ({ roleId, data }: { roleId: string; data: UpdatePermissionsRequest }, { rejectWithValue, dispatch }) => {
    try {
      const response = await roleAPI.updatePermissions(roleId, data);
      dispatch(fetchUserPermissions(roleId));
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to update permissions';
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchRoleDefinitions = createAsyncThunk('role/fetchRoleDefinitions', async (_, { rejectWithValue }) => {
  try {
    const response = await roleAPI.getRoleDefinitions();
    return response;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to fetch roles';
    return rejectWithValue(errorMessage);
  }
});

export const createRole = createAsyncThunk('role/createRole', async (data: CreateRoleRequest, { rejectWithValue, dispatch }) => {
  try {
    const response = await roleAPI.createRole(data);
    dispatch(fetchRoleDefinitions());
    return response;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to create role';
    return rejectWithValue(errorMessage);
  }
});

export const updateRole = createAsyncThunk(
  'role/updateRole',
  async ({ roleId, data }: { roleId: string; data: UpdateRoleRequest }, { rejectWithValue, dispatch }) => {
    try {
      const response = await roleAPI.updateRole(roleId, data);
      dispatch(fetchRoleDefinitions());
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to update role';
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteRole = createAsyncThunk('role/deleteRole', async (roleId: string, { rejectWithValue, dispatch }) => {
  try {
    const response = await roleAPI.deleteRole(roleId);
    dispatch(fetchRoleDefinitions());
    return response;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to delete role';
    return rejectWithValue(errorMessage);
  }
});

export const inviteUser = createAsyncThunk('role/inviteUser', async (data: InviteUserRequest, { rejectWithValue, dispatch }) => {
  try {
    const response = await roleAPI.inviteUser(data);
    return response;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to invite user';
    return rejectWithValue(errorMessage);
  }
});

export const changeUserRole = createAsyncThunk(
  'role/changeUserRole',
  async ({ userId, data }: { userId: string; data: ChangeUserRoleRequest }, { rejectWithValue, dispatch }) => {
    try {
      const response = await roleAPI.changeUserRole(userId, data);
      // Refresh users list to get updated role_id
      dispatch(fetchUsers());
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to change user role';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Delete User
 * DELETE /api/v1/user/{user_id}/
 */
export const deleteUser = createAsyncThunk('role/deleteUser', async (userId: string, { rejectWithValue, dispatch }) => {
  try {
    const response = await roleAPI.deleteUser(userId);
    // Refresh users list after deletion
    dispatch(fetchUsers());
    return response;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to delete user';
    return rejectWithValue(errorMessage);
  }
});

/**
 * Compare Role Changes
 * GET /api/v1/role/users/{user_id}/role/compare/
 */
export const compareRoleChanges = createAsyncThunk(
  'role/compareRoleChanges',
  async (
    { userId, params }: { userId: string; params: { role_definition_id?: string; role_type?: 'admin' | 'member' } },
    { rejectWithValue }
  ) => {
    try {
      const response = await roleAPI.compareRoleChanges(userId, params);
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to compare role changes';
      return rejectWithValue(errorMessage);
    }
  }
);

const roleSlice = createSlice({
  name: 'role',
  initialState,
  reducers: {
    clearSelectedUser: (state) => {
      state.selectedUserPermissions = null;
      state.permissionsError = null;
    },
    clearUpdateSuccess: (state) => {
      state.updateSuccess = false;
      state.updateError = null;
    },
    clearCreateRoleSuccess: (state) => {
      state.createRoleSuccess = false;
      state.createRoleError = null;
    },
    clearUpdateRoleSuccess: (state) => {
      state.updateRoleSuccess = false;
      state.updateRoleError = null;
    },
    clearDeleteRoleSuccess: (state) => {
      state.deleteRoleSuccess = false;
      state.deleteRoleError = null;
    },
    clearInviteUserSuccess: (state) => {
      state.inviteUserSuccess = false;
      state.inviteUserError = null;
    },
    clearChangeRoleSuccess: (state) => {
      state.changeRoleSuccess = false;
      state.changeRoleError = null;
    },
    clearDeleteUserSuccess: (state) => {
      state.deleteUserSuccess = false;
      state.deleteUserError = null;
    },
    clearRoleComparison: (state) => {
      state.roleComparison = null;
      state.roleComparisonError = null;
    },
    resetRoleState: (state) => {
      return initialState;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.usersLoading = true;
        state.usersError = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action: PayloadAction<UserListResponse>) => {
        state.usersLoading = false;
        state.users = action.payload.results;
        state.usersCount = action.payload.count;
        state.usersNext = action.payload.next;
        state.usersPrevious = action.payload.previous;
        state.usersError = null;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.usersLoading = false;
        state.usersError = (action.payload as string) || 'Failed to fetch users';
      })
      .addCase(fetchMyPermissions.pending, (state) => {
        state.myPermissionsLoading = true;
        state.myPermissionsError = null;
      })
      .addCase(fetchMyPermissions.fulfilled, (state, action: PayloadAction<PermissionsResponse>) => {
        state.myPermissionsLoading = false;
        state.myPermissions = action.payload;
        state.myPermissionsError = null;
        // Note: available_modules is fetched separately via fetchAvailableModules
        // Company no longer includes available_modules in permissions response
      })
      .addCase(fetchMyPermissions.rejected, (state, action) => {
        state.myPermissionsLoading = false;
        state.myPermissionsError = (action.payload as string) || 'Failed to fetch my permissions';
      })
      .addCase(fetchUserPermissions.pending, (state) => {
        state.permissionsLoading = true;
        state.permissionsError = null;
      })
      .addCase(fetchUserPermissions.fulfilled, (state, action: PayloadAction<UserPermissionsResponse>) => {
        state.permissionsLoading = false;
        state.selectedUserPermissions = action.payload;
        state.permissionsError = null;
      })
      .addCase(fetchUserPermissions.rejected, (state, action) => {
        state.permissionsLoading = false;
        state.permissionsError = (action.payload as string) || 'Failed to fetch user permissions';
      })
      .addCase(fetchAvailableModules.pending, (state) => {
        state.availableModulesLoading = true;
        state.availableModulesError = null;
      })
      .addCase(fetchAvailableModules.fulfilled, (state, action: PayloadAction<AvailableModulesResponse>) => {
        state.availableModulesLoading = false;
        state.availableModules = action.payload;
        state.availableModulesError = null;
      })
      .addCase(fetchAvailableModules.rejected, (state, action) => {
        state.availableModulesLoading = false;
        state.availableModulesError = (action.payload as string) || 'Failed to fetch available modules';
      })
      .addCase(updateUserPermissions.pending, (state) => {
        state.updateLoading = true;
        state.updateError = null;
        state.updateSuccess = false;
      })
      .addCase(updateUserPermissions.fulfilled, (state) => {
        state.updateLoading = false;
        state.updateSuccess = true;
        state.updateError = null;
      })
      .addCase(updateUserPermissions.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError = (action.payload as string) || 'Failed to update permissions';
        state.updateSuccess = false;
      })
      .addCase(fetchRoleDefinitions.pending, (state) => {
        state.roleDefinitionsLoading = true;
        state.roleDefinitionsError = null;
      })
      .addCase(fetchRoleDefinitions.fulfilled, (state, action: PayloadAction<RoleListResponse>) => {
        state.roleDefinitionsLoading = false;
        state.roleDefinitions = action.payload.results;
        state.roleDefinitionsError = null;
      })
      .addCase(fetchRoleDefinitions.rejected, (state, action) => {
        state.roleDefinitionsLoading = false;
        state.roleDefinitionsError = (action.payload as string) || 'Failed to fetch roles';
      })
      .addCase(createRole.pending, (state) => {
        state.createRoleLoading = true;
        state.createRoleError = null;
        state.createRoleSuccess = false;
      })
      .addCase(createRole.fulfilled, (state) => {
        state.createRoleLoading = false;
        state.createRoleSuccess = true;
        state.createRoleError = null;
      })
      .addCase(createRole.rejected, (state, action) => {
        state.createRoleLoading = false;
        state.createRoleError = (action.payload as string) || 'Failed to create role';
        state.createRoleSuccess = false;
      })
      .addCase(updateRole.pending, (state) => {
        state.updateRoleLoading = true;
        state.updateRoleError = null;
        state.updateRoleSuccess = false;
      })
      .addCase(updateRole.fulfilled, (state) => {
        state.updateRoleLoading = false;
        state.updateRoleSuccess = true;
        state.updateRoleError = null;
      })
      .addCase(updateRole.rejected, (state, action) => {
        state.updateRoleLoading = false;
        state.updateRoleError = (action.payload as string) || 'Failed to update role';
        state.updateRoleSuccess = false;
      })
      .addCase(deleteRole.pending, (state) => {
        state.deleteRoleLoading = true;
        state.deleteRoleError = null;
        state.deleteRoleSuccess = false;
      })
      .addCase(deleteRole.fulfilled, (state) => {
        state.deleteRoleLoading = false;
        state.deleteRoleSuccess = true;
        state.deleteRoleError = null;
      })
      .addCase(deleteRole.rejected, (state, action) => {
        state.deleteRoleLoading = false;
        state.deleteRoleError = (action.payload as string) || 'Failed to delete role';
        state.deleteRoleSuccess = false;
      })
      .addCase(inviteUser.pending, (state) => {
        state.inviteUserLoading = true;
        state.inviteUserError = null;
        state.inviteUserSuccess = false;
      })
      .addCase(inviteUser.fulfilled, (state) => {
        state.inviteUserLoading = false;
        state.inviteUserSuccess = true;
        state.inviteUserError = null;
      })
      .addCase(inviteUser.rejected, (state, action) => {
        state.inviteUserLoading = false;
        state.inviteUserError = (action.payload as string) || 'Failed to invite user';
        state.inviteUserSuccess = false;
      })
      .addCase(changeUserRole.pending, (state) => {
        state.changeRoleLoading = true;
        state.changeRoleError = null;
        state.changeRoleSuccess = false;
      })
      .addCase(changeUserRole.fulfilled, (state) => {
        state.changeRoleLoading = false;
        state.changeRoleSuccess = true;
        state.changeRoleError = null;
      })
      .addCase(changeUserRole.rejected, (state, action) => {
        state.changeRoleLoading = false;
        state.changeRoleError = (action.payload as string) || 'Failed to change user role';
        state.changeRoleSuccess = false;
      })
      .addCase(deleteUser.pending, (state) => {
        state.deleteUserLoading = true;
        state.deleteUserError = null;
        state.deleteUserSuccess = false;
      })
      .addCase(deleteUser.fulfilled, (state) => {
        state.deleteUserLoading = false;
        state.deleteUserSuccess = true;
        state.deleteUserError = null;
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.deleteUserLoading = false;
        state.deleteUserError = (action.payload as string) || 'Failed to delete user';
        state.deleteUserSuccess = false;
      })
      .addCase(compareRoleChanges.pending, (state) => {
        state.roleComparisonLoading = true;
        state.roleComparisonError = null;
      })
      .addCase(compareRoleChanges.fulfilled, (state, action: PayloadAction<RoleComparison>) => {
        state.roleComparisonLoading = false;
        state.roleComparison = action.payload;
        state.roleComparisonError = null;
      })
      .addCase(compareRoleChanges.rejected, (state, action) => {
        state.roleComparisonLoading = false;
        state.roleComparisonError = (action.payload as string) || 'Failed to compare role changes';
        state.roleComparison = null;
      });
  }
});

export const {
  clearSelectedUser,
  clearUpdateSuccess,
  clearCreateRoleSuccess,
  clearUpdateRoleSuccess,
  clearDeleteRoleSuccess,
  clearInviteUserSuccess,
  clearChangeRoleSuccess,
  clearDeleteUserSuccess,
  clearRoleComparison,
  resetRoleState
} = roleSlice.actions;

export default roleSlice.reducer;
