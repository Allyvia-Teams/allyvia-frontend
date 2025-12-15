import { lazy } from 'react';

import Loadable from 'ui-component/Loadable';
import MainLayout from 'layout/MainLayout';
import AuthGuard from 'utils/route-guard/AuthGuard';
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
