// project imports
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import Loadable from 'ui-component/Loadable';
import MainLayout from 'layout/MainLayout';
import AuthGuard from 'utils/route-guard/AuthGuard';
import MemberGuard from './guards/memberGuard';
import CrmRedirect from './CrmRedirect';
import ImmersiveThemeProvider from 'views/inner-circle/ImmersiveThemeProvider';

// ALL-108 — every route below is code-split.
//
// They were all statically imported, and `Loadable` was used only in the auth
// routes. That meant analytics, the calendar, QuickBooks and the PDF generator
// all downloaded before the POS could paint — on shop wifi, at open-up, on the
// one screen a boutique cannot open the doors without. Nothing here changes
// what the routes render; it changes when their code arrives.
//
// Deliberately still eager: the layout, the guards, the redirect and the
// Inner Circle theme provider. They wrap other routes rather than being routes,
// and a Suspense boundary around a provider buys nothing.

const InventoryPage = Loadable(lazy(() => import('views/inventory')));
const StyleCatalogPage = Loadable(lazy(() => import('views/inventory/StyleCatalog')));
const AddStockPage = Loadable(lazy(() => import('views/inventory/AddStock')));
const InventoryLocationsPage = Loadable(lazy(() => import('views/inventory/Locations')));
const SuppliersPage = Loadable(lazy(() => import('views/inventory/Suppliers')));
const PurchaseOrdersPage = Loadable(lazy(() => import('views/inventory/PurchaseOrders')));
const PurchaseOrderEditorPage = Loadable(lazy(() => import('views/inventory/PurchaseOrderEditor')));
const TransfersPage = Loadable(lazy(() => import('views/inventory/Transfers')));
const TransferDetailPage = Loadable(lazy(() => import('views/inventory/TransferDetail')));
// NOTE the filename: StockCountList, not StockCounts. On a case-insensitive
// filesystem `StockCounts.tsx` and the `stockCounts.ts` logic module share one
// module path, and tsc drops the .tsx — the import would silently resolve to the
// logic module and fail with "no default export".
const StockCountListPage = Loadable(lazy(() => import('views/inventory/StockCountList')));
const StockCountEntryPage = Loadable(lazy(() => import('views/inventory/StockCountEntry')));
const StockCountReviewPage = Loadable(lazy(() => import('views/inventory/StockCountReview')));
const ReorderInboxPage = Loadable(lazy(() => import('views/inventory/ReorderInbox')));
const InventoryInsightsPage = Loadable(lazy(() => import('views/inventory/InventoryInsights')));
const QuickBooksPostingPage = Loadable(lazy(() => import('views/inventory/QuickBooksPosting')));
const QbPostingLogPage = Loadable(lazy(() => import('views/inventory/QbPostingLog')));
const FindSizePage = Loadable(lazy(() => import('views/inventory/FindSize')));
const SizeScaleSettingsPage = Loadable(lazy(() => import('views/inventory/SizeScaleSettings')));
const SchedulingPage = Loadable(lazy(() => import('views/scheduling/index')));
const VendorsPage = Loadable(lazy(() => import('views/vendors')));
const EmployeeManagementPage = Loadable(lazy(() => import('views/employees').then((m) => ({ default: m.EmployeeManagementPage }))));
const ClockInOutPage = Loadable(lazy(() => import('views/employees').then((m) => ({ default: m.ClockInOutPage }))));
const TimeApprovalPage = Loadable(lazy(() => import('views/employees').then((m) => ({ default: m.TimeApprovalPage }))));
const KioskLogin = Loadable(lazy(() => import('views/kiosk/KioskLogin')));
const MyProfile = Loadable(lazy(() => import('views/MyProfile')));
const PaymentPlanSelection = Loadable(lazy(() => import('views/subscription/PaymentPlanSelection')));
const CheckoutSuccessPage = Loadable(lazy(() => import('views/subscription/SuccessfulCheckout')));
const BrandingOnboarding = Loadable(lazy(() => import('views/subscription/BrandingOnboarding')));
const POSRoute = Loadable(lazy(() => import('features/pos/POSRoute')));
const RefundsPage = Loadable(lazy(() => import('features/pos/RefundsPage')));

// dashboard page routing
const DashboardPage = Loadable(lazy(() => import('views/dashboard')));
const InnerCirclePage = Loadable(lazy(() => import('views/inner-circle')));
const DocumentsPage = Loadable(lazy(() => import('views/documents')));
const AnalyticsPage = Loadable(lazy(() => import('views/analytics')));
const InsightsDashboard = Loadable(lazy(() => import('views/insights')));
const CalendarPage = Loadable(lazy(() => import('views/calendar')));
const FinancePage = Loadable(lazy(() => import('views/finance')));
const PlaygroundPage = Loadable(lazy(() => import('views/playground')));
const ExpensePage = Loadable(lazy(() => import('views/expense')));

// demo page routing
const RBACDemo = Loadable(lazy(() => import('views/demo/RBACDemo')));

// integrations routing
const QuickBooksPage = Loadable(lazy(() => import('views/integrations/QuickBooks')));
const XeroPage = Loadable(lazy(() => import('views/integrations/Xero')));
const BankIntegration = Loadable(lazy(() => import('views/integrations/Bank')));
const SquarePage = Loadable(lazy(() => import('views/integrations/Square')));
const SquareCallback = Loadable(lazy(() => import('views/integrations/SquareCallback')));
// POS data migration (the `integrations` Django app) — distinct from the
// QuickBooks/Square financial connectors above, which sync an ongoing ledger.
const PosIntegrationsHome = Loadable(lazy(() => import('views/pos-integrations')));
const PosConnectWizard = Loadable(lazy(() => import('views/pos-integrations/ConnectWizard')));
const PosMigrationProgress = Loadable(lazy(() => import('views/pos-integrations/MigrationProgress')));
const PosReconciliationReport = Loadable(lazy(() => import('views/pos-integrations/ReconciliationReport')));
const PosConnectionSettings = Loadable(lazy(() => import('views/pos-integrations/ConnectionSettings')));
const PosOAuthCallback = Loadable(lazy(() => import('views/pos-integrations/OAuthCallback')));
const SettingsPage = Loadable(lazy(() => import('views/settings')));
// Stripe Connect payments onboarding. The /return and /refresh paths are the
// backend's Account Link return_url / refresh_url (services._onboarding_urls,
// overridable via STRIPE_ONBOARDING_RETURN_PATH / _REFRESH_PATH) — keep them
// in sync with the backend settings.
const StripeOnboardingStatusPage = Loadable(lazy(() => import('views/settings/payments/StripeOnboardingStatus')));
const StripeOnboardingRefreshPage = Loadable(lazy(() => import('views/settings/payments/StripeOnboardingRefresh')));

// auth routing
const GoogleDriveCallback = Loadable(lazy(() => import('views/auth/GoogleDriveCallback')));

// ==============================|| MAIN ROUTING ||============================== //

const StorefrontOverview = Loadable(lazy(() => import('views/storefront/overview')));
const StorefrontBuilder = Loadable(lazy(() => import('views/storefront/builder')));
const StorefrontProducts = Loadable(lazy(() => import('views/storefront/products')));
const StorefrontDomains = Loadable(lazy(() => import('views/storefront/domains')));
const StorefrontOrders = Loadable(lazy(() => import('views/storefront/orders')));
const StorefrontSettings = Loadable(lazy(() => import('views/storefront/settings')));

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
        { path: '/storefront', element: <Navigate to="/storefront/overview" replace /> },
        { path: '/storefront/overview/*', element: <StorefrontOverview /> },
        { path: '/storefront/builder/*', element: <StorefrontBuilder /> },
        { path: '/storefront/products/*', element: <StorefrontProducts /> },
        { path: '/storefront/domains/*', element: <StorefrontDomains /> },
        { path: '/storefront/orders/*', element: <StorefrontOrders /> },
        { path: '/storefront/settings/*', element: <StorefrontSettings /> },
        { path: '/dashboard', element: <DashboardPage /> },
        { path: '/pos', element: <POSRoute /> },
        // Hangs off the `pos` module in memberGuard's MODULE_PATHS, not a
        // module of its own: `pos.refund` is a dotted ACTION key inside the
        // pos module server-side, not a separate grantable module.
        { path: '/refunds', element: <RefundsPage /> },
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
          element: <Navigate to="/inner-circle?tab=outreach" replace />
        },
        // Two doors, on purpose. The flat grid of every item lives at /inventory;
        // the style catalogue's size × colour matrices live at /inventory/styles.
        // /inventory/update is Add stock: scan barcode → qty → ledger adjust.
        { path: '/inventory', element: <InventoryPage /> },
        { path: '/inventory/styles', element: <StyleCatalogPage /> },
        { path: '/inventory/update', element: <AddStockPage /> },
        // The counter tool: "do you have this in a 32, and where?" — scan-first.
        { path: '/inventory/find', element: <FindSizePage /> },
        { path: '/inventory/locations', element: <InventoryLocationsPage /> },
        { path: '/inventory/size-scales', element: <SizeScaleSettingsPage /> },
        // Must match reorder.ts's REORDER_INBOX_PATH — the stockout strip and the
        // dashboard's restock recommendations build their links from it.
        { path: '/inventory/reorder', element: <ReorderInboxPage /> },
        { path: '/inventory/insights', element: <InventoryInsightsPage /> },
        // logHref is a prop rather than a hard-coded path inside the component,
        // so the route table stays the only place a path is decided.
        { path: '/inventory/quickbooks', element: <QuickBooksPostingPage logHref="/inventory/quickbooks/log" /> },
        { path: '/inventory/quickbooks/log', element: <QbPostingLogPage /> },
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
        // Integrations lives in Settings now (owner, 2026-09-11); the connector sub-routes stay.
        { path: '/integrations', element: <Navigate to="/settings?tab=integrations" replace /> },
        // Redirect old onboarding route to new settings tab location
        { path: '/onboarding', element: <Navigate to="/settings?tab=onboarding" replace /> },
        { path: '/integrations/quickbooks', element: <QuickBooksPage /> },
        { path: '/integrations/xero', element: <XeroPage /> },
        { path: '/integrations/bank', element: <BankIntegration /> },
        { path: '/integrations/square', element: <SquarePage /> },
        { path: '/integrations/square/callback', element: <SquareCallback /> },
        { path: '/integrations/pos', element: <PosIntegrationsHome /> },
        { path: '/integrations/pos/connect/:provider', element: <PosConnectWizard /> },
        // One redirect URL for every provider — the signed state says which
        // connection came back, so a per-provider route would buy nothing and
        // cost a registration in each provider's dashboard.
        { path: '/integrations/pos/callback', element: <PosOAuthCallback /> },
        { path: '/integrations/pos/runs/:runId', element: <PosMigrationProgress /> },
        { path: '/integrations/pos/runs/:runId/report', element: <PosReconciliationReport /> },
        { path: '/integrations/pos/connections/:connectionId', element: <PosConnectionSettings /> },
        { path: '/me', element: <MyProfile /> },
        { path: '/settings', element: <SettingsPage /> },
        { path: '/settings/payments/onboarding', element: <StripeOnboardingStatusPage /> },
        // Stripe redirects here when the hosted flow is completed or exited.
        { path: '/settings/payments/onboarding/return', element: <StripeOnboardingStatusPage /> },
        // Stripe redirects here when an Account Link is expired/already used.
        { path: '/settings/payments/onboarding/refresh', element: <StripeOnboardingRefreshPage /> },
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
          // Kiosk-safe lookup: same screen, search-only entry, no nav-out links.
          path: '/kiosk/find-size',
          element: (
            <MemberGuard>
              <FindSizePage kiosk />
            </MemberGuard>
          )
        },
        {
          // Owner-confirmed repoint (size-scales spec Part 3 #5): kiosk users get
          // the counter lookup, not the old flat table — "do we have it, and
          // where" is what floor staff actually need at this URL.
          path: '/kiosk/inventory',
          element: (
            <MemberGuard>
              <FindSizePage kiosk />
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
