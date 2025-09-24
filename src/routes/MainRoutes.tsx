import { lazy } from 'react';

// project imports
import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';
import AuthGuard from 'utils/route-guard/AuthGuard';
import UnderConstruction from 'views/pages/maintenance/UnderConstruction';
import InventoryPage from 'views/inventory/index';
import { EmployeeManagementPage, ClockInOutPage } from 'views/employees';
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

// integrations routing
const IntegrationsPage = Loadable(lazy(() => import('views/integrations')));
const QuickBooksPage = Loadable(lazy(() => import('views/integrations/QuickBooks')));

// auth routing
const GoogleDriveCallback = Loadable(lazy(() => import('views/auth/GoogleDriveCallback')));

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
    { path: '/demo', element: <RBACDemo /> },
    { path: '/finance', element: <FinancePage /> },
    { path: '/employees', element: <EmployeeManagementPage /> },
    { path: '/crm', element: <CRMPage /> },
    { path: '/community', element: <UnderConstruction /> },
    { path: '/inventory', element: <InventoryPage /> },
    { path: '/documents', element: <DocumentsPage /> },
    { path: '/analytics', element: <AnalyticsPage /> },
    { path: '/calendar', element: <CalendarPage /> },
    { path: '/marketing', element: <UnderConstruction /> },
    { path: '/integrations', element: <IntegrationsPage /> },
    { path: '/integrations/quickbooks', element: <QuickBooksPage /> },
    { path: '/me', element: <MyProfile /> },
    { path: '/auth/google-drive/callback', element: <GoogleDriveCallback /> },
    { path: '/employees/clock', element: <ClockInOutPage /> }
  ]
};

export default MainRoutes;
