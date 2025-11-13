import { createBrowserRouter } from 'react-router-dom';

// routes
import AuthenticationRoutes from './AuthenticationRoutes';
import LoginRoutes from './LoginRoutes';
import MainRoutes from './MainRoutes';
import RegistrationRoutes from './RegistrationRoutes';
import EmailVerificationRoutes from './EmailVerificationRoutes';

// error pages
import { Error404 } from 'views/pages/error';

// ==============================|| ROUTING RENDER ||============================== //

const routes = [
  LoginRoutes,
  MainRoutes,
  RegistrationRoutes,
  AuthenticationRoutes,
  EmailVerificationRoutes,
  { path: '*', element: <Error404 /> }
];

const router = createBrowserRouter(routes, {
  basename: import.meta.env.VITE_APP_BASE_NAME
});

export default router;
