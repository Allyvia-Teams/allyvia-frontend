import { useNavigate } from 'react-router-dom';

// project imports
import useAuth from 'hooks/useAuth';
import { GuardProps } from 'types';
import { useEffect } from 'react';

// ==============================|| AUTH GUARD ||============================== //

/**
 * Authentication guard for routes
 * @param {PropTypes.node} children children element/node
 */
export default function AuthGuard({ children }: GuardProps) {
  const { isLoggedIn, isInitialized } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for initialization to complete before checking auth
    if (isInitialized && !isLoggedIn) {
      navigate('/login', { replace: true });
    }
  }, [isLoggedIn, isInitialized, navigate]);

  // Show loading or nothing while initializing
  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  return children;
}
