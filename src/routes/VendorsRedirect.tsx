import { Navigate, useLocation } from 'react-router-dom';

import { payeesRedirectTarget } from 'views/vendors/payeesRoutes';

// The old /vendors URL (sidebar, bookmarks) lands on Bills and payees under Finance, query string kept.
export default function VendorsRedirect() {
  const { search, hash } = useLocation();
  return <Navigate to={payeesRedirectTarget(search, hash)} replace />;
}
