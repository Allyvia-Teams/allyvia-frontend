import { createBrowserRouter } from 'react-router-dom';

// routes
import AuthenticationRoutes from './AuthenticationRoutes';
import LoginRoutes from './LoginRoutes';
import MainRoutes from './MainRoutes';
import RegistrationRoutes from './RegistrationRoutes';
import EmailVerificationRoutes from './EmailVerificationRoutes';

// ==============================|| ROUTING RENDER ||============================== //

const router = createBrowserRouter([LoginRoutes, MainRoutes, RegistrationRoutes, AuthenticationRoutes, EmailVerificationRoutes], {
  basename: import.meta.env.VITE_APP_BASE_NAME
});

export default router;
