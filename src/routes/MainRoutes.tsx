import { lazy } from 'react';

// project imports
import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';
import AuthGuard from 'utils/route-guard/AuthGuard';
import UnderConstruction from 'views/pages/maintenance/UnderConstruction';
import { InventoryMock } from 'views/inventory/InventoryMock';
import EmployeeManagementPage from 'views/employee';
import RegisterCompany from 'views/pages/authentication/RegisterCompany';
import MyProfile from 'views/MyProfile';

// dashboard page routing
const DashboardPage = Loadable(lazy(() => import('views/dashboard')));
const CRMPage = Loadable(lazy(() => import('views/crm')));
const DocumentsPage = Loadable(lazy(() => import('views/documents')));
const AnalyticsPage = Loadable(lazy(() => import('views/analytics')));
const CalendarPage = Loadable(lazy(() => import('views/calendar')));
const FinancePage = Loadable(lazy(() => import('views/finance')));

// demo page routing
const RBACDemo = Loadable(lazy(() => import('views/demo/RBACDemo')));

// company page routing
const CompanyPage = Loadable(lazy(() => import('views/company')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/',
  element: (
    <AuthGuard>
      <MainLayout />
    </AuthGuard>
  ),
  children: [
    { path: '/', element: <DashboardPage /> },
    { path: '/dashboard', element: <DashboardPage /> },
    { path: '/companies', element: <CompanyPage /> },
    { path: '/demo', element: <RBACDemo /> },
    { path: '/finance', element: <FinancePage /> },
    { path: '/employees', element: <EmployeeManagementPage /> },
    { path: '/crm', element: <CRMPage /> },
    { path: '/community', element: <UnderConstruction /> },
    { path: '/inventory', element: <InventoryMock /> },
    { path: '/documents', element: <DocumentsPage /> },
    { path: '/analytics', element: <AnalyticsPage /> },
    { path: '/calendar', element: <CalendarPage /> },
    { path: '/marketing', element: <UnderConstruction /> },
    { path: '/register-company', element: <RegisterCompany /> },
    { path: '/me', element: <MyProfile /> }
  ]
};

export default MainRoutes;
