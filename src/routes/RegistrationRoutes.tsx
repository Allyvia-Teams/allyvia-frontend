import MinimalLayout from 'layout/MinimalLayout';
import NavMotion from 'layout/NavMotion';
import GuestGuard from 'utils/route-guard/GuestGuard';
import AuthRegister from 'views/pages/authentication/Register';

const RegistrationRoutes = {
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
      path: '/register',
      element: <AuthRegister />
    }
  ]
};

export default RegistrationRoutes;
