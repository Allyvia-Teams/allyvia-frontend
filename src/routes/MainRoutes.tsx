import { lazy } from 'react';

// project imports
import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';
import AuthGuard from 'utils/route-guard/AuthGuard';
import UnderConstruction from 'views/pages/maintenance/UnderConstruction';
import { InventoryMock } from 'views/inventory/InventoryMock';
import EmployeesPageMock from 'views/employees/EmployeesMock';
import RegisterCompany from 'views/pages/authentication/RegisterCompany';

// dashboard page routing
const DashboardPage = Loadable(lazy(() => import('views/dashboard')));
const CRMPage = Loadable(lazy(() => import('views/crm')));
const DocumentsPage = Loadable(lazy(() => import('views/documents')));
const AnalyticsPage = Loadable(lazy(() => import('views/analytics')));
const CalendarPage = Loadable(lazy(() => import('views/calendar')));

// integrations page routing
const IntegrationsPage = Loadable(lazy(() => import('views/integrations')));
const SquareIntegration = Loadable(lazy(() => import('views/integrations/Square')));

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
    { path: '/employees', element: <EmployeesPageMock /> },
    { path: '/crm', element: <CRMPage /> },
    { path: '/community', element: <UnderConstruction /> },
    { path: '/inventory', element: <InventoryMock /> },
    { path: '/documents', element: <DocumentsPage /> },
    { path: '/analytics', element: <AnalyticsPage /> },
    { path: '/calendar', element: <CalendarPage /> },
    { path: '/marketing', element: <UnderConstruction /> },
    { path: '/register-company', element: <RegisterCompany /> },
    { path: '/integrations', element: <IntegrationsPage /> },
    { path: '/integrations/square', element: <SquareIntegration /> }
  ]
};

export default MainRoutes;
