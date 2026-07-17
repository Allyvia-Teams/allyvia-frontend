// project imports
import MinimalLayout from 'layout/MinimalLayout';
import NavMotion from 'layout/NavMotion';

// Direct import — public customer-facing page reached via tokenized email link
import PublicProfilePage from 'views/inner-circle/PublicProfilePage';
import PublicSurveyPage from 'views/inner-circle/PublicSurveyPage';

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
    }
  ]
};

export default PublicRoutes;
