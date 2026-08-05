// project imports
import MainLayout from 'layout/MainLayout';
import AuthGuard from 'utils/route-guard/AuthGuard';
import InventoryPage from 'views/inventory/index';
import UpdateInventoryPage from 'views/inventory/UpdateInventory';
import StyleCatalogPage from 'views/inventory/StyleCatalog';
import InventoryLocationsPage from 'views/inventory/Locations';
import SuppliersPage from 'views/inventory/Suppliers';
import PurchaseOrdersPage from 'views/inventory/PurchaseOrders';
import PurchaseOrderEditorPage from 'views/inventory/PurchaseOrderEditor';
import TransfersPage from 'views/inventory/Transfers';
import TransferDetailPage from 'views/inventory/TransferDetail';
// NOTE the filename: StockCountList, not StockCounts. On a case-insensitive
// filesystem `StockCounts.tsx` and the `stockCounts.ts` logic module share one
// module path, and tsc drops the .tsx — the import would silently resolve to the
// logic module and fail with "no default export".
import StockCountListPage from 'views/inventory/StockCountList';
import StockCountEntryPage from 'views/inventory/StockCountEntry';
import StockCountReviewPage from 'views/inventory/StockCountReview';
import SchedulingPage from 'views/scheduling/index';
import VendorsPage from 'views/vendors';
import { EmployeeManagementPage, ClockInOutPage, TimeApprovalPage } from 'views/employees';
import MemberGuard from './guards/memberGuard';
import KioskLogin from 'views/kiosk/KioskLogin';
import MyProfile from 'views/MyProfile';
import PaymentPlanSelection from 'views/subscription/PaymentPlanSelection';
import CheckoutSuccessPage from 'views/subscription/SuccessfulCheckout';
import BrandingOnboarding from 'views/subscription/BrandingOnboarding';
import POSRoute from 'features/pos/POSRoute';

// dashboard page routing
import DashboardPage from 'views/dashboard';
import CrmRedirect from './CrmRedirect';
import InnerCirclePage from 'views/inner-circle';
import SurveyDraftsPage from 'views/inner-circle/SurveyDraftsPage';
import ImmersiveThemeProvider from 'views/inner-circle/ImmersiveThemeProvider';
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
import OnboardingWizardPage from 'views/onboarding';
import QuickBooksPage from 'views/integrations/QuickBooks';
import SquarePage from 'views/integrations/Square';
import SquareCallback from 'views/integrations/SquareCallback';
import SettingsPage from 'views/settings';

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
        { path: '/pos', element: <POSRoute /> },
        { path: '/demo', element: <RBACDemo /> },
        { path: '/finance', element: <FinancePage /> },
        { path: '/expense/bills', element: <ExpensePage /> },
        { path: '/employees', element: <EmployeeManagementPage /> },
        { path: '/crm', element: <CrmRedirect /> },
        {
          path: '/inner-circle',
          element: (
            <ImmersiveThemeProvider>
              <InnerCirclePage />
            </ImmersiveThemeProvider>
          )
        },
        {
          path: '/inner-circle/surveys/drafts',
          element: (
            <ImmersiveThemeProvider>
              <SurveyDraftsPage />
            </ImmersiveThemeProvider>
          )
        },
        { path: '/inventory', element: <InventoryPage /> },
        { path: '/inventory/update', element: <UpdateInventoryPage /> },
        { path: '/inventory/styles', element: <StyleCatalogPage /> },
        { path: '/inventory/locations', element: <InventoryLocationsPage /> },
        { path: '/inventory/suppliers', element: <SuppliersPage /> },
        { path: '/inventory/purchase-orders', element: <PurchaseOrdersPage /> },
        // 'new' and a uuid are the same component: it serves a fresh draft, an
        // editable draft and a read-only order, chosen from the PO's status.
        // Session 8's reorder inbox deep-links straight to the uuid form.
        { path: '/inventory/purchase-orders/new', element: <PurchaseOrderEditorPage /> },
        { path: '/inventory/purchase-orders/:purchaseOrderId', element: <PurchaseOrderEditorPage /> },
        { path: '/inventory/transfers', element: <TransfersPage /> },
        // Transfers owns 'new' (and ?edit=<uuid>); TransferDetail owns a real id.
        { path: '/inventory/transfers/new', element: <TransfersPage /> },
        { path: '/inventory/transfers/:transferId', element: <TransferDetailPage /> },
        { path: '/inventory/stock-counts', element: <StockCountListPage /> },
        { path: '/inventory/stock-counts/new', element: <StockCountListPage /> },
        { path: '/inventory/stock-counts/:stockCountId', element: <StockCountEntryPage /> },
        { path: '/inventory/stock-counts/:stockCountId/review', element: <StockCountReviewPage /> },
        { path: '/scheduling', element: <SchedulingPage /> },
        { path: '/vendors', element: <VendorsPage /> },
        { path: '/documents', element: <DocumentsPage /> },
        { path: '/analytics', element: <AnalyticsPage /> },
        { path: '/insights', element: <InsightsDashboard /> },
        { path: '/calendar', element: <CalendarPage /> },
        { path: '/playground', element: <PlaygroundPage /> },
        { path: '/integrations', element: <IntegrationsPage /> },
        // Exact path only — /onboarding/branding (below, outside MainLayout) must keep resolving separately.
        { path: '/onboarding', element: <OnboardingWizardPage /> },
        { path: '/integrations/quickbooks', element: <QuickBooksPage /> },
        { path: '/integrations/square', element: <SquarePage /> },
        { path: '/integrations/square/callback', element: <SquareCallback /> },
        { path: '/me', element: <MyProfile /> },
        { path: '/settings', element: <SettingsPage /> },
        { path: '/employees/clock', element: <ClockInOutPage /> },
        { path: '/employees/time-approval', element: <TimeApprovalPage /> },
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
    },
    {
      // Optional post-checkout "Make it yours" branding step (full-screen, outside MainLayout).
      path: '/onboarding/branding',
      element: (
        <AuthGuard>
          <BrandingOnboarding />
        </AuthGuard>
      )
    }
  ]
};

export default MainRoutes;
