# Loading Flags Verification - Redux State

## Overview

This document verifies that all loading flags in Redux state are correctly set and used throughout the application.

---

## Loading Flags in Redux Slices

### 1. ✅ Auth Slice (`src/store/slices/auth.ts`)

**Loading Flag**: `isLoading`

**State Structure**:

```typescript
interface AuthState {
  isLoading: boolean;
  isLoggedIn: boolean;
  isInitialized: boolean;
  // ...
}
```

**Initial State**:

```typescript
isLoading: false;
isInitialized: false;
```

**When Set to `true`**:

- `initializeAuth.pending` → `isLoading = true`
- `loginAsync.pending` → `isLoading = true`
- `registerAsync.pending` → `isLoading = true`
- Other auth operations pending

**When Set to `false`**:

- `initializeAuth.fulfilled` → `isLoading = false`, `isInitialized = true`
- `initializeAuth.rejected` → `isLoading = false`, `isInitialized = true`
- Other auth operations fulfilled/rejected

**Verification**: ✅ **CORRECT**

---

### 2. ✅ Subscription Slice (`src/store/slices/subscription.ts`)

**Loading Flags**:

- `statusLoading` - For subscription status fetch
- `checkoutLoading` - For checkout session creation
- `cancelLoading` - For subscription cancellation
- `updateLoading` - For subscription update

**State Structure**:

```typescript
interface SubscriptionState {
  status: SubscriptionStatusResponse | null;
  statusLoading: boolean;
  statusError: string | null;
  // ...
}
```

**Initial State**:

```typescript
status: null;
statusLoading: false;
statusError: null;
```

**When `statusLoading` Set to `true`**:

- `fetchSubscriptionStatus.pending` → `statusLoading = true`

**When `statusLoading` Set to `false`**:

- `fetchSubscriptionStatus.fulfilled` → `statusLoading = false`
- `fetchSubscriptionStatus.rejected` → `statusLoading = false`

**Verification**: ✅ **CORRECT**

---

### 3. ✅ Role Slice (`src/store/slices/role.ts`)

**Loading Flags**:

- `myPermissionsLoading` - For fetching user's permissions
- `permissionsLoading` - For fetching selected user's permissions
- `availableModulesLoading` - For fetching available modules
- `usersLoading` - For fetching users list
- `roleDefinitionsLoading` - For fetching role definitions
- Other operation-specific loading flags

**State Structure**:

```typescript
interface RoleState {
  myPermissions: PermissionsResponse | null;
  myPermissionsLoading: boolean;
  myPermissionsError: string | null;
  // ...
}
```

**Initial State**:

```typescript
myPermissions: null;
myPermissionsLoading: false;
myPermissionsError: null;
```

**When `myPermissionsLoading` Set to `true`**:

- `fetchMyPermissions.pending` → `myPermissionsLoading = true`

**When `myPermissionsLoading` Set to `false`**:

- `fetchMyPermissions.fulfilled` → `myPermissionsLoading = false`
- `fetchMyPermissions.rejected` → `myPermissionsLoading = false`

**Verification**: ✅ **CORRECT**

---

## ⚠️ Issue Identified: Manual Fulfilled Dispatch

### Problem

In `src/store/slices/auth.ts` (lines 78-82), `initializeAuth` manually dispatches the fulfilled action:

```typescript
// Manually dispatch the fulfilled action to avoid duplicate API call
dispatch({
  type: 'role/fetchMyPermissions/fulfilled',
  payload: permissionsResponse
});
```

**Issue**: This bypasses the `pending` state, so `myPermissionsLoading` is never set to `true`.

**Impact**:

- Guard might check permissions before they're processed
- Loading flag doesn't reflect the actual state
- Timing issues with subscription status creation

### Current Flow

```
initializeAuth starts
    ↓
fetchUserData() called
    ↓
API calls in parallel (including permissions)
    ↓
Permissions API returns
    ↓
Manually dispatches 'role/fetchMyPermissions/fulfilled'
    ↓
Redux: myPermissions = payload, myPermissionsLoading = false (stays false!)
    ↓
Guard checks: myPermissionsLoading = false (but permissions just loaded)
```

### Why This Causes Issues

1. `myPermissionsLoading` never becomes `true` during initial fetch
2. Guard can't detect that permissions are being loaded
3. Guard might redirect before permissions are processed

---

## Loading Flag Usage in Components

### 1. SubscriptionGuard

**Current Usage**:

```typescript
const statusLoading = useSelector((s) => s.subscription.statusLoading);
const myPermissionsLoading = useSelector((s) => s.role.myPermissionsLoading);

if (myPermissionsLoading) {
  // Wait for permissions
}
if (statusLoading) {
  // Wait for subscription status
}
```

**Issue**: `myPermissionsLoading` is `false` when `initializeAuth` manually dispatches fulfilled

**Fix Applied**: Also check `isAuthInitializing` to wait for auth initialization

---

### 2. MenuList

**Current Usage**:

```typescript
const myPermissionsLoading = useSelector((s) => s.role.myPermissionsLoading);

if (!myPermissionsLoading && !alreadyFetchingForRole && !hasPermissionsForCurrentRole) {
  dispatch(fetchMyPermissions());
}
```

**Protection**: ✅ Checks loading state + uses ref tracking

---

### 3. BillingTab

**Current Usage**:

```typescript
const { status, statusLoading } = useSelector((s) => s.subscription);

if (statusLoading) {
  return <CircularProgress />;
}
```

**Protection**: ✅ Correctly checks loading state

---

## Fix Applied to SubscriptionGuard

### Added Auth Initialization Check

```typescript
const isAuthInitializing = useSelector((s) => s.auth.isLoading);
const isAuthInitialized = useSelector((s) => s.auth.isInitialized);

// Wait for auth initialization to complete (it fetches permissions)
if (isAuthInitializing || !isAuthInitialized) {
  console.log('[SubscriptionGuard] ⏳ Auth initializing, waiting for permissions to be fetched...');
  return <>{children}</>;
}
```

**Reason**: Auth initialization fetches permissions, so we should wait for it to complete before checking subscription.

---

## Loading Flag States Reference

### Initial State (Before Any Action)

| Flag                         | Value   | Meaning                  |
| ---------------------------- | ------- | ------------------------ |
| `auth.isLoading`             | `false` | Auth not initializing    |
| `auth.isInitialized`         | `false` | Auth not initialized yet |
| `role.myPermissionsLoading`  | `false` | Permissions not loading  |
| `role.myPermissions`         | `null`  | Permissions not loaded   |
| `subscription.statusLoading` | `false` | Status not loading       |
| `subscription.status`        | `null`  | Status not loaded        |

### During Auth Initialization

| Flag                         | Value   | Meaning                                           |
| ---------------------------- | ------- | ------------------------------------------------- |
| `auth.isLoading`             | `true`  | ✅ Auth initializing                              |
| `auth.isInitialized`         | `false` | Auth not initialized yet                          |
| `role.myPermissionsLoading`  | `false` | ⚠️ Still false (manual dispatch bypasses pending) |
| `role.myPermissions`         | `null`  | Permissions not loaded yet                        |
| `subscription.statusLoading` | `false` | Status not loading                                |
| `subscription.status`        | `null`  | Status not loaded                                 |

### After Auth Initialization (Permissions Fetched)

| Flag                         | Value                                  | Meaning                         |
| ---------------------------- | -------------------------------------- | ------------------------------- |
| `auth.isLoading`             | `false`                                | ✅ Auth initialization complete |
| `auth.isInitialized`         | `true`                                 | ✅ Auth initialized             |
| `role.myPermissionsLoading`  | `false`                                | ✅ Permissions loaded           |
| `role.myPermissions`         | `PermissionsResponse`                  | ✅ Permissions loaded           |
| `subscription.statusLoading` | `true` or `false`                      | Status might be loading         |
| `subscription.status`        | `SubscriptionStatusResponse` or `null` | Status loaded or being created  |

---

## Verification Checklist

### ✅ Correct Loading Flags

1. ✅ **Auth Loading**: `auth.isLoading` correctly tracks initialization
2. ✅ **Status Loading**: `subscription.statusLoading` correctly tracks status fetch
3. ✅ **Permissions Loading**: `role.myPermissionsLoading` correctly tracks permissions fetch (when called via thunk)

### ⚠️ Issue Found

1. ⚠️ **Manual Fulfilled Dispatch**: When `initializeAuth` manually dispatches fulfilled, loading flag is bypassed

### ✅ Fix Applied

1. ✅ **SubscriptionGuard**: Now checks `isAuthInitializing` to wait for auth initialization

---

## Summary

### Loading Flags Are Correctly Set

**When Using Thunks**:

- ✅ `pending` → Loading = `true`
- ✅ `fulfilled` → Loading = `false`
- ✅ `rejected` → Loading = `false`

**Exception**:

- ⚠️ `initializeAuth` manually dispatches fulfilled (bypasses pending)
- ✅ Fixed by checking `isAuthInitializing` in SubscriptionGuard

### Current State

**All loading flags work correctly** when actions are dispatched through thunks. The only issue was the manual fulfilled dispatch in `initializeAuth`, which is now handled by waiting for auth initialization to complete.

**Recommendation**: The loading flags are correctly implemented. The fix to check auth initialization in SubscriptionGuard resolves the timing issue.
