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
//
// NOTE the StockCountList filename below: not StockCounts. On a
// case-insensitive filesystem `StockCounts.tsx` and the `stockCounts.ts` logic
// module share one module path and tsc drops the .tsx, so the import would
// silently resolve to the logic module and fail with "no default export".

const InventoryPage = Loadable(lazy(() => import('views/inventory')));
const StyleCatalogPage = Loadable(lazy(() => import('views/inventory/StyleCatalog')));
const InventoryLocationsPage = Loadable(lazy(() => import('views/inventory/Locations')));
const SuppliersPage = Loadable(lazy(() => import('views/inventory/Suppliers')));
const PurchaseOrdersPage = Loadable(lazy(() => import('views/inventory/PurchaseOrders')));
const PurchaseOrderEditorPage = Loadable(lazy(() => import('views/inventory/PurchaseOrderEditor')));
const TransfersPage = Loadable(lazy(() => import('views/inventory/Transfers')));
const TransferDetailPage = Loadable(lazy(() => import('views/inventory/TransferDetail')));
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
const DashboardPage = Loadable(lazy(() => import('views/dashboard')));
const InnerCirclePage = Loadable(lazy(() => import('views/inner-circle')));
const SurveyDraftsPage = Loadable(lazy(() => import('views/inner-circle/SurveyDraftsPage')));
const DocumentsPage = Loadable(lazy(() => import('views/documents')));
const AnalyticsPage = Loadable(lazy(() => import('views/analytics')));
const InsightsDashboard = Loadable(lazy(() => import('views/insights')));
const CalendarPage = Loadable(lazy(() => import('views/calendar')));
const FinancePage = Loadable(lazy(() => import('views/finance')));
const PlaygroundPage = Loadable(lazy(() => import('views/playground')));
const ExpensePage = Loadable(lazy(() => import('views/expense')));
const RBACDemo = Loadable(lazy(() => import('views/demo/RBACDemo')));
const IntegrationsPage = Loadable(lazy(() => import('views/integrations')));
const OnboardingWizardPage = Loadable(lazy(() => import('views/onboarding')));
const QuickBooksPage = Loadable(lazy(() => import('views/integrations/QuickBooks')));
const SquarePage = Loadable(lazy(() => import('views/integrations/Square')));
const SquareCallback = Loadable(lazy(() => import('views/integrations/SquareCallback')));
const PosIntegrationsHome = Loadable(lazy(() => import('views/pos-integrations')));
const PosConnectWizard = Loadable(lazy(() => import('views/pos-integrations/ConnectWizard')));
const PosMigrationProgress = Loadable(lazy(() => import('views/pos-integrations/MigrationProgress')));
const PosReconciliationReport = Loadable(lazy(() => import('views/pos-integrations/ReconciliationReport')));
const PosConnectionSettings = Loadable(lazy(() => import('views/pos-integrations/ConnectionSettings')));
const PosOAuthCallback = Loadable(lazy(() => import('views/pos-integrations/OAuthCallback')));
const SettingsPage = Loadable(lazy(() => import('views/settings')));
const StripeOnboardingStatusPage = Loadable(lazy(() => import('views/settings/payments/StripeOnboardingStatus')));
const StripeOnboardingRefreshPage = Loadable(lazy(() => import('views/settings/payments/StripeOnboardingRefresh')));
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
        // Two doors, on purpose. Session C folded the flat item table into the
        // catalogue and deleted it; the flat grid is back at /inventory by owner
        // request — it is the screen for "every item and all its fields, search,
        // edit, delete". The catalogue keeps the size × colour matrix work at
        // /inventory/styles. /inventory/update stays a redirect: its barcode →
        // direct quantity PATCH is the ledger-blind write that is deliberately
        // not coming back.
        { path: '/inventory', element: <InventoryPage /> },
        { path: '/inventory/styles', element: <StyleCatalogPage /> },
        { path: '/inventory/update', element: <Navigate to="/inventory" replace /> },
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
        { path: '/integrations', element: <IntegrationsPage /> },
        // Exact path only — /onboarding/branding (below, outside MainLayout) must keep resolving separately.
        { path: '/onboarding', element: <OnboardingWizardPage /> },
        { path: '/integrations/quickbooks', element: <QuickBooksPage /> },
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
