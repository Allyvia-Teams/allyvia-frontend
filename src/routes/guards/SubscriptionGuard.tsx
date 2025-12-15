import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'store';
import { fetchSubscriptionStatus } from 'store/slices/subscription';
import { fetchMyPermissions } from 'store/slices/role';

type Props = { children: React.ReactElement };

// Routes that should bypass subscription check
const BYPASS_ROUTES = ['/payment-plan', '/checkout/success', '/403'];

/**
 * Subscription Guard
 *
 * Checks if user has an active subscription. If not, redirects to payment plan selection.
 *
 * Flow:
 * 1. First login → No subscription → Redirect to /payment-plan
 * 2. Has subscription (active/trialing) → Allow access to routes
 * 3. Subscription canceled/past_due → Redirect to /payment-plan
 *
 * Note: Waits for permissions to load since they create subscription status from company data
 */
export default function SubscriptionGuard({ children }: Props): React.ReactElement {
  const location = useLocation();
  const dispatch = useDispatch();
  const subscription = useSelector((s) => s.subscription.status);
  const statusLoading = useSelector((s) => s.subscription.statusLoading);
  const isLoggedIn = useSelector((s) => s.auth.isLoggedIn);
  const isAuthInitializing = useSelector((s) => s.auth.isLoading);
  const isAuthInitialized = useSelector((s) => s.auth.isInitialized);
  const currentRoleId = useSelector((s) => s.auth.currentRole?.id);
  const myPermissionsLoading = useSelector((s) => s.role.myPermissionsLoading);
  const myPermissions = useSelector((s) => s.role.myPermissions);

  // Ensure permissions are fetched after auth initialization
  // initializeAuth should fetch them, but if they're not in state yet, trigger a fetch
  // This ensures we have permissions to check subscription status
  useEffect(() => {
    if (isAuthInitialized && isLoggedIn && currentRoleId && !myPermissions && !myPermissionsLoading) {
      console.log('[SubscriptionGuard] Permissions not found after auth init, triggering fetch...');
      dispatch(fetchMyPermissions());
    }
  }, [isAuthInitialized, isLoggedIn, currentRoleId, myPermissions, myPermissionsLoading, dispatch]);

  // Console logs for debugging
  console.log('[SubscriptionGuard] State Check:', {
    pathname: location.pathname,
    isLoggedIn,
    isAuthInitializing,
    isAuthInitialized,
    statusLoading,
    myPermissionsLoading,
    hasPermissions: !!myPermissions,
    subscription: subscription
      ? {
          status: subscription.subscription_status,
          plan: subscription.subscription_plan,
          id: subscription.subscription_id,
          hasActive: subscription.subscription_status === 'active' || subscription.subscription_status === 'trialing'
        }
      : null
  });

  // Note: Permissions fetching strategy:
  // 1. initializeAuth fetches permissions during login (primary source)
  // 2. If permissions not found after auth init, we trigger a fetch as fallback
  // 3. MenuList also fetches permissions if needed (e.g., on role change)
  // 4. We wait for permissions to load since they create subscription status from company data

  // Fetch subscription status if not loaded and user is logged in
  useEffect(() => {
    if (isLoggedIn && !subscription && !statusLoading) {
      console.log('[SubscriptionGuard] Fetching subscription status...');
      dispatch(fetchSubscriptionStatus());
    }
  }, [isLoggedIn, subscription, statusLoading, dispatch]);

  // Don't check subscription for bypass routes
  if (BYPASS_ROUTES.some((route) => location.pathname === route || location.pathname.startsWith(route))) {
    console.log('[SubscriptionGuard] ✅ Bypass route detected, allowing access:', location.pathname);
    return children;
  }

  // Don't check if not logged in (AuthGuard handles that)
  if (!isLoggedIn) {
    console.log('[SubscriptionGuard] ⚠️ Not logged in, allowing access (AuthGuard handles authentication)');
    return children;
  }

  // Wait for auth initialization to complete (it fetches permissions)
  // This prevents checking subscription before permissions are fetched
  if (isAuthInitializing || !isAuthInitialized) {
    console.log('[SubscriptionGuard] ⏳ Auth initializing, waiting for permissions to be fetched...');
    return <>{children}</>;
  }

  // Wait for permissions to load first (they create subscription status from company data)
  // This prevents premature redirect before subscription status is created
  if (myPermissionsLoading) {
    console.log('[SubscriptionGuard] ⏳ Loading permissions (will create subscription status), allowing access');
    return <>{children}</>;
  }

  // Wait for subscription status to load
  // If we're loading, allow children to render (they may show loading states)
  if (statusLoading) {
    console.log('[SubscriptionGuard] ⏳ Loading subscription status, allowing access (prevents redirect flash)');
    return <>{children}</>;
  }

  // After loading completes, check subscription status
  // If no subscription data exists (null), user has no subscription → redirect
  if (!subscription) {
    console.log('[SubscriptionGuard] ❌ No subscription found, redirecting to /payment-plan');
    return <Navigate to="/payment-plan" replace />;
  }

  // Check if subscription is active or trialing
  const hasActiveSubscription = subscription.subscription_status === 'active' || subscription.subscription_status === 'trialing';

  console.log('[SubscriptionGuard] Subscription Status Check:', {
    status: subscription.subscription_status,
    hasActiveSubscription,
    plan: subscription.subscription_plan
  });

  // If subscription is not active/trialing (canceled, past_due, etc.), redirect to payment plan
  if (!hasActiveSubscription) {
    console.log(
      '[SubscriptionGuard] ❌ Subscription not active (status:',
      subscription.subscription_status,
      '), redirecting to /payment-plan'
    );
    return <Navigate to="/payment-plan" replace />;
  }

  // Subscription is active, allow access
  console.log('[SubscriptionGuard] ✅ Subscription active, allowing access');
  return children;
}
