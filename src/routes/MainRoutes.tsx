import { lazy } from 'react';

// project imports
import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';
import AuthGuard from 'utils/route-guard/AuthGuard';
import UnderConstruction from 'views/pages/maintenance/UnderConstruction';
import { InventoryMock } from 'views/inventory/InventoryMock';
import EmployeesPageMock from 'views/employees/EmployeesMock';

// dashboard page routing
const DashboardPage = Loadable(lazy(() => import('views/dashboard')));
const CRMPage = Loadable(lazy(() => import('views/crm')));
const DocumentsPage = Loadable(lazy(() => import('views/documents')));

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
    { path: '/analytics', element: <UnderConstruction /> },
    { path: '/marketing', element: <UnderConstruction /> }
  ]
};

export default MainRoutes;
