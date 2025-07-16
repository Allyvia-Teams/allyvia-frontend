import { lazy } from 'react';

// project imports
import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';
import AuthGuard from 'utils/route-guard/AuthGuard';
import UnderConstruction from 'views/pages/maintenance/UnderConstruction';

// dashboard page routing
const DashboardPage = Loadable(lazy(() => import('views/dashboard')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/',
  element: (
    <AuthGuard>
      <MainLayout />
    </AuthGuard>
  ),
  children: [
    { path: '/dashboard', element: <DashboardPage /> },
    { path: '/finance', element: <UnderConstruction /> },
    { path: '/employees', element: <UnderConstruction /> },
    { path: '/crm', element: <UnderConstruction /> },
    { path: '/community', element: <UnderConstruction /> },
    { path: '/inventory', element: <UnderConstruction /> },
    { path: '/documents', element: <UnderConstruction /> },
    { path: '/analytics', element: <UnderConstruction /> },
    { path: '/marketing', element: <UnderConstruction /> }
  ]
};

export default MainRoutes;
