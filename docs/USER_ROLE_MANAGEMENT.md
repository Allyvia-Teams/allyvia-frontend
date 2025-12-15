# User & Role Management Page

## Overview

The User & Role Management page (`UserRoleManagementTab`) is an admin-only interface for managing users and roles within the company. It provides functionality to create/edit/delete roles, invite users, change user roles, and delete users.

**Location**: Settings → User & Role Management tab (admin only)

---

## Page Structure

The page consists of two main sections:

### 1. Roles Section

**Purpose**: Manage custom roles (create, edit, delete)

**Features**:

- Display all role definitions (system roles + custom roles)
- Create new custom roles
- Edit existing custom roles
- Delete custom roles (system roles cannot be deleted)

**UI Components**:

- Table showing: Role Name, Created Date, Actions
- "Create Role" button
- Actions menu (Edit, Delete) for each role

### 2. Users Section

**Purpose**: Manage company users

**Features**:

- Display all users in the company
- Invite new users via email
- Change user roles
- Delete users

**UI Components**:

- Table showing: Name, Email, Role, Status, Actions
- "Invite User" button
- Actions menu (Change Role, Delete User) for each user

---

## Component Architecture

### Main Component

**File**: `src/views/settings/tabs/UserRoleManagementTab.tsx`

**Responsibilities**:

- Fetch and display users and roles
- Handle admin permission check
- Manage modals and dialogs
- Display success/error messages
- Coordinate user and role operations

### Sub-Components

1. **CreateRoleModal** (`src/ui-component/role/CreateRoleModal.tsx`)

   - Create new roles
   - Edit existing roles
   - Permission tree management

2. **InviteUserModal** (`src/ui-component/role/InviteUserModal.tsx`)

   - Invite new users via email
   - Assign role during invitation

3. **ChangeUserRoleModal** (`src/ui-component/role/ChangeUserRoleModal.tsx`)
   - Change existing user's role
   - Show permission comparison before change

---

## Data Flow

### Initial Load

```
Page Mounts
    ↓
Check isAdmin (useIsAdmin hook)
    ↓
If Admin:
    ↓
    Dispatch fetchUsers()
    ↓
    GET /api/v1/role/users/
    ↓
    Redux: role.users = User[]
    ↓
    UI: Display users table
    ↓
    Dispatch fetchRoleDefinitions()
    ↓
    GET /api/v1/role/list/
    ↓
    Redux: role.roleDefinitions = Role[]
    ↓
    UI: Display roles table
```

### Create Role Flow

```
Admin clicks "Create Role"
    ↓
setCreateRoleModalOpen(true)
    ↓
CreateRoleModal opens
    ↓
Modal fetches availableModules (if not loaded)
    ↓
    GET /api/v1/role/available-modules/
    ↓
    Build permission tree from availableModules
    ↓
Admin selects permissions in tree
    ↓
Admin enters role name and clicks "Create Role"
    ↓
Validate: role name required, at least one permission
    ↓
Convert draft state to Permission[] format
    ↓
Dispatch createRole({ role_display, permissions })
    ↓
    POST /api/v1/role/create/
    ↓
Redux: Automatically dispatches fetchRoleDefinitions()
    ↓
Role list refreshes → New role appears in table
    ↓
Modal shows success message → Closes after 1.5s
```

### Edit Role Flow

```
Admin clicks "Edit Role" on a role
    ↓
setSelectedRole(role)
setCreateRoleModalOpen(true)
    ↓
CreateRoleModal opens in edit mode
    ↓
Modal loads role.permissions
    ↓
    Convert permissions to UI tree
    ↓
    Build draft state from permissions
    ↓
Admin modifies permissions
    ↓
Admin clicks "Update Role"
    ↓
Convert draft state to Permission[] format
    ↓
Dispatch updateRole({ roleId, data })
    ↓
    PUT /api/v1/role/{id}/update/
    ↓
Redux: Automatically dispatches fetchRoleDefinitions()
    ↓
Role list refreshes → Updated role appears in table
    ↓
Modal shows success message → Closes after 1.5s
```

### Delete Role Flow

```
Admin clicks "Delete Role" on a role
    ↓
setRoleToDelete(role)
setDeleteConfirmOpen(true)
    ↓
Confirmation dialog opens
    ↓
Admin confirms deletion
    ↓
Dispatch deleteRole(roleId)
    ↓
    DELETE /api/v1/role/{id}/delete/
    ↓
Redux: Automatically dispatches fetchRoleDefinitions()
    ↓
Role list refreshes → Deleted role removed from table
    ↓
Success alert shown → Cleared after 3s
```

### Invite User Flow

```
Admin clicks "Invite User"
    ↓
setInviteUserModalOpen(true)
    ↓
InviteUserModal opens
    ↓
Admin fills form:
    - First Name
    - Last Name
    - Email
    - Role (from roleDefinitions)
    ↓
Admin clicks "Send Invitation"
    ↓
Validate form (all fields required, valid email)
    ↓
Check if selected role is system role or custom
    ↓
Prepare request:
    - System role: { email, first_name, last_name, role_type }
    - Custom role: { email, first_name, last_name, role_definition_id }
    ↓
Dispatch inviteUser(requestData)
    ↓
    POST /api/v1/role/users/invite/
    ↓
Backend sends welcome email to user
    ↓
Redux: Sets inviteUserSuccess = true
    ↓
Modal shows success message
    ↓
Modal closes after 1.5s
    ↓
Page dispatches fetchUsers() to refresh list
```

### Change User Role Flow

```
Admin clicks "Change Role" on a user
    ↓
setSelectedUser(user)
setChangeRoleModalOpen(true)
    ↓
ChangeUserRoleModal opens
    ↓
Shows user information and current role
    ↓
Admin selects new role from dropdown
    ↓
If role changed:
    ↓
    Dispatch compareRoleChanges()
    ↓
    GET /api/v1/role/users/{user_id}/role/compare/?role_definition_id=xxx
    ↓
    Returns: { summary, differences }
    ↓
Modal displays permission comparison:
    - Modules Gained
    - Modules Lost
    - Modules Changed
    - Detailed permission changes
    ↓
Admin reviews changes and clicks "Change Role"
    ↓
Dispatch changeUserRole({ userId, data })
    ↓
    PUT /api/v1/role/users/{user_id}/role/
    ↓
Redux: Automatically dispatches fetchUsers()
    ↓
Users list refreshes → User's role updated in table
    ↓
Modal shows success message → Closes after 1.5s
```

### Delete User Flow

```
Admin clicks "Delete User" on a user
    ↓
setUserToDelete(user)
setDeleteUserConfirmOpen(true)
    ↓
Confirmation dialog opens
    ↓
Admin confirms deletion
    ↓
Dispatch deleteUser(userId)
    ↓
    DELETE /api/v1/user/{user_id}/
    ↓
Redux: Automatically dispatches fetchUsers()
    ↓
Users list refreshes → Deleted user removed from table
    ↓
Success alert shown → Cleared after 3s
```

---

## Permission Checks

### Admin-Only Access

**Check**: `useIsAdmin()` hook

**Implementation**:

- Checks if current role's `role_type === 'admin'`
- If not admin → Shows message: "Only administrators can manage users and roles."

**Location**: `src/hooks/usePermission.ts`

### System Role Protection

**Check**: `isSystemRole(role)`

**Implementation**:

```typescript
const isSystemRole = (role: Role) => {
  return role.is_system_role || role.role_type === 'admin' || role.role_type === 'member';
};
```

**Protection**:

- System roles cannot be deleted
- System roles show shield icon in UI
- System roles have no actions menu (Edit/Delete disabled)

---

## Redux State Management

### State Structure

```typescript
interface RoleState {
  // Users
  users: User[];
  usersLoading: boolean;
  usersError: string | null;

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
  roleComparison: RoleComparison | null;
  roleComparisonLoading: boolean;
  roleComparisonError: string | null;

  // Delete User
  deleteUserLoading: boolean;
  deleteUserError: string | null;
  deleteUserSuccess: boolean;
}
```

### Actions Used

1. **fetchUsers()** - Load users list
2. **fetchRoleDefinitions()** - Load roles list
3. **createRole()** - Create new role
4. **updateRole()** - Update existing role
5. **deleteRole()** - Delete role
6. **inviteUser()** - Invite new user
7. **changeUserRole()** - Change user's role
8. **compareRoleChanges()** - Compare role permissions before change
9. **deleteUser()** - Delete user

---

## API Endpoints Used

### Users

| Endpoint                                     | Method | Purpose              | Called By              |
| -------------------------------------------- | ------ | -------------------- | ---------------------- |
| `/api/v1/role/users/`                        | GET    | Fetch all users      | `fetchUsers()`         |
| `/api/v1/role/users/invite/`                 | POST   | Invite new user      | `inviteUser()`         |
| `/api/v1/role/users/{user_id}/role/`         | PUT    | Change user role     | `changeUserRole()`     |
| `/api/v1/role/users/{user_id}/role/compare/` | GET    | Compare role changes | `compareRoleChanges()` |
| `/api/v1/user/{user_id}/`                    | DELETE | Delete user          | `deleteUser()`         |

### Roles

| Endpoint                          | Method | Purpose                    | Called By                 |
| --------------------------------- | ------ | -------------------------- | ------------------------- |
| `/api/v1/role/list/`              | GET    | Fetch all role definitions | `fetchRoleDefinitions()`  |
| `/api/v1/role/create/`            | POST   | Create new role            | `createRole()`            |
| `/api/v1/role/{id}/update/`       | PUT    | Update role                | `updateRole()`            |
| `/api/v1/role/{id}/delete/`       | DELETE | Delete role                | `deleteRole()`            |
| `/api/v1/role/available-modules/` | GET    | Get available modules      | `fetchAvailableModules()` |

---

## UI States & Feedback

### Loading States

- **Users Loading**: Shows CircularProgress while fetching users
- **Roles Loading**: Shows CircularProgress while fetching roles
- **Operation Loading**: Buttons show loading spinner during API calls

### Success States

- **Delete Role Success**: Green alert "Role deleted successfully!" (cleared after 3s)
- **Invite User Success**: Green alert "User invited successfully! A welcome email has been sent." (cleared after 3s)
- **Delete User Success**: Green alert "User deleted successfully!" (cleared after 3s)
- **Create/Update Role Success**: Success message in modal, modal closes after 1.5s
- **Change Role Success**: Success message in modal, modal closes after 1.5s

### Error States

- **Fetch Errors**: Red alert showing error message
- **Operation Errors**: Red alert or error message in modal
- All errors can be dismissed by clicking close button

---

## Key Features

### 1. Role Comparison

When changing a user's role, the system shows:

- **Modules Gained**: Permissions the user will gain
- **Modules Lost**: Permissions the user will lose
- **Modules Changed**: Permissions that will change

This helps admins understand the impact before making changes.

### 2. System Role Protection

System roles (Admin, Member) cannot be:

- Deleted
- Edited (via this interface)

They are marked with a shield icon and have no actions menu.

### 3. Role Selection Logic

**Invite User**:

- Admin selects role from dropdown
- If system role → sends `role_type: 'admin' | 'member'`
- If custom role → sends `role_definition_id: string`

**Change User Role**:

- Same logic as invite
- Shows comparison before change

### 4. Auto-Refresh

After create/update/delete operations:

- Role list automatically refreshes
- Users list automatically refreshes
- No manual refresh needed

---

## Complete User Journey Examples

### Example 1: Create a New "Cashier" Role

1. **Navigate**: Settings → User & Role Management
2. **Click**: "Create Role" button
3. **Modal Opens**: CreateRoleModal
4. **Enter**: Role name "Cashier"
5. **Select Permissions**:
   - Employees module: View only
   - Employees → Clock In/Out: View + Manage
   - Inventory module: View only
6. **Click**: "Create Role"
7. **Result**:
   - Role created and saved to backend
   - Role appears in Roles table
   - Modal closes automatically

### Example 2: Invite a New Cashier User

1. **Navigate**: Settings → User & Role Management
2. **Click**: "Invite User" button
3. **Modal Opens**: InviteUserModal
4. **Fill Form**:
   - First Name: "John"
   - Last Name: "Doe"
   - Email: "john@example.com"
   - Role: Select "Cashier" (from dropdown)
5. **Click**: "Send Invitation"
6. **Result**:
   - User invitation sent to backend
   - Welcome email sent to user
   - Users list refreshes (user appears once they accept)
   - Modal closes automatically

### Example 3: Change User's Role

1. **Navigate**: Settings → User & Role Management
2. **Find User**: In Users table
3. **Click**: Actions menu (three dots)
4. **Click**: "Change Role"
5. **Modal Opens**: ChangeUserRoleModal
6. **Select**: New role from dropdown
7. **Review**: Permission comparison (gained/lost/changed)
8. **Click**: "Change Role"
9. **Result**:
   - User's role updated in backend
   - Users list refreshes with new role
   - Modal closes automatically

### Example 4: Delete a Custom Role

1. **Navigate**: Settings → User & Role Management
2. **Find Role**: In Roles table (must be custom, not system)
3. **Click**: Actions menu (three dots)
4. **Click**: "Delete Role"
5. **Dialog Opens**: Confirmation dialog
6. **Confirm**: "Delete" button
7. **Result**:
   - Role deleted from backend
   - Role removed from table
   - Success message shown

---

## Data Structures

### User Object

```typescript
interface User {
  user_id: string;
  user_name?: string;
  user_email?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role_id: string;
  role_display?: string;
  is_active: boolean;
}
```

### Role Object

```typescript
interface Role {
  id: string;
  role_type: 'admin' | 'member' | 'custom';
  role_display?: string;
  permissions: Permission[];
  created_at?: string;
  is_system_role?: boolean;
}
```

### Role Comparison

```typescript
interface RoleComparison {
  summary: {
    modules_gained: number;
    modules_lost: number;
    modules_changed: number;
  };
  differences: {
    gained: Permission[];
    lost: Permission[];
    changed: Array<{
      key: string;
      current: { view: boolean; manage: boolean };
      new: { view: boolean; manage: boolean };
    }>;
  };
}
```

---

## Error Handling

### Common Errors

1. **Network Error**: "Failed to fetch users/roles"
2. **Permission Error**: "Only administrators can manage users and roles"
3. **Validation Error**: Form validation errors (missing fields, invalid email)
4. **API Error**: Backend error messages shown in alerts/modals

### Error Recovery

- All errors can be dismissed
- Retry operations by clicking buttons again
- Form validation errors clear as user types

---

## Loading & Performance

### Optimizations

1. **Parallel Fetching**: Users and roles fetched in parallel on mount
2. **Conditional Fetching**: Only fetch if user is admin
3. **Auto-Refresh**: Lists refresh automatically after mutations
4. **Lazy Loading**: Modals load data only when opened

### Loading Indicators

- CircularProgress spinners during data fetching
- Button loading states during API calls
- Disabled buttons prevent duplicate submissions

---

## Security & Permissions

### Admin-Only Access

- Page checks `isAdmin` before rendering
- All API calls require admin role (backend validates)
- Non-admin users see "Only administrators can manage users and roles" message

### System Role Protection

- System roles (admin, member) cannot be deleted
- System roles shown with shield icon
- Protection enforced in both UI and backend

---

## Integration Points

### With CreateRoleModal

- Opens when "Create Role" clicked (no role prop)
- Opens when "Edit Role" clicked (with role prop)
- Shares same permission tree management

### With InviteUserModal

- Opens when "Invite User" clicked
- Uses roleDefinitions for role dropdown
- Refreshes users list on success

### With ChangeUserRoleModal

- Opens when "Change Role" clicked on user
- Uses roleDefinitions for role dropdown
- Shows permission comparison before change

### With Settings Page

- Part of Settings page tabs
- Only visible to admin users
- Shares Settings page layout and navigation

---

## Related Documentation

- [ROLE_SYSTEM.md](./ROLE_SYSTEM.md) - Detailed role system architecture
- [SETTINGS.md](./SETTINGS.md) - Settings page structure
- [API_STRUCTURE_COMPARISON.md](./API_STRUCTURE_COMPARISON.md) - API endpoints reference
- [ROLE_MANAGEMENT_VERIFICATION.md](./ROLE_MANAGEMENT_VERIFICATION.md) - Technical verification

---

## Summary

The User & Role Management page provides a complete interface for admins to:

1. ✅ **Manage Roles**: Create, edit, delete custom roles
2. ✅ **Manage Users**: Invite, change roles, delete users
3. ✅ **View Permissions**: See permission comparisons before changes
4. ✅ **Handle Feedback**: Success/error messages for all operations
5. ✅ **Auto-Refresh**: Lists update automatically after changes

All operations are integrated with Redux for state management and API calls, ensuring consistent UI updates and error handling.
