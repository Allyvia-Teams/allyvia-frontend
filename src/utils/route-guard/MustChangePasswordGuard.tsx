import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

interface MustChangePasswordGuardProps {
  children: React.ReactNode;
}

/**
 * Guard component that redirects users to change password page
 * if they have the must_change_password flag set to true
 */
export default function MustChangePasswordGuard({ children }: MustChangePasswordGuardProps) {
  const { mustChangePassword, isLoggedIn } = useSelector((state) => state.auth);
  const location = useLocation();
  const dispatch = useDispatch();

  // Show snackbar when redirecting to change password
  useEffect(() => {
    if (mustChangePassword && location.pathname !== '/change-password') {
      dispatch(
        openSnackbar({
          open: true,
          message: 'Please change your password before continuing.',
          variant: 'alert',
          alert: {
            color: 'warning'
          },
          anchorOrigin: {
            vertical: 'top',
            horizontal: 'right'
          },
          close: true
        })
      );
    }
  }, [mustChangePassword, location.pathname, dispatch]);

  // If user must change password and is not already on the change password page
  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // If user is on change password page but doesn't need to change password
  if (location.pathname === '/change-password' && !mustChangePassword) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
