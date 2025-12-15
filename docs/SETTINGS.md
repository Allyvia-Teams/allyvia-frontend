# Settings System

## Overview

The Settings System provides a centralized interface for managing account, company, billing, and user/role configurations. The settings page is organized into tabs, with different tabs visible based on user permissions (admin vs. member).

## Settings Page Structure

**Component**: `src/views/settings/index.tsx`

**Tabs**:

1. **Account** - Available to all users

   - Personal information (name, email, phone, avatar)
   - Security settings (password change)
   - Preferences (theme, sidebar behavior)

2. **Company Info** - Admin only

   - Company details (name, address, contact info)
   - Business information
   - Integration settings

3. **Billing & Subscription** - Admin only

   - Subscription plan management
   - Payment methods
   - Billing history
   - Plan upgrades/downgrades

4. **User & Role Management** - Admin only
   - User list and management
   - Role creation and editing
   - User invitations
   - Role assignments

## Tab Components

### Account Tab (`src/views/settings/tabs/AccountTab.tsx`)

**Purpose**: Personal account settings and preferences

**Components**:

- `ProfileInfoWidget`: Personal information display and editing
- `PreferencesWidget`: Theme and UI preferences

**Features**:

- Edit mode toggle
- Profile information (name, email, phone, avatar, role)
- Security settings (password change)
- Theme preferences (light/dark mode, accent colors)
- Sidebar behavior settings

**Key Files**:

- `src/ui-component/profile/ProfileInfoWidget.tsx`
- `src/ui-component/profile/PreferencesWidget.tsx`
- `src/ui-component/profile/ProfileForm.tsx`
- `src/ui-component/profile/ChangePasswordDialog.tsx`

### Company Info Tab (`src/views/settings/tabs/CompanyInfoTab.tsx`)

**Purpose**: Company-level information and settings

**Features**:

- Company name and details
- Business address and contact information
- Integration management
- Company profile editing

**Permissions**: Admin only

### Billing Tab (`src/views/settings/tabs/BillingTab.tsx`)

**Purpose**: Subscription and billing management

**Features**:

- Current subscription plan display
- Plan comparison and selection
- Payment method management
- Billing history
- Subscription cancellation

**Key Files**:

- `src/ui-component/subscription/ManageSubscriptionModal.tsx`
- `src/config/subscription-plans.ts`
- `src/store/slices/subscription.ts`
- `src/api/subscription.api.ts`

**Permissions**: Admin only

### User & Role Management Tab (`src/views/settings/tabs/UserRoleManagementTab.tsx`)

**Purpose**: User and role administration

**Features**:

- User list with filtering and search
- User invitation
- User role assignment
- Role creation and editing
- User deletion

**Key Files**:

- `src/ui-component/role/CreateRoleModal.tsx`
- `src/ui-component/role/ChangeUserRoleModal.tsx`
- `src/store/slices/role.ts`
- `src/api/role.api.ts`

**Permissions**: Admin only

**Related Documentation**: See [ROLE_SYSTEM.md](./ROLE_SYSTEM.md) for detailed role system documentation.

## Settings Registry Configuration

The settings page is defined in the registry (`src/registry/index.tsx`):

```typescript
{
  menuId: 'settings',
  type: 'page',
  title: 'Settings',
  path: '/settings',
  component: SettingsPage,
  icon: IconSettings,
  moduleKey: 'settings',
  supportsView: true,
  supportsManage: true,
  tabs: [
    { key: 'settings-account', title: 'Account' },
    {
      key: 'settings-company-info',
      title: 'Company Info',
      actions: [{ key: 'settings-edit-company', title: 'Edit Company' }]
    },
    {
      key: 'settings-billing',
      title: 'Billing',
      actions: [
        { key: 'settings-update-billing', title: 'Update Billing' },
        { key: 'settings-cancel-subscription', title: 'Cancel Subscription' }
      ]
    },
    {
      key: 'settings-user-role-mgmt',
      title: 'User & Role Management',
      actions: [
        { key: 'settings-invite-user', title: 'Invite User' },
        { key: 'settings-edit-user', title: 'Edit User' },
        { key: 'settings-delete-user', title: 'Delete User' },
        { key: 'settings-change-role', title: 'Change Role' }
      ]
    }
  ]
}
```

## Permission System

**Access Control**:

- All users can access the Account tab
- Only admins can access Company Info, Billing, and User & Role Management tabs
- Permission checking uses `useIsAdmin()` hook

**Tab Visibility**:

```typescript
const tabs = React.useMemo(() => {
  const tabList = [{ label: 'Account', component: <AccountTab />, index: 0 }];

  if (isAdmin) {
    tabList.push({ label: 'Company Info', component: <CompanyInfoTab />, index: 1 });
    tabList.push({ label: 'Billing & Subscription', component: <BillingTab />, index: 2 });
    tabList.push({ label: 'User & Role Management', component: <UserRoleManagementTab />, index: 3 });
  }

  return tabList;
}, [isAdmin]);
```

## Data Flow

### Account Settings

1. **Load**: Fetch user profile from `profile.api.ts`
2. **Edit**: Update profile via `updateProfile()` API
3. **Save**: Dispatch Redux action to update state
4. **Refresh**: Reload profile data after save

### Company Settings

1. **Load**: Fetch company info from `company.api.ts`
2. **Edit**: Update company via `updateCompany()` API
3. **Validation**: Client-side validation before save
4. **Save**: Update company and refresh state

### Billing Settings

1. **Load**: Fetch subscription status from `subscription.api.ts`
2. **Plan Selection**: Compare available plans
3. **Update**: Change subscription via Stripe integration
4. **Refresh**: Update subscription state after changes

### User & Role Management

1. **Load**: Fetch users and roles from `role.api.ts`
2. **Create Role**: Open CreateRoleModal, configure permissions
3. **Assign Role**: Change user role via `changeUserRole()` API
4. **Invite User**: Send invitation via `inviteUser()` API
5. **Refresh**: Reload users and roles after changes

## Key Files Reference

| File                                                | Purpose                  | Key Exports                     |
| --------------------------------------------------- | ------------------------ | ------------------------------- |
| `src/views/settings/index.tsx`                      | Main settings page       | SettingsPage component          |
| `src/views/settings/tabs/AccountTab.tsx`            | Account settings tab     | AccountTab component            |
| `src/views/settings/tabs/CompanyInfoTab.tsx`        | Company info tab         | CompanyInfoTab component        |
| `src/views/settings/tabs/BillingTab.tsx`            | Billing tab              | BillingTab component            |
| `src/views/settings/tabs/UserRoleManagementTab.tsx` | User/role management tab | UserRoleManagementTab component |
| `src/ui-component/profile/ProfileInfoWidget.tsx`    | Profile display widget   | ProfileInfoWidget component     |
| `src/ui-component/profile/PreferencesWidget.tsx`    | Preferences widget       | PreferencesWidget component     |
| `src/ui-component/profile/ProfileForm.tsx`          | Profile editing form     | ProfileForm component           |
| `src/ui-component/profile/ChangePasswordDialog.tsx` | Password change dialog   | ChangePasswordDialog component  |
| `src/api/profile.api.ts`                            | Profile API              | Profile-related API calls       |
| `src/api/company.api.ts`                            | Company API              | Company-related API calls       |
| `src/api/subscription.api.ts`                       | Subscription API         | Subscription-related API calls  |
| `src/store/slices/profile.ts`                       | Profile Redux slice      | Profile state management        |
| `src/store/slices/subscription.ts`                  | Subscription Redux slice | Subscription state management   |

## Settings Actions

Settings tabs can have specific actions defined in the registry:

- **Account**: No specific actions (all users can edit their own profile)
- **Company Info**: `settings-edit-company` - Edit company information
- **Billing**:
  - `settings-update-billing` - Update payment method
  - `settings-cancel-subscription` - Cancel subscription
- **User & Role Management**:
  - `settings-invite-user` - Invite new user
  - `settings-edit-user` - Edit user details
  - `settings-delete-user` - Delete user
  - `settings-change-role` - Change user role

These actions are checked via permission helpers to control access to specific features within tabs.

## Design Principles

1. **Permission-Based Access**: Tabs and actions are gated by user permissions
2. **Unified Interface**: All settings accessible from single page with tabs
3. **Real-Time Updates**: Changes reflect immediately in UI
4. **Validation**: Client-side validation before API calls
5. **Error Handling**: Error boundaries and user-friendly error messages
6. **Consistent UX**: Similar edit/save patterns across all tabs
