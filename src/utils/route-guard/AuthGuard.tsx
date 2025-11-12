import { useNavigate } from 'react-router-dom';

// project imports
import useAuth from 'hooks/useAuth';
import { GuardProps } from 'types';
import { useEffect } from 'react';
import MustChangePasswordGuard from './MustChangePasswordGuard';

// ==============================|| AUTH GUARD ||============================== //

/**
 * Authentication guard for routes
 * @param {PropTypes.node} children children element/node
 */
export default function AuthGuard({ children }: GuardProps): React.ReactElement | null {
  const { isLoggedIn, isInitialized, mustChangePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for initialization to complete before checking auth
    if (isInitialized && !isLoggedIn && !mustChangePassword) {
      navigate('/login', { replace: true });
    }
  }, [isLoggedIn, isInitialized, mustChangePassword, navigate]);

  // Show loading or nothing while initializing
  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  // If user must change password, wrap with MustChangePasswordGuard
  if (mustChangePassword) {
    return <MustChangePasswordGuard>{children}</MustChangePasswordGuard>;
  }

  // If logged in, wrap with MustChangePasswordGuard (for normal flow)
  if (isLoggedIn) {
    return <MustChangePasswordGuard>{children}</MustChangePasswordGuard>;
  }

  return <>{children}</>;
}
