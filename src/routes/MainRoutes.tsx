import { lazy } from 'react';

// project imports
import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';
import AuthGuard from 'utils/route-guard/AuthGuard';
import UnderConstruction from 'views/pages/maintenance/UnderConstruction';
import InventoryPage from 'views/inventory/index';
import UpdateInventoryPage from 'views/inventory/UpdateInventory';
import { EmployeeManagementPage, ClockInOutPage } from 'views/employees';
import MemberGuard from './guards/memberGuard';
import KioskLogin from 'views/kiosk/KioskLogin';
import KioskShell from 'views/kiosk/KioskShell';
import MyProfile from 'views/MyProfile';
import PaymentPlanSelection from 'views/subscription/PaymentPlanSelection';
import CheckoutSuccessPage from 'views/subscription/SuccessfulCheckout';

// dashboard page routing
const DashboardPage = Loadable(lazy(() => import('views/dashboard')));
const CRMPage = Loadable(lazy(() => import('views/crm')));
const DocumentsPage = Loadable(lazy(() => import('views/documents')));
const AnalyticsPage = Loadable(lazy(() => import('views/analytics')));
const CalendarPage = Loadable(lazy(() => import('views/calendar')));
const FinancePage = Loadable(lazy(() => import('views/finance')));
const PlaygroundPage = Loadable(lazy(() => import('views/playground')));
const ExpensePage = Loadable(lazy(() => import('views/expense')));

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
  children: [
    {
      path: '/',
      element: (
        <AuthGuard>
          <MemberGuard>
            <MainLayout />
          </MemberGuard>
        </AuthGuard>
      ),
      children: [
        { path: '/', element: <DashboardPage /> },
        { path: '/dashboard', element: <DashboardPage /> },
        { path: '/demo', element: <RBACDemo /> },
        { path: '/finance', element: <FinancePage /> },
        { path: '/expense/bills', element: <ExpensePage /> },
        { path: '/employees', element: <EmployeeManagementPage /> },
        { path: '/crm', element: <CRMPage /> },
        { path: '/community', element: <UnderConstruction /> },
        { path: '/inventory', element: <InventoryPage /> },
        { path: '/inventory/update', element: <UpdateInventoryPage /> },
        { path: '/documents', element: <DocumentsPage /> },
        { path: '/analytics', element: <AnalyticsPage /> },
        { path: '/calendar', element: <CalendarPage /> },
        { path: '/marketing', element: <UnderConstruction /> },
        { path: '/playground', element: <PlaygroundPage /> },
        { path: '/integrations', element: <IntegrationsPage /> },
        { path: '/integrations/quickbooks', element: <QuickBooksPage /> },
        { path: '/me', element: <MyProfile /> },
        { path: '/employees/clock', element: <ClockInOutPage /> },
        { path: '/auth/google-drive/callback', element: <GoogleDriveCallback /> },
        // Kiosk mode routes
        { path: '/kiosk/login', element: <KioskLogin /> },
        // Redirect bare kiosk path to clock directly (no intermediate shell page)
        { path: '/kiosk', element: <ClockInOutPage /> },
        {
          path: '/kiosk/clock',
          element: (
            <MemberGuard>
              <ClockInOutPage />
            </MemberGuard>
          )
        },
        {
          path: '/kiosk/inventory',
          element: (
            <MemberGuard>
              <InventoryPage />
            </MemberGuard>
          )
        }
      ]
    },
    {
      path: '/paymentplan',
      element: (
        <AuthGuard>
          <PaymentPlanSelection />
        </AuthGuard>
      )
    },
    {
      path: '/checkout/success',
      element: (
        <AuthGuard>
          <CheckoutSuccessPage />
        </AuthGuard>
      )
    }
  ]
};

export default MainRoutes;
