# Role System

## Overview

The Role System is a comprehensive permission management implementation that manages permissions at multiple levels: modules, pages, tabs, and actions. The system is built around a centralized Registry that serves as the single source of truth for all navigation, permissions, and menu structure.

## Core Architecture

### 1. Registry System (`src/registry/index.tsx`)

**Purpose**: Central source of truth for every navigable surface in Allyvia

**Key Components**:

- React Router paths and components
- Menu metadata (id, icon, title, dev/hidden flags)
- Permission metadata (permission keys, module ownership, tabs/actions)

**Structure**:

```typescript
interface RegistryNode {
  menuId: string; // Unique identifier (e.g., "employees-home")
  type: 'module' | 'collapse' | 'page';
  title: string; // Display name
  path?: string; // React Router path
  component?: ComponentType; // React component
  icon?: ComponentType; // Icon component
  moduleKey?: string; // Module grouping (e.g., "employees")
  permissionKey?: string; // Permission key (may differ from menuId)
  supportsView?: boolean; // Can user view this?
  supportsManage?: boolean; // Can user manage this?
  tabs?: RegistryTab[]; // Tabs (e.g., Finance tabs)
  actions?: RegistryAction[]; // Actions (e.g., "Add Employee")
  children?: RegistryNode[]; // Nested items (for modules)
  hidden?: boolean; // Hidden from menu
  requiresPermission?: boolean; // Whether to check permissions
}
```

### 2. Builders System (`src/registry/builders.ts`)

**Purpose**: Converts registry into usable structures

**Key Functions**:

- `buildRoutes()`: Converts registry nodes to React Router route descriptors
- `buildMenuItems()`: Converts registry nodes to menu items
- `buildPermissionMap()`: Creates permission key to menu ID mappings
- `getModuleDisplayName()`: Gets display name for modules
- `getPagePermissionDisplayName()`: Gets display name for pages/tabs/actions

**Outputs**:

- React Router routes (wrapped with ProtectedRoute)
- Menu tree structure
- Permission key mappings (`permissionKeyToMenuIdMap`)

### 3. Permission Data Structure

**Hierarchy**:

```
Permission (Module level)
  ├── key: string (module key, e.g., "employees")
  ├── view: boolean (can view module)
  ├── manage: boolean (can manage module)
  ├── pages: PagePermission[] (page-level permissions)
  │   └── actions: ActionPermission[] (page-specific actions)
  ├── tabs: TabPermission[] (tab-level permissions)
  │   └── actions: ActionPermission[] (tab-specific actions)
  └── actions: ActionPermission[] (module-level actions)
```

**Type Definitions**:

```typescript
interface Permission {
  key: string;
  view: boolean;
  manage: boolean;
  pages: PagePermission[];
  tabs: TabPermission[];
  actions: ActionPermission[];
}

interface PagePermission {
  key: string;
  displayName: string;
  actions: ActionPermission[];
}

interface TabPermission {
  key: string;
  displayName: string;
  actions: ActionPermission[];
}

interface ActionPermission {
  key: string;
  value: boolean; // Enabled/disabled
  displayName: string;
}
```

### 4. Role Creation Flow

**Component**: `src/ui-component/role/CreateRoleModal.tsx`

**Flow**:

1. **Modal Opens** → Fetches available modules (if not cached)
2. **Initialize Tree**:
   - Create mode: `availableModulesToUITree()` → zero access state
   - Edit mode: `permissionsToUITree()` → existing permissions
3. **User Interactions**:
   - Select modules in NavigationPreview
   - Configure tabs/actions in TabsAndActionsPanel
   - View/manage toggles update draft state
4. **Save**:
   - Validate (role name required, at least one view permission)
   - Convert UI tree to API format (`uiTreeToPermissionsFormat()`)
   - Dispatch `createRole()` or `updateRole()` action

**Key Helper Files**:

- `src/utils/permissionNodeAdapter.ts`: Converts between API format and UI tree
- `src/utils/rolePermissionHelpers.ts`: Manages draft state and permission cascading
- `src/ui-component/role/parts/NavigationPreview.tsx`: Shows navigation preview
- `src/ui-component/role/parts/TabsAndActionsPanel.tsx`: Manages tabs and actions

### 5. Permission State Management

**DraftState Structure**:

```typescript
interface DraftState {
  draft: Record<string, { view: boolean; manage: boolean }>; // Module/page/tab access
  actions: Record<string, boolean>; // Action access
  index: {
    parent: Record<string, string | null>; // Parent relationships
    children: Record<string, string[]>; // Children relationships
    kind: Record<string, 'module' | 'page' | 'tab' | 'action'>; // Node types
    capabilities: Record<string, { supportsView: boolean; supportsManage: boolean }>;
  };
}
```

**Key Functions**:

- `buildDraftState()`: Creates draft state from UI tree
- `zeroDraftState()`: Creates empty draft state
- `setViewState()`: Updates view permission (cascades up to parents)
- `setManageState()`: Updates manage permission (cascades down to children)
- `setActionState()`: Updates action permission
- `applyStateToTree()`: Applies draft state to UI tree for display
- `currentPermissionsFromState()`: Converts draft state to API format

**Permission Inheritance Rules**:

1. **Manage → View**: If `manage: true`, then `view: true` automatically
2. **View → Parent View**: If child has view, parent gets view
3. **Manage → Children**: If parent has manage, all children get view (and manage if supported)
4. **Actions**: Actions are independent but require parent module to have view

### 6. API Integration

**Endpoints** (`src/api/role.api.ts`):

| Endpoint                   | Method | Purpose                                    |
| -------------------------- | ------ | ------------------------------------------ |
| `/role/permissions/`       | GET    | Get current user's permissions             |
| `/role/available-modules/` | GET    | Get available modules (subscription-based) |
| `/role/list/`              | GET    | Get all role definitions                   |
| `/role/create/`            | POST   | Create custom role                         |
| `/role/{id}/update/`       | PUT    | Update role                                |
| `/role/{id}/delete/`       | DELETE | Delete role                                |
| `/role/users/{id}/role/`   | PUT    | Change user's role                         |

**Redux Slice** (`src/store/slices/role.ts`):

- `myPermissions`: Current user's permissions
- `availableModules`: Modules available in subscription
- `roleDefinitions`: List of all roles
- `users`: List of users in company
- Async thunks for all role operations

### 7. Route Protection

**Component**: `src/routes/guards/ProtectedRoute.tsx`

**Protection Flow**:

1. Check subscription availability (module must be in subscription plan)
2. Check user permissions (build allowed keys from permissions)
3. Map permission keys to menu IDs using `permissionKeyToMenuIdMap`
4. If both pass → render component
5. If either fails → redirect to `/403`

**Special Cases**:

- Admin users bypass permission checks (but still respect subscription)
- Routes with `requiresPermission: false` skip permission checks
- Menu filtering happens separately via `subscription-menu.ts`

### 8. Data Transformation Pipeline

**AvailableModules → UI Tree**:

- Function: `availableModulesToUITree()`
- Input: `AvailableModule[]` from API
- Output: `UIPermissionNode[]` for UI
- Process: Converts API format to editable tree structure with zero access state

**Permissions → UI Tree**:

- Function: `permissionsToUITree()`
- Input: `Permission[]` from API
- Output: `UIPermissionNode[]` for UI
- Process: Converts existing permissions to editable tree, preserves access state

**UI Tree → Permissions**:

- Function: `uiTreeToPermissionsFormat()`
- Input: `UIPermissionNode[]` from UI
- Output: `Permission[]` for API
- Process: Only includes modules/pages/tabs with view/manage enabled, filters actions

## Key Files Reference

| File                                        | Purpose                | Key Exports                                                                          |
| ------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| `src/registry/index.tsx`                    | Registry definition    | `APP_REGISTRY`                                                                       |
| `src/registry/builders.ts`                  | Builders and helpers   | `buildRoutes()`, `buildMenuItems()`, `permissionKeyToMenuIdMap`                      |
| `src/ui-component/role/CreateRoleModal.tsx` | Role creation modal    | Main role editor component                                                           |
| `src/utils/permissionNodeAdapter.ts`        | Data transformation    | `availableModulesToUITree()`, `permissionsToUITree()`, `uiTreeToPermissionsFormat()` |
| `src/utils/rolePermissionHelpers.ts`        | Draft state management | `buildDraftState()`, `setViewState()`, `setManageState()`, etc.                      |
| `src/utils/permission-helpers.ts`           | Permission checking    | `buildAllowedKeys()`, `makeMenuChecker()`, `canPerformAction()`                      |
| `src/routes/guards/ProtectedRoute.tsx`      | Route protection       | Permission-aware route guard                                                         |
| `src/store/slices/role.ts`                  | Redux state            | Role state and async thunks                                                          |
| `src/api/role.api.ts`                       | API layer              | All role-related API calls                                                           |

## End-to-End Flow Examples

### Creating a New Role

1. Admin opens CreateRoleModal
2. System fetches available modules from `/role/available-modules/`
3. Modal converts available modules to UI tree with zero access
4. Admin selects "Employees" module → enables view
5. Admin selects "Employee Management" page → enables view
6. Admin enables "Add Employee" action → sets action value to true
7. Admin clicks Save
8. System validates (role name, at least one permission)
9. System converts UI tree to API format (`Permission[]`)
10. System sends `POST /role/create/` with payload
11. Backend creates role and returns success
12. System refreshes role definitions list
13. Modal closes

### User Accessing Protected Route

1. User navigates to `/employees`
2. React Router matches route from `buildRoutes()`
3. `ProtectedRoute` wrapper checks:
   - Is "employees" module in subscription? (check `availableModules`)
   - Does user have permission? (check `myPermissions` via `permission-helpers`)
4. If both pass → render `EmployeeManagementPage` component
5. If either fails → redirect to `/403`

### Menu Filtering

1. Menu component calls `buildMenuItems()` from registry
2. `subscription-menu.ts` filters items based on subscription plan
3. Menu also filters based on user permissions
4. Only accessible items are displayed

## Key Design Principles

1. **Single Source of Truth**: Registry defines everything (routes, menus, permissions)
2. **Automatic Derivation**: Routes, menus, and permission maps are auto-generated from registry
3. **Consistent Keys**: menuId, permissionKey, and moduleKey are normalized (lowercase)
4. **Cascading Permissions**: View/manage permissions cascade up/down the hierarchy
5. **Subscription Awareness**: Permission system respects subscription plan limitations
6. **Type Safety**: Full TypeScript support for all data structures
