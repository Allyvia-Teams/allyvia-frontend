import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

// project imports
import useAuth from 'hooks/useAuth';
import { GuardProps } from 'types';
import Loader from 'ui-component/Loader';

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

  // Show loading spinner while initializing
  if (!isInitialized) {
    return <Loader />;
  }

  return children;
}
