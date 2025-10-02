import { lazy } from 'react';

// project imports
import GuestGuard from 'utils/route-guard/GuestGuard';
import MinimalLayout from 'layout/MinimalLayout';
import NavMotion from 'layout/NavMotion';
import Loadable from 'ui-component/Loadable';

// Direct imports - no lazy loading for critical auth flows
import EmailVerified from 'views/pages/authentication/EmailVerified';
import VerifyEmailPending from 'views/pages/authentication/VerifyEmailPending';
import ForgotPasswordSent from 'views/pages/authentication/ForgotPasswordSent';

// login routing
const AuthLogin = Loadable(lazy(() => import('views/pages/authentication/Login')));
const GoogleCallback = Loadable(lazy(() => import('views/pages/authentication/google/GoogleCallback')));
const AuthForgotPassword = Loadable(lazy(() => import('views/pages/authentication/ForgotPassword')));
const AuthResetPassword = Loadable(lazy(() => import('views/pages/authentication/ResetPassword')));
const AuthCheckMail = Loadable(lazy(() => import('views/pages/authentication/CheckMail')));
const AuthCodeVerification = Loadable(lazy(() => import('views/pages/authentication/CodeVerification')));

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
      path: '/',
      element: <AuthLogin />
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
      path: '/verify-email',
      element: <EmailVerified />
    },
    {
      path: '/forgot-password-sent',
      element: <ForgotPasswordSent />
    }
  ]
};

export default LoginRoutes;
