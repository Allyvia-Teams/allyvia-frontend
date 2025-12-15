# API Structure Comparison: Documentation vs Implementation

## Overview

This document compares the API structure documentation with the actual frontend implementation to identify what's implemented, what's missing, and what differs.

---

## ✅ What's Implemented Correctly

### 1. Login API

**Documentation:**

- Endpoint: `POST /api/v1/auth/login/`
- Request: `{ email, password }`
- Response: `{ refresh, access, user_id, email, must_change_password }`

**Implementation:**

- ✅ Endpoint: `POST /auth/login/` (base URL already includes `/api/v1`)
- ✅ Request: `{ email, password }`
- ✅ Response: `{ access, refresh, user_id, email, must_change_password }`
- ✅ Location: `src/store/slices/auth.ts` - `loginAsync` thunk

**Status:** ✅ **FULLY IMPLEMENTED**

---

### 2. Get User Roles

**Documentation:**

- Endpoint: `GET /api/v1/role/`
- Headers: `Authorization: Bearer <access_token>`
- Response: Paginated response with `{ count, next, previous, results: Role[] }`

**Implementation:**

- ✅ Endpoint: `GET /role/` (base URL already includes `/api/v1`)
- ✅ Headers: `Authorization: Bearer <access_token>` (set automatically)
- ⚠️ Response: Returns array directly `Role[]` (not paginated)
- ✅ Location: `src/api/role.api.ts` - `getRoles()`
- ✅ Location: `src/store/slices/auth.ts` - `loginAsync` fetches roles after login

**Status:** ⚠️ **IMPLEMENTED WITH DIFFERENCE**

- **Difference:** Backend returns array, not paginated response
- **Impact:** None (frontend handles array correctly)

---

### 3. Permissions API

**Documentation:**

- Endpoint: `GET /api/v1/role/permissions/`
- Headers: `Authorization: Bearer <access_token>`, `X-Role-ID: <role_id>`
- Response: `{ company, role, user, permissions }`
- Permissions at top level (not nested in role)

**Implementation:**

- ✅ Endpoint: `GET /role/permissions/` (base URL already includes `/api/v1`)
- ✅ Headers: `Authorization` and `X-Role-ID` set automatically in axios interceptor
- ✅ Response: `{ permissions, company, user, role }`
- ✅ Permissions at top level (normalized from old structure if needed)
- ✅ Location: `src/api/role.api.ts` - `getMyPermissions()`
- ✅ Location: `src/store/slices/role.ts` - `fetchMyPermissions` thunk
- ✅ Normalizes: Lowercases all keys, converts boolean values, handles backward compatibility

**Status:** ✅ **FULLY IMPLEMENTED**

---

### 4. Available Modules API

**Documentation:**

- Endpoint: `GET /api/v1/role/available-modules/`
- Headers: `Authorization: Bearer <access_token>`, `X-Role-ID: <role_id>`
- Response: `{ available_modules: AvailableModule[] }`
- Admin: Returns all modules from subscription
- Non-admin: Returns only accessible modules

**Implementation:**

- ✅ Endpoint: `GET /role/available-modules/` (base URL already includes `/api/v1`)
- ✅ Headers: `Authorization` and `X-Role-ID` set automatically in axios interceptor
- ✅ Response: `{ available_modules: AvailableModule[] }`
- ✅ Location: `src/api/role.api.ts` - `getAvailableModules()`
- ✅ Location: `src/store/slices/role.ts` - `fetchAvailableModules` thunk
- ✅ Normalizes: Lowercases all keys, converts boolean values

**Status:** ✅ **FULLY IMPLEMENTED**

---

### 5. X-Role-ID Header

**Documentation:**

- Required header for permissions and available-modules endpoints
- Must be set manually: `X-Role-ID: <role_id>`

**Implementation:**

- ✅ Automatically set in axios interceptor (`src/utils/axios.ts`)
- ✅ Gets role ID from Redux state (`state.auth.currentRole.id`) or localStorage
- ✅ Applied to ALL requests automatically
- ✅ Location: `src/utils/axios.ts` - Request interceptor (lines 34-50)

**Status:** ✅ **FULLY IMPLEMENTED (Better than documented)**

- **Note:** Implementation is automatic, not manual as documented

---

## ⚠️ Differences & Discrepancies

### 1. Get Roles Response Structure

**Documentation:**

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [Role[]]
}
```

**Implementation:**

```typescript
// Returns array directly
Role[]
```

**Impact:** Low - Frontend handles array correctly, but documentation should match implementation.

---

### 2. Company Structure in Permissions Response

**Documentation:**

```json
{
  "company": {
    "id": "uuid",
    "name": "Company Name",
    "subscription_id": "sub_xxx",
    "subscription_status": "active",
    "subscription_plan": "Service-Based Business Plan",
    "stripe_customer_id": "cus_xxx",
    "stripe_price_id": "price_xxx",
    "trial_end_date": "2025-12-31T00:00:00Z",
    "subscription_start_date": "2025-01-01T00:00:00Z",
    "subscription_end_date": "2025-12-31T00:00:00Z",
    "subscription_renewal_date": "2025-12-31T00:00:00Z",
    "current_period_start": "2025-12-01T00:00:00Z",
    "current_period_end": "2025-12-31T00:00:00Z"
  }
}
```

**Implementation:**

```typescript
interface CompanyInfo {
  id: string;
  name: string;
  subscription_plan: string;
  // Note: available_modules is NOT included (fetched separately)
}
```

**Impact:** Medium - Frontend only uses `id`, `name`, and `subscription_plan`. Other subscription fields are fetched separately via subscription API.

**Note:** Subscription details are fetched via `GET /api/v1/subscription/status/` endpoint (separate from permissions API).

---

### 3. Role Selection Flow

**Documentation:**

- Step 2: Get User Roles → Select active role
- Step 3: Set Active Role using `X-Role-ID` header

**Implementation:**

- ✅ Gets roles after login
- ✅ Automatically selects first role (or "member" role if available)
- ✅ Stores role ID in localStorage and Redux state
- ✅ Automatically sets `X-Role-ID` header for all requests
- ✅ Location: `src/store/slices/auth.ts` - `loginAsync` and `initializeAuth`

**Status:** ✅ **FULLY IMPLEMENTED (Better than documented)**

- **Note:** Role selection is automatic, not manual

---

## ❌ What's Missing or Not Implemented

### 1. Manual X-Role-ID Header Setting

**Documentation:**

- Shows manual header setting: `X-Role-ID: <role_id>`

**Implementation:**

- ✅ Automatically set in axios interceptor
- ❌ No manual setting needed (but possible via `setRoleId()` utility)

**Impact:** None - Automatic implementation is better than manual

---

---

## 📋 Complete Implementation Checklist

### Authentication Flow

- [x] Login API (`POST /auth/login/`)
- [x] Get User Roles (`GET /role/`)
- [x] Set Active Role (automatic)
- [x] X-Role-ID Header (automatic)
- [x] Token Refresh (`POST /auth/refresh/`)
- [x] Cookie-based Refresh (`POST /auth/refresh-cookie/`)

### Permissions Flow

- [x] Get Permissions (`GET /role/permissions/`)
- [x] X-Role-ID Header (automatic)
- [x] Response Normalization (lowercase keys, boolean conversion)
- [x] Backward Compatibility (handles old structure)
- [x] Redux Integration (`fetchMyPermissions` thunk)

### Available Modules Flow

- [x] Get Available Modules (`GET /role/available-modules/`)
- [x] X-Role-ID Header (automatic)
- [x] Response Normalization (lowercase keys, boolean conversion)
- [x] Redux Integration (`fetchAvailableModules` thunk)

### Role Management

- [x] Get Role Definitions (`GET /role/list/`)
- [x] Create Role (`POST /role/create/`)
- [x] Update Role (`PUT /role/{id}/update/`)
- [x] Delete Role (`DELETE /role/{id}/delete/`)
- [x] Get Current Role (`GET /role/current/`) - Returns role from `X-Role-ID` header

### User Management

- [x] Get Users (`GET /role/users/`)
- [x] Invite User (`POST /role/users/invite/`)
- [x] Change User Role (`PUT /role/users/{user_id}/role/`)
- [x] Delete User (`DELETE /user/{user_id}/`)

---

---

## 🔍 Key Implementation Details

### 1. Automatic Header Management

**Location:** `src/utils/axios.ts`

```typescript
// Request interceptor automatically sets headers
axiosServices.interceptors.request.use(async (config) => {
  // Authorization header
  const accessToken = getAccessToken();
  if (accessToken && config.headers) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // X-Role-ID header (from Redux state or localStorage)
  const currentRole = state.auth?.currentRole;
  if (currentRole?.id && config.headers) {
    config.headers['X-Role-ID'] = currentRole.id;
  } else {
    const roleId = getRoleId();
    if (roleId && config.headers) {
      config.headers['X-Role-ID'] = roleId;
    }
  }
});
```

**Impact:** All API requests automatically include required headers - no manual setting needed.

---

### 2. Response Normalization

**Location:** `src/api/role.api.ts`

Both `getMyPermissions()` and `getAvailableModules()` normalize responses:

- Lowercase all keys (module, page, tab, action keys)
- Convert boolean values (ensures `true`/`false`, not `1`/`0` or strings)
- Handle backward compatibility (old structure support)

**Impact:** Ensures consistent data structure regardless of backend response format.

---

### 3. Redux Integration

**Location:** `src/store/slices/role.ts`

All API calls are wrapped in Redux thunks:

- `fetchMyPermissions` - Fetches permissions and triggers subscription update
- `fetchAvailableModules` - Fetches available modules
- `fetchRoleDefinitions` - Fetches role list
- `createRole` - Creates role and auto-refreshes role list
- `updateRole` - Updates role and auto-refreshes role list
- `deleteRole` - Deletes role and auto-refreshes role list

**Impact:** Centralized state management with automatic UI updates.

---

## 📝 Recommendations

### 1. Update Documentation

**Action:** Update API documentation to match actual implementation:

- Change `/role/` response from paginated to array
- Document automatic `X-Role-ID` header setting
- Clarify that subscription details are in separate endpoint

### 2. Verified Backend Endpoints

**Verified Backend Endpoints:**

- ✅ `GET /api/v1/role/current/` - Returns role from `X-Role-ID` header (used in `getCurrentRole()`)

### 3. Company Structure

**Action:** Decide if permissions API should include full subscription details:

- **Option A:** Keep minimal (current) - subscription details via separate endpoint
- **Option B:** Include full subscription details in permissions response

**Current:** Option A (minimal) - subscription fetched separately via `GET /api/v1/subscription/status/`

---

## ✅ Summary

### What's Working

1. ✅ **Login Flow** - Fully implemented and working
2. ✅ **Permissions API** - Fully implemented with normalization
3. ✅ **Available Modules API** - Fully implemented with normalization
4. ✅ **X-Role-ID Header** - Automatically set (better than documented)
5. ✅ **Role Management** - All CRUD operations implemented
6. ✅ **User Management** - All operations implemented

### Minor Differences

1. ⚠️ **Get Roles Response** - Returns array, not paginated (works fine)
2. ⚠️ **Company Structure** - Minimal fields (subscription details separate)

### Overall Status

**✅ 100% Implementation Complete**

The frontend implementation is comprehensive and actually **better** than documented in some areas (automatic header management). The only discrepancies are minor structural differences that don't affect functionality.
