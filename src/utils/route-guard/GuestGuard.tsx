import { useNavigate } from 'react-router-dom';

// project imports
import useAuth from 'hooks/useAuth';
import { DASHBOARD_PATH } from 'config';
import { GuardProps } from 'types';
import { useEffect } from 'react';

// ==============================|| GUEST GUARD ||============================== //

/**
 * Guest guard for routes having no auth required
 * @param {PropTypes.node} children children element/node
 */

export default function GuestGuard({ children }: GuardProps) {
  const { isLoggedIn, mustChangePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user must change password, redirect to change password page
    if (mustChangePassword) {
      navigate('/change-password', { replace: true });
    }
    // If user is logged in and doesn't need to change password, redirect to dashboard
    else if (isLoggedIn) {
      navigate(DASHBOARD_PATH, { replace: true });
    }
  }, [isLoggedIn, mustChangePassword, navigate]);

  return children;
}
