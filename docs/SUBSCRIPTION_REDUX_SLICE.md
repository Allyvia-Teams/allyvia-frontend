# Subscription Redux Slice - Complete Documentation

## Overview

The Subscription Redux slice (`src/store/slices/subscription.ts`) manages all subscription-related state, including status, checkout sessions, cancellation, and updates. It integrates with the subscription API and provides state management for subscription operations throughout the application.

---

## State Structure

### SubscriptionState Interface

```typescript
interface SubscriptionState {
  // Status
  status: SubscriptionStatusResponse | null;
  statusLoading: boolean;
  statusError: string | null;

  // Checkout Session
  checkoutSession: CreateCheckoutSessionResponse | null;
  checkoutLoading: boolean;
  checkoutError: string | null;

  // Cancel Subscription
  cancelLoading: boolean;
  cancelError: string | null;
  cancelSuccess: boolean;

  // Update Subscription
  updateLoading: boolean;
  updateError: string | null;
  updateSuccess: boolean;
}
```

### Initial State

```typescript
const initialState: SubscriptionState = {
  status: null, // No subscription data initially
  statusLoading: false, // Not loading
  statusError: null, // No errors
  checkoutSession: null, // No checkout session
  checkoutLoading: false,
  checkoutError: null,
  cancelLoading: false,
  cancelError: null,
  cancelSuccess: false,
  updateLoading: false,
  updateError: null,
  updateSuccess: false
};
```

---

## SubscriptionStatusResponse Type

This is the main type for subscription status data:

```typescript
interface SubscriptionStatusResponse {
  // Main Status Fields
  status: 'Active' | 'Inactive'; // High-level status
  subscription_id: string | null; // Stripe subscription ID
  subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled' | null; // Detailed status
  subscription_plan: string | null; // Plan name (e.g., "Service-Based Business Plan")
  trial_end_date: string | null; // ISO date string or null
  company_id?: string; // Company UUID

  // Nested Objects
  current_plan?: CurrentPlan; // Current plan details
  subscription_details?: SubscriptionDetails; // Detailed subscription info

  // Available Modules
  available_modules?: string[] | AvailableModule[]; // Modules available in subscription

  // Legacy/Backward Compatibility Fields
  subscription_start_date?: string | null; // ISO 8601 format
  subscription_end_date?: string | null; // ISO 8601 format
  subscription_cancel_at?: string | null; // ISO 8601 format

  // Error Messages (when no subscription)
  message?: string; // Only if no subscription
}
```

### Nested Types

#### CurrentPlan

```typescript
interface CurrentPlan {
  plan_name: string;
  status: string; // e.g., "TRIALING"
  trial_end_date?: string; // Formatted date string
  can_cancel?: boolean; // Whether subscription can be canceled
}
```

#### SubscriptionDetails

```typescript
interface SubscriptionDetails {
  subscription_id: string;
  start_date: string; // Formatted date string
  cancel_at: string | null; // Formatted date string or null
  renewal_date: string | null; // Formatted date string or null
  subscription_end_date: string | null;
  trial_end_date?: string | null;
}
```

---

## Async Thunks (API Actions)

### 1. fetchSubscriptionStatus

**Purpose**: Fetch current subscription status from backend

**API**: `GET /api/v1/subscription/status/`

**Implementation**:

```typescript
export const fetchSubscriptionStatus = createAsyncThunk('subscription/fetchStatus', async (_, { rejectWithValue }) => {
  try {
    const response = await subscriptionAPI.getSubscriptionStatus();
    return response; // Returns SubscriptionStatusResponse
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to fetch subscription status';
    return rejectWithValue(errorMessage);
  }
});
```

**Usage**:

```typescript
dispatch(fetchSubscriptionStatus());
```

**Redux State Updates**:

- **Pending**:

  ```typescript
  state.statusLoading = true;
  state.statusError = null;
  ```

- **Fulfilled**:

  ```typescript
  state.statusLoading = false;
  state.status = action.payload; // Full SubscriptionStatusResponse
  state.statusError = null;
  ```

- **Rejected**:
  ```typescript
  state.statusLoading = false;
  state.statusError = errorMessage;
  ```

---

### 2. createCheckoutSession

**Purpose**: Create Stripe checkout session for subscription purchase

**API**: `POST /api/v1/subscription/create-checkout-session/`

**Request Type**:

```typescript
interface CreateCheckoutSessionRequest {
  price_id: string; // Required: Stripe Price ID
  billing_cycle?: string; // Optional: Default "12" (months)
  plan_name?: string; // Optional: Default ""
  trial_period_days?: number; // Optional: Default 30
}
```

**Response Type**:

```typescript
interface CreateCheckoutSessionResponse {
  checkout_url: string; // Stripe checkout URL
  session_id: string; // Session ID
}
```

**Implementation**:

```typescript
export const createCheckoutSession = createAsyncThunk(
  'subscription/createCheckoutSession',
  async (data: CreateCheckoutSessionRequest, { rejectWithValue }) => {
    try {
      const response = await subscriptionAPI.createCheckoutSession(data);
      return response;
    } catch (error: any) {
      // Error handling...
    }
  }
);
```

**Redux State Updates**:

- **Pending**: `state.checkoutLoading = true; state.checkoutError = null;`
- **Fulfilled**: `state.checkoutSession = action.payload; state.checkoutLoading = false;`
- **Rejected**: `state.checkoutError = errorMessage; state.checkoutLoading = false;`

---

### 3. cancelSubscription

**Purpose**: Cancel current subscription

**API**: `POST /api/v1/subscription/cancel/`

**Implementation**:

```typescript
export const cancelSubscription = createAsyncThunk('subscription/cancel', async (_, { rejectWithValue, dispatch }) => {
  try {
    const response = await subscriptionAPI.cancelSubscription();
    // Auto-refresh status after cancellation
    dispatch(fetchSubscriptionStatus());
    return response;
  } catch (error: any) {
    // Error handling...
  }
});
```

**Auto-Refresh**: Automatically dispatches `fetchSubscriptionStatus()` after successful cancellation

**Response Type**:

```typescript
interface CancelSubscriptionResponse {
  success: boolean;
  message: string;
  cancel_at: number; // Unix timestamp
}
```

**Redux State Updates**:

- **Pending**: `state.cancelLoading = true; state.cancelError = null; state.cancelSuccess = false;`
- **Fulfilled**: `state.cancelLoading = false; state.cancelSuccess = true;`
- **Rejected**: `state.cancelLoading = false; state.cancelError = errorMessage; state.cancelSuccess = false;`

---

### 4. updateSubscription

**Purpose**: Update subscription (change plan or resume canceled subscription)

**API**: `POST /api/v1/subscription/update/`

**Request Type**:

```typescript
interface UpdateSubscriptionRequest {
  price_id?: string; // Optional: New price ID to change plan
  cancel_at_period_end?: boolean; // Optional: Resume canceled subscription
}
```

**Implementation**:

```typescript
export const updateSubscription = createAsyncThunk(
  'subscription/update',
  async (data: UpdateSubscriptionRequest, { rejectWithValue, dispatch }) => {
    try {
      const response = await subscriptionAPI.updateSubscription(data);
      // Auto-refresh status after update
      dispatch(fetchSubscriptionStatus());
      return response;
    } catch (error: any) {
      // Error handling...
    }
  }
);
```

**Auto-Refresh**: Automatically dispatches `fetchSubscriptionStatus()` after successful update

**Response Type**:

```typescript
interface UpdateSubscriptionResponse {
  success: boolean;
  message: string;
  subscription_id: string;
  status: string;
  cancel_at_period_end: boolean;
}
```

**Redux State Updates**:

- **Pending**: `state.updateLoading = true; state.updateError = null; state.updateSuccess = false;`
- **Fulfilled**: `state.updateLoading = false; state.updateSuccess = true;`
- **Rejected**: `state.updateLoading = false; state.updateError = errorMessage; state.updateSuccess = false;`

---

### 5. testSubscribe (Development Only)

**Purpose**: Create test subscription (development/testing only)

**API**: `GET /api/v1/subscription/test/`

**Implementation**:

```typescript
export const testSubscribe = createAsyncThunk('subscription/testSubscribe', async (_, { rejectWithValue, dispatch }) => {
  try {
    const response = await subscriptionAPI.testSubscribe();
    // Auto-refresh status after test subscription
    dispatch(fetchSubscriptionStatus());
    return response;
  } catch (error: any) {
    // Error handling...
  }
});
```

**Auto-Refresh**: Automatically dispatches `fetchSubscriptionStatus()` after test subscription

---

## Reducers (Synchronous Actions)

### 1. clearCheckoutSession

**Purpose**: Clear checkout session data from state

```typescript
clearCheckoutSession: (state) => {
  state.checkoutSession = null;
  state.checkoutError = null;
};
```

**Usage**: Called after checkout is complete or cancelled

---

### 2. clearCancelSuccess

**Purpose**: Clear cancellation success flag

```typescript
clearCancelSuccess: (state) => {
  state.cancelSuccess = false;
  state.cancelError = null;
};
```

**Usage**: Called to reset cancellation state after showing success message

---

### 3. clearUpdateSuccess

**Purpose**: Clear update success flag

```typescript
clearUpdateSuccess: (state) => {
  state.updateSuccess = false;
  state.updateError = null;
};
```

**Usage**: Called to reset update state after showing success message

---

### 4. updateSubscriptionStatusFromPermissions ⭐ **IMPORTANT**

**Purpose**: Sync subscription status with company data from permissions API response

**Why This Exists**:

- Permissions API (`/api/v1/role/permissions/`) includes company data with subscription info
- This data needs to be synced to subscription slice
- Allows immediate subscription status creation without separate API call

**Type**:

```typescript
updateSubscriptionStatusFromPermissions: (
  state,
  action: PayloadAction<{
    company: {
      id: string;
      name: string;
      subscription_id?: string | null;
      subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled' | null;
      subscription_plan?: string | null;
      trial_end_date?: string | null;
    };
  }>
) => {
  // Implementation below
};
```

**Implementation Logic**:

1. **If subscription status doesn't exist** (`state.status === null`):

   - Creates new `SubscriptionStatusResponse` from company data
   - Maps company fields to subscription status format
   - Sets `status: 'Active'` if `subscription_status === 'active' || 'trialing'`
   - Sets `status: 'Inactive'` otherwise

2. **If subscription status exists**:
   - Updates existing status with company data
   - Merges company fields with existing status
   - Preserves existing fields not in company data

**Code**:

```typescript
if (!state.status) {
  // CREATE subscription status from company data
  const hasSubscription = company.subscription_id && company.subscription_status;
  const isActive = company.subscription_status === 'active' || company.subscription_status === 'trialing';

  state.status = {
    status: hasSubscription && isActive ? 'Active' : 'Inactive',
    subscription_id: company.subscription_id || null,
    subscription_status: company.subscription_status || null,
    subscription_plan: company.subscription_plan || null,
    trial_end_date: company.trial_end_date || null,
    company_id: company.id
  };
} else {
  // UPDATE existing subscription status
  state.status = {
    ...state.status,
    subscription_id: company.subscription_id || state.status.subscription_id,
    subscription_status: company.subscription_status || state.status.subscription_status,
    subscription_plan: company.subscription_plan || state.status.subscription_plan,
    trial_end_date: company.trial_end_date || state.status.trial_end_date,
    status: company.subscription_status === 'active' || company.subscription_status === 'trialing' ? 'Active' : 'Inactive',
    company_id: company.id || state.status.company_id
  };
}
```

**Usage**: Called automatically when permissions are fetched (in `fetchMyPermissions` thunk)

---

### 5. resetSubscriptionState

**Purpose**: Reset entire subscription state to initial state

```typescript
resetSubscriptionState: (state) => {
  return initialState;
};
```

**Usage**: Called on logout or when clearing all subscription data

---

## Data Flow Examples

### Example 1: First-Time User Login

```
1. User logs in → AuthGuard passes
2. fetchMyPermissions() dispatched
3. Permissions API returns company data with subscription_status: null
4. updateSubscriptionStatusFromPermissions() called
   - Creates: { status: 'Inactive', subscription_status: null, ... }
5. SubscriptionGuard checks status
   - Sees status === null or 'Inactive'
   - Redirects to /payment-plan
```

### Example 2: User with Active Subscription

```
1. User logs in → AuthGuard passes
2. fetchMyPermissions() dispatched
3. Permissions API returns company data with subscription_status: 'trialing'
4. updateSubscriptionStatusFromPermissions() called
   - Creates: { status: 'Active', subscription_status: 'trialing', ... }
5. fetchSubscriptionStatus() also dispatched (for full details)
6. SubscriptionGuard checks status
   - Sees subscription_status === 'trialing'
   - Allows access to routes
```

### Example 3: Canceling Subscription

```
1. User clicks "Cancel Subscription"
2. cancelSubscription() dispatched
3. API: POST /api/v1/subscription/cancel/
4. Backend cancels subscription
5. Auto-dispatches fetchSubscriptionStatus()
6. Status updated to: { subscription_status: 'canceled', ... }
7. SubscriptionGuard redirects to /payment-plan on next route access
```

### Example 4: Creating Checkout Session

```
1. User selects plan and clicks "Subscribe"
2. createCheckoutSession({ price_id, ... }) dispatched
3. API: POST /api/v1/subscription/create-checkout-session/
4. Returns: { checkout_url: "https://...", session_id: "..." }
5. User redirected to checkout_url
6. After payment, redirects to /checkout/success
7. SuccessfulCheckout component fetches status
8. Status updated to active subscription
```

---

## Key Status Values

### subscription_status Values

- `'active'` - Subscription is active and paid
- `'trialing'` - User is in trial period
- `'past_due'` - Payment failed, subscription past due
- `'canceled'` - Subscription was canceled
- `null` - No subscription exists

### status Values (High-Level)

- `'Active'` - Subscription is active or trialing
- `'Inactive'` - No subscription or inactive subscription

### Active Status Check

```typescript
const hasActiveSubscription = subscription_status === 'active' || subscription_status === 'trialing';
```

Used by:

- `SubscriptionGuard` - To allow/deny route access
- UI components - To show/hide subscription features

---

## Integration Points

### 1. With SubscriptionGuard

**File**: `src/routes/guards/SubscriptionGuard.tsx`

**Usage**:

```typescript
const subscription = useSelector((s) => s.subscription.status);
const statusLoading = useSelector((s) => s.subscription.statusLoading);

// Checks subscription_status === 'active' || 'trialing'
const hasActiveSubscription = subscription?.subscription_status === 'active' || subscription?.subscription_status === 'trialing';
```

### 2. With Permissions API

**File**: `src/store/slices/role.ts`

**Usage**:

```typescript
export const fetchMyPermissions = createAsyncThunk(...) => {
  const response = await roleAPI.getMyPermissions();

  // Sync subscription status from company data
  if (response.company) {
    dispatch(updateSubscriptionStatusFromPermissions({ company: response.company }));
    dispatch(fetchSubscriptionStatus());  // Also fetch full status
  }

  return response;
};
```

### 3. With BillingTab

**File**: `src/views/settings/tabs/BillingTab.tsx`

**Usage**:

```typescript
const { status, statusLoading, statusError } = useSelector((s) => s.subscription);

// Check if subscription exists
const hasSubscription =
  status?.subscription_plan &&
  (status?.status === 'Active' || status?.subscription_status === 'active' || status?.subscription_status === 'trialing');
```

### 4. With MenuList

**File**: `src/layout/MainLayout/MenuList/index.tsx`

**Usage**:

```typescript
const subscription = useSelector((s) => s.subscription.status);

// Filter menu items by subscription
const menuItems = getMenuItemsFromSubscription(subscription);
```

---

## Common Patterns

### Pattern 1: Check for Active Subscription

```typescript
const subscription = useSelector((s) => s.subscription.status);
const isActive = subscription?.subscription_status === 'active' || subscription?.subscription_status === 'trialing';
```

### Pattern 2: Fetch Status on Component Mount

```typescript
useEffect(() => {
  if (isAdmin) {
    dispatch(fetchSubscriptionStatus());
  }
}, [dispatch, isAdmin]);
```

### Pattern 3: Handle Loading State

```typescript
const { status, statusLoading, statusError } = useSelector((s) => s.subscription);

if (statusLoading) {
  return <CircularProgress />;
}

if (statusError) {
  return <Alert severity="error">{statusError}</Alert>;
}
```

### Pattern 4: Clear Success Messages

```typescript
const { cancelSuccess } = useSelector((s) => s.subscription);
const dispatch = useDispatch();

useEffect(() => {
  if (cancelSuccess) {
    setTimeout(() => {
      dispatch(clearCancelSuccess());
    }, 3000);
  }
}, [cancelSuccess, dispatch]);
```

---

## State Update Flow

### fetchSubscriptionStatus Flow

```
Component dispatches fetchSubscriptionStatus()
    ↓
Redux: subscription/fetchStatus/pending
    ↓
state.statusLoading = true
state.statusError = null
    ↓
API Call: GET /api/v1/subscription/status/
    ↓
Success → Redux: subscription/fetchStatus/fulfilled
    ↓
state.status = action.payload (SubscriptionStatusResponse)
state.statusLoading = false
state.statusError = null
    ↓
Component re-renders with new status
```

### updateSubscriptionStatusFromPermissions Flow

```
fetchMyPermissions() gets company data
    ↓
dispatch(updateSubscriptionStatusFromPermissions({ company }))
    ↓
If state.status === null:
    → CREATE new SubscriptionStatusResponse from company data
Else:
    → UPDATE existing status with company data
    ↓
state.status updated
    ↓
SubscriptionGuard can now check subscription immediately
```

---

## Error Handling

### Error Structure

All async thunks handle errors consistently:

```typescript
catch (error: any) {
  const errorMessage =
    error.response?.data?.error ||           // Backend error message
    error.response?.data?.detail ||          // Alternative backend error
    error.message ||                         // Network error
    'Failed to...';                          // Default fallback

  return rejectWithValue(errorMessage);
}
```

### Error States

- `statusError` - Error from fetchSubscriptionStatus
- `checkoutError` - Error from createCheckoutSession
- `cancelError` - Error from cancelSubscription
- `updateError` - Error from updateSubscription

### Displaying Errors

```typescript
const { statusError } = useSelector((s) => s.subscription);

{statusError && (
  <Alert severity="error" onClose={() => dispatch(clearStatusError())}>
    {statusError}
  </Alert>
)}
```

---

## Summary

The Subscription Redux slice provides:

1. ✅ **Centralized State Management** - Single source of truth for subscription data
2. ✅ **Automatic Status Syncing** - Syncs with permissions API company data
3. ✅ **Auto-Refresh** - Automatically refreshes status after mutations
4. ✅ **Loading States** - Tracks loading for all operations
5. ✅ **Error Handling** - Comprehensive error management
6. ✅ **Type Safety** - Full TypeScript type definitions
7. ✅ **Integration** - Works seamlessly with guards, UI components, and API

**Key Takeaways**:

- `status` contains the full subscription information
- `subscription_status` is the detailed status ('active', 'trialing', etc.)
- `updateSubscriptionStatusFromPermissions` creates/updates status from company data
- All mutations auto-refresh status
- Loading and error states are tracked separately for each operation
