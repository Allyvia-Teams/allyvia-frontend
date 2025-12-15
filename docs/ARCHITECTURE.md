# System Architecture

## Overview

The Allyvia frontend uses a centralized Registry pattern to manage routes, navigation, permissions, and role management. This architecture ensures a single source of truth for all navigable surfaces and automatically derives routes, menus, and permission structures.

## Core Principles

1. **Single Source of Truth**: Registry defines everything (routes, menus, permissions)
2. **Automatic Derivation**: Routes, menus, and permission maps are auto-generated from registry
3. **Consistent Keys**: menuId, permissionKey, and moduleKey are normalized (lowercase)
4. **Subscription Awareness**: System respects subscription plan limitations
5. **Type Safety**: Full TypeScript support for all data structures

## System Components

### 1. Registry System (`src/registry/index.tsx`)

**Purpose**: Central source of truth for every navigable surface

**Contains**:

- React Router paths and components
- Menu metadata (id, icon, title)
- Permission keys and module ownership
- Tabs and actions metadata

**See**: [NAVIGATION.md](./NAVIGATION.md) for detailed navigation documentation

### 2. Builders System (`src/registry/builders.ts`)

**Purpose**: Converts registry into usable structures

**Functions**:

- `buildRoutes()`: Generates React Router routes
- `buildMenuItems()`: Generates menu tree
- `buildPermissionMap()`: Creates permission mappings
- Display name helpers

**See**: [NAVIGATION.md](./NAVIGATION.md) for detailed builders documentation

### 3. Permission System

**Purpose**: Manages access control at multiple levels

**Hierarchy**:

- Modules (top level)
- Pages (within modules)
- Tabs (within modules/pages)
- Actions (fine-grained permissions)

**See**: [ROLE_SYSTEM.md](./ROLE_SYSTEM.md) for detailed permission documentation

### 4. Settings System

**Purpose**: Centralized settings interface

**Tabs**:

- Account (all users)
- Company Info (admin only)
- Billing (admin only)
- User & Role Management (admin only)

**See**: [SETTINGS.md](./SETTINGS.md) for detailed settings documentation

## Data Flow

```
Registry (src/registry/index.tsx)
    ↓
Builders (src/registry/builders.ts)
    ├── Routes → React Router
    ├── Menu → Sidebar MenuList
    ├── Permission Maps → ProtectedRoute
    └── Display Names → Role UI, Billing
    ↓
Filtering (src/utils/subscription-menu.ts, permission-helpers.ts)
    ├── Subscription Filter → Show/hide based on plan
    └── Permission Filter → Show/hide based on role
    ↓
UI Rendering
    ├── Menu (filtered items)
    ├── Routes (protected routes)
    └── Role Editor (permission tree)
```

## Key Files Reference

| File                                   | Purpose              | Documentation                      |
| -------------------------------------- | -------------------- | ---------------------------------- |
| `src/registry/index.tsx`               | Registry definition  | [NAVIGATION.md](./NAVIGATION.md)   |
| `src/registry/builders.ts`             | Builders and helpers | [NAVIGATION.md](./NAVIGATION.md)   |
| `src/ui-component/role/`               | Role management UI   | [ROLE_SYSTEM.md](./ROLE_SYSTEM.md) |
| `src/utils/permission-helpers.ts`      | Permission checking  | [ROLE_SYSTEM.md](./ROLE_SYSTEM.md) |
| `src/utils/subscription-menu.ts`       | Menu filtering       | [NAVIGATION.md](./NAVIGATION.md)   |
| `src/views/settings/`                  | Settings pages       | [SETTINGS.md](./SETTINGS.md)       |
| `src/store/slices/role.ts`             | Role state           | [ROLE_SYSTEM.md](./ROLE_SYSTEM.md) |
| `src/routes/guards/ProtectedRoute.tsx` | Route protection     | [NAVIGATION.md](./NAVIGATION.md)   |

## Adding New Features

### Add a New Page

1. **Define in Registry** (`src/registry/index.tsx`)
2. **Create Component** (`src/views/...`)
3. **Automatic**: Route, menu, breadcrumb, role tree all updated automatically

**See**: [NAVIGATION.md](./NAVIGATION.md) for detailed checklist

### Add a New Role

1. **Open CreateRoleModal**
2. **Select Permissions** (modules, pages, tabs, actions)
3. **Save**: Role created and available for assignment

**See**: [ROLE_SYSTEM.md](./ROLE_SYSTEM.md) for detailed role creation flow

## Related Documentation

- [NAVIGATION.md](./NAVIGATION.md) - Navigation system, routes, and menu filtering
- [ROLE_SYSTEM.md](./ROLE_SYSTEM.md) - Role and permission management
- [SETTINGS.md](./SETTINGS.md) - Settings pages and configuration

## Architecture Benefits

1. **No Duplication**: Define once, use everywhere
2. **Type Safety**: Full TypeScript support prevents errors
3. **Automatic Sync**: Changes in registry automatically reflect in routes/menu/permissions
4. **Maintainability**: Single place to update navigation structure
5. **Scalability**: Easy to add new pages/modules

## Future Enhancements

1. **Schema Unification**: Centralize all tab/action metadata
2. **Backend Alignment**: Richer permission payloads from backend
3. **Enhanced Validation**: Better client-side validation before API calls

## Overview

The Allyvia frontend uses a centralized Registry pattern to manage routes, navigation, permissions, and role management. This architecture ensures a single source of truth for all navigable surfaces and automatically derives routes, menus, and permission structures.

## Core Principles

1. **Single Source of Truth**: Registry defines everything (routes, menus, permissions)
2. **Automatic Derivation**: Routes, menus, and permission maps are auto-generated from registry
3. **Consistent Keys**: menuId, permissionKey, and moduleKey are normalized (lowercase)
4. **Subscription Awareness**: System respects subscription plan limitations
5. **Type Safety**: Full TypeScript support for all data structures

## System Components

### 1. Registry System (`src/registry/index.tsx`)

**Purpose**: Central source of truth for every navigable surface

**Contains**:

- React Router paths and components
- Menu metadata (id, icon, title)
- Permission keys and module ownership
- Tabs and actions metadata

**See**: [NAVIGATION.md](./NAVIGATION.md) for detailed navigation documentation

### 2. Builders System (`src/registry/builders.ts`)

**Purpose**: Converts registry into usable structures

**Functions**:

- `buildRoutes()`: Generates React Router routes
- `buildMenuItems()`: Generates menu tree
- `buildPermissionMap()`: Creates permission mappings
- Display name helpers

**See**: [NAVIGATION.md](./NAVIGATION.md) for detailed builders documentation

### 3. Permission System

**Purpose**: Manages access control at multiple levels

**Hierarchy**:

- Modules (top level)
- Pages (within modules)
- Tabs (within modules/pages)
- Actions (fine-grained permissions)

**See**: [ROLE_SYSTEM.md](./ROLE_SYSTEM.md) for detailed permission documentation

### 4. Settings System

**Purpose**: Centralized settings interface

**Tabs**:

- Account (all users)
- Company Info (admin only)
- Billing (admin only)
- User & Role Management (admin only)

**See**: [SETTINGS.md](./SETTINGS.md) for detailed settings documentation

## Data Flow

```
Registry (src/registry/index.tsx)
    ↓
Builders (src/registry/builders.ts)
    ├── Routes → React Router
    ├── Menu → Sidebar MenuList
    ├── Permission Maps → ProtectedRoute
    └── Display Names → Role UI, Billing
    ↓
Filtering (src/utils/subscription-menu.ts, permission-helpers.ts)
    ├── Subscription Filter → Show/hide based on plan
    └── Permission Filter → Show/hide based on role
    ↓
UI Rendering
    ├── Menu (filtered items)
    ├── Routes (protected routes)
    └── Role Editor (permission tree)
```

## Key Files Reference

| File                                   | Purpose              | Documentation                      |
| -------------------------------------- | -------------------- | ---------------------------------- |
| `src/registry/index.tsx`               | Registry definition  | [NAVIGATION.md](./NAVIGATION.md)   |
| `src/registry/builders.ts`             | Builders and helpers | [NAVIGATION.md](./NAVIGATION.md)   |
| `src/ui-component/role/`               | Role management UI   | [ROLE_SYSTEM.md](./ROLE_SYSTEM.md) |
| `src/utils/permission-helpers.ts`      | Permission checking  | [ROLE_SYSTEM.md](./ROLE_SYSTEM.md) |
| `src/utils/subscription-menu.ts`       | Menu filtering       | [NAVIGATION.md](./NAVIGATION.md)   |
| `src/views/settings/`                  | Settings pages       | [SETTINGS.md](./SETTINGS.md)       |
| `src/store/slices/role.ts`             | Role state           | [ROLE_SYSTEM.md](./ROLE_SYSTEM.md) |
| `src/routes/guards/ProtectedRoute.tsx` | Route protection     | [NAVIGATION.md](./NAVIGATION.md)   |

## Adding New Features

### Add a New Page

1. **Define in Registry** (`src/registry/index.tsx`)
2. **Create Component** (`src/views/...`)
3. **Automatic**: Route, menu, breadcrumb, role tree all updated automatically

**See**: [NAVIGATION.md](./NAVIGATION.md) for detailed checklist

### Add a New Role

1. **Open CreateRoleModal**
2. **Select Permissions** (modules, pages, tabs, actions)
3. **Save**: Role created and available for assignment

**See**: [ROLE_SYSTEM.md](./ROLE_SYSTEM.md) for detailed role creation flow

## Related Documentation

- [NAVIGATION.md](./NAVIGATION.md) - Navigation system, routes, and menu filtering
- [ROLE_SYSTEM.md](./ROLE_SYSTEM.md) - Role and permission management
- [SETTINGS.md](./SETTINGS.md) - Settings pages and configuration

## Architecture Benefits

1. **No Duplication**: Define once, use everywhere
2. **Type Safety**: Full TypeScript support prevents errors
3. **Automatic Sync**: Changes in registry automatically reflect in routes/menu/permissions
4. **Maintainability**: Single place to update navigation structure
5. **Scalability**: Easy to add new pages/modules

## Future Enhancements

1. **Schema Unification**: Centralize all tab/action metadata
2. **Backend Alignment**: Richer permission payloads from backend
3. **Enhanced Validation**: Better client-side validation before API calls
