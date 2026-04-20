// project imports
import MinimalLayout from 'layout/MinimalLayout';
import NavMotion from 'layout/NavMotion';

// Direct imports - no lazy loading for critical auth flows
import AcceptInvitation from 'views/pages/authentication/AcceptInvitation';
import SetupPassword from 'views/pages/authentication/SetupPassword';

// ==============================|| INVITATION ROUTING ||============================== //
// These routes are NOT wrapped in GuestGuard so both logged-in and logged-out users
// can land here from invitation / password-setup emails.

const InvitationRoutes = {
  path: '/',
  element: (
    <NavMotion>
      <MinimalLayout />
    </NavMotion>
  ),
  children: [
    {
      path: '/invite/accept',
      element: <AcceptInvitation />
    },
    {
      path: '/setup-password',
      element: <SetupPassword />
    }
  ]
};

export default InvitationRoutes;
