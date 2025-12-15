# Navigation System

## Overview

The Navigation System provides a unified approach to managing routes, menus, and navigation structure throughout the application. It uses a centralized Registry pattern where all navigable surfaces are defined in one place, and everything else (routes, menus, breadcrumbs) is automatically derived from this registry.

## Core Concept: Single Source of Truth

**Registry**: `src/registry/index.tsx`

The `APP_REGISTRY` array is the single source of truth for:

- React Router paths and components
- Menu items and hierarchy
- Icons and titles
- Permission keys and module ownership
- Tabs and actions metadata

**Key Principle**: Add or update a route once in the registry, and it automatically appears in:

- React Router routes
- Sidebar menu
- Breadcrumbs
- Role permission tree
- Subscription filtering

## Registry Structure

**Component**: `src/registry/index.tsx`

Each registry entry contains:

```typescript
interface RegistryNode {
  menuId: string; // Unique identifier (e.g., "employees-home")
  type: 'module' | 'collapse' | 'page';
  title: string; // Display name shown in menu
  path?: string; // React Router path (e.g., "/employees")
  component?: ComponentType; // React component to render
  icon?: ComponentType; // Icon component (from @tabler/icons-react)
  moduleKey?: string; // Module grouping (e.g., "employees")
  permissionKey?: string; // Permission key (may differ from menuId)
  supportsView?: boolean; // Can user view this?
  supportsManage?: boolean; // Can user manage this?
  tabs?: RegistryTab[]; // Tabs (e.g., Finance tabs)
  actions?: RegistryAction[]; // Actions (e.g., "Add Employee")
  children?: RegistryNode[]; // Nested items (for modules)
  hidden?: boolean; // Hidden from menu (but still accessible via URL)
  devOnly?: boolean; // Only visible in development
  requiresPermission?: boolean; // Whether to check permissions (default: true)
}
```

## Builders System

**Component**: `src/registry/builders.ts`

The builders convert the registry into usable structures:

### 1. Route Builder (`buildRoutes()`)

**Purpose**: Generates React Router routes

**Process**:

1. Traverses registry nodes
2. Extracts nodes with `path` and `component`
3. Wraps components with `ProtectedRoute` if `requiresPermission !== false`
4. Returns route descriptors for React Router

**Output**:

```typescript
[
  { path: '/dashboard', element: <ProtectedRoute menuId="dashboard"><DashboardPage /></ProtectedRoute> },
  { path: '/employees', element: <ProtectedRoute menuId="employees"><EmployeeManagementPage /></ProtectedRoute> },
  ...
]
```

### 2. Menu Builder (`buildMenuRoot()` / `buildMenuItems()`)

**Purpose**: Generates menu tree structure

**Process**:

1. Converts registry nodes to `NavItemType` format
2. Filters hidden/dev-only items
3. Handles nested modules (collapse groups)
4. Preserves hierarchy and icons

**Output**: Menu tree used by sidebar and breadcrumbs

**Types**:

- `group`: Root container
- `collapse`: Expandable section with children (e.g., "Employees & Payroll")
- `item`: Clickable menu item with URL

### 3. Permission Mapper (`permissionKeyToMenuIdMap`)

**Purpose**: Maps permission keys to menu IDs

**Process**:

- Traverses registry and builds bidirectional mapping
- Allows one permission key to control multiple menu items
- Enables flexible permission checking

**Example**:

```typescript
{
  "employees": ["employees", "employees-home", "employees-mgmt"],
  "employees-mgmt": ["employees-home"]
}
```

## Menu Filtering System

**Component**: `src/layout/MainLayout/MenuList/index.tsx`

The menu is filtered through a multi-step process:

### Step 1: Subscription Filtering

**Function**: `getMenuItemsFromSubscription()` (`src/utils/subscription-menu.ts`)

**Process**:

1. Checks which modules are available in the subscription plan
2. Filters menu items based on `available_modules` from backend
3. Handles both legacy format (string[]) and new format (AvailableModule[])
4. Includes child pages if parent module is available

**Logic**:

- If module is available → show all its pages/tabs
- If module not available → hide module and all children
- Items with `requiresPermission: false` are always shown

### Step 2: Permission Filtering

**Function**: Menu component filters based on user permissions

**Process**:

1. Builds allowed keys from user's permissions (`buildAllowedKeys()`)
2. Creates permission checker (`makeMenuChecker()`)
3. Filters menu items based on permission keys
4. Special handling for collapse items (shows parent if children have permission)

**Logic**:

- Admin users see all subscription modules (bypass permission check)
- Non-admin users only see items they have permission for
- Items with `requiresPermission: false` are always shown
- Parent collapse items shown if any child has permission

### Step 3: Kiosk Mode Filtering

**Process**:

- Hides sidebar on kiosk login page
- Shows only kiosk-specific routes when in kiosk mode

## Navigation Flow

### Adding a New Page

**Step-by-Step**:

1. **Define in Registry** (`src/registry/index.tsx`):

   ```typescript
   {
     menuId: 'new-feature',
     type: 'page',
     title: 'New Feature',
     path: '/new-feature',
     component: NewFeaturePage,
     icon: IconFeature,
     moduleKey: 'feature',
     supportsView: true,
     supportsManage: false
   }
   ```

2. **Create Component** (`src/views/new-feature/index.tsx`):

   - Create the view component
   - Ensure it's lazy-loaded in the registry

3. **Automatic Generation**:
   - Route automatically added to React Router
   - Menu item appears in sidebar
   - Breadcrumb support enabled
   - Role tree includes new item (if module keyed)
   - Subscription filtering respects it

**No manual updates needed** for:

- Route configuration
- Menu items
- Breadcrumbs
- Permission mapping

### Route Resolution Flow

```
User navigates to URL
    ↓
AuthGuard checks:
    - Is user logged in?
    ↓
SubscriptionGuard checks:
    - Does user have active subscription (active/trialing)?
    - If no subscription → Redirect to /payment-plan
    ↓
MemberGuard checks:
    - Member/kiosk restrictions
    ↓
React Router matches path from buildRoutes()
    ↓
ProtectedRoute checks:
    1. Subscription availability (module in subscription plan?)
    2. User permissions (has permission for menuId?)
    ↓
If all checks pass → Render component
If any check fails → Redirect to /403 or /payment-plan
```

## Subscription Guard

**Component**: `src/routes/guards/SubscriptionGuard.tsx`

**Purpose**: Ensures users have an active subscription before accessing routes

**Flow**:

1. **First Login**: User logs in → No subscription → Redirect to `/payment-plan`
2. **Active Subscription**: User has subscription (active/trialing) → Allow access to routes
3. **No Subscription**: Subscription is null, canceled, or past_due → Redirect to `/payment-plan`

**Bypass Routes**: The following routes bypass subscription check:

- `/payment-plan` - Payment plan selection page
- `/checkout/success` - Checkout success page
- `/403` - Unauthorized page

**Integration**: Wrapped around `MainLayout` routes in `MainRoutes.tsx`:

```typescript
<AuthGuard>
  <SubscriptionGuard>
    <MemberGuard>
      <MainLayout />
    </MemberGuard>
  </SubscriptionGuard>
</AuthGuard>
```

## Menu Structure Types

### 1. Standalone Page

**Example**: Dashboard

```typescript
{
  menuId: 'dashboard',
  type: 'page',
  title: 'Dashboard',
  path: '/dashboard',
  component: DashboardPage,
  icon: IconHome,
  requiresPermission: false
}
```

**Result**: Single menu item that navigates to `/dashboard`

### 2. Module with Children

**Example**: Employees & Payroll

```typescript
{
  menuId: 'employees',
  type: 'module',
  title: 'Employees & Payroll',
  icon: IconUsersGroup,
  moduleKey: 'employees',
  children: [
    {
      menuId: 'employees-home',
      type: 'page',
      title: 'Directory',
      path: '/employees',
      component: EmployeeManagementPage
    },
    {
      menuId: 'employees-clock',
      type: 'page',
      title: 'Clock In / Out',
      path: '/employees/clock',
      component: ClockInOutPage
    }
  ]
}
```

**Result**: Collapsible menu section with child items

### 3. Page with Tabs

**Example**: Finance & Accounting

```typescript
{
  menuId: 'finance',
  type: 'page',
  title: 'Finance & Accounting',
  path: '/finance',
  component: FinancePage,
  tabs: [
    { key: 'finance-financial-statements', title: 'Financial Statements' },
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

**Result**: Single menu item with tabs shown within the page

## Menu Filtering Details

### Subscription-Based Filtering

**What it does**: Shows/hides menu items based on subscription plan

**How it works**:

1. Backend provides `available_modules` list
2. `getMenuItemsFromSubscription()` filters menu tree
3. Only modules in subscription are shown
4. Child pages included if parent module is available

**Example**:

- Basic plan: Only "Dashboard", "Employees" available
- Premium plan: All modules available

### Permission-Based Filtering

**What it does**: Shows/hides menu items based on user's role permissions

**How it works**:

1. User's role provides `permissions` array
2. `buildAllowedKeys()` extracts allowed permission keys
3. `makeMenuChecker()` creates permission checking function
4. Menu items filtered based on allowed keys

**Example**:

- Cashier role: Can only see "Employees" → "Clock In/Out"
- Manager role: Can see "Employees" → all pages

### Admin Override

**Special Case**: Admin users bypass permission checks

**Logic**:

- Admin role type → sees all subscription modules
- Still respects subscription plan limits
- Permission checks skipped for admins

## Key Files Reference

| File                                       | Purpose                | Key Exports                                                                        |
| ------------------------------------------ | ---------------------- | ---------------------------------------------------------------------------------- |
| `src/registry/index.tsx`                   | Registry definition    | `APP_REGISTRY`                                                                     |
| `src/registry/builders.ts`                 | Builders and helpers   | `buildRoutes()`, `buildMenuItems()`, `buildMenuRoot()`, `permissionKeyToMenuIdMap` |
| `src/layout/MainLayout/MenuList/index.tsx` | Menu list component    | Menu filtering and rendering                                                       |
| `src/utils/subscription-menu.ts`           | Subscription filtering | `getMenuItemsFromSubscription()`                                                   |
| `src/utils/permission-helpers.ts`          | Permission checking    | `buildAllowedKeys()`, `makeMenuChecker()`                                          |
| `src/menu-items/index.ts`                  | Menu export            | Wrapper around `buildMenuRoot()`                                                   |
| `src/routes/MainRoutes.tsx`                | Route configuration    | Uses `buildRoutes()`                                                               |
| `src/routes/guards/ProtectedRoute.tsx`     | Route protection       | Permission-aware route guard                                                       |

## Design Principles

1. **Single Source of Truth**: Registry defines everything once
2. **Automatic Derivation**: Routes, menus, and permission maps auto-generated
3. **Subscription Awareness**: Navigation respects subscription plan
4. **Permission Integration**: Menu filtering based on user permissions
5. **Type Safety**: Full TypeScript support
6. **Consistent Keys**: All keys normalized to lowercase

## Examples

### Example 1: Filtering Flow

**Scenario**: User with "Cashier" role, Basic subscription plan

1. **Subscription Filter**: Only "Dashboard" and "Employees" modules available
2. **Permission Filter**: User has permission for "employees-clock" only
3. **Result**: Menu shows:
   - Dashboard (no permission required)
   - Employees & Payroll (collapse)
     - Clock In / Out (user has permission)

### Example 2: Admin Override

**Scenario**: Admin user, Basic subscription plan

1. **Subscription Filter**: Only "Dashboard" and "Employees" modules available
2. **Permission Filter**: Skipped (admin override)
3. **Result**: Menu shows:
   - Dashboard
   - Employees & Payroll (collapse)
     - Directory (admin can access)
     - Clock In / Out (admin can access)

### Example 3: Adding New Page

**Steps**:

1. Add entry to `APP_REGISTRY` in `src/registry/index.tsx`
2. Create component in `src/views/`
3. No other changes needed!

**Automatic Results**:

- Route added to React Router
- Menu item appears
- Breadcrumb works
- Role tree includes it
- Subscription filtering works

## Related Documentation

- [ROLE_SYSTEM.md](./ROLE_SYSTEM.md) - How permissions work with navigation
- [SETTINGS.md](./SETTINGS.md) - Settings page navigation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall architecture
