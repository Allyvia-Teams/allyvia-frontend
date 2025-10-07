// project imports
import MinimalLayout from 'layout/MinimalLayout';
import NavMotion from 'layout/NavMotion';

// Direct imports - no lazy loading for critical auth flows
import EmailVerified from 'views/pages/authentication/EmailVerified';

// ==============================|| EMAIL VERIFICATION ROUTING ||============================== //
// This route is NOT wrapped in GuestGuard to prevent redirect after email verification

const EmailVerificationRoutes = {
  path: '/',
  element: (
    <NavMotion>
      <MinimalLayout />
    </NavMotion>
  ),
  children: [
    {
      path: '/verify-email',
      element: <EmailVerified />
    }
  ]
};

export default EmailVerificationRoutes;
