import { createBrowserRouter } from 'react-router-dom';

// routes
import AuthenticationRoutes from './AuthenticationRoutes';
import LoginRoutes from './LoginRoutes';
import MainRoutes from './MainRoutes';
import RegistrationRoutes from './RegistrationRoutes';
import EmailVerificationRoutes from './EmailVerificationRoutes';
import InvitationRoutes from './InvitationRoutes';
import PublicRoutes from './PublicRoutes';

// error pages
import { Error404 } from 'views/pages/error';

// ==============================|| ROUTING RENDER ||============================== //

const router = createBrowserRouter(
  [
    EmailVerificationRoutes,
    InvitationRoutes,
    PublicRoutes,
    LoginRoutes,
    MainRoutes,
    RegistrationRoutes,
    AuthenticationRoutes,
    { path: '*', element: <Error404 /> }
  ],
  {
    basename: import.meta.env.VITE_APP_BASE_NAME
  }
);

export default router;
