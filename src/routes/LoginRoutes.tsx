// project imports
import { Navigate } from 'react-router-dom';
import GuestGuard from 'utils/route-guard/GuestGuard';
import MinimalLayout from 'layout/MinimalLayout';
import NavMotion from 'layout/NavMotion';

// Direct imports - no lazy loading for critical auth flows
import VerifyEmailPending from 'views/pages/authentication/VerifyEmailPending';
import ForgotPasswordSent from 'views/pages/authentication/ForgotPasswordSent';
import AuthChangePassword from 'views/pages/authentication/jwt/AuthChangePassword';

// login routing
import AuthLogin from 'views/pages/authentication/Login';
import GoogleCallback from 'views/pages/authentication/google/GoogleCallback';
import AuthForgotPassword from 'views/pages/authentication/ForgotPassword';
import AuthResetPassword from 'views/pages/authentication/ResetPassword';
import AuthCheckMail from 'views/pages/authentication/CheckMail';
import AuthCodeVerification from 'views/pages/authentication/CodeVerification';

// ==============================|| AUTH ROUTING ||============================== //

const LoginRoutes = {
  path: '/',
  element: (
    <NavMotion>
      <GuestGuard>
        <MinimalLayout />
      </GuestGuard>
    </NavMotion>
  ),
  children: [
    {
      index: true,
      element: <Navigate to="/login" replace />
    },
    {
      path: '/login',
      element: <AuthLogin />
    },
    {
      path: '/auth/callback/google',
      element: <GoogleCallback />
    },
    {
      path: '/forgot-password',
      element: <AuthForgotPassword />
    },
    {
      path: '/reset-password',
      element: <AuthResetPassword />
    },
    {
      path: '/check-mail',
      element: <AuthCheckMail />
    },
    {
      path: '/code-verification',
      element: <AuthCodeVerification />
    },
    {
      path: '/verify-email-pending',
      element: <VerifyEmailPending />
    },
    {
      path: '/forgot-password-sent',
      element: <ForgotPasswordSent />
    },
    {
      path: '/change-password',
      element: <AuthChangePassword />
    }
  ]
};

export default LoginRoutes;
