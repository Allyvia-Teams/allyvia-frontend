import { lazy } from 'react';

import MinimalLayout from 'layout/MinimalLayout';
import NavMotion from 'layout/NavMotion';
import Loadable from 'ui-component/Loadable';

const AuthRegister = Loadable(lazy(() => import('views/pages/authentication/Register')));

const RegistrationRoutes = {
  path: '/',
  element: (
    <NavMotion>
      <MinimalLayout />
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
