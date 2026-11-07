import { Navigate, useLocation, useNavigate } from 'react-router-dom';

// project imports
import useAuth from 'hooks/useAuth';
import { GuardProps } from 'types';
import { useEffect, useState } from 'react';
import MustChangePasswordGuard from './MustChangePasswordGuard';
import Loader from 'ui-component/Loader';
import subscriptionAPI from 'api/subscription.api';
import { subscriptionGateView, type RememberedAccess } from './subscriptionGate';

// ==============================|| AUTH GUARD ||============================== //

/**
 * Authentication guard for routes
 * @param {PropTypes.node} children children element/node
 */
export default function AuthGuard({ children }: GuardProps): React.ReactElement | null {
  const { isLoggedIn, isInitialized, mustChangePassword, currentRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // The last answer, remembered for the role it was given for. A re-check on
  // navigation updates it in the background; see subscriptionGate.ts for why
  // the app must stay mounted meanwhile.
  const [remembered, setRemembered] = useState<RememberedAccess | null>(null);
  const roleKey = currentRole?.id ? String(currentRole.id) : '';

  // Routes that are part of the pre-dashboard onboarding flow and must NOT be gated by the
  // subscription check (single source of truth for both the effect and the render below).
  const isSubscriptionRoute = ['/paymentplan', '/checkout/success', '/onboarding/branding'].includes(location.pathname);

  useEffect(() => {
    // Wait for initialization to complete before checking auth
    if (isInitialized && !isLoggedIn && !mustChangePassword) {
      navigate('/login', { replace: true });
    }
  }, [isLoggedIn, isInitialized, mustChangePassword, navigate]);

  useEffect(() => {
    if (!isInitialized || !isLoggedIn || mustChangePassword || isSubscriptionRoute) {
      setRemembered(null);
      return;
    }

    let cancelled = false;
    const checkAccess = async () => {
      try {
        const sub = await subscriptionAPI.checkSubscription();
        const status = String(sub.status || '').toLowerCase();
        const allowed = status === 'active' || status === 'trialing' || Boolean(sub.cancelAtPeriodEnd);
        if (!cancelled) {
          setRemembered({ roleKey, allowed });
          if (!allowed) {
            navigate('/paymentplan', { replace: true, state: { fromSubscriptionGate: true } });
          }
        }
      } catch {
        if (!cancelled) {
          setRemembered({ roleKey, allowed: false });
          navigate('/paymentplan', { replace: true, state: { fromSubscriptionGate: true } });
        }
      }
    };

    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [isInitialized, isLoggedIn, mustChangePassword, isSubscriptionRoute, location.pathname, navigate, roleKey]);

  // Show loading or nothing while initializing
  if (!isInitialized) {
    return <Loader />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // If user must change password, wrap with MustChangePasswordGuard
  if (mustChangePassword) {
    return <MustChangePasswordGuard>{children}</MustChangePasswordGuard>;
  }

  const gate = subscriptionGateView({ isSubscriptionRoute, remembered, roleKey });
  if (gate === 'loader') {
    return <Loader />;
  }
  if (gate === 'paymentplan') {
    return <Navigate to="/paymentplan" replace state={{ fromSubscriptionGate: true }} />;
  }

  // If logged in, wrap with MustChangePasswordGuard (for normal flow)
  if (isLoggedIn) {
    return <MustChangePasswordGuard>{children}</MustChangePasswordGuard>;
  }

  return <>{children}</>;
}
