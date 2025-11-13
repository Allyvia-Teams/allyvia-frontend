import { lazy } from 'react';

import Loadable from 'ui-component/Loadable';
import MainLayout from 'layout/MainLayout';
import AuthGuard from 'utils/route-guard/AuthGuard';
import MemberGuard from './guards/memberGuard';
import { Unauthorized as UnauthorizedPage } from 'views/pages/error';
import { routeConfigs } from 'menu-items/routes';
import { createRouteObject } from 'menu-items/utils';
import InventoryPage from 'views/inventory/index';
import { ClockInOutPage } from 'views/employees';

// Lazy load components
const DashboardPage = Loadable(lazy(() => import('views/dashboard')));
const KioskLogin = Loadable(lazy(() => import('views/kiosk/KioskLogin')));
const PaymentPlanSelection = Loadable(lazy(() => import('views/subscription/PaymentPlanSelection')));
const CheckoutSuccessPage = Loadable(lazy(() => import('views/subscription/SuccessfulCheckout')));

// ==============================|| MAIN ROUTING ||============================== //
// Routes are now defined in route configuration (menu-items/routes.ts)
// This file generates React Router routes from the unified config

const generateRoutesFromConfig = () => {
  return routeConfigs
    .map((config) => {
      // Skip dev-only routes in production
      if (config.devOnly && import.meta.env.PROD) {
        return null;
      }

      return createRouteObject(config);
    })
    .filter(Boolean);
};

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
          <MemberGuard>
            <MainLayout />
          </MemberGuard>
        </AuthGuard>
      ),
      children: [
        // Routes generated from unified config
        ...generateRoutesFromConfig(),
        // Special routes that aren't in the shared config
        ...specialRoutes
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
      path: '/403',
      element: <UnauthorizedPage />
    }
  ]
};

export default MainRoutes;
