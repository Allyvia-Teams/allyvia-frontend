import { createBrowserRouter } from 'react-router-dom';

// routes
import AuthenticationRoutes from './AuthenticationRoutes';
import LoginRoutes from './LoginRoutes';
import MainRoutes from './MainRoutes';
import RegistrationRoutes from './RegistrationRoutes';

// error pages
import { Error404 } from 'views/pages/error';

// ==============================|| ROUTING RENDER ||============================== //

const router = createBrowserRouter(
  [LoginRoutes, MainRoutes, RegistrationRoutes, AuthenticationRoutes, { path: '*', element: <Error404 /> }],
  {
    basename: import.meta.env.VITE_APP_BASE_NAME
  }
);

export default router;
