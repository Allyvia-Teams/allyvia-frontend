import { Navigate, useLocation, useNavigate } from 'react-router-dom';

// project imports
import useAuth from 'hooks/useAuth';
import { GuardProps } from 'types';
import { useEffect, useState } from 'react';
import MustChangePasswordGuard from './MustChangePasswordGuard';
import Loader from 'ui-component/Loader';
import subscriptionAPI from 'api/subscription.api';

// ==============================|| AUTH GUARD ||============================== //

/**
 * Authentication guard for routes
 * @param {PropTypes.node} children children element/node
 */
export default function AuthGuard({ children }: GuardProps): React.ReactElement | null {
  const { isLoggedIn, isInitialized, mustChangePassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [hasSubscriptionAccess, setHasSubscriptionAccess] = useState<boolean | null>(null);

  useEffect(() => {
    // Wait for initialization to complete before checking auth
    if (isInitialized && !isLoggedIn && !mustChangePassword) {
      navigate('/login', { replace: true });
    }
  }, [isLoggedIn, isInitialized, mustChangePassword, navigate]);

  useEffect(() => {
    const isSubscriptionRoute = location.pathname === '/paymentplan' || location.pathname === '/checkout/success';
    if (!isInitialized || !isLoggedIn || mustChangePassword || isSubscriptionRoute) {
      setHasSubscriptionAccess(null);
      return;
    }

    let cancelled = false;
    const checkAccess = async () => {
      setCheckingSubscription(true);
      try {
        const sub = await subscriptionAPI.checkSubscription();
        const status = String(sub.status || '').toLowerCase();
        const allowed = status === 'active' || status === 'trialing' || Boolean(sub.cancelAtPeriodEnd);
        if (!cancelled) {
          setHasSubscriptionAccess(allowed);
          if (!allowed) {
            navigate('/paymentplan', { replace: true, state: { fromSubscriptionGate: true } });
          }
        }
      } catch {
        if (!cancelled) {
          setHasSubscriptionAccess(false);
          navigate('/paymentplan', { replace: true, state: { fromSubscriptionGate: true } });
        }
      } finally {
        if (!cancelled) setCheckingSubscription(false);
      }
    };

    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [isInitialized, isLoggedIn, mustChangePassword, location.pathname, navigate]);

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

  const isSubscriptionRoute = location.pathname === '/paymentplan' || location.pathname === '/checkout/success';
  if (!isSubscriptionRoute && (checkingSubscription || hasSubscriptionAccess === null)) {
    return <Loader />;
  }
  if (!isSubscriptionRoute && hasSubscriptionAccess === false) {
    return <Navigate to="/paymentplan" replace state={{ fromSubscriptionGate: true }} />;
  }

  // If logged in, wrap with MustChangePasswordGuard (for normal flow)
  if (isLoggedIn) {
    return <MustChangePasswordGuard>{children}</MustChangePasswordGuard>;
  }

  return <>{children}</>;
}
