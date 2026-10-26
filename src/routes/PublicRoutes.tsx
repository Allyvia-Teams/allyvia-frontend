import { lazy } from 'react';

// project imports
import MinimalLayout from 'layout/MinimalLayout';
import NavMotion from 'layout/NavMotion';

// Direct import — public customer-facing page reached via tokenized email link
import PublicProfilePage from 'views/inner-circle/PublicProfilePage';
import PublicSurveyPage from 'views/inner-circle/PublicSurveyPage';
import PublicVotePage from 'views/inner-circle/PublicVotePage';
import Loadable from 'ui-component/Loadable';

// A buy plan's share link (B9): lazy, so the memo's components stay out of the entry chunk.
const SharedPlanPage = Loadable(lazy(() => import('views/inventory/plan/components/SharedPlan')));

// ==============================|| PUBLIC ROUTING ||============================== //
// Customer-facing pages. NOT wrapped in any auth/guest guard — access is granted
// solely by the ?token= query param validated server-side.

const PublicRoutes = {
  path: '/',
  element: (
    <NavMotion>
      <MinimalLayout />
    </NavMotion>
  ),
  children: [
    {
      path: '/profile',
      element: <PublicProfilePage />
    },
    {
      path: '/survey',
      element: <PublicSurveyPage />
    },
    {
      path: '/vote',
      element: <PublicVotePage />
    },
    {
      path: '/share/plan/:token',
      element: <SharedPlanPage />
    }
  ]
};

export default PublicRoutes;
