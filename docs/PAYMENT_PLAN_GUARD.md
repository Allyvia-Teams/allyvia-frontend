# Payment Plan Guard (SubscriptionGuard) Documentation

## Overview

The `SubscriptionGuard` component protects routes by checking if the user has an active subscription. If not, it redirects to `/payment-plan` to allow the user to select and purchase a subscription plan.

**Location**: `src/routes/guards/SubscriptionGuard.tsx`

---

## How It Works

### Guard Chain Position

The `SubscriptionGuard` is placed in the guard chain **after** `AuthGuard` but **before** `MemberGuard`:

```
AuthGuard → SubscriptionGuard → MemberGuard → MainLayout
```

**Why this order?**

1. `AuthGuard` ensures user is logged in first
2. `SubscriptionGuard` checks subscription status
3. `MemberGuard` checks member permissions
4. `MainLayout` renders the app

### Route Configuration

**Main Routes** (`src/routes/MainRoutes.tsx`):

```typescript
{
  path: '/',
  element: (
    <AuthGuard>
      <SubscriptionGuard>  {/* ← Guards all main routes */}
        <MemberGuard>
          <MainLayout />
        </MemberGuard>
      </SubscriptionGuard>
    </AuthGuard>
  ),
  children: [
    // All protected routes here
  ]
},
{
  path: '/payment-plan',  {/* ← Bypassed by guard */}
  element: (
    <AuthGuard>
      <PaymentPlanSelection />
    </AuthGuard>
  )
}
```

---

## Guard Logic Flow

### Step-by-Step Decision Tree

```
1. Check if current route is bypass route
   ├─ YES → Allow access (return children)
   └─ NO → Continue to step 2

2. Check if user is logged in
   ├─ NO → Allow access (AuthGuard handles this)
   └─ YES → Continue to step 3

3. Check if subscription status is loading
   ├─ YES → Allow access (show loading state)
   └─ NO → Continue to step 4

4. Check if subscription exists
   ├─ NO (null) → Redirect to /payment-plan
   └─ YES → Continue to step 5

5. Check subscription status
   ├─ 'active' or 'trialing' → Allow access
   └─ Other (canceled, past_due, etc.) → Redirect to /payment-plan
```

---

## Code Breakdown

### 1. Bypass Routes

```typescript
const BYPASS_ROUTES = ['/payment-plan', '/checkout/success', '/403'];
```

**Purpose**: These routes should never be blocked by subscription check because:

- `/payment-plan` - Where users go to select a plan
- `/checkout/success` - Success page after payment
- `/403` - Unauthorized page

**Implementation**:

```typescript
if (BYPASS_ROUTES.some((route) => location.pathname === route || location.pathname.startsWith(route))) {
  return children; // Allow access
}
```

### 2. Redux State Access

```typescript
const subscription = useSelector((s) => s.subscription.status);
const statusLoading = useSelector((s) => s.subscription.statusLoading);
const isLoggedIn = useSelector((s) => s.auth.isLoggedIn);
```

**State Structure**:

```typescript
interface SubscriptionStatusResponse {
  subscription_id: string;
  subscription_status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'incomplete' | 'incomplete_expired' | 'unpaid';
  subscription_plan: string;
  stripe_customer_id: string;
  stripe_price_id: string;
  trial_end_date?: string;
  subscription_start_date: string;
  subscription_end_date?: string;
  // ... other fields
}
```

### 3. Auto-Fetch Subscription Status

```typescript
useEffect(() => {
  if (isLoggedIn && !subscription && !statusLoading) {
    dispatch(fetchSubscriptionStatus());
  }
}, [isLoggedIn, subscription, statusLoading, dispatch]);
```

**When it fetches**:

- User is logged in
- Subscription status is not loaded (`null`)
- Not currently loading

**API Call**: `GET /api/v1/subscription/status/`

### 4. Loading State Handling

```typescript
if (statusLoading) {
  return <>{children}</>;  // Allow children to render (they show loading states)
}
```

**Why allow during loading?**

- Prevents flash of redirect
- Child components can show their own loading states
- Better UX

### 5. No Subscription Check

```typescript
if (!subscription) {
  return <Navigate to="/payment-plan" replace />;
}
```

**When this happens**:

- First-time user (no subscription yet)
- Subscription was deleted
- API returned null

### 6. Active Subscription Check

```typescript
const hasActiveSubscription =
  subscription.subscription_status === 'active' ||
  subscription.subscription_status === 'trialing';

if (!hasActiveSubscription) {
  return <Navigate to="/payment-plan" replace />;
}
```

**Active Statuses**:

- `'active'` - Subscription is active and paid
- `'trialing'` - User is in trial period

**Inactive Statuses** (redirects to payment-plan):

- `'canceled'` - Subscription was canceled
- `'past_due'` - Payment failed
- `'incomplete'` - Payment incomplete
- `'incomplete_expired'` - Payment incomplete and expired
- `'unpaid'` - Unpaid subscription

### 7. Allow Access

```typescript
return children; // Subscription is active, allow access
```

---

## Complete Flow Examples

### Example 1: First-Time User (No Subscription)

```
1. User logs in → AuthGuard passes
2. User navigates to /dashboard
3. SubscriptionGuard checks:
   - Not a bypass route ✓
   - User is logged in ✓
   - Subscription status: null
4. Guard dispatches fetchSubscriptionStatus()
5. API returns: null (no subscription)
6. Guard redirects to /payment-plan
7. User sees payment plan selection page
```

### Example 2: User with Active Subscription

```
1. User logs in → AuthGuard passes
2. User navigates to /dashboard
3. SubscriptionGuard checks:
   - Not a bypass route ✓
   - User is logged in ✓
   - Subscription status: { subscription_status: 'active' }
4. Guard checks: hasActiveSubscription = true
5. Guard allows access → User sees dashboard
```

### Example 3: User with Canceled Subscription

```
1. User logs in → AuthGuard passes
2. User navigates to /dashboard
3. SubscriptionGuard checks:
   - Not a bypass route ✓
   - User is logged in ✓
   - Subscription status: { subscription_status: 'canceled' }
4. Guard checks: hasActiveSubscription = false
5. Guard redirects to /payment-plan
6. User sees payment plan selection page
```

### Example 4: User on Payment Plan Page

```
1. User navigates to /payment-plan
2. SubscriptionGuard checks:
   - Is bypass route? YES (/payment-plan)
3. Guard immediately returns children
4. User sees PaymentPlanSelection component
5. No redirect, no check needed
```

---

## Integration Points

### 1. After Successful Checkout

**Location**: `src/views/subscription/SuccessfulCheckout.tsx`

```typescript
// After successful payment
useEffect(() => {
  if (checkoutSuccess) {
    // Refresh subscription status
    dispatch(fetchSubscriptionStatus());

    // Check if subscription is now active
    if (subscription?.subscription_status === 'active') {
      navigate('/dashboard'); // Redirect to main app
    } else {
      navigate('/payment-plan'); // Still need to select plan
    }
  }
}, [checkoutSuccess, subscription]);
```

### 2. After Email Verification

**Location**: `src/views/pages/authentication/EmailVerified.tsx`

```typescript
// After email verification
if (response.data.access && response.data.refresh) {
  // User is logged in, but may not have subscription
  // SubscriptionGuard will check and redirect if needed
  navigate('/payment-plan', { replace: true });
}
```

### 3. After Subscription Cancellation

**Location**: `src/ui-component/subscription/ManageSubscriptionModal.tsx`

```typescript
// After canceling subscription
const handleCancelSubscription = async () => {
  await dispatch(cancelSubscription());
  // Subscription status refreshed automatically
  navigate('/payment-plan'); // Redirect to select new plan
};
```

---

## Console Logging for Debugging

To add console logs for debugging, update `SubscriptionGuard.tsx`:

```typescript
export default function SubscriptionGuard({ children }: Props): React.ReactElement {
  const location = useLocation();
  const dispatch = useDispatch();
  const subscription = useSelector((s) => s.subscription.status);
  const statusLoading = useSelector((s) => s.subscription.statusLoading);
  const isLoggedIn = useSelector((s) => s.auth.isLoggedIn);

  // Console logs for debugging
  console.log('[SubscriptionGuard] State:', {
    pathname: location.pathname,
    isLoggedIn,
    statusLoading,
    subscription: subscription ? {
      status: subscription.subscription_status,
      plan: subscription.subscription_plan,
      id: subscription.subscription_id
    } : null
  });

  // Fetch subscription status if not loaded
  useEffect(() => {
    if (isLoggedIn && !subscription && !statusLoading) {
      console.log('[SubscriptionGuard] Fetching subscription status...');
      dispatch(fetchSubscriptionStatus());
    }
  }, [isLoggedIn, subscription, statusLoading, dispatch]);

  // Bypass check
  if (BYPASS_ROUTES.some((route) => location.pathname === route || location.pathname.startsWith(route))) {
    console.log('[SubscriptionGuard] Bypass route, allowing access');
    return children;
  }

  // Not logged in check
  if (!isLoggedIn) {
    console.log('[SubscriptionGuard] Not logged in, allowing access (AuthGuard handles this)');
    return children;
  }

  // Loading check
  if (statusLoading) {
    console.log('[SubscriptionGuard] Loading subscription status, allowing access');
    return <>{children}</>;
  }

  // No subscription check
  if (!subscription) {
    console.log('[SubscriptionGuard] No subscription found, redirecting to /payment-plan');
    return <Navigate to="/payment-plan" replace />;
  }

  // Active subscription check
  const hasActiveSubscription =
    subscription.subscription_status === 'active' ||
    subscription.subscription_status === 'trialing';

  console.log('[SubscriptionGuard] Subscription status:', {
    status: subscription.subscription_status,
    hasActiveSubscription
  });

  if (!hasActiveSubscription) {
    console.log('[SubscriptionGuard] Subscription not active, redirecting to /payment-plan');
    return <Navigate to="/payment-plan" replace />;
  }

  console.log('[SubscriptionGuard] Subscription active, allowing access');
  return children;
}
```

---

## Common Scenarios

### Scenario 1: User Logs In Without Subscription

**Flow**:

1. User logs in successfully
2. Tries to access `/dashboard`
3. `SubscriptionGuard` checks subscription → `null`
4. Redirects to `/payment-plan`
5. User selects plan and completes checkout
6. After checkout, subscription status is `'active'`
7. User can now access all routes

### Scenario 2: Subscription Expires

**Flow**:

1. User has active subscription
2. Payment fails or subscription expires
3. Backend updates status to `'past_due'` or `'canceled'`
4. User tries to access any route
5. `SubscriptionGuard` checks status → `'past_due'`
6. Redirects to `/payment-plan`
7. User must reactivate subscription

### Scenario 3: User on Trial

**Flow**:

1. User signs up and starts trial
2. Subscription status is `'trialing'`
3. `SubscriptionGuard` checks → `hasActiveSubscription = true`
4. User can access all routes during trial
5. When trial ends, status changes to `'active'` or `'past_due'`

---

## Testing the Guard

### Test Cases

1. **No Subscription**:

   - Login as new user
   - Try to access `/dashboard`
   - Should redirect to `/payment-plan`

2. **Active Subscription**:

   - Login as user with active subscription
   - Try to access `/dashboard`
   - Should allow access

3. **Canceled Subscription**:

   - Login as user with canceled subscription
   - Try to access `/dashboard`
   - Should redirect to `/payment-plan`

4. **Bypass Route**:

   - Navigate to `/payment-plan`
   - Should not redirect (bypass works)

5. **Loading State**:
   - Login and immediately navigate
   - Should allow access during loading (no redirect flash)

---

## Potential Issues & Solutions

### Issue 1: Redirect Loop

**Problem**: User gets stuck in redirect loop between `/payment-plan` and other routes

**Solution**: Bypass routes prevent this - `/payment-plan` is always accessible

### Issue 2: Flash of Redirect

**Problem**: User sees protected page briefly before redirect

**Solution**: Loading state handling allows children to render during loading

### Issue 3: Stale Subscription Status

**Problem**: Subscription status not refreshed after payment

**Solution**: `SuccessfulCheckout` component dispatches `fetchSubscriptionStatus()` after payment

### Issue 4: Race Condition

**Problem**: Multiple components trying to fetch subscription status

**Solution**: Redux thunk handles this - only one request at a time

---

## Issue & Fix

### Problem Identified

From console logs, the guard was redirecting users to `/payment-plan` even when they had a valid subscription. The issue was:

1. **Subscription Status Not Created**: The `updateSubscriptionStatusFromPermissions` reducer only updated subscription status if it already existed (`if (state.status)`), but didn't create it from company data when `subscription` was `null`.

2. **Missing Company Fields**: The reducer's type definition only accepted `{ id, name, subscription_plan }`, missing critical fields like `subscription_id` and `subscription_status` that come from the permissions API response.

3. **Timing Issue**: When permissions API returned company data with `subscription_status: 'trialing'`, this data wasn't being used to initialize the subscription status object.

### Fix Applied

**File**: `src/store/slices/subscription.ts`

**Changes**:

1. ✅ Updated `updateSubscriptionStatusFromPermissions` to **create** subscription status object from company data if it doesn't exist
2. ✅ Expanded type definition to accept full company object with subscription fields (`subscription_id`, `subscription_status`, `trial_end_date`, etc.)
3. ✅ Added console logs to track when subscription status is created/updated

**Before**:

```typescript
if (action.payload.company && state.status) {
  // Only updates if state.status exists
  state.status.subscription_plan = company.subscription_plan;
}
```

**After**:

```typescript
if (action.payload.company) {
  if (!state.status) {
    // CREATE subscription status from company data
    state.status = {
      status: isActive ? 'Active' : 'Inactive',
      subscription_id: company.subscription_id,
      subscription_status: company.subscription_status,
      subscription_plan: company.subscription_plan
      // ... other fields
    };
  } else {
    // UPDATE existing subscription status
    state.status = { ...state.status, ...updates };
  }
}
```

### Result

Now when permissions are fetched:

1. Company object with `subscription_status: 'trialing'` is received
2. `updateSubscriptionStatusFromPermissions` creates subscription status object immediately
3. `SubscriptionGuard` sees active subscription and allows access
4. No incorrect redirect to `/payment-plan`

---

## Summary

The `SubscriptionGuard` works by:

1. ✅ **Bypassing** certain routes (`/payment-plan`, `/checkout/success`, `/403`)
2. ✅ **Auto-fetching** subscription status if not loaded
3. ✅ **Checking** subscription status after loading
4. ✅ **Redirecting** to `/payment-plan` if no subscription or inactive
5. ✅ **Allowing access** if subscription is active or trialing

**Key Points**:

- Placed after `AuthGuard` in guard chain
- Only checks logged-in users
- Handles loading states gracefully
- Automatically refreshes subscription status when needed
- Prevents redirect loops with bypass routes
