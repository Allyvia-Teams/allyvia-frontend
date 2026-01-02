import { lazy } from 'react';

import Loadable from 'ui-component/Loadable';
import MainLayout from 'layout/MainLayout';
import AuthGuard from 'utils/route-guard/AuthGuard';
import InventoryPage from 'views/inventory/index';
import UpdateInventoryPage from 'views/inventory/UpdateInventory';
import { EmployeeManagementPage, ClockInOutPage } from 'views/employees';
import MemberGuard from './guards/memberGuard';
import SubscriptionGuard from './guards/SubscriptionGuard';
import { Unauthorized as UnauthorizedPage } from 'views/pages/error';
import { buildRoutes } from 'registry/builders';
import InventoryPage from 'views/inventory/index';
import { ClockInOutPage } from 'views/employees';

// Lazy load components
const DashboardPage = Loadable(lazy(() => import('views/dashboard')));
const KioskLogin = Loadable(lazy(() => import('views/kiosk/KioskLogin')));
const PaymentPlanSelection = Loadable(lazy(() => import('views/subscription/PaymentPlanSelection')));
const CheckoutSuccessPage = Loadable(lazy(() => import('views/subscription/SuccessfulCheckout')));
// dashboard page routing
import DashboardPage from 'views/dashboard';
import CRMPage from 'views/crm';
import DocumentsPage from 'views/documents';
import AnalyticsPage from 'views/analytics';
import InsightsDashboard from 'views/insights';
import CalendarPage from 'views/calendar';
import FinancePage from 'views/finance';
import PlaygroundPage from 'views/playground';
import ExpensePage from 'views/expense';

// demo page routing
import RBACDemo from 'views/demo/RBACDemo';

// integrations routing
import IntegrationsPage from 'views/integrations';
import QuickBooksPage from 'views/integrations/QuickBooks';
import SquarePage from 'views/integrations/Square';
import SquareCallback from 'views/integrations/SquareCallback';

// auth routing
import GoogleDriveCallback from 'views/auth/GoogleDriveCallback';

// ==============================|| MAIN ROUTING ||============================== //
const registryRoutes = buildRoutes();

// Special routes that need custom handling
const specialRoutes = [
  // Dashboard root path (also handled by config, but we keep explicit for clarity)
  { path: '/', element: <DashboardPage /> },

  // Kiosk mode routes
  { path: '/kiosk/login', element: <KioskLogin /> },
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
];

const MainRoutes = {
  path: '/',
  children: [
    {
      path: '/',
      element: (
        <AuthGuard>
          <SubscriptionGuard>
            <MemberGuard>
              <MainLayout />
            </MemberGuard>
          </SubscriptionGuard>
        </AuthGuard>
      ),
      children: [
        ...specialRoutes,
        // Routes generated from unified registry
        ...registryRoutes
        { path: '/', element: <DashboardPage /> },
        { path: '/dashboard', element: <DashboardPage /> },
        { path: '/demo', element: <RBACDemo /> },
        { path: '/finance', element: <FinancePage /> },
        { path: '/expense/bills', element: <ExpensePage /> },
        { path: '/employees', element: <EmployeeManagementPage /> },
        { path: '/crm', element: <CRMPage /> },
        { path: '/inventory', element: <InventoryPage /> },
        { path: '/inventory/update', element: <UpdateInventoryPage /> },
        { path: '/documents', element: <DocumentsPage /> },
        { path: '/analytics', element: <AnalyticsPage /> },
        { path: '/insights', element: <InsightsDashboard /> },
        { path: '/calendar', element: <CalendarPage /> },
        { path: '/playground', element: <PlaygroundPage /> },
        { path: '/integrations', element: <IntegrationsPage /> },
        { path: '/integrations/quickbooks', element: <QuickBooksPage /> },
        { path: '/integrations/square', element: <SquarePage /> },
        { path: '/integrations/square/callback', element: <SquareCallback /> },
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
      path: '/payment-plan',
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
    },
    {
      path: '/403',
      element: <UnauthorizedPage />
    }
  ]
};

export default MainRoutes;
