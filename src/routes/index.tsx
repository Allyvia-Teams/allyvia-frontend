import { createBrowserRouter } from 'react-router-dom';

// routes
import AuthenticationRoutes from './AuthenticationRoutes';
import LoginRoutes from './LoginRoutes';
import MainRoutes from './MainRoutes';
import RegistrationRoutes from './RegistrationRoutes';

// ==============================|| ROUTING RENDER ||============================== //

const router = createBrowserRouter([LoginRoutes, MainRoutes, RegistrationRoutes, AuthenticationRoutes], {
  basename: import.meta.env.VITE_APP_BASE_NAME
});

export default router;
