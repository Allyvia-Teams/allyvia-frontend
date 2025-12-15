# FetchMyPermissions Duplicate Call Analysis

## Overview

This document analyzes all places where `fetchMyPermissions` is called to ensure it's not being called twice unnecessarily.

---

## Call Locations

### 1. ✅ SubscriptionGuard (`src/routes/guards/SubscriptionGuard.tsx`)

**Line**: 55

**Condition**:

```typescript
if (isLoggedIn && currentRoleId && !myPermissions && !myPermissionsLoading) {
  dispatch(fetchMyPermissions());
}
```

**Protection**:

- ✅ Checks `!myPermissions` - Won't call if permissions exist
- ✅ Checks `!myPermissionsLoading` - Won't call if already loading

**When Called**: Only if permissions don't exist and aren't loading

---

### 2. ✅ MenuList (`src/layout/MainLayout/MenuList/index.tsx`)

**Line**: 86

**Condition**:

```typescript
if (!myPermissionsLoading && !alreadyFetchingForRole && !hasPermissionsForCurrentRole) {
  lastFetchedRoleIdRef.current = currentRoleId;
  dispatch(fetchMyPermissions());
}
```

**Protection**:

- ✅ Checks `!myPermissionsLoading` - Won't call if already loading
- ✅ Uses `lastFetchedRoleIdRef` - Tracks if already fetching for this role
- ✅ Checks `!hasPermissionsForCurrentRole` - Won't call if permissions exist for current role

**When Called**: Only if:

- Not currently loading
- Haven't already initiated fetch for this role
- Don't have permissions for current role

---

### 3. ✅ Auth Initialization (`src/store/slices/auth.ts`)

**Line**: 66 (API call), 80 (Fulfilled action dispatch)

**Implementation**:

```typescript
// Fetches permissions directly via API (not through thunk)
const [userResponse, rolesResponse, permissionsResponse] = await Promise.all([
  axiosServices.get('/user/profile/'),
  axiosServices.get('/role/'),
  roleAPI.getMyPermissions().catch((err) => {
    console.warn('[fetchUserData] Failed to fetch permissions:', err);
    return null;
  })
]);

// Manually dispatch fulfilled action to avoid duplicate API call
if (dispatch && permissionsResponse) {
  dispatch({
    type: 'role/fetchMyPermissions/fulfilled',
    payload: permissionsResponse
  });

  // Trigger side effects
  if (permissionsResponse.company) {
    dispatch(updateSubscriptionStatusFromPermissions({ company: permissionsResponse.company }));
    dispatch(fetchSubscriptionStatus());
  }
}
```

**Protection**:

- ✅ Calls API directly (not through thunk)
- ✅ Manually dispatches fulfilled action
- ✅ Comment says: "Manually dispatch the fulfilled action to avoid duplicate API call"

**When Called**: During `initializeAuth` - fetches permissions in parallel with user and roles

---

## Potential Race Condition Analysis

### Scenario 1: Initial Login

**Timeline**:

```
T=0ms:    User logs in
T=1ms:    initializeAuth() starts
T=2ms:    fetchUserData() called
T=3ms:    API calls start (user, roles, permissions in parallel)
T=100ms:  Permissions API returns
T=101ms:  Dispatches 'role/fetchMyPermissions/fulfilled'
T=102ms:  Redux: myPermissions = payload, myPermissionsLoading = false
T=103ms:  SubscriptionGuard renders
          - Checks: !myPermissions → FALSE (permissions exist)
          - Does NOT call fetchMyPermissions() ✅
T=104ms:  MenuList renders
          - Checks: hasPermissionsForCurrentRole → TRUE
          - Does NOT call fetchMyPermissions() ✅
```

**Result**: ✅ **NO DUPLICATE** - Permissions loaded before components check

---

### Scenario 2: Component Renders Before Permissions Loaded

**Timeline**:

```
T=0ms:    User logs in
T=1ms:    initializeAuth() starts
T=2ms:    fetchUserData() called
T=3ms:    API calls start
T=10ms:   SubscriptionGuard renders (before API returns)
          - Checks: !myPermissions → TRUE (not loaded yet)
          - Checks: !myPermissionsLoading → TRUE (not loading yet)
          - Dispatches fetchMyPermissions() ⚠️
T=11ms:   Redux: myPermissionsLoading = true
T=12ms:   MenuList renders
          - Checks: !myPermissionsLoading → FALSE (now loading)
          - Does NOT call fetchMyPermissions() ✅
T=100ms:  Permissions API returns (from initializeAuth)
T=101ms:  Dispatches 'role/fetchMyPermissions/fulfilled'
T=102ms:  Redux: myPermissions = payload, myPermissionsLoading = false
T=150ms:  fetchMyPermissions() from SubscriptionGuard returns
T=151ms:  Dispatches 'role/fetchMyPermissions/fulfilled' (duplicate)
T=152ms:  Redux: myPermissions = payload (same data, overwrites)
```

**Result**: ⚠️ **POTENTIAL DUPLICATE** - SubscriptionGuard might call before initializeAuth completes

---

### Scenario 3: Both Components Check Simultaneously

**Timeline**:

```
T=0ms:    User navigates, both components render
T=1ms:    SubscriptionGuard checks:
          - !myPermissions → TRUE
          - !myPermissionsLoading → TRUE
          - Dispatches fetchMyPermissions() ⚠️
T=2ms:    Redux: myPermissionsLoading = true
T=3ms:    MenuList checks:
          - !myPermissionsLoading → FALSE (now loading)
          - Does NOT call fetchMyPermissions() ✅
```

**Result**: ✅ **NO DUPLICATE** - MenuList sees loading state

---

## Current Protection Mechanisms

### 1. Redux Loading State

**Location**: `src/store/slices/role.ts`

```typescript
.addCase(fetchMyPermissions.pending, (state) => {
  state.myPermissionsLoading = true;  // Prevents duplicate calls
  state.myPermissionsError = null;
})
```

**Protection**: ✅ Sets `myPermissionsLoading = true` immediately when thunk starts

---

### 2. Component Checks

**SubscriptionGuard**:

```typescript
if (isLoggedIn && currentRoleId && !myPermissions && !myPermissionsLoading) {
  // Only calls if not loading
}
```

**MenuList**:

```typescript
if (!myPermissionsLoading && !alreadyFetchingForRole && !hasPermissionsForCurrentRole) {
  // Only calls if not loading and haven't fetched for this role
}
```

**Protection**: ✅ Both check `!myPermissionsLoading` before calling

---

### 3. Ref-Based Tracking (MenuList)

**MenuList**:

```typescript
const lastFetchedRoleIdRef = useRef<string | null>(null);

// Tracks if already fetching for this role
const alreadyFetchingForRole = lastFetchedRoleIdRef.current === currentRoleId;
```

**Protection**: ✅ Prevents duplicate calls for same role

---

## Issue Identified

### ⚠️ Race Condition: SubscriptionGuard vs initializeAuth

**Problem**:

- `initializeAuth` calls API directly (not through thunk)
- It doesn't set `myPermissionsLoading = true` immediately
- SubscriptionGuard might check before `initializeAuth` completes
- Both could call the API

**Timeline**:

```
T=0ms:    initializeAuth() starts
T=1ms:    API call starts (but myPermissionsLoading still false)
T=2ms:    SubscriptionGuard renders
          - Sees: !myPermissions && !myPermissionsLoading
          - Dispatches fetchMyPermissions() ⚠️
T=3ms:    Redux: myPermissionsLoading = true (from SubscriptionGuard)
T=100ms:  initializeAuth API returns
T=101ms:  Dispatches fulfilled (from initializeAuth)
T=150ms:  SubscriptionGuard API returns
T=151ms:  Dispatches fulfilled (from SubscriptionGuard) - DUPLICATE
```

---

## Solution: Improve SubscriptionGuard Check

The SubscriptionGuard should also check if permissions are being fetched during initialization. However, since `initializeAuth` doesn't set loading state, we need a different approach.

### Option 1: Check if auth is initializing

**Better Check**:

```typescript
const isAuthInitializing = useSelector((s) => s.auth.isLoading && !s.auth.isInitialized);

useEffect(() => {
  // Don't fetch if auth is still initializing (it will fetch permissions)
  if (isLoggedIn && currentRoleId && !myPermissions && !myPermissionsLoading && !isAuthInitializing) {
    dispatch(fetchMyPermissions());
  }
}, [isLoggedIn, currentRoleId, myPermissions, myPermissionsLoading, isAuthInitializing, dispatch]);
```

### Option 2: Remove SubscriptionGuard call (Recommended)

Since `initializeAuth` already fetches permissions, and MenuList also fetches if needed, SubscriptionGuard might not need to fetch permissions itself. It should just wait for them to be loaded.

**Current Flow**:

- `initializeAuth` → Fetches permissions
- `MenuList` → Fetches permissions if needed
- `SubscriptionGuard` → Also tries to fetch (potential duplicate)

**Better Flow**:

- `initializeAuth` → Fetches permissions
- `MenuList` → Fetches permissions if needed
- `SubscriptionGuard` → Just waits for permissions to load (no fetch)

---

## Recommended Fix

Remove the `fetchMyPermissions` call from SubscriptionGuard and just wait for permissions to load:

```typescript
// Remove this useEffect:
// useEffect(() => {
//   if (isLoggedIn && currentRoleId && !myPermissions && !myPermissionsLoading) {
//     dispatch(fetchMyPermissions());
//   }
// }, [isLoggedIn, currentRoleId, myPermissions, myPermissionsLoading, dispatch]);

// Keep the loading check:
if (myPermissionsLoading) {
  console.log('[SubscriptionGuard] ⏳ Loading permissions (will create subscription status), allowing access');
  return <>{children}</>;
}
```

**Reasoning**:

1. `initializeAuth` already fetches permissions during login
2. `MenuList` fetches permissions if needed
3. SubscriptionGuard should just wait, not fetch
4. Prevents duplicate API calls

---

## Verification: Current State

### ✅ Protection Mechanisms Working

1. **Redux Loading State**: ✅ Prevents duplicate calls when thunk is pending
2. **Component Checks**: ✅ Both check `!myPermissionsLoading`
3. **Ref Tracking**: ✅ MenuList tracks role-based fetches

### ✅ Issue Fixed

**Race Condition**: ~~SubscriptionGuard might call before `initializeAuth` completes~~ → **FIXED**

**Solution Applied**: Removed `fetchMyPermissions` call from SubscriptionGuard

**Result**: ✅ No duplicate calls - SubscriptionGuard only waits for permissions to load

---

## Summary

### Current Status

- ✅ **MenuList**: Properly protected with loading check + ref tracking
- ✅ **initializeAuth**: Uses direct API call + manual fulfilled dispatch (avoids duplicate)
- ✅ **SubscriptionGuard**: **FIXED** - Removed fetch call, only waits for permissions to load

### ✅ Fix Applied

**Removed `fetchMyPermissions` call from SubscriptionGuard** because:

1. ✅ `initializeAuth` already fetches during login
2. ✅ `MenuList` fetches if needed
3. ✅ SubscriptionGuard now just waits for permissions to load
4. ✅ Prevents any potential duplicate calls

The guard now only checks if permissions are loading and waits, it does not fetch them itself.
