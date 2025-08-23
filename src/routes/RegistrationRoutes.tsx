import { lazy } from 'react';

import MinimalLayout from 'layout/MinimalLayout';
import NavMotion from 'layout/NavMotion';
import Loadable from 'ui-component/Loadable';
import GuestGuard from 'utils/route-guard/GuestGuard';

const AuthRegister = Loadable(lazy(() => import('views/pages/authentication/Register')));

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
