// project imports
import MainLayout from 'layout/MainLayout';
import AuthGuard from 'utils/route-guard/AuthGuard';
import InventoryPage from 'views/inventory/index';
import UpdateInventoryPage from 'views/inventory/UpdateInventory';
import { EmployeeManagementPage, ClockInOutPage } from 'views/employees';
import MemberGuard from './guards/memberGuard';
import KioskLogin from 'views/kiosk/KioskLogin';
import MyProfile from 'views/MyProfile';
import PaymentPlanSelection from 'views/subscription/PaymentPlanSelection';
import CheckoutSuccessPage from 'views/subscription/SuccessfulCheckout';

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

// auth routing
import GoogleDriveCallback from 'views/auth/GoogleDriveCallback';

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
        { path: '/inventory', element: <InventoryPage /> },
        { path: '/inventory/update', element: <UpdateInventoryPage /> },
        { path: '/documents', element: <DocumentsPage /> },
        { path: '/analytics', element: <AnalyticsPage /> },
        { path: '/insights', element: <InsightsDashboard /> },
        { path: '/calendar', element: <CalendarPage /> },
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
