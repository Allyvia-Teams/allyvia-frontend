# Create Role Modal - End-to-End Architecture

## Overview

This document provides a comprehensive explanation of how the Create Role Modal works end-to-end, including:

- How view/manage permission changes work
- How child pages are managed
- How tabs are managed with their actions
- The complete data flow from initialization to save

---

## Table of Contents

1. [Component Architecture](#component-architecture)
2. [Data Flow Overview](#data-flow-overview)
3. [Initialization Flow](#initialization-flow)
4. [View/Manage Changes System](#viewmanage-changes-system)
5. [Child Pages Management](#child-pages-management)
6. [Tabs Management](#tabs-management)
7. [Actions Management](#actions-management)
8. [Cascading Logic](#cascading-logic)
9. [Save & Validation Flow](#save--validation-flow)
10. [Complete User Journey](#complete-user-journey)

---

## Component Architecture

### Main Component: `CreateRoleModal`

**File**: `src/ui-component/role/CreateRoleModal.tsx`

**Purpose**: Main orchestrator component that manages:

- Modal state (open/close)
- Role name input
- Permission tree state
- Save/update operations
- Success/error handling

### Child Components

#### 1. NavigationPreview

**File**: `src/ui-component/role/parts/NavigationPreview.tsx`

**Purpose**: Displays the left panel showing all modules in a tree structure

**Features**:

- Always expanded tree (all modules visible)
- Clickable modules (to select for editing)
- Visual indicators for view/manage access (eye/edit icons)
- Filters out items without access (except modules)

#### 2. TabsAndActionsPanel

**File**: `src/ui-component/role/parts/TabsAndActionsPanel.tsx`

**Purpose**: Displays the right panel showing tabs and actions for the selected module

**Features**:

- Shows tabs with expand/collapse for actions
- Shows module-level actions
- Clickable tabs to cycle through Off → View → Manage → Off
- Clickable actions to toggle on/off
- Visual indicators for access states

---

## Data Flow Overview

### High-Level Flow

```
1. Registry (APP_REGISTRY)
   ↓
2. API: Available Modules (includes tabs/actions metadata)
   ↓
3. Adapter: Convert to UI Tree (UIPermissionNode[])
   ↓
4. Draft State: Manage permission changes (DraftState)
   ↓
5. Apply State: Update UI Tree with current access
   ↓
6. Save: Convert UI Tree to API Format (Permission[])
   ↓
7. API: Create/Update Role
```

### Key Data Structures

#### 1. Registry (`APP_REGISTRY`)

**Location**: `src/registry/index.tsx`

**Purpose**: Single source of truth for all navigation, permissions, tabs, and actions

**Example**:

```typescript
{
  menuId: 'finance',
  type: 'page',
  title: 'Finance & Accounting',
  moduleKey: 'finance',
  supportsView: true,
  supportsManage: false,
  tabs: [
    {
      key: 'finance-invoices',
      title: 'Invoices',
      actions: [
        { key: 'finance-create-invoice', title: 'Create Invoice' },
        { key: 'finance-edit-invoice', title: 'Edit Invoice' }
      ]
    }
  ]
}
```

#### 2. AvailableModule (from API)

**Type**: `types/role.ts`

**Structure**:

```typescript
interface AvailableModule {
  key: string; // Module key (e.g., "finance")
  moduleName: string; // Display name
  view: boolean | string; // View capability
  manage: boolean | string | '-'; // Manage capability
  pages?: PagePermission[]; // Page-level permissions
  tabs?: TabPermission[]; // Tab-level permissions
  actions?: ActionPermission[]; // Module-level actions
}
```

#### 3. UIPermissionNode (UI Tree)

**Type**: `utils/permissionNodeAdapter.ts`

**Structure**:

```typescript
interface UIPermissionNode {
  key: string; // Unique key
  label: string; // Display label
  level: 'module' | 'page' | 'action';
  access: { view: boolean; manage: boolean };
  capabilities: {
    supportsView: boolean;
    supportsManage: boolean;
    isTab?: boolean; // True if this is a tab
  };
  children?: UIPermissionNode[];
}
```

#### 4. DraftState (Permission State)

**Type**: `utils/rolePermissionHelpers.ts`

**Structure**:

```typescript
interface DraftState {
  draft: DraftMap; // Map of view/manage access
  actions: ActionMap; // Map of action enabled/disabled
  index: Index; // Parent/children relationships
}
```

#### 5. Permission (API Format)

**Type**: `types/role.ts`

**Structure**:

```typescript
interface Permission {
  key: string; // Module key
  view: boolean; // Can view module
  manage: boolean; // Can manage module
  pages: PagePermission[]; // Page permissions
  tabs: TabPermission[]; // Tab permissions
  actions: ActionPermission[]; // Module-level actions
}
```

---

## Initialization Flow

### Step 1: Modal Opens

**Location**: `CreateRoleModal.tsx` - `useEffect` hook

**What Happens**:

1. Modal opens with `open={true}`
2. Check if `availableModules` is loaded
3. If not, dispatch `fetchAvailableModules()`
4. Initialize role display name (from role if editing, empty if creating)

```typescript
useEffect(() => {
  if (!open) return;

  // Fetch available modules if not loaded
  if (!availableModules) {
    dispatch(fetchAvailableModules());
  }

  // Initialize role display name
  if (role) {
    setRoleDisplay(role.role_display || '');
  } else {
    setRoleDisplay('');
  }
}, [open, role, dispatch, availableModules]);
```

### Step 2: Build UI Tree

**Location**: `CreateRoleModal.tsx` - Second `useEffect` hook

**What Happens**:

1. Wait for `availableModules` to load
2. Check if editing (role with permissions) or creating (no role)
3. Build UI tree:
   - **Edit Mode**: Convert existing permissions to UI tree
   - **Create Mode**: Convert available modules to UI tree
4. Initialize draft state:
   - **Edit Mode**: Build draft state from existing permissions
   - **Create Mode**: Zero draft state (all permissions disabled)

```typescript
useEffect(() => {
  if (!open || !availableModules) return;

  const modulesList = availableModules.available_modules || [];
  let tree: UIPermissionNode[] = [];
  let hasExistingPermissions = false;

  if (role && role.permissions && role.permissions.length > 0) {
    // Edit mode: convert existing permissions to UI tree
    tree = permissionsToUITree(role.permissions);
    hasExistingPermissions = true;
  } else {
    // Create mode: convert available modules to UI tree
    tree = availableModulesToUITree(modulesList);
  }

  setBaseTree(tree);
  setDraftState(
    hasExistingPermissions
      ? buildDraftState(tree) // Edit: preserve existing permissions
      : zeroDraftState(tree) // Create: start with all disabled
  );
}, [open, availableModules, role, dispatch]);
```

### Step 3: Convert Available Modules to UI Tree

**Location**: `utils/permissionNodeAdapter.ts` - `availableModulesToUITree()`

**Process**:

1. Iterate through each available module
2. Create module node with capabilities
3. Process tabs (group under "Tabs" parent node)
4. Process pages
5. Process module-level actions
6. Build hierarchical tree structure

**Example Transformation**:

**Input (AvailableModule)**:

```typescript
{
  key: "finance",
  moduleName: "Finance & Accounting",
  view: true,
  manage: false,
  tabs: [
    {
      key: "finance-invoices",
      displayName: "Invoices",
      actions: [
        { key: "finance-create-invoice", value: true, displayName: "Create Invoice" }
      ]
    }
  ]
}
```

**Output (UIPermissionNode[])**:

```typescript
[
  {
    key: 'finance',
    label: 'Finance & Accounting',
    level: 'module',
    access: { view: false, manage: false },
    capabilities: { supportsView: true, supportsManage: false },
    children: [
      {
        key: 'finance-tabs',
        label: 'Tabs',
        level: 'page',
        access: { view: false, manage: false },
        capabilities: { supportsView: true, supportsManage: false },
        children: [
          {
            key: 'finance-invoices',
            label: 'Invoices',
            level: 'page',
            access: { view: false, manage: false },
            capabilities: { supportsView: true, supportsManage: false, isTab: true },
            children: [
              {
                key: 'finance-create-invoice',
                label: 'Create Invoice',
                level: 'action',
                access: { view: false, manage: false },
                capabilities: { supportsView: false, supportsManage: true }
              }
            ]
          }
        ]
      }
    ]
  }
];
```

---

## View/Manage Changes System

### How View/Manage Changes Work

**Location**: `CreateRoleModal.tsx` - `handleAccessChange()`

**Handler Function**:

```typescript
const handleAccessChange = useCallback(
  (key: string, nextView: boolean, nextManage: boolean) => {
    setDraftState((prev) => {
      if (!prev) return prev;
      const node = nodesByKey[key];
      if (!node) return prev;

      let updatedState = prev;

      // Handle actions separately
      if (node.level === 'action') {
        if (nextManage !== node.access.manage) {
          updatedState = setActionState(updatedState, key, nextManage);
        }
        return updatedState;
      }

      // Handle modules/pages/tabs
      if (node.capabilities.supportsView && nextView !== node.access.view) {
        updatedState = setViewState(updatedState, key, nextView);
      }
      if (node.capabilities.supportsManage && nextManage !== node.access.manage) {
        updatedState = setManageState(updatedState, key, nextManage);
      }

      return updatedState;
    });
  },
  [nodesByKey]
);
```

### Cascading Logic

**Location**: `utils/rolePermissionHelpers.ts`

#### When View is Enabled

**Function**: `setViewState()`

**Behavior**:

1. Enable view access for the node
2. **Bubble Up**: Enable view for all parent nodes
3. **No Cascade Down**: Children are not automatically enabled

**Example**:

```
Enable View for "Invoices" tab
  ↓
Bubble Up: Enable view for "Finance" module
  ↓
Children remain unchanged
```

#### When View is Disabled

**Behavior**:

1. Disable view access for the node
2. **Disable Manage**: If node has manage, disable it too
3. **Cascade Down**: Disable view/manage for all descendants

**Example**:

```
Disable View for "Finance" module
  ↓
Disable Manage for "Finance" module
  ↓
Cascade Down:
  - Disable view for "Invoices" tab
  - Disable manage for "Invoices" tab
  - Disable all actions under "Invoices"
```

#### When Manage is Enabled

**Function**: `setManageState()`

**Behavior**:

1. Enable manage access for the node
2. **Auto-Enable View**: Manage implies view
3. **Bubble Up**: Enable view for all parent nodes
4. **Cascade Down**: Enable view/manage for all descendants

**Example**:

```
Enable Manage for "Finance" module
  ↓
Auto-Enable View for "Finance" module
  ↓
Bubble Up: (no parent in this case)
  ↓
Cascade Down:
  - Enable view for "Invoices" tab
  - Enable manage for "Invoices" tab
  - Enable all actions under "Invoices"
```

#### When Manage is Disabled

**Behavior**:

1. Disable manage access for the node
2. **Keep View**: View remains enabled (if it was enabled)
3. **Cascade Down**: Disable manage for all descendants

**Example**:

```
Disable Manage for "Finance" module
  ↓
View remains enabled (if it was enabled)
  ↓
Cascade Down:
  - Disable manage for "Invoices" tab
  - Disable all actions under "Invoices"
  - View remains enabled
```

---

## Child Pages Management

### How Child Pages Work

**Location**: `permissionNodeAdapter.ts` - `availableModulesToUITree()`

**Process**:

1. Available modules include `pages` array
2. Each page can have:
   - Display name
   - Actions (page-level actions)
3. Pages are converted to `UIPermissionNode` with `level: 'page'`
4. Pages inherit capabilities from parent module

**Example**:

**Registry Definition**:

```typescript
{
  menuId: 'employees-home',
  type: 'page',
  title: 'Employee Management',
  moduleKey: 'employees',
  supportsView: true,
  supportsManage: true,
  actions: [
    { key: 'employees-add', title: 'Add Employee' },
    { key: 'employees-edit', title: 'Edit Employee' }
  ]
}
```

**UI Tree Structure**:

```typescript
{
  key: "employees",
  level: "module",
  children: [
    {
      key: "employees-home",
      level: "page",
      label: "Employee Management",
      capabilities: {
        supportsView: true,    // Inherited from module
        supportsManage: true   // Inherited from module
      },
      children: [
        {
          key: "employees-add",
          level: "action",
          label: "Add Employee"
        }
      ]
    }
  ]
}
```

### Page Access Control

**Behavior**:

- Pages inherit view/manage capabilities from parent module
- Pages can be individually enabled/disabled
- When page view is enabled, parent module view is automatically enabled (bubble up)
- When page view is disabled, all child actions are disabled (cascade down)
- When module view is disabled, all pages are disabled (cascade down)

---

## Tabs Management

### How Tabs Work

**Location**: `permissionNodeAdapter.ts` - `availableModulesToUITree()`

**Structure**:

1. Tabs are grouped under a "Tabs" parent node (key: `{moduleKey}-tabs`)
2. Each tab is marked with `isTab: true`
3. Tabs can have nested actions
4. Tabs inherit capabilities from parent module

**Example**:

**Registry Definition**:

```typescript
{
  menuId: 'finance',
  moduleKey: 'finance',
  tabs: [
    {
      key: 'finance-invoices',
      title: 'Invoices',
      actions: [
        { key: 'finance-create-invoice', title: 'Create Invoice' }
      ]
    }
  ]
}
```

**UI Tree Structure**:

```typescript
{
  key: "finance",
  level: "module",
  children: [
    {
      key: "finance-tabs",      // Tabs group node
      level: "page",
      label: "Tabs",
      children: [
        {
          key: "finance-invoices",
          level: "page",
          label: "Invoices",
          capabilities: {
            isTab: true,          // Marked as tab
            supportsView: true,   // Inherited from module
            supportsManage: true  // Inherited from module
          },
          children: [
            {
              key: "finance-create-invoice",
              level: "action",
              label: "Create Invoice"
            }
          ]
        }
      ]
    }
  ]
}
```

### Tab Interaction Flow

**Location**: `TabsAndActionsPanel.tsx` - `handleTabClick()`

**Cycle**: Off → View → Manage → Off

**Step 1: Off → View**

```typescript
// First click: Enable view
nextView = true;
nextManage = false;
onAccessChange(tab.key, nextView, nextManage);
```

**Step 2: View → Manage**

```typescript
// Second click: Enable manage (and all child actions)
nextView = true;
nextManage = true;
onAccessChange(tab.key, nextView, nextManage);

// Cascade: Enable all child actions
if (nextManage && hasTabActions) {
  tabActions.forEach((action) => {
    onAccessChange(action.key, false, true);
  });
}
```

**Step 3: Manage → Off**

```typescript
// Third click: Disable everything
nextView = false;
nextManage = false;
onAccessChange(tab.key, nextView, nextManage);

// Cascade: Disable all child actions
if (!nextManage && hasTabActions) {
  tabActions.forEach((action) => {
    onAccessChange(action.key, false, false);
  });
}
```

### Tab Display Logic

**Location**: `NavigationPreview.tsx`

**Rules**:

- **Modules**: Always shown (so users can click to manage)
- **Tabs**: Only shown if:
  - View or manage access is enabled, OR
  - Tab has actions (even if no access)

**Code**:

```typescript
// For pages/tabs: show if view or manage access is enabled
if (node.level !== 'module') {
  const isTab = node.capabilities?.isTab === true;
  const hasTabActions = isTab && node.children && node.children.some((c) => c.level === 'action');

  // Always show tabs with actions
  if (!node.access.view && !node.access.manage && !hasTabActions) {
    return null; // Hide tab
  }
}
```

---

## Actions Management

### Action Types

#### 1. Module-Level Actions

**Location**: Module's direct children

**Example**:

- "Manage PINs" (under Employees module)
- Module-wide actions that don't belong to a specific page/tab

**UI Tree**:

```typescript
{
  key: "employees",
  level: "module",
  children: [
    {
      key: "security-manage-pins",
      level: "action",
      label: "Manage PINs"
    }
  ]
}
```

#### 2. Tab-Level Actions

**Location**: Nested under tabs

**Example**:

- "Create Invoice" (under Finance → Invoices tab)
- Actions specific to a tab

**UI Tree**:

```typescript
{
  key: "finance-invoices",
  level: "page",
  capabilities: { isTab: true },
  children: [
    {
      key: "finance-create-invoice",
      level: "action",
      label: "Create Invoice"
    }
  ]
}
```

#### 3. Page-Level Actions

**Location**: Nested under pages

**Example**:

- "Add Employee" (under Employees → Employee Management page)

### Action Access Control

**Location**: `rolePermissionHelpers.ts` - `setActionState()`

**Behavior**:

1. Actions only have `manage` (no `view`)
2. When action is enabled:
   - Set `actions[key] = true`
   - **Bubble Up**: Enable view for all parent nodes
3. When action is disabled:
   - Set `actions[key] = false`
   - No cascade down (actions don't have children)

**Important**: Actions can only be enabled if parent has manage access

**Location**: `TabsAndActionsPanel.tsx`

**Code**:

```typescript
// Actions require parent tab to have manage access
const canToggleAction = hasManage; // hasManage from parent tab

onClick={() => {
  if (!canToggleAction) return; // Prevent if parent doesn't have manage
  const nextManage = !isEnabled;
  onAccessChange(action.key, false, nextManage);
}}
```

---

## Cascading Logic - Complete Rules

### Rule 1: View Enable

**Trigger**: User enables view for a node

**Cascade**:

- ✅ **Bubble Up**: Enable view for all ancestors
- ❌ **No Cascade Down**: Children unchanged

**Code**: `setViewState()` → `bubbleViewUp()`

### Rule 2: View Disable

**Trigger**: User disables view for a node

**Cascade**:

- ✅ **Disable Manage**: If node has manage, disable it
- ✅ **Cascade Down**: Disable view/manage for all descendants

**Code**: `setViewState()` → `visitDescendants()`

### Rule 3: Manage Enable

**Trigger**: User enables manage for a node

**Cascade**:

- ✅ **Auto-Enable View**: Manage implies view
- ✅ **Bubble Up**: Enable view for all ancestors
- ✅ **Cascade Down**: Enable view/manage for all descendants

**Code**: `setManageState()` → `visitDescendants()`

### Rule 4: Manage Disable

**Trigger**: User disables manage for a node

**Cascade**:

- ✅ **Keep View**: View remains enabled (if it was)
- ✅ **Cascade Down**: Disable manage for all descendants

**Code**: `setManageState()` → `visitDescendants()`

### Rule 5: Action Enable

**Trigger**: User enables an action

**Cascade**:

- ✅ **Bubble Up**: Enable view for all ancestors

**Code**: `setActionState()` → `bubbleViewUp()`

---

## Save & Validation Flow

### Step 1: Validation

**Location**: `CreateRoleModal.tsx` - `validate()`

**Checks**:

1. Role name is required
2. At least one view permission must be enabled

```typescript
const validate = (): string | undefined => {
  if (!roleDisplay.trim()) return 'Role name is required.';
  if (!hasAnyViewState(draftState)) {
    return 'Select at least one permission to view.';
  }
  return undefined;
};
```

### Step 2: Convert Draft State to Permissions

**Location**: `CreateRoleModal.tsx` - `handleSave()`

**Process**:

1. Get current permissions from draft state
2. Convert UI tree to API format

```typescript
const handleSave = () => {
  const err = validate();
  if (err) {
    alert(err);
    return;
  }

  if (!draftState) return;

  // Convert draft state to Permission[] format
  const permissions = currentPermissionsFromState(baseTree, draftState);

  const data: CreateRoleRequest | UpdateRoleRequest = {
    role_display: roleDisplay.trim(),
    permissions: permissions
  };

  if (isEditMode && role) {
    dispatch(updateRole({ roleId: role.id, data: data as UpdateRoleRequest }));
  } else {
    dispatch(createRole(data as CreateRoleRequest));
  }
};
```

### Step 3: Convert UI Tree to API Format

**Location**: `permissionNodeAdapter.ts` - `uiTreeToPermissionsFormat()`

**Process**:

1. Filter modules (only include if view/manage is enabled)
2. For each module:
   - Include module-level actions (if enabled)
   - Include pages (if parent has view)
   - Include tabs (if parent has view)
   - Include page/tab actions (if enabled)

**Key Rules**:

- Only include modules with `view: true` or `manage: true`
- Only include pages/tabs if parent module has `view: true`
- Only include actions if `value: true` (which maps to `manage: true` in UI)

### Step 4: API Call

**Location**: Redux slice - `createRole()` or `updateRole()`

**API Endpoint**:

- **Create**: `POST /api/v1/role/`
- **Update**: `PUT /api/v1/role/{roleId}/`

**Payload**:

```typescript
{
  role_display: "Cashier",
  permissions: [
    {
      key: "finance",
      view: true,
      manage: false,
      pages: [],
      tabs: [
        {
          key: "finance-invoices",
          displayName: "Invoices",
          actions: [
            {
              key: "finance-create-invoice",
              value: true,
              displayName: "Create Invoice"
            }
          ]
        }
      ],
      actions: []
    }
  ]
}
```

---

## Complete User Journey

### Scenario 1: Create New Role

**Step 1: Open Modal**

```
User clicks "Create Role" button
  ↓
CreateRoleModal opens (open={true})
  ↓
Fetch available modules (if not cached)
  ↓
Initialize UI tree from available modules
  ↓
Initialize draft state (all permissions disabled)
```

**Step 2: Select Module**

```
User clicks "Finance" module in NavigationPreview
  ↓
selectedKey = "finance"
  ↓
Find parentModuleNode = Finance module node
  ↓
targetModuleNode = Finance module node
  ↓
TabsAndActionsPanel displays Finance tabs and actions
```

**Step 3: Enable Tab Access**

```
User clicks "Invoices" tab in TabsAndActionsPanel
  ↓
handleTabClick() called
  ↓
Cycle: Off → View
  ↓
onAccessChange("finance-invoices", true, false)
  ↓
setViewState() updates draft state
  ↓
Cascade:
  - Enable view for "Finance" module (bubble up)
  - UI updates to show access indicators
```

**Step 4: Enable Tab Actions**

```
User clicks "Invoices" tab again
  ↓
Cycle: View → Manage
  ↓
onAccessChange("finance-invoices", true, true)
  ↓
setManageState() updates draft state
  ↓
Cascade:
  - Enable view for "Finance" module (already enabled)
  - Enable view/manage for all child actions
  - Expand tab to show actions
  - Enable "Create Invoice" action automatically
```

**Step 5: Toggle Action**

```
User clicks "Create Invoice" action
  ↓
Handle action toggle
  ↓
onAccessChange("finance-create-invoice", false, false)
  ↓
setActionState() updates draft state
  ↓
Disable action (cascade doesn't affect parent)
```

**Step 6: Save Role**

```
User clicks "Create Role" button
  ↓
validate() checks:
  - Role name exists ✓
  - At least one view permission ✓
  ↓
currentPermissionsFromState() converts draft to API format
  ↓
dispatch(createRole({ role_display, permissions }))
  ↓
API call: POST /api/v1/role/
  ↓
Success response
  ↓
Show success alert
  ↓
Close modal after 1.5 seconds
```

### Scenario 2: Edit Existing Role

**Step 1: Open Modal with Role**

```
User clicks "Edit" on existing role
  ↓
CreateRoleModal opens with role prop
  ↓
Fetch available modules (if not cached)
  ↓
Initialize UI tree from role.permissions
  ↓
Initialize draft state from existing permissions
  ↓
UI shows current permission state
```

**Step 2: Modify Permissions**

```
User clicks "Finance" module
  ↓
TabsAndActionsPanel shows current state
  ↓
User clicks "Invoices" tab to disable
  ↓
onAccessChange("finance-invoices", false, false)
  ↓
Cascade:
  - Disable manage for "Invoices" tab
  - Disable all child actions
  - Keep module view enabled (if other tabs still enabled)
```

**Step 3: Save Changes**

```
User clicks "Update Role" button
  ↓
validate() checks
  ↓
Convert draft state to API format
  ↓
dispatch(updateRole({ roleId, data }))
  ↓
API call: PUT /api/v1/role/{roleId}/
  ↓
Success response
  ↓
Close modal
```

---

## Key Files Reference

### Components

- `src/ui-component/role/CreateRoleModal.tsx` - Main modal component
- `src/ui-component/role/parts/NavigationPreview.tsx` - Left panel (modules tree)
- `src/ui-component/role/parts/TabsAndActionsPanel.tsx` - Right panel (tabs/actions)

### Utilities

- `src/utils/permissionNodeAdapter.ts` - Convert between API and UI formats
- `src/utils/rolePermissionHelpers.ts` - Draft state management and cascading logic
- `src/utils/permission-icons.ts` - Icon configuration for actions

### Data Sources

- `src/registry/index.tsx` - APP_REGISTRY (source of truth)
- `src/api/role.api.ts` - API calls for roles/permissions
- `src/store/slices/role.ts` - Redux state management

### Types

- `src/types/role.ts` - Permission, AvailableModule types
- `src/types/registry.ts` - RegistryNode types

---

## Summary

The Create Role Modal system provides:

1. **Hierarchical Permission Management**: Modules → Pages/Tabs → Actions
2. **Cascading Logic**: View/manage changes automatically update related permissions
3. **Visual Feedback**: Real-time indicators show current access state
4. **Flexible Editing**: Support for both create and edit modes
5. **Type Safety**: Strong TypeScript types throughout the flow
6. **Single Source of Truth**: Registry provides all metadata
7. **Automatic State Management**: Draft state handles all permission changes

The system is designed to be intuitive for users while maintaining complex permission relationships through automatic cascading logic.
